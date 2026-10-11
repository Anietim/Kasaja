import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const DEV = import.meta.env.DEV

export interface Profile {
  id: string
  display_name: string
  phone: string | null
  avatar_url: string | null
  roles: string[]
  state: string | null
  kaja_balance_kobo: number
  is_verified: boolean
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

// In dev mode — return a fake super_admin user immediately, no network call
const DEV_USER = DEV ? {
  id: 'dev-super-admin-id',
  email: 'dev@kasaja.ng',
  app_metadata: {},
  user_metadata: { name: 'Dev Admin' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User : null

const DEV_PROFILE: Profile = {
  id: 'dev-super-admin-id',
  display_name: 'Dev Admin',
  phone: '+2348000000000',
  avatar_url: null,
  roles: ['buyer', 'seller', 'rider', 'admin', 'super_admin'],
  state: 'Lagos',
  kaja_balance_kobo: 500000,
  is_verified: true,
}

async function fetchProfileFromDb(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, phone, avatar_url, roles, state, kaja_balance_kobo, is_verified')
    .eq('id', userId)
    .single()
  return (data)
}

export function useAuth(): AuthState {
  // DEV: return immediately with no loading, no network call
  const [user, setUser] = useState<User | null>(DEV ? DEV_USER : null)
  const [profile, setProfile] = useState<Profile | null>(DEV ? DEV_PROFILE : null)
  const [loading, setLoading] = useState(!DEV) // DEV = never loading

  useEffect(() => {
    if (DEV) return // skip all Supabase auth calls in dev mode

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfileFromDb(session.user.id)
        if (p) setProfile(p)
      }
      setLoading(false)
    }
    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        void fetchProfileFromDb(session.user.id).then(p => { if (p) setProfile(p) })
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    if (DEV) return
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return { user, profile, loading, signOut }
}
