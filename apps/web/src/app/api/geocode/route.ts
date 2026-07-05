import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'missing lat/lng' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=zh`,
      { headers: { 'User-Agent': 'Pipz/1.0 (HongKong)' } }
    )

    if (!res.ok) {
      return NextResponse.json({ label: '📍 未知地區', detail: '', full: '📍 未知地區' })
    }

    const data = await res.json()
    const addr = data?.address || {}
    const district = addr.district || addr.town || addr.city || addr.county || ''
    const suburb = addr.suburb || addr.village || addr.neighbourhood || ''
    const road = addr.road || addr.highway || addr.pedestrian || ''
    const parts = [district, suburb].filter(Boolean)
    const label = parts.length > 0 ? `📍 ${parts.join(' · ')}` : '📍 未知地區'
    const detail = road ? `📍 ${road}` : ''
    const full = [label, detail].filter(Boolean).join('\n')

    return NextResponse.json({ label, detail, full })
  } catch {
    return NextResponse.json({ label: '📍 未知地區', detail: '', full: '📍 未知地區' })
  }
}
