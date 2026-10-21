import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, MapPin, Search, X, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NotificationCenter from '@/components/NotificationCenter'
import { useNotifications } from '@/hooks/useNotifications'
import { useLiveOrder } from '@/hooks/useLiveOrder'
import SellersToFollow from '@/components/home/SellersToFollow'
import RiderBike from '@/components/layout/RiderBike'

const LABEL = { color: 'var(--k-muted)' }

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
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold tracking-[0.12em]" style={LABEL}>TOP MARKET GROUPS</p>
        <button onClick={() => void navigate('/groups')} className="text-xs font-bold flex items-center" style={{ color: 'var(--k-accent)' }}>
          See all <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex flex-col">
        {list.map((g, i) => {
          const n = g.member_count ?? 0
          return (
            <button
              key={g.id}
              onClick={() => void navigate(`/groups/${g.id}`)}
              className="flex items-center gap-3 py-2 text-left"
            >
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: 'var(--k-surface2)' }}>
                <MapPin size={16} style={{ color: 'var(--k-accent)' }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold truncate" style={{ color: 'var(--k-text)' }}>{g.name}</span>
                <span className="block text-[11px]" style={LABEL}>
                  {n > 0 ? `${n.toLocaleString('en-NG')} member${n === 1 ? '' : 's'}` : 'Be the first to join'}
                </span>
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--k-faint)' }}>{i + 1}</span>
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
      className="w-full rounded-[18px] px-4 pt-2.5 pb-3.5 text-left transition-transform active:scale-[0.98]"
      style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}
      aria-label={live ? `Order on the way: ${o.title}. ${o.line}` : 'My orders'}
    >
      <RiderBike moving={live} className="w-full h-[78px] block" />
      <span className="flex items-center justify-between gap-3 mt-1">
        <span className="min-w-0">
          <span className="block text-sm font-extrabold" style={{ color: 'var(--k-text)' }}>
            {live ? 'Order on the way' : 'No order on the way'}
          </span>
          <span className="block text-xs truncate" style={LABEL}>
            {live ? `${o.title}${o.rider ? ` · rider ${o.rider}` : ''}` : 'Tap to see your orders'}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0" style={{ color: 'var(--k-accent)' }} />
      </span>
      {live && (
        <span className="block h-1 rounded-full mt-3" style={{ background: 'var(--k-line)' }}>
          <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${o.pct}%`, background: 'var(--k-accent)' }} />
        </span>
      )}
    </button>
  )
}

/** Shown only while real flash deals are live. Hidden otherwise. */
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

  if (endsAt === null || left <= 0) return null

  const s = Math.floor(left / 1000)
  const pad = (v: number) => String(v).padStart(2, '0')
  const clock = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`

  return (
    <button
      onClick={() => void navigate('/search?q=deals')}
      className="w-full h-[50px] rounded-full px-5 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
      style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}
    >
      <Zap size={18} />
      <span className="flex-1 text-sm font-extrabold">
        Flash deals <span className="font-mono text-xs font-semibold ml-1.5" style={{ opacity: 0.85 }}>{count} live · {clock}</span>
      </span>
      <ChevronRight size={16} />
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
    <aside className="w-[340px] shrink-0 h-full flex flex-col" style={{ background: 'var(--k-bg)', borderLeft: '1px solid var(--k-line)' }}>
      {/* Search + bell */}
      <div className="flex items-center gap-2.5 p-5 pb-4 shrink-0">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={LABEL} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products or stores"
            aria-label="Search products or stores"
            className="w-full h-[42px] rounded-full pl-10 pr-9 text-[13px] outline-none"
            style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)', color: 'var(--k-text)' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear" className="absolute right-3.5 top-1/2 -translate-y-1/2" style={LABEL}>
              <X size={14} />
            </button>
          )}
        </form>
        <button
          onClick={() => setNotifsOpen(true)}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0"
          style={{ border: '1px solid var(--k-line)', color: 'var(--k-text)' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
              style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Scrolling middle */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4 space-y-6">
        <TopGroups />
        <SellersToFollow />
      </div>

      {/* Pinned to the bottom */}
      <div className="shrink-0 p-5 space-y-3" style={{ borderTop: '1px solid var(--k-line)' }}>
        <OrderOnTheWayButton />
        <FlashDealsButton />
      </div>

      <NotificationCenter open={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </aside>
  )
}
