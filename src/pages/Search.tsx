import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Tag, ArrowLeft, Star, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { UserTicks } from '@/components/Tick'

const CATEGORIES = ['All','Electronics','Fashion','Food','Auto Parts','Building Materials',
  'Phones','Computers','Furniture','Textiles','Jewellery','Health & Beauty',
  'Agriculture','Books','Toys','Sports']

const CONDITIONS = ['All','New','Used','Refurbished']
const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

interface Product {
  id: string
  title: string
  price_kobo: number
  is_negotiable: boolean
  condition: string
  category: string
  images: string[]
  location: string
  avg_rating: number
  rating_count: number
  store: { name: string; is_verified: boolean; owner_id?: string } | null
}

interface State { id: string; name: string; code: string }

// Mock products for dev mode
const MOCK_RESULTS: Product[] = [
  { id: '1', title: 'iPhone 14 Pro Max 256GB', price_kobo: 85000000, is_negotiable: true, condition: 'New', category: 'Phones', images: ['https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=300'], location: 'Lagos', avg_rating: 4.8, rating_count: 124, store: { name: 'TechHub Lagos', is_verified: true } },
  { id: '2', title: 'Samsung 55" QLED Smart TV', price_kobo: 32000000, is_negotiable: false, condition: 'New', category: 'Electronics', images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=300'], location: 'Abuja', avg_rating: 4.6, rating_count: 89, store: { name: 'Galaxy Electronics', is_verified: true } },
  { id: '3', title: 'Ankara Fabric (6 yards)', price_kobo: 1500000, is_negotiable: true, condition: 'New', category: 'Textiles', images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300'], location: 'Kano', avg_rating: 4.9, rating_count: 312, store: { name: 'Kantin Kwari Fabrics', is_verified: false } },
  { id: '4', title: 'Toyota Camry Gear Box', price_kobo: 8500000, is_negotiable: true, condition: 'Used', category: 'Auto Parts', images: ['https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300'], location: 'Lagos', avg_rating: 4.2, rating_count: 45, store: { name: 'Ladipo Motors', is_verified: true } },
  { id: '5', title: 'Dangote Cement 50kg (per bag)', price_kobo: 1200000, is_negotiable: false, condition: 'New', category: 'Building Materials', images: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300'], location: 'Port Harcourt', avg_rating: 4.7, rating_count: 203, store: { name: 'BuildRight PH', is_verified: true } },
  { id: '6', title: 'HP Laptop 15.6" Core i7 16GB RAM', price_kobo: 45000000, is_negotiable: true, condition: 'New', category: 'Computers', images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300'], location: 'Lagos', avg_rating: 4.5, rating_count: 67, store: { name: 'Computer Village Hub', is_verified: true } },
  { id: '7', title: 'Designer Agbada Set (3-piece)', price_kobo: 5500000, is_negotiable: true, condition: 'New', category: 'Fashion', images: ['https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=300'], location: 'Ibadan', avg_rating: 4.9, rating_count: 156, store: { name: 'Elegance Wears', is_verified: false } },
  { id: '8', title: 'Fresh Tomatoes (Paint bucket)', price_kobo: 400000, is_negotiable: true, condition: 'New', category: 'Food', images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300'], location: 'Kano', avg_rating: 4.3, rating_count: 88, store: { name: 'Mile 12 Farms', is_verified: false } },
]

export default function Search() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [states, setStates] = useState<State[]>([])

  // Filters
  const [category, setCategory] = useState('All')
  const [condition, setCondition] = useState('All')
  const [stateFilter, setStateFilter] = useState('All')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('trending')
  const [negotiableOnly, setNegotiableOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const formatPrice = (kobo: number) =>
    '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })

  // Load states for filter
  useEffect(() => {
    void supabase.from('ng_states').select('id,name,code').order('name')
      .then(({ data }) => { if (data) setStates(data) })
  }, [])

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      if (import.meta.env.DEV && !q.trim() && category === 'All') {
        // Show mock results in dev mode when no query
        await new Promise(r => setTimeout(r, 300))
        setResults(MOCK_RESULTS)
        return
      }

      let qb = supabase
        .from('products')
        .select('id,title,price_kobo,is_negotiable,condition,category,images,location,avg_rating,rating_count,stores(name,is_verified,owner_id)')
        .eq('is_active', true)

      if (q.trim()) qb = qb.ilike('title', `%${q.trim()}%`)
      if (category !== 'All') qb = qb.eq('category', category)
      if (condition !== 'All') qb = qb.eq('condition', condition)
      if (minPrice) qb = qb.gte('price_kobo', parseInt(minPrice) * 100)
      if (maxPrice) qb = qb.lte('price_kobo', parseInt(maxPrice) * 100)
      if (negotiableOnly) qb = qb.eq('is_negotiable', true)

      // Sort
      if (sort === 'newest') qb = qb.order('created_at', { ascending: false })
      else if (sort === 'price_asc') qb = qb.order('price_kobo', { ascending: true })
      else if (sort === 'price_desc') qb = qb.order('price_kobo', { ascending: false })
      else if (sort === 'rating') qb = qb.order('avg_rating', { ascending: false })
      else qb = qb.order('rating_count', { ascending: false })

      qb = qb.limit(40)

      const { data } = await qb
      if (data) {
        const mapped = (data as Record<string, unknown>[]).map(p => ({
          ...p,
          store: Array.isArray(p.stores) ? (p.stores[0] as Product['store'] ?? null) : null,
        })) as unknown as Product[]
        const filtered = verifiedOnly ? mapped.filter(p => p.store?.is_verified) : mapped
        setResults(filtered)
      } else {
        setResults(import.meta.env.DEV ? MOCK_RESULTS : [])
      }
    } finally {
      setLoading(false)
    }
  }, [category, condition, minPrice, maxPrice, sort, negotiableOnly, verifiedOnly])

  // Auto-search on filter change
  useEffect(() => {
    void runSearch(query)
  }, [runSearch, query])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams({ q: query })
    void runSearch(query)
  }

  const clearFilters = () => {
    setCategory('All'); setCondition('All'); setStateFilter('All')
    setMinPrice(''); setMaxPrice(''); setNegotiableOnly(false); setVerifiedOnly(false)
    setSort('trending')
  }

  const activeFilterCount = [
    category !== 'All', condition !== 'All', stateFilter !== 'All',
    minPrice, maxPrice, negotiableOnly, verifiedOnly
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-surface-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => void navigate(-1)} className="text-ink-muted hover:text-ink-base p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 bg-surface-1 rounded-2xl px-4 py-2">
            <SearchIcon className="w-4 h-4 text-ink-muted flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products, stores, markets..."
              className="flex-1 bg-transparent text-sm text-ink-base placeholder:text-ink-muted outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); void runSearch('') }}>
                <X className="w-4 h-4 text-ink-muted" />
              </button>
            )}
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-xl transition-colors ${showFilters ? 'bg-brand-500 text-white' : 'bg-surface-1 text-ink-muted'}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 space-y-3 pb-1">
            {/* Category */}
            <div>
              <p className="text-xs text-ink-muted mb-1.5 font-medium">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                      category === c ? 'bg-brand-500 text-white' : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition + Sort row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs text-ink-muted mb-1 font-medium">Condition</p>
                <div className="flex gap-1">
                  {CONDITIONS.map(c => (
                    <button key={c} onClick={() => setCondition(c)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        condition === c ? 'bg-brand-500 text-white' : 'bg-surface-1 text-ink-muted'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-ink-muted mb-1 font-medium">Sort by</p>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    className="w-full bg-surface-1 text-ink-base text-xs rounded-xl px-3 py-2 appearance-none outline-none"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-xs text-ink-muted mb-1.5 font-medium">Price Range (₦)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="flex-1 bg-surface-1 text-ink-base text-xs rounded-xl px-3 py-2 outline-none placeholder:text-ink-muted"
                />
                <span className="text-ink-muted text-xs">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="flex-1 bg-surface-1 text-ink-base text-xs rounded-xl px-3 py-2 outline-none placeholder:text-ink-muted"
                />
              </div>
            </div>

            {/* Toggles + State */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setNegotiableOnly(!negotiableOnly)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${negotiableOnly ? 'bg-brand-500' : 'bg-surface-2'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${negotiableOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-ink-muted">Negotiable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${verifiedOnly ? 'bg-brand-500' : 'bg-surface-2'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${verifiedOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-ink-muted">Verified stores only</span>
              </label>
            </div>

            {/* State filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="w-full bg-surface-1 text-ink-base text-xs rounded-xl pl-8 pr-4 py-2 appearance-none outline-none"
              >
                <option value="All">All States</option>
                {states.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted pointer-events-none" />
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="w-full py-2 text-xs text-brand-400 hover:text-brand-300 font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}${query ? ` for "${query}"` : ''}`}
        </p>
        {!showFilters && (
          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <Tag className="w-3 h-3" />
            <span>{category !== 'All' ? category : 'All categories'}</span>
          </div>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-1 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-surface-2" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-surface-2 rounded w-3/4" />
                <div className="h-4 bg-surface-2 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 bg-surface-1 rounded-full flex items-center justify-center mb-4">
            <SearchIcon className="w-8 h-8 text-ink-muted" />
          </div>
          <p className="text-ink-base font-semibold text-lg mb-1">No results found</p>
          <p className="text-ink-muted text-sm text-center">
            {query ? `Nothing matched "${query}"` : 'Try a different search term or adjust your filters'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {results.map(product => (
            <button
              key={product.id}
              onClick={() => void navigate(`/product/${product.id}`)}
              className="bg-surface-1 rounded-2xl overflow-hidden text-left hover:bg-surface-2 transition-colors"
            >
              <div className="aspect-square relative">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                    <Tag className="w-8 h-8 text-ink-muted" />
                  </div>
                )}
                {product.is_negotiable && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-lg font-medium">
                    Negotiable
                  </span>
                )}
                {product.store?.is_verified && (
                  <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-lg font-medium">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-ink-base text-sm font-semibold line-clamp-2 leading-tight mb-1">
                  {product.title}
                </p>
                <p className="text-brand-400 font-bold text-base">
                  {formatPrice(product.price_kobo)}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-ink-muted">
                      {product.avg_rating > 0 ? product.avg_rating.toFixed(1) : 'New'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-muted">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{product.location}</span>
                  </div>
                </div>
                {product.store && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1"><span className="truncate">{product.store.name}</span><UserTicks userId={product.store.owner_id} size={13} plain legacyVerified={!!product.store.is_verified} /></p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
