import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus, Loader2, ArrowUpDown, LocateFixed, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RiderMap, { type MapPin } from '@/components/RiderMap'
import AddressInput, { type Place } from '@/components/AddressInput'
import { useDesk } from '@/hooks/useDesk'

const LAGOS = { lat: 6.5244, lng: 3.3792 }
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

type LL = { lat: number; lng: number }
interface NearRider { id: string; display_name: string | null; vehicle_type: string; work_area: string | null; avg_rating: number; lat: number | null; lng: number | null }
interface Bid { id: string; amount_kobo: number }

function km(a: LL, b: LL) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
const estimate = (d: number) => Math.max(500, Math.round((600 + 120 * d) / 50) * 50)

const WARM = 'var(--k-accent)'
const CARD = { background: 'var(--k-surface)', border: '1px solid var(--k-line)' }
const FIELD = 'w-full h-12 rounded-2xl pl-11 pr-4 text-[15px] text-white placeholder:text-white/35 outline-none transition-colors disabled:opacity-60'
const vehicleIcon = (v: string) => /car|van|truck|bus/i.test(v) ? '🚗' : /bi(cycle|ke)/i.test(v) && !/motor/i.test(v) ? '🚲' : '🏍️'

function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width:1700px)').matches)
  useEffect(() => {
    const q = window.matchMedia('(min-width:1700px)')
    const on = () => setWide(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return wide
}

export default function RequestRider() {
  const navigate = useNavigate()
  const wide = useWide()
  const desk = useDesk()
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [item, setItem] = useState('')
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [riders, setRiders] = useState<NearRider[]>([])
  const [invited, setInvited] = useState<string | null>(null)
  const [price, setPrice] = useState(1000)
  const [posting, setPosting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc('nearby_riders')
      if (error) { toast.error(error.message); return }
      setRiders(((data ?? []) as NearRider[]).map(r => ({ ...r, lat: r.lat === null ? null : Number(r.lat), lng: r.lng === null ? null : Number(r.lng) })))
    })()
  }, [])

  useEffect(() => { if (from && to) setPrice(estimate(km(from, to))) }, [from, to])

  useEffect(() => {
    if (!jobId) return
    const tick = async () => {
      const { data: job } = await supabase.from('delivery_requests').select('status').eq('id', jobId).maybeSingle()
      if (job && String(job.status) !== 'pending') { toast.success('A rider accepted your job'); void navigate(`/delivery/${jobId}`); return }
      const { data } = await supabase.from('delivery_bids').select('id, amount_kobo').eq('request_id', jobId).eq('status', 'open').order('amount_kobo', { ascending: true })
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
        requester_id: user?.id, pickup_address: pickup, dropoff_address: dropoff,
        item_description: item || 'Package', package_description: item || 'Package',
        pickup_lat: from.lat, pickup_lng: from.lng, dropoff_lat: to.lat, dropoff_lng: to.lng,
        agreed_fee_kobo: kobo, agreed_price_kobo: kobo, status: 'pending', invited_rider_id: invited,
      }).select('id').single()
      if (error) throw error
      setJobId(data.id as string)
      toast.success('Request posted. Riders can now see it.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the request')
    } finally { setPosting(false) }
  }

  async function chooseBid(id: string) {
    const { error } = await supabase.rpc('accept_delivery_bid', { p_bid: id })
    if (error) { toast.error(error.message); return }
    void navigate(`/delivery/${jobId}`)
  }

  function locateMe() {
    if (!navigator.geolocation) { toast.error('Location is not available on this device'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p: Place = { text: 'My current location', lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPickup(p.text); setFrom(p)
      },
      () => toast.error('Allow location access to use your current location'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function swap() {
    setPickup(dropoff); setDropoff(pickup)
    setFrom(to); setTo(from)
  }

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

  const dist = from && to ? km(from, to) : null
  const fair = dist !== null ? estimate(dist) : null

  const postLabel = `Post delivery request · ${naira(price)}`

  return (
    <div className={`min-h-screen ${desk ? 'pb-10' : 'pb-44'}`} style={{ background: 'var(--k-bg)' }}>
      <div className="max-w-[1180px] mx-auto px-4 pt-4">

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => void navigate(-1)} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center" style={CARD}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-xl font-extrabold tracking-tight leading-tight">Request a rider</h1>
            <p className="text-xs" style={{ color: '#A59DA8' }}>Send a package anywhere in Lagos. You set the price.</p>
          </div>
        </div>

        <div className="min-[1700px]:grid min-[1700px]:grid-cols-[minmax(0,1fr)_420px] min-[1700px]:gap-6 space-y-4 min-[1700px]:space-y-0">

          {/* Map */}
          <div className="min-[1700px]:sticky min-[1700px]:top-4 min-[1700px]:self-start">
            <RiderMap center={from ?? LAGOS} pins={pins} height={wide ? 620 : 340} controls="full" />
            <div className="flex items-center gap-4 mt-3 px-1 text-xs" style={{ color: '#A59DA8' }}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Pickup</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Drop-off</span>
              <span className="flex items-center gap-1.5"><span>🏍️</span> Riders online</span>
            </div>
          </div>

          {/* Panel */}
          <div className="space-y-4">

            {/* Route */}
            <div className="rounded-3xl p-4" style={CARD}>
              <p className="text-white font-bold text-[15px] mb-3">Where to?</p>
              <div className="relative">
                {/* connector between the two dots */}
                <span aria-hidden className="absolute left-[21px] top-[34px] h-[44px] w-px" style={{ background: 'var(--k-line2)' }} />
                <div className="space-y-2.5">
                  <div className="relative">
                    <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 pointer-events-none" style={{ background: '#FF8A3D' }} />
                    <AddressInput
                      value={pickup}
                      onChange={v => { setPickup(v); setFrom(null) }}
                      onPick={setFrom}
                      placeholder="Pickup address"
                      disabled={!!jobId}
                      inputClassName={FIELD + ' pr-12'}
                    />
                    {!jobId && (
                      <button type="button" onClick={locateMe} aria-label="Use my current location"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-10"
                        style={{ color: 'var(--k-accent)', background: 'var(--k-accent-soft)' }}>
                        <LocateFixed size={16} />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-[3px] z-10 pointer-events-none" style={{ background: '#16A34A' }} />
                    <AddressInput
                      value={dropoff}
                      onChange={v => { setDropoff(v); setTo(null) }}
                      onPick={setTo}
                      placeholder="Drop-off address"
                      disabled={!!jobId}
                      inputClassName={FIELD + ' pr-12'}
                    />
                    {!jobId && (
                      <button type="button" onClick={swap} aria-label="Swap pickup and drop-off"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-10"
                        style={{ color: 'var(--k-muted)', background: 'var(--k-surface2)' }}>
                        <ArrowUpDown size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                className="w-full h-12 rounded-2xl px-4 mt-2.5 text-[15px] text-white placeholder:text-white/35 outline-none disabled:opacity-60"
                style={{ background: 'var(--k-surface2)', border: '1px solid var(--k-line)' }}
                placeholder="What are you sending? (optional)"
                value={item} onChange={e => setItem(e.target.value)} disabled={!!jobId}
              />
              {!(from && to) && (
                <p className="text-xs mt-2.5" style={{ color: '#A59DA8' }}>
                  Type an address and pick it from the suggestions, or tap the target button to use where you are.
                </p>
              )}
            </div>

            {/* Price */}
            {from && to && dist !== null && fair !== null && (
              <div className="rounded-3xl p-5 text-center" style={CARD}>
                <p className="text-xs font-semibold tracking-wide" style={{ color: '#A59DA8' }}>ESTIMATED BILL · {dist.toFixed(1)} KM</p>
                <div className="flex items-center justify-center gap-5 mt-3">
                  <button disabled={!!jobId} onClick={() => change(-100)} aria-label="Lower the price by 100 naira"
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-transform active:scale-90"
                    style={{ background: 'var(--k-surface2)', border: '1px solid var(--k-line2)' }}><Minus size={20} /></button>
                  <p className="font-mono text-4xl font-bold tabular-nums" style={{ color: 'var(--k-accent)' }}>{naira(price)}</p>
                  <button disabled={!!jobId} onClick={() => change(100)} aria-label="Raise the price by 100 naira"
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-transform active:scale-90"
                    style={{ background: 'var(--k-surface2)', border: '1px solid var(--k-line2)' }}><Plus size={20} /></button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {price !== fair && !jobId && (
                    <button onClick={() => setPrice(fair)} className="h-8 px-3.5 rounded-full text-xs font-bold"
                      style={{ background: 'var(--k-accent-soft)', color: 'var(--k-accent)' }}>Reset to {naira(fair)}</button>
                  )}
                  {price > fair && !jobId && <span className="text-xs" style={{ color: '#34D399' }}>Higher offers get picked up faster</span>}
                </div>
                <p className="text-xs mt-3" style={{ color: '#A59DA8' }}>An estimate. Riders can accept your price or send their own.</p>
              </div>
            )}

            {/* Riders */}
            <div className="rounded-3xl p-4" style={CARD}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-bold text-[15px]">Riders online</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.14)', color: '#34D399' }}>{ranked.length}</span>
              </div>
              {ranked.length === 0 && <p className="text-xs pt-2" style={{ color: '#A59DA8' }}>No riders are online right now. You can still post the request.</p>}
              {ranked.map(r => {
                const d = from && r.lat !== null && r.lng !== null ? km(from, { lat: r.lat, lng: r.lng }) : null
                const picked = invited === r.id
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3" style={{ borderTop: '1px solid var(--k-line)' }}>
                    <span className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--k-surface2)' }}>{vehicleIcon(r.vehicle_type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-bold truncate">{r.display_name || 'Rider'} <span className="font-medium capitalize" style={{ color: '#A59DA8' }}>· {r.vehicle_type}</span></p>
                      <p className="text-xs truncate" style={{ color: '#A59DA8' }}>
                        {d !== null ? `${d.toFixed(1)} km from pickup` : (r.work_area || 'Location not shared')} · ★ {Number(r.avg_rating || 0).toFixed(1)}
                      </p>
                    </div>
                    {!jobId && (
                      <button onClick={() => setInvited(picked ? null : r.id)}
                        className="h-9 px-4 rounded-full text-[13px] font-bold shrink-0 flex items-center gap-1.5 transition-transform active:scale-95"
                        style={picked
                          ? { background: WARM, color: 'var(--k-on-accent)' }
                          : { background: 'transparent', color: 'var(--k-text)', border: '1px solid var(--k-line2)' }}>
                        {picked && <Check size={14} />}{picked ? 'Selected' : 'Choose'}
                      </button>
                    )}
                  </div>
                )
              })}
              {invited && <p className="text-xs mt-1" style={{ color: 'var(--k-accent)' }}>This rider will be notified. Other riders can still see the job.</p>}
            </div>

            {/* Offers after posting */}
            {jobId && (
              <div className="rounded-3xl p-4" style={CARD}>
                <p className="text-white font-bold text-[15px] mb-2">Rider offers ({bids.length})</p>
                {bids.length === 0 && (
                  <p className="text-xs flex items-center gap-2" style={{ color: '#A59DA8' }}>
                    <Loader2 className="animate-spin" size={14} /> Waiting for riders to accept or send a price…
                  </p>
                )}
                {bids.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--k-line)' }}>
                    <span className="font-mono text-lg font-bold" style={{ color: 'var(--k-accent)' }}>{naira(b.amount_kobo / 100)}</span>
                    <button onClick={() => void chooseBid(b.id)} className="h-10 px-5 rounded-full text-sm font-extrabold" style={{ background: WARM, color: 'var(--k-on-accent)' }}>Choose</button>
                  </div>
                ))}
              </div>
            )}

            {/* Post button: inside the panel on wide screens */}
            {from && to && !jobId && desk && (
              <button onClick={() => void post()} disabled={posting}
                className="flex w-full h-14 items-center justify-center gap-2 rounded-full font-extrabold text-base disabled:opacity-60 transition-transform active:scale-[0.98]"
                style={{ background: WARM, color: 'var(--k-on-accent)' }}>
                {posting && <Loader2 className="animate-spin" size={18} />} {postLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post button: bottom bar on phones, above the tab bar */}
      {from && to && !jobId && !desk && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-4 pb-3 pt-6" style={{ background: 'linear-gradient(to top, var(--k-bg) 60%, transparent)' }}>
          <button onClick={() => void post()} disabled={posting}
            className="w-full h-14 flex items-center justify-center gap-2 rounded-full font-extrabold text-base disabled:opacity-60 active:scale-[0.98] transition-transform"
            style={{ background: WARM, color: 'var(--k-on-accent)' }}>
            {posting && <Loader2 className="animate-spin" size={18} />} {postLabel}
          </button>
        </div>
      )}
    </div>
  )
}
