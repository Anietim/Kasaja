import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import type { UserRole } from '../../types/database'

export default function OnboardBuyer() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { roles: UserRole[]; interests: string[] } }

  const [displayName, setDisplayName] = useState('')
  const [address, setAddress]         = useState('')
  const [loading, setLoading]         = useState(false)

  async function finish() {
    if (!displayName.trim()) { toast.error('Enter your name'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Session expired'); void navigate('/login'); return }

    const { error } = await supabase.from('profiles').upsert({
      id:                   user.id,
      roles:                state?.roles ?? ['buyer'],
      interest_categories:  state?.interests ?? [],
      display_name:         displayName.trim(),
      delivery_address_text: address.trim() || null,
      status:               'active',
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }

    // If also seller, go to seller onboarding
    if (state?.roles?.includes('seller')) {
      void navigate('/onboard/seller', { state })
    } else if (state?.roles?.includes('rider')) {
      void navigate('/onboard/rider', { state })
    } else {
      toast.success('Welcome to KASAJA!')
      void navigate('/home')
    }
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col px-6 py-16 max-w-sm mx-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="font-display text-2xl font-bold text-white mb-2 tracking-tight">
          Almost there
        </h1>
        <p className="text-neutral-400 text-sm mb-8">
          Just your name and optional delivery address to get started.
        </p>

        <label className="block mb-4">
          <span className="text-sm text-neutral-400 mb-1 block">Your name</span>
          <input
            type="text"
            placeholder="e.g. Chidi Okafor"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-surface border border-surface-border text-white rounded-2xl
              px-4 py-4 text-base font-body outline-none
              focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
          />
        </label>

        <label className="block mb-8">
          <span className="text-sm text-neutral-400 mb-1 block">Delivery address (optional)</span>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 5 Bode Thomas Street, Surulere, Lagos"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-surface border border-surface-border text-white rounded-2xl
                pl-4 pr-12 py-4 text-base font-body outline-none
                focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
            />
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Used to estimate delivery distances</p>
        </label>

        <button
          onClick={() => void finish()}
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40
            text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enter KASAJA'}
        </button>
      </motion.div>
    </div>
  )
}
