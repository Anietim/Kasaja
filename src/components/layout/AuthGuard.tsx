/**
 * AuthGuard — wraps all protected routes.
 * DEV: always passes through + shows a persistent role switcher pill.
 *      devRole is stored in localStorage so it survives route changes.
 * PROD: redirects unauthenticated users to /login.
 */
import { createContext, useContext, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ChevronDown, X } from 'lucide-react'

const DEV = import.meta.env.DEV
const LS_KEY = 'kasaja_dev_role'

const ROLES = [
  { label: 'Buyer',       value: 'buyer',       color: 'bg-blue-600'   },
  { label: 'Seller',      value: 'seller',      color: 'bg-green-600'  },
  { label: 'Rider',       value: 'rider',       color: 'bg-yellow-600' },
  { label: 'Admin',       value: 'admin',       color: 'bg-red-600'    },
  { label: 'Super Admin', value: 'super_admin', color: 'bg-purple-600' },
] as const

export type DevRole = (typeof ROLES)[number]['value']

function getSavedRole(): DevRole {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved && ROLES.some(r => r.value === saved)) return saved as DevRole
  } catch { /* ignore */ }
  return 'buyer'
}

/* ── Role context ─────────────────────────────────────────────────── */
const RoleCtx = createContext<DevRole>('buyer')
export function useDevRole() { return useContext(RoleCtx) }

/* ── Guard ────────────────────────────────────────────────────────── */
export default function AuthGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()
  // Read from localStorage so role persists across route changes
  const [devRole, setDevRole] = useState<DevRole>(getSavedRole)
  const [open, setOpen] = useState(false)

  // In DEV mode, loading is always false (useAuth returns immediately)
  // In PROD, show spinner while session is being checked
  if (!DEV && loading) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Production only — redirect if not logged in
  if (!DEV && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const activeRole = ROLES.find(r => r.value === devRole)!

  function switchRole(role: DevRole) {
    try { localStorage.setItem(LS_KEY, role) } catch { /* ignore */ }
    setDevRole(role)
    setOpen(false)
  }

  return (
    <RoleCtx.Provider value={devRole}>
      <Outlet />

      {/* Dev role switcher — visible only in development */}
      {DEV && (
        <div className="fixed bottom-24 right-3 z-[999] flex flex-col items-end gap-2">
          {open && (
            <div className="bg-surface-1 border border-white/10 rounded-2xl shadow-2xl p-3 w-52 flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-xs font-semibold text-ink-subtle">Preview as role</span>
                <button onClick={() => setOpen(false)} className="text-ink-subtle hover:text-white p-1">
                  <X size={14} />
                </button>
              </div>
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => switchRole(r.value)}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left',
                    devRole === r.value
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-muted hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.color}`} />
                  {r.label}
                  {devRole === r.value && <span className="ml-auto text-[10px] opacity-70">active</span>}
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-white/10 px-1">
                <p className="text-[10px] text-ink-subtle">Role saved across page navigations</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setOpen(v => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white shadow-xl',
              activeRole.color,
              'opacity-90 hover:opacity-100 active:scale-95 transition-all',
            ].join(' ')}
          >
            {activeRole.label}
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </RoleCtx.Provider>
  )
}
