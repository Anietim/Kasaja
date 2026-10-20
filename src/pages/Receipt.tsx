import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DeliveredHero from '@/components/home/DeliveredHero'

interface ReceiptRow {
  id: string
  order_number: string | null
  status: string
  created_at: string
  quantity: number
  unit_price_kobo: number
  total_kobo: number
  delivery_fee_kobo: number | null
  paystack_ref: string | null
  arc_tx_hash: string | null
  delivery_address: string | null
  buyer: { display_name: string | null } | null
  store: { name: string; owner: { display_name: string | null } | null } | null
  product: { title: string } | null
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`

export default function Receipt() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [r, setR] = useState<ReceiptRow | null>(null)
  const [rider, setRider] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at, quantity, unit_price_kobo, total_kobo, delivery_fee_kobo, paystack_ref, arc_tx_hash, delivery_address, buyer:profiles!buyer_id(display_name), store:stores(name, owner:profiles!owner_id(display_name)), product:products(title)')
        .eq('id', id).maybeSingle()
      setR((data as unknown as ReceiptRow | null) ?? null)
      const { data: d } = await supabase
        .from('delivery_requests')
        .select('rider:profiles!rider_id(display_name)')
        .eq('order_id', id).not('rider_id', 'is', null).limit(1)
      const row = (d ?? [])[0] as unknown as { rider?: { display_name?: string | null } } | undefined
      setRider(row?.rider?.display_name ?? null)
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="min-h-screen bg-canvas flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>
  if (!r) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-3">
      <p className="text-neutral-400">Receipt not found.</p>
      <button onClick={() => void navigate(-1)} className="text-brand-400">Go back</button>
    </div>
  )

  const number = r.order_number ?? r.id.slice(0, 8).toUpperCase()
  const delivery = r.delivery_fee_kobo ?? 0
  const rows: [string, string][] = [
    ['Order number', number],
    ['Date', new Date(r.created_at).toLocaleString('en-NG')],
    ['Status', r.status],
    ['Buyer', r.buyer?.display_name || 'KASAJA user'],
    ['Seller', r.store?.name || '—'],
    ['Seller account', r.store?.owner?.display_name || '—'],
    ['Rider', rider || 'Not assigned'],
    ['Deliver to', r.delivery_address || '—'],
    ['Payment reference', r.paystack_ref || '—'],
  ]

  return (
    <div className="min-h-screen bg-canvas pb-10">
      <div className="print:hidden sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white flex-1">Receipt</h1>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm text-brand-400"><Printer size={16} /> Print / Save PDF</button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-2">
        {(r.status === 'completed' || r.status === 'delivered' || r.arc_tx_hash) && (
        <DeliveredHero productTitle={r.product?.title ?? 'order'} onChain={!!r.arc_tx_hash} />
        )}
        <div className="bg-surface-900 print:bg-white print:text-black rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <p className="text-brand-400 font-extrabold tracking-tight text-xl">KASAJA</p>
            <p className="text-neutral-400 text-xs">Buy. Sell. Deliver. Connect.</p>
            <p className="text-white print:text-black font-bold mt-2">{number}</p>
          </div>

          <div className="divide-y divide-surface-800">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-neutral-400">{k}</span>
                <span className="text-white print:text-black text-right break-all">{v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-neutral-400">{r.product?.title || 'Item'} × {r.quantity}</span><span className="text-white print:text-black">{naira(r.unit_price_kobo * r.quantity)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-400">Delivery</span><span className="text-white print:text-black">{naira(delivery)}</span></div>
            <div className="flex justify-between pt-2 border-t border-surface-800 font-bold"><span className="text-white print:text-black">Total</span><span className="text-brand-400">{naira(r.total_kobo)}</span></div>
          </div>

          {r.arc_tx_hash ? (
            <a href={`https://explorer.arc.io/tx/${r.arc_tx_hash}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 border border-brand-500/40 rounded-xl py-3 text-brand-400 text-sm font-semibold">
              <ShieldCheck size={16} /> Verified on Arc
            </a>
          ) : (
            <p className="text-center text-xs text-neutral-500">The on-chain receipt appears once the buyer confirms delivery.</p>
          )}
        </div>
      </div>
    </div>
  )
}