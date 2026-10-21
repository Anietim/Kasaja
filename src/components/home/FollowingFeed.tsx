import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDesk } from '@/hooks/useDesk'

type Item = {
  id: string
  title: string
  price_kobo: number
  images: string[]
  store: { name: string; owner_id: string } | null
}

const naira = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG')

/** New listings from sellers the signed-in user follows. Renders nothing until they follow someone. */
export default function FollowingFeed() {
  const navigate = useNavigate()
  const desk = useDesk()
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
      const ids = (f ?? []).map(r => (r as { following_id: string }).following_id)
      if (ids.length === 0) { setItems([]); return }

      const { data } = await supabase
        .from('products')
        .select('id,title,price_kobo,images,store:stores!inner(name,owner_id)')
        .eq('status', 'active')
        .in('store.owner_id', ids)
        .order('created_at', { ascending: false })
        .limit(8)
      setItems((data ?? []) as unknown as Item[])
    })()
  }, [user])

  if (items.length === 0) return null
  const list = items

  return (
    <section className="px-4 pt-8">
      <h2 className="text-white text-xl font-extrabold tracking-tight mb-3.5">New from sellers you follow</h2>
      <div className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {list.map(p => (
          <button key={p.id} onClick={() => void navigate(`/product/${p.id}`)}
            className="rounded-3xl overflow-hidden text-left transition-transform active:scale-[0.97]"
            style={{ background: '#100D14', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="h-[170px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center"><Package size={30} style={{ color: 'rgba(255,255,255,0.1)' }} /></div>}
            </div>
            <div className="px-3.5 pt-3 pb-3.5">
              <p className="text-white text-sm font-bold line-clamp-1">{p.title}</p>
              <p className="text-xs mt-0.5 mb-2 line-clamp-1" style={{ color: '#A59DA8' }}>{p.store?.name}</p>
              <p className="font-mono text-[15px] tabular-nums" style={{ color: '#FF9A4D' }}>{naira(p.price_kobo)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}