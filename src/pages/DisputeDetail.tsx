import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Send, Shield, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed'

interface DisputeEvent {
  id: string
  type: 'message' | 'evidence' | 'status' | 'admin'
  author: string
  role: 'buyer' | 'seller' | 'admin'
  content: string
  timestamp: string
  evidence_url?: string
}

const MOCK_EVENTS: DisputeEvent[] = [
  { id: '1', type: 'status', author: 'System', role: 'admin', content: 'Dispute opened. Escrow is frozen pending resolution.', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '2', type: 'message', author: 'Amaka (Buyer)', role: 'buyer', content: 'I paid ₦45,000 for a Samsung Galaxy S21 but received a completely different phone. The package was tampered with.', timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString() },
  { id: '3', type: 'evidence', author: 'Amaka (Buyer)', role: 'buyer', content: 'Photo of received item vs product listing', timestamp: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(), evidence_url: 'https://picsum.photos/seed/dispute1/400/300' },
  { id: '4', type: 'message', author: 'TechKing Store (Seller)', role: 'seller', content: 'I shipped the correct item with tracking number KSJ-123456. The photo shows my original packaging.', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', type: 'admin', author: 'KASAJA Admin', role: 'admin', content: 'Both parties have been heard. We are reviewing tracking records and delivery confirmation.', timestamp: new Date(Date.now() - 3600000 * 12).toISOString() },
]

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  open: { label: 'Open', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: AlertTriangle },
  under_review: { label: 'Under Review', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', icon: Clock },
  resolved_buyer: { label: 'Resolved — Buyer Refunded', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  resolved_seller: { label: 'Resolved — Seller Paid', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  closed: { label: 'Closed', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.08)', icon: XCircle },
}

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function DisputeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [events, setEvents] = useState<DisputeEvent[]>(MOCK_EVENTS)
  const [message, setMessage] = useState('')
  const [status] = useState<DisputeStatus>('under_review')
  const [uploading, setUploading] = useState(false)

  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon

  function sendMessage() {
    if (!message.trim()) return
    const newEvent: DisputeEvent = {
      id: Date.now().toString(),
      type: 'message',
      author: 'You',
      role: 'buyer',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }
    setEvents(prev => [...prev, newEvent])
    setMessage('')
    toast.success('Message sent to admin')
  }

  function uploadEvidence() {
    setUploading(true)
    setTimeout(() => {
      const newEvent: DisputeEvent = {
        id: Date.now().toString(),
        type: 'evidence',
        author: 'You',
        role: 'buyer',
        content: 'Evidence photo uploaded',
        timestamp: new Date().toISOString(),
        evidence_url: `https://picsum.photos/seed/${Date.now()}/400/300`,
      }
      setEvents(prev => [...prev, newEvent])
      setUploading(false)
      toast.success('Evidence uploaded')
    }, 1500)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => void navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-white text-base" style={{ fontFamily: 'Space Grotesk,sans-serif' }}>
            Dispute #{(id ?? '').slice(0, 8).toUpperCase()}
          </h1>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: cfg.bg, color: cfg.color }}>
            <StatusIcon size={11} />
            {cfg.label}
          </span>
        </div>
        <Shield size={20} style={{ color: '#7C3AED' }} />
      </div>

      {/* Order summary */}
      <div className="mx-4 mt-4 p-4 rounded-2xl" style={{ background: '#11151A' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Order Summary</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            Escrow Frozen
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Samsung Galaxy S21</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>TechKing Store · 2 days ago</p>
          </div>
          <p className="text-white font-bold">₦45,000</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-32">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Dispute Timeline
        </p>
        {events.map((ev, i) => (
          <motion.div key={ev.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}>

            {ev.type === 'status' || ev.type === 'admin' ? (
              /* System/Admin messages — centered */
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <span className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ background: ev.type === 'admin' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.07)', color: ev.type === 'admin' ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                  {ev.type === 'admin' && <Shield size={10} />}
                  {ev.content}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            ) : (
              /* Chat bubble */
              <div className={`flex gap-2 ${ev.author === 'You' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                  style={{
                    background: ev.role === 'buyer' ? 'rgba(124,58,237,0.25)' : 'rgba(16,185,129,0.25)',
                    color: ev.role === 'buyer' ? '#a78bfa' : '#6ee7b7',
                  }}>
                  {ev.author[0]}
                </div>
                <div className={`max-w-[75%] ${ev.author === 'You' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {ev.author} · {timeAgo(ev.timestamp)}
                  </span>
                  {ev.evidence_url ? (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#11151A' }}>
                      <img src={ev.evidence_url} alt="evidence" className="w-full max-w-[200px] object-cover" />
                      <p className="text-xs p-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{ev.content}</p>
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-2xl text-sm"
                      style={{
                        background: ev.author === 'You' ? 'rgba(124,58,237,0.25)' : '#11151A',
                        color: 'white',
                        borderRadius: ev.author === 'You' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      }}>
                      {ev.content}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t p-3"
        style={{ background: 'rgba(8,10,13,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <button onClick={uploadEvidence} disabled={uploading}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#11151A' }}>
            {uploading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : <Upload size={16} style={{ color: '#7C3AED' }} />
            }
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2"
            style={{ background: '#11151A' }}>
            <MessageSquare size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Add a message or evidence..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            />
          </div>
          <button onClick={sendMessage} disabled={!message.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: message.trim() ? 'linear-gradient(135deg,#7C3AED,#06B6D4)' : '#11151A' }}>
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          All messages are reviewed by KASAJA admin · Escrow of ₦45,000 is frozen
        </p>
      </div>
    </div>
  )
}
