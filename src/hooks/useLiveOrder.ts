import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { MapPin } from '@/components/RiderMap'

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

export interface LiveOrder {
  /** true when there is a real order in progress */
  active: boolean
  title: string
  line: string
  pct: number
  rider: string | null | undefined
  deliveryId: string | undefined
  pins: MapPin[]
}

/** The signed-in buyer's current order in progress, kept fresh with realtime updates. */
export function useLiveOrder(): LiveOrder {
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

    const channel = supabase
      .channel(`live-order-${user.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` }, () => { void load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests', filter: `requester_id=eq.${user.id}` }, () => { void load() })
      .subscribe()

    return () => { cancelled = true; void supabase.removeChannel(channel) }
  }, [user])

  if (!order) {
    return { active: false, title: '', line: 'No order on the way', pct: 0, rider: null, deliveryId: undefined, pins: [] }
  }

  const d = order.delivery?.[0]
  const { pct, line } = progressFor(order.status, d?.status)
  const rider = d?.rider?.display_name
  const pins: MapPin[] = []
  if (d?.rider_lat != null && d?.rider_lng != null) pins.push({ id: 'rider', kind: 'rider', lat: Number(d.rider_lat), lng: Number(d.rider_lng), label: rider ?? 'Rider' })
  if (d?.dropoff_lat != null && d?.dropoff_lng != null) pins.push({ id: 'drop', kind: 'dropoff', lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), label: 'You' })
  return { active: true, title: order.product?.title ?? 'Your order', line, pct, rider, deliveryId: d?.id, pins }
}
