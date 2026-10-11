import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PRODUCT_CATEGORIES } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types/database'

export default function Interests() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { roles: UserRole[] } }
  const roles = state?.roles ?? ['buyer']

  const [selected, setSelected] = useState<string[]>([])

  function toggle(cat: string) {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  function cont() {
    // Determine next onboarding screen based on roles
    const next = roles.includes('seller') ? '/onboard/seller'
               : roles.includes('rider')  ? '/onboard/rider'
               : '/onboard/buyer'
    void navigate(next, { state: { roles, interests: selected } })
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col px-6 py-16 max-w-sm mx-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
        <h1 className="font-display text-2xl font-bold text-white mb-2 tracking-tight">
          What are you interested in?
        </h1>
        <p className="text-neutral-400 text-sm mb-6">
          We'll personalise your feed. Pick as many as you like.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {PRODUCT_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.025 }}
              onClick={() => toggle(cat)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm font-body transition',
                selected.includes(cat)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-surface border-surface-border text-neutral-300 hover:border-neutral-400'
              )}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        <button
          onClick={cont}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold
            rounded-2xl py-4 transition active:scale-[0.98]"
        >
          {selected.length === 0 ? 'Skip for now' : `Continue (${selected.length} selected)`}
        </button>
      </motion.div>
    </div>
  )
}
