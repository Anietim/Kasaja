import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MOCK } from '@/lib/mockData'

interface State { id: number; name: string; code: string; region: string }
interface Market { id: number; name: string; slug: string; description: string; speciality: string[]; state_id: number }

const REGIONS = ['All', 'South West', 'South East', 'South South', 'North West', 'North East', 'North Central']

export default function MarketBrowser() {
  const navigate = useNavigate()
  const [states, setStates] = useState<State[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [region, setRegion] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedState, setSelectedState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: s } = await supabase.from('ng_states').select('*').order('name')
    const { data: m } = await supabase.from('ng_markets').select('*').order('name')
    if (s && s.length > 0) setStates(s as State[])
    else setStates(MOCK.states)
    if (m && m.length > 0) setMarkets(m as Market[])
    else setMarkets(MOCK.markets)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filteredStates = states.filter(s =>
    (region === 'All' || s.region === region) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const stateMarkets = selectedState
    ? markets.filter(m => m.state_id === selectedState.id)
    : []

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="bg-surface border-b border-white/10 px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-xl font-display font-bold text-white mb-3">Markets</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search states or markets..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                region === r ? 'bg-brand-500 text-white' : 'bg-white/5 text-muted hover:bg-white/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* State list or market list */}
      {selectedState ? (
        <div className="px-4 py-4">
          <button
            onClick={() => setSelectedState(null)}
            className="flex items-center gap-2 text-brand-400 text-sm mb-4"
          >
            ← Back to states
          </button>
          <h2 className="text-lg font-display font-bold text-white mb-1">{selectedState.name}</h2>
          <p className="text-muted text-sm mb-4">{stateMarkets.length} markets</p>
          {stateMarkets.length === 0 ? (
            <div className="text-center py-12 text-muted">No markets listed yet for this state</div>
          ) : (
            <div className="space-y-3">
              {stateMarkets.map(m => (
                <button
                  key={m.id}
                  onClick={() => void navigate(`/market/${m.slug}`)}
                  className="w-full bg-surface rounded-2xl p-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{m.name}</p>
                    <p className="text-muted text-xs mt-0.5 truncate">{m.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.speciality?.slice(0, 3).map((s: string) => (
                        <span key={s} className="text-xs bg-white/5 text-muted px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {(Array.from({ length: 8 })).map((_v, i) => (
                <div key={i} className="bg-surface rounded-2xl h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStates.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedState(s)}
                  className="w-full bg-surface rounded-2xl px-4 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-400">{s.code}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      <p className="text-muted text-xs">{s.region}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {markets.filter(m => m.state_id === s.id).length} markets
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
