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
import HomeGreeting from '@/components/home/HomeGreeting'
import TrustCard from '@/components/home/TrustCard'
import { useDesk } from '@/hooks/useDesk'

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
const AVATAR_COLORS = ['#FF8A3D', '#8B5CF6', '#34D399', '#F59E0B', '#F0506E', '#A78BFA', '#22D3EE']
const WARM = 'linear-gradient(135deg,#FF8A3D,#8B5CF6)'
const CARD = { background: '#100D14', border: '1px solid rgba(255,255,255,0.08)' }

export default function Home() {
  const navigate = useNavigate()
  const desk = useDesk()
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
    <div className={`min-h-dvh relative ${desk ? 'pb-10' : 'pb-28'}`} style={{ background: '#09070B' }}>

      {/* soft warm + violet glow behind the top of the page */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[520px] overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px]" style={{ background: 'radial-gradient(closest-side, rgba(255,138,61,0.22), transparent)' }} />
        <div className="absolute top-10 -right-32 w-[420px] h-[420px]" style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.22), transparent)' }} />
      </div>

      <div className={`relative ${desk ? 'max-w-[920px] mx-auto' : ''}`}>
        {!desk && <HomeGreeting />}

        {/* ── Stories row ── */}
        <div className={`px-4 pb-1 ${desk ? 'pt-6' : 'pt-4'}`}>
          <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">

            {/* Add my story */}
            <button
              onClick={() => { void navigate('/post-story') }}
              className="flex flex-col items-center gap-2 shrink-0 w-[68px]"
              aria-label="Add to your story"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ border: '2px dashed #FF8A3D', color: '#FF8A3D' }}>
                <Plus size={24} />
              </div>
              <span className="text-xs" style={{ color: '#A59DA8' }}>Your story</span>
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
                  className="flex flex-col items-center gap-2 shrink-0 w-[68px]"
                >
                  {/* ring: warm gradient if new, muted if seen */}
                  <div className="w-16 h-16 rounded-full p-[3px]"
                    style={{ background: s.has_new ? WARM : '#2A2530' }}>
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-base font-extrabold overflow-hidden"
                      style={{ background: s.avatar_url ? 'transparent' : `${color}33`, color, border: '3px solid #09070B' }}
                    >
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt={s.display_name} className="w-full h-full object-cover rounded-full" />
                        : initials(s.display_name)}
                    </div>
                  </div>
                  <span className="text-xs truncate w-full text-center"
                    style={{ color: s.has_new ? '#F6F3F1' : '#A59DA8' }}>
                    {s.display_name.split(' ')[0]}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {!desk && <LiveOrderCard />}

        {/* ── Sticky category chips ── */}
        <div
          className={`sticky z-20 px-4 pt-5 pb-3 ${desk ? 'top-0' : 'top-14'}`}
          style={{ background: 'rgba(9,7,11,0.92)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="shrink-0 px-[18px] py-2.5 rounded-full text-sm transition-all active:scale-95"
                style={category === c
                  ? { background: WARM, color: '#fff', fontWeight: 700 }
                  : { background: '#17131B', color: '#C9C1CC', fontWeight: 600 }}
              >
                {c === 'All' ? 'For you' : c}
              </button>
            ))}
          </div>
        </div>

        {!desk && <FlashDeals />}

        {/* ── Top markets ── */}
        <section className="pt-7">
          <div className="flex items-center justify-between px-4 pb-3.5">
            <h2 className="text-white text-xl font-extrabold tracking-tight">Top markets</h2>
            <button onClick={() => void navigate('/markets')} className="min-h-11 flex items-center gap-1 text-sm font-bold" style={{ color: '#FF9A4D' }}>
              See all <ChevronRight size={15} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {MOCK.markets.slice(0, 7).map((m, i) => {
              const accent = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <button
                  key={m.slug}
                  onClick={() => void navigate(`/market/${m.slug}`)}
                  className="shrink-0 rounded-3xl px-4 py-3.5 text-left min-w-[128px] transition-all active:scale-95"
                  style={{ ...CARD, borderColor: `${accent}30` }}
                >
                  <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${accent}22` }}>
                    <MapPin size={15} style={{ color: accent }} />
                  </div>
                  <p className="text-white text-sm font-bold truncate">{m.name.replace(' Market', '')}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#A59DA8' }}>{m.speciality?.[0] ?? 'General'}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Quick actions ── */}
        {!desk && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Flash deals', sub: 'Ends soon', color: '#FF9A4D', path: '/search?q=deals' },
              { icon: TrendingUp, label: 'Trending', sub: 'See now', color: '#34D399', path: '/trending' },
              { icon: Package, label: 'My orders', sub: 'Track', color: '#A78BFA', path: '/orders' },
            ].map(({ icon: Icon, label, sub, color, path }) => (
              <button
                key={label}
                onClick={() => void navigate(path)}
                className="rounded-3xl p-3.5 flex flex-col gap-1.5 text-left transition-all active:scale-95"
                style={CARD}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1F` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <p className="text-white text-[13px] font-bold mt-1">{label}</p>
                <p className="text-[11px]" style={{ color: '#A59DA8' }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>
        )}

        <FollowingFeed />

        {/* ── Product grid ── */}
        <div className="px-4 pt-8">
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              {category === 'All' ? 'Latest listings' : category}
            </h2>
            {!loading && (
              <span className="text-xs" style={{ color: '#A59DA8' }}>{products.length} items</span>
            )}
          </div>

          {loading ? (
            <div className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden animate-pulse" style={{ background: '#100D14' }}>
                  <div className="w-full aspect-[4/5]" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
                  style={CARD}
                >
                  <div className="relative w-full aspect-[4/5]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
                      </div>
                    )}
                    {p.price_type === 'negotiable' && (
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                        style={{ background: '#09070B', color: '#FF9A4D', letterSpacing: '0.06em' }}>
                        NEGOTIABLE
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(p.id) }}
                      aria-label={likedIds.has(p.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      className="absolute top-1.5 right-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
                    >
                      <span className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(9,7,11,0.6)' }}>
                        <Heart size={16}
                          className={likedIds.has(p.id) ? 'text-[#FF8A3D]' : 'text-white'}
                          fill={likedIds.has(p.id) ? '#FF8A3D' : 'none'} />
                      </span>
                    </button>
                  </div>

                  <div className="px-3.5 pt-3 pb-3.5">
                    <p className="text-white text-sm font-bold leading-snug line-clamp-2">{p.title}</p>
                    <div className="flex items-center gap-1 mt-1 mb-2 min-w-0">
                      {p.store?.is_verified && <Star size={11} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                      <span className="text-xs truncate" style={{ color: '#A59DA8' }}>{p.store?.name ?? 'Store'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[15px] tabular-nums" style={{ color: '#FF9A4D' }}>{fmt(p.price_kobo)}</p>
                      {desk && <span className="inline-flex h-8 px-4 rounded-full items-center text-[13px] font-extrabold text-white" style={{ background: WARM }}>Buy</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {!desk && <TrustCard />}

        <div className="h-6" />
      </div>

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
