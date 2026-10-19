import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  Package, ChevronRight, Star, MessageCircle, Store,
  AlertTriangle, CheckCircle, Clock, Truck, X, ArrowLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Order {
  id: string
  status: string
  total_kobo: number
  created_at: string
  escrow_opted_in: boolean
  payment_route: string
  store: { name: string; avatar_url: string | null } | null
  items: { title: string; qty: number; price_kobo: number }[]
  rating?: number
    arc_tx_hash?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10', icon: <Clock size={14} /> },
  paid: { label: 'Paid', color: 'text-blue-400 bg-blue-400/10', icon: <CheckCircle size={14} /> },
  processing: { label: 'Processing', color: 'text-blue-400 bg-blue-400/10', icon: <Clock size={14} /> },
  shipped: { label: 'Shipped', color: 'text-purple-400 bg-purple-400/10', icon: <Truck size={14} /> },
  dispatched: { label: 'On the way', color: 'text-purple-400 bg-purple-400/10', icon: <Truck size={14} /> },
  accepted: { label: 'Accepted', color: 'text-blue-400 bg-blue-400/10', icon: <CheckCircle size={14} /> },
  packed: { label: 'Packed', color: 'text-blue-400 bg-blue-400/10', icon: <Clock size={14} /> },
  in_transit: { label: 'On the way', color: 'text-purple-400 bg-purple-400/10', icon: <Truck size={14} /> },
  delivered: { label: 'Delivered', color: 'text-green-400 bg-green-400/10', icon: <CheckCircle size={14} /> },
  completed: { label: 'Completed', color: 'text-green-400 bg-green-400/10', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-400/10', icon: <X size={14} /> },
  disputed: { label: 'Disputed', color: 'text-red-400 bg-red-400/10', icon: <AlertTriangle size={14} /> },
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001', status: 'shipped', total_kobo: 4500000, created_at: new Date(Date.now() - 86400000).toISOString(),
    escrow_opted_in: true, payment_route: 'kaja_escrow',
    store: { name: 'Adekunle Fabrics', avatar_url: null },
    items: [{ title: 'Ankara Fabric 6 yards', qty: 1, price_kobo: 4500000 }],
  },
  {
    id: 'ord-002', status: 'paid', total_kobo: 12000000, created_at: new Date(Date.now() - 172800000).toISOString(),
    escrow_opted_in: false, payment_route: 'direct_bank',
    store: { name: 'TechHub Lagos', avatar_url: null },
    items: [{ title: 'Infinix Hot 40 Pro', qty: 1, price_kobo: 12000000 }],
  },
  {
    id: 'ord-003', status: 'completed', total_kobo: 2800000, created_at: new Date(Date.now() - 604800000).toISOString(),
    escrow_opted_in: true, payment_route: 'kaja_escrow',
    store: { name: 'Mama Temi Foods', avatar_url: null },
    items: [{ title: 'Jollof Rice Party Pack', qty: 2, price_kobo: 1400000 }],
    rating: 5,
  },
  {
    id: 'ord-004', status: 'pending', total_kobo: 750000, created_at: new Date(Date.now() - 3600000).toISOString(),
    escrow_opted_in: true, payment_route: 'kaja_escrow',
    store: { name: 'Balogun Fashion', avatar_url: null },
    items: [{ title: 'Aso-oke Head Tie', qty: 1, price_kobo: 750000 }],
  },
]

const DEV_BYPASS = import.meta.env.DEV

export default function MyOrders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Order | null>(null)
  const [rating, setRating] = useState(0)
  const [ratingNote, setRatingNote] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [sheet, setSheet] = useState<'rate' | 'dispute' | null>(null)
  const [acting, setActing] = useState(false)

  const uid = DEV_BYPASS ? 'dev-super-admin-id' : user?.id

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (DEV_BYPASS) { setOrders(MOCK_ORDERS); return }
      if (!uid) return
      const { data } = await supabase
        .from('orders')
            .select('*, store:stores(name, logo_url)')
        .eq('buyer_id', uid)
        .order('created_at', { ascending: false })
      if (data) setOrders(data as Order[])
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { void load() }, [load])

  const confirmDelivery = async (order: Order) => {
    setActing(true)
    try {
      const { data, error } = await supabase.functions.invoke('super-worker', { body: { order_id: order.id } })
      if (error) {
        let msg = 'Could not confirm delivery: ' + error.message
        try {
          const body = await (error as { context?: Response }).context?.json()
          if (body?.error) msg = body.error
        } catch { /* keep the default message */ }
        toast.error(msg)
        return
      }
      const done = { ...order, status: 'completed', arc_tx_hash: data?.tx_hash ?? null }
      setOrders(os => os.map(o => o.id === order.id ? done : o))
      setSelected(done)
      toast.success(data?.arc_recorded ? 'Delivery confirmed and recorded on Arc.' : 'Delivery confirmed.')
      setSheet('rate')
    } catch {
      toast.error('Failed to confirm delivery')
    } finally {
      setActing(false)
    }
  }

  const submitRating = async () => {
    if (!selected || rating === 0) return
    setActing(true)
    try {
      await supabase.from('orders').update({ rating }).eq('id', selected.id)
      setOrders(os => os.map(o => o.id === selected.id ? { ...o, rating } : o))
      toast.success('Rating submitted. Thank you!')
      setSheet(null)
      setSelected(null)
    } catch {
      toast.error('Failed to submit rating')
    } finally {
      setActing(false)
    }
  }

  const openDispute = async () => {
    if (!selected || !disputeReason.trim()) return
    setActing(true)
    try {
      await supabase.from('orders').update({ status: 'disputed' }).eq('id', selected.id)
      setOrders(os => os.map(o => o.id === selected.id ? { ...o, status: 'disputed' } : o))
      toast.success('Dispute opened. Our team will review within 24 hours.')
      setSheet(null)
      setSelected(null)
    } catch {
      toast.error('Failed to open dispute')
    } finally {
      setActing(false)
    }
  }

  const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`
  const timeAgo = (iso: string) => {
    const now = new Date().getTime()
    const diff = now - new Date(iso).getTime()
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

    const FILTERS = ['all', 'pending', 'paid', 'dispatched', 'completed', 'disputed']
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="text-muted">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">My Orders</h1>
        <span className="text-muted text-sm">{orders.length} orders</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-brand-500 text-white' : 'bg-surface text-muted'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 px-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Package size={48} className="text-white/10" />
          <p className="text-muted text-sm">No {filter === 'all' ? '' : filter} orders yet</p>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
            return (
              <button key={order.id} onClick={() => setSelected(order)}
                className="w-full bg-surface rounded-2xl p-4 text-left flex items-start gap-3">
                {/* Store avatar */}
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  {order.store?.avatar_url ? (
                    <img src={order.store.avatar_url} className="w-full h-full object-cover rounded-xl" alt="" />
                  ) : (
                    <Store size={20} className="text-brand-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-semibold text-sm truncate">{order.store?.name ?? 'Store'}</p>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </span>
                  </div>
                  <p className="text-muted text-xs truncate">
                    {order.items?.map(i => i.title).join(', ') ?? 'Items'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-brand-400 font-bold text-sm">{fmt(order.total_kobo)}</p>
                    <p className="text-muted text-xs">{timeAgo(order.created_at)}</p>
                  </div>
                  {order.escrow_opted_in && order.status !== 'completed' && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-green-400 text-xs">Escrow protected</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-muted mt-1" />
              </button>
            )
          })}
        </div>
      )}

      {/* Order detail sheet */}
      <AnimatePresence>
        {selected && !sheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface-2 rounded-t-3xl z-50 p-6 max-h-[85vh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Order #{selected.id.slice(-6).toUpperCase()}</h2>
                <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending).color}`}>
                  {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending).icon}
                  {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending).label}
                </span>
              </div>

              {/* Items */}
              <div className="bg-surface rounded-2xl p-4 mb-4">
                <p className="text-muted text-xs font-medium mb-3">ITEMS</p>
                {(selected.items ?? []).map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-white text-sm">{item.title} ×{item.qty}</span>
                    <span className="text-brand-400 text-sm font-medium">{fmt(item.price_kobo * item.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-brand-400 font-bold">{fmt(selected.total_kobo)}</span>
                </div>
              </div>

              {/* Payment info */}
              <div className="bg-surface rounded-2xl p-4 mb-4 space-y-2">
                <p className="text-muted text-xs font-medium mb-2">PAYMENT</p>
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Method</span>
                  <span className="text-white text-sm capitalize">{selected.payment_route?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Escrow</span>
                  <span className={`text-sm ${selected.escrow_opted_in ? 'text-green-400' : 'text-muted'}`}>
                    {selected.escrow_opted_in ? 'Protected' : 'Not protected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Date</span>
                  <span className="text-white text-sm">{new Date(selected.created_at).toLocaleDateString('en-NG')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button onClick={() => void navigate(`/receipt/${selected.id}`)} className="block w-full text-center py-3 rounded-2xl border border-white/10 text-white text-sm font-semibold">View receipt</button>
                {selected.status === 'completed' && selected.arc_tx_hash && (
                  <a href={`https://explorer.arc.io/tx/${selected.arc_tx_hash}`} target="_blank" rel="noreferrer"
                    className="block w-full text-center py-3 rounded-2xl border border-brand-500/40 text-brand-400 text-sm font-semibold">
                    Verified on Arc ↗
                  </a>
                )}
                
                 {['dispatched', 'shipped', 'in_transit', 'delivered'].includes(selected.status) && (
                  <button onClick={() => void confirmDelivery(selected)} disabled={acting}
                    className="w-full py-4 bg-brand-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                    <CheckCircle size={18} />
                    {acting ? 'Confirming...' : 'Confirm I Received My Order'}
                  </button>
                )}
                {selected.status === 'completed' && !selected.rating && (
                  <button onClick={() => setSheet('rate')}
                    className="w-full py-4 bg-yellow-500/20 text-yellow-300 font-semibold rounded-2xl flex items-center justify-center gap-2">
                    <Star size={18} />
                    Rate this seller
                  </button>
                )}
                {selected.status === 'completed' && selected.rating && (
                  <div className="flex items-center justify-center gap-2 py-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={20}
                        className={i < (selected.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
                    ))}
                    <span className="text-muted text-sm ml-1">Rated</span>
                  </div>
                )}
                <button onClick={() => void navigate(`/inbox`)}
                  className="w-full py-4 bg-surface text-white font-semibold rounded-2xl flex items-center justify-center gap-2">
                  <MessageCircle size={18} />
                  Message Seller
                </button>
                {['paid', 'dispatched'].includes(selected.status) && (
                  <button onClick={() => setSheet('dispute')}
                    className="w-full py-4 bg-red-500/10 text-red-400 font-semibold rounded-2xl flex items-center justify-center gap-2">
                    <AlertTriangle size={18} />
                    Open a Dispute
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Rate sheet */}
        {sheet === 'rate' && selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface-2 rounded-t-3xl z-50 p-6">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <h2 className="text-white font-bold text-xl text-center mb-1">Rate your experience</h2>
              <p className="text-muted text-sm text-center mb-6">How was your order from {selected.store?.name}?</p>

              {/* Stars */}
              <div className="flex justify-center gap-3 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setRating(i + 1)}>
                    <Star size={36}
                      className={`transition-all duration-150 ${i < rating ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-white/20'}`} />
                  </button>
                ))}
              </div>

              <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)}
                className="w-full bg-surface text-white rounded-2xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-brand-500 resize-none mb-4"
                rows={3} placeholder="Tell others about your experience (optional)..." />

              <button onClick={() => void submitRating()} disabled={rating === 0 || acting}
                className="w-full py-4 bg-brand-500 text-white font-bold rounded-2xl disabled:opacity-50">
                {acting ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button onClick={() => setSheet(null)} className="w-full py-3 text-muted text-sm mt-2">
                Skip for now
              </button>
            </motion.div>
          </>
        )}

        {/* Dispute sheet */}
        {sheet === 'dispute' && selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheet(null)}
              className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface-2 rounded-t-3xl z-50 p-6">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <h2 className="text-white font-bold text-xl mb-1">Open a Dispute</h2>
              <p className="text-muted text-sm mb-4">
                Describe the problem. Our team will review and respond within 24 hours.
                Funds remain in escrow until resolved.
              </p>

              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                className="w-full bg-surface text-white rounded-2xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-red-400 resize-none mb-4"
                rows={5} placeholder="e.g. Item not received, wrong item sent, damaged goods..." />

              <button onClick={() => void openDispute()} disabled={!disputeReason.trim() || acting}
                className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl disabled:opacity-50">
                {acting ? 'Submitting...' : 'Open Dispute'}
              </button>
              <button onClick={() => setSheet(null)} className="w-full py-3 text-muted text-sm mt-2">Cancel</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
