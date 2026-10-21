import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, MapPin, Search, SlidersHorizontal, X, Zap, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NotificationCenter from '@/components/NotificationCenter'
import { useNotifications } from '@/hooks/useNotifications'
import { useLiveOrder } from '@/hooks/useLiveOrder'
import SellersToFollow from '@/components/home/SellersToFollow'
import RiderBike from '@/components/layout/RiderBike'

const CARD = { background: '#100D14', border: '1px solid rgba(255,255,255,0.08)' }
const TINTS = ['#FF8A3D', '#8B5CF6', '#34D399', '#F59E0B', '#F0506E']

/* ───────── Top 5 market groups ───────── */
type Group = { id: string; name: string; member_count: number }

function TopGroups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('market_groups')
        .select('id,name,member_count')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(5)
      setGroups((data ?? []) as unknown as Group[])
    })()
  }, [])

  const list = groups
  if (list.length === 0) return null

  return (
    <div className="rounded-3xl p-4" style={CARD}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold tracking-[0.12em]" style={{ color: '#A59DA8' }}>TOP MARKET GROUPS</p>
        <button onClick={() => void navigate('/groups')} className="text-xs font-bold flex items-center" style={{ color: '#FF9A4D' }}>
          See all <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex flex-col">
        {list.map((g, i) => {
          const c = TINTS[i % TINTS.length]
          return (
            <button
              key={g.id}
              onClick={() => void navigate(`/groups/${g.id}`)}
              className="flex items-center gap-3 py-2 rounded-xl text-left hover:bg-white/5 transition-colors"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c}24` }}>
                <MapPin size={18} style={{ color: c }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-white text-[13px] font-bold truncate">{g.name}</span>
                <span className="block text-[11px]" style={{ color: '#A59DA8' }}>
                  {`${(g.member_count ?? 0).toLocaleString('en-NG')} members`}
                </span>
              </span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Bottom buttons ───────── */
function OrderOnTheWayButton() {
  const navigate = useNavigate()
  const o = useLiveOrder()
  const live = o.active

  return (
    <button
      onClick={() => void navigate(o.deliveryId ? `/delivery/${o.deliveryId}` : '/orders')}
      className="w-full rounded-3xl p-px text-left transition-transform active:scale-[0.98]"
      style={{ background: live ? 'linear-gradient(135deg,#FF8A3D,#8B5CF6)' : 'rgba(255,255,255,0.1)' }}
      aria-label={live ? `Order on the way: ${o.title}. ${o.line}` : 'My orders'}
    >
      <span className="block rounded-[23px] px-4 pt-3 pb-3.5" style={{ background: '#100D14' }}>
        <RiderBike moving={live} className="w-full h-[78px]" />
        <span className="flex items-center justify-between gap-3 mt-1">
          <span className="min-w-0">
            <span className="block text-white text-sm font-extrabold">
              {live ? 'Order on the way' : 'No order on the way'}
            </span>
            <span className="block text-xs truncate" style={{ color: '#A59DA8' }}>
              {live ? `${o.title}${o.rider ? ` · rider ${o.rider}` : ''}` : 'Tap to see your orders'}
            </span>
          </span>
          <ChevronRight size={18} style={{ color: '#FF9A4D' }} className="shrink-0" />
        </span>
        {live && (
          <span className="block h-1.5 rounded-full mt-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <span className="block h-full rounded-full transition-all duration-700"
              style={{ width: `${o.pct}%`, background: 'linear-gradient(90deg,#FF8A3D,#F0506E)' }} />
          </span>
        )}
      </span>
    </button>
  )
}

function FlashDealsButton() {
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(0)

  useEffect(() => {
    void (async () => {
      const { data, count: n } = await supabase
        .from('products')
        .select('flash_expires_at', { count: 'exact' })
        .eq('status', 'active')
        .eq('is_flash_deal', true)
        .gt('flash_expires_at', new Date().toISOString())
        .not('flash_price_kobo', 'is', null)
        .order('flash_expires_at', { ascending: true })
        .limit(1)
      const first = (data ?? [])[0] as { flash_expires_at: string } | undefined
      if (first) { setCount(n ?? 1); setEndsAt(new Date(first.flash_expires_at).getTime()) }
    })()
  }, [])

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => setLeft(Math.max(0, endsAt - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt])

  const s = Math.floor(left / 1000)
  const pad = (v: number) => String(v).padStart(2, '0')
  const clock = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  const live = endsAt !== null && left > 0

  return (
    <button
      onClick={() => void navigate('/search?q=deals')}
      className="w-full h-14 rounded-full px-5 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
      style={live
        ? { background: 'linear-gradient(120deg,#FF8A3D,#F0506E)', color: '#1A0B05' }
        : { ...CARD, color: '#fff' }}
    >
      <Zap size={20} />
      <span className="flex-1 leading-tight">
        <span className="block text-sm font-extrabold">Flash deals</span>
        <span className="block text-[11px] font-semibold" style={{ opacity: 0.8 }}>
          {live ? `${count} live · ends in ${clock}` : 'See today’s deals'}
        </span>
      </span>
      <ChevronRight size={18} />
    </button>
  )
}

/* ───────── The panel ───────── */
export default function RightPanel() {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const [query, setQuery] = useState('')
  const [notifsOpen, setNotifsOpen] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    void navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
    setQuery('')
  }

  return (
    <aside
      className="w-[340px] shrink-0 h-full flex flex-col"
      style={{ background: '#09070B', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Search + bell */}
      <div className="flex items-center gap-2.5 p-4 shrink-0">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#A59DA8' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, stores, markets…"
            className="w-full h-11 rounded-full pl-10 pr-10 text-sm text-white placeholder:text-white/40 outline-none"
            style={{ background: '#100D14', border: '1px solid rgba(139,92,246,0.45)' }}
          />
          {query
            ? <button type="button" onClick={() => setQuery('')} aria-label="Clear" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40"><X size={14} /></button>
            : <SlidersHorizontal size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30" />}
        </form>
        <button
          onClick={() => setNotifsOpen(true)}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : 'Notifications'}
          className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Bell size={19} className="text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FF8A3D,#8B5CF6)' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Scrolling middle */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-4">
        <TopGroups />
        <SellersToFollow />
        <div className="rounded-3xl p-px" style={{ background: 'linear-gradient(135deg, rgba(255,106,19,0.7), rgba(99,102,241,0.7))' }}>
          <div className="rounded-[23px] p-4 flex gap-3 items-center" style={{ background: '#0A0A0A' }}>
            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.16)' }}>
              <ShieldCheck size={19} color="#34D399" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">Every delivery gets a receipt</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Confirmed orders are recorded on Arc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned to the bottom */}
      <div className="shrink-0 p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <OrderOnTheWayButton />
        <FlashDealsButton />
      </div>

      <NotificationCenter open={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </aside>
  )
}
