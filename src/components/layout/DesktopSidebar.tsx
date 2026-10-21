import { NavLink, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { KasajaK } from '@/components/layout/KasajaLogo'
import { SECTIONS, ROLE_NAMES } from '@/components/layout/NavDrawer'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { initials } from '@/lib/utils'

/**
 * The whole user menu, pinned on the left of wide screens (1024px and up).
 * Same items and role rules as the slide-out menu used on phones.
 */
export default function DesktopSidebar() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const unread = useUnreadMessages()

  const roles: string[] = profile?.roles ?? []
  const isAdmin = roles.some(r => ['admin', 'investigation_admin', 'super_admin'].includes(r))
  const canSee = (title: string) =>
      title === 'Seller' ? (roles.includes('seller') || roles.includes('independent'))
    : title === 'Rider' ? roles.includes('rider')
    : title === 'Admin' ? isAdmin
    : true
  const name = profile?.display_name || 'Your Profile'

  return (
    <aside
      className="w-60 shrink-0 h-full flex flex-col"
      style={{ background: '#09070B', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Logo */}
      <button onClick={() => void navigate('/home')} className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0" aria-label="KASAJA home">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-black" style={{ border: '1px solid rgba(255,106,19,0.4)' }}>
          <KasajaK size={22} />
        </span>
        <span className="text-white font-extrabold tracking-[0.18em] text-[15px]">KASAJA</span>
      </button>

      {/* Profile */}
      <button
        onClick={() => void navigate('/profile')}
        className="mx-3 mb-3 p-3 rounded-2xl text-left shrink-0"
        style={{ background: '#100D14', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-white overflow-hidden shrink-0"
            style={{ background: 'linear-gradient(135deg,#FF8A3D,#8B5CF6)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : initials(name)}
          </span>
          <span className="min-w-0">
            <span className="block text-white text-sm font-bold truncate">{name}</span>
            <span className="block text-[11px]" style={{ color: '#A59DA8' }}>View profile</span>
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5 mt-2.5">
          {Array.from(new Set(roles.map(r => ROLE_NAMES[r]).filter(Boolean))).map(n => (
            <span key={n} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,138,61,0.14)', color: '#FF9A4D' }}>{n}</span>
          ))}
        </span>
      </button>

      <button
        onClick={() => void navigate('/sell')}
        className="mx-3 mb-2 h-11 rounded-full text-sm font-extrabold text-white flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg,#FF8A3D,#8B5CF6)', boxShadow: '0 8px 24px rgba(139,92,246,0.3)' }}
      >
        <Plus size={16} /> New listing
      </button>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-2 no-scrollbar">
        {SECTIONS.filter(s => canSee(s.title)).map(section => (
          <div key={section.title} className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {section.title}
            </p>
            {section.items.map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path + label}
                to={path}
                end={path === '/home'}
                className="flex items-center gap-3 px-3 h-10 rounded-xl text-[13px] transition-colors hover:bg-white/5"
                style={({ isActive }) => isActive
                  ? { background: 'rgba(255,138,61,0.12)', color: '#FF9A4D', fontWeight: 700 }
                  : { color: '#C9C1CC', fontWeight: 500 }}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {path === '/inbox' && unread > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#FF8A3D,#8B5CF6)' }}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
