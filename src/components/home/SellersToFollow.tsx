import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserTicks } from '@/components/Tick'

type Seller = { id: string; owner_id: string; name: string; logo_url: string | null; state: string | null }


/** Right-rail card on wide screens: three sellers you don't follow yet, with a Follow button. */
export default function SellersToFollow() {
  const { user } = useAuth()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
      const followed = new Set((f ?? []).map(r => (r as { following_id: string }).following_id))
      const { data } = await supabase
        .from('stores')
        .select('id,owner_id,name,logo_url,state')
        .neq('owner_id', user.id)
        .order('followers_count', { ascending: false })
        .limit(12)
      const rows = ((data ?? []) as unknown as Seller[]).filter(s => !followed.has(s.owner_id)).slice(0, 3)
      setSellers(rows)
    })()
  }, [user])

  const list = sellers
  if (list.length === 0) return null

  async function follow(s: Seller) {
    setDone(prev => new Set(prev).add(s.id))
    if (!user) return
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: s.owner_id })
    if (error) setDone(prev => { const n = new Set(prev); n.delete(s.id); return n })
  }

  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.12em] mb-1.5" style={{ color: 'var(--k-muted)' }}>SELLERS TO FOLLOW</p>
      <div className="flex flex-col">
        {list.map(s => (
          <div key={s.id} className="flex items-center gap-3 py-2">
            {s.logo_url
              ? <img src={s.logo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              : <span className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold" style={{ background: 'var(--k-surface2)', color: 'var(--k-text)' }}>{s.name[0]?.toUpperCase()}</span>}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold flex items-center gap-1" style={{ color: 'var(--k-text)' }}><span className="truncate">{s.name}</span><UserTicks userId={s.owner_id} size={13} /></p>
              <p className="text-[11px] truncate" style={{ color: 'var(--k-muted)' }}>{s.state ?? 'Seller'}</p>
            </div>
            <button
              onClick={() => void follow(s)}
              disabled={done.has(s.id)}
              className="h-8 px-4 rounded-full text-xs font-bold transition-transform active:scale-95"
              style={{ border: '1px solid var(--k-line2)', color: 'var(--k-text)', opacity: done.has(s.id) ? 0.7 : 1 }}
            >
              {done.has(s.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
