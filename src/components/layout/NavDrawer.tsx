import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Home, Map, Users, MessageSquare, Package, Store, Bike,
  ShieldAlert, User, PlusCircle, Truck, Wallet, AlertTriangle,
  Search, Settings, TrendingUp, BarChart2, Shield, ShieldCheck, Gift, Video,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { initials } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const SECTIONS = [
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
      { icon: Truck,       label: 'Request Delivery', path: '/request-delivery' },
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
      { icon: Users,        label: 'Manage Groups',   path: '/admin/groups' },
      { icon: AlertTriangle,label: 'Disputes',        path: '/admin/disputes' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: Gift,     label: 'Refer & Earn',      path: '/referral' },
      { icon: Settings, label: 'Settings',         path: '/settings' },
      { icon: Shield,   label: 'Security',         path: '/security-setup' },
      { icon: User,     label: 'Activity Log',     path: '/activity-log' },
    ],
  },
]

const ROLE_NAMES: Record<string, string> = {
  buyer: 'Buyer', seller: 'Seller', independent: 'Independent Shopper', rider: 'Rider',
  admin: 'Admin', super_admin: 'Admin', investigation_admin: 'Admin',
}

export default function NavDrawer({ open, onClose }: Props) {
  const navigate        = useNavigate()
  const { profile, user } = useAuth()
  const [storeName, setStoreName] = useState<string | null>(null)

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
      title === 'Seller' ? (roles.includes('seller') || roles.includes('independent'))
    : title === 'Rider' ? roles.includes('rider')
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
            className="fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto flex flex-col"
            style={{ background: '#0C0F14', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Profile card at top */}
            <div
              className="px-5 pt-6 pb-5 cursor-pointer"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => go('/profile')}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg,#7C3AED,#06B6D4)',
                    color: '#fff',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initials(profile?.display_name || 'U')}
                </div>

                {/* KASAJA wordmark (top, next to the photo) */}
                <div className="flex-1 min-w-0">
                  <span
                    className="font-display font-black gradient-text select-none"
                    style={{ fontSize: '1.4rem', letterSpacing: '-0.04em', fontWeight: 900 }}
                  >
                    KASAJA
                  </span>
                  <p className="text-white/40 text-xs mt-0.5 truncate">
                    Tap to view profile
                  </p>
                </div>

                {/* Chevron */}
                <div className="text-white/20 text-xs">›</div>
              </div>

              {/* User name or store name */}
              <div className="mt-4">
                <p
                  className="text-white font-semibold text-base truncate"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {displayTitle}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from(new Set(roles.map(r => ROLE_NAMES[r]).filter(Boolean))).map(n => (
                    <span key={n} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400">{n}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <X size={16} className="text-white/40" />
            </button>

            {/* Nav sections */}
            <div className="py-4 flex-1">
                 {SECTIONS.filter(s => canSee(s.title)).map(section => (
                <div key={section.title} className="mb-3">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest px-5 mb-1"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {section.title}
                  </p>
                  {section.items.map(({ icon: Icon, label, path }) => (
                    <button
                      key={path}
                      onClick={() => go(path)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors text-left group"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <Icon size={17} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}