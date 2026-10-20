import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Loader2, LocateFixed } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { NG_AREAS } from '@/lib/ngAreas'
import RiderCounterButton from '@/components/RiderCounterButton'
import RiderMap, { type MapPin as Pin } from '@/components/RiderMap'

interface Job {
  id: string
  pickup_address: string | null
  dropoff_address: string | null
  pickup_area: string | null
  dropoff_area: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  invited_rider_id: string | null
  agreed_fee_kobo: number | null
  agreed_price_kobo: number | null
  created_at: string
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`
const STATES = Object.keys(NG_AREAS)
const LAGOS = { lat: 6.5244, lng: 3.3792 }

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function RiderJobs() {
  const navigate = useNavigate()
  const [state, setState] = useState('')
  const [area, setArea] = useState('')
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [online, setOnline] = useState(false)
  const [me, setMe] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_requests')
      .select('id, pickup_address, dropoff_address, pickup_area, dropoff_area, pickup_lat, pickup_lng, invited_rider_id, agreed_fee_kobo, agreed_price_kobo, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(60)
    setJobs((data ?? []) as Job[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setMe(user.id)
        const { data } = await supabase.from('rider_profiles')
          .select('work_state, work_area, is_online, current_lat, current_lng').eq('id', user.id).maybeSingle()
        setState((data?.work_state as string) ?? '')
        setArea((data?.work_area as string) ?? '')
        setOnline(!!data?.is_online)
        if (data?.current_lat && data?.current_lng) setPos({ lat: Number(data.current_lat), lng: Number(data.current_lng) })
      }
      await load()
    })()
    const t = setInterval(() => { void load() }, 8000)
    return () => clearInterval(t)
  }, [load])

  async function savePlace(patch: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('rider_profiles').update(patch).eq('id', user.id)
    if (error) toast.error(error.message)
  }

  function movePin(lat: number, lng: number) {
    setPos({ lat, lng })
    void savePlace({ current_lat: lat, current_lng: lng, last_seen: new Date().toISOString() })
  }

  function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Location is not available on this device'); return }
    navigator.geolocation.getCurrentPosition(
      p => { movePin(p.coords.latitude, p.coords.longitude); toast.success('Location updated') },
      () => toast.error('Could not get your location. Tap the map to place yourself instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function toggleOnline() {
    const next = !online
    setOnline(next)
    await savePlace({ is_online: next, last_seen: new Date().toISOString() })
    if (next && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => movePin(p.coords.latitude, p.coords.longitude),
        () => toast('Tap the map to set your location so customers can see you', { icon: '📍' }),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    }
  }

  async function accept(job: Job) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('delivery_requests')
      .update({ status: 'accepted', rider_id: user?.id })
      .eq('id', job.id).eq('status', 'pending').select('id')
    if (error || !data || data.length === 0) { toast.error('This job is no longer available'); void load(); return }
    toast.success('Job accepted')
    void navigate('/rider')
  }

  const visible = jobs.filter(j => !skipped.has(j.id))
  const distanceOf = (j: Job) => (pos && j.pickup_lat && j.pickup_lng) ? km(pos, { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) }) : null
  const sorted = [...visible].sort((a, b) => {
    const ia = a.invited_rider_id === me ? 0 : 1, ib = b.invited_rider_id === me ? 0 : 1
    if (ia !== ib) return ia - ib
    const da = distanceOf(a), db = distanceOf(b)
    if (da !== null && db !== null) return da - db
    if (da !== null) return -1
    if (db !== null) return 1
    return 0
  })

  const pins: Pin[] = [
    ...(pos ? [{ id: 'me', lat: pos.lat, lng: pos.lng, kind: 'me' as const, label: 'You' }] : []),
    ...visible.filter(j => j.pickup_lat && j.pickup_lng).map(j => ({
      id: j.id, lat: Number(j.pickup_lat), lng: Number(j.pickup_lng), kind: 'job' as const,
      label: naira(j.agreed_price_kobo ?? j.agreed_fee_kobo ?? 0),
    })),
  ]

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white flex-1">Delivery jobs</h1>
        <button onClick={() => void toggleOnline()} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${online ? 'bg-green-500/20 text-green-400' : 'bg-surface-800 text-neutral-400'}`}>
          {online ? 'Online' : 'Offline'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <RiderMap center={pos ?? LAGOS} pins={pins} onMapClick={movePin} height={300} fit={false} />
        <button onClick={useMyLocation} className="w-full flex items-center justify-center gap-2 bg-surface-800 text-white py-3 rounded-xl text-sm font-semibold">
          <LocateFixed size={16} className="text-brand-500" /> Use my current location
        </button>
        <p className="text-xs text-neutral-500 text-center -mt-2">Or tap anywhere on the map to move your location.</p>

        <div className="bg-surface-900 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-white font-semibold">Where are you working today?</p>
          <select className="w-full bg-surface-800 rounded-xl px-3 py-2.5 text-white" value={state}
            onChange={e => { setState(e.target.value); setArea(''); void savePlace({ work_state: e.target.value || null, work_area: null }) }}>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {state && (
            <select className="w-full bg-surface-800 rounded-xl px-3 py-2.5 text-white" value={area}
              onChange={e => { setArea(e.target.value); void savePlace({ work_area: e.target.value || null }) }}>
              <option value="">Select your area</option>
              {NG_AREAS[state].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-500" /></div>}
        {!loading && sorted.length === 0 && <p className="text-center text-neutral-400 text-sm py-8">No open jobs right now. Check back soon.</p>}

        {sorted.map(j => {
          const fee = j.agreed_price_kobo ?? j.agreed_fee_kobo ?? 0
          const d = distanceOf(j)
          const near = d !== null ? d <= 5 : (!!area && j.pickup_area === area)
          return (
            <div key={j.id} className="bg-surface-900 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold flex items-center gap-1">
                    <MapPin size={14} className="text-brand-500 shrink-0" />
                    {(j.pickup_area || j.pickup_address || 'Pickup')} → {(j.dropoff_area || j.dropoff_address || 'Drop-off')}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-1">{j.pickup_address} → {j.dropoff_address}</p>
                  {j.invited_rider_id === me && <p className="text-xs font-bold text-brand-400 mt-1">You were invited to this job</p>}
                  <p className="text-xs mt-1">
                    {d !== null && <span className="text-neutral-300">{d.toFixed(1)} km from you · </span>}
                    {near ? <span className="text-green-400">Near you</span> : <span className="text-amber-300">Far from you</span>}
                  </p>
                </div>
                <p className="text-xl font-bold text-brand-400 shrink-0">{naira(fee)}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => void accept(j)} className="flex-1 bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm">Accept {naira(fee)}</button>
                <button onClick={() => setSkipped(s => new Set(s).add(j.id))} className="px-5 bg-surface-800 text-neutral-300 rounded-xl text-sm">Skip</button>
              </div>
              <RiderCounterButton jobId={j.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}