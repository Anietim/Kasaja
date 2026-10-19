import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getOrCreateConversation } from '@/lib/chat'
import { toast } from 'sonner'
import {
  Store, Package, ShoppingBag, TrendingUp, Star, Plus, Eye, Edit3,
  Trash2, ChevronLeft, Megaphone, Loader2, AlertCircle, Truck,
  CheckCircle, Clock, ChevronRight, X, Copy
} from 'lucide-react'
import { VerifiedPill } from '@/components/VerifiedBadge'

interface Product { id: string; title: string; price_kobo: number; images: string[]; is_active: boolean; quantity: number; like_count: number }
interface Order {
  id: string; total_kobo: number; status: string; created_at: string
  buyer_id: string; items: { title: string; qty: number; price: number }[]
  delivery_address: string; tracking_number?: string; shipped_at?: string
  buyer?: { display_name: string; phone: string }
}
interface StoreData { id: string; name: string; description: string; is_verified: boolean; avg_rating: number; rating_count: number; trending_score: number }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',     color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  paid:       { label: 'Paid',        color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  accepted:   { label: 'Accepted',   color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  packed:     { label: 'Packed',     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  shipped:    { label: 'Shipped',    color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  in_transit: { label: 'In Transit', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  delivered:  { label: 'Delivered',  color: 'text-green-400',  bg: 'bg-green-500/10' },
  completed:  { label: 'Completed',  color: 'text-green-400',  bg: 'bg-green-500/10' },
  disputed:   { label: 'Disputed',   color: 'text-red-400',    bg: 'bg-red-500/10' },
  cancelled:  { label: 'Cancelled',  color: 'text-zinc-400',   bg: 'bg-zinc-500/10' },
}

export default function StoreOwnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [store, setStore] = useState<StoreData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<'overview'|'products'|'orders'>('overview')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showShipSheet, setShowShipSheet] = useState(false)
  const [trackingNum, setTrackingNum] = useState('')
  const [carrier, setCarrier] = useState('KASAJA Rider')
  const [shipping, setShipping] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: s } = await supabase.from('stores').select('*').eq('owner_id', user.id).single()
    if (s) {
      setStore(s as StoreData)
      const [{ data: prods }, { data: ords }] = await Promise.all([
        supabase.from('products').select('id,title,price_kobo,images,is_active,quantity,like_count').eq('store_id', (s as StoreData).id).order('created_at', { ascending: false }),
        supabase.from('orders').select('id,total_kobo,status,created_at,buyer_id,items,delivery_address,tracking_number,shipped_at').eq('store_id', (s as StoreData).id).order('created_at', { ascending: false }).limit(50),
      ])
      setProducts(prods ?? [])
      setOrders((ords ?? []))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  async function toggleProduct(id: string, current: boolean) {
    await supabase.from('products').update({ is_active: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function markShipped() {
        if (carrier === 'KASAJA Rider' && selectedOrder) {
      setShowShipSheet(false)
      void navigate(`/find-rider/${selectedOrder.id}`)
      return
    }
    if (!selectedOrder) return
    setShipping(true)
    try {
      const trackRef = trackingNum.trim() || `KSJ-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase.from('orders').update({
        status: 'shipped',
        tracking_number: trackRef,
        shipped_at: new Date().toISOString(),
      }).eq('id', selectedOrder.id)
      if (error) throw error
        if (carrier === 'KASAJA Rider') {
        const { data: { user: seller } } = await supabase.auth.getUser()
        const fee = (selectedOrder as unknown as { delivery_fee_kobo?: number }).delivery_fee_kobo || 150000
        const dropoff = (selectedOrder as unknown as { delivery_address?: string }).delivery_address || 'See order'
        const { error: dErr } = await supabase.from('delivery_requests').insert({
          order_id: selectedOrder.id,
          requester_id: seller?.id,
          pickup_address: store?.name ?? 'Store pickup',
          dropoff_address: dropoff,
          item_description: 'KASAJA order',
          package_description: 'KASAJA order',
          agreed_fee_kobo: fee,
          agreed_price_kobo: fee,
          status: 'pending',
        })
        if (dErr) throw dErr
      }

      // Notify buyer
      await supabase.from('notifications').insert({
        user_id: selectedOrder.buyer_id,
        type: 'order_shipped',
        title: 'Your order has been shipped! 🚚',
        body: `Tracking: ${trackRef} via ${carrier}. ${store?.name} has dispatched your order.`,
        data: { order_id: selectedOrder.id, tracking_number: trackRef, carrier },
      })

      setOrders(prev => prev.map(o => o.id === selectedOrder.id
        ? { ...o, status: 'shipped', tracking_number: trackRef, shipped_at: new Date().toISOString() }
        : o
      ))
      setSelectedOrder(prev => prev ? { ...prev, status: 'shipped', tracking_number: trackRef } : null)
      setShowShipSheet(false)
      setTrackingNum('')
      toast.success(`Order marked as shipped! Tracking: ${trackRef}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update order')
    } finally {
      setShipping(false)
    }
  }

  async function markAccepted(orderId: string) {
    await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'accepted' } : o))
    setShowShipSheet(true)
    toast.success('Order accepted')
  }

  const totalRevenue = orders.filter(o => o.status === 'completed' || o.status === 'delivered').reduce((s, o) => s + o.total_kobo, 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const activeOrders = orders.filter(o => ['accepted','packed','shipped','in_transit'].includes(o.status)).length

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString('en-NG')}` }
  function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )

  if (!store) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
        <Store className="w-8 h-8 text-brand-500" />
      </div>
      <h2 className="text-xl font-display font-bold text-white">No Store Yet</h2>
      <p className="text-sm text-zinc-400 text-center">List your first product to automatically create your store</p>
      <button onClick={() => void navigate('/sell')} className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-semibold text-sm">
        List a Product
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-zinc-300" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display font-bold text-white text-sm">{store.name}</h1>
            {store.is_verified && <VerifiedPill type="store" size="sm" />}
          </div>
          <p className="text-xs text-zinc-500">Store Dashboard</p>
        </div>
        <button onClick={() => void navigate('/sell')} className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {/* Store banner */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Store className="w-4 h-4 text-white/80" />
            <span className="text-xs text-white/80 font-medium">{products.length} Products</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span className="text-white font-bold text-sm">{store.avg_rating.toFixed(1)}</span>
            <span className="text-white/60 text-xs">({store.rating_count} ratings)</span>
          </div>
        </div>
        <div className="text-right flex flex-col gap-1">
          {!store.is_verified && (
            <button onClick={() => void navigate('/seller-verification')} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl">
              Get Verified ✓
            </button>
          )}
          <button className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl">
            <Megaphone className="w-3.5 h-3.5" /> Boost Store
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mx-4 mt-4">
        {[
          { label: 'Revenue', value: fmt(totalRevenue), icon: TrendingUp, color: 'text-green-400' },
          { label: 'Orders', value: String(orders.length), icon: ShoppingBag, color: 'text-blue-400' },
          { label: 'Active', value: String(activeOrders), icon: Truck, color: 'text-cyan-400' },
          { label: 'Pending', value: String(pendingOrders), icon: AlertCircle, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface rounded-2xl p-2.5">
            <Icon className={`w-3.5 h-3.5 ${color} mb-1`} />
            <p className="text-white font-bold text-sm">{value}</p>
            <p className="text-zinc-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-5 bg-surface rounded-xl p-1">
        {(['overview','products','orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-brand-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {t}{t === 'orders' && pendingOrders > 0 ? ` (${pendingOrders})` : ''}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mx-4 mt-4 space-y-3">
        {tab === 'overview' && (
          <>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Recent Orders</h3>
            {orders.slice(0, 5).map(o => {
              const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.pending
              return (
                <button key={o.id} onClick={() => setSelectedOrder(o)}
                  className="w-full bg-surface rounded-xl p-3 flex items-center justify-between text-left">
                  <div>
                    <p className="text-white text-sm font-medium">{fmt(o.total_kobo)}</p>
                    <p className="text-zinc-500 text-xs">{fmtDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </button>
              )
            })}
            {orders.length === 0 && <div className="text-center py-8 text-zinc-500 text-sm">No orders yet</div>}
          </>
        )}

        {tab === 'products' && (
          <>
            {products.map(p => (
              <div key={p.id} className="bg-surface rounded-xl p-3 flex gap-3">
                <img src={p.images[0] ?? `https://picsum.photos/seed/${p.id}/80/80`} alt={p.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.title}</p>
                  <p className="text-brand-400 text-sm font-bold">{fmt(p.price_kobo)}</p>
                  <p className="text-zinc-500 text-xs">{p.quantity} in stock · {p.like_count} likes</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => void navigate(`/product/${p.id}`)} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button onClick={() => void toggleProduct(p.id, p.is_active)} className={`p-1.5 rounded-lg ${p.is_active ? 'bg-green-500/10' : 'bg-zinc-800'}`}>
                    <Edit3 className={`w-3.5 h-3.5 ${p.is_active ? 'text-green-400' : 'text-zinc-500'}`} />
                  </button>
                  <button onClick={() => void deleteProduct(p.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No products yet</p>
                <button onClick={() => void navigate('/sell')} className="mt-3 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium">
                  Add First Product
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            {orders.map(o => {
              const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.pending
              return (
                <button key={o.id} onClick={() => setSelectedOrder(o)}
                  className="w-full bg-surface rounded-xl p-4 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white font-bold">{fmt(o.total_kobo)}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-zinc-500 text-xs">{fmtDate(o.created_at)} · #{(o as unknown as { order_number?: string }).order_number ?? o.id.slice(0, 8).toUpperCase()}</p>
                  {o.tracking_number && (
                    <p className="text-cyan-400 text-xs mt-1">Tracking: {o.tracking_number}</p>
                  )}
                </button>
              )
            })}
            {orders.length === 0 && <div className="text-center py-8 text-zinc-500 text-sm">No orders yet</div>}
          </>
        )}
      </div>

      {/* Order detail sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-t-3xl overflow-y-auto max-h-[85vh]" style={{ background: '#11151A' }}>
            {/* Sheet header */}
            <div className="sticky top-0 flex items-center justify-between px-5 pt-5 pb-3" style={{ background: '#11151A' }}>
              <div>
                <h3 className="text-white font-bold text-base">Order #{(selectedOrder as unknown as { order_number?: string }).order_number ?? selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
<button onClick={() => void navigate(`/receipt/${selectedOrder.id}`)} className="text-brand-400 text-xs">View receipt</button>
                <p className="text-zinc-500 text-xs">{fmtDate(selectedOrder.created_at)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* Status */}
              {(() => {
                const st = STATUS_LABELS[selectedOrder.status] ?? STATUS_LABELS.pending
                return (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${st.bg}`}>
                    {selectedOrder.status === 'shipped' || selectedOrder.status === 'in_transit'
                      ? <Truck className={`w-4 h-4 ${st.color}`} />
                      : selectedOrder.status === 'completed' || selectedOrder.status === 'delivered'
                      ? <CheckCircle className={`w-4 h-4 ${st.color}`} />
                      : <Clock className={`w-4 h-4 ${st.color}`} />
                    }
                    <span className={`text-sm font-semibold ${st.color}`}>{st.label}</span>
                  </div>
                )
              })()}

              {/* Tracking number (if shipped) */}
              {selectedOrder.tracking_number && (
                <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Tracking Number</p>
                    <p className="text-cyan-400 font-mono text-sm font-bold">{selectedOrder.tracking_number}</p>
                  </div>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(selectedOrder.tracking_number ?? '')
                      toast.success('Copied!')
                    }}
                    className="p-2 rounded-lg bg-zinc-800"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              )}

              {/* Amount */}
              <div className="bg-zinc-900 rounded-xl px-4 py-3">
                <p className="text-xs text-zinc-500 mb-0.5">Order Total</p>
                <p className="text-white font-bold text-xl">{fmt(selectedOrder.total_kobo)}</p>
              </div>

              {/* Delivery address */}
              {selectedOrder.delivery_address && (
                <div className="bg-zinc-900 rounded-xl px-4 py-3">
                  <p className="text-xs text-zinc-500 mb-0.5">Delivery Address</p>
                  <p className="text-white text-sm">{selectedOrder.delivery_address}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                {selectedOrder.status === 'paid' && (
                  <button
                    onClick={() => void markAccepted(selectedOrder.id)}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}
                  >
                    <CheckCircle className="w-4 h-4" /> Accept Order
                  </button>
                )}

                {(selectedOrder.status === 'accepted' || selectedOrder.status === 'packed') && (
                  <button
                    onClick={() => setShowShipSheet(true)}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#06B6D4,#10B981)' }}
                  >
                    <Truck className="w-4 h-4" /> Mark as Shipped
                  </button>
                )}

                {selectedOrder.status === 'shipped' && (
                  <div className="text-center py-2">
                    <p className="text-cyan-400 text-sm font-medium">Waiting for buyer to confirm delivery</p>
                    <p className="text-zinc-500 text-xs mt-1">Funds will be released once buyer confirms receipt</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    void getOrCreateConversation(selectedOrder.buyer_id).then(cid => {
                    if (cid) void navigate(`/inbox/${cid}`)
                    else toast.error('Could not open chat')
                  })
                }}
                  className="w-full py-3 rounded-2xl font-semibold text-white text-sm border"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                >
                  Message Buyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Shipped sheet */}
      {showShipSheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-t-3xl px-5 pt-5 pb-10 space-y-4" style={{ background: '#11151A' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base">Mark as Shipped</h3>
              <button onClick={() => setShowShipSheet(false)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Carrier */}
            <div>
              <p className="text-xs text-zinc-400 mb-2">Delivery Carrier</p>
              <div className="grid grid-cols-3 gap-2">
                {['KASAJA Rider', 'GIG Logistics', 'DHL', 'GIGL', 'Kwik', 'Sendbox', 'Other'].map(c => (
                  <button key={c} onClick={() => setCarrier(c)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${carrier === c ? 'text-white' : 'text-zinc-400 bg-zinc-800'}`}
                    style={carrier === c ? { background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Tracking number */}
            <div>
              <p className="text-xs text-zinc-400 mb-2">Tracking Number (optional)</p>
              <input
                value={trackingNum}
                onChange={e => setTrackingNum(e.target.value)}
                placeholder="e.g. GIG2024XYZ (auto-generated if blank)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand-500"
              />
            </div>

            {/* Note */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <Truck className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-cyan-300">
                The buyer will receive an instant notification with the tracking number. Payment is released after the buyer confirms receipt.
              </p>
            </div>

            <button
              onClick={() => void markShipped()}
              disabled={shipping}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#10B981)' }}
            >
              {shipping ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Truck className="w-4 h-4" />}
              {shipping ? 'Updating...' : 'Confirm Shipment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
