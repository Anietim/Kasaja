import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, ScanFace, KeyRound, ArrowLeft, Delete } from 'lucide-react'
import { toast } from 'sonner'
import {
  detectBiometricType, authenticateWithBiometric, hasBiometricRegistered,
  verifyPin, hasPinSet, type BiometricType,
} from '@/lib/biometric'

export default function QuickLogin() {
  const navigate = useNavigate()
  const [biometricType, setBiometricType] = useState<BiometricType>('none')
  const [hasBiometric, setHasBiometric] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [mode, setMode] = useState<'auto' | 'pin'>('auto')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [loading, setLoading] = useState(false)
  const shakeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void (async () => {
      const type = await detectBiometricType()
      setBiometricType(type)
      const hasBio = hasBiometricRegistered()
      setHasBiometric(hasBio)
      setHasPin(hasPinSet())
      // Auto-trigger biometric if available
      if (hasBio && type !== 'none') {
        setLoading(true)
        try {
          const ok = await authenticateWithBiometric()
          if (ok) {
            toast.success('Welcome back!')
            void navigate('/home')
          } else {
            setMode('pin')
          }
        } catch {
          setMode('pin')
        } finally {
          setLoading(false)
        }
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const triggerBiometric = async () => {
    setLoading(true)
    try {
      const ok = await authenticateWithBiometric()
      if (ok) {
        toast.success('Welcome back!')
        void navigate('/home')
      } else {
        toast.error('Biometric verification failed')
        setMode('pin')
      }
    } catch {
      setMode('pin')
    } finally {
      setLoading(false)
    }
  }

  const handlePinDigit = async (digit: string) => {
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 6) {
      setLoading(true)
      const ok = await verifyPin(newPin)
      if (ok) {
        toast.success('Welcome back!')
        void navigate('/home')
      } else {
        setPinError(true)
        if (shakeRef.current) clearTimeout(shakeRef.current)
        shakeRef.current = setTimeout(() => {
          setPin('')
          setPinError(false)
          setLoading(false)
        }, 600)
      }
    }
  }

  const deleteDigit = () => setPin(p => p.slice(0, -1))

  const biometricIcon = biometricType === 'face'
    ? <ScanFace size={48} className="text-brand-500" />
    : <Fingerprint size={48} className="text-brand-500" />

  const biometricLabel = biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Fingerprint' : 'Biometric'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-black text-white font-display">K</span>
        </div>
        <h1 className="text-2xl font-bold text-white font-display">Welcome back</h1>
        <p className="text-muted text-sm mt-1">Verify to continue</p>
      </div>

      {mode === 'auto' && hasBiometric && biometricType !== 'none' ? (
        // Biometric mode
        <div className="flex flex-col items-center gap-6">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => void triggerBiometric()}
            disabled={loading}
            className="w-28 h-28 rounded-full bg-surface border-2 border-brand-500/30 flex items-center justify-center active:bg-brand-500/10 transition-colors"
          >
            {loading
              ? <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              : biometricIcon
            }
          </motion.button>
          <p className="text-white text-base font-medium">Use {biometricLabel}</p>

          {hasPin && (
            <button onClick={() => setMode('pin')} className="text-brand-400 text-sm mt-2 flex items-center gap-1">
              <KeyRound size={14} /> Use PIN instead
            </button>
          )}
        </div>
      ) : (
        // PIN mode
        <div className="w-full max-w-xs flex flex-col items-center gap-6">
          <p className="text-white text-base font-medium">Enter your 6-digit PIN</p>

          {/* PIN dots */}
          <AnimatePresence>
            <motion.div
              animate={pinError ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex gap-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length
                      ? pinError ? 'bg-red-500 border-red-500' : 'bg-brand-500 border-brand-500'
                      : 'bg-transparent border-white/30'
                  }`}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {['1','2','3','4','5','6','7','8','9','',  '0','⌫'].map((key, idx) => {
              if (key === '') return <div key={idx} />
              if (key === '⌫') return (
                <button
                  key={idx}
                  onClick={deleteDigit}
                  className="h-16 rounded-2xl bg-surface flex items-center justify-center text-white active:bg-white/10"
                >
                  <Delete size={22} />
                </button>
              )
              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void handlePinDigit(key)}
                  disabled={loading || pin.length >= 6}
                  className="h-16 rounded-2xl bg-surface flex flex-col items-center justify-center gap-0.5 active:bg-brand-500/20 transition-colors"
                >
                  <span className="text-xl font-semibold text-white">{key}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Switch to biometric */}
          {hasBiometric && biometricType !== 'none' && (
            <button onClick={() => { setMode('auto'); void triggerBiometric() }} className="text-brand-400 text-sm flex items-center gap-1 mt-1">
              {biometricType === 'face' ? <ScanFace size={14} /> : <Fingerprint size={14} />}
              Use {biometricLabel} instead
            </button>
          )}
        </div>
      )}

      {/* Use email instead */}
      <button
        onClick={() => void navigate('/login')}
        className="mt-10 text-muted text-sm flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Login with email instead
      </button>
    </div>
  )
}
