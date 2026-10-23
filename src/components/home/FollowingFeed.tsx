import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDesk } from '@/hooks/useDesk'
import { UserTicks } from '@/components/Tick'

type Item = {
  id: string
  title: string
  price_kobo: number
  images: string[]
  store: { name: string; owner_id: string } | null
}

const naira = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG')

/** New listings from sellers the signed-in user follows, or a friendly nudge to follow some. */
export default function FollowingFeed() {
  const navigate = useNavigate()
  const desk = useDesk()
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [followsAnyone, setFollowsAnyone] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
      const ids = (f ?? []).map(r => (r as { following_id: string }).following_id)
      setFollowsAnyone(ids.length > 0)
      if (ids.length === 0) { setItems([]); setLoaded(true); return }

      const { data } = await supabase
        .from('products')
        .select('id,title,price_kobo,images,store:stores!inner(name,owner_id)')
        .eq('status', 'active')
        .in('store.owner_id', ids)
        .order('created_at', { ascending: false })
        .limit(8)
      setItems((data ?? []) as unknown as Item[])
      setLoaded(true)
    })()
  }, [user])

  if (!loaded) return null

  return (
    <section className="px-4 pt-8">
      <h2 className="text-xl font-extrabold tracking-tight mb-3.5" style={{ color: 'var(--k-text)' }}>New from sellers you follow</h2>

      {items.length === 0 ? (
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
          <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--k-accent-soft)', color: 'var(--k-accent)' }}>
            <Users size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--k-text)' }}>
              {followsAnyone ? 'Nothing new yet' : 'Follow sellers to see their new items here.'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--k-muted)' }}>
              {followsAnyone ? 'When the sellers you follow post, it shows up here.' : 'Pick a few and their latest listings land in this feed.'}
            </p>
          </div>
          {!followsAnyone && (
            <button onClick={() => void navigate('/people')} className="h-9 px-4 rounded-full text-xs font-extrabold shrink-0"
              style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
              Find sellers
            </button>
          )}
        </div>
      ) : (
        <div className={`grid gap-3 ${desk ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {items.map(p => (
            <button key={p.id} onClick={() => void navigate(`/product/${p.id}`)}
              className="rounded-2xl overflow-hidden text-left transition-transform active:scale-[0.97]"
              style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
              <div className="h-[170px]" style={{ background: 'var(--k-surface2)' }}>
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center"><Package size={30} style={{ color: 'var(--k-faint)' }} /></div>}
              </div>
              <div className="px-3.5 pt-3 pb-3.5">
                <p className="text-sm font-bold line-clamp-1" style={{ color: 'var(--k-text)' }}>{p.title}</p>
                <p className="text-xs mt-0.5 mb-2 flex items-center gap-1" style={{ color: 'var(--k-muted)' }}><span className="truncate">{p.store?.name}</span><UserTicks userId={p.store?.owner_id} size={12} plain /></p>
                <p className="font-mono text-[15px] tabular-nums" style={{ color: 'var(--k-accent)' }}>{naira(p.price_kobo)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
