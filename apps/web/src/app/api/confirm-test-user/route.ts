import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if user exists
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const user = users.users.find(u => u.email === 'pipztest2@gmail.com')
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  if (user.email_confirmed_at) {
    return NextResponse.json({ message: 'already confirmed', userId: user.id })
  }

  // Confirm the user's email
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, userId: data.user.id })
}
