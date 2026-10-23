import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks } from '@/components/Tick'

type Tab = 'sellers' | 'riders' | 'shoppers'
type Person = {
  key: string            // unique row key
  followId: string       // the profile id that gets followed
  name: string
  sub: string
  avatar: string | null
  href: string           // where tapping the row goes
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'sellers', label: 'Sellers' },
  { id: 'riders', label: 'Riders' },
  { id: 'shoppers', label: 'Shoppers' },
]
const EMPTY: Record<Tab, string> = {
  sellers: 'No new sellers to suggest right now.',
  riders: 'No riders to suggest right now.',
  shoppers: 'No independent shoppers to suggest right now.',
}

/**
 * Right-panel card: people worth following, by role. Tap a row to open their store or profile.
 * Follow / Following works like X: private profiles show "Requested", and Following can be tapped to undo.
 */
export default function WhoToFollow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('sellers')
  const [lists, setLists] = useState<Partial<Record<Tab, Person[]>>>({})
  const [state, setState] = useState<Record<string, 'following' | 'requested' | 'busy'>>({})

  const load = useCallback(async (t: Tab) => {
    if (!user) return
    const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    const already = new Set((f ?? []).map(r => (r as { following_id: string }).following_id))
    let rows: Person[] = []

    if (t === 'sellers') {
      const { data } = await supabase
        .from('stores')
        .select('id,owner_id,name,logo_url,state,followers_count')
        .neq('owner_id', user.id)
        .order('followers_count', { ascending: false })
        .limit(14)
      rows = ((data ?? []) as unknown as { id: string; owner_id: string; name: string; logo_url: string | null; state: string | null; followers_count: number | null }[])
        .filter(s => !already.has(s.owner_id))
        .map(s => ({
          key: `s-${s.id}`, followId: s.owner_id, name: s.name, avatar: s.logo_url, href: `/store/${s.id}`,
          sub: [s.state, (s.followers_count ?? 0) > 0 ? `${s.followers_count} followers` : null].filter(Boolean).join(' · ') || 'Seller',
        }))
    } else {
      const role = t === 'riders' ? 'rider' : 'independent'
      const { data } = await supabase
        .from('profiles')
        .select('id,display_name,avatar_url')
        .contains('roles', [role])
        .neq('id', user.id)
        .limit(14)
      rows = ((data ?? []) as unknown as { id: string; display_name: string | null; avatar_url: string | null }[])
        .filter(p => !already.has(p.id))
        .map(p => ({
          key: `p-${p.id}`, followId: p.id, name: p.display_name || (t === 'riders' ? 'Rider' : 'Shopper'),
          avatar: p.avatar_url, href: `/profile/${p.id}`, sub: t === 'riders' ? 'Delivery rider' : 'Independent shopper',
        }))
    }
    setLists(prev => ({ ...prev, [t]: rows.slice(0, 4) }))
  }, [user])

  useEffect(() => { if (!lists[tab]) void load(tab) }, [tab, lists, load])

  if (!user) return null
  const list = lists[tab]

  async function toggle(p: Person) {
    if (!user) return
    const cur = state[p.key]
    if (cur === 'busy') return
    setState(s => ({ ...s, [p.key]: 'busy' }))

    if (cur === 'following' || cur === 'requested') {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', p.followId)
      if (error) { toast.error(error.message); setState(s => ({ ...s, [p.key]: cur })); return }
      setState(s => { const n = { ...s }; delete n[p.key]; return n })
      return
    }

    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: p.followId })
    // 23505 = already following (the row exists), so treat it as success instead of an error
    if (error && (error as { code?: string }).code !== '23505') {
      toast.error(error.message || 'Could not follow. Try again.')
      setState(s => { const n = { ...s }; delete n[p.key]; return n })
      return
    }
    // Private profiles keep the follow as "pending" until they accept.
    const { data: row } = await supabase.from('follows').select('status').eq('follower_id', user.id).eq('following_id', p.followId).maybeSingle()
    const pending = (row as { status?: string } | null)?.status === 'pending'
    setState(s => ({ ...s, [p.key]: pending ? 'requested' : 'following' }))
    toast.success(pending ? 'Follow request sent' : `Following ${p.name}`)
  }

  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.12em] mb-2" style={{ color: 'var(--k-muted)' }}>WHO TO FOLLOW</p>

      <div className="flex gap-1 mb-2" role="tablist" aria-label="Who to follow">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="h-7 px-3 rounded-full text-xs font-bold transition-colors"
            style={tab === t.id
              ? { background: 'var(--k-text)', color: 'var(--k-bg)' }
              : { color: 'var(--k-muted)', border: '1px solid var(--k-line)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!list ? (
        <div className="space-y-3 pt-2" aria-hidden>
          {[0, 1, 2].map(i => <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'var(--k-surface2)' }} />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-xs py-3" style={{ color: 'var(--k-muted)' }}>{EMPTY[tab]}</p>
      ) : (
        <div className="flex flex-col">
          {list.map(p => {
            const st = state[p.key]
            const on = st === 'following' || st === 'requested'
            return (
              <div key={p.key} className="flex items-center gap-3 py-2">
                <button onClick={() => void navigate(p.href)} className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-label={`View ${p.name}`}>
                  {p.avatar
                    ? <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    : <span className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold" style={{ background: 'var(--k-surface2)', color: 'var(--k-text)' }}>{p.name[0]?.toUpperCase()}</span>}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold truncate" style={{ color: 'var(--k-text)' }}><span className="flex items-center gap-1"><span className="truncate">{p.name}</span><UserTicks userId={p.followId} size={13} plain /></span></span>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--k-muted)' }}>{p.sub}</span>
                  </span>
                </button>
                <button
                  onClick={() => void toggle(p)}
                  disabled={st === 'busy'}
                  className="h-8 px-4 rounded-full text-xs font-bold shrink-0 transition-transform active:scale-95"
                  style={on
                    ? { border: '1px solid var(--k-line2)', color: 'var(--k-muted)' }
                    : { background: 'var(--k-text)', color: 'var(--k-bg)' }}
                  aria-label={on ? `Unfollow ${p.name}` : `Follow ${p.name}`}
                >
                  {st === 'requested' ? 'Requested' : st === 'following' ? 'Following' : 'Follow'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
