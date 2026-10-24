import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Hash, TrendingUp, Flame, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface HashtagStat {
  tag: string
  count: number
  category: 'products' | 'groups' | 'both'
  relatedMarkets: string[]
}

// Trending mock data for dev mode
const DEV_TRENDING: HashtagStat[] = [
  { tag: '#ankara', count: 412, category: 'both', relatedMarkets: ['Balogun Market', 'Onitsha Market'] },
  { tag: '#phones', count: 387, category: 'both', relatedMarkets: ['Computer Village Ikeja', 'Alaba Market'] },
  { tag: '#laptops', count: 298, category: 'groups', relatedMarkets: ['Computer Village Ikeja'] },
  { tag: '#fabric', count: 271, category: 'both', relatedMarkets: ['Balogun Market', 'Aba Market'] },
  { tag: '#secondhand', count: 234, category: 'products', relatedMarkets: ['Yaba Market', 'Ladipo Auto Market'] },
  { tag: '#electronics', count: 198, category: 'groups', relatedMarkets: ['Alaba Market', 'Computer Village Ikeja'] },
  { tag: '#foodstuff', count: 187, category: 'both', relatedMarkets: ['Mile 12 Market', 'Bodija Market'] },
  { tag: '#shoes', count: 176, category: 'products', relatedMarkets: ['Trade Fair Lagos', 'Ariaria Market'] },
  { tag: '#cosmetics', count: 165, category: 'products', relatedMarkets: ['Balogun Market', 'Wuse Market'] },
  { tag: '#building', count: 154, category: 'groups', relatedMarkets: ['Building Materials Market'] },
  { tag: '#toyota', count: 143, category: 'both', relatedMarkets: ['Ladipo Auto Market'] },
  { tag: '#wholesale', count: 132, category: 'groups', relatedMarkets: ['Onitsha Main Market', 'Trade Fair Lagos'] },
  { tag: '#newstock', count: 121, category: 'products', relatedMarkets: ['Balogun Market'] },
  { tag: '#urgent', count: 118, category: 'both', relatedMarkets: [] },
  { tag: '#reduced', count: 109, category: 'products', relatedMarkets: [] },
  { tag: '#honda', count: 98, category: 'groups', relatedMarkets: ['Ladipo Auto Market'] },
  { tag: '#wrappers', count: 91, category: 'both', relatedMarkets: ['Balogun Market', 'Aba Market'] },
  { tag: '#generator', count: 87, category: 'both', relatedMarkets: ['Alaba Market'] },
  { tag: '#frozen', count: 83, category: 'products', relatedMarkets: ['Mile 12 Market'] },
  { tag: '#agric', count: 79, category: 'groups', relatedMarkets: ['Bodija Market', 'Wuse Market'] },
]

export default function Trending() {
  const navigate = useNavigate()
  const [trending, setTrending] = useState<HashtagStat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'products' | 'groups'>('all')

  useEffect(() => {
    const load = async () => {
      if (import.meta.env.DEV) {
        setTrending(DEV_TRENDING)
        setLoading(false)
        return
      }
      // Real: aggregate hashtags from products and group_posts
      const [{ data: pData }, { data: gData }] = await Promise.all([
        supabase.from('products').select('hashtags').not('hashtags', 'is', null).order('created_at', { ascending: false }).limit(500),
        supabase.from('group_posts').select('hashtags').not('hashtags', 'is', null).order('created_at', { ascending: false }).limit(500),
      ])
      const counts: Record<string, { count: number; sources: Set<string> }> = {}
      const addTags = (tags: string[] | null, source: string) => {
        if (!tags) return
        tags.forEach(tag => {
          if (!counts[tag]) counts[tag] = { count: 0, sources: new Set() }
          counts[tag].count++
          counts[tag].sources.add(source)
        })
      }
      ;(pData ?? []).forEach((r: { hashtags: string[] | null }) => addTags(r.hashtags, 'products'))
      ;(gData ?? []).forEach((r: { hashtags: string[] | null }) => addTags(r.hashtags, 'groups'))
      const stats: HashtagStat[] = Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 50)
        .map(([tag, { count, sources }]) => ({
          tag,
          count,
          category: sources.has('products') && sources.has('groups') ? 'both'
            : sources.has('products') ? 'products' : 'groups',
          relatedMarkets: [],
        }))
      setTrending(stats)
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = trending.filter(t => {
    if (filter !== 'all' && t.category !== 'both' && t.category !== filter) return false
    if (search && !t.tag.includes(search.toLowerCase().replace(/^#?/, '#'))) return false
    return true
  })

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-xl hover:bg-zinc-800">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <TrendingUp size={18} className="text-brand-500" />
          <h1 className="text-lg font-bold text-white font-display">Trending</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hashtags..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {(['all', 'products', 'groups'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-colors
                ${filter === f ? 'bg-brand-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Top 3 — featured cards */}
            {top3.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">🔥 Hot right now</p>
                <div className="grid grid-cols-3 gap-2">
                  {top3.map((item, idx) => (
                    <button
                      key={item.tag}
                      onClick={() => void navigate(`/search?q=${encodeURIComponent(item.tag)}`)}
                      className="bg-zinc-900 rounded-2xl p-3 text-left border border-zinc-800 active:scale-95 transition-transform relative overflow-hidden"
                    >
                      {idx === 0 && (
                        <div className="absolute top-2 right-2">
                          <Flame size={14} className="text-orange-400" />
                        </div>
                      )}
                      <Hash size={16} className="text-brand-500 mb-1" />
                      <p className="text-white text-xs font-bold truncate">{item.tag.replace('#', '')}</p>
                      <p className="text-zinc-500 text-xs">{item.count.toLocaleString()} posts</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full ranked list */}
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">All trending</p>
              <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                {rest.map((item, idx) => (
                  <button
                    key={item.tag}
                    onClick={() => void navigate(`/search?q=${encodeURIComponent(item.tag)}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-zinc-800 transition-colors text-left"
                  >
                    <span className="text-xs text-zinc-600 w-5 text-right shrink-0">{idx + 4}</span>
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                      <Hash size={14} className="text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{item.tag}</p>
                      {item.relatedMarkets.length > 0 && (
                        <p className="text-xs text-zinc-500 truncate">{item.relatedMarkets.slice(0, 2).join(' · ')}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-zinc-300">{item.count.toLocaleString()}</p>
                      <p className="text-xs text-zinc-600">posts</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Hash size={36} className="text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No hashtags found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
