import { supabase } from './supabase'

// ── Phone OTP ──────────────────────────────────────────────
export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalisePhone(phone),
  })
  if (error) throw error
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalisePhone(phone),
    token,
    type: 'sms',
  })
  if (error) throw error
  return data
}

// ── Email OTP (fallback / testing) ─────────────────────────
export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  if (error) throw error
  return data
}

// ── Google OAuth ────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

// ── Sign out ────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Profile helpers ─────────────────────────────────────────
export async function ensureProfile(userId: string, phone?: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, roles, onboarding_done')
    .eq('id', userId)
    .single()
  if (data) return data
  // Create profile for new user
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({ id: userId, phone: phone ?? null, display_name: '' })
    .select('id, display_name, roles, onboarding_done')
    .single()
  if (error) throw error
  return created
}

export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+234' + digits.slice(1)
  if (digits.startsWith('234')) return '+' + digits
  if (digits.startsWith('+')) return raw.replace(/\s/g, '')
  return '+234' + digits
}
