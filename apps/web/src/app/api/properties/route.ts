import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anchorLat = parseFloat(searchParams.get('anchor_lat') ?? '')
  const anchorLng = parseFloat(searchParams.get('anchor_lng') ?? '')
  const cellRow = parseInt(searchParams.get('cell_row') ?? '', 10)
  const cellCol = parseInt(searchParams.get('cell_col') ?? '', 10)
  const userId = searchParams.get('user_id') // optional

  if (isNaN(anchorLat) || isNaN(anchorLng) || isNaN(cellRow) || isNaN(cellCol)) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const { data } = await supabase
    .from('properties')
    .select('user_id, price')
    .eq('anchor_lat', anchorLat)
    .eq('anchor_lng', anchorLng)
    .eq('cell_row', cellRow)
    .eq('cell_col', cellCol)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ owner: false })
  }

  return NextResponse.json({
    owner: true,
    isMine: userId ? data.user_id === userId : false,
    price: data.price,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, anchorLat, anchorLng, cellRow, cellCol, price } = body

  if (!userId || isNaN(anchorLat) || isNaN(anchorLng) || isNaN(cellRow) || isNaN(cellCol) || !price) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Check if already owned
  const { data: existing } = await supabase
    .from('properties')
    .select('id')
    .eq('anchor_lat', anchorLat)
    .eq('anchor_lng', anchorLng)
    .eq('cell_row', cellRow)
    .eq('cell_col', cellCol)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already owned' }, { status: 409 })
  }

  // Deduct steps from user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_steps')
    .eq('id', userId)
    .single()

  const currentSteps = profile?.total_steps ?? 0
  if (currentSteps < price) {
    return NextResponse.json({ error: 'insufficient steps' }, { status: 402 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ total_steps: currentSteps - price })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Insert property
  const { data: newProp, error } = await supabase
    .from('properties')
    .insert({
      user_id: userId,
      anchor_lat: anchorLat,
      anchor_lng: anchorLng,
      cell_row: cellRow,
      cell_col: cellCol,
      price,
    })
    .select()
    .single()

  if (error) {
    // Refund steps on failure
    await supabase.from('profiles').update({ total_steps: currentSteps }).eq('id', userId)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, property: newProp })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const propertyId = parseInt(searchParams.get('id') ?? '', 10)
  const userId = searchParams.get('user_id')

  if (!propertyId || !userId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Verify ownership
  const { data: prop } = await supabase
    .from('properties')
    .select('user_id')
    .eq('id', propertyId)
    .single()

  if (!prop) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (prop.user_id !== userId) {
    return NextResponse.json({ error: 'not yours' }, { status: 403 })
  }

  const { error } = await supabase.from('properties').delete().eq('id', propertyId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH — list/unlist a property for sale
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { propertyId, userId, listPrice } = body

  if (!propertyId || !userId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Verify ownership
  const { data: prop } = await supabase
    .from('properties')
    .select('user_id')
    .eq('id', propertyId)
    .single()

  if (!prop) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (prop.user_id !== userId) {
    return NextResponse.json({ error: 'not yours' }, { status: 403 })
  }

  const updates: Record<string, any> = {}
  if (listPrice !== undefined && listPrice !== null) {
    updates.is_listed = true
    updates.list_price = listPrice
  } else {
    updates.is_listed = false
    updates.list_price = null
  }

  const { error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', propertyId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
