import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import AdminNav from '@/components/AdminNav'

interface Entry { id: string; actor: string | null; action: string; target: string | null; detail: Record<string, unknown> | null; created_at: string }

export default function AdminAudit() {
  const { profile } = useAuth()
  const isSuper = (profile?.roles ?? []).includes('super_admin')
  const [rows, setRows] = useState<Entry[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isSuper) return
    void (async () => {
      const { data } = await supabase.from('admin_audit').select('*').order('created_at', { ascending: false }).limit(100)
      setRows((data ?? []) as Entry[])
      const { data: u } = await supabase.rpc('admin_list_users')
      const m: Record<string, string> = {}
      ;((u ?? []) as { id: string; display_name: string | null; email: string | null }[]).forEach(x => { m[x.id] = x.display_name || x.email || 'Someone' })
      setNames(m)
    })()
  }, [isSuper])

  const who = (id: string | null) => (id && names[id]) || 'Someone'
  const say = (e: Entry) => {
    const d = e.detail ?? {}
    if (e.action === 'set_staff_role') return d.role === 'none' ? `Removed ${who(e.target)} from staff` : `Set ${who(e.target)} as ${String(d.role).replace('_', ' ')}`
    if (e.action === 'set_free_tick') return `${d.on ? 'Gave' : 'Removed'} the ${String(d.tick)} tick ${d.on ? 'to' : 'from'} ${who(e.target)}`
    if (e.action === 'set_group_free') return d.free_until ? 'Changed free access for a group' : 'Ended free access for a group'
    return e.action.replace(/_/g, ' ')
  }

  if (!isSuper) return (
    <div className="px-4 py-6 max-w-3xl mx-auto"><AdminNav /><p className="text-sm" style={{ color: 'var(--k-muted)' }}>Only a super admin can see the audit log.</p></div>
  )

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto" style={{ color: 'var(--k-text)' }}>
      <h1 className="text-xl font-extrabold mb-4">Audit log</h1>
      <AdminNav />
      {rows === null && <p className="text-sm" style={{ color: 'var(--k-muted)' }}>Loading…</p>}
      {rows && rows.length === 0 && <p className="text-sm" style={{ color: 'var(--k-muted)' }}>No actions recorded yet. Role changes, free ticks and free groups appear here.</p>}
      <div className="grid gap-2">
        {rows?.map(e => (
          <div key={e.id} className="p-3 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
            <p className="text-sm font-bold">{say(e)}</p>
            <p className="text-xs" style={{ color: 'var(--k-muted)' }}>By {who(e.actor)} · {new Date(e.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
