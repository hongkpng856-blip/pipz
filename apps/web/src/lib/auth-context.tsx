'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Session, User } from '@supabase/supabase-js'

const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Handle PKCE code exchange on the CLIENT side
  // Magic Link redirects with #access_token=xxx in the URL hash
  // After server-side callback, the URL has ?code=xxx
  useEffect(() => {
    if (!supabase) return

    const initAuth = async () => {
      // Check URL hash for access_token (PKCE direct flow)
      if (window.location.hash && window.location.hash.includes('access_token')) {
        // Supabase JS SDK handles hash automatically via onAuthStateChange
        // Just need to setLoading(false) after it processes
      }

      // Check URL for ?code= parameter (after server callback redirect)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code)
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (e) {
          console.error('Code exchange failed:', e)
        }
      }

      // Restore existing session
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return 'Supabase not initialized'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Don't set redirectTo — let Supabase handle it (redirects back to site URL)
      }
    })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
