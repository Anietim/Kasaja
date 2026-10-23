import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Plus, Moon, Sun, Home, Map, Users, MessageSquare, Package, Store, Bike,
  ShieldAlert, User, PlusCircle, Truck, Wallet, AlertTriangle,
  Search, Settings, TrendingUp, BarChart2, Shield, ShieldCheck, Gift, Video,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isStaff, staffBlocked } from '@/lib/staff'
import { initials } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { UserTicks } from '@/components/Tick'
import '@/styles/kasaja-theme.css'

interface Props {
  open: boolean
  onClose: () => void
}

export const SECTIONS = [
  {
    title: 'Browse',
    items: [
      { icon: Home,          label: 'Home Feed',        path: '/home' },
      { icon: Search,        label: 'Search Products',  path: '/search' },
      { icon: Users,         label: 'Find People',      path: '/people' },
      { icon: TrendingUp,    label: 'Trending',         path: '/trending' },
      { icon: Map,           label: 'Markets',          path: '/markets' },
      { icon: Users,         label: 'Market Groups',    path: '/groups' },
      { icon: MessageSquare, label: 'Messages',         path: '/inbox' },
      { icon: Package,       label: 'My Orders',        path: '/orders' },
      { icon: Truck,       label: 'Request a Rider',  path: '/request-rider' },
    ],
  },
  {
    title: 'Seller',
    items: [
      { icon: Video,       label: 'Go Live',           path: '/live' },
      { icon: Store,       label: 'Store Dashboard',   path: '/store/dashboard' },
      { icon: PlusCircle,  label: 'List a Product',   path: '/sell' },
      { icon: ShieldCheck, label: 'Verify My Store',  path: '/seller-verification' },
    ],
  },
  {
    title: 'Rider',
    items: [
      { icon: Bike,        label: 'Rider Dashboard',  path: '/rider' },
      { icon: Bike,        label: 'Delivery Jobs',    path: '/rider/jobs' },
      { icon: Wallet,      label: 'Wallet',           path: '/wallet' },
      { icon: ShieldCheck, label: 'Get Verified',     path: '/rider-verification' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { icon: BarChart2,    label: 'Analytics',       path: '/admin/analytics' },
      { icon: ShieldAlert,  label: 'Admin Panel',     path: '/admin' },
      { icon: Users,        label: 'User Management', path: '/admin/users' },
      { icon: ShieldCheck,  label: 'Verifications',   path: '/admin/verifications' },
      { icon: ShieldCheck,  label: 'ID Checks',       path: '/admin/id-checks' },
      { icon: Users,        label: 'Manage Groups',   path: '/admin/groups' },
      { icon: AlertTriangle,label: 'Disputes',        path: '/admin/disputes' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: ShieldCheck, label: 'Verify my ID',   path: '/verify-id' },
      { icon: Gift,     label: 'Refer & Earn',      path: '/referral' },
      { icon: Settings, label: 'Settings',         path: '/settings' },
      { icon: Shield,   label: 'Security',         path: '/security-setup' },
      { icon: User,     label: 'Activity Log',     path: '/activity-log' },
    ],
  },
]

export const ROLE_NAMES: Record<string, string> = {
  buyer: 'Buyer', seller: 'Seller', independent: 'Independent Shopper', rider: 'Rider',
  admin: 'Admin', super_admin: 'Admin', investigation_admin: 'Admin',
}

export default function NavDrawer({ open, onClose }: Props) {
  const navigate        = useNavigate()
  const { profile, user } = useAuth()
  const [storeName, setStoreName] = useState<string | null>(null)
  const { theme, toggle } = useTheme()

  // Sellers see their store name; everyone else sees their own name
  useEffect(() => {
    if (import.meta.env.DEV || !user || !profile?.roles?.includes('seller')) {
      setStoreName(null)
      return
    }
    void supabase
      .from('stores')
      .select('name')
      .eq('owner_id', user.id)
      .limit(1)
      .then(({ data }) => setStoreName(data?.[0]?.name ?? null))
  }, [user, profile?.roles])

  const displayTitle = storeName || profile?.display_name || 'Your Profile'
  const roles: string[] = profile?.roles ?? []
  const isAdmin = roles.some(r => ['admin', 'investigation_admin', 'super_admin'].includes(r))
  const canSee = (title: string) =>
      title === 'Seller' ? !isAdmin && (roles.includes('seller') || roles.includes('independent'))
    : title === 'Rider' ? !isAdmin && roles.includes('rider')
    : title === 'Admin' ? isAdmin
    : true

  const go = (path: string) => {
    onClose()
    void navigate(path)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[19.5rem] max-w-[88vw] flex flex-col"
            style={{ background: 'var(--k-bg)', borderRight: '1px solid var(--k-line)' }}
          >
            {/* Logo + close */}
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3 shrink-0">
              <img src="/logo-mark.svg" alt="" className="w-9 h-9 rounded-[10px]" />
              <span className="font-extrabold tracking-[0.18em] text-sm flex-1" style={{ color: 'var(--k-text)' }}>KASAJA</span>
              <button onClick={onClose} aria-label="Close menu" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--k-surface2)', color: 'var(--k-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Profile */}
            <button onClick={() => go('/profile')} className="mx-3 mb-2 p-2 rounded-2xl text-left flex items-center gap-3 shrink-0">
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 overflow-hidden"
                style={{ background: 'var(--k-surface2)', color: 'var(--k-text)' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initials(profile?.display_name || 'U')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--k-text)' }}><span className="truncate">{displayTitle}</span><UserTicks userId={profile?.id} size={15} /></span>
                <span className="block text-xs truncate" style={{ color: 'var(--k-muted)' }}>
                  {Array.from(new Set(roles.map(r => ROLE_NAMES[r]).filter(Boolean))).slice(0, 2).join(' · ') || 'View profile'}
                </span>
              </span>
            </button>

            {!isStaff(roles) && (roles.includes('seller') || roles.includes('independent')) && (
              <button onClick={() => go('/sell')} className="mx-4 mb-2 h-11 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
                <Plus size={16} /> New listing
              </button>
            )}

            {/* Nav sections */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2.5 pb-3">
              {SECTIONS.filter(s => canSee(s.title) && !(isStaff(roles) && s.title !== 'Admin' && s.items.every(i => staffBlocked(i.path)))).map(section => (
                <div key={section.title} className="mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 pt-3 pb-1.5" style={{ color: 'var(--k-faint)' }}>
                    {section.title}
                  </p>
                  {section.items.filter(i => !isStaff(roles) || !staffBlocked(i.path)).map(({ icon: Icon, label, path }) => {
                    const on = path === '/home' && window.location.pathname.startsWith('/home')
                    return (
                      <button
                        key={path + label}
                        onClick={() => go(path)}
                        className="w-full flex items-center gap-3.5 px-3 h-11 rounded-[10px] text-left text-sm"
                        style={on
                          ? { background: 'var(--k-accent-soft)', color: 'var(--k-accent)', fontWeight: 700 }
                          : { color: 'var(--k-muted)', fontWeight: 500 }}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Dark / light mood */}
            <div className="shrink-0 px-4 py-3 pb-5 flex items-center justify-between" style={{ borderTop: '1px solid var(--k-line)' }}>
              <span className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--k-muted)' }}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
              <button
                onClick={toggle}
                role="switch"
                aria-checked={theme === 'light'}
                aria-label="Switch between dark and light mode"
                className="w-[46px] h-[26px] rounded-full relative"
                style={{ background: theme === 'light' ? 'var(--k-accent)' : 'var(--k-surface2)', border: '1px solid var(--k-line2)' }}
              >
                <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all"
                  style={{ left: theme === 'light' ? 23 : 3, background: theme === 'light' ? 'var(--k-on-accent)' : 'var(--k-muted)' }} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}