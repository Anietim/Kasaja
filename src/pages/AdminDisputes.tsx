import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, MessageSquare, CheckCircle, ChevronRight, Search, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatNaira } from '@/lib/paystack'

type Dispute = {
  id: string
  order_id: string
  reason: string
  status: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed'
  created_at: string
  buyer: { display_name: string; phone: string }
  seller: { display_name: string; phone: string }
  order: { total_kobo: number; status: string }
  resolution_note: string | null
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400',
  under_review: 'bg-yellow-500/20 text-yellow-400',
  resolved_buyer: 'bg-blue-500/20 text-blue-400',
  resolved_seller: 'bg-green-500/20 text-green-400',
  closed: 'bg-surface text-ink-muted',
}

const MOCK_DISPUTES: Dispute[] = [
  {
    id: '1', order_id: 'ORD-001', reason: 'Item not received after 5 days',
    status: 'open', created_at: new Date().toISOString(),
    buyer: { display_name: 'Chukwuemeka Obi', phone: '08012345678' },
    seller: { display_name: 'Fatima Stores', phone: '08098765432' },
    order: { total_kobo: 2500000, status: 'paid' },
    resolution_note: null
  },
  {
    id: '2', order_id: 'ORD-002', reason: 'Wrong item delivered — ordered blue, received red',
    status: 'under_review', created_at: new Date(Date.now() - 86400000).toISOString(),
    buyer: { display_name: 'Amaka Nwosu', phone: '08023456789' },
    seller: { display_name: 'Lagos Fashion Hub', phone: '08087654321' },
    order: { total_kobo: 1800000, status: 'delivered' },
    resolution_note: 'Seller claims item was correct. Awaiting buyer photos.'
  },
  {
    id: '3', order_id: 'ORD-003', reason: 'Damaged goods on arrival',
    status: 'resolved_buyer', created_at: new Date(Date.now() - 172800000).toISOString(),
    buyer: { display_name: 'Ibrahim Musa', phone: '08034567890' },
    seller: { display_name: 'Abuja Electronics', phone: '08076543210' },
    order: { total_kobo: 4500000, status: 'refunded' },
    resolution_note: 'Buyer refunded in full. Seller notified.'
  },
]

export default function AdminDisputes() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [disputes, setDisputes] = useState<Dispute[]>(MOCK_DISPUTES)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)

  const isAdmin = profile?.roles?.includes('admin') || profile?.roles?.includes('super_admin') || profile?.roles?.includes('investigation_admin')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('disputes')
      .select(`
        *,
        buyer:profiles!disputes_buyer_id_fkey(display_name, phone),
        seller:profiles!disputes_seller_id_fkey(display_name, phone),
        order:orders!disputes_order_id_fkey(total_kobo, status)
      `)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) setDisputes(data)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!isAdmin) { void navigate('/home'); return }
  }, [isAdmin, navigate])

  const resolve = async (disputeId: string, resolution: 'resolved_buyer' | 'resolved_seller' | 'closed') => {
    setResolving(true)
    await supabase.from('disputes').update({
      status: resolution,
      resolution_note: note,
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id
    }).eq('id', disputeId)

    // If resolved in buyer's favour — refund escrow
    if (resolution === 'resolved_buyer' && selected?.order_id) {
      await supabase.from('orders').update({ status: 'refunded' }).eq('id', selected.order_id)
    }
    // If resolved in seller's favour — release escrow
    if (resolution === 'resolved_seller' && selected?.order_id) {
      await supabase.from('orders').update({ status: 'delivered' }).eq('id', selected.order_id)
    }

    setDisputes(prev => prev.map(d => d.id === disputeId
      ? { ...d, status: resolution, resolution_note: note } : d))
    setSelected(null)
    setNote('')
    setResolving(false)
  }

  const escalate = async (disputeId: string) => {
    await supabase.from('disputes').update({ status: 'under_review' }).eq('id', disputeId)
    setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'under_review' } : d))
  }

  const filtered = disputes.filter(d => {
    const matchSearch = search === '' ||
      d.buyer?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.seller?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.reason?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => ['resolved_buyer','resolved_seller','closed'].includes(d.status)).length,
  }

  return (
    <div className="min-h-dvh bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => void navigate('/admin')} className="p-2 rounded-xl hover:bg-surface">
            <ChevronRight size={20} className="rotate-180 text-ink-muted" />
          </button>
          <div>
            <h1 className="font-display font-bold text-lg text-ink">Dispute Centre</h1>
            <p className="text-xs text-ink-muted">{counts.open} open · {counts.under_review} under review</p>
          </div>
          <Shield size={20} className="ml-auto text-brand-500" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Open', count: counts.open, color: 'text-red-400' },
            { label: 'Reviewing', count: counts.under_review, color: 'text-yellow-400' },
            { label: 'Resolved', count: counts.resolved, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl p-2 text-center">
              <p className={`text-xl font-bold font-display ${s.color}`}>{s.count}</p>
              <p className="text-xs text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2 bg-surface rounded-xl px-3 py-2">
            <Search size={16} className="text-ink-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search disputes..."
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface text-ink text-sm rounded-xl px-3 py-2 outline-none"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="under_review">Reviewing</option>
            <option value="resolved_buyer">Buyer Won</option>
            <option value="resolved_seller">Seller Won</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading && <div className="text-center py-8 text-ink-muted">Loading disputes...</div>}

        {filtered.map(d => (
          <div
            key={d.id}
            className="bg-surface rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSelected(d)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                  <p className="text-sm font-medium text-ink truncate">{d.reason}</p>
                </div>
                <p className="text-xs text-ink-muted">
                  {d.buyer?.display_name} vs {d.seller?.display_name}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Order #{d.order_id?.slice(0, 8)} · {formatNaira(d.order?.total_kobo ?? 0)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] ?? ''}`}>
                  {d.status.replace('_', ' ')}
                </span>
                <p className="text-xs text-ink-muted">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {d.resolution_note && (
              <div className="mt-2 p-2 bg-canvas rounded-lg">
                <p className="text-xs text-ink-muted italic">"{d.resolution_note}"</p>
              </div>
            )}

            {d.status === 'open' && (
              <button
                onClick={e => { e.stopPropagation(); void escalate(d.id) }}
                className="mt-2 w-full py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg font-medium"
              >
                Escalate to Review
              </button>
            )}
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-ink font-medium">No disputes found</p>
            <p className="text-ink-muted text-sm">All clear!</p>
          </div>
        )}
      </div>

      {/* Resolution Sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setSelected(null)}>
          <div className="w-full bg-surface rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
            <h3 className="font-display font-bold text-lg text-ink">Resolve Dispute</h3>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-canvas rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">Buyer</p>
                <p className="text-sm font-medium text-ink">{selected.buyer?.display_name}</p>
                <p className="text-xs text-ink-muted">{selected.buyer?.phone}</p>
              </div>
              <div className="bg-canvas rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">Seller</p>
                <p className="text-sm font-medium text-ink">{selected.seller?.display_name}</p>
                <p className="text-xs text-ink-muted">{selected.seller?.phone}</p>
              </div>
            </div>

            {/* Issue */}
            <div className="bg-canvas rounded-xl p-3">
              <p className="text-xs text-ink-muted mb-1">Issue</p>
              <p className="text-sm text-ink">{selected.reason}</p>
            </div>

            {/* Chat recovery link */}
            <button
              onClick={() => void navigate(`/inbox/${selected.order_id}`)}
              className="w-full flex items-center justify-between bg-brand-500/10 text-brand-500 rounded-xl px-4 py-3"
            >
              <span className="text-sm font-medium">View Order Chat</span>
              <MessageSquare size={16} />
            </button>

            {/* Resolution note */}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Resolution note (required)..."
              rows={3}
              className="w-full bg-canvas text-ink text-sm rounded-xl p-3 outline-none placeholder:text-ink-muted resize-none border border-white/10 focus:border-brand-500"
            />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void resolve(selected.id, 'resolved_buyer')}
                disabled={!note || resolving}
                className="py-3 bg-blue-500/20 text-blue-400 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Refund Buyer
              </button>
              <button
                onClick={() => void resolve(selected.id, 'resolved_seller')}
                disabled={!note || resolving}
                className="py-3 bg-green-500/20 text-green-400 rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Release to Seller
              </button>
            </div>
            <button
              onClick={() => void resolve(selected.id, 'closed')}
              disabled={!note || resolving}
              className="w-full py-3 bg-surface border border-white/10 text-ink-muted rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              Close Without Action
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
