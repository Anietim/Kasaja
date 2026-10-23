import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RiderMap, { type MapPin } from '@/components/RiderMap'
import AddressInput, { type Place } from '@/components/AddressInput'
import { UserTicks } from '@/components/Tick'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const LAGOS = { lat: 6.5244, lng: 3.3792 }
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

type LL = { lat: number; lng: number }
interface OrderRow {
  id: string
  delivery_address: string | null
  delivery_fee_kobo: number | null
  store: { name: string; address: string | null; state: string | null } | null
}
interface NearRider { id: string; display_name: string | null; vehicle_type: string; work_area: string | null; avg_rating: number; lat: number | null; lng: number | null }
interface Bid { id: string; amount_kobo: number }

function km(a: LL, b: LL) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

async function geocode(q: string): Promise<Place | null> {
  if (!TOKEN || !q.trim()) return null
  try {
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ng&limit=1&proximity=3.3792,6.5244&access_token=${TOKEN}`)
    if (!res.ok) return null
    const j = await res.json() as { features?: { geometry: { coordinates: [number, number] } }[] }
    const c = j.features?.[0]?.geometry.coordinates
    return c ? { text: q, lat: c[1], lng: c[0] } : null
  } catch { return null }
}

export default function FindRider() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [estimate, setEstimate] = useState(1500)
  const [price, setPrice] = useState(1500)
  const [riders, setRiders] = useState<NearRider[]>([])
  const [invited, setInvited] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase.from('orders')
        .select('id, delivery_address, delivery_fee_kobo, store:stores(name, address, state)')
        .eq('id', id).maybeSingle()
      const o = data as unknown as OrderRow | null
      setOrder(o)
      const est = Math.round((o?.delivery_fee_kobo || 150000) / 100)
      setEstimate(est); setPrice(est)
      const p = [o?.store?.address || o?.store?.name, o?.store?.state].filter(Boolean).join(', ')
      setPickup(p); setDropoff(o?.delivery_address || '')
      setFrom(await geocode(p)); setTo(await geocode(o?.delivery_address || ''))
      const { data: r } = await supabase.rpc('nearby_riders')
      setRiders(((r ?? []) as NearRider[]).map(x => ({ ...x, lat: x.lat === null ? null : Number(x.lat), lng: x.lng === null ? null : Number(x.lng) })))
    })()
  }, [id])

  useEffect(() => {
    if (!jobId) return
    const load = async () => {
      const { data } = await supabase.from('delivery_bids').select('id, amount_kobo').eq('request_id', jobId).eq('status', 'open').order('amount_kobo', { ascending: true })
      setBids((data ?? []) as Bid[])
    }
    void load()
    const t = setInterval(() => { void load() }, 4000)
    return () => clearInterval(t)
  }, [jobId])

  async function post() {
    if (!order) return
    setPosting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const kobo = price * 100
      const { data: job, error } = await supabase.from('delivery_requests').insert({
        order_id: order.id, requester_id: user?.id,
        pickup_address: pickup || 'Store pickup', dropoff_address: dropoff || 'See order',
        item_description: 'KASAJA order', package_description: 'KASAJA order',
        pickup_lat: from?.lat ?? null, pickup_lng: from?.lng ?? null,
        dropoff_lat: to?.lat ?? null, dropoff_lng: to?.lng ?? null,
        agreed_fee_kobo: kobo, agreed_price_kobo: kobo, status: 'pending', invited_rider_id: invited,
      }).select('id').single()
      if (error) throw error
      await supabase.from('orders').update({ status: 'shipped', shipped_at: new Date().toISOString(), tracking_number: 'KASAJA Rider' }).eq('id', order.id)
      setJobId(job.id as string)
      toast.success('Delivery request posted. Riders can now see it.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not post the job')
    } finally { setPosting(false) }
  }

  async function chooseBid(bidId: string) {
    const { error } = await supabase.rpc('accept_delivery_bid', { p_bid: bidId })
    if (error) { toast.error(error.message); return }
    toast.success('Rider assigned')
    void navigate('/store/dashboard')
  }

  if (!order) return <div className="min-h-screen bg-canvas flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>

  const change = (d: number) => setPrice(p => Math.min(50000, Math.max(300, p + d)))
  const ranked = [...riders].sort((a, b) => {
    if (!from) return 0
    const da = a.lat !== null && a.lng !== null ? km(from, { lat: a.lat, lng: a.lng }) : 9999
    const db = b.lat !== null && b.lng !== null ? km(from, { lat: b.lat, lng: b.lng }) : 9999
    return da - db
  })
  const pins: MapPin[] = [
    ...(from ? [{ id: 'a', lat: from.lat, lng: from.lng, kind: 'pickup' as const, label: 'Pickup' }] : []),
    ...(to ? [{ id: 'b', lat: to.lat, lng: to.lng, kind: 'dropoff' as const, label: 'Drop-off' }] : []),
    ...riders.filter(r => r.lat !== null && r.lng !== null).map(r => ({ id: r.id, lat: r.lat as number, lng: r.lng as number, kind: 'rider' as const, label: r.display_name ?? 'Rider' })),
  ]

  return (
    <div className="min-h-screen bg-canvas pb-32">
      <div className="sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white">Find a rider</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <RiderMap center={from ?? LAGOS} pins={pins} height={300} />

        <div className="bg-surface-900 rounded-2xl p-4 space-y-2">
          <AddressInput value={pickup} onChange={v => setPickup(v)} onPick={setFrom} placeholder="Pickup address" disabled={!!jobId} />
          <AddressInput value={dropoff} onChange={v => setDropoff(v)} onPick={setTo} placeholder="Drop-off address" disabled={!!jobId} />
        </div>

        <div className="bg-surface-900 rounded-2xl p-4 text-center">
          <p className="text-xs text-neutral-500">Estimated delivery bill{from && to ? ` · ${km(from, to).toFixed(1)} km` : ''}</p>
          <p className="text-neutral-300 text-sm mb-3">{naira(estimate)} (paid by the buyer)</p>
          <p className="text-xs text-neutral-500 mb-2">Your offer to riders</p>
          <div className="flex items-center justify-center gap-5">
            <button disabled={!!jobId} onClick={() => change(-100)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Minus /></button>
            <p className="text-3xl font-bold text-brand-400">{naira(price)}</p>
            <button disabled={!!jobId} onClick={() => change(100)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Plus /></button>
          </div>
          {price > estimate && <p className="text-xs text-amber-300 mt-3">You are offering {naira(price - estimate)} more than the buyer paid. You cover the difference.</p>}
        </div>

        <div className="bg-surface-900 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-1">Riders online ({ranked.length})</p>
          {ranked.length === 0 && <p className="text-xs text-neutral-500">No riders are online right now. You can still post the request.</p>}
          {ranked.map(r => {
            const d = from && r.lat !== null && r.lng !== null ? km(from, { lat: r.lat, lng: r.lng }) : null
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 py-2 border-t border-surface-800 text-sm">
                <div className="min-w-0">
                  <p className="text-white flex items-center gap-1"><span className="truncate">{r.display_name || 'Rider'}</span><UserTicks userId={r.id} size={14} /><span className="text-neutral-500 capitalize">· {r.vehicle_type}</span></p>
                  <p className="text-xs text-neutral-500">{d !== null ? `${d.toFixed(1)} km from pickup` : (r.work_area || 'Location not shared')} · ★ {Number(r.avg_rating || 0).toFixed(1)}</p>
                </div>
                {!jobId && (
                  <button onClick={() => setInvited(invited === r.id ? null : r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ${invited === r.id ? 'bg-brand-500 text-white' : 'bg-surface-800 text-white'}`}>
                    {invited === r.id ? 'Selected' : 'Choose rider'}
                  </button>
                )}
              </div>
            )
          })}
          {invited && !jobId && <p className="text-xs text-brand-400 mt-2">This rider will be notified. Other riders can still see the job.</p>}
        </div>

        {jobId && (
          <div className="bg-surface-900 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-2">Rider offers ({bids.length})</p>
            {bids.length === 0 && <p className="text-xs text-neutral-500">Waiting for riders. A rider can also accept your price directly.</p>}
            {bids.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-t border-surface-800">
                <span className="text-brand-400 font-bold">{naira(b.amount_kobo / 100)}</span>
                <button onClick={() => void chooseBid(b.id)} className="px-4 py-1.5 rounded-xl bg-brand-500 text-white text-sm font-semibold">Choose</button>
              </div>
            ))}
            <button onClick={() => void navigate('/store/dashboard')} className="mt-3 w-full text-center text-sm text-neutral-400">Back to my store</button>
          </div>
        )}
      </div>

      {!jobId && (
        <div className="fixed bottom-0 inset-x-0 bg-canvas/95 border-t border-surface-800 px-4 py-3">
          <button onClick={() => void post()} disabled={posting} className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            {posting && <Loader2 className="animate-spin" size={16} />} Post delivery request · {naira(price)}
          </button>
        </div>
      )}
    </div>
  )
}