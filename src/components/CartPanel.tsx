import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle, Store } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getOrCreateConversation } from '@/lib/chat'
import { useAuth } from '@/hooks/useAuth'
import { isStaff } from '@/lib/staff'
import { useCart, useCartPanel, openCart, closeCart } from '@/hooks/useCart'

const naira = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

/** Cart icon with a count. Opens the cart panel. Hidden for staff accounts. */
export function CartButton({ size = 18, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const { profile } = useAuth()
  const { count } = useCart()
  if (isStaff(profile?.roles)) return null
  return (
    <button onClick={openCart} aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'} className={`relative flex items-center justify-center shrink-0 ${className}`} style={style}>
      <ShoppingCart size={size} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
          style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

/** Slide-in cart: add and remove items, change quantity, chat with each seller, go to checkout. */
export default function CartPanel() {
  const navigate = useNavigate()
  const { open } = useCartPanel()
  const { items, remove, updateQty, clear, total, count } = useCart()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const stores = useMemo(() => {
    const m = new Map<string, { id: string; name: string; items: typeof items }>()
    for (const it of items) {
      const key = it.store_id || it.store_name
      if (!m.has(key)) m.set(key, { id: it.store_id, name: it.store_name || 'Store', items: [] })
      m.get(key)!.items.push(it)
    }
    return Array.from(m.values())
  }, [items])

  async function chat(storeId: string, ownerId?: string) {
    let owner = ownerId
    if (!owner && storeId) {
      const { data } = await supabase.from('stores').select('owner_id').eq('id', storeId).maybeSingle()
      owner = (data as { owner_id?: string } | null)?.owner_id
    }
    if (!owner) { toast.error('This seller cannot be messaged yet'); return }
    const cid = await getOrCreateConversation(owner)
    if (cid) { closeCart(); void navigate(`/inbox/${cid}`) }
    else toast.error('Sign in to message the seller')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label="Cart">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={closeCart} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[400px] flex flex-col"
        style={{ background: 'var(--k-bg)', borderLeft: '1px solid var(--k-line)', color: 'var(--k-text)' }}>
        <div className="flex items-center gap-2 px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--k-line)' }}>
          <ShoppingCart size={18} />
          <h2 className="flex-1 text-lg font-extrabold">Cart {count > 0 && <span style={{ color: 'var(--k-muted)' }}>({count})</span>}</h2>
          {items.length > 0 && <button onClick={clear} className="text-xs font-bold" style={{ color: 'var(--k-muted)' }}>Clear all</button>}
          <button onClick={closeCart} aria-label="Close cart" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: 'var(--k-muted)' }}><X size={18} /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--k-surface2)' }}><ShoppingCart size={28} style={{ color: 'var(--k-muted)' }} /></span>
            <p className="font-extrabold">Your cart is empty</p>
            <p className="text-sm" style={{ color: 'var(--k-muted)' }}>Tap Add on any item to put it here. You can add from different stores.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
            {stores.map(st => {
              const sub = st.items.reduce((a, i) => a + i.price * i.quantity, 0)
              return (
                <div key={st.id || st.name} className="rounded-2xl overflow-hidden" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
                  <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderBottom: '1px solid var(--k-line)' }}>
                    <Store size={14} style={{ color: 'var(--k-muted)' }} />
                    <p className="flex-1 min-w-0 text-sm font-extrabold truncate">{st.name}</p>
                    <button onClick={() => void chat(st.id, st.items[0]?.owner_id)}
                      className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-extrabold"
                      style={{ border: '1px solid var(--k-accent)', color: 'var(--k-accent)' }}>
                      <MessageCircle size={13} /> Chat
                    </button>
                  </div>
                  {st.items.map(it => (
                    <div key={it.product_id} className="flex items-center gap-3 p-3.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--k-surface2)' }}>
                        {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold line-clamp-1">{it.title}</p>
                        <p className="font-mono text-sm tabular-nums" style={{ color: 'var(--k-accent)' }}>{naira(it.price)}</p>
                        <div className="inline-flex items-center gap-3 mt-1 rounded-full px-2.5 h-7" style={{ background: 'var(--k-surface2)' }}>
                          <button onClick={() => updateQty(it.product_id, it.quantity - 1)} aria-label="Less"><Minus size={13} /></button>
                          <span className="text-xs font-extrabold w-4 text-center">{it.quantity}</span>
                          <button onClick={() => updateQty(it.product_id, it.quantity + 1)} aria-label="More"><Plus size={13} /></button>
                        </div>
                      </div>
                      <button onClick={() => remove(it.product_id)} aria-label="Remove" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: '#F87171' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <div className="flex justify-between px-3.5 py-2.5 text-xs" style={{ borderTop: '1px solid var(--k-line)', color: 'var(--k-muted)' }}>
                    <span>Store subtotal</span><span className="font-mono font-bold" style={{ color: 'var(--k-text)' }}>{naira(sub)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="shrink-0 p-4" style={{ borderTop: '1px solid var(--k-line)' }}>
            <div className="flex justify-between mb-3 text-sm">
              <span style={{ color: 'var(--k-muted)' }}>Subtotal</span>
              <span className="font-mono font-extrabold text-base">{naira(total)}</span>
            </div>
            <button onClick={() => { closeCart(); void navigate('/cart') }}
              className="w-full h-12 rounded-xl font-extrabold text-sm" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
              Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
