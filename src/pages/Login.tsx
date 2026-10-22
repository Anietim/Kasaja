import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { hasBiometricRegistered, hasPinSet } from '@/lib/biometric'
import { checkOtpRateLimit, resetOtpRateLimit, logActivity, sanitiseText } from '@/lib/security'
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react'

type Step = 'email' | 'otp'

export default function Login() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('email')

  useEffect(() => {
    if (hasBiometricRegistered() || hasPinSet()) {
      void navigate('/quick-login', { replace: true })
    }
  }, [navigate])

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    const cleanEmail = sanitiseText(email.trim())
    if (!cleanEmail) { setError('Enter your email address'); return }
    // Rate limit check
    const rate = checkOtpRateLimit()
    if (!rate.allowed) {
      setError(`Too many requests. Please wait ${rate.waitSeconds}s before trying again.`)
      return
    }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` } })
    setLoading(false)
    if (err) { setError(err.message); return }
    logActivity('otp_sent')
    setStep('otp')
  }

  async function verifyOtp() {
    if (otp.length < 6) { setError('Enter the 6-digit code from your email'); return }
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.verifyOtp({ email: sanitiseText(email.trim()), token: otp.trim(), type: 'email' })
    setLoading(false)
    if (err) { setError(err.message); return }
    if (data.user) {
      resetOtpRateLimit()
      logActivity('login')
      const { data: profile } = await supabase.from('profiles').select('id, roles, onboarding_done').eq('id', data.user.id).single()
      if (!profile?.onboarding_done) { void navigate('/onboarding'); return }
      void navigate('/home')
    }
  }

  return (
    <div className={`min-h-screen bg-canvas flex flex-col items-center px-5 ${step === 'email' ? 'justify-start pt-[12vh] pb-10' : 'justify-center'}`}>
      {step === 'email' ? (
        /* Email screen: big logo sitting right on top of the welcome line */
        <div className="mb-14 flex flex-col items-center text-center">
          <img src="/logo-mark.svg" alt="KASAJA" className="w-40 h-40 sm:w-44 sm:h-44 rounded-[2.2rem] object-cover" />
          <h1 className="mt-6 text-[2rem] leading-tight font-extrabold text-white font-display tracking-tight">
            Welcome to<br />the market.
          </h1>
          <p className="mt-3 text-surface-400 text-sm max-w-[18rem]">Enter your email to get a sign-in code. No password needed.</p>
        </div>
      ) : (
        <div className="mb-10 flex flex-col items-center gap-3">
          <img src="/logo-mark.png" alt="KASAJA" className="w-20 h-20 rounded-2xl object-cover" />
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">KASAJA</h1>
          <p className="text-surface-400 text-sm text-center">Nigeria's smartest marketplace</p>
        </div>
      )}

      <div className="w-full max-w-sm">
        {step === 'email' ? (
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void sendOtp() }}
                placeholder="your@email.com"
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={() => void sendOtp()}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Code <ArrowRight className="w-4 h-4" /></>}
            </button>

            <p className="text-center text-surface-400 text-xs">
              We'll send a 6-digit code to your email. No password needed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Check your email</h2>
              <p className="text-surface-400 text-sm">We sent a 6-digit code to <span className="text-brand-400">{email}</span></p>
            </div>

            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter') void verifyOtp() }}
                placeholder="123456"
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-11 pr-4 py-3.5 text-white text-center text-2xl tracking-[0.5em] placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={() => void verifyOtp()}
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify & Continue <ArrowRight className="w-4 h-4" /></>}
            </button>

            <button onClick={() => { setStep('email'); setOtp(''); setError('') }} className="w-full text-surface-400 text-sm text-center py-2 hover:text-white transition-colors">
              ← Change email address
            </button>
          </div>
        )}

        {/* Dev bypass */}
        {import.meta.env.DEV && (
          <div className="mt-6 pt-6 border-t border-surface-800">
            <p className="text-surface-500 text-xs text-center mb-3">DEV MODE — skip auth</p>
            <button
              onClick={() => void navigate('/home')}
              className="w-full bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Continue as guest (dev only)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
