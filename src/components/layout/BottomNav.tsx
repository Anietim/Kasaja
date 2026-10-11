import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Map, Plus, MessageSquare, Users } from 'lucide-react'

const TABS = [
  { icon: Home,         label: 'Home',    path: '/home' },
  { icon: Map,          label: 'Markets', path: '/markets' },
  { icon: Plus,         label: 'Sell',    path: '/sell' },
  { icon: Users,        label: 'Groups',  path: '/groups' },
  { icon: MessageSquare,label: 'Inbox',   path: '/inbox' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t safe-area-pb"
      style={{ backgroundColor: 'rgba(8,10,13,0.97)', borderColor: '#1F2933' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ icon: Icon, label, path }) => {
          const active = location.pathname.startsWith(path)
          const isSell = path === '/sell'

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
                    background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 55%, #EC4899 100%)',
                    boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
                  }}
                >
                  <Icon size={24} className="text-white" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon
                      size={22}
                      style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.38)' }}
                    />
                    {/* active dot */}
                    {active && (
                      <span
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: '#7C3AED' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.38)' }}
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
