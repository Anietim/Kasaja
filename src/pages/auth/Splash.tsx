import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KasajaK } from '@/components/layout/KasajaLogo'
import { useAuth } from '@/hooks/useAuth'

/**
 * Opening screen. Signed-in people go straight to /home;
 * everyone else lands on the public /welcome page.
 */
export default function Splash() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => { void navigate(user ? '/home' : '/welcome', { replace: true }) }, 1400)
    return () => clearTimeout(t)
  }, [navigate, user, loading])

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(255,106,19,0.26), rgba(255,106,19,0.08) 60%, transparent)' }}
      />

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        className="relative w-[132px] h-[132px] rounded-[36px] bg-black flex items-center justify-center"
        style={{ border: '1px solid rgba(255,106,19,0.45)', boxShadow: '0 0 80px rgba(255,106,19,0.35)' }}
      >
        <KasajaK size={88} />
      </motion.div>

      <motion.h1
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="relative font-display text-[34px] font-extrabold text-white mt-8 mb-2.5"
        style={{ letterSpacing: '0.2em', paddingLeft: '0.2em' }}
      >
        KASAJA
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative text-base"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        The market that keeps receipts.
      </motion.p>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[180px] h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#FF6A13,#E24A00)' }}
        />
      </div>
    </div>
  )
}
