import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Fingerprint, ScanFace, KeyRound, ChevronRight, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  detectBiometricType, registerBiometric, setPin, type BiometricType,
} from '@/lib/biometric'
import { useAuth } from '@/hooks/useAuth'

type Step = 'choice' | 'pin-create' | 'pin-confirm' | 'biometric' | 'done'

interface PinPadProps {
  isConfirm: boolean
  pin: string
  pinConfirm: string
  pinError: string
  onDigit: (digit: string, isConfirm: boolean) => void
  onDelete: (isConfirm: boolean) => void
  onCancel: () => void
}
function PinPad({ isConfirm, pin, pinConfirm, pinError, onDigit, onDelete, onCancel }: PinPadProps) {
  const current = isConfirm ? pinConfirm : pin
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto">
      <p className="text-white text-base font-medium">
        {isConfirm ? 'Confirm your PIN' : 'Create a 6-digit PIN'}
      </p>
      {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < current.length ? 'bg-brand-500 border-brand-500' : 'bg-transparent border-white/30'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
          if (key === '') return <div key={idx} />
          if (key === '⌫') return (
            <button key={idx} onClick={() => onDelete(isConfirm)}
              className="h-16 rounded-2xl bg-surface flex items-center justify-center text-white active:bg-white/10">
              <span className="text-lg">⌫</span>
            </button>
          )
          return (
            <motion.button key={idx} whileTap={{ scale: 0.92 }}
              onClick={() => onDigit(key, isConfirm)}
              disabled={current.length >= 6}
              className="h-16 rounded-2xl bg-surface flex items-center justify-center active:bg-brand-500/20 transition-colors">
              <span className="text-xl font-semibold text-white">{key}</span>
            </motion.button>
          )
        })}
      </div>
      <button onClick={onCancel} className="text-muted text-sm mt-1">Cancel</button>
    </div>
  )
}

export default function SecuritySetup() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [biometricType, setBiometricType] = useState<BiometricType>('none')
  const [step, setStep] = useState<Step>('choice')
  const [pin, setPin_] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedBiometric, setCompletedBiometric] = useState(false)
  const [completedPin, setCompletedPin] = useState(false)

  useEffect(() => {
    void detectBiometricType().then(setBiometricType)
  }, [])

  const setupBiometric = async () => {
    if (!user?.id) return
    setLoading(true)
    const ok = await registerBiometric(user.id, profile?.display_name ?? user.email ?? 'Kasaja User')
    setLoading(false)
    if (ok) {
      setCompletedBiometric(true)
      toast.success('Biometric login enabled!')
      setStep('choice')
    } else {
      toast.error('Biometric setup failed. Try again or use PIN.')
    }
  }

  const handlePinDigit = (digit: string, isConfirm: boolean) => {
    const current = isConfirm ? pinConfirm : pin
    const setter = isConfirm ? setPinConfirm : setPin_
    if (current.length >= 6) return
    const next = current + digit
    setter(next)
    if (next.length === 6) {
      if (isConfirm) {
        if (next !== pin) {
          setPinError('PINs do not match. Try again.')
          setTimeout(() => { setPinConfirm(''); setPinError('') }, 800)
        } else {
          void (async () => {
            if (!user?.id) return
            await setPin(user.id, next)
            setCompletedPin(true)
            toast.success('PIN set successfully!')
            setStep('choice')
          })()
        }
      } else {
        setStep('pin-confirm')
      }
    }
  }

  const deleteDigit = (isConfirm: boolean) => {
    if (isConfirm) setPinConfirm(p => p.slice(0, -1))
    else setPin_(p => p.slice(0, -1))
  }

  const biometricLabel = biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Fingerprint' : 'Biometric'
  const biometricIcon = biometricType === 'face'
    ? <ScanFace size={24} className="text-brand-400" />
    : <Fingerprint size={24} className="text-brand-400" />

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white font-display">Secure your account</h1>
        <p className="text-muted text-sm mt-1">Add quick login methods for faster access</p>
      </div>

      <div className="flex-1 px-5 py-4">
        {step === 'choice' && (
          <div className="flex flex-col gap-4">
            {/* Biometric option */}
            {biometricType !== 'none' && (
              <motion.div whileTap={{ scale: 0.98 }}>
                <button
                  onClick={() => { if (!completedBiometric) setStep('biometric') }}
                  className="w-full bg-surface rounded-2xl p-5 flex items-center gap-4 border border-white/5"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                    {biometricIcon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">{biometricLabel}</p>
                    <p className="text-muted text-sm">Log in with {biometricType === 'face' ? 'your face' : 'your fingerprint'}</p>
                  </div>
                  {completedBiometric
                    ? <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check size={14} className="text-white" /></div>
                    : <ChevronRight size={18} className="text-muted" />
                  }
                </button>
              </motion.div>
            )}

            {/* PIN option */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <button
                onClick={() => { if (!completedPin) setStep('pin-create') }}
                className="w-full bg-surface rounded-2xl p-5 flex items-center gap-4 border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <KeyRound size={24} className="text-orange-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold">6-Digit PIN</p>
                  <p className="text-muted text-sm">Quick access with a personal PIN</p>
                </div>
                {completedPin
                  ? <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check size={14} className="text-white" /></div>
                  : <ChevronRight size={18} className="text-muted" />
                }
              </button>
            </motion.div>

            {/* Info card */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-2">
              <p className="text-blue-300 text-sm">
                Your biometric data never leaves your device. PIN is stored as a secure hash. Both can be removed anytime from Settings → Security.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-4">
              {(completedBiometric || completedPin) && (
                <button
                  onClick={() => void navigate('/home')}
                  className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base"
                >
                  Continue to KASAJA
                </button>
              )}
              <button
                onClick={() => void navigate('/home')}
                className="w-full py-4 rounded-2xl bg-transparent text-muted font-medium text-sm"
              >
                {(completedBiometric || completedPin) ? 'Skip for now' : 'Set up later'}
              </button>
            </div>
          </div>
        )}

        {step === 'biometric' && (
          <div className="flex flex-col items-center gap-8 pt-8">
            <p className="text-white text-base font-medium text-center">
              Enable {biometricLabel} login?
            </p>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => void setupBiometric()}
              disabled={loading}
              className="w-28 h-28 rounded-full bg-surface border-2 border-brand-500/30 flex items-center justify-center"
            >
              {loading
                ? <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : (biometricType === 'face'
                  ? <ScanFace size={48} className="text-brand-500" />
                  : <Fingerprint size={48} className="text-brand-500" />)
              }
            </motion.button>
            <p className="text-muted text-sm text-center max-w-xs">
              Tap the icon and follow your device's prompt to register your {biometricLabel}
            </p>
            <button onClick={() => setStep('choice')} className="text-muted text-sm flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
          </div>
        )}

        {step === 'pin-create' && <PinPad isConfirm={false} pin={pin} pinConfirm={pinConfirm} pinError={pinError} onDigit={handlePinDigit} onDelete={deleteDigit} onCancel={() => { setStep('choice'); setPin_(''); setPinConfirm('') }} />}
        {step === 'pin-confirm' && <PinPad isConfirm={true} pin={pin} pinConfirm={pinConfirm} pinError={pinError} onDigit={handlePinDigit} onDelete={deleteDigit} onCancel={() => { setStep('choice'); setPin_(''); setPinConfirm('') }} />}
      </div>
    </div>
  )
}
