import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import '@/styles/kasaja-theme.css'

interface Req {
  id: string; user_id: string; full_name: string; phone: string; state: string | null; city: string | null
  id_type: string; id_number: string | null; id_last4: string | null
  selfie_path: string; id_photo_path: string; created_at: string
}

export default function AdminIdChecks() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Req[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('id_verifications').select('*').eq('status', 'reviewing').order('created_at')
    if (error) { toast.error(error.message); setLoading(false); return }
    const list = (data ?? []) as Req[]
    setRows(list)
    const map: Record<string, string> = {}
    for (const r of list) {
      for (const p of [r.selfie_path, r.id_photo_path]) {
        const { data: s } = await supabase.storage.from('kyc').createSignedUrl(p, 900)
        if (s?.signedUrl) map[p] = s.signedUrl
      }
    }
    setUrls(map)
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  async function decide(r: Req, approve: boolean) {
    if (!approve && !(reason[r.id] ?? '').trim()) { toast.error('Write a short reason'); return }
    const { error } = await supabase.rpc('review_id_verification', { p_id: r.id, p_approve: approve, p_reason: approve ? null : reason[r.id] })
    if (error) { toast.error(error.message); return }
    toast.success(approve ? 'Approved: black tick given' : 'Rejected')
    void load()
  }

  return (
    <div className="min-h-dvh pb-20" style={{ background: 'var(--k-bg)', color: 'var(--k-text)' }}>
      <div className="max-w-3xl mx-auto px-5 pt-4">
        <div className="flex items-center gap-2">
          <button onClick={() => void navigate(-1)} aria-label="Back" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full"><ArrowLeft size={20} /></button>
          <h1 className="flex-1 text-xl font-extrabold">ID checks</h1>
          <button onClick={() => void load()} aria-label="Refresh" style={{ color: 'var(--k-muted)' }}><RefreshCw size={18} /></button>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--k-muted)' }}>Compare the selfie with the ID photo, then check the name for the NIN or BVN in your provider dashboard. The number is erased when you decide.</p>

        {loading ? <p className="mt-10 text-sm" style={{ color: 'var(--k-muted)' }}>Loading...</p>
          : rows.length === 0 ? <p className="mt-10 text-sm" style={{ color: 'var(--k-muted)' }}>Nothing waiting.</p>
          : rows.map(r => (
            <div key={r.id} className="mt-4 rounded-2xl p-4" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-extrabold">{r.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--k-muted)' }}>{r.phone} · {[r.city, r.state].filter(Boolean).join(', ')}</p>
              </div>
              <p className="mt-1 text-sm font-mono"><span className="uppercase">{r.id_type}</span> {r.id_number ?? `••••••••${r.id_last4}`}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[['Selfie', r.selfie_path], ['ID photo', r.id_photo_path]].map(([label, p]) => (
                  <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className="block">
                    <p className="text-[11px] mb-1" style={{ color: 'var(--k-muted)' }}>{label}</p>
                    {urls[p] ? <img src={urls[p]} alt={label} className="w-full h-56 object-contain rounded-xl" style={{ background: '#000' }} /> : <div className="h-56 rounded-xl" style={{ background: 'var(--k-surface2)' }} />}
                  </a>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input value={reason[r.id] ?? ''} onChange={e => setReason(s => ({ ...s, [r.id]: e.target.value }))} placeholder="Reason if rejecting"
                  className="flex-1 min-w-[180px] h-10 rounded-xl px-3 text-sm outline-none" style={{ background: 'var(--k-surface2)', border: '1px solid var(--k-line)', color: 'var(--k-text)' }} />
                <button onClick={() => void decide(r, false)} className="h-10 px-4 rounded-xl text-sm font-extrabold flex items-center gap-1.5" style={{ border: '1px solid var(--k-line2)', color: 'var(--k-text)' }}><X size={15} /> Reject</button>
                <button onClick={() => void decide(r, true)} className="h-10 px-4 rounded-xl text-sm font-extrabold flex items-center gap-1.5" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}><Check size={15} /> Approve</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
