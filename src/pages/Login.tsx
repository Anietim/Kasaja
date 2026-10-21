import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { hasBiometricRegistered, hasPinSet } from '@/lib/biometric'
import { checkOtpRateLimit, resetOtpRateLimit, logActivity, sanitiseText } from '@/lib/security'
import { Mail, ArrowRight, ShieldCheck, ChevronLeft } from 'lucide-react'
import { KasajaK } from '@/components/layout/KasajaLogo'

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

  const ORANGE = '#FF6A13'
  const input = 'w-full h-14 rounded-2xl pl-12 pr-4 text-white text-base placeholder-white/30 focus:outline-none transition-colors'
  const inputStyle = { background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.12)' } as const

  return (
    <div className="min-h-dvh bg-black flex flex-col px-6 relative overflow-hidden">
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[460px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(255,106,19,0.22), transparent)' }} />

      <div className="relative w-full max-w-sm mx-auto pt-16 pb-10 flex-1 flex flex-col">
        {step === 'email' ? (
          <>
            <div className="w-16 h-16 rounded-[18px] bg-black flex items-center justify-center" style={{ border: '1px solid rgba(255,106,19,0.4)' }}>
              <KasajaK size={42} />
            </div>
            <h1 className="font-display font-extrabold text-[38px] leading-[1.05] tracking-tight text-white mt-9 mb-3">Welcome to<br />the market.</h1>
            <p className="text-base leading-relaxed mb-9" style={{ color: 'rgba(255,255,255,0.55)' }}>Enter your email. We'll send a 6-digit code. No password needed.</p>

            <label htmlFor="email" className="text-[13px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255,255,255,0.45)' }} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void sendOtp() }}
                placeholder="your@email.com"
                className={input}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = ORANGE }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <button
              onClick={() => void sendOtp()}
              disabled={loading}
              className="mt-5 min-h-14 rounded-full font-extrabold text-black flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.98] transition-transform"
              style={{ background: ORANGE }}
            >
              {loading ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Send my code <ArrowRight className="w-[18px] h-[18px]" /></>}
            </button>

            <div className="mt-auto pt-10 flex gap-3 items-start">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: 'rgba(52,211,153,0.14)' }}>
                <ShieldCheck className="w-[18px] h-[18px]" style={{ color: '#34D399' }} />
              </span>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Every delivery you confirm gets a public receipt on Arc. We never put your name or address on-chain.
              </p>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setStep('email'); setOtp(''); setError('') }} aria-label="Change email"
              className="w-11 h-11 rounded-[14px] flex items-center justify-center border border-white/15 hover:border-white/30">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="font-display font-extrabold text-[38px] leading-[1.05] tracking-tight text-white mt-9 mb-3">Check your<br />email.</h1>
            <p className="text-base leading-relaxed mb-9" style={{ color: 'rgba(255,255,255,0.55)' }}>
              We sent a 6-digit code to <span className="font-bold" style={{ color: ORANGE }}>{email}</span>
            </p>

            <label htmlFor="otp" className="sr-only">6-digit code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') void verifyOtp() }}
              placeholder="000000"
              className="w-full h-16 rounded-2xl text-center text-white font-mono text-[28px] placeholder-white/20 focus:outline-none"
              style={{ ...inputStyle, letterSpacing: '0.5em', paddingLeft: '0.5em' }}
              onFocus={e => { e.currentTarget.style.borderColor = ORANGE }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <button
              onClick={() => void verifyOtp()}
              disabled={loading}
              className="mt-6 min-h-14 rounded-full font-extrabold text-black flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.98] transition-transform"
              style={{ background: ORANGE }}
            >
              {loading ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Verify and continue <ArrowRight className="w-[18px] h-[18px]" /></>}
            </button>
            <button onClick={() => void sendOtp()} disabled={loading} className="mt-2 min-h-12 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Didn't get it? Send a new code
            </button>
          </>
        )}

        {/* Dev bypass */}
        {import.meta.env.DEV && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>DEV MODE — skip auth</p>
            <button
              onClick={() => void navigate('/home')}
              className="w-full text-sm font-medium py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white"
            >
              Continue as guest (dev only)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
