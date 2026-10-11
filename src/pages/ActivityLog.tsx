import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Shield, LogIn, LogOut, Fingerprint,
  CreditCard, AlertTriangle, User, Key, Phone, Trash2
} from 'lucide-react'
import { getActivityLog, clearActivityLog, type ActivityEvent, type ActivityEventType } from '../lib/security'

const ICON_MAP: Record<ActivityEventType, typeof Shield> = {
  login:                LogIn,
  logout:               LogOut,
  pin_set:              Key,
  pin_failed:           AlertTriangle,
  biometric_registered: Fingerprint,
  biometric_login:      Fingerprint,
  bank_account_added:   CreditCard,
  bank_account_changed: CreditCard,
  withdrawal_requested: CreditCard,
  password_changed:     Key,
  email_changed:        User,
  profile_updated:      User,
  otp_sent:             Phone,
  suspicious_login:     AlertTriangle,
}

const COLOR_MAP: Record<ActivityEventType, string> = {
  login:                'text-green-400 bg-green-400/10',
  logout:               'text-white/40 bg-white/5',
  pin_set:              'text-blue-400 bg-blue-400/10',
  pin_failed:           'text-red-400 bg-red-400/10',
  biometric_registered: 'text-indigo-400 bg-indigo-400/10',
  biometric_login:      'text-indigo-400 bg-indigo-400/10',
  bank_account_added:   'text-orange-400 bg-orange-400/10',
  bank_account_changed: 'text-orange-400 bg-orange-400/10',
  withdrawal_requested: 'text-yellow-400 bg-yellow-400/10',
  password_changed:     'text-purple-400 bg-purple-400/10',
  email_changed:        'text-purple-400 bg-purple-400/10',
  profile_updated:      'text-white/60 bg-white/5',
  otp_sent:             'text-blue-400 bg-blue-400/10',
  suspicious_login:     'text-red-500 bg-red-500/10',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Seed some dev events if log is empty
function seedDevEvents(): ActivityEvent[] {
  const now = Date.now()
  return [
    { id: '1', type: 'login',                label: 'Signed in',                device: 'iPhone 14', browser: 'Safari',  timestamp: now - 2 * 60 * 1000,      suspicious: false },
    { id: '2', type: 'biometric_login',       label: 'Signed in with biometrics', device: 'iPhone 14', browser: 'Safari',  timestamp: now - 5 * 60 * 1000,      suspicious: false },
    { id: '3', type: 'bank_account_added',    label: 'Bank account added',        device: 'iPhone 14', browser: 'Safari',  timestamp: now - 30 * 60 * 1000,     suspicious: false },
    { id: '4', type: 'withdrawal_requested',  label: 'Withdrawal requested',      device: 'iPhone 14', browser: 'Safari',  timestamp: now - 2 * 60 * 60 * 1000, suspicious: false },
    { id: '5', type: 'suspicious_login',      label: '⚠️ Suspicious login detected', device: 'Unknown Android', browser: 'Chrome', timestamp: now - 3 * 60 * 60 * 1000, suspicious: true },
    { id: '6', type: 'pin_failed',            label: 'Wrong PIN entered',         device: 'Unknown Android', browser: 'Chrome', timestamp: now - 3 * 60 * 60 * 1000 + 30000, suspicious: true },
    { id: '7', type: 'pin_set',               label: 'Transaction PIN set',       device: 'iPhone 14', browser: 'Safari',  timestamp: now - 6 * 60 * 60 * 1000, suspicious: false },
    { id: '8', type: 'login',                 label: 'Signed in',                 device: 'Windows PC', browser: 'Chrome', timestamp: now - 24 * 60 * 60 * 1000, suspicious: false },
    { id: '9', type: 'profile_updated',       label: 'Profile updated',           device: 'Windows PC', browser: 'Chrome', timestamp: now - 25 * 60 * 60 * 1000, suspicious: false },
    { id: '10', type: 'otp_sent',             label: 'OTP sent',                  device: 'iPhone 14', browser: 'Safari',  timestamp: now - 48 * 60 * 60 * 1000, suspicious: false },
  ]
}

export default function ActivityLog() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [filter, setFilter] = useState<'all' | 'suspicious'>('all')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    const log = getActivityLog()
    setEvents(log.length > 0 ? log : seedDevEvents())
  }, [])

  const filtered = filter === 'suspicious'
    ? events.filter(e => e.suspicious)
    : events

  const suspiciousCount = events.filter(e => e.suspicious).length
  const [thisWeekCount] = useState(() => {
    const cutoff = Date.now() - 7 * 86400000
    return events.filter(e => e.timestamp > cutoff).length
  })

  const handleClear = () => {
    clearActivityLog()
    setEvents([])
    setShowClearConfirm(false)
  }

  return (
    <div className="min-h-screen bg-[#080A0D] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080A0D]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { void navigate(-1) }} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold">Account Activity</h1>
          <p className="text-xs text-white/40">Login history and security events</p>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Suspicious alert */}
        {suspiciousCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4 flex gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">{suspiciousCount} suspicious {suspiciousCount === 1 ? 'event' : 'events'} detected</p>
              <p className="text-white/50 text-xs mt-0.5">If you don't recognise these activities, change your PIN immediately and contact support.</p>
              <button
                onClick={() => setFilter('suspicious')}
                className="text-red-400 text-xs font-medium mt-2 underline"
              >
                View suspicious events
              </button>
            </div>
          </motion.div>
        )}

        {/* Security summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total events', value: events.length, color: 'text-white' },
            { label: 'This week', value: thisWeekCount, color: 'text-orange-400' },
            { label: 'Suspicious', value: suspiciousCount, color: suspiciousCount > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#11151A] rounded-2xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'suspicious'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'All Events' : `Suspicious (${suspiciousCount})`}
            </button>
          ))}
        </div>

        {/* Events list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-semibold">No events yet</p>
            <p className="text-white/40 text-sm mt-1">Your activity log will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event, i) => {
              const Icon = ICON_MAP[event.type] ?? Shield
              const colorClass = COLOR_MAP[event.type] ?? 'text-white/40 bg-white/5'
              const [textColor, bgColor] = colorClass.split(' ')
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-[#11151A] rounded-2xl p-4 flex gap-3 ${event.suspicious ? 'border border-red-500/20' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{event.label}</p>
                      {event.suspicious && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Suspicious</span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{event.device} · {event.browser}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-white/30 text-xs">{timeAgo(event.timestamp)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Clear confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="bg-[#11151A] rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Clear activity log?</h3>
            <p className="text-white/50 text-sm mb-5">This removes the local copy. Events saved in Supabase are kept.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-2xl bg-white/5 text-white font-medium">Cancel</button>
              <button onClick={handleClear} className="flex-1 py-3 rounded-2xl bg-red-500/20 text-red-400 font-medium">Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
