import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/auth'
import { requestPushPermission, subscribeToPush } from '../lib/pushNotifications'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { void navigate('/login'); return }
        void ensureProfile(session.user.id).then(profile => {
        void navigate(profile.onboarding_done ? '/home' : '/onboarding', { replace: true })
        // Ask for push permission after navigating, so it never blocks login
        void requestPushPermission()
          .then(granted => (granted ? subscribeToPush(session.user.id) : undefined))
          .catch(() => { /* non-blocking */ })
      }).catch(() => { void navigate('/onboarding', { replace: true }) })
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-surface-400">Signing you in…</p>
      </div>
    </div>
  )
}
