import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/properties/transfer — buy a listed property from another user
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { propertyId, buyerId } = body

  if (!propertyId || !buyerId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Fetch property
  const { data: prop } = await supabase
    .from('properties')
    .select('id, user_id, list_price, is_listed')
    .eq('id', propertyId)
    .single()

  if (!prop) {
    return NextResponse.json({ error: 'property not found' }, { status: 404 })
  }
  if (!prop.is_listed) {
    return NextResponse.json({ error: 'property not listed' }, { status: 400 })
  }
  if (prop.user_id === buyerId) {
    return NextResponse.json({ error: 'you already own this' }, { status: 400 })
  }

  const price = prop.list_price ?? 100
  const sellerId = prop.user_id

  // Check buyer's steps
  const { data: buyerProfile } = await supabase
    .from('profiles')
    .select('total_steps')
    .eq('id', buyerId)
    .single()

  const buyerSteps = buyerProfile?.total_steps ?? 0
  if (buyerSteps < price) {
    return NextResponse.json({ error: 'insufficient steps' }, { status: 402 })
  }

  // Atomic: deduct from buyer, add to seller, transfer property
  const { error: deductError } = await supabase
    .from('profiles')
    .update({ total_steps: buyerSteps - price })
    .eq('id', buyerId)

  if (deductError) {
    return NextResponse.json({ error: deductError.message }, { status: 500 })
  }

  if (sellerId) {
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('total_steps')
      .eq('id', sellerId)
      .single()
    const sellerSteps = sellerProfile?.total_steps ?? 0
    await supabase
      .from('profiles')
      .update({ total_steps: sellerSteps + price })
      .eq('id', sellerId)
  }

  // Transfer ownership
  const { error: transferError } = await supabase
    .from('properties')
    .update({
      user_id: buyerId,
      is_listed: false,
      list_price: null,
      price: price,
    })
    .eq('id', propertyId)

  if (transferError) {
    // Refund buyer
    await supabase.from('profiles').update({ total_steps: buyerSteps }).eq('id', buyerId)
    return NextResponse.json({ error: transferError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
