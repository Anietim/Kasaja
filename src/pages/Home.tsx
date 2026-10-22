import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Star, MapPin, Package, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { MOCK } from '@/lib/mockData'
import { StoryViewer } from '@/components/StoryViewer'
import FollowingFeed from '@/components/home/FollowingFeed'
import { useDesk } from '@/hooks/useDesk'
import ScrollRow from '@/components/home/ScrollRow'
import { ArrowUp } from 'lucide-react'
import { useNewFeed, markFeedSeen } from '@/hooks/useNewFeed'

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

export default function Home() {
  const navigate = useNavigate()
  const desk = useDesk()
  const newCount = useNewFeed()
  const topRef = useRef<HTMLDivElement>(null)
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
    markFeedSeen()
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

  const CARD = { background: 'var(--k-surface)', border: '1px solid var(--k-line)' }

  return (
    <div className={`min-h-dvh ${desk ? 'pb-10' : 'pb-28'}`} style={{ background: 'var(--k-bg)' }}>
      <div ref={topRef} />
      <div className={desk ? 'max-w-[920px] mx-auto' : 'max-w-[820px] mx-auto'}>

        {/* ── Stories ── */}
        <div className={`px-4 pb-1 ${desk ? 'pt-7' : 'pt-4'}`}>
          <ScrollRow className="gap-3.5 pb-1">
            <button
              onClick={() => { void navigate('/post-story') }}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16"
              aria-label="Add to your story"
            >
              <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                style={{ border: '2px dashed var(--k-line2)', color: 'var(--k-muted)' }}>
                <Plus size={20} />
              </span>
              <span className="text-[11px]" style={{ color: 'var(--k-muted)' }}>Your story</span>
            </button>

            {stories.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
                onClick={() => { setViewerGroupIdx(i); setViewerOpen(true) }}
                className="flex flex-col items-center gap-1.5 shrink-0 w-16"
              >
                <span className="w-[52px] h-[52px] rounded-full p-[2px] box-border"
                  style={{ border: `2px solid ${s.has_new ? 'var(--k-accent)' : 'var(--k-line2)'}` }}>
                  <span className="w-full h-full rounded-full flex items-center justify-center text-sm font-extrabold overflow-hidden"
                    style={{ background: 'var(--k-surface2)', color: 'var(--k-text)' }}>
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.display_name} className="w-full h-full object-cover rounded-full" />
                      : initials(s.display_name)}
                  </span>
                </span>
                <span className="text-[11px] truncate w-full text-center" style={{ color: s.has_new ? 'var(--k-text)' : 'var(--k-muted)' }}>
                  {s.display_name.split(' ')[0]}
                </span>
              </motion.button>
            ))}
          </ScrollRow>
        </div>


        {/* ── Category tabs ── */}
        <div
          className={`sticky z-20 px-4 pt-4 ${desk ? 'top-0' : 'top-14'}`}
          style={{ background: 'var(--k-bg)', borderBottom: '1px solid var(--k-line)' }}
        >
          {newCount > 0 && (
            <button
              onClick={() => { void load(); topRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-3 h-10 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold shadow-lg transition-transform active:scale-95"
              style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}
              aria-live="polite"
            >
              <ArrowUp size={15} /> {newCount} new listing{newCount === 1 ? '' : 's'}
            </button>
          )}
          <ScrollRow className="gap-6">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="shrink-0 pb-3 text-sm transition-colors"
                style={{
                  color: category === c ? 'var(--k-text)' : 'var(--k-muted)',
                  fontWeight: category === c ? 700 : 500,
                  borderBottom: `2px solid ${category === c ? 'var(--k-accent)' : 'transparent'}`,
                }}
              >
                {c === 'All' ? 'For you' : c}
              </button>
            ))}
          </ScrollRow>
        </div>

        {/* ── Top markets: slim pills, fades when there is more to the right ── */}
        <div className="px-4 pt-5 flex items-center gap-3">
          <span className="text-xs font-bold shrink-0" style={{ color: 'var(--k-muted)' }}>Top markets</span>
          <div className="flex-1 min-w-0">
            <ScrollRow className="gap-2">
              {MOCK.markets.slice(0, 8).map(m => (
                <button
                  key={m.slug}
                  onClick={() => void navigate(`/market/${m.slug}`)}
                  className="shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition-transform active:scale-95"
                  style={{ border: '1px solid var(--k-line)', color: 'var(--k-text)' }}
                >
                  <MapPin size={13} style={{ color: 'var(--k-accent)' }} />
                  {m.name.replace(' Market', '')}
                </button>
              ))}
              <button onClick={() => void navigate('/markets')} className="shrink-0 h-8 px-3 text-xs font-bold" style={{ color: 'var(--k-accent)' }}>
                See all
              </button>
            </ScrollRow>
          </div>
        </div>

        <FollowingFeed />

        {/* ── Listings ── */}
        <div className="px-4 pt-8">
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--k-text)' }}>
              {category === 'All' ? 'Latest listings' : category}
            </h2>
            {!loading && products.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--k-muted)' }}>{products.length} items</span>
            )}
          </div>

          {loading ? (
            <div className={`grid gap-3 sm:gap-4 ${desk ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={CARD}>
                  <div className="w-full aspect-[4/3]" style={{ background: 'var(--k-surface2)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded-full w-3/4" style={{ background: 'var(--k-surface2)' }} />
                    <div className="h-4 rounded-full w-1/2" style={{ background: 'var(--k-surface2)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={CARD}>
              <p className="text-sm font-bold" style={{ color: 'var(--k-text)' }}>No listings here yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--k-muted)' }}>Try another category, or check back soon.</p>
            </div>
          ) : (
            <div className={`grid gap-3 sm:gap-4 ${desk ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
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
                  className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] cursor-pointer"
                  style={CARD}
                >
                  <div className="relative w-full aspect-[4/3]" style={{ background: 'var(--k-surface2)' }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={32} style={{ color: 'var(--k-faint)' }} />
                      </div>
                    )}
                    {p.price_type === 'negotiable' && (
                      <span className="absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--k-bg)', color: 'var(--k-accent)', letterSpacing: '0.06em' }}>
                        NEGOTIABLE
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(p.id) }}
                      aria-label={likedIds.has(p.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      className="absolute top-1.5 right-1.5 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90"
                    >
                      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--k-bg)', opacity: 0.92 }}>
                        <Heart size={16} style={{ color: likedIds.has(p.id) ? 'var(--k-accent)' : 'var(--k-text)' }}
                          fill={likedIds.has(p.id) ? 'var(--k-accent)' : 'none'} />
                      </span>
                    </button>
                  </div>

                  <div className="px-3.5 pt-3 pb-3.5">
                    <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: 'var(--k-text)' }}>{p.title}</p>
                    <div className="flex items-center gap-1 mt-1 mb-2.5 min-w-0">
                      {p.store?.is_verified && <Star size={11} className="fill-yellow-400 text-yellow-400 shrink-0" />}
                      <span className="text-xs truncate" style={{ color: 'var(--k-muted)' }}>{p.store?.name ?? 'Store'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[15px] tabular-nums" style={{ color: 'var(--k-accent)' }}>{fmt(p.price_kobo)}</p>
                      {desk && (
                        <span className="inline-flex h-8 px-4 rounded-full items-center text-xs font-extrabold"
                          style={{ border: '1px solid var(--k-accent)', color: 'var(--k-accent)' }}>Buy</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

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
