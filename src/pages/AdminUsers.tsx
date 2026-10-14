import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Shield, ShieldOff, UserCheck, MoreVertical, Bike, Store, Users, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UserRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: string
  roles: string[]
  is_deleted: boolean
  is_verified: boolean
  created_at: string
  state: string | null
  city: string | null
}

const ROLE_COLORS: Record<string, string> = {
  buyer: '#06B6D4',
  seller: '#10B981',
  rider: '#F59E0B',
  admin: '#7C3AED',
  super_admin: '#EC4899',
}

const NOW = Date.now()
const DEV_USERS: UserRow[] = Array.from({ length: 12 }, (_, i) => ({
  id: `dev-user-${i}`,
  display_name: ['Adaeze Okonkwo', 'Emeka Nwosu', 'Fatima Aliyu', 'Tunde Bakare', 'Chioma Eze', 'Bola Adesanya', 'Kemi Ibrahim', 'Seun Adebayo', 'Grace Obi', 'Musa Danladi', 'Yetunde Afolabi', 'Chibuzor Okeke'][i],
  avatar_url: null,
  role: ['buyer', 'seller', 'rider', 'buyer', 'seller', 'buyer', 'admin', 'buyer', 'seller', 'rider', 'buyer', 'seller'][i],
  roles: [['buyer'], ['seller', 'buyer'], ['rider'], ['buyer'], ['seller'], ['buyer'], ['admin', 'buyer'], ['buyer'], ['seller'], ['rider', 'buyer'], ['buyer'], ['seller', 'buyer']][i],
  is_deleted: i === 3,
  is_verified: i % 3 === 0,
  created_at: new Date(NOW - i * 86400000 * 7).toISOString(),
  state: ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Lagos', 'Abuja', 'Lagos', 'Anambra', 'Kano', 'Ogun', 'Lagos'][i],
  city: ['Ikeja', 'Wuse', 'Fagge', 'Port Harcourt', 'Ibadan', 'Victoria Island', 'Garki', 'Lekki', 'Onitsha', 'Sabon Gari', 'Sagamu', 'Surulere'][i],
}))

function timeAgo(iso: string) {
  const d = Math.floor((NOW - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [actionUser, setActionUser] = useState<UserRow | null>(null)
  const [counts, setCounts] = useState({ total: 0, buyers: 0, sellers: 0, riders: 0, admins: 0, deleted: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, roles, is_deleted, is_verified, created_at, state, city')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data && data.length > 0) {
      const rows = data as unknown as UserRow[]
      setUsers(rows)
      setCounts({
        total: rows.length,
        buyers: rows.filter(u => u.role === 'buyer' || (u.roles ?? []).includes('buyer')).length,
        sellers: rows.filter(u => u.role === 'seller' || (u.roles ?? []).includes('seller')).length,
        riders: rows.filter(u => u.role === 'rider' || (u.roles ?? []).includes('rider')).length,
        admins: rows.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
        deleted: rows.filter(u => u.is_deleted).length,
      })
    } else {
      setUsers(DEV_USERS)
      setCounts({ total: 12, buyers: 6, sellers: 4, riders: 2, admins: 1, deleted: 1 })
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.display_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter || (u.roles ?? []).includes(roleFilter)
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? !u.is_deleted : u.is_deleted)
    return matchSearch && matchRole && matchStatus
  })

  const suspendUser = async (user: UserRow) => {
    const { error } = await supabase.from('profiles').update({ is_deleted: true, deletion_reason: 'Suspended by admin' }).eq('id', user.id)
    if (error) { toast.error('Failed to suspend user'); return }
    toast.success(`${user.display_name ?? 'User'} suspended`)
    setActionUser(null)
    void load()
  }

  const restoreUser = async (user: UserRow) => {
    const { error } = await supabase.from('profiles').update({ is_deleted: false, deleted_at: null }).eq('id', user.id)
    if (error) { toast.error('Failed to restore user'); return }
    toast.success(`${user.display_name ?? 'User'} restored`)
    setActionUser(null)
    void load()
  }

  const verifyUser = async (user: UserRow) => {
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('id', user.id)
    if (error) { toast.error('Failed to verify user'); return }
    toast.success(`${user.display_name ?? 'User'} verified`)
    setActionUser(null)
    void load()
  }

  return (
    <div className="min-h-screen" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => void navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>User Management</h1>
          <p className="text-white/40 text-xs">{counts.total} total users</p>
        </div>
        <button onClick={() => void load()} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <RefreshCw size={16} className="text-white/60" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Buyers', count: counts.buyers, icon: <Users size={14} />, color: '#06B6D4' },
            { label: 'Sellers', count: counts.sellers, icon: <Store size={14} />, color: '#10B981' },
            { label: 'Riders', count: counts.riders, icon: <Bike size={14} />, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 flex flex-col items-center gap-1" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
              <p className="text-white font-bold text-lg leading-none">{s.count}</p>
              <p className="text-white/40 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 outline-none" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['all', 'buyer', 'seller', 'rider', 'admin'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all" style={roleFilter === r ? { background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' } : { background: '#11151A', color: 'rgba(255,255,255,0.5)' }}>{r}</button>
          ))}
          <div className="w-px bg-white/10 mx-1" />
          {['active', 'suspended', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all" style={statusFilter === s ? { background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' } : { background: '#11151A', color: 'rgba(255,255,255,0.5)' }}>{s}</button>
          ))}
        </div>

        {/* User list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#11151A' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-sm">No users found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' }}>
                  {(user.display_name || 'U')[0]?.toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-semibold text-sm truncate">{user.display_name ?? 'Unknown'}</p>
                    {user.is_verified && <UserCheck size={12} style={{ color: '#10B981' }} />}
                    {user.is_deleted && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#EF444420', color: '#EF4444' }}>Suspended</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium capitalize" style={{ background: `${ROLE_COLORS[user.role] ?? '#7C3AED'}18`, color: ROLE_COLORS[user.role] ?? '#7C3AED' }}>{user.role}</span>
                    {user.state && <span className="text-white/30 text-xs">{user.city ? `${user.city}, ` : ''}{user.state}</span>}
                    <span className="text-white/20 text-xs ml-auto">{timeAgo(user.created_at)}</span>
                  </div>
                </div>
                {/* Action button */}
                <button onClick={() => setActionUser(user)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <MoreVertical size={15} className="text-white/50" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action sheet */}
      {actionUser && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setActionUser(null)}>
          <div className="w-full rounded-t-3xl p-5 space-y-2" style={{ background: '#11151A' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' }}>
                {(actionUser.display_name || 'U')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{actionUser.display_name}</p>
                <p className="text-white/40 text-xs capitalize">{actionUser.role}</p>
              </div>
            </div>
            {!actionUser.is_verified && (
              <button onClick={() => void verifyUser(actionUser)} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: '#10B98115' }}>
                <UserCheck size={18} style={{ color: '#10B981' }} />
                <span className="text-white font-medium">Verify this user</span>
              </button>
            )}
            {!actionUser.is_deleted ? (
              <button onClick={() => void suspendUser(actionUser)} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: '#EF444415' }}>
                <ShieldOff size={18} style={{ color: '#EF4444' }} />
                <span style={{ color: '#EF4444' }} className="font-medium">Suspend account</span>
              </button>
            ) : (
              <button onClick={() => void restoreUser(actionUser)} className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: '#10B98115' }}>
                <Shield size={18} style={{ color: '#10B981' }} />
                <span style={{ color: '#10B981' }} className="font-medium">Restore account</span>
              </button>
            )}
            <button onClick={() => setActionUser(null)} className="w-full p-3 rounded-xl text-white/50 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
