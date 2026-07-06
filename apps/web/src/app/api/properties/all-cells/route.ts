import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data } = await supabase
    .from('properties')
    .select('anchor_lat, anchor_lng, cell_row, cell_col')

  return NextResponse.json((data as any[] ?? []).map(d => ({
    anchorLat: d.anchor_lat,
    anchorLng: d.anchor_lng,
    cellRow: d.cell_row,
    cellCol: d.cell_col,
  })))
}
