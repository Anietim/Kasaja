import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks } from '@/components/Tick'
import AdminNav from '@/components/AdminNav'

interface Overview {
  users_total: number; users_today: number; id_waiting: number; id_paid_no_form: number
  disputes_open: number | null
  waiting: { id: string; user_id: string; full_name: string; created_at: string }[]
}

function waited(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${Math.max(m, 1)} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`
}

export default function AdminHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [o, setO] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void supabase.rpc('admin_overview').then(({ data, error: e }) => {
      if (e) setError(e.message); else setO(data as Overview)
    })
  }, [])

  const card = (label: string, value: number | null | undefined, to: string) => (
    <button onClick={() => void navigate(to)} className="text-left p-4 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
      <p className="text-xs" style={{ color: 'var(--k-muted)' }}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value == null ? '–' : value.toLocaleString('en-NG')}</p>
    </button>
  )

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto" style={{ color: 'var(--k-text)' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold">Overview</h1>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-full" style={{ border: '1px solid var(--k-line)', background: 'var(--k-surface)' }}>
          <UserTicks userId={profile?.id} size={14} /> KASAJA Team
        </span>
      </div>
      <AdminNav />

      {error && <p className="text-sm mb-3" style={{ color: '#E5484D' }}>Could not load numbers: {error}. Run admin-panel.sql in Supabase.</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {card('ID checks waiting', o?.id_waiting, '/admin/id-checks')}
        {card('Paid, form not sent', o?.id_paid_no_form, '/admin/users')}
        {card('Open disputes', o?.disputes_open, '/admin/disputes')}
        {card('New users today', o?.users_today, '/admin/users')}
      </div>

      <h2 className="mt-7 mb-2 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--k-faint)' }}>Needs you now</h2>
      <div className="grid gap-2">
        {o && o.waiting.length === 0 && (
          <p className="text-sm p-4 rounded-2xl" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)', color: 'var(--k-muted)' }}>Nothing is waiting. ID checks appear here as soon as someone submits one.</p>
        )}
        {o?.waiting.map(w => (
          <button key={w.id} onClick={() => void navigate('/admin/id-checks')} className="flex items-center justify-between gap-3 p-3 rounded-2xl text-left"
            style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
            <span className="min-w-0">
              <span className="block text-sm font-bold truncate">ID check · {w.full_name}</span>
              <span className="block text-xs" style={{ color: 'var(--k-muted)' }}>Waiting {waited(w.created_at)}</span>
            </span>
            <span className="shrink-0 h-8 px-3 rounded-full text-xs font-extrabold inline-flex items-center" style={{ background: 'var(--k-accent-soft)', color: 'var(--k-accent)' }}>Review</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--k-muted)' }}>
        {o ? `${o.users_total.toLocaleString('en-NG')} accounts in total. ` : ''}Staff accounts review and protect the platform. They cannot buy, sell, post, request or ride.
      </p>
    </div>
  )
}
