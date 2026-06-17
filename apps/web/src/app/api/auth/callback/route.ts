import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Just redirect to the main page — the client-side AuthProvider
  // will pick up the ?code= parameter and exchange it via PKCE
  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${code}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
