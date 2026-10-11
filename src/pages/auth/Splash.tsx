import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    // In dev: go straight to home after 1.2s so you can see the splash then browse
    const t = setTimeout(() => { void navigate('/home') }, 1200)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-24 h-24 rounded-3xl bg-brand-500 flex items-center justify-center shadow-2xl"
      >
        <span className="text-5xl font-extrabold text-white font-display">K</span>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">KASAJA</h1>
        <p className="text-sm text-zinc-400 mt-1">Nigeria's marketplace, reimagined</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-1.5 mt-4"
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-brand-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  )
}
