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

      // Check buyer balance
      const { data: buyer } = await supabase
        .from('profiles')
        .select('total_steps')
        .eq('id', buyerId)
        .single()
      const buyerSteps = (buyer as any)?.total_steps ?? 0
      if (buyerSteps < price) return NextResponse.json({ error: '能量不足' }, { status: 400 })

      // Deduct from buyer
      await supabase
        .from('profiles')
        .update({ total_steps: buyerSteps - price })
        .eq('id', buyerId)

      // Add to seller
      const { data: seller } = await supabase
        .from('profiles')
        .select('total_steps')
        .eq('id', sellerId)
        .single()
      const sellerSteps = (seller as any)?.total_steps ?? 0
      await supabase
        .from('profiles')
        .update({ total_steps: sellerSteps + price })
        .eq('id', sellerId)

      // Transfer pet
      const { error: transferErr } = await supabase
        .from('pets')
        .update({ user_id: buyerId, is_for_sale: false, price: 0 })
        .eq('id', petId)

      if (transferErr) return NextResponse.json({ error: transferErr.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
