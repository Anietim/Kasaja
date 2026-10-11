import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  Camera, Settings, Star, Package, Truck,
  ChevronRight, BadgeCheck, Edit3, MapPin, Store,
  LogOut, Shield, Heart, ShoppingBag, Grid3X3,
  BarChart2, TrendingUp, MessageCircle
} from 'lucide-react'

interface Profile {
  id: string
  display_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  roles: string[]
  is_verified: boolean
  kaja_balance: number
  rating_avg: number
  rating_count: number
  created_at: string
}

interface Stats {
  orders: number
  listings: number
  deliveries: number
  followers: number
  following: number
  total_sales: number
  likes_received: number
  posts: number
}

interface MockProduct {
  id: string
  title: string
  price: number
  images?: string[]
  likes?: number
  sold?: number
}

const DEV_BYPASS = import.meta.env.DEV

const MOCK_POSTS: MockProduct[] = [
  { id: '1', title: 'Samsung Galaxy S24', price: 285000, images: [], likes: 24, sold: 3 },
  { id: '2', title: 'Ankara Fabric (6 yards)', price: 8500, images: [], likes: 41, sold: 12 },
  { id: '3', title: 'iPhone 15 Pro Max', price: 850000, images: [], likes: 67, sold: 1 },
  { id: '4', title: 'Men\'s Leather Shoes', price: 15000, images: [], likes: 18, sold: 7 },
  { id: '5', title: 'Rice (50kg bag)', price: 45000, images: [], likes: 9, sold: 23 },
  { id: '6', title: 'HP Laptop i7', price: 320000, images: [], likes: 33, sold: 2 },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({
    orders: 0, listings: 0, deliveries: 0, followers: 0,
    following: 0, total_sales: 0, likes_received: 0, posts: 0
  })
  const [products, setProducts] = useState<MockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'sales'>('posts')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const uid = DEV_BYPASS ? 'dev-super-admin-id' : user?.id

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      if (DEV_BYPASS) {
        const mock: Profile = {
          id: uid,
          display_name: 'Kasaja Dev Admin',
          phone: '+2348012345678',
          email: 'dev@kasaja.ng',
          avatar_url: null,
          bio: 'Building the future of Nigerian commerce',
          location: 'Lagos, Nigeria',
          roles: ['buyer', 'seller', 'rider', 'super_admin'],
          is_verified: true,
          kaja_balance: 500000,
          rating_avg: 4.9,
          rating_count: 127,
          created_at: new Date().toISOString(),
        }
        setProfile(mock)
        setStats({
          orders: 23, listings: 47, deliveries: 12, followers: 341,
          following: 89, total_sales: 1250000, likes_received: 892, posts: 47
        })
        setProducts(MOCK_POSTS)
        setName(mock.display_name ?? '')
        setBio(mock.bio ?? '')
        setLocation(mock.location ?? '')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (data) {
        const p = data as Profile
        setProfile(p)
        setName(p.display_name ?? '')
        setBio(p.bio ?? '')
        setLocation(p.location ?? '')
      }
      const [ordersRes, listingsRes, deliveriesRes, followersRes, followingRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', uid),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', uid),
        supabase.from('delivery_requests').select('id', { count: 'exact', head: true }).eq('rider_id', uid),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', uid),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', uid),
      ])
      const { data: prods } = await supabase.from('products').select('id,title,price,images').eq('store_id', uid).limit(12)
      setStats(s => ({
        ...s,
        orders: ordersRes.count ?? 0,
        listings: listingsRes.count ?? 0,
        deliveries: deliveriesRes.count ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts: listingsRes.count ?? 0,
      }))
      if (prods) setProducts(prods)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { void load() }, [load])

    const saveProfile = async () => {
    if (!uid) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('profiles').update({
        display_name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
      }).eq('id', uid).select('id')
      if (error) { toast.error(error.message); return }
      if (!data || data.length === 0) {
        toast.error('No profile found for your account yet. Finish onboarding first.')
        return
      }
      setProfile(p => p ? { ...p, display_name: name, bio, location } : p)
      setEditing(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) { toast.error('Only JPEG, PNG, WebP or GIF allowed'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${uid}.${ext}`
      const { error } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('kasaja-media').getPublicUrl(path)
            const { data: upd, error: updErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', uid).select('id')
      if (updErr) throw updErr
      if (!upd || upd.length === 0) throw new Error('No profile row found')
      setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
      toast.success('Photo updated')
    } catch {
      toast.error('Upload failed — check Supabase storage bucket permissions')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSignOut = async () => { await signOut(); void navigate('/login') }

  const formatNaira = (kobo: number) =>
    `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const roleColors: Record<string, string> = {
    buyer: 'bg-blue-500/20 text-blue-300',
    seller: 'bg-emerald-500/20 text-emerald-300',
    rider: 'bg-amber-500/20 text-amber-300',
    admin: 'bg-purple-500/20 text-purple-300',
    super_admin: 'bg-red-500/20 text-red-300',
  }

  const isSuperAdmin = profile?.roles?.includes('super_admin')

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4">
      <p className="text-muted">No profile found</p>
      <button onClick={() => void navigate('/login')} className="btn-primary px-6 py-2 rounded-xl">Sign In</button>
    </div>
  )

  const tabProducts = activeTab === 'sales'
    ? products.filter(p => (p.sold ?? 0) > 0)
    : products

  return (
    <div className="min-h-screen bg-canvas pb-24">

      {/* ── BANNER + AVATAR ─────────────────────────────── */}
      <div className="relative">
        <div className="h-52 w-full overflow-hidden relative">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: 'var(--gradient)' }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
        </div>

        {/* Settings top-right */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => void navigate('/settings')}
            className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
            <Settings size={18} className="text-white" />
          </button>
          {isSuperAdmin && (
            <button onClick={() => void navigate('/admin/analytics')}
              className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
              <BarChart2 size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
          <div className="relative">
            <div className="w-28 h-28 rounded-full p-[3px]" style={{ background: 'var(--gradient)' }}>
              <div className="w-full h-full rounded-full overflow-hidden bg-surface flex items-center justify-center border-2 border-canvas">
                {uploadingAvatar ? (
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black gradient-text">
                    {(profile.display_name ?? 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-canvas"
              style={{ background: 'var(--gradient)' }}
            >
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { void handleAvatarChange(e) }} />
          </div>
        </div>
      </div>

      {/* ── PROFILE INFO ────────────────────────────────── */}
      <div className="pt-16 px-4">
        <div className="text-center mb-3">
          {editing ? (
            <input value={name} onChange={e => setName(e.target.value)}
              className="text-xl font-bold text-center bg-surface text-white rounded-xl px-4 py-2 w-full max-w-xs border border-white/10 outline-none focus:border-brand-500"
              placeholder="Display name" autoFocus />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-white">{profile.display_name ?? 'Anonymous'}</h1>
              {profile.is_verified && <BadgeCheck size={20} className="text-brand-400 fill-brand-400/20" />}
              <button onClick={() => setEditing(true)}><Edit3 size={15} className="text-muted" /></button>
            </div>
          )}

          {/* Roles */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            {(profile.roles ?? ['buyer']).map(r => (
              <span key={r}
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${roleColors[r] ?? 'bg-white/10 text-white'}`}>
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>

          {editing ? (
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="mt-2 text-sm text-center bg-surface text-white rounded-xl px-4 py-1.5 w-full max-w-xs border border-white/10 outline-none focus:border-brand-500"
              placeholder="City, State" />
          ) : profile.location ? (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <MapPin size={12} className="text-muted" />
              <span className="text-sm text-muted">{profile.location}</span>
            </div>
          ) : null}
        </div>

        {/* Bio */}
        <div className="mb-3">
          {editing ? (
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              className="w-full bg-surface text-white rounded-xl px-4 py-3 text-sm border border-white/10 outline-none focus:border-brand-500 resize-none"
              rows={2} placeholder="Tell buyers and sellers about yourself..." />
          ) : profile.bio ? (
            <p className="text-sm text-muted text-center leading-relaxed">{profile.bio}</p>
          ) : (
            <button onClick={() => setEditing(true)}
              className="w-full text-sm text-muted text-center py-2 border border-dashed border-white/10 rounded-xl">
              + Add a bio
            </button>
          )}
        </div>

        {editing && (
          <div className="flex gap-3 mb-4">
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white text-sm">Cancel</button>
            <button onClick={() => void saveProfile()} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {/* ── STATS ROW ─────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { value: stats.posts, label: 'Posts' },
            { value: stats.followers, label: 'Followers' },
            { value: stats.following, label: 'Following' },
            { value: stats.likes_received, label: 'Likes' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-white font-black text-xl leading-none">{s.value.toLocaleString()}</p>
              <p className="text-muted text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-4" />

        {/* ── SELLER METRICS (if seller/super_admin) ────── */}
        {(profile.roles?.includes('seller') || isSuperAdmin) && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { icon: <ShoppingBag size={15} />, label: 'Total Sales', value: formatNaira(stats.total_sales), color: 'text-emerald-400' },
              { icon: <Package size={15} />, label: 'Listings', value: stats.listings.toString(), color: 'text-brand-400' },
              { icon: <TrendingUp size={15} />, label: 'Deliveries', value: stats.deliveries.toString(), color: 'text-amber-400' },
            ].map(m => (
              <div key={m.label} className="bg-surface rounded-2xl p-3">
                <div className={`${m.color} mb-1`}>{m.icon}</div>
                <p className="text-white font-bold text-base leading-tight">{m.value}</p>
                <p className="text-muted text-xs">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Rating */}
        {profile.rating_count > 0 && (
          <div className="bg-surface rounded-2xl p-3 mb-4 flex items-center gap-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14}
                  className={i < Math.round(profile.rating_avg) ? 'text-amber-400 fill-amber-400' : 'text-white/20'} />
              ))}
            </div>
            <span className="text-white font-bold">{profile.rating_avg.toFixed(1)}</span>
            <span className="text-muted text-sm">({profile.rating_count} ratings)</span>
          </div>
        )}

        {/* Kaja Balance */}
        <div className="gradient-bg rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium">Kaja Balance</p>
            <p className="text-white text-2xl font-black">{formatNaira(profile.kaja_balance)}</p>
          </div>
          <button onClick={() => void navigate('/wallet')}
            className="bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            Wallet
          </button>
        </div>

        {/* ── POSTS / LIKES / SALES TABS ────────────────── */}
        <div className="flex border-b border-white/10 mb-4">
          {[
            { key: 'posts', icon: <Grid3X3 size={16} />, label: 'Posts' },
            { key: 'likes', icon: <Heart size={16} />, label: 'Liked' },
            { key: 'sales', icon: <ShoppingBag size={16} />, label: 'Sold' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'posts' | 'likes' | 'sales')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-muted'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PRODUCT GRID ──────────────────────────────── */}
        {tabProducts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 mb-6">
            {tabProducts.map(product => (
              <button
                key={product.id}
                onClick={() => void navigate(`/product/${product.id}`)}
                className="relative aspect-square rounded-xl overflow-hidden bg-surface group"
              >
                {product.images && product.images[0] ? (
                  <img src={product.images[0]} alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <Package size={20} className="text-muted" />
                    <p className="text-[10px] text-muted text-center leading-tight line-clamp-2">{product.title}</p>
                  </div>
                )}
                {/* Price overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-white text-[10px] font-bold">₦{product.price.toLocaleString()}</p>
                </div>
                {/* Likes badge */}
                {(product.likes ?? 0) > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 rounded-full px-1.5 py-0.5">
                    <Heart size={8} className="text-red-400 fill-red-400" />
                    <span className="text-[9px] text-white">{product.likes}</span>
                  </div>
                )}
                {/* Sold badge */}
                {(product.sold ?? 0) > 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-emerald-500/80 rounded-full px-1.5 py-0.5">
                    <span className="text-[9px] text-white font-bold">{product.sold} sold</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Grid3X3 size={32} className="text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No {activeTab} yet</p>
          </div>
        )}

        {/* ── QUICK LINKS ───────────────────────────────── */}
        <div className="bg-surface rounded-2xl divide-y divide-white/5 mb-4">
          {[
            { icon: <Package size={16} />, label: 'My Orders', path: '/orders' },
            { icon: <Store size={16} />, label: 'My Store', path: '/store/dashboard' },
            { icon: <Truck size={16} />, label: 'Rider Dashboard', path: '/rider' },
            { icon: <MessageCircle size={16} />, label: 'Inbox', path: '/inbox' },
            { icon: <Shield size={16} />, label: 'Security & Login', path: '/security-setup' },
            { icon: <Settings size={16} />, label: 'Settings', path: '/settings' },
            ...(isSuperAdmin ? [{ icon: <BarChart2 size={16} />, label: 'Admin Analytics', path: '/admin/analytics' }] : []),
          ].map(item => (
            <button key={item.path} onClick={() => void navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left">
              <span className="text-brand-400">{item.icon}</span>
              <span className="text-white text-sm flex-1">{item.label}</span>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
        </div>

        <button onClick={() => void handleSignOut()}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-400 text-sm font-medium mb-2">
          <LogOut size={16} />
          Sign Out
        </button>

        <p className="text-center text-muted text-xs pb-4">
          Member since {new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
