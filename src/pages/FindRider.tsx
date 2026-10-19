import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Bike, Minus, Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface OrderRow {
  id: string
  delivery_address: string | null
  delivery_fee_kobo: number | null
  store: { name: string; address: string | null; state: string | null } | null
}
interface Bid { id: string; amount_kobo: number; rider_id: string }

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

export default function FindRider() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [estimate, setEstimate] = useState(1500)
  const [price, setPrice] = useState(1500)
  const [riders, setRiders] = useState<number | null>(null)
  const [posting, setPosting] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, delivery_address, delivery_fee_kobo, store:stores(name, address, state)')
        .eq('id', id).maybeSingle()
      const o = data as unknown as OrderRow | null
      setOrder(o)
      const est = Math.round((o?.delivery_fee_kobo || 150000) / 100)
      setEstimate(est)
      setPrice(est)
      const { count } = await supabase.from('rider_profiles')
        .select('id', { count: 'exact', head: true }).eq('is_online', true)
      setRiders(count ?? 0)
    })()
  }, [id])

  // After posting, check for rider offers every few seconds
  useEffect(() => {
    if (!jobId) return
    const load = async () => {
      const { data } = await supabase.from('delivery_bids')
        .select('id, amount_kobo, rider_id').eq('request_id', jobId).eq('status', 'open')
        .order('amount_kobo', { ascending: true })
      setBids((data ?? []) as Bid[])
    }
    void load()
    const t = setInterval(() => { void load() }, 4000)
    return () => clearInterval(t)
  }, [jobId])

  const step = 100
  const change = (d: number) => setPrice(p => Math.min(20000, Math.max(300, p + d)))

  async function post() {
    if (!order) return
    setPosting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const kobo = price * 100
      const { data: job, error } = await supabase.from('delivery_requests').insert({
        order_id: order.id,
        requester_id: user?.id,
        pickup_address: order.store?.address || order.store?.name || 'Store pickup',
        dropoff_address: order.delivery_address || 'See order',
        item_description: 'KASAJA order',
        package_description: 'KASAJA order',
        agreed_fee_kobo: kobo,
        agreed_price_kobo: kobo,
        status: 'pending',
      }).select('id').single()
      if (error) throw error
      await supabase.from('orders').update({
        status: 'shipped', shipped_at: new Date().toISOString(), tracking_number: 'KASAJA Rider',
      }).eq('id', order.id)
      setJobId(job.id as string)
      toast.success('Job posted. Riders can accept or send their own price.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not post the job')
    } finally {
      setPosting(false)
    }
  }

  async function chooseBid(bidId: string) {
    const { error } = await supabase.rpc('accept_delivery_bid', { p_bid: bidId })
    if (error) { toast.error(error.message); return }
    toast.success('Rider assigned')
    void navigate('/store/dashboard')
  }

  if (!order) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>
  }

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white">Find a rider</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-surface-900 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-neutral-500">Pickup</p>
          <p className="text-white text-sm">{order.store?.address || order.store?.name}</p>
          <p className="text-xs text-neutral-500 pt-2">Deliver to</p>
          <p className="text-white text-sm">{order.delivery_address || 'See order'}</p>
        </div>

        <div className="bg-surface-900 rounded-2xl p-4 text-center">
          <p className="text-xs text-neutral-500">Estimated delivery bill</p>
          <p className="text-neutral-300 text-sm mb-3">{naira(estimate)} (paid by the buyer)</p>
          <p className="text-xs text-neutral-500 mb-2">Your offer to riders</p>
          <div className="flex items-center justify-center gap-5">
            <button disabled={!!jobId} onClick={() => change(-step)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Minus /></button>
            <p className="text-3xl font-bold text-brand-400">{naira(price)}</p>
            <button disabled={!!jobId} onClick={() => change(step)} className="w-12 h-12 rounded-full bg-surface-800 text-white flex items-center justify-center disabled:opacity-40"><Plus /></button>
          </div>
          {price > estimate && (
            <p className="text-xs text-amber-300 mt-3">You are offering {naira(price - estimate)} more than the buyer paid. You cover the difference.</p>
          )}
        </div>

        <div className="flex items-center gap-3 bg-surface-900 rounded-2xl p-4">
          <Bike className="text-brand-500" />
          <p className="text-sm text-neutral-300">{riders === null ? 'Checking riders…' : `${riders} rider${riders === 1 ? '' : 's'} online now`}</p>
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
          <button onClick={() => void post()} disabled={posting} className="w-full max-w-lg mx-auto block bg-brand-500 text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            {posting ? 'Posting…' : `Post job for ${naira(price)}`}
          </button>
        </div>
      )}
    </div>
  )
}