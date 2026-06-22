import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function admin() {
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey)
}

export async function GET() {
  try {
    const supabase = admin()
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('is_for_sale', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ listings: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = admin()
    const body = await req.json()
    const { action } = body

    if (action === 'setup_policy') {
      // Add RLS policy for market listings
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'pets' AND policyname = 'Anyone can view listed pets'
            ) THEN
              CREATE POLICY "Anyone can view listed pets"
                ON public.pets FOR SELECT
                USING (is_for_sale = true);
            END IF;
          END;
          $$;
        `
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'buy') {
      const { petId, buyerId, sellerId, price } = body
      if (buyerId === sellerId) {
        return NextResponse.json({ error: '唔可以買自己嘅寵物' }, { status: 400 })
      }

      // ── 原子化交易：用 RPC 確保唔會重複購買 ──
      const { data: transferResult, error: transferErr } = await supabase.rpc('buy_pet', {
        p_pet_id: petId,
        p_buyer_id: buyerId,
        p_seller_id: sellerId,
        p_price: price,
      })

      if (transferErr?.message?.includes('already sold') || transferResult === false) {
        return NextResponse.json({ error: '呢隻寵物已經賣咗' }, { status: 409 })
      }
      if (transferErr) return NextResponse.json({ error: transferErr.message }, { status: 500 })

      // Create notifications
      // Notify seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'pet_sold',
        title: '🐾 寵物已售出',
        message: `你嘅寵物以 ⚡${price} 能量賣出！`,
        related_pet_id: petId,
      })
      // Notify buyer
      await supabase.from('notifications').insert({
        user_id: buyerId,
        type: 'pet_bought',
        title: '🎉 成功購買寵物',
        message: `你以 ⚡${price} 能量買入咗新寵物！`,
        related_pet_id: petId,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
