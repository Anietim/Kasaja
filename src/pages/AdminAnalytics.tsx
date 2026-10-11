import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Users, Store, ShoppingBag, Truck, TrendingUp,
  ArrowLeft, Package, AlertTriangle, CheckCircle,
  BarChart2, Activity, DollarSign, Map
} from 'lucide-react'

interface PlatformStats {
  total_users: number
  buyers: number
  sellers: number
  riders: number
  admins: number
  total_stores: number
  verified_stores: number
  total_products: number
  total_orders: number
  completed_orders: number
  disputed_orders: number
  pending_orders: number
  total_revenue: number
  total_groups: number
  active_groups: number
  new_users_today: number
  new_users_week: number
  new_orders_today: number
}

interface TopStore {
  id: string
  name: string
  sales: number
  rating: number
  is_verified: boolean
}

const DEV_BYPASS = import.meta.env.DEV

const MOCK_STATS: PlatformStats = {
  total_users: 1247,
  buyers: 893,
  sellers: 284,
  riders: 67,
  admins: 3,
  total_stores: 284,
  verified_stores: 112,
  total_products: 3891,
  total_orders: 2340,
  completed_orders: 1876,
  disputed_orders: 23,
  pending_orders: 441,
  total_revenue: 187500000,
  total_groups: 47,
  active_groups: 39,
  new_users_today: 34,
  new_users_week: 218,
  new_orders_today: 67,
}

const MOCK_TOP_STORES: TopStore[] = [
  { id: '1', name: 'Emeka Electronics', sales: 4250000, rating: 4.8, is_verified: true },
  { id: '2', name: 'Balogun Fabrics Hub', sales: 3180000, rating: 4.6, is_verified: true },
  { id: '3', name: 'Lagos Phones & Accessories', sales: 2890000, rating: 4.7, is_verified: false },
  { id: '4', name: 'Mama Ngozi Foods', sales: 1950000, rating: 4.9, is_verified: true },
  { id: '5', name: 'Abuja Auto Parts', sales: 1720000, rating: 4.5, is_verified: true },
]

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<PlatformStats>(DEV_BYPASS ? MOCK_STATS : {
    total_users: 0, buyers: 0, sellers: 0, riders: 0, admins: 0,
    total_stores: 0, verified_stores: 0, total_products: 0,
    total_orders: 0, completed_orders: 0, disputed_orders: 0, pending_orders: 0,
    total_revenue: 0, total_groups: 0, active_groups: 0,
    new_users_today: 0, new_users_week: 0, new_orders_today: 0,
  })
  const [topStores, setTopStores] = useState<TopStore[]>(DEV_BYPASS ? MOCK_TOP_STORES : [])
  const [loading, setLoading] = useState(!DEV_BYPASS)
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'orders' | 'stores'>('overview')

  const uid = DEV_BYPASS ? 'dev-super-admin-id' : user?.id

  useEffect(() => {
    if (DEV_BYPASS || !uid) return
    void (async () => {
      setLoading(true)
      try {
        const [usersRes, storesRes, productsRes, ordersRes, groupsRes] = await Promise.all([
          supabase.from('profiles').select('id, roles, created_at', { count: 'exact' }),
          supabase.from('stores').select('id, is_verified', { count: 'exact' }),
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id, status, total_amount'),
          supabase.from('market_groups').select('id, is_active', { count: 'exact' }),
        ])
        const users = usersRes.data ?? []
        const orders = ordersRes.data ?? []
        const stores = storesRes.data ?? []
        const groups = groupsRes.data ?? []
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        setStats({
          total_users: users.length,
          buyers: users.filter(u => (u.roles as string[] ?? []).includes('buyer')).length,
          sellers: users.filter(u => (u.roles as string[] ?? []).includes('seller')).length,
          riders: users.filter(u => (u.roles as string[] ?? []).includes('rider')).length,
          admins: users.filter(u => (u.roles as string[] ?? []).some((r: string) => ['admin', 'super_admin'].includes(r))).length,
          total_stores: stores.length,
          verified_stores: stores.filter(s => s.is_verified).length,
          total_products: productsRes.count ?? 0,
          total_orders: orders.length,
          completed_orders: orders.filter(o => o.status === 'completed').length,
          disputed_orders: orders.filter(o => o.status === 'disputed').length,
          pending_orders: orders.filter(o => ['pending', 'paid'].includes(o.status as string)).length,
          total_revenue: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total_amount as number ?? 0), 0),
          total_groups: groups.length,
          active_groups: groups.filter(g => g.is_active).length,
          new_users_today: users.filter(u => new Date(u.created_at as string) >= today).length,
          new_users_week: users.filter(u => new Date(u.created_at as string) >= weekAgo).length,
          new_orders_today: orders.filter(o => {
            const rec = o as Record<string, unknown>
            return rec.created_at && new Date(rec.created_at as string) >= today
          }).length,
        })
        const { data: storeData } = await supabase.from('stores').select('id, name, is_verified, rating_avg').limit(5)
        if (storeData) setTopStores(storeData.map(s => ({ ...s, sales: 0, rating: (s.rating_avg as number) ?? 0 })))
      } finally {
        setLoading(false)
      }
    })()
  }, [uid])

  const fmt = (n: number) => n.toLocaleString()
  const fmtNaira = (n: number) => n >= 1000000
    ? `₦${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `₦${(n / 1000).toFixed(0)}K`
    : `₦${n}`

  const completionRate = stats.total_orders > 0
    ? Math.round((stats.completed_orders / stats.total_orders) * 100) : 0
  const verifiedRate = stats.total_stores > 0
    ? Math.round((stats.verified_stores / stats.total_stores) * 100) : 0

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => void navigate(-1)}
          className="w-9 h-9 bg-surface rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-black text-lg">Platform Analytics</h1>
          <p className="text-muted text-xs">Live dashboard — super admin only</p>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      </div>

      <div className="px-4 space-y-5">

        {/* ── TAB SELECTOR ──────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
            { key: 'users', label: 'Users', icon: <Users size={14} /> },
            { key: 'orders', label: 'Orders', icon: <ShoppingBag size={14} /> },
            { key: 'stores', label: 'Stores', icon: <Store size={14} /> },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveSection(tab.key as typeof activeSection)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeSection === tab.key
                  ? 'text-white'
                  : 'bg-surface text-muted'
              }`}
              style={activeSection === tab.key ? { background: 'var(--gradient)' } : {}}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────── */}
        {activeSection === 'overview' && (<>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Users size={18} />, label: 'Total Users', value: fmt(stats.total_users), sub: `+${stats.new_users_today} today`, color: '#7C3AED' },
              { icon: <DollarSign size={18} />, label: 'Total Revenue', value: fmtNaira(stats.total_revenue), sub: `${completionRate}% completion`, color: '#10B981' },
              { icon: <ShoppingBag size={18} />, label: 'Total Orders', value: fmt(stats.total_orders), sub: `+${stats.new_orders_today} today`, color: '#06B6D4' },
              { icon: <Store size={18} />, label: 'Active Stores', value: fmt(stats.total_stores), sub: `${verifiedRate}% verified`, color: '#EC4899' },
            ].map(k => (
              <div key={k.label} className="bg-surface rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${k.color}22`, color: k.color }}>
                  {k.icon}
                </div>
                <p className="text-white font-black text-2xl leading-none">{k.value}</p>
                <p className="text-muted text-xs mt-1">{k.label}</p>
                <p className="text-xs mt-1" style={{ color: k.color }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Activity pulse */}
          <div className="bg-surface rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-brand-400" />
              <p className="text-white font-semibold text-sm">Platform Activity</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Order Completion Rate', value: completionRate, color: '#10B981' },
                { label: 'Store Verification Rate', value: verifiedRate, color: '#7C3AED' },
                { label: 'Active Groups', value: stats.total_groups > 0 ? Math.round((stats.active_groups / stats.total_groups) * 100) : 0, color: '#06B6D4' },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted text-xs">{bar.label}</span>
                    <span className="text-white text-xs font-bold">{bar.value}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${bar.value}%`, background: bar.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Orders', path: '/admin', icon: <Package size={16} />, color: '#7C3AED' },
              { label: 'Disputes', path: '/admin/disputes', icon: <AlertTriangle size={16} />, color: '#EF4444' },
              { label: 'Market Groups', path: '/admin/groups', icon: <Map size={16} />, color: '#06B6D4' },
              { label: 'User Management', path: '/admin/users', icon: <Users size={16} />, color: '#10B981' },
            ].map(a => (
              <button key={a.path} onClick={() => void navigate(a.path)}
                className="bg-surface rounded-2xl p-4 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${a.color}22`, color: a.color }}>
                  {a.icon}
                </div>
                <span className="text-white text-sm font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        </>)}

        {/* ── USERS ─────────────────────────────────── */}
        {activeSection === 'users' && (<>
          {/* Growth */}
          <div className="bg-surface rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-3">User Growth</p>
            <div className="flex gap-4">
              <div>
                <p className="text-white font-black text-3xl">{fmt(stats.total_users)}</p>
                <p className="text-muted text-xs">Total registered users</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-emerald-400 font-bold text-xl">+{stats.new_users_week}</p>
                <p className="text-muted text-xs">This week</p>
              </div>
            </div>
          </div>

          {/* Role breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <ShoppingBag size={18} />, label: 'Buyers', value: stats.buyers, pct: Math.round((stats.buyers / Math.max(stats.total_users, 1)) * 100), color: '#06B6D4' },
              { icon: <Store size={18} />, label: 'Sellers', value: stats.sellers, pct: Math.round((stats.sellers / Math.max(stats.total_users, 1)) * 100), color: '#10B981' },
              { icon: <Truck size={18} />, label: 'Riders', value: stats.riders, pct: Math.round((stats.riders / Math.max(stats.total_users, 1)) * 100), color: '#F59E0B' },
              { icon: <CheckCircle size={18} />, label: 'Admins', value: stats.admins, pct: Math.round((stats.admins / Math.max(stats.total_users, 1)) * 100), color: '#EC4899' },
            ].map(r => (
              <div key={r.label} className="bg-surface rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${r.color}22`, color: r.color }}>{r.icon}</div>
                  <span className="text-white font-semibold text-sm">{r.label}</span>
                </div>
                <p className="text-white font-black text-2xl">{fmt(r.value)}</p>
                <div className="h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
                <p className="text-muted text-xs mt-1">{r.pct}% of total</p>
              </div>
            ))}
          </div>

          <button onClick={() => void navigate('/admin/users')}
            className="w-full gradient-bg text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
            <Users size={16} />
            Manage All Users
          </button>
        </>)}

        {/* ── ORDERS ────────────────────────────────── */}
        {activeSection === 'orders' && (<>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Orders', value: fmt(stats.total_orders), color: '#7C3AED', icon: <ShoppingBag size={18} /> },
              { label: 'Completed', value: fmt(stats.completed_orders), color: '#10B981', icon: <CheckCircle size={18} /> },
              { label: 'Pending', value: fmt(stats.pending_orders), color: '#F59E0B', icon: <Package size={18} /> },
              { label: 'Disputed', value: fmt(stats.disputed_orders), color: '#EF4444', icon: <AlertTriangle size={18} /> },
            ].map(o => (
              <div key={o.label} className="bg-surface rounded-2xl p-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: `${o.color}22`, color: o.color }}>{o.icon}</div>
                <p className="text-white font-black text-2xl">{o.value}</p>
                <p className="text-muted text-xs mt-0.5">{o.label}</p>
              </div>
            ))}
          </div>

          {/* Revenue */}
          <div className="bg-surface rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-400" />
              <p className="text-white font-semibold text-sm">Platform Revenue</p>
            </div>
            <p className="text-white font-black text-3xl">{fmtNaira(stats.total_revenue)}</p>
            <p className="text-muted text-xs mt-1">From completed orders</p>
          </div>

          <button onClick={() => void navigate('/admin/orders')}
            className="w-full gradient-bg text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
            <ShoppingBag size={16} />
            Manage All Orders
          </button>
        </>)}

        {/* ── STORES ────────────────────────────────── */}
        {activeSection === 'stores' && (<>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-2xl p-4">
              <Store size={18} className="text-brand-400 mb-2" />
              <p className="text-white font-black text-2xl">{fmt(stats.total_stores)}</p>
              <p className="text-muted text-xs">Total stores</p>
            </div>
            <div className="bg-surface rounded-2xl p-4">
              <CheckCircle size={18} className="text-emerald-400 mb-2" />
              <p className="text-white font-black text-2xl">{fmt(stats.verified_stores)}</p>
              <p className="text-muted text-xs">Verified stores</p>
            </div>
            <div className="bg-surface rounded-2xl p-4">
              <Package size={18} className="text-cyan-400 mb-2" />
              <p className="text-white font-black text-2xl">{fmt(stats.total_products)}</p>
              <p className="text-muted text-xs">Live products</p>
            </div>
            <div className="bg-surface rounded-2xl p-4">
              <Map size={18} className="text-pink-400 mb-2" />
              <p className="text-white font-black text-2xl">{fmt(stats.active_groups)}</p>
              <p className="text-muted text-xs">Active groups</p>
            </div>
          </div>

          {/* Top stores */}
          <div className="bg-surface rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-3">Top Stores by Sales</p>
            <div className="space-y-3">
              {topStores.map((store, i) => (
                <div key={store.id} className="flex items-center gap-3">
                  <span className="text-muted text-sm font-bold w-5">{i + 1}</span>
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <Store size={16} className="text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-white text-sm font-semibold truncate">{store.name}</p>
                      {store.is_verified && <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-emerald-400 text-xs font-bold">{fmtNaira(store.sales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 text-xs font-bold">⭐ {store.rating.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}
      </div>
    </div>
  )
}
