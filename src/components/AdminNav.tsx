import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/id-checks', label: 'ID checks' },
  { to: '/admin/verifications', label: 'Verifications' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/disputes', label: 'Disputes' },
  { to: '/admin/groups', label: 'Groups' },
]
const SUPER = [
  { to: '/admin/staff', label: 'Staff and roles' },
  { to: '/admin/audit', label: 'Audit log' },
]

/** Row of admin sections. Phone: scrolls sideways. Desktop: wraps. */
export default function AdminNav() {
  const { profile } = useAuth()
  const isSuper = (profile?.roles ?? []).includes('super_admin')
  const links = isSuper ? [...LINKS, ...SUPER] : LINKS
  return (
    <nav className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap pb-1 mb-4" aria-label="Admin sections">
      {links.map(l => (
        <NavLink key={l.to} to={l.to} end={l.end}
          className="shrink-0 h-9 px-4 rounded-full text-[13px] font-bold inline-flex items-center"
          style={({ isActive }) => isActive
            ? { background: 'var(--k-accent)', color: 'var(--k-on-accent)' }
            : { border: '1px solid var(--k-line)', color: 'var(--k-muted)', background: 'var(--k-surface)' }}>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
