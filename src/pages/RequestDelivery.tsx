import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Package, ChevronRight, Bike, Car, Truck, Star, X, Check, Clock, Send, ArrowLeft, Navigation, MessageSquare, Phone, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import { toast } from 'sonner'

const DEV = import.meta.env.DEV

interface Rider {
  id: string
  name: string
  avatar?: string
  vehicle: 'bike' | 'car' | 'van' | 'truck'
  rating: number
  trips: number
  distance: number
  eta: number
  online: boolean
  lat: number
  lng: number
  badge?: string // e.g. "Top Rated", "Fast", "Cheap"
}

interface Bid {
  rider: Rider
  price: number
  originalPrice?: number // if counter-offered
  message?: string
  timestamp: Date
  countered?: boolean
}

type Step = 'form' | 'radar' | 'bidding' | 'payment' | 'tracking'

const MOCK_RIDERS: Rider[] = [
  { id: 'r1',  name: 'Chukwudi Obi',       vehicle: 'bike',  rating: 4.9, trips: 1240, distance: 0.6,  eta: 3,  online: true, lat: 6.455, lng: 3.385, badge: 'Top Rated' },
  { id: 'r2',  name: 'Segun Adeyemi',       vehicle: 'bike',  rating: 4.7, trips: 542,  distance: 0.9,  eta: 5,  online: true, lat: 6.448, lng: 3.391 },
  { id: 'r3',  name: 'Emeka Nwosu',         vehicle: 'car',   rating: 4.9, trips: 2100, distance: 1.4,  eta: 7,  online: true, lat: 6.461, lng: 3.378, badge: 'Premium' },
  { id: 'r4',  name: 'Bello Musa',          vehicle: 'bike',  rating: 4.5, trips: 308,  distance: 1.1,  eta: 6,  online: true, lat: 6.452, lng: 3.398 },
  { id: 'r5',  name: 'Eze Transport Ltd',   vehicle: 'van',   rating: 4.8, trips: 876,  distance: 2.0,  eta: 10, online: true, lat: 6.442, lng: 3.375, badge: 'Van' },
  { id: 'r6',  name: 'Tunde Ogundimu',      vehicle: 'bike',  rating: 4.6, trips: 415,  distance: 1.8,  eta: 9,  online: true, lat: 6.450, lng: 3.382 },
  { id: 'r7',  name: 'Biodun Riders',       vehicle: 'car',   rating: 4.7, trips: 692,  distance: 2.3,  eta: 11, online: true, lat: 6.457, lng: 3.370 },
  { id: 'r8',  name: 'Nnamdi Express',      vehicle: 'bike',  rating: 4.4, trips: 189,  distance: 1.3,  eta: 7,  online: true, lat: 6.444, lng: 3.395, badge: 'Budget' },
  { id: 'r9',  name: 'Fatima Dispatch',     vehicle: 'bike',  rating: 4.8, trips: 731,  distance: 0.7,  eta: 4,  online: true, lat: 6.453, lng: 3.388 },
  { id: 'r10', name: 'Lagos Swift Cargo',   vehicle: 'truck', rating: 4.6, trips: 1430, distance: 3.1,  eta: 15, online: true, lat: 6.440, lng: 3.362, badge: 'Heavy Load' },
  { id: 'r11', name: 'Kayode Adeleke',      vehicle: 'bike',  rating: 4.5, trips: 267,  distance: 2.6,  eta: 13, online: true, lat: 6.466, lng: 3.400 },
  { id: 'r12', name: 'Chioma QuickRide',    vehicle: 'car',   rating: 4.9, trips: 988,  distance: 1.7,  eta: 8,  online: true, lat: 6.447, lng: 3.372, badge: 'Fast' },
]

const BID_MESSAGES = [
  'I can handle this delivery right now!',
  'Available immediately, very familiar with this route.',
  'I am closest to your pickup location.',
  'Best rate in the area, guaranteed safe delivery.',
  'I have delivered over 1,000 packages safely. Trust me!',
  'On my way already, I can be there in minutes.',
  'I offer the best service at this price.',
  'Fully insured delivery, your goods are safe with me.',
  'No wahala, I go deliver am sharp sharp!',
  'Professional dispatch, I handle with care.',
  undefined, undefined, undefined, // some bids have no message
]

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  bike:  <Bike size={14} />,
  car:   <Car size={14} />,
  van:   <Truck size={14} />,
  truck: <Truck size={14} />,
}

const VEHICLE_COLORS: Record<string, string> = {
  bike:  'text-brand-400',
  car:   'text-blue-400',
  van:   'text-purple-400',
  truck: 'text-orange-400',
}

function calcSuggestedPrice(distanceKm: number, vehicle: string): number {
  const base: Record<string, number>  = { bike: 500, car: 800, van: 1500, truck: 3000 }
  const perKm: Record<string, number> = { bike: 150, car: 250, van: 400,  truck: 700 }
  return Math.round((base[vehicle] ?? 500) + (perKm[vehicle] ?? 150) * distanceKm)
}

export default function RequestDelivery() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const [step, setStep]             = useState<Step>('form')
  const [pickup, setPickup]         = useState(params.get('pickup') ?? '')
  const [destination, setDestination] = useState(params.get('destination') ?? '')
  const [description, setDescription] = useState('')
  const [weight, setWeight]         = useState('light')
  const [offeredPrice, setOfferedPrice] = useState('')
  const [riders, setRiders]         = useState<Rider[]>([])
  const [bids, setBids]             = useState<Bid[]>([])
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null)
  const [loading, setLoading]       = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [jobId, setJobId]           = useState<string | null>(null)
  const [trackerStatus, setTrackerStatus] = useState<string>('assigned')
  const [counteringBid, setCounteringBid] = useState<Bid | null>(null)
  const [counterValue, setCounterValue] = useState('')
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const bidTimerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const loadRiders = useCallback(async () => {
    if (DEV) { setRiders(MOCK_RIDERS); return }
    const { data } = await supabase
      .from('rider_profiles')
      .select('*, profile:profiles(display_name, avatar_url)')
      .eq('is_online', true)
    if (data) {
      setRiders(data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: (r.profile as Record<string, string>)?.display_name ?? 'Rider',
        vehicle: ((r.vehicle_type as string) ?? 'bike') as Rider['vehicle'],
        rating: (r.avg_rating as number) ?? 4.5,
        trips: (r.total_trips as number) ?? 0,
        distance: Math.random() * 4 + 0.5,
        eta: Math.floor(Math.random() * 12) + 3,
        online: true,
        lat: 6.45 + (Math.random() - 0.5) * 0.04,
        lng: 3.39 + (Math.random() - 0.5) * 0.04,
      })))
    }
  }, [])

  // Simulate ALL available riders bidding with realistic timing
  const simulateBids = useCallback((price: number, riderPool: Rider[]) => {
    let delay = 1500
    // How many riders respond depends on price attractiveness
    const respondingCount = Math.min(riderPool.length, Math.max(3, Math.floor(riderPool.length * 0.7)))
    const shuffled = [...riderPool].sort(() => Math.random() - 0.5).slice(0, respondingCount)

    shuffled.forEach((rider, _i) => {
      const t = setTimeout(() => {
        // Riders close to asking price or lower for competitive market
        const variance = (Math.random() - 0.4) * 0.25 // -10% to +15%
        const bidPrice = Math.round(price * (1 + variance) / 50) * 50 // round to nearest ₦50
        const msg = BID_MESSAGES[Math.floor(Math.random() * BID_MESSAGES.length)]
        setBids(prev => {
          if (prev.find(b => b.rider.id === rider.id)) return prev
          return [...prev, { rider, price: bidPrice, message: msg ?? undefined, timestamp: new Date() }]
        })
      }, delay)
      bidTimerRef.current.push(t)
      delay += 1200 + Math.random() * 2500
    })
  }, [])

  const handleFindRiders = async () => {
    if (!pickup || !destination) return
    setLoading(true)
    await loadRiders()
    setLoading(false)
    setOfferedPrice(calcSuggestedPrice(1.5, 'bike').toString())
    setStep('radar')
  }

  const handleBroadcast = async () => {
    const price = parseInt(offeredPrice)
    if (!price || price < 200) return
    setBroadcasting(true)
    if (!DEV) {
      const uid = user?.id
      if (!uid) {
        toast.error('Please sign in first')
        setBroadcasting(false)
        return
      }
      const { data: job, error: jobErr } = await supabase.from('delivery_requests').insert({
        requester_id: uid,
        pickup_address: pickup,
        dropoff_address: destination,
        package_description: description,
        item_description: description,
        agreed_price_kobo: price * 100,
        agreed_fee_kobo: price * 100,
        status: 'pending',
      }).select('id').single()
      if (jobErr || !job) {
        toast.error('Could not create the delivery request: ' + (jobErr?.message ?? 'unknown error'))
        setBroadcasting(false)
        return
      }
      setBroadcasting(false)
      void navigate(`/delivery/${(job as { id: string }).id}`)
      return
    }
    setJobId('dev-job-' + Date.now())
    setBroadcasting(false)
    setStep('bidding')
    simulateBids(price, riders)
  }

  const handleAcceptBid = (bid: Bid) => {
    setSelectedBid(bid)
    setStep('payment')
  }

  const handleRejectBid = (bid: Bid) => {
    setRejectedIds(prev => new Set([...prev, bid.rider.id]))
  }

  const handleCounterBid = (bid: Bid) => {
    setCounteringBid(bid)
    setCounterValue(Math.round(bid.price * 0.85).toString())
  }

  const submitCounter = () => {
    if (!counteringBid || !counterValue) return
    const newPrice = parseInt(counterValue)
    setBids(prev => prev.map(b =>
      b.rider.id === counteringBid.rider.id
        ? { ...b, price: newPrice, originalPrice: b.price, countered: true }
        : b
    ))
    setCounteringBid(null)
  }

  const handlePayEscrow = async () => {
    const price = selectedBid!.price
    await openPaystackCheckout({
      email: user?.email ?? 'dev@kasaja.ng',
      amount: price * 100,
      ref: generateRef(),
      currency: 'NGN',
      metadata: { delivery_job_id: jobId, rider_id: selectedBid!.rider.id },
      callback: () => { void (async () => {
        if (!DEV && jobId) {
          await supabase.from('delivery_requests').update({
            rider_id: selectedBid!.rider.id,
            agreed_price: price * 100,
            status: 'assigned',
          }).eq('id', jobId)
        }
        setStep('tracking')
        simulateTracking()
      })() },
      onClose: () => {},
    })
  }

  const simulateTracking = () => {
    const stages = ['assigned', 'picking_up', 'in_transit', 'delivered']
    let i = 0
    const tick = () => {
      i++
      if (i < stages.length) {
        const t = setTimeout(() => { setTrackerStatus(stages[i]); tick() }, 8000)
        bidTimerRef.current.push(t)
      }
    }
    tick()
  }

  useEffect(() => {
    const timers = bidTimerRef.current
    return () => { timers.forEach(clearTimeout) }
  }, [])

  const suggestedPrice = calcSuggestedPrice(1.5, 'bike')
  const activeBids = bids.filter(b => !rejectedIds.has(b.rider.id))
  const cheapestBid = activeBids.reduce<Bid | null>((min, b) => (!min || b.price < min.price) ? b : min, null)

  // ── FORM ──────────────────────────────────────────────────────
  if (step === 'form') return (
    <div className="min-h-screen bg-canvas pb-8">
      <div className="sticky top-0 bg-canvas border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => void navigate(-1)} className="text-muted hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-white text-lg">Request Delivery</h1>
      </div>
      <div className="px-4 pt-6 space-y-5">
        <div className="bg-surface rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-brand-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">Pickup location</p>
              <input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Enter pickup address..." className="w-full bg-transparent text-white placeholder-white/30 text-sm outline-none" />
            </div>
            <button className="text-brand-500"><Navigation size={16} /></button>
          </div>
          <div className="border-t border-white/5" />
          <div className="flex items-start gap-3">
            <div className="mt-1 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">Delivery destination</p>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Enter destination address..." className="w-full bg-transparent text-white placeholder-white/30 text-sm outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 space-y-4">
          <h3 className="text-white font-semibold text-sm">Package Details</h3>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What are you sending? e.g. Bag of rice, 2 cartons of Indomie, a phone..." className="w-full bg-white/5 rounded-xl p-3 text-white text-sm placeholder-white/30 outline-none resize-none h-16" />
          <div>
            <p className="text-xs text-muted mb-2">Package size</p>
            <div className="flex gap-2">
              {[{value:'light',label:'Small',sub:'< 5kg'},{value:'medium',label:'Medium',sub:'5–20kg'},{value:'heavy',label:'Large',sub:'20kg+'}].map(opt => (
                <button key={opt.value} onClick={() => setWeight(opt.value)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${weight === opt.value ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-white/10 text-muted'}`}>
                  <div>{opt.label}</div>
                  <div className="text-xs opacity-70">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => void handleFindRiders()} disabled={!pickup || !destination || loading}
          className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-base">
          {loading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
            : <><Send size={18} />Find Available Riders<ChevronRight size={20} /></>}
        </button>
      </div>
    </div>
  )

  // ── RADAR ─────────────────────────────────────────────────────
  if (step === 'radar') return (
    <div className="min-h-screen bg-canvas flex flex-col pb-32">
      <div className="sticky top-0 bg-canvas border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => setStep('form')} className="text-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-white text-lg">Riders Near You</h1>
          <p className="text-xs text-muted">{pickup} → {destination}</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
          <span className="text-green-400 text-xs font-semibold">{riders.length} online</span>
        </div>
      </div>

      {/* Radar Map */}
      <div className="relative bg-[#0d1520] mx-4 mt-4 rounded-2xl overflow-hidden" style={{ height: 300 }}>
        {/* Radar rings + sweep + grid */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 10 }).map((_, i) => <line key={'h'+i} x1="0" y1={i*30} x2="100%" y2={i*30} stroke="white" strokeWidth="0.3" opacity="0.05" />)}
          {Array.from({ length: 14 }).map((_, i) => <line key={'v'+i} x1={i*30} y1="0" x2={i*30} y2="100%" stroke="white" strokeWidth="0.3" opacity="0.05" />)}
          <ellipse cx="50%" cy="50%" rx="18%" ry="13%" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.15" strokeDasharray="3 5" />
          <ellipse cx="50%" cy="50%" rx="35%" ry="25%" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.10" strokeDasharray="3 5" />
          <ellipse cx="50%" cy="50%" rx="48%" ry="36%" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.07" strokeDasharray="3 5" />
          <line x1="50%" y1="50%" x2="82%" y2="18%" stroke="#f97316" strokeWidth="1" opacity="0.2">
            <animateTransform attributeName="transform" type="rotate" from="0 50% 50%" to="360 50% 50%" dur="3s" repeatCount="indefinite" />
          </line>
        </svg>
        {/* YOU pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-5 h-5 rounded-full bg-brand-500 border-2 border-white shadow-lg shadow-brand-500/60" />
          <div className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping" />
        </div>
        {/* Rider count badge */}
        <div className="absolute top-3 right-3 z-20 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
          <span className="text-green-400 text-xs font-semibold">{riders.length} riders online</span>
        </div>
        {/* Distance labels */}
        <div className="absolute bottom-3 left-3 z-20 text-[9px] text-white/30 space-y-0.5">
          <div>● 0.5km</div><div>● 1.5km</div><div>● 3km</div>
        </div>
        {/* ALL rider pins — spread evenly using golden angle */}
        {riders.map((r, i) => {
          // Golden angle spiral: places N points evenly with no overlap
          const n = riders.length
          const goldenAngle = 2.399963 // radians ≈ 137.5°
          const angle = i * goldenAngle
          // Distance from center: scale by sqrt to fill area evenly
          const radiusPct = 8 + (Math.sqrt((i + 0.5) / n)) * 38
          // Convert polar → percent offset from center (50%, 42%)
          const cx = 50 + radiusPct * Math.cos(angle)
          const cy = 42 + radiusPct * Math.sin(angle) * 0.7 // compress Y for map perspective
          // Clamp to keep pins inside the map
          const left = Math.max(5, Math.min(88, cx)) + '%'
          const top = Math.max(5, Math.min(82, cy)) + '%'
          return (
            <div key={r.id} className="absolute z-10" style={{ top, left }}>
              <div className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shadow-lg cursor-pointer hover:scale-125 transition-transform ${r.badge === 'Top Rated' ? 'border-yellow-400' : r.badge === 'Budget' ? 'border-green-400' : 'border-brand-500'}`}>
                <span className={VEHICLE_COLORS[r.vehicle]}>{VEHICLE_ICONS[r.vehicle]}</span>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-white/60 bg-black/40 px-1 rounded">{r.eta}m</div>
            </div>
          )
        })}
      </div>

      {/* ALL riders list — scrollable */}
      <div className="px-4 mt-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold text-sm">{riders.length} riders available</h3>
          <span className="text-xs text-muted">Sorted by distance</span>
        </div>
        {[...riders].sort((a,b) => a.distance - b.distance).map(r => (
          <div key={r.id} className="bg-surface rounded-xl p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 ${VEHICLE_COLORS[r.vehicle]}`}>
              {VEHICLE_ICONS[r.vehicle]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">{r.name}</p>
                {r.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 shrink-0">{r.badge}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" />{r.rating}</span>
                <span>{r.trips.toLocaleString()} trips</span>
                <span className="text-green-400">{r.distance.toFixed(1)}km</span>
                <span className="flex items-center gap-1"><Clock size={10} />{r.eta}min</span>
              </div>
            </div>
            <div className="text-xs text-muted capitalize">{r.vehicle}</div>
          </div>
        ))}
      </div>

      {/* Price input — sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-white/10 px-4 pt-4 pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Set your offer price</h3>
          <span className="text-xs text-muted">Suggested: ₦{suggestedPrice.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2">
          <span className="text-brand-400 font-bold text-lg">₦</span>
          <input type="number" value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)}
            placeholder="Enter your offer..." className="flex-1 bg-transparent text-white text-xl font-bold outline-none placeholder-white/20" />
        </div>
        <div className="flex gap-2">
          {[Math.round(suggestedPrice * 0.8), suggestedPrice, Math.round(suggestedPrice * 1.2)].map(p => (
            <button key={p} onClick={() => setOfferedPrice(p.toString())}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${offeredPrice === p.toString() ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-white/10 text-muted'}`}>
              ₦{p.toLocaleString()}
            </button>
          ))}
        </div>
        <button onClick={() => void handleBroadcast()} disabled={broadcasting || !offeredPrice}
          className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all">
          {broadcasting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
            : <><Send size={18} />Broadcast to all {riders.length} riders</>}
        </button>
      </div>
    </div>
  )

  // ── BIDDING ───────────────────────────────────────────────────
  if (step === 'bidding') return (
    <div className="min-h-screen bg-canvas flex flex-col pb-8">
      <div className="sticky top-0 bg-canvas border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => { setStep('radar'); setBids([]); setRejectedIds(new Set()) }} className="text-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-white text-lg">Rider Bids</h1>
          <p className="text-xs text-muted">Your offer: ₦{parseInt(offeredPrice).toLocaleString()} · {activeBids.length} response{activeBids.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-400">
          <span className="animate-pulse w-2 h-2 rounded-full bg-brand-400" />Broadcasting
        </div>
      </div>

      {/* Best deal banner */}
      {cheapestBid && (
        <div className="mx-4 mt-4 bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">💡</span>
            <span className="text-green-300 text-sm font-medium">Best offer: ₦{cheapestBid.price.toLocaleString()} from {cheapestBid.rider.name}</span>
          </div>
          <button onClick={() => handleAcceptBid(cheapestBid)} className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">Accept</button>
        </div>
      )}

      <div className="px-4 pt-4 space-y-3">
        {activeBids.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <Bike size={28} className="text-brand-400 animate-bounce" />
            </div>
            <p className="text-white font-semibold">Broadcasting to {riders.length} riders...</p>
            <p className="text-muted text-sm mt-1">Riders will respond shortly</p>
          </div>
        )}

        {activeBids.map((bid, i) => (
          <div key={bid.rider.id} className={`bg-surface rounded-2xl p-4 border transition-all ${
            i === 0 ? 'border-brand-500/40' : bid === cheapestBid ? 'border-green-500/30' : 'border-white/5'
          }`}>
            {bid === cheapestBid && i > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-400 font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Best price
              </div>
            )}
            {i === 0 && bid !== cheapestBid && (
              <div className="flex items-center gap-1 text-xs text-brand-400 font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />First response
              </div>
            )}
            {bid.countered && (
              <div className="flex items-center gap-1 text-xs text-yellow-400 mb-2">
                <span>Your counter offer accepted</span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-lg font-bold text-brand-400">
                {bid.rider.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{bid.rider.name}</p>
                    {bid.rider.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400">{bid.rider.badge}</span>}
                  </div>
                  <div className="text-right">
                    {bid.originalPrice && <p className="text-xs text-muted line-through">₦{bid.originalPrice.toLocaleString()}</p>}
                    <span className={`font-bold text-lg ${bid.price <= parseInt(offeredPrice) ? 'text-green-400' : 'text-brand-400'}`}>₦{bid.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                  <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" />{bid.rider.rating}</span>
                  <span>{bid.rider.trips.toLocaleString()} trips</span>
                  <span>{bid.rider.distance.toFixed(1)}km</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{bid.rider.eta}m</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
                  <span className={VEHICLE_COLORS[bid.rider.vehicle]}>{VEHICLE_ICONS[bid.rider.vehicle]}</span>
                  <span className="capitalize">{bid.rider.vehicle}</span>
                </div>
                {bid.message && <p className="text-sm text-white/70 mt-1.5 italic">"{bid.message}"</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleAcceptBid(bid)}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
                <Check size={16} />Accept ₦{bid.price.toLocaleString()}
              </button>
              <button onClick={() => handleCounterBid(bid)}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-muted hover:text-white rounded-xl text-sm transition-all"
                title="Counter offer">
                <ChevronDown size={16} />
              </button>
              <button onClick={() => handleRejectBid(bid)}
                className="px-3 py-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-muted rounded-xl text-sm transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Counter offer sheet */}
      {counteringBid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setCounteringBid(null)}>
          <div className="bg-surface w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Counter offer to {counteringBid.rider.name}</h3>
            <p className="text-muted text-sm">Their price: ₦{counteringBid.price.toLocaleString()}. What do you want to offer?</p>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="text-brand-400 font-bold text-lg">₦</span>
              <input type="number" value={counterValue} onChange={e => setCounterValue(e.target.value)}
                className="flex-1 bg-transparent text-white text-xl font-bold outline-none" autoFocus />
            </div>
            <button onClick={submitCounter} className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl">Send Counter Offer</button>
          </div>
        </div>
      )}
    </div>
  )

  // ── PAYMENT ───────────────────────────────────────────────────
  if (step === 'payment') return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="sticky top-0 bg-canvas border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => setStep('bidding')} className="text-muted hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="font-display font-bold text-white text-lg">Confirm & Pay</h1>
      </div>
      <div className="px-4 pt-6 space-y-4">
        <div className="bg-surface rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400">
            {selectedBid?.rider.name[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">{selectedBid?.rider.name}</p>
            {selectedBid?.rider.badge && <span className="text-xs text-brand-400">{selectedBid.rider.badge}</span>}
            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span>{selectedBid?.rider.rating}</span>·<span>{selectedBid?.rider.trips.toLocaleString()} trips</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
              <span className={VEHICLE_COLORS[selectedBid?.rider.vehicle ?? 'bike']}>{VEHICLE_ICONS[selectedBid?.rider.vehicle ?? 'bike']}</span>
              <span className="capitalize">{selectedBid?.rider.vehicle}</span>·<Clock size={10} /><span>{selectedBid?.rider.eta} min ETA</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-brand-400 font-bold text-2xl">₦{selectedBid?.price.toLocaleString()}</p>
            <p className="text-xs text-muted">agreed price</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 space-y-3">
          <h3 className="text-white font-semibold text-sm">Delivery route</h3>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <div className="w-0.5 h-8 bg-white/10" />
              <MapPin size={12} className="text-green-400" />
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-muted">From</p><p className="text-white text-sm">{pickup}</p></div>
              <div><p className="text-xs text-muted">To</p><p className="text-white text-sm">{destination}</p></div>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Package size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-semibold text-sm">Protected by escrow</p>
              <p className="text-blue-300/70 text-xs mt-0.5">Payment held until you confirm delivery. Full refund if delivery fails.</p>
            </div>
          </div>
        </div>

        <button onClick={() => void handlePayEscrow()} className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-base transition-all">
          Pay ₦{selectedBid?.price.toLocaleString()} to Escrow
        </button>
        <p className="text-center text-xs text-muted">Powered by Paystack · Secured</p>
      </div>
    </div>
  )

  // ── TRACKING ──────────────────────────────────────────────────
  const stages = [
    { key: 'assigned',   label: 'Rider assigned',  sub: `${selectedBid?.rider.name} is heading to pickup`, icon: <Bike size={20} /> },
    { key: 'picking_up', label: 'Rider at pickup',  sub: 'Package being collected',                        icon: <Package size={20} /> },
    { key: 'in_transit', label: 'In transit',       sub: 'Your package is on the way',                     icon: <Navigation size={20} /> },
    { key: 'delivered',  label: 'Delivered!',       sub: 'Package has arrived',                            icon: <Check size={20} /> },
  ]
  const currentStageIdx = stages.findIndex(s => s.key === trackerStatus)

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="sticky top-0 bg-canvas border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <h1 className="font-display font-bold text-white text-lg flex-1">Live Tracking</h1>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="animate-pulse w-2 h-2 rounded-full bg-green-400" />Live
        </div>
      </div>

      <div className="relative bg-[#1a2535] mx-4 mt-4 rounded-2xl overflow-hidden" style={{ height: 220 }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 8 }).map((_, i) => <line key={'h'+i} x1="0" y1={i*28} x2="100%" y2={i*28} stroke="white" strokeWidth="0.5" />)}
          {Array.from({ length: 10 }).map((_, i) => <line key={'v'+i} x1={i*40} y1="0" x2={i*40} y2="100%" stroke="white" strokeWidth="0.5" />)}
        </svg>
        <div className="absolute top-4 right-8">
          <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
            <MapPin size={14} className="text-green-400" />
          </div>
        </div>
        <div className={`absolute transition-all duration-[3000ms] ${
          trackerStatus === 'assigned' ? 'bottom-8 left-8' :
          trackerStatus === 'picking_up' ? 'bottom-10 left-16' :
          trackerStatus === 'in_transit' ? 'bottom-12 left-28' : 'top-4 right-8'
        }`}>
          <div className="w-10 h-10 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center shadow-lg shadow-brand-500/50">
            <Bike size={16} className="text-white" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-3">
        {stages.map((stage, i) => {
          const done = i < currentStageIdx; const active = i === currentStageIdx
          return (
            <div key={stage.key} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${active ? 'bg-brand-500/10 border border-brand-500/30' : done ? 'opacity-60' : 'opacity-30'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500/20 text-green-400' : active ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-muted'}`}>
                {done ? <Check size={18} className="text-green-400" /> : stage.icon}
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${active ? 'text-white' : 'text-muted'}`}>{stage.label}</p>
                {active && <p className="text-xs text-muted mt-0.5">{stage.sub}</p>}
              </div>
              {active && <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
            </div>
          )
        })}
      </div>

      <div className="px-4 mt-4">
        <div className="bg-surface rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-xl font-bold text-brand-400">
            {selectedBid?.rider.name[0]}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">{selectedBid?.rider.name}</p>
            <p className="text-xs text-muted capitalize">{selectedBid?.rider.vehicle} · {selectedBid?.rider.rating} ★</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Phone size={18} /></button>
          <button className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400"><MessageSquare size={18} /></button>
        </div>
      </div>

      {trackerStatus === 'delivered' && (
        <div className="px-4 mt-4 pb-8">
          <button onClick={() => void navigate('/orders')} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl text-base transition-all">
            ✓ Confirm I Received My Package
          </button>
          <p className="text-center text-xs text-muted mt-2">Confirming releases payment to the rider</p>
        </div>
      )}
    </div>
  )
}
