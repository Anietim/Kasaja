import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, SlidersHorizontal, Menu, X } from 'lucide-react'
import NavDrawer from './NavDrawer'
import NotificationCenter from '@/components/NotificationCenter'
import { useNotifications } from '@/hooks/useNotifications'

export default function Navbar() {
  const navigate             = useNavigate()
  const { unreadCount }      = useNotifications()
  const [query, setQuery]    = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    void navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
    setQuery('')
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ backgroundColor: 'var(--k-bg, #080A0D)', borderColor: 'var(--k-line, rgba(255,255,255,0.05))' }}
      >
        <div className="flex items-center h-14 px-3 gap-2">

          {/* Left — hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-white/40 hover:text-white transition shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Menu size={22} />
          </button>

          {/* Center — search bar always visible */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search products or stores"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-2xl pl-4 pr-10 py-2 text-sm text-white outline-none transition-all"
                style={{
                  background: 'var(--k-surface, #11151A)',
                  border: '1px solid var(--k-line, rgba(255,255,255,0.1))',
                  fontFamily: 'DM Sans, sans-serif',
                  height: '38px',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--k-accent, #FF7A1A)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--k-line, rgba(255,255,255,0.1))' }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25"
                >
                  <SlidersHorizontal size={14} />
                </button>
              )}
            </div>
          </form>

          {/* Right — bell only */}
          <button
            onClick={() => setNotifsOpen(true)}
            className="relative p-2 text-white/40 hover:text-white transition shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                style={{ background: 'var(--k-accent, #FF7A1A)', color: 'var(--k-on-accent, #1A0B05)' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <NotificationCenter open={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </>
  )
}
