import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { supabase } from '@/lib/supabase'
import { ShieldCheck, Truck, Store, ArrowLeft, Info } from 'lucide-react'
import type { PaystackConfig } from '@/lib/paystack'

// Items can arrive from the cart (price in naira, "quantity") or from older
// screens (price_kobo, "qty"). We normalise both shapes here.
interface RawItem {
  id?: string
  product_id?: string
  title?: string
  price?: number
  price_kobo?: number
  qty?: number
  quantity?: number
  store_id?: string
  store_name?: string
  image?: string
}
interface Item {
  product_id: string
  title: string
  qty: number
  store_name: string
  image?: string
  price_kobo_hint: number // display only; real price is re-read from the database
}

function normalise(raw: RawItem): Item {
  const hint = raw.price_kobo ?? Math.round((raw.price ?? 0) * 100)
  return {
    product_id: raw.product_id ?? raw.id ?? '',
    title: raw.title ?? 'Item',
    qty: Math.max(1, raw.qty ?? raw.quantity ?? 1),
    store_name: raw.store_name ?? '',
    image: raw.image,
    price_kobo_hint: hint,
  }
}

function toNaira(k: number) {
  return `₦${(k / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

const DELIVERY_FEE_KOBO = 150000 // ₦1,500 placeholder until live delivery quotes are wired

export default function Checkout() {
  const { user } = useAuth()
  const { clear } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as { items?: RawItem[]; total?: number }
  const items: Item[] = (state.items ?? []).map(normalise).filter(i => i.product_id)

  const subtotal = items.reduce((s, i) => s + i.price_kobo_hint * i.qty, 0)
  const commission = Math.round(subtotal * 0.015)
  const cashback = Math.round(subtotal * 0.005)
  const total = subtotal + DELIVERY_FEE_KOBO

  const [protectOn, setProtectOn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string

  async function pay() {
    if (!user) { void navigate('/login'); return }
    if (!address.trim()) { toast.error('Enter your delivery address'); return }
    if (!paystackKey || paystackKey === 'pk_test_placeholder') {
      toast.error('Paystack key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to .env')
      return
    }
    setLoading(true)
    try {
      // 1. Read the REAL prices and stores from the database (never trust the browser)
      const ids = items.map(i => i.product_id)
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, store_id, price_kobo, status')
        .in('id', ids)
      if (prodErr || !products) { toast.error('Could not load product prices. Try again.'); return }

      const lines = []
      for (const item of items) {
        const p = products.find(x => x.id === item.product_id)
        if (!p || p.status !== 'active') { toast.error(`"${item.title}" is no longer available`); return }
        lines.push({ item, product: p, lineKobo: Number(p.price_kobo) * item.qty })
      }
      const itemsTotal = lines.reduce((s, l) => s + l.lineKobo, 0)
      const grandTotal = itemsTotal + DELIVERY_FEE_KOBO

      // 2. Create the orders as "pending" BEFORE payment
      const ref = `kasaja_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
      const baseShare = Math.floor(DELIVERY_FEE_KOBO / lines.length)
      const rows = lines.map((l, idx) => {
        const deliveryShare = idx === 0 ? DELIVERY_FEE_KOBO - baseShare * (lines.length - 1) : baseShare
        return {
          buyer_id: user.id,
          store_id: l.product.store_id as string,
          product_id: l.product.id as string,
          quantity: l.item.qty,
          unit_price_kobo: Number(l.product.price_kobo),
          total_kobo: l.lineKobo + deliveryShare,
          commission_kobo: Math.round(l.lineKobo * 0.015),
          cashback_kobo: Math.round(l.lineKobo * 0.005),
          delivery_fee_kobo: deliveryShare,
          status: 'pending',
          payment_route: 'paystack_direct',
          escrow_opted_in: protectOn,
          delivery_address: address.trim(),
          notes: note.trim() || null,
          paystack_ref: ref,
        }
      })
      const { data: created, error: orderErr } = await supabase.from('orders').insert(rows).select('id')
      if (orderErr || !created) { toast.error('Could not create your order: ' + (orderErr?.message ?? 'unknown error')); return }
      const orderIds = created.map(o => o.id as string)

      // 3. Load Paystack
      if (!window.PaystackPop) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://js.paystack.co/v1/inline.js'
          s.onload = () => res()
          s.onerror = () => rej(new Error('Failed to load Paystack'))
          document.head.appendChild(s)
        })
      }

      // 4. Open payment. The webhook (not this page) marks the orders as paid.
      const config: PaystackConfig = {
        key: paystackKey,
        email: user.email ?? `${user.id}@kasaja.ng`,
        amount: grandTotal,
        currency: 'NGN',
        ref,
        metadata: { type: 'order_payment', user_id: user.id, order_ids: orderIds },
        callback: () => {
          if (state.total !== undefined) clear()
          toast.success('Payment received. Your order is being confirmed.')
          void navigate('/orders', { state: { justPaid: true } })
        },
        onClose: () => { setLoading(false) },
      }
      window.PaystackPop.setup(config).openIframe()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-5">
        <Store className="w-12 h-12 text-surface-600" />
        <p className="text-surface-400">Your cart is empty</p>
        <button onClick={() => void navigate('/home')} className="bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Browse products</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white font-display">Checkout</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Items */}
        <div className="bg-surface-900 rounded-2xl divide-y divide-surface-800 overflow-hidden">
          {items.map(item => (
            <div key={item.product_id} className="flex items-center gap-3 p-4">
              {item.image && <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-surface-400 text-xs">{item.store_name} · qty {item.qty}</p>
              </div>
              <p className="text-brand-400 font-semibold text-sm">{toNaira(item.price_kobo_hint * item.qty)}</p>
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div className="space-y-2">
          <label className="text-surface-300 text-sm font-medium flex items-center gap-2"><Truck className="w-4 h-4 text-brand-500" /> Delivery Address</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter your full delivery address..."
            rows={2}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none"
          />
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note to seller (optional)"
            rows={1}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* Transaction protection toggle */}
        <div className="bg-surface-900 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span className="text-white text-sm font-semibold">Transaction Protection</span>
              </div>
              <p className="text-surface-400 text-xs leading-relaxed">
                We hold the release of your payment to the seller until you confirm you received your order. If something goes wrong, you can open a dispute.
              </p>
            </div>
            <button
              onClick={() => setProtectOn(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${protectOn ? 'bg-brand-500' : 'bg-surface-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${protectOn ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {!protectOn && (
            <div className="mt-3 flex items-start gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">Protection off — payment is released to the seller without waiting for your confirmation.</p>
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="bg-surface-900 rounded-2xl p-4 space-y-2.5">
          <h3 className="text-white font-semibold text-sm">Order Summary</h3>
          <div className="flex justify-between text-sm"><span className="text-surface-400">Subtotal</span><span className="text-white">{toNaira(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-surface-400">Platform fee (1.5%)</span><span className="text-white">{toNaira(commission)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-surface-400">Delivery estimate</span><span className="text-white">{toNaira(DELIVERY_FEE_KOBO)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-brand-400">Cashback (0.5%)</span><span className="text-brand-400">−{toNaira(cashback)}</span></div>
          <div className="border-t border-surface-700 pt-2 flex justify-between"><span className="text-white font-bold">Total</span><span className="text-brand-400 font-bold text-lg">{toNaira(total)}</span></div>
        </div>

        {/* Pay button */}
        <button
          onClick={() => void pay()}
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition-colors shadow-lg shadow-brand-500/30"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <>Pay {toNaira(total)} with Paystack</>}
        </button>

        <p className="text-center text-surface-500 text-xs">Secured by Paystack · SSL encrypted</p>
      </div>
    </div>
  )
}