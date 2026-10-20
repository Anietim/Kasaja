import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RiderMap, { type MapPin } from '@/components/RiderMap'
import { useAuth } from '@/hooks/useAuth'

type OrderRow = {
  id: string
  status: string
  product: { title: string } | null
  delivery: {
    id: string; status: string
    rider_lat: number | null; rider_lng: number | null
    dropoff_lat: number | null; dropoff_lng: number | null
    rider: { display_name: string | null } | null
  }[] | null
}

/** Maps what the database knows to a progress bar. No invented ETAs. */
function progressFor(order: string, delivery?: string): { pct: number; line: string } {
  if (delivery === 'in_transit') return { pct: 80, line: 'Your rider is on the way' }
  if (delivery === 'picked_up')  return { pct: 65, line: 'Rider has picked up your order' }
  if (delivery === 'accepted')   return { pct: 50, line: 'A rider accepted your delivery' }
  if (order === 'dispatched')    return { pct: 45, line: 'Seller has shipped your order' }
  if (order === 'processing')    return { pct: 30, line: 'Seller is preparing your order' }
  return { pct: 15, line: 'Payment confirmed' }
}

export default function LiveOrderCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderRow | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('id,status,product:products(title),delivery:delivery_requests(id,status,rider_lat,rider_lng,dropoff_lat,dropoff_lng,rider:profiles!rider_id(display_name))')
        .eq('buyer_id', user!.id)
        .in('status', ['paid', 'processing', 'dispatched'])
        .order('created_at', { ascending: false })
        .limit(1)
      if (!cancelled) setOrder(((data ?? [])[0] as unknown as OrderRow | undefined) ?? null)
    }
    void load()

    // Live updates: refresh whenever one of my orders or its delivery changes.
    const channel = supabase
      .channel(`live-order-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` }, () => { void load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests', filter: `requester_id=eq.${user.id}` }, () => { void load() })
      .subscribe()

    return () => { cancelled = true; void supabase.removeChannel(channel) }
  }, [user])

  if (!order) return null

  const d = order.delivery?.[0]
  const { pct, line } = progressFor(order.status, d?.status)
  const rider = d?.rider?.display_name

  // Live mini-map once a rider is sharing location and the drop-off is known.
  const pins: MapPin[] = []
  if (d?.rider_lat != null && d?.rider_lng != null) pins.push({ id: 'rider', kind: 'rider', lat: Number(d.rider_lat), lng: Number(d.rider_lng), label: rider ?? 'Rider' })
  if (d?.dropoff_lat != null && d?.dropoff_lng != null) pins.push({ id: 'drop', kind: 'dropoff', lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), label: 'You' })

  return (
    <div className="px-4 pt-4">
      <button
        onClick={() => void navigate(d ? `/delivery/${d.id}` : '/orders')}
        className="w-full text-left rounded-3xl p-5 transition-transform active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg,#FF7A00,#F0506E)', color: '#1A0B05' }}
        aria-label={`Order in progress: ${order.product?.title ?? 'your order'}. ${line}`}
      >
        <span className="text-[11px] font-extrabold tracking-[0.12em]">ORDER IN PROGRESS</span>
        <p className="text-xl font-extrabold tracking-tight mt-2">{order.product?.title ?? 'Your order'}</p>
        <p className="text-sm font-medium mt-1">{rider ? `${line}, rider ${rider}` : line}</p>
        <div className="h-2 rounded-full mt-4 mb-3" style={{ background: 'rgba(26,11,5,0.25)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: '#1A0B05' }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold">Confirm on arrival to get your receipt</span>
          <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#1A0B05' }}>
            <ArrowRight size={18} color="#fff" />
          </span>
        </div>
      </button>

      {pins.length > 0 && (
        <div className="mt-3 rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <RiderMap center={{ lat: pins[0].lat, lng: pins[0].lng }} pins={pins} height={160} />
        </div>
      )}
    </div>
  )
}