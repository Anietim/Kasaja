import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export type TickKind = 'id' | 'seller' | 'rider' | 'shopper' | 'business' | 'trusted' | 'team'

/** Scalloped seal, same shape in every tick */
const SEAL = (() => {
  const pts: string[] = []
  const N = 120, n = 10, amp = 0.085, R = 10.4
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N
    const r = (R * (1 + amp * Math.cos(n * a))) / (1 + amp)
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`)
  }
  return 'M' + pts.join(' L') + 'Z'
})()

const K = (color: string) => (
  <g transform="translate(6.45 6.5) scale(.108)" fill={color}>
    <rect x="14" y="4" width="16" height="92" rx="4" />
    <path d="M30 49C46 42 58 30 62 14L87 8C82 34 60 50 30 56Z" />
    <path d="M30 56C46 62 58 74 62 90L87 96C82 70 60 54 30 49Z" />
  </g>
)

export const TICK_INFO: Record<TickKind, { title: string; lines: string[] }> = {
  id:       { title: 'ID verified', lines: ['NIN or BVN checked', 'Selfie matched the ID'] },
  seller:   { title: 'Verified Seller', lines: ['Owner ID and selfie checked', 'Phone number confirmed', 'Shop address confirmed'] },
  rider:    { title: 'Verified Rider', lines: ['Owner ID and selfie checked', 'Vehicle papers and plate number checked', 'Guarantor confirmed'] },
  shopper:  { title: 'Verified Personal Shopper', lines: ['ID and selfie checked', 'Guarantor confirmed', 'First jobs reviewed'] },
  business: { title: 'Registered Business', lines: ['Verified Seller checks passed', 'CAC registration document checked'] },
  trusted:  { title: 'Trusted', lines: ['Earned from completed, confirmed jobs', 'Low disputes. This tick cannot be bought'] },
  team:     { title: 'KASAJA Team', lines: ['Official KASAJA account'] },
}

export function KTick({ kind, size = 18, title }: { kind: TickKind; size?: number; title?: string }) {
  let body: React.ReactNode
  switch (kind) {
    case 'id':
      body = <><path d={SEAL} fill="var(--tk-id)" stroke="var(--tk-id-edge)" strokeWidth="1.5" strokeLinejoin="round" />{K('var(--tk-id-k)')}</>
      break
    case 'seller':
      body = <><path d={SEAL} fill="var(--k-accent, #FF7A1A)" />{K('var(--k-on-accent, #1A0B05)')}</>
      break
    case 'rider':
      body = <><path d={SEAL} fill="var(--tk-rider)" />{K('var(--tk-rider-on)')}</>
      break
    case 'shopper':
      body = <><path d={SEAL} fill="var(--tk-shopper)" />{K('var(--tk-shopper-on)')}</>
      break
    case 'business':
      body = <><path d={SEAL} fill="var(--tk-gold)" />{K('var(--tk-gold-on)')}</>
      break
    case 'trusted':
      body = <><path d={SEAL} fill="none" stroke="var(--k-accent, #FF7A1A)" strokeWidth="1.8" strokeLinejoin="round" />{K('var(--k-accent, #FF7A1A)')}</>
      break
    default:
      body = <><path d={SEAL} fill="var(--tk-team)" stroke="#FF7A1A" strokeWidth="1.5" strokeLinejoin="round" />{K('#FF7A1A')}</>
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title ?? TICK_INFO[kind].title} style={{ flex: 'none', display: 'inline-block' }}>
      {body}
    </svg>
  )
}

interface Row {
  id_status?: string | null; roles?: string[] | null
  seller_verified?: boolean | null; rider_verified?: boolean | null
  shopper_verified?: boolean | null; business_verified?: boolean | null; is_trusted?: boolean | null
}

const cache = new Map<string, { at: number; p: Promise<Row | null> }>()
const TTL_MS = 20_000
export function clearTickCache(userId?: string) { if (userId) cache.delete(userId); else cache.clear() }

function fetchRow(userId: string, force = false): Promise<Row | null> {
  const hit = cache.get(userId)
  if (hit && !force && Date.now() - hit.at < TTL_MS) return hit.p
  {
    const p = (async () => {
      const full = await supabase.from('profiles')
        .select('id_status, roles, seller_verified, rider_verified, shopper_verified, business_verified, is_trusted')
        .eq('id', userId).maybeSingle()
      if (!full.error) return (full.data as Row | null)
      // columns not added yet (verification-setup.sql not run): fall back to what exists
      const basic = await supabase.from('profiles').select('roles, seller_verified, rider_verified').eq('id', userId).maybeSingle()
      return (basic.data as Row | null) ?? null
    })()
    cache.set(userId, { at: Date.now(), p })
    return p
  }
}

export function ticksFor(row: Row | null): TickKind[] {
  if (!row) return []
  // Admin of any kind: one KASAJA Team tick only. It overrides every other tick.
  const roles = (row.roles ?? []) as string[]
  if (roles.some(r => ['admin', 'super_admin', 'investigation_admin'].includes(r))) return ['team']
  const out: TickKind[] = []
  if (row.id_status === 'verified') out.push('id')
  if (row.seller_verified) out.push('seller')
  if (row.rider_verified) out.push('rider')
  if (row.shopper_verified) out.push('shopper')
  if (row.business_verified) out.push('business')
  if (row.is_trusted) out.push('trusted')
  return out
}

/** Every tick a person has, in order: black ID tick, paid role ticks, earned tick. Tap one to see what was checked. */
export function UserTicks({ userId, size = 18, compact = false, legacyVerified = false, plain = false }: {
  userId?: string | null; size?: number
  /** not tappable: use inside a button or link */
  plain?: boolean
  /** cards and chat: show only the highest paid tick */
  compact?: boolean
  /** old stores.is_verified flag: shows the seller tick if nothing else loads */
  legacyVerified?: boolean
}) {
  const [kinds, setKinds] = useState<TickKind[]>([])
  const [open, setOpen] = useState<TickKind | null>(null)

  useEffect(() => {
    let alive = true
    if (!userId) return
    const load = () => {
      void fetchRow(userId).then(r => {
        if (!alive) return
        const k = ticksFor(r)
        setKinds(k.length > 0 ? k : legacyVerified ? ['seller'] : [])
      })
    }
    load()
    // keep ticks fresh: a tick given while the app is open shows within seconds, with no reload
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    const timer = window.setInterval(onVisible, 30_000)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(timer)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, legacyVerified])

  if (kinds.length === 0) return null
  const shown = kinds.includes('team') ? ['team' as TickKind] : compact ? kinds.slice(-1) : kinds

  return (
    <>
      <span className="inline-flex items-center gap-1 align-middle">
        {shown.map(k => plain
          ? <span key={k} className="inline-flex" title={TICK_INFO[k].title}><KTick kind={k} size={size} /></span>
          : (
            <button key={k} type="button" onClick={e => { e.stopPropagation(); setOpen(k) }} aria-label={TICK_INFO[k].title} className="inline-flex">
              <KTick kind={k} size={size} />
            </button>
          ))}
      </span>
      {open && <TickSheet kind={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function TickSheet({ kind, onClose }: { kind: TickKind; onClose: () => void }) {
  const info = TICK_INFO[kind]
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-[26px] sm:rounded-[26px] p-5 pb-8" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line2)', color: 'var(--k-text)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--k-surface2)' }}><KTick kind={kind} size={34} /></span>
          <div className="flex-1">
            <p className="text-lg font-extrabold">{info.title}</p>
            <p className="text-xs" style={{ color: 'var(--k-muted)' }}>KASAJA checked this account</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--k-muted)' }}><X size={18} /></button>
        </div>
        <ul className="mt-4 space-y-2">
          {info.lines.map(l => (
            <li key={l} className="flex items-center gap-2.5 text-sm">
              <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--k-accent)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--k-on-accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>{l}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs rounded-xl p-3 leading-relaxed" style={{ background: 'var(--k-surface2)', color: 'var(--k-muted)' }}>
          A tick means identity was checked. It is not a guarantee of any product or service.
        </p>
      </div>
    </div>
  )
}
