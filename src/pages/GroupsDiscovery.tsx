import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Lock, ChevronRight, MapPin, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import { toast } from 'sonner'

interface Market {
  id: number
  name: string
  slug: string
  description: string
  address: string
  state_name: string
}

interface Group {
  id: string
  market_id: number
  name: string
  description: string
  member_count: number
  post_count: number
  daily_fee_kobo: number
  weekly_fee_kobo: number
  monthly_fee_kobo: number
  is_active: boolean
  market: Market
  is_subscribed?: boolean
  subscription_expires?: string
}

type Tier = 'daily' | 'weekly' | 'monthly'

const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`

const DEV_BYPASS = import.meta.env.DEV

export default function GroupsDiscovery() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [filtered, setFiltered] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All States')
  const [states, setStates] = useState<string[]>([])
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [tierModal, setTierModal] = useState<Group | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: groupData } = await supabase
      .from('market_groups')
      .select(`
        id, market_id, name, description, member_count, post_count,
        daily_fee_kobo, weekly_fee_kobo, monthly_fee_kobo, is_active,
        market:ng_markets(id, name, slug, description, address,
          ng_states(name))
      `)
      .eq('is_active', true)
      .order('member_count', { ascending: false })

    if (!groupData) { setLoading(false); return }

    // Flatten market + state name
    const flat: Group[] = (groupData as unknown[]).map((g: unknown) => {
      const row = g as Record<string, unknown>
      const mkt = row.market as Record<string, unknown>
      const st = mkt?.ng_states as Record<string, unknown>
      return {
        ...(row as unknown as Group),
        market: {
          ...mkt,
          state_name: (st?.name as string) ?? '',
        } as unknown as Market,
      }
    })

    // Check subscriptions if logged in
    if (user) {
      const { data: subs } = await supabase
        .from('group_subscriptions')
        .select('group_id, expires_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())

      const subMap: Record<string, string> = {}
      if (subs) (subs as { group_id: string; expires_at: string }[]).forEach(s => { subMap[s.group_id] = s.expires_at })

      flat.forEach(g => {
        g.is_subscribed = !!subMap[g.id]
        g.subscription_expires = subMap[g.id]
      })
    }

    const stateList = [...new Set(flat.map(g => g.market?.state_name).filter(Boolean))].sort()
    setStates(stateList)
    setGroups(flat)
    setFiltered(flat)
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let result = groups
    if (stateFilter !== 'All States') {
      result = result.filter(g => g.market?.state_name === stateFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.market?.name?.toLowerCase().includes(q) ||
        g.market?.address?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, stateFilter, groups])

  const handleSubscribe = async (group: Group, tier: Tier) => {
    if (!user) { void navigate('/login'); return }
    setSubscribing(group.id)
    setTierModal(null)

    const feeMap: Record<Tier, number> = {
      daily: group.daily_fee_kobo,
      weekly: group.weekly_fee_kobo,
      monthly: group.monthly_fee_kobo,
    }
    const amount = feeMap[tier]
    const ref = generateRef(`GRP_${tier.toUpperCase()}`)

    try {
      await openPaystackCheckout({
        email: user.email ?? `${user.id}@kasaja.app`,
        amount,
        ref,
        metadata: { group_id: group.id, tier, user_id: user.id },
        callback: (response: { reference: string }) => {
          const paystackRef = response.reference
          const now = new Date()
          const expires = new Date(now)
          if (tier === 'daily') expires.setDate(expires.getDate() + 1)
          else if (tier === 'weekly') expires.setDate(expires.getDate() + 7)
          else expires.setMonth(expires.getMonth() + 1)
          void (async () => {
            await supabase.from('group_subscriptions').upsert({
              group_id: group.id,
              user_id: user.id,
              tier,
              paystack_ref: paystackRef,
              starts_at: now.toISOString(),
              expires_at: expires.toISOString(),
              is_active: true,
            }, { onConflict: 'group_id,user_id' })
            await supabase.rpc('increment_group_members', { gid: group.id })
            toast.success(`Subscribed to ${group.name}!`)
            void load()
          })()
        },
        onClose: () => {
          toast.info('Payment cancelled')
          setSubscribing(null)
        },
      })
    } catch {
      toast.error('Payment failed')
    }
    setSubscribing(null)
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="bg-surface border-b border-ink-subtle/10 px-4 pt-4 pb-3 sticky top-14 z-10">
        <h1 className="text-lg font-display font-bold text-ink-base mb-3">Market Groups</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets or cities..."
            className="w-full bg-canvas rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink-base placeholder-ink-muted border border-ink-subtle/20 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* State filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All States', ...states].map(s => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                stateFilter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-canvas border border-ink-subtle/20 text-ink-muted hover:border-brand-500/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No groups found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(group => (
              <div key={group.id} className="bg-surface rounded-2xl border border-ink-subtle/10 overflow-hidden">
                {/* Group header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-ink-base truncate">{group.name}</h3>
                        {group.is_subscribed && (
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-ink-muted mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{group.market?.address}</span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2">{group.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.member_count.toLocaleString()} members
                    </span>
                    <span>{group.post_count.toLocaleString()} posts</span>
                    {group.is_subscribed && group.subscription_expires && (
                      <span className="text-green-400">
                        Expires {new Date(group.subscription_expires).toLocaleDateString('en-NG')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing + actions */}
                <div className="border-t border-ink-subtle/10 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex gap-3 text-xs">
                    <span className="text-ink-muted">
                      <span className="text-ink-base font-semibold">{fmt(group.daily_fee_kobo)}</span>/day
                    </span>
                    <span className="text-ink-muted">
                      <span className="text-ink-base font-semibold">{fmt(group.weekly_fee_kobo)}</span>/wk
                    </span>
                    <span className="text-ink-muted">
                      <span className="text-ink-base font-semibold">{fmt(group.monthly_fee_kobo)}</span>/mo
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {(group.is_subscribed || DEV_BYPASS) ? (
                      <button
                        onClick={() => void navigate(`/groups/${group.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-semibold"
                      >
                        Enter <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setTierModal(group)}
                          disabled={subscribing === group.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-semibold disabled:opacity-60"
                        >
                          {subscribing === group.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          Join
                        </button>
                        <button
                          onClick={() => void navigate(`/groups/${group.id}`)}
                          className="px-3 py-1.5 border border-ink-subtle/20 text-ink-muted rounded-xl text-xs"
                        >
                          Preview
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier selection modal */}
      {tierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-md p-6">
            <h2 className="text-lg font-display font-bold text-ink-base mb-1">{tierModal.name}</h2>
            <p className="text-sm text-ink-muted mb-6">Choose your subscription period</p>

            <div className="space-y-3 mb-6">
              {([
                { tier: 'daily' as Tier, label: 'Daily Access', sub: 'Valid for 24 hours', fee: tierModal.daily_fee_kobo },
                { tier: 'weekly' as Tier, label: 'Weekly Access', sub: 'Valid for 7 days', fee: tierModal.weekly_fee_kobo },
                { tier: 'monthly' as Tier, label: 'Monthly Access', sub: 'Valid for 30 days — best value', fee: tierModal.monthly_fee_kobo },
              ]).map(({ tier, label, sub, fee }) => (
                <button
                  key={tier}
                  onClick={() => void handleSubscribe(tierModal, tier)}
                  className="w-full flex items-center justify-between p-4 bg-canvas rounded-2xl border border-ink-subtle/20 hover:border-brand-500/60 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-ink-base">{label}</p>
                    <p className="text-xs text-ink-muted">{sub}</p>
                  </div>
                  <span className="text-brand-500 font-bold">{fmt(fee)}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setTierModal(null)}
              className="w-full py-3 text-ink-muted text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
