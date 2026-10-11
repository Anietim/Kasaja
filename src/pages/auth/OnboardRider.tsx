import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Bike } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

const VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car / Van', 'Tricycle (Keke)']

export default function OnboardRider() {
  const navigate  = useNavigate()
  const [vehicle, setVehicle]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function finish() {
    if (!vehicle) { toast.error('Select your vehicle type'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { void navigate('/login'); return }

    // Store vehicle in profile bio for MVP; full rider table in Phase 2
    await supabase.from('profiles').upsert({
      id:  user.id,
      bio: `Rider — ${vehicle}`,
    })

    // Initialise rider location row
    await supabase.from('rider_locations').upsert({
      rider_id:  user.id,
      lat:       6.4550,
      lng:       3.3947,
      is_online: false,
    })

    setLoading(false)
    toast.success('You\'re registered as a rider!')
    void navigate('/home')
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col px-6 py-16 max-w-sm mx-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Bike size={20} className="text-brand-500" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white tracking-tight">Rider setup</h1>
            <p className="text-neutral-400 text-sm">What do you ride?</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {VEHICLE_TYPES.map(v => (
            <button key={v} onClick={() => setVehicle(v)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl border text-left transition',
                vehicle === v
                  ? 'bg-brand-500/10 border-brand-500'
                  : 'bg-surface border-surface-border hover:border-neutral-500'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                vehicle === v ? 'bg-brand-500' : 'bg-surface-overlay'
              )}>
                <Bike size={18} className={vehicle === v ? 'text-white' : 'text-neutral-400'} />
              </div>
              <span className="font-body font-medium text-white">{v}</span>
            </button>
          ))}
        </div>

        <button onClick={() => void finish()} disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40
            text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Start earning'}
        </button>
      </motion.div>
    </div>
  )
}
