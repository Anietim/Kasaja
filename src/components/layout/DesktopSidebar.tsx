import { NavLink, useNavigate } from 'react-router-dom'
import { Plus, Moon, Sun } from 'lucide-react'
import { KasajaK } from '@/components/layout/KasajaLogo'
import { SECTIONS, ROLE_NAMES } from '@/components/layout/NavDrawer'
import { useAuth } from '@/hooks/useAuth'
import { isStaff, staffBlocked, SUPER_ONLY } from '@/lib/staff'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { useTheme } from '@/hooks/useTheme'
import { useNewFeed } from '@/hooks/useNewFeed'
import { initials } from '@/lib/utils'
import { UserTicks } from '@/components/Tick'

/** The whole user menu, pinned on the left of computer screens. Same role rules as the phone menu. */
export default function DesktopSidebar() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const unread = useUnreadMessages()
  const { theme, toggle } = useTheme()
  const newItems = useNewFeed()

  const roles: string[] = profile?.roles ?? []
  const isAdmin = roles.some(r => ['admin', 'investigation_admin', 'super_admin'].includes(r))
  const canSell = !isAdmin && (roles.includes('seller') || roles.includes('independent'))
  const canSee = (title: string) =>
      title === 'Seller' ? canSell
    : title === 'Rider' ? !isAdmin && roles.includes('rider')
    : title === 'Admin' ? isAdmin
    : true
  const name = profile?.display_name || 'Your Profile'

  return (
    <aside className="w-60 shrink-0 h-full flex flex-col" style={{ background: 'var(--k-bg)', borderRight: '1px solid var(--k-line)' }}>
      <button onClick={() => void navigate('/home')} className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0" aria-label="KASAJA home">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-black" style={{ border: '1px solid rgba(255,122,26,0.5)' }}>
          <KasajaK size={22} />
        </span>
        <span className="font-extrabold tracking-[0.18em] text-[15px]" style={{ color: 'var(--k-text)' }}>KASAJA</span>
      </button>

      <button onClick={() => void navigate('/profile')} className="mx-3 mb-3 p-2 rounded-2xl text-left shrink-0 hover:opacity-90">
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold overflow-hidden shrink-0"
            style={{ background: 'var(--k-surface2)', color: 'var(--k-text)' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(name)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--k-text)' }}><span className="truncate">{name}</span><UserTicks userId={profile?.id} size={15} /></span>
            <span className="block text-[11px]" style={{ color: 'var(--k-muted)' }}>
              {Array.from(new Set(roles.map(r => ROLE_NAMES[r]).filter(Boolean))).slice(0, 2).join(' · ') || 'View profile'}
            </span>
          </span>
        </span>
      </button>

      {/* Only sellers and independent shoppers can list things */}
      {canSell && (
        <button
          onClick={() => void navigate('/sell')}
          className="mx-3 mb-2 h-11 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95"
          style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}
        >
          <Plus size={16} /> New listing
        </button>
      )}

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4 pt-1">
        {SECTIONS.filter(s => canSee(s.title) && !(isStaff(roles) && s.title !== 'Admin' && s.items.every(i => staffBlocked(i.path)))).map(section => (
          <div key={section.title} className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 pt-3 pb-1.5" style={{ color: 'var(--k-faint)' }}>{section.title}</p>
            {section.items.filter(i => (!isStaff(roles) || !staffBlocked(i.path)) && (!SUPER_ONLY.includes(i.path) || roles.includes('super_admin'))).map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path + label}
                to={path}
                end={path === '/home'}
                className="flex items-center gap-3 px-3 h-9 rounded-[10px] text-[13px] transition-colors"
                style={({ isActive }) => isActive
                  ? { background: 'var(--k-accent-soft)', color: 'var(--k-accent)', fontWeight: 700 }
                  : { color: 'var(--k-muted)', fontWeight: 500 }}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {path === '/home' && newItems > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center"
                    style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}
                    aria-label={`${newItems} new listings`}>
                    {newItems > 99 ? '99+' : newItems}
                  </span>
                )}
                {path === '/inbox' && unread > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center"
                    style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Dark / light mood */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--k-line)' }}>
        <button
          onClick={toggle}
          className="w-full h-10 rounded-xl flex items-center gap-3 px-3 text-[13px] font-semibold"
          style={{ color: 'var(--k-muted)' }}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  )
}
