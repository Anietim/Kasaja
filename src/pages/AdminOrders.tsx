import { useState, useEffect, useCallback } from 'react'
import { Shield, Package, AlertCircle, CheckCircle, Clock, Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MOCK } from '@/lib/mockData'
import { UserTicks } from '@/components/Tick'

interface Order {
  id: string; created_at: string; status: string; total_kobo: number
  buyer_id?: string
  buyer: { display_name: string; phone?: string }
  store: { name: string }; payment_route: string
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, disputed: 0, pending: 0, revenue: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, buyer:profiles!orders_buyer_id_fkey(display_name, phone), store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data && data.length > 0) {
      const o = data as unknown as Order[]
      setOrders(o)
      setStats({
        total: o.length,
        disputed: o.filter(x => x.status === 'disputed').length,
        pending: o.filter(x => x.status === 'pending').length,
        revenue: o.filter(x => x.status === 'completed').reduce((s, x) => s + x.total_kobo, 0),
      })
    } else {
      setOrders(MOCK.orders as unknown as Order[])
      setStats({ total: MOCK.orders.length, disputed: 1, pending: 2, revenue: 12500000 })
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const fmt = (k: number) => '₦' + (k / 100).toLocaleString('en-NG')
  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => !search || o.store?.name?.toLowerCase().includes(search.toLowerCase()) || o.buyer?.display_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="bg-surface border-b border-white/10 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-brand-400" />
          <h1 className="text-xl font-display font-bold text-white">Admin Panel</h1>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Total', val: stats.total, color: 'text-white' },
            { label: 'Pending', val: stats.pending, color: 'text-yellow-400' },
            { label: 'Disputed', val: stats.disputed, color: 'text-red-400' },
            { label: 'Revenue', val: fmt(stats.revenue), color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
              <p className={`font-bold text-sm ${s.color}`}>{s.val}</p>
              <p className="text-muted text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none" />
          </div>
          <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Filter className="w-4 h-4 text-muted" />
          </button>
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
          {['all','pending','paid','dispatched','disputed','completed','cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-brand-500 text-white' : 'bg-white/5 text-muted'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          (Array.from({ length: 4 })).map((_v, i) => <div key={i} className="bg-surface rounded-2xl h-24 animate-pulse" />)
        ) : filtered.map(o => (
          <div key={o.id} className={`bg-surface rounded-2xl p-4 ${o.status === 'disputed' ? 'ring-1 ring-red-500/50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white text-sm font-semibold">{o.store?.name ?? 'Unknown Store'}</p>
                <p className="text-muted text-xs flex items-center gap-1">{o.buyer?.display_name}<UserTicks userId={o.buyer_id} size={12} /> {o.buyer?.phone && `• ${o.buyer.phone}`}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${
                o.status === 'disputed' ? 'text-red-400' :
                o.status === 'completed' ? 'text-green-400' :
                o.status === 'pending' ? 'text-yellow-400' : 'text-muted'
              }`}>
                {o.status === 'disputed' ? <AlertCircle className="w-3.5 h-3.5" /> :
                 o.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5" /> :
                 <Clock className="w-3.5 h-3.5" />}
                <span className="capitalize">{o.status}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">{fmt(o.total_kobo)}</p>
              <div className="flex gap-2">
                {o.status === 'disputed' && (
                  <button className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                    Investigate
                  </button>
                )}
                <button className="px-3 py-1.5 bg-white/5 text-muted rounded-lg text-xs">
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-white font-semibold">No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}
