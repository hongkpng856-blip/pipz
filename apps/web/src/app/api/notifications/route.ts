import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function admin() {
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = admin()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ notifications: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = admin()
    const body = await req.json()
    const { action } = body

    if (action === 'mark_read') {
      const { ids, userId } = body
      if (!ids?.length || !userId) return NextResponse.json({ error: 'ids + userId required' }, { status: 400 })

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .in('id', ids)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'create') {
      const { userId, type, title, message, relatedPetId } = body
      if (!userId || !title || !message) return NextResponse.json({ error: 'userId, title, message required' }, { status: 400 })

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: type || 'info',
          title,
          message,
          related_pet_id: relatedPetId || null,
        })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
