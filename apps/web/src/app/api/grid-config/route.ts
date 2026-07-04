import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function admin() {
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey)
}

/** GET → return the fixed grid anchor (world origin), or null if not set yet */
export async function GET() {
  try {
    const supabase = admin()
    const { data, error } = await supabase
      .from('grid_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ anchor: data ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/** POST → set the world anchor (only succeeds if none exists yet) */
export async function POST(req: NextRequest) {
  try {
    const supabase = admin()
    const body = await req.json()
    const { lat, lng } = body

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    }

    // Check if anchor already exists
    const { data: existing } = await supabase
      .from('grid_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Grid anchor already set — cannot change' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('grid_config')
      .insert({ anchor_lat: lat, anchor_lng: lng })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ anchor: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
