import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, MessageCircle, ShoppingBag, Truck, Users, Tag, Zap, CreditCard, AlertCircle } from 'lucide-react'
import { useNotifications, AppNotification } from '@/hooks/useNotifications'

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ReactNode; color: string }> = {
  message:     { icon: <MessageCircle size={16} />, color: 'text-blue-400 bg-blue-400/10' },
  order:       { icon: <ShoppingBag size={16} />,  color: 'text-purple-400 bg-purple-400/10' },
  delivery:    { icon: <Truck size={16} />,         color: 'text-orange-400 bg-orange-400/10' },
  group_reply: { icon: <Users size={16} />,         color: 'text-green-400 bg-green-400/10' },
  price_offer: { icon: <Tag size={16} />,           color: 'text-yellow-400 bg-yellow-400/10' },
  bid:         { icon: <Zap size={16} />,           color: 'text-brand-400 bg-brand-400/10' },
  payment:     { icon: <CreditCard size={16} />,    color: 'text-emerald-400 bg-emerald-400/10' },
  system:      { icon: <AlertCircle size={16} />,   color: 'text-muted bg-white/5' },
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function NotificationCenter({ open, onClose }: Props) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteNotification } = useNotifications()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  const handleTap = (n: AppNotification) => {
    void markRead(n.id)
    if (n.link) { onClose(); void navigate(n.link) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        ref={panelRef}
        className="w-full max-w-sm h-full bg-surface flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.22s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-400" />
            <h2 className="text-white font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-muted hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Request browser notifications */}
        {typeof window !== 'undefined' && Notification.permission === 'default' && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between gap-2">
            <p className="text-xs text-brand-300">Enable push notifications to stay updated</p>
            <button
              onClick={() => void Notification.requestPermission()}
              className="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/8 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
              <Bell size={40} className="opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {/* Unread section */}
              {notifications.filter(n => !n.read).length > 0 && (
                <div>
                  <p className="text-[11px] text-muted font-semibold uppercase tracking-wider px-4 pt-4 pb-2">New</p>
                  {notifications.filter(n => !n.read).map(n => (
                    <NotificationItem key={n.id} n={n} onTap={handleTap} onDelete={(id) => void deleteNotification(id)} />
                  ))}
                </div>
              )}
              {/* Read section */}
              {notifications.filter(n => n.read).length > 0 && (
                <div>
                  <p className="text-[11px] text-muted font-semibold uppercase tracking-wider px-4 pt-4 pb-2">Earlier</p>
                  {notifications.filter(n => n.read).map(n => (
                    <NotificationItem key={n.id} n={n} onTap={handleTap} onDelete={(id) => void deleteNotification(id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

function NotificationItem({
  n,
  onTap,
  onDelete,
}: {
  n: AppNotification
  onTap: (n: AppNotification) => void
  onDelete: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[n.type]
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/4 relative ${!n.read ? 'bg-brand-500/5' : ''}`}
      onClick={() => onTap(n)}
    >
      {/* Unread dot */}
      {!n.read && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500" />}
            {/* Sender photo, or the type icon if there is none */}
      {n.avatar ? (
        <img src={n.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
          {cfg.icon}
        </div>
      )}
      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-sm font-medium leading-snug ${n.read ? 'text-muted' : 'text-white'}`}>{n.title}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
        <p className="text-[10px] text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); void onDelete(n.id) }}
        className="absolute right-3 top-3 text-muted/40 hover:text-muted p-1 rounded-full hover:bg-white/8 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: undefined }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '')}
      >
        <X size={12} />
      </button>
    </div>
  )
}
