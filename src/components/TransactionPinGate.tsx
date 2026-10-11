import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertCircle, Lock } from 'lucide-react'
import {
  verifyTransactionPin, hasTransactionPin, setTransactionPin,
  getPinLockoutInfo, getPinAttemptsLeft, MAX_PIN_ATTEMPTS
} from '../lib/security'

interface Props {
  amount?: number          // if provided, only shows gate above ₦5,000
  onVerified: () => void
  onCancel: () => void
  title?: string
  subtitle?: string
}

export default function TransactionPinGate({ amount, onVerified, onCancel, title, subtitle }: Props) {
  const [mode, setMode]           = useState<'verify' | 'setup' | 'confirm'>('verify')
  const [pin, setPin]             = useState('')
  const [confirmPin, setConfirm]  = useState('')
  const [error, setError]         = useState('')
  const [shaking, setShaking]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const pinSet = hasTransactionPin()
  const lockout = getPinLockoutInfo()
  const _attemptsLeft = getPinAttemptsLeft()

  useEffect(() => {
    if (!pinSet) setMode('setup')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [pinSet])

  const shake = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  const handleDigit = (d: string) => {
    if (lockout.locked) return
    const current = mode === 'confirm' ? confirmPin : pin
    if (current.length >= 4) return
    const next = current + d
    if (mode === 'confirm') setConfirm(next)
    else setPin(next)
    setError('')
    if (next.length === 4) setTimeout(() => { void handleComplete(next) }, 80)
  }

  const handleDelete = () => {
    if (mode === 'confirm') setConfirm(p => p.slice(0, -1))
    else setPin(p => p.slice(0, -1))
    setError('')
  }

  const handleComplete = async (completed: string) => {
    if (mode === 'setup') {
      setMode('confirm')
      return
    }
    if (mode === 'confirm') {
      if (completed !== pin) {
        setError('PINs do not match. Try again.')
        setConfirm('')
        shake()
        return
      }
      await setTransactionPin(pin)
      setSuccess(true)
      setTimeout(onVerified, 700)
      return
    }
    // verify mode
    const ok = await verifyTransactionPin(completed)
    if (ok) {
      setSuccess(true)
      setTimeout(onVerified, 600)
    } else {
      shake()
      setPin('')
      const newLockout = getPinLockoutInfo()
      const left = getPinAttemptsLeft()
      if (newLockout.locked) {
        setError(`Too many attempts. Try again in ${newLockout.secondsLeft ?? 900}s.`)
      } else {
        setError(`Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left.`)
      }
    }
  }

  const currentPin = mode === 'confirm' ? confirmPin : pin

  const KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="w-full max-w-sm bg-[#11151A] rounded-t-3xl sm:rounded-3xl p-6 pb-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${success ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
            {success
              ? <ShieldCheck className="w-7 h-7 text-green-400" />
              : <Lock className="w-7 h-7 text-orange-400" />
            }
          </div>
          <h2 className="text-white text-lg font-bold text-center">
            {success ? 'Verified!' : title ?? (mode === 'setup' ? 'Set Transaction PIN' : mode === 'confirm' ? 'Confirm PIN' : 'Enter Transaction PIN')}
          </h2>
          <p className="text-white/50 text-sm text-center mt-1">
            {subtitle ?? (
              mode === 'setup' ? 'Create a 4-digit PIN to protect your transactions' :
              mode === 'confirm' ? 'Enter the PIN again to confirm' :
              amount ? `Required for transactions above ₦5,000` : 'Required to continue'
            )}
          </p>
        </div>

        {/* Lockout warning */}
        {lockout.locked && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">Account locked for {lockout.secondsLeft}s after {MAX_PIN_ATTEMPTS} failed attempts.</p>
          </div>
        )}

        {/* PIN dots */}
        <motion.div
          animate={shaking ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-6"
        >
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < currentPin.length
                  ? success ? 'bg-green-400 border-green-400' : 'bg-orange-400 border-orange-400'
                  : 'border-white/30 bg-transparent'
              }`}
            />
          ))}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm text-center mb-4 flex items-center justify-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        {!success && !lockout.locked && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {KEYS.flat().map((key, idx) => (
              <button
                key={idx}
                onClick={() => key === '⌫' ? handleDelete() : key ? handleDigit(key) : undefined}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                  key === ''
                    ? 'cursor-default'
                    : key === '⌫'
                    ? 'bg-white/5 text-white/60 hover:bg-white/10'
                    : 'bg-[#1A1F28] text-white hover:bg-[#222830] active:bg-orange-500/20'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        )}

        {/* Hidden input for mobile keyboard */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={currentPin}
          onChange={e => {
            const v = e.target.value.replace(/\D/g,'')
            if (mode === 'confirm') setConfirm(v.slice(0,4))
            else setPin(v.slice(0,4))
            if (v.length === 4) void handleComplete(v.slice(0,4))
          }}
          className="sr-only"
          maxLength={4}
        />

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-full text-center text-white/40 text-sm mt-2 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}
