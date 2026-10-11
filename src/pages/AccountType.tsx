import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Store, Bike } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ROLES = [
  { id: 'buyer', label: 'Buyer', sub: 'Shop from sellers across Nigeria', icon: ShoppingBag, color: 'text-blue-400' },
  { id: 'seller', label: 'Seller', sub: 'List and sell your products', icon: Store, color: 'text-green-400' },
  { id: 'rider', label: 'Rider', sub: 'Earn by delivering orders', icon: Bike, color: 'text-yellow-400' },
]

export default function AccountType() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selected, setSelected] = useState<string[]>(['buyer'])
  const [loading, setLoading] = useState(false)

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(r => r !== id) : prev) : [...prev, id]
    )
  }

  async function handleContinue() {
    if (!user) { void navigate('/login'); return }
    setLoading(true)
    await supabase.from('profiles').update({ roles: selected }).eq('id', user.id)
    setLoading(false)
    void navigate('/onboard/interests')
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-12 flex flex-col">
      <div className="mb-8">
        <p className="text-brand-500 text-sm font-medium mb-1">Step 1 of 3</p>
        <h1 className="text-2xl font-display font-bold text-white">How will you use KASAJA?</h1>
        <p className="text-surface-400 text-sm mt-1">You can select multiple roles</p>
      </div>

      <div className="space-y-3 flex-1">
        {ROLES.map(r => {
          const Icon = r.icon
          const active = selected.includes(r.id)
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                active ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 bg-surface-800'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${active ? 'bg-brand-500/20' : 'bg-surface-700'}`}>
                <Icon className={`w-6 h-6 ${active ? 'text-brand-400' : r.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{r.label}</p>
                <p className="text-surface-400 text-sm">{r.sub}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-brand-500 bg-brand-500' : 'border-surface-600'}`}>
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => void handleContinue()}
        disabled={loading}
        className="mt-6 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
      >
        {loading ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}
