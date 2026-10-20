import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Star, MapPin, Package, TrendingUp, ChevronRight, Zap, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { MOCK } from '@/lib/mockData'
import { StoryViewer } from '@/components/StoryViewer'
import LiveOrderCard from '@/components/home/LiveOrderCard'
import FlashDeals from '@/components/home/FlashDeals'
import FollowingFeed from '@/components/home/FollowingFeed'

interface Product {
  id: string; title: string; price_kobo: number; price_type: string
  images: string[]; category: string
  store: { name: string; is_verified: boolean }
  likes_count: number; location?: string
}

interface Story {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  has_new: boolean
}

const CATEGORIES = ['All', 'Fashion', 'Electronics', 'Food', 'Beauty', 'Home', 'Auto', 'Health', 'Sports']
const VIEWER_NOW = Date.now()

// Dev mock stories
const DEV_STORIES: Story[] = [
  { id: '1', user_id: 'u1', display_name: 'Adaeze', avatar_url: null, has_new: true },
  { id: '2', user_id: 'u2', display_name: 'Balogun Mkt', avatar_url: null, has_new: true },
  { id: '3', user_id: 'u3', display_name: 'TechKing', avatar_url: null, has_new: true },
  { id: '4', user_id: 'u4', display_name: 'FabricHub', avatar_url: null, has_new: false },
  { id: '5', user_id: 'u5', display_name: 'GadgetsNG', avatar_url: null, has_new: true },
  { id: '6', user_id: 'u6', display_name: 'ChiefBoss', avatar_url: null, has_new: false },
  { id: '7', user_id: 'u7', display_name: 'Emeka Auto', avatar_url: null, has_new: true },
]
type StoryRow = { id: string; user_id: string; media_url: string; media_type: string; caption: string | null; hashtags: string[] | null; expires_at: string; created_at: string; profiles?: { display_name: string; avatar_url: string | null } | null }
const AVATAR_COLORS = ['#FF7A00', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function Home() {
  const navigate = useNavigate()
  const [storyRows, setStoryRows] = useState<StoryRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stories, setStories]   = useState<Story[]>([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading]   = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0)

    const storyGroups = storyRows.length > 0
    ? Array.from(new Set(storyRows.map(r => r.user_id))).map(uid => {
        const mine = storyRows.filter(r => r.user_id === uid).slice().reverse()
        const p = mine[0].profiles
        return {
          userId: uid,
          userName: p?.display_name || 'User',
          avatarUrl: p?.avatar_url ?? undefined,
          stories: mine.map(r => ({
            id: r.id, user_id: r.user_id, media_url: r.media_url,
            media_type: (r.media_type === 'video' ? 'video' : 'image') as 'image' | 'video',
            caption: r.caption ?? undefined, hashtags: r.hashtags ?? [],
            expires_at: r.expires_at, created_at: r.created_at,
          })),
        }
      })
    : stories.map(s => ({
        userId: s.user_id, userName: s.display_name, avatarUrl: s.avatar_url ?? undefined,
        stories: [{
          id: s.id, user_id: s.user_id,
          media_url: `https://picsum.photos/seed/${s.id}/400/700`, media_type: 'image' as const,
          caption: 'Sample status', hashtags: ['kasaja'],
          expires_at: new Date(VIEWER_NOW + 3600000).toISOString(),
          created_at: new Date(VIEWER_NOW - 3600000).toISOString(),
        }],
      }))

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('products')
      .select('id,title,price_kobo,price_type,images,category,likes_count,store:stores(name,is_verified)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30)
    if (category !== 'All') q = q.eq('category', category)

    const { data } = await q
    setProducts((data ?? []) as unknown as Product[])
    setLoading(false)
  }, [category])

  // Load stories from DB, fall back to dev mock
useEffect(() => {
  async function loadStories() {
    try {
      const { data } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, caption, hashtags, expires_at, created_at, profiles!user_id(display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(60)
      if (data && data.length > 0) {
        const rows = data as unknown as StoryRow[]
        setStoryRows(rows)
        const seen = new Set<string>()
        setStories(rows.filter(r => !seen.has(r.user_id) && seen.add(r.user_id)).map(r => ({
          id: r.id, user_id: r.user_id,
          display_name: r.profiles?.display_name || 'User',
          avatar_url: r.profiles?.avatar_url ?? null,
          has_new: true,
        })))
      } else {
        setStories(import.meta.env.DEV ? DEV_STORIES : [])
      }
    } catch {
      setStories(DEV_STORIES)
    }
  }
  void loadStories()
}, [])

  useEffect(() => { void load() }, [load])

  const fmt = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG')

  function toggleLike(id: string) {
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: '#080A0D' }}>

      {/* ── Stories row ── */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(8,10,13,0.98)' }}
      >
        <div className="flex gap-3.5 overflow-x-auto pb-1 no-scrollbar">

          {/* Add my story */}
          <button
            onClick={() => { void navigate('/post-story') }}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: '#11151A', border: '2px dashed rgba(255,122,0,0.4)' }}
            >
              <Plus size={18} style={{ color: '#FF7A00' }} />
            </div>
            <span className="text-[10px] font-medium truncate w-14 text-center"
              style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif' }}>
              Your story
            </span>
          </button>

          {/* User stories */}
          {stories.map((s, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
                onClick={() => { setViewerGroupIdx(i); setViewerOpen(true) }}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                {/* ring: gradient if new, muted if seen */}
                <div
                  className="w-14 h-14 rounded-full p-[2.5px]"
                  style={{
                    background: s.has_new
                      ? 'linear-gradient(135deg, #FF7A00, #6366F1, #10B981)'
                      : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                    style={{
                      background: s.avatar_url ? 'transparent' : `${color}22`,
                      color,
                      border: '2px solid #080A0D',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.display_name} className="w-full h-full object-cover rounded-full" />
                      : initials(s.display_name)
                    }
                  </div>
                </div>
                <span
                  className="text-[10px] font-medium truncate w-14 text-center"
                  style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {s.display_name.split(' ')[0]}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <LiveOrderCard />
      {/* ── Sticky controls ── */}
      <div
        className="sticky top-14 z-20 px-4 pt-4 pb-3"
        style={{ background: 'rgba(8,10,13,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={category === c
                ? { background: 'linear-gradient(135deg,#FF7A00,#6366F1)', color: '#fff', fontFamily: 'DM Sans,sans-serif' }
                : { background: '#11151A', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'DM Sans,sans-serif' }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top markets ── */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
            Top Markets
          </span>
          <button onClick={() => void navigate('/markets')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#FF7A00' }}>
            See all <ChevronRight size={13} />
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {MOCK.markets.slice(0, 7).map((m, i) => {
            const colors = ['#FF7A00', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
            const accent = colors[i % colors.length]
            return (
              <button
                key={m.slug}
                onClick={() => void navigate(`/market/${m.slug}`)}
                className="shrink-0 rounded-2xl px-4 py-3 text-left min-w-[110px] transition-all active:scale-95"
                style={{ background: '#11151A', border: `1px solid ${accent}22` }}
              >
                <div className="w-6 h-6 rounded-lg mb-2 flex items-center justify-center" style={{ background: `${accent}18` }}>
                  <MapPin size={12} style={{ color: accent }} />
                </div>
                <p className="text-white text-xs font-semibold truncate leading-tight">{m.name.replace(' Market', '')}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.speciality?.[0] ?? 'General'}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-4 pb-5">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Zap, label: 'Flash Deals', sub: '12 live', color: '#F59E0B', bg: '#F59E0B14', path: '/search?q=deals' },
            { icon: TrendingUp, label: 'Trending', sub: 'See now', color: '#10B981', bg: '#10B98114', path: '/trending' },
            { icon: Package, label: 'My Orders', sub: 'Track', color: '#6366F1', bg: '#6366F114', path: '/orders' },
          ].map(({ icon: Icon, label, sub, color, bg, path }) => (
            <button
              key={label}
              onClick={() => void navigate(path)}
              className="rounded-2xl p-3.5 flex flex-col gap-1.5 text-left transition-all active:scale-95"
              style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-white text-xs font-semibold" style={{ fontFamily: 'DM Sans,sans-serif' }}>{label}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans,sans-serif' }}>{sub}</p>
            </button>
          ))}
        </div>
      </div>
      
    <FlashDeals />
    <FollowingFeed />
      {/* ── Product grid ── */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
            {category === 'All' ? 'Latest Listings' : category}
          </span>
          {!loading && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{products.length} items</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden animate-pulse" style={{ background: '#11151A' }}>
                <div className="w-full aspect-[4/5]" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-4 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3, ease: 'easeOut' }}
                onClick={() => void navigate(`/product/${p.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') void navigate(`/product/${p.id}`) }}
                className="rounded-3xl overflow-hidden text-left transition-all active:scale-[0.97] cursor-pointer"
                style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="relative w-full aspect-[4/5]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={32} style={{ color: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  )}
                  {p.price_type === 'negotiable' && (
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,122,0,0.85)', color: '#fff', letterSpacing: '0.06em' }}>
                      NEGO
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); toggleLike(p.id) }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                  >
                    <Heart size={14} className={likedIds.has(p.id) ? 'fill-red-500 text-red-500' : 'text-white'} />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(17,21,26,0.92), transparent)' }} />
                  <p className="absolute bottom-2.5 left-3 text-sm font-bold tabular-nums"
                    style={{ color: '#FF7A00', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {fmt(p.price_kobo)}
                  </p>
                </div>

                <div className="px-3 py-2.5">
                  <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {p.title}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {p.store?.is_verified && <Star size={10} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                      <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {p.store?.name ?? 'Store'}
                      </span>
                    </div>
                    <span className="text-[11px] flex items-center gap-1 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Heart size={10} />
                      {(p.likes_count ?? 0) + (likedIds.has(p.id) ? 1 : 0)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="h-6" />

      {/* Story Viewer */}
      {viewerOpen && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerGroupIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  )
}
