import { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks, clearTickCache } from '@/components/Tick'
import AdminNav from '@/components/AdminNav'

interface Row { id: string; email: string | null; display_name: string | null; roles: string[] | null }
const STAFF = ['admin', 'investigation_admin', 'super_admin']
const LABEL: Record<string, string> = { admin: 'Admin', investigation_admin: 'Investigation admin', super_admin: 'Super admin', none: 'Remove from staff' }
const staffRole = (r: string[] | null) => (r ?? []).find(x => STAFF.includes(x))

export default function AdminStaff() {
  const { profile } = useAuth()
  const isSuper = (profile?.roles ?? []).includes('super_admin')
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [pending, setPending] = useState<{ id: string; role: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_list_users')
    setRows((data ?? []) as Row[])
  }, [])
  useEffect(() => { void load() }, [load])

  const staff = useMemo(() => rows.filter(r => staffRole(r.roles)), [rows])
  const found = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return rows.filter(r => !staffRole(r.roles) && ((r.email ?? '').toLowerCase().includes(s) || (r.display_name ?? '').toLowerCase().includes(s))).slice(0, 5)
  }, [rows, q])

  const apply = async (id: string, role: string) => {
    setBusy(true)
    const { error } = await supabase.rpc('set_staff_role', { target: id, new_role: role })
    setBusy(false); setPending(null)
    if (error) { toast.error(error.message); return }
    clearTickCache(id); toast.success(role === 'none' ? 'Removed from staff' : `Now ${LABEL[role]}`); setQ(''); await load()
  }

  if (!isSuper) return (
    <div className="px-4 py-6 max-w-3xl mx-auto"><AdminNav /><p className="text-sm" style={{ color: 'var(--k-muted)' }}>Only a super admin can manage staff.</p></div>
  )

  const btn = (id: string, role: string, tone?: 'bad') => {
    const asking = pending?.id === id && pending.role === role
    return (
      <button key={role} disabled={busy} onClick={() => asking ? void apply(id, role) : setPending({ id, role })}
        className="h-9 px-3 rounded-full text-xs font-bold disabled:opacity-60"
        style={asking ? { background: tone === 'bad' ? '#E5484D' : 'var(--k-accent)', color: '#fff' } : { border: '1px solid var(--k-line)', color: tone === 'bad' ? '#E5484D' : 'var(--k-text)' }}>
        {asking ? 'Tap again to confirm' : LABEL[role]}
      </button>
    )
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto" style={{ color: 'var(--k-text)' }}>
      <h1 className="text-xl font-extrabold mb-4">Staff and roles</h1>
      <AdminNav />

      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--k-faint)' }}>Add staff</h2>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a user by name or email"
        className="w-full h-11 px-3 rounded-xl text-sm bg-transparent outline-none" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }} />
      <div className="grid gap-2 mt-2">
        {found.map(r => (
          <div key={r.id} className="p-3 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
            <p className="text-sm font-bold truncate">{r.display_name || 'No name yet'}</p>
            <p className="text-xs truncate mb-2" style={{ color: 'var(--k-muted)' }}>{r.email}</p>
            <div className="flex gap-2 flex-wrap">{btn(r.id, 'admin')}{btn(r.id, 'investigation_admin')}</div>
          </div>
        ))}
        {q.trim().length >= 2 && found.length === 0 && <p className="text-xs" style={{ color: 'var(--k-muted)' }}>No matching user.</p>}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--k-muted)' }}>Staff keep only the staff role. Making someone staff removes their buyer, seller and rider roles.</p>

      <h2 className="mt-7 mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--k-faint)' }}>Current staff</h2>
      <div className="grid gap-2">
        {staff.map(r => (
          <div key={r.id} className="p-3 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
            <p className="flex items-center gap-1.5 text-sm font-bold"><span className="truncate">{r.display_name || 'No name yet'}</span><UserTicks userId={r.id} size={14} /></p>
            <p className="text-xs" style={{ color: 'var(--k-muted)' }}>{LABEL[staffRole(r.roles) as string]} · {r.email}</p>
            {r.id === profile?.id
              ? <p className="mt-2 text-xs" style={{ color: 'var(--k-faint)' }}>This is you. You cannot change your own role.</p>
              : <div className="flex gap-2 flex-wrap mt-2">
                  {(['admin', 'investigation_admin', 'super_admin'] as const).filter(x => x !== staffRole(r.roles)).map(x => btn(r.id, x))}
                  {btn(r.id, 'none', 'bad')}
                </div>}
          </div>
        ))}
      </div>
    </div>
  )
}
