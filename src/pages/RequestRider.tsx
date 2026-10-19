import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus, Loader2, Bike } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RiderMap, { type MapPin } from '@/components/RiderMap'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const LAGOS = { lat: 6.5244, lng: 3.3792 }
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

type LL = { lat: number; lng: number }
interface MapRider { id: string; display_name: string | null; vehicle_type: string; avg_rating: number; lat: number; lng: number; work_area: string | null }
interface Bid { id: string; amount_kobo: number }

function km(a: LL, b: LL) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

async function geocode(q: string): Promise<LL | null> {
  if (!TOKEN || !q.trim()) return null
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ng&limit=1&access_token=${TOKEN}`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const c = j.features?.[0]?.geometry?.coordinates as [number, number] | undefined
    return c ? { lat: c[1], lng: c[0] } : null
  } catch { return null }
}

const estimate = (distanceKm: number) => Math.max(500, Math.round((600 + 120 * distanceKm) / 50) * 50)

export default function RequestRider() {
  const navigate = useNavigate()
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [item, setItem] = useState('')
  const [from, setFrom] = useState<LL | null>(null)
  const [to, setTo] = useState<LL | null>(null)
  const [riders, setRiders] = useState<MapRider[]>([])
  const [price, setPrice] = useState(1000)
  const [finding, setFinding] = useState(false)
  const [posting, setPosting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>([])

  async function findRiders() {
    if (!pickup.trim() || !dropoff.trim()) { toast.error('Enter the pickup and drop-off addresses'); return }
    setFinding(true)
    const [a, b] = await Promise.all([geocode(pickup), geocode(dropoff)])
    if (!a || !b) { toast.error('Could not find one of the addresses on the map. Add the area or city.'); setFinding(false); return }
    setFrom(a); setTo(b)
    setPrice(estimate(km(a, b)))
    const { data } = await supabase.rpc('riders_map')
    setRiders(((data ?? []) as MapRider[]).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })))
    setFinding(false)
  }

  // After posting: watch for offers, and for a rider accepting directly
  useEffect(() => {
    if (!jobId) return
    const tick = async () => {
      const { data: job } = await supabase.from('delivery_requests').select('status').eq('id', jobId).maybeSingle()
      if (job && String(job.status) !== 'pending') { toast.success('A rider accepted your job'); void navigate(`/delivery/${jobId}`); return }
      const { data } = await supabase.from('delivery_bids')
        .select('id, amount_kobo').eq('request_id', jobId).eq('status', 'open').order('amount_kobo', { ascending: true })
      setBids((data ?? []) as Bid[])
    }
    void tick()
    const t = setInterval(() => { void tick() }, 4000)
    return () => clearInterval(t)
  }, [jobId, navigate])

  async function post() {
    if (!from || !to) return
    setPosting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const kobo = price * 100
      const { data, error } = await supabase.from('delivery_requests').insert({
        requester_id: user?.id,
        pickup_address: pickup, dropoff_address: dropoff,
        item_description: item || 'Package', package_description: item || 'Package',
        pickup_lat: from.lat, pickup_lng: from.lng, dropoff_lat: to.lat, dropoff_lng: to.lng,
        agreed_fee_kobo: kobo, agreed_price_kobo: kobo, status: 'pending',
      }).select('id').single()
      if (error) throw error
      setJobId(data.id as string)
      toast.success('Request sent to riders')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the request')
    } finally { setPosting(false) }
  }

  async function chooseBid(id: string) {
    const { error } = await supabase.rpc('accept_delivery_bid', { p_bid: id })
    if (error) { toast.error(error.message); return }
    void navigate(`/delivery/${jobId}`)
  }

  const change = (d: number) => setPrice(p => Math.min(50000, Math.max(300, p + d)))
  const pins: MapPin[] = [
    ...(from ? [{ id: 'a', lat: from.lat, lng: from.lng, kind: 'pickup' as const, label: 'Pickup' }] : []),
    ...(to ? [{ id: 'b', lat: to.lat, lng: to.lng, kind: 'dropoff' as const, label: 'Drop-off' }] : []),
    ...riders.map(r => ({ id: r.id, lat: r.lat, lng: r.lng, kind: 'rider' as const, label: r.display_name ?? 'Rider' })),
  ]
  const ranked = from ? [...riders].sort((a, b) => km(from, a) - km(from, b)) : []
  const input = 'w-full bg-surface-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500'

  return (
    <div className="min-h-screen bg-canvas pb-32">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white">Request a rider</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <RiderMap center={from ?? LAGOS} pins={pins} height={280} />

        <div className="bg-surface-900 rounded-2xl p-4 space-y-2">
          <input className={input} placeholder="Pickup address (e.g. Kilo, Surulere, Lagos)" value={pickup} onChange={e => setPickup(e.target.value)} disabled={!!jobId} />
          <input className={input} placeholder="Drop-off address (e.g. Ketu, Kosofe, Lagos)" value={dropoff} onChange={e => setDropoff(e.target.value)} disabled={!!jobId} />
          <input className={input} placeholder="What are you sending? (optional)" value={item} onChange={e => setItem(e.target.value)} disabled={!!jobId} />
          {!jobId && (
            <button onClick={() => void findRiders()} disabled={finding} className="w-full bg-surface-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
              {finding ? <Loader2 className="animate-spin" size={16} /> : <Bike size={16} className="text-brand-500" />} Show map and riders
            </button>
          )}
        </div>

        {from && to && (
          <>
            <div className="bg-surface-900 rounded-2xl p-4 text-center">
              <p className="text-xs text-neutral-500">Estimated bill for {km(from, to).toFixed(1)} km</p>
              <div className="flex items-center justify-center gap-5 mt-2">
                <button disabled={!!jobId} onClick={() => change(-100)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Minus /></button>
                <p className="text-3xl font-bold text-brand-400">{naira(price)}</p>
                <button disabled={!!jobId} onClick={() => change(100)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Plus /></button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">This is an estimate. Raise or lower your offer, and riders can accept it or send their own price.</p>
            </div>

            <div className="bg-surface-900 rounded-2xl p-4">
              <p className="text-white font-semibold text-sm mb-2">Riders online ({ranked.length})</p>
              {ranked.length === 0 && <p className="text-xs text-neutral-500">No riders are sharing their location right now. You can still post the request.</p>}
              {ranked.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-t border-surface-800 text-sm">
                  <div>
                    <p className="text-white">{r.display_name || 'Rider'} <span className="text-neutral-500 capitalize">· {r.vehicle_type}</span></p>
                    <p className="text-xs text-neutral-500">{r.work_area || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white">{km(from, r).toFixed(1)} km away</p>
                    <p className="text-xs text-amber-300">★ {Number(r.avg_rating || 0).toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {jobId && (
          <div className="bg-surface-900 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-2">Rider offers ({bids.length})</p>
            {bids.length === 0 && <p className="text-xs text-neutral-500">Waiting for riders to accept or send a price…</p>}
            {bids.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-t border-surface-800">
                <span className="text-brand-400 font-bold">{naira(b.amount_kobo / 100)}</span>
                <button onClick={() => void chooseBid(b.id)} className="px-4 py-1.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">Choose</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {from && to && !jobId && (
        <div className="fixed bottom-0 inset-x-0 bg-canvas/95 border-t border-surface-800 px-4 py-3">
          <button onClick={() => void post()} disabled={posting} className="w-full max-w-lg mx-auto block bg-brand-500 text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            {posting ? 'Sending…' : `Request a rider for ${naira(price)}`}
          </button>
        </div>
      )}
    </div>
  )
}