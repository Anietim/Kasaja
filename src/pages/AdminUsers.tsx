import { useEffect, useMemo, useState, useCallback } from 'react'
import { MoreVertical, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks, clearTickCache } from '@/components/Tick'
import { isStaff } from '@/lib/staff'

interface Row {
  id: string; email: string | null; display_name: string | null; avatar_url: string | null
  roles: string[] | null; created_at: string; place: string | null; id_status: string | null
  seller_verified: boolean; rider_verified: boolean; shopper_verified: boolean; business_verified: boolean; is_trusted: boolean
}

const TICKS: { kind: string; label: string; has: (r: Row) => boolean }[] = [
  { kind: 'id',       label: 'ID tick',            has: r => r.id_status === 'verified' },
  { kind: 'seller',   label: 'Seller tick',        has: r => r.seller_verified },
  { kind: 'rider',    label: 'Rider tick',         has: r => r.rider_verified },
  { kind: 'shopper',  label: 'Shopper tick',       has: r => r.shopper_verified },
  { kind: 'business', label: 'Business tick',      has: r => r.business_verified },
  { kind: 'trusted',  label: 'Trusted tick',       has: r => r.is_trusted },
]
const STAFF_ROLES = [
  { v: 'none', label: 'Not staff' }, { v: 'admin', label: 'Admin' },
  { v: 'investigation_admin', label: 'Investigation admin' }, { v: 'super_admin', label: 'Super admin' },
]
const FILTERS = ['All', 'Sellers', 'Riders', 'Buyers', 'Staff'] as const

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return 'Today'
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}
function roleLabel(r: string[] | null) {
  const x = r ?? []
  if (x.includes('super_admin')) return 'Super admin'
  if (x.includes('admin')) return 'Admin'
  if (x.includes('investigation_admin')) return 'Investigation admin'
  const out: string[] = []
  if (x.includes('seller') || x.includes('independent')) out.push('Seller')
  if (x.includes('rider')) out.push('Rider')
  if (x.includes('buyer') || out.length === 0) out.push('Buyer')
  return out.join(' · ')
}

export default function AdminUsers() {
  const { profile } = useAuth()
  const isSuper = (profile?.roles ?? []).includes('super_admin')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [open, setOpen] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('admin_list_users')
    if (e) { setError(e.message); setRows([]); return }
    setError(''); setRows((data ?? []) as Row[])
  }, [])
  useEffect(() => { void load() }, [load])

  const shown = useMemo(() => (rows ?? []).filter(r => {
    const roles = r.roles ?? []
    if (filter === 'Sellers' && !(roles.includes('seller') || roles.includes('independent'))) return false
    if (filter === 'Riders' && !roles.includes('rider')) return false
    if (filter === 'Buyers' && !roles.includes('buyer')) return false
    if (filter === 'Staff' && !isStaff(roles)) return false
    const s = q.trim().toLowerCase()
    return !s || (r.display_name ?? '').toLowerCase().includes(s) || (r.email ?? '').toLowerCase().includes(s)
  }), [rows, q, filter])

  const run = async (fn: string, args: Record<string, unknown>, ok: string, userId: string) => {
    setBusy(true)
    const { error: e } = await supabase.rpc(fn, args)
    setBusy(false)
    if (e) { toast.error(e.message); return }
    toast.success(ok); clearTickCache(userId)
    await load()
    setOpen(cur => cur) // keep sheet open; refreshed row is picked up below
  }
  const current = open ? (rows ?? []).find(r => r.id === open.id) ?? open : null

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto" style={{ color: 'var(--k-text)' }}>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-xl font-extrabold">Users</h1>
        <span className="text-xs" style={{ color: 'var(--k-muted)' }}>{rows ? `${shown.length} of ${rows.length}` : ''}</span>
      </div>

      <div className="flex items-center gap-2 h-11 px-3 rounded-xl mb-3" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
        <Search size={16} style={{ color: 'var(--k-muted)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email" className="flex-1 bg-transparent outline-none text-sm" />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="shrink-0 h-8 px-3 rounded-full text-xs font-bold"
            style={filter === f ? { background: 'var(--k-accent)', color: 'var(--k-on-accent)' } : { border: '1px solid var(--k-line)', color: 'var(--k-muted)' }}>{f}</button>
        ))}
      </div>

      {error && <p className="text-sm mb-3" style={{ color: '#E5484D' }}>Could not load users: {error}. Run super-admin-powers.sql in Supabase.</p>}
      {rows === null && <p className="text-sm" style={{ color: 'var(--k-muted)' }}>Loading…</p>}
      {rows && rows.length > 0 && shown.length === 0 && <p className="text-sm" style={{ color: 'var(--k-muted)' }}>No one matches.</p>}

      <div className="grid gap-2">
        {shown.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
            <span className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-extrabold" style={{ background: 'var(--k-accent-soft)', color: 'var(--k-accent)' }}>
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : (r.display_name || r.email || '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold"><span className="truncate">{r.display_name || 'No name yet'}</span><UserTicks userId={r.id} size={14} /></p>
              <p className="text-xs truncate" style={{ color: 'var(--k-muted)' }}>{roleLabel(r.roles)}{r.place ? ` · ${r.place}` : ''}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--k-faint)' }}>{r.email}</p>
            </div>
            <span className="text-[11px] shrink-0" style={{ color: 'var(--k-faint)' }}>{ago(r.created_at)}</span>
            {isSuper && (
              <button onClick={() => setOpen(r)} aria-label="Manage user" className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--k-surface2)' }}>
                <MoreVertical size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {current && isSuper && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setOpen(null)}>
          <div className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-[26px] sm:rounded-[26px] p-5 pb-8" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-lg font-extrabold truncate">{current.display_name || 'No name yet'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--k-muted)' }}>{current.email}</p>
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close"><X size={18} style={{ color: 'var(--k-muted)' }} /></button>
            </div>

            <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--k-faint)' }}>Staff role</p>
            {current.id === profile?.id
              ? <p className="text-sm" style={{ color: 'var(--k-muted)' }}>You cannot change your own role.</p>
              : <div className="grid gap-2">
                  {STAFF_ROLES.map(o => {
                    const now = isStaff(current.roles) ? (current.roles ?? []).find(x => ['admin','investigation_admin','super_admin'].includes(x)) ?? 'none' : 'none'
                    const on = now === o.v
                    return (
                      <button key={o.v} disabled={busy || on} onClick={() => void run('set_staff_role', { target: current.id, new_role: o.v }, `Role set: ${o.label}`, current.id)}
                        className="h-11 px-3 rounded-xl text-sm font-bold text-left flex items-center justify-between disabled:opacity-60"
                        style={on ? { background: 'var(--k-accent-soft)', border: '1px solid var(--k-accent)', color: 'var(--k-accent)' } : { border: '1px solid var(--k-line)' }}>
                        {o.label}{on && <span className="text-xs">Current</span>}
                      </button>
                    )
                  })}
                  <p className="text-xs" style={{ color: 'var(--k-muted)' }}>Staff hold only the staff role. Setting one removes buyer, seller and rider roles.</p>
                </div>}

            <p className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--k-faint)' }}>Free ticks</p>
            {isStaff(current.roles)
              ? <p className="text-sm" style={{ color: 'var(--k-muted)' }}>Staff show the KASAJA Team tick only.</p>
              : <div className="grid gap-2">
                  {TICKS.map(t => {
                    const on = t.has(current)
                    return (
                      <button key={t.kind} disabled={busy} onClick={() => void run('set_free_tick', { target: current.id, kind: t.kind, on_off: !on }, on ? `${t.label} removed` : `${t.label} given`, current.id)}
                        className="h-11 px-3 rounded-xl text-sm font-bold flex items-center justify-between disabled:opacity-60" style={{ border: '1px solid var(--k-line)' }}>
                        {t.label}
                        <span className="text-xs font-extrabold" style={{ color: on ? 'var(--k-accent)' : 'var(--k-muted)' }}>{on ? 'Given · tap to remove' : 'Give free'}</span>
                      </button>
                    )
                  })}
                </div>}
          </div>
        </div>
      )}
    </div>
  )
}
