import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, MapPin, Clock, ChevronRight, Loader2, Navigation, DollarSign, Star, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatNaira } from '@/lib/paystack'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import RiderCounterButton from '@/components/RiderCounterButton'

interface Job {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  agreed_price_kobo: number
  package_description: string
  created_at: string
  requester_id: string
  requester?: { display_name: string; phone: string }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Open',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  accepted: 'text-blue-400 bg-blue-400/10',
  picked_up: 'text-purple-400 bg-purple-400/10',
  in_transit: 'text-brand-400 bg-brand-400/10',
  delivered: 'text-green-400 bg-green-400/10',
}

const NEXT_STATUS: Record<string, string> = {
  accepted: 'picked_up',
  picked_up: 'in_transit',
}

const NEXT_LABEL: Record<string, string> = {
  accepted: 'Mark Picked Up',
  picked_up: 'Mark In Transit',
}

export default function RiderDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const [available, setAvailable] = useState<Job[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [bidFor, setBidFor] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const sendBid = async (job: Job) => {
    const amt = Math.round(Number(bidAmount) * 100)
    if (!amt || amt < 30000) { toast.error('Enter a price of at least ₦300'); return }
    const { data: { user: me } } = await supabase.auth.getUser()
    const { error } = await supabase.from('delivery_bids').insert({ request_id: job.id, rider_id: me?.id, amount_kobo: amt })
    if (error) { toast.error(error.message); return }
    toast.success('Your price was sent to the seller')
    setBidFor(null); setBidAmount('')
  }
  const [stats, setStats] = useState({ today: 0, week: 0, rating: 5.0 })

  const loadAvailable = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_requests')
      .select('*, requester:requester_id(display_name,phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    setAvailable((data ?? []) as Job[])
  }, [])

  const loadMine = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('delivery_requests')
      .select('*, requester:requester_id(display_name,phone)')
      .eq('rider_id', user.id)
      .neq('status', 'delivered')
      .order('created_at', { ascending: false })
    setMyJobs((data ?? []) as Job[])
  }, [user])

  const loadStats = useCallback(async () => {
    if (!user) return
    const today = new Date(); today.setHours(0,0,0,0)
    const week = new Date(); week.setDate(week.getDate() - 7)
    const { data: todayData } = await supabase
      .from('delivery_requests')
      .select('agreed_price_kobo')
      .eq('rider_id', user.id)
      .eq('status', 'delivered')
      .gte('created_at', today.toISOString())
    const { data: weekData } = await supabase
      .from('delivery_requests')
      .select('agreed_price_kobo')
      .eq('rider_id', user.id)
      .eq('status', 'delivered')
      .gte('created_at', week.toISOString())
    const { data: riderData } = await supabase
      .from('rider_profiles')
      .select('rating')
      .eq('id', user.id)
      .single()
    setStats({
      today: (todayData ?? []).reduce((s: number, r: {agreed_price_kobo: number}) => s + r.agreed_price_kobo / 100, 0),
      week: (weekData ?? []).reduce((s: number, r: {agreed_price_kobo: number}) => s + r.agreed_price_kobo / 100, 0),
      rating: (riderData as {rating?: number} | null)?.rating ?? 5.0,
    })
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadAvailable(), loadMine(), loadStats()])
    setLoading(false)
  }, [loadAvailable, loadMine, loadStats])

  useEffect(() => { void load() }, [load])

  // Realtime — new jobs appear instantly
  useEffect(() => {
    const channel = supabase
      .channel('rider_jobs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_requests' }, () => {
        void loadAvailable()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_requests' }, () => {
        void loadAvailable()
        void loadMine()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadAvailable, loadMine])

  const acceptJob = async (job: Job) => {
    if (!user) { toast.error('Please log in'); return }
    setUpdating(job.id)
    const { error } = await supabase
      .from('delivery_requests')
      .update({ status: 'accepted', rider_id: user.id })
      .eq('id', job.id)
      .eq('status', 'pending')
    if (error) {
      toast.error('Job already taken')
    } else {
      toast.success('Job accepted!')
      await Promise.all([loadAvailable(), loadMine()])
      setTab('mine')
    }
    setUpdating(null)
  }

  const advanceStatus = async (job: Job) => {
    const next = NEXT_STATUS[job.status]
    if (!next) return
    setUpdating(job.id)
    const { error } = await supabase
      .from('delivery_requests')
      .update({ status: next })
      .eq('id', job.id)
    if (error) {
      toast.error('Update failed')
    } else {
      toast.success(`Status updated to ${STATUS_LABELS[next]}`)
      void loadMine()
    }
    setUpdating(null)
  }

  const toggleOnline = async () => {
    if (!user) return
    const next = !online
    setOnline(next)
    await supabase.from('rider_profiles')
      .upsert({ id: user.id, is_online: next }, { onConflict: 'id' })
    toast.success(next ? 'You are now online' : 'You are now offline')
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <h1 className="font-display font-bold text-ink-50 text-lg">Rider Dashboard</h1>
            <p className="text-xs text-ink-500">KASAJA Dispatch</p>
          </div>
          <button
            onClick={() => void toggleOnline()}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              online ? 'bg-green-500/20 text-green-400' : 'bg-ink-800 text-ink-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-ink-500'}`} />
            {online ? 'Online' : 'Offline'}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today's Earnings", value: formatNaira(stats.today), icon: DollarSign, color: 'text-green-400' },
            { label: 'This Week', value: formatNaira(stats.week), icon: Zap, color: 'text-brand-400' },
            { label: 'Rating', value: stats.rating.toFixed(1), icon: Star, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl p-3 border border-white/5 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`font-bold text-base ${s.color}`}>{s.value}</p>
              <p className="text-ink-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-surface rounded-xl p-1 border border-white/5">
          {(['available', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-brand-500 text-white' : 'text-ink-400'
              }`}
            >
              {t === 'available' ? 'Available Jobs' : 'My Jobs'}
              {t === 'available' && available.length > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{available.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : tab === 'available' ? (
          <div className="space-y-3">
            {available.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-ink-600 mx-auto mb-3" />
                <p className="text-ink-400">No available jobs right now</p>
                <p className="text-ink-600 text-sm mt-1">New jobs appear here in real-time</p>
              </div>
            ) : available.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-2xl p-4 border border-white/5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-green-400" />
                      </div>
                      <p className="text-sm text-ink-200 leading-tight">{job.pickup_address}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-brand-400" />
                      </div>
                      <p className="text-sm text-ink-200 leading-tight">{job.dropoff_address}</p>
                    </div>
                  </div>
                  <span className="font-bold text-brand-400 text-lg ml-4">{formatNaira(job.agreed_price_kobo / 100)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div>
                    <p className="text-xs text-ink-500">{job.package_description}</p>
                    <p className="text-xs text-ink-600 mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(job.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => void acceptJob(job)}
                    disabled={updating === job.id}
                    className="px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {updating === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                  </button>
                </div>
              <RiderCounterButton jobId={job.id} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {myJobs.length === 0 ? (
              <div className="text-center py-12">
                <Navigation className="w-12 h-12 text-ink-600 mx-auto mb-3" />
                <p className="text-ink-400">No active jobs</p>
                <p className="text-ink-600 text-sm mt-1">Accept a job to get started</p>
              </div>
            ) : myJobs.map(job => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-2xl p-4 border border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[job.status]}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                  <span className="font-bold text-brand-400">{formatNaira(job.agreed_price_kobo / 100)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-ink-200">{job.pickup_address}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-ink-200">{job.dropoff_address}</p>
                  </div>
                </div>
                <p className="text-xs text-ink-500">{job.package_description}</p>
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => void navigate(`/delivery/${job.id}`)}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-ink-300 text-sm font-medium flex items-center justify-center gap-1"
                  >
                    Track <ChevronRight className="w-4 h-4" />
                  </button>
                  {NEXT_STATUS[job.status] && (
                    <button
                      onClick={() => void advanceStatus(job)}
                      disabled={updating === job.id}
                      className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updating === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>{NEXT_LABEL[job.status]}</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
