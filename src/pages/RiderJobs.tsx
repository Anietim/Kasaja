import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { NG_AREAS } from '@/lib/ngAreas'
import RiderCounterButton from '@/components/RiderCounterButton'

interface Job {
  id: string
  pickup_address: string | null
  dropoff_address: string | null
  pickup_area: string | null
  dropoff_area: string | null
  agreed_fee_kobo: number | null
  agreed_price_kobo: number | null
  created_at: string
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`
const STATES = Object.keys(NG_AREAS)

export default function RiderJobs() {
  const navigate = useNavigate()
  const [state, setState] = useState('')
  const [area, setArea] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_requests')
      .select('id, pickup_address, dropoff_address, pickup_area, dropoff_area, agreed_fee_kobo, agreed_price_kobo, created_at')
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
        const { data } = await supabase.from('rider_profiles').select('work_state, work_area').eq('id', user.id).maybeSingle()
        setState((data?.work_state as string) ?? '')
        setArea((data?.work_area as string) ?? '')
      }
      await load()
    })()
    const t = setInterval(() => { void load() }, 8000)
    return () => clearInterval(t)
  }, [load])

  async function saveLocation(s: string, a: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('rider_profiles').update({ work_state: s || null, work_area: a || null }).eq('id', user.id)
    if (error) toast.error(error.message)
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
  const near = visible.filter(j => area && j.pickup_area === area)
  const far = visible.filter(j => !(area && j.pickup_area === area))

  const card = (j: Job, isNear: boolean) => {
    const fee = j.agreed_price_kobo ?? j.agreed_fee_kobo ?? 0
    return (
      <div key={j.id} className="bg-surface-900 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold flex items-center gap-1">
              <MapPin size={14} className="text-brand-500 shrink-0" />
              {(j.pickup_area || j.pickup_address || 'Pickup')} → {(j.dropoff_area || j.dropoff_address || 'Drop-off')}
            </p>
            <p className="text-xs text-neutral-500 truncate mt-1">{j.pickup_address} → {j.dropoff_address}</p>
            <p className="text-xs mt-1">{isNear ? <span className="text-green-400">Near you</span> : <span className="text-amber-300">Far from your area</span>}</p>
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
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white">Delivery jobs</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="bg-surface-900 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-white font-semibold">Where are you working today?</p>
          <select className="w-full bg-surface-800 rounded-xl px-3 py-2.5 text-white" value={state}
            onChange={e => { setState(e.target.value); setArea(''); void saveLocation(e.target.value, '') }}>
            <option value="">Select state</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {state && (
            <select className="w-full bg-surface-800 rounded-xl px-3 py-2.5 text-white" value={area}
              onChange={e => { setArea(e.target.value); void saveLocation(state, e.target.value) }}>
              <option value="">Select your area</option>
              {NG_AREAS[state].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <p className="text-xs text-neutral-500">Change this any time to see jobs in another area.</p>
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-500" /></div>}
        {!loading && visible.length === 0 && <p className="text-center text-neutral-400 text-sm py-8">No open jobs right now. Check back soon.</p>}

        {near.length > 0 && <p className="text-xs uppercase tracking-wide text-neutral-500">Near you</p>}
        {near.map(j => card(j, true))}
        {far.length > 0 && <p className="text-xs uppercase tracking-wide text-neutral-500">{area ? 'Other areas' : 'All jobs'}</p>}
        {far.map(j => card(j, false))}
      </div>
    </div>
  )
}