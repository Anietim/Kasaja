import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pause, Play, Trash2, Edit2, X, Loader2, Users, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface Market { id: number; name: string; state_name: string }
interface Group {
  id: string
  name: string
  description: string
  member_count: number
  post_count: number
  daily_fee_kobo: number
  weekly_fee_kobo: number
  monthly_fee_kobo: number
  is_active: boolean
  market_id: number
  market: { name: string; ng_states: { name: string } }
}

const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`

export default function AdminGroups() {
  const navigate = useNavigate()
  useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    market_id: '',
    name: '',
    description: '',
    daily_fee: '100',
    weekly_fee: '500',
    monthly_fee: '1500',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('market_groups')
      .select('*, market:ng_markets(name, ng_states(name))')
      .order('created_at', { ascending: false })
    if (data) setGroups(data)

    const { data: mktData } = await supabase
      .from('ng_markets')
      .select('id, name, ng_states(name)')
      .order('name')
    if (mktData) {
      setMarkets((mktData as unknown[]).map((m: unknown) => {
        const row = m as Record<string, unknown>
        const st = row.ng_states as Record<string, unknown>
        return { id: row.id as number, name: row.name as string, state_name: st?.name as string ?? '' }
      }))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ market_id: '', name: '', description: '', daily_fee: '100', weekly_fee: '500', monthly_fee: '1500' })
    setShowForm(true)
  }

  const openEdit = (g: Group) => {
    setEditing(g)
    setForm({
      market_id: String(g.market_id),
      name: g.name,
      description: g.description ?? '',
      daily_fee: String(g.daily_fee_kobo / 100),
      weekly_fee: String(g.weekly_fee_kobo / 100),
      monthly_fee: String(g.monthly_fee_kobo / 100),
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.market_id || !form.name.trim()) { toast.error('Market and name are required'); return }
    setSaving(true)
    const payload = {
      market_id: parseInt(form.market_id),
      name: form.name.trim(),
      description: form.description.trim(),
      daily_fee_kobo: Math.round(parseFloat(form.daily_fee) * 100),
      weekly_fee_kobo: Math.round(parseFloat(form.weekly_fee) * 100),
      monthly_fee_kobo: Math.round(parseFloat(form.monthly_fee) * 100),
    }

    if (editing) {
      const { error } = await supabase.from('market_groups').update(payload).eq('id', editing.id)
      if (error) toast.error('Failed to update')
      else { toast.success('Group updated'); setShowForm(false); void load() }
    } else {
      const { error } = await supabase.from('market_groups').insert({ ...payload, is_active: true })
      if (error) toast.error('Failed to create')
      else { toast.success('Group created'); setShowForm(false); void load() }
    }
    setSaving(false)
  }

  const toggleActive = async (g: Group) => {
    const { error } = await supabase.from('market_groups').update({ is_active: !g.is_active }).eq('id', g.id)
    if (error) toast.error('Failed')
    else {
      toast.success(g.is_active ? 'Group paused' : 'Group reopened')
      void load()
    }
  }

  const deleteGroup = async (g: Group) => {
    if (!confirm(`Delete "${g.name}"? This will remove all subscriptions and posts.`)) return
    const { error } = await supabase.from('market_groups').delete().eq('id', g.id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Group deleted'); void load() }
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.market?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="bg-surface border-b border-ink-subtle/10 px-4 pt-4 pb-3 sticky top-14 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => void navigate(-1)} className="p-1.5 rounded-xl hover:bg-canvas">
              <ArrowLeft className="w-5 h-5 text-ink-base" />
            </button>
            <h1 className="font-display font-bold text-ink-base">Market Groups Admin</h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full bg-canvas rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink-base placeholder-ink-muted border border-ink-subtle/20 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-ink-base">{groups.length}</p>
            <p className="text-xs text-ink-muted">Total</p>
          </div>
          <div className="bg-surface rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-green-400">{groups.filter(g => g.is_active).length}</p>
            <p className="text-xs text-ink-muted">Active</p>
          </div>
          <div className="bg-surface rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-ink-base">{groups.reduce((s, g) => s + g.member_count, 0)}</p>
            <p className="text-xs text-ink-muted">Members</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(g => (
              <div key={g.id} className={`bg-surface rounded-2xl border overflow-hidden ${g.is_active ? 'border-ink-subtle/10' : 'border-amber-500/20 opacity-60'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-ink-base truncate">{g.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.is_active ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {g.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">{g.market?.name} · {(g.market?.ng_states)?.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{g.member_count}</span>
                        <span>{fmt(g.daily_fee_kobo)}/d · {fmt(g.weekly_fee_kobo)}/w · {fmt(g.monthly_fee_kobo)}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-ink-subtle/10 px-4 py-2.5 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(g)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-canvas rounded-xl text-xs text-ink-muted hover:text-ink-base"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => void toggleActive(g)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs ${g.is_active ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}
                  >
                    {g.is_active ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Reopen</>}
                  </button>
                  <button
                    onClick={() => void deleteGroup(g)}
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl text-xs"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end p-4">
          <div className="bg-surface rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-ink-base">
                {editing ? 'Edit Group' : 'Create Market Group'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-canvas">
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1.5 block">Market *</label>
                <select
                  value={form.market_id}
                  onChange={e => setForm(f => ({ ...f, market_id: e.target.value }))}
                  className="w-full bg-canvas rounded-xl border border-ink-subtle/20 px-4 py-2.5 text-sm text-ink-base focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select a market...</option>
                  {markets.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.state_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1.5 block">Group Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Balogun Market Traders"
                  className="w-full bg-canvas rounded-xl border border-ink-subtle/20 px-4 py-2.5 text-sm text-ink-base focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this group about?"
                  className="w-full bg-canvas rounded-xl border border-ink-subtle/20 px-4 py-2.5 text-sm text-ink-base focus:outline-none focus:border-brand-500 resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'daily_fee', label: 'Daily (₦)' },
                  { key: 'weekly_fee', label: 'Weekly (₦)' },
                  { key: 'monthly_fee', label: 'Monthly (₦)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-ink-muted mb-1.5 block">{label}</label>
                    <input
                      type="number"
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-canvas rounded-xl border border-ink-subtle/20 px-3 py-2.5 text-sm text-ink-base focus:outline-none focus:border-brand-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-ink-subtle/20 text-ink-muted rounded-2xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="flex-1 py-3 bg-brand-500 text-white rounded-2xl text-sm font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editing ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
