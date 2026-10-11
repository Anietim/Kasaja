import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Eye, Store, Bike, RefreshCw, Search, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Application {
  id: string
  user_id: string
  type: 'seller' | 'rider'
  status: string
  full_name: string
  phone: string
  state: string
  city: string
  id_type: string
  id_number: string
  id_document_url: string | null
  selfie_url: string | null
  store_name: string | null
  store_address: string | null
  business_type: string | null
  cac_number: string | null
  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  plate_number: string | null
  vehicle_document_url: string | null
  guarantor_name: string | null
  guarantor_phone: string | null
  payment_ref: string | null
  payment_amount: number | null
  payment_confirmed: boolean
  rejection_reason: string | null
  admin_notes: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  payment_pending: '#F59E0B',
  under_review: '#06B6D4',
  approved: '#10B981',
  rejected: '#EF4444',
}

const NOW = Date.now()
function timeAgo(iso: string) {
  const d = Math.floor((NOW - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

const DEV_APPS: Application[] = [
  { id: 'app-1', user_id: 'u1', type: 'seller', status: 'pending', full_name: 'Adaeze Okonkwo', phone: '08012345678', state: 'Lagos', city: 'Ikeja', id_type: 'nin', id_number: '12345678901', id_document_url: null, selfie_url: null, store_name: 'Adaeze Fabrics', store_address: '12 Allen Ave, Ikeja', business_type: 'Sole Proprietor', cac_number: 'RC123456', vehicle_type: null, vehicle_make: null, vehicle_model: null, plate_number: null, vehicle_document_url: null, guarantor_name: null, guarantor_phone: null, payment_ref: 'PAY_ref001', payment_amount: 5000, payment_confirmed: true, rejection_reason: null, admin_notes: null, created_at: new Date(NOW - 86400000).toISOString() },
  { id: 'app-2', user_id: 'u2', type: 'rider', status: 'under_review', full_name: 'Emeka Nwosu', phone: '08087654321', state: 'Rivers', city: 'Port Harcourt', id_type: 'drivers_license', id_number: 'DL9876543', id_document_url: null, selfie_url: null, store_name: null, store_address: null, business_type: null, cac_number: null, vehicle_type: 'motorcycle', vehicle_make: 'Honda', vehicle_model: 'CB150R', plate_number: 'RSH-123-AA', vehicle_document_url: null, guarantor_name: 'Chidi Nwosu', guarantor_phone: '08033334444', payment_ref: 'PAY_ref002', payment_amount: 3000, payment_confirmed: true, rejection_reason: null, admin_notes: 'Documents look clear', created_at: new Date(NOW - 86400000 * 2).toISOString() },
  { id: 'app-3', user_id: 'u3', type: 'seller', status: 'payment_pending', full_name: 'Fatima Aliyu', phone: '08055556666', state: 'Kano', city: 'Fagge', id_type: 'nin', id_number: '98765432101', id_document_url: null, selfie_url: null, store_name: 'Fatima Abayas', store_address: 'Kantin Kwari Market', business_type: 'Sole Proprietor', cac_number: null, vehicle_type: null, vehicle_make: null, vehicle_model: null, plate_number: null, vehicle_document_url: null, guarantor_name: null, guarantor_phone: null, payment_ref: null, payment_amount: null, payment_confirmed: false, rejection_reason: null, admin_notes: null, created_at: new Date(NOW - 86400000 * 3).toISOString() },
  { id: 'app-4', user_id: 'u4', type: 'rider', status: 'approved', full_name: 'Tunde Bakare', phone: '08077778888', state: 'Oyo', city: 'Ibadan', id_type: 'voters_card', id_number: 'VC44444444', id_document_url: null, selfie_url: null, store_name: null, store_address: null, business_type: null, cac_number: null, vehicle_type: 'car', vehicle_make: 'Toyota', vehicle_model: 'Corolla', plate_number: 'OY-456-BB', vehicle_document_url: null, guarantor_name: 'Ayo Bakare', guarantor_phone: '08011112222', payment_ref: 'PAY_ref004', payment_amount: 3000, payment_confirmed: true, rejection_reason: null, admin_notes: 'All clear', created_at: new Date(NOW - 86400000 * 5).toISOString() },
]

export default function AdminVerifications() {
  const navigate = useNavigate()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('pending')
  const [typeFilter, setTypeFilter] = useState<'all' | 'seller' | 'rider'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    if (import.meta.env.DEV) {
      setApps(DEV_APPS)
      setLoading(false)
      return
    }
    const { data } = await supabase.from('verification_applications').select('*').order('created_at', { ascending: false })
    setApps((data ?? []) as Application[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const approve = async (app: Application) => {
    const { error } = await supabase.from('verification_applications').update({
      status: 'approved',
      payment_confirmed: true,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes[app.id] ?? null,
    }).eq('id', app.id)
    if (error) { toast.error('Failed to approve'); return }
    await supabase.from('profiles').update({
      [`${app.type}_verified`]: true,
      is_verified: true,
      verification_status: 'verified',
    }).eq('id', app.user_id)
    await supabase.from('notifications').insert({
      user_id: app.user_id,
      type: 'verification_approved',
      title: `${app.type === 'seller' ? 'Seller' : 'Rider'} Verification Approved!`,
      body: `Congratulations ${app.full_name}! Your ${app.type} verification has been approved. You now have a verified badge on your profile.`,
      data: { type: app.type },
    })
    toast.success(`${app.full_name} approved as ${app.type}`)
    void load()
  }

  const reject = async (app: Application) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return }
    const { error } = await supabase.from('verification_applications').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', app.id)
    if (error) { toast.error('Failed to reject'); return }
    await supabase.from('notifications').insert({
      user_id: app.user_id,
      type: 'verification_rejected',
      title: 'Verification Not Approved',
      body: `Your ${app.type} verification was not approved. Reason: ${rejectReason}. You may re-apply after addressing the issues.`,
      data: { type: app.type, reason: rejectReason },
    })
    toast.success('Application rejected')
    setRejecting(null)
    setRejectReason('')
    void load()
  }

  const markUnderReview = async (id: string) => {
    await supabase.from('verification_applications').update({ status: 'under_review' }).eq('id', id)
    toast.success('Marked as under review')
    void load()
  }

  const filtered = apps.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) && !(a.store_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    pending: apps.filter(a => a.status === 'pending' || a.status === 'payment_pending').length,
    under_review: apps.filter(a => a.status === 'under_review').length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => void navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">Verifications</h1>
          <p className="text-xs text-white/40">{counts.pending} pending review</p>
        </div>
        <button onClick={() => void load()} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <RefreshCw size={15} className={`text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Pending', count: counts.pending, color: '#F59E0B' },
            { label: 'Review', count: counts.under_review, color: '#06B6D4' },
            { label: 'Approved', count: counts.approved, color: '#10B981' },
            { label: 'Rejected', count: counts.rejected, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-2xl text-center" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 rounded-2xl" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants..." className="flex-1 py-3 bg-transparent text-white text-sm outline-none" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={{ background: filter === s ? STATUS_COLOR[s] ?? '#7C3AED' : 'rgba(255,255,255,0.06)', color: filter === s ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              {s.replace('_', ' ')}
            </button>
          ))}
          <div className="h-6 w-px mx-1 self-center" style={{ background: 'rgba(255,255,255,0.1)' }} />
          {(['all', 'seller', 'rider'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1" style={{ background: typeFilter === t ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)', color: typeFilter === t ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>
              {t === 'seller' ? <Store size={10} /> : t === 'rider' ? <Bike size={10} /> : null}
              {t}
            </button>
          ))}
        </div>

        {/* Applications */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#11151A' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No applications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => (
              <div key={app.id} className="rounded-2xl overflow-hidden" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Card header */}
                <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpanded(expanded === app.id ? null : app.id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: app.type === 'seller' ? 'rgba(124,58,237,0.3)' : 'rgba(6,182,212,0.3)' }}>
                    {app.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{app.full_name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: app.type === 'seller' ? 'rgba(124,58,237,0.2)' : 'rgba(6,182,212,0.2)', color: app.type === 'seller' ? '#a78bfa' : '#06B6D4' }}>
                        {app.type === 'seller' ? <><Store size={9} className="inline mr-1" />Seller</> : <><Bike size={9} className="inline mr-1" />Rider</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[app.status]}20`, color: STATUS_COLOR[app.status] }}>
                        {app.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-white/30">{timeAgo(app.created_at)}</span>
                      {app.payment_confirmed && <span className="text-xs text-emerald-400">₦{(app.payment_amount ?? 0).toLocaleString()} paid</span>}
                    </div>
                  </div>
                  {expanded === app.id ? <ChevronUp size={16} className="text-white/30 shrink-0" /> : <ChevronDown size={16} className="text-white/30 shrink-0" />}
                </button>

                {/* Expanded detail */}
                {expanded === app.id && (
                  <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      {[
                        { label: 'Phone', value: app.phone },
                        { label: 'Location', value: `${app.city}, ${app.state}` },
                        { label: 'ID Type', value: app.id_type.replace('_', ' ').toUpperCase() },
                        { label: 'ID Number', value: app.id_number },
                        ...(app.type === 'seller' ? [
                          { label: 'Store', value: app.store_name ?? 'N/A' },
                          { label: 'Business Type', value: app.business_type ?? 'N/A' },
                          { label: 'CAC', value: app.cac_number ?? 'Not provided' },
                        ] : [
                          { label: 'Vehicle', value: `${app.vehicle_make ?? ''} ${app.vehicle_model ?? ''}`.trim() || 'N/A' },
                          { label: 'Plate', value: app.plate_number ?? 'N/A' },
                          { label: 'Guarantor', value: app.guarantor_name ?? 'N/A' },
                        ]),
                      ].map(row => (
                        <div key={row.label} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-xs text-white/35">{row.label}</p>
                          <p className="text-xs text-white font-medium mt-0.5">{row.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Document images */}
                    {(app.id_document_url || app.selfie_url) && (
                      <div className="flex gap-2">
                        {app.id_document_url && <img src={app.id_document_url} alt="ID" className="flex-1 h-24 object-cover rounded-xl" />}
                        {app.selfie_url && <img src={app.selfie_url} alt="Selfie" className="flex-1 h-24 object-cover rounded-xl" />}
                      </div>
                    )}

                    {/* Admin notes */}
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Admin notes (optional)</label>
                      <textarea value={notes[app.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))} rows={2} placeholder="Add notes about this application..." className="w-full px-3 py-2 rounded-xl text-white text-xs outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>

                    {/* Rejection form */}
                    {rejecting === app.id && (
                      <div className="space-y-2">
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="Reason for rejection (shown to applicant)..." className="w-full px-3 py-2 rounded-xl text-white text-xs outline-none resize-none" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }} />
                        <div className="flex gap-2">
                          <button onClick={() => void reject(app)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#EF4444' }}>Confirm Reject</button>
                          <button onClick={() => { setRejecting(null); setRejectReason('') }} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/60" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {app.status !== 'approved' && app.status !== 'rejected' && rejecting !== app.id && (
                      <div className="flex gap-2">
                        {app.status === 'pending' || app.status === 'payment_pending' ? (
                          <button onClick={() => void markUnderReview(app.id)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}>
                            <Eye size={12} /> Mark Under Review
                          </button>
                        ) : null}
                        <button onClick={() => void approve(app)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 text-white" style={{ background: 'linear-gradient(135deg,#10B981,#06B6D4)' }}>
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => setRejecting(app.id)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}

                    {app.status === 'approved' && (
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-sm text-emerald-400 font-medium">Approved — badge issued</span>
                      </div>
                    )}

                    {app.status === 'rejected' && (
                      <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p className="text-xs text-red-400 font-medium">Rejected</p>
                        <p className="text-xs text-white/50 mt-1">{app.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
