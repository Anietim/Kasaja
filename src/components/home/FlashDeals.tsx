import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Deal = {
  id: string
  title: string
  price_kobo: number
  flash_price_kobo: number
  flash_expires_at: string
  images: string[]
}

const naira = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG')

function useCountdown(target: string | null) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!target) return
    const tick = () => setLeft(Math.max(0, new Date(target).getTime() - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [target])
  const s = Math.floor(left / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { text: `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`, over: left === 0 }
}

export default function FlashDeals() {
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('products')
        .select('id,title,price_kobo,flash_price_kobo,flash_expires_at,images')
        .eq('status', 'active')
        .eq('is_flash_deal', true)
        .gt('flash_expires_at', new Date().toISOString())
        .not('flash_price_kobo', 'is', null)
        .order('flash_expires_at', { ascending: true })
        .limit(10)
      setDeals((data ?? []) as unknown as Deal[])
    })()
  }, [])

  // Timer shows the soonest-ending deal.
  const { text, over } = useCountdown(deals[0]?.flash_expires_at ?? null)
  if (deals.length === 0 || over) return null
  const list = deals
  const clock = text

  return (
    <section className="pt-7">
      <div className="flex items-center justify-between px-4 pb-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--k-text)' }}>Flash deals</h2>
          <span className="font-mono text-[13px] px-2 py-1 rounded-lg tabular-nums"
            style={{ color: 'var(--k-accent)', border: '1px solid var(--k-accent)' }}
            aria-label={`Next deal ends in ${clock}`}>{clock}</span>
        </div>
        <button onClick={() => void navigate('/search?q=deals')} className="min-h-11 text-sm font-bold" style={{ color: 'var(--k-accent)' }}>See all</button>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
        {list.map(d => {
          const off = Math.round((1 - d.flash_price_kobo / d.price_kobo) * 100)
          return (
            <button key={d.id} onClick={() => void navigate(`/product/${d.id}`)}
              className="shrink-0 w-[200px] rounded-3xl overflow-hidden text-left transition-transform active:scale-[0.97]"
              style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
              <div className="relative h-[150px]" style={{ background: 'var(--k-surface2)' }}>
                {d.images?.[0]
                  ? <img src={d.images[0]} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center"><Package size={30} style={{ color: 'var(--k-faint)' }} /></div>}
                {off > 0 && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-extrabold"
                    style={{ background: 'var(--k-bg)', color: 'var(--k-accent)' }}>-{off}%</span>
                )}
              </div>
              <div className="p-3.5">
                <p className="text-[15px] font-bold line-clamp-1" style={{ color: 'var(--k-text)' }}>{d.title}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-mono text-base tabular-nums" style={{ color: 'var(--k-text)' }}>{naira(d.flash_price_kobo)}</span>
                  <span className="font-mono text-xs line-through" style={{ color: 'var(--k-faint)' }}>{d.price_kobo !== d.flash_price_kobo ? naira(d.price_kobo) : ''}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}