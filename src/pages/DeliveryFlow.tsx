import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, Package, Clock, CheckCircle, Phone, MessageCircle, Star, ChevronLeft, Navigation, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatNaira } from '@/lib/paystack'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface DeliveryRequest {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  agreed_price_kobo: number
  package_description: string
  created_at: string
  rider_id: string | null
  requester_id: string
  rider?: { display_name: string; phone: string; avatar_url: string; rating: number }
  requester?: { display_name: string; phone: string }
}

const STEPS = [
  { key: 'pending', label: 'Finding Rider', icon: Clock },
  { key: 'accepted', label: 'Rider Assigned', icon: CheckCircle },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'in_transit', label: 'On the Way', icon: Navigation },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
]

export default function DeliveryFlow() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [rating, setRating] = useState(0)
  const [showRating, setShowRating] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('delivery_requests')
      .select(`*, rider:rider_id(display_name,phone,avatar_url,rating), requester:requester_id(display_name,phone)`)
      .eq('id', id)
      .single()
    if (data) setDelivery(data as DeliveryRequest)
    setLoading(false)
  }, [id])

  useEffect(() => { void load() }, [load])

  // Supabase Realtime — live status updates
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`delivery_${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_requests',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setDelivery(prev => prev ? { ...prev, ...payload.new } : null)
        const newStatus = (payload.new as DeliveryRequest).status
        if (newStatus === 'picked_up') toast.success('Rider has picked up your package!')
        if (newStatus === 'in_transit') toast.success('Your package is on the way!')
        if (newStatus === 'delivered') {
          toast.success('Package delivered!')
          setShowRating(true)
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [id])

  const confirmDelivery = async () => {
    if (!delivery || !user) return
    setConfirming(true)
    const { error } = await supabase
      .from('delivery_requests')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', delivery.id)
    if (error) {
      toast.error('Failed to confirm delivery')
    } else {
      toast.success('Delivery confirmed! Payment released to rider.')
      setShowRating(true)
    }
    setConfirming(false)
  }

  const submitRating = async () => {
    if (!delivery || rating === 0) return
    await supabase.from('rider_profiles').update({
      rating_count: supabase.rpc('increment', { x: 1 }),
    }).eq('id', delivery.rider_id)
    toast.success('Thank you for your rating!')
    void navigate('/home')
  }

  const stepIndex = STEPS.findIndex(s => s.key === delivery?.status)
  const isRequester = delivery?.requester_id === user?.id

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-canvas">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  )

  if (!delivery) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-center px-6">
      <Package className="w-16 h-16 text-ink-500 mb-4" />
      <p className="text-ink-300 text-lg">Delivery not found</p>
      <button onClick={() => void navigate(-1)} className="mt-4 text-brand-400">Go Back</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-1 rounded-full hover:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-ink-300" />
        </button>
        <div>
          <h1 className="font-display font-bold text-ink-50 text-base">Track Delivery</h1>
          <p className="text-xs text-ink-500">#{delivery.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Progress Steps */}
        <div className="bg-surface rounded-2xl p-5 border border-white/5">
          <div className="relative">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const done = i <= stepIndex
              const active = i === stepIndex
              return (
                <div key={step.key} className="flex items-start gap-4 mb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      done ? 'bg-brand-500' : 'bg-ink-800'
                    } ${active ? 'ring-4 ring-brand-500/30' : ''}`}>
                      <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-ink-500'}`} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 my-1 transition-all ${i < stepIndex ? 'bg-brand-500' : 'bg-ink-800'}`} />
                    )}
                  </div>
                  <div className="pt-1.5 pb-8">
                    <p className={`font-medium text-sm ${done ? 'text-ink-50' : 'text-ink-500'}`}>{step.label}</p>
                    {active && delivery.status !== 'delivered' && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-brand-400 mt-0.5"
                      >
                        {active ? '● Live' : ''}
                      </motion.p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-surface rounded-2xl p-5 border border-white/5 space-y-4">
          <h2 className="font-display font-semibold text-ink-100 text-sm">Package Details</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Pickup</p>
                <p className="text-sm text-ink-100">{delivery.pickup_address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Dropoff</p>
                <p className="text-sm text-ink-100">{delivery.dropoff_address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">Package</p>
                <p className="text-sm text-ink-100">{delivery.package_description}</p>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-ink-400">Agreed Price</span>
            <span className="font-bold text-brand-400 text-lg">{formatNaira(delivery.agreed_price_kobo / 100)}</span>
          </div>
        </div>

        {/* Rider Info */}
        {delivery.rider && (
          <div className="bg-surface rounded-2xl p-5 border border-white/5">
            <h2 className="font-display font-semibold text-ink-100 text-sm mb-4">Your Rider</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400">
                {delivery.rider.display_name?.[0] ?? 'R'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink-50">{delivery.rider.display_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-ink-400">{delivery.rider.rating?.toFixed(1) ?? '5.0'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${delivery.rider.phone}`}
                  className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-400" />
                </a>
                <button
                  onClick={() => void navigate(`/inbox`)}
                  className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-brand-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delivery Button (buyer only, when status is in_transit) */}
        {isRequester && delivery.status === 'in_transit' && (
          <motion.button
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => void confirmDelivery()}
            disabled={confirming}
            className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Confirm I Received My Package
          </motion.button>
        )}

        {/* Rating Modal */}
        <AnimatePresence>
          {showRating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
            >
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="w-full max-w-md bg-surface rounded-t-3xl p-6 pb-10"
              >
                <h2 className="font-display font-bold text-xl text-ink-50 text-center mb-2">Rate Your Rider</h2>
                <p className="text-ink-400 text-center text-sm mb-6">How was your delivery experience?</p>
                <div className="flex justify-center gap-3 mb-8">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setRating(star)}>
                      <Star className={`w-10 h-10 transition-all ${star <= rating ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-ink-600'}`} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void submitRating()}
                  disabled={rating === 0}
                  className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold disabled:opacity-40"
                >
                  Submit Rating
                </button>
                <button
                  onClick={() => void navigate('/home')}
                  className="w-full py-3 text-ink-500 text-sm mt-2"
                >
                  Skip
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
