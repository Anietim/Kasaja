import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ShoppingCart, MessageSquare, Store, Loader2, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { getOrCreateConversation } from '@/lib/chat'
import { UserTicks } from '@/components/Tick'

interface ProductRow {
  id: string
  title: string
  description: string | null
  price_kobo: number
  images: string[] | null
  category: string | null
  condition: string | null
  location: string | null
  quantity: number | null
  store: { id: string; name: string; owner_id: string; is_verified: boolean | null } | null
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const cart = useCart()
  const [p, setP] = useState<ProductRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [img, setImg] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const { data } = await supabase
        .from('products')
        .select('id,title,description,price_kobo,images,category,condition,location,quantity,store:stores(id,name,owner_id,is_verified)')
        .eq('id', id)
        .maybeSingle()
      setP((data as unknown as ProductRow | null) ?? null)
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="min-h-screen bg-canvas flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>
  if (!p) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-3">
      <p className="text-neutral-400">Product not found.</p>
      <button onClick={() => void navigate('/home')} className="text-brand-400">Back to home</button>
    </div>
  )

  const images = p.images ?? []
  const isOwner = !!user && p.store?.owner_id === user.id
  const item = {
    id: p.id, product_id: p.id, title: p.title, price: p.price_kobo / 100,
    image: images[0] ?? '', store_id: p.store?.id ?? '', store_name: p.store?.name ?? '',
  }

  function addToCart() {
    cart.add({ ...item, quantity: 1 })
    toast.success('Added to cart')
  }
  function buyNow() {
    void navigate('/checkout', { state: { items: [{ ...item, quantity: 1 }], total: undefined } })
  }
  async function message() {
    if (!p?.store) return
    setBusy(true)
    const cid = await getOrCreateConversation(p.store.owner_id)
    setBusy(false)
    if (cid) void navigate(`/inbox/${cid}`)
    else toast.error('Sign in to message the seller')
  }

  return (
    <div className="min-h-screen bg-canvas pb-40">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="font-bold text-white truncate">{p.title}</h1>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="aspect-square bg-surface-900 flex items-center justify-center overflow-hidden">
          {images[img] ? <img src={images[img]} alt="" className="w-full h-full object-cover" /> : <span className="text-neutral-600">No image</span>}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
            {images.map((src, i) => (
              <button key={i} onClick={() => setImg(i)} className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${i === img ? 'border-brand-500' : 'border-transparent'}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-4 space-y-3">
          <p className="text-2xl font-bold text-brand-400">{naira(p.price_kobo)}</p>
          <h2 className="text-lg font-semibold text-white">{p.title}</h2>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            {p.condition && <span className="px-2.5 py-1 rounded-full bg-surface-800 capitalize">{p.condition}</span>}
            {p.category && <span className="px-2.5 py-1 rounded-full bg-surface-800">{p.category}</span>}
            {p.quantity != null && <span className="px-2.5 py-1 rounded-full bg-surface-800">{p.quantity} available</span>}
            {p.location && <span className="px-2.5 py-1 rounded-full bg-surface-800 flex items-center gap-1"><MapPin size={11} />{p.location}</span>}
          </div>
          {p.description && <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">{p.description}</p>}

          {p.store && (
            <button onClick={() => void navigate(`/store/${p.store!.id}`)} className="w-full flex items-center gap-3 bg-surface-900 rounded-2xl p-4 text-left">
              <Store className="text-brand-500" size={20} />
              <span className="flex-1 text-white font-semibold flex items-center gap-1">{p.store.name}<UserTicks userId={p.store.owner_id} size={16} plain legacyVerified={!!p.store.is_verified} /></span>
              <span className="text-xs text-neutral-400">View store</span>
            </button>
          )}
        </div>
      </div>

      {!isOwner && (
        <div className="fixed bottom-16 z-40 inset-x-0 bg-canvas/95 backdrop-blur border-t border-surface-800 px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-lg mx-auto flex gap-2">
            <button onClick={() => void message()} disabled={busy} className="p-3.5 rounded-xl bg-surface-800 text-white"><MessageSquare size={18} /></button>
            <button onClick={addToCart} className="flex-1 bg-surface-800 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"><ShoppingCart size={16} /> Add to cart</button>
            <button onClick={buyNow} className="flex-1 bg-brand-500 text-white font-semibold py-3.5 rounded-xl">Buy now</button>
          </div>
        </div>
      )}
    </div>
  )
}