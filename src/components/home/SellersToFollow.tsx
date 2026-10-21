import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type Seller = { id: string; owner_id: string; name: string; logo_url: string | null; state: string | null }

const TINTS = ['#C4561A', '#2A4B7A', '#1F7A4D']

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
    <div className="rounded-3xl p-4" style={{ background: '#100D14', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[11px] font-bold tracking-[0.12em] mb-3.5" style={{ color: '#A59DA8' }}>SELLERS TO FOLLOW</p>
      <div className="flex flex-col gap-3.5">
        {list.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            {s.logo_url
              ? <img src={s.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <span className="w-10 h-10 rounded-full shrink-0" style={{ background: TINTS[i % 3] }} />}
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold truncate">{s.name}</p>
              <p className="text-[11px] truncate" style={{ color: '#A59DA8' }}>{s.state ?? 'Seller'}</p>
            </div>
            <button
              onClick={() => void follow(s)}
              disabled={done.has(s.id)}
              className="h-9 px-4 rounded-full text-[13px] font-bold text-white transition-transform active:scale-95"
              style={{ background: done.has(s.id) ? 'rgba(255,255,255,0.06)' : 'transparent', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              {done.has(s.id) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
