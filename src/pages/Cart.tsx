import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

function toNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

export default function Cart() {
  const navigate = useNavigate()
  const { items, remove, updateQty, total, clear } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-ink-muted" />
        </div>
        <h2 className="text-xl font-bold text-ink-base">Your cart is empty</h2>
        <p className="text-ink-muted text-sm text-center">Browse the marketplace and add items to your cart</p>
        <button onClick={() => void navigate('/home')}
          className="px-6 py-3 bg-brand-500 text-white rounded-2xl font-semibold">
          Browse Products
        </button>
      </div>
    )
  }

  const subtotal = total
  const fee = Math.round(subtotal * 0.015)
  const cashback = Math.round(subtotal * 0.005)
  const grandTotal = subtotal + fee - cashback

  return (
    <div className="min-h-screen bg-canvas pb-32 pt-16">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-ink-base">Cart ({items.length})</h1>
          <button onClick={clear} className="text-sm text-red-400 hover:text-red-300">Clear all</button>
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <div key={item.product_id} className="bg-surface-1 rounded-2xl p-3 flex items-center gap-3 border border-white/8">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-base truncate">{item.title}</p>
                <p className="text-xs text-ink-muted">{item.store_name}</p>
                <p className="text-brand-400 font-bold mt-0.5">{toNaira(item.price * 100)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => remove(item.product_id)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-2 py-1">
                  <button onClick={() => updateQty(item.product_id, item.quantity - 1)}>
                    <Minus className="w-3 h-3 text-ink-muted" />
                  </button>
                  <span className="text-sm font-bold text-ink-base w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, item.quantity + 1)}>
                    <Plus className="w-3 h-3 text-ink-muted" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-surface-1 rounded-2xl p-4 mt-6 space-y-3 border border-white/8">
          <h3 className="font-semibold text-ink-base">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span>{toNaira(subtotal * 100)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Platform fee (1.5%)</span>
              <span>{toNaira(fee * 100)}</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>Cashback (0.5%)</span>
              <span>-{toNaira(cashback * 100)}</span>
            </div>
            <div className="flex justify-between font-bold text-ink-base pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-brand-400">{toNaira(grandTotal * 100)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-canvas/90 backdrop-blur-md border-t border-white/8">
        <button
          onClick={() => void navigate('/checkout', { state: { items, total: grandTotal } })}
          className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold text-lg"
        >
          Checkout — {toNaira(grandTotal * 100)}
        </button>
      </div>
    </div>
  )
}
