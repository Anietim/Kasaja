import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Map, Plus, Truck, MessageSquare, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

const BASE = [
  { icon: Home,         label: 'Home',    path: '/home' },
  { icon: Map,          label: 'Markets', path: '/markets' },
  { icon: Plus,         label: 'Sell',    path: '/sell' },
  { icon: Users,        label: 'Groups',  path: '/groups' },
  { icon: MessageSquare,label: 'Inbox',   path: '/inbox' },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const roles: string[] = profile?.roles ?? []
  const canSell = roles.includes('seller') || roles.includes('independent')
  // Sellers list things; everyone else requests a rider
  const TABS = BASE.map(t => t.path === '/sell' && !canSell ? { icon: Truck, label: 'Rider', path: '/request-rider' } : t)
  const unread = useUnreadMessages()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t safe-area-pb"
      style={{ backgroundColor: 'var(--k-bg, #080A0D)', borderColor: 'var(--k-line, #1F2933)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ icon: Icon, label, path }) => {
          const active = location.pathname.startsWith(path)
          const isSell = path === '/sell' || path === '/request-rider'

          return (
            <button
              key={path}
              onClick={() => void navigate(path)}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-0 relative"
            >
              {isSell ? (
                <div
                  className="w-12 h-12 -mt-6 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'var(--k-accent, #FF7A1A)',
                    boxShadow: '0 4px 24px rgba(255,122,26,0.4)',
                  }}
                >
                  <Icon size={24} style={{ color: 'var(--k-on-accent, #1A0B05)' }} />
                </div>
              ) : (
                <>
                  <div className="relative">
                   {path === '/inbox' && unread > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--k-accent, #FF7A1A)', color: 'var(--k-on-accent, #1A0B05)' }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    <Icon
                      size={22}
                      style={{ color: active ? 'var(--k-accent, #FF7A1A)' : 'var(--k-muted, rgba(255,255,255,0.5))' }}
                    />
                    {/* active dot */}
                    {active && (
                      <span
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: 'var(--k-accent, #FF7A1A)' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: active ? 'var(--k-accent, #FF7A1A)' : 'var(--k-muted, rgba(255,255,255,0.5))' }}
                  >
                    {label}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
