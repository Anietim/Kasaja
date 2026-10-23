import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, MessageCircle, Heart, Package, ChevronLeft, Share2 } from 'lucide-react'
import { UserTicks } from '@/components/Tick'
import { supabase } from '@/lib/supabase'
import { getOrCreateConversation } from '@/lib/chat'
import { toast } from 'sonner'

interface Store {
  id: string; name: string; description?: string; logo_url?: string; banner_url?: string
  owner_id?: string; is_verified: boolean; avg_rating: number; rating_count: number; followers_count: number
  market?: { name: string }; products_count?: number
}

interface Product {
  id: string; title: string; price_kobo: number; images: string[]; likes_count: number; price_type: string
}

export default function StoreProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (!id) { setStore(null); setProducts([]); setLoading(false); return }
    const storeRes = await supabase.from('stores').select('*, market:ng_markets(name)').eq('id', id).single()
    const prodRes = await supabase.from('products').select('id, title, price_kobo, images, likes_count, price_type').eq('store_id', id).eq('status', 'active').limit(20)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (storeRes.data) setStore(storeRes.data)
    else setStore(null)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (prodRes.data && prodRes.data.length > 0) setProducts(prodRes.data)
    else setProducts([])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => { void load() }, [load])

  const fmt = (k: number) => '₦' + (k / 100).toLocaleString('en-NG')

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!store) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" style={{ color: 'var(--k-text)' }}>
      <p className="text-lg font-extrabold">Store not found</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--k-muted)' }}>This store may have been removed.</p>
      <button onClick={() => void navigate(-1)} className="mt-4 h-10 px-5 rounded-xl text-sm font-extrabold" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>Go back</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-brand-600 to-brand-800">
        {store?.banner_url && <img src={store.banner_url} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/30" />
        <button onClick={() => void navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Store info */}
      <div className="bg-surface px-4 pb-4 -mt-8 relative">
        <div className="flex items-end justify-between mb-3">
          <div className="w-16 h-16 rounded-2xl bg-canvas border-2 border-surface flex items-center justify-center overflow-hidden">
            {store?.logo_url
              ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
              : <Package className="w-8 h-8 text-muted" />
            }
          </div>
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => {
      const ownerId = (store as unknown as { owner_id?: string } | null)?.owner_id
      if (!ownerId) { toast.error('This store cannot be messaged yet'); return }
      void getOrCreateConversation(ownerId).then(cid => {
      if (cid) void navigate(`/inbox/${cid}`)
      else toast.error('Could not open chat. Please sign in and try again.')
      })
      }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white text-sm"
            >
              <MessageCircle className="w-4 h-4" /> Message
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium">
              Follow
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-display font-bold text-white">{store?.name}</h1>
          <UserTicks userId={store?.owner_id} legacyVerified={!!store?.is_verified} size={20} />
        </div>
        {store?.market?.name && (
          <p className="text-muted text-sm flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />{store.market.name}
          </p>
        )}
        {store?.description && <p className="text-muted text-sm mt-2">{store.description}</p>}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Rating', val: `${(store?.avg_rating ?? 0).toFixed(1)} ★` },
            { label: 'Reviews', val: (store?.rating_count ?? 0).toLocaleString() },
            { label: 'Followers', val: (store?.followers_count ?? 0).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-sm">{s.val}</p>
              <p className="text-muted text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-white mb-3">Products ({products.length})</h2>
        {products.length === 0 ? (
          <div className="text-center py-12 text-muted">No products listed yet</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <button key={p.id} onClick={() => void navigate(`/product/${p.id}`)}
                className="bg-surface rounded-2xl overflow-hidden text-left">
                <div className="relative w-full aspect-square bg-white/5">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-white/10" /></div>
                  }
                  {p.price_type === 'negotiable' && (
                    <span className="absolute top-2 left-2 bg-brand-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEGO</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white text-sm font-semibold line-clamp-2">{p.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-brand-400 font-bold text-sm">{fmt(p.price_kobo)}</p>
                    <span className="text-muted text-xs flex items-center gap-0.5">
                      <Heart className="w-3 h-3" />{p.likes_count ?? 0}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
