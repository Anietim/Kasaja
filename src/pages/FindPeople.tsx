import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Search as SearchIcon, X, BadgeCheck, MapPin, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Person {
  id: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  is_private: boolean
  state: string | null
  city: string | null
  store_name: string | null
  followers: number
  is_following: boolean
}

export default function FindPeople() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  useEffect(() => { inputRef.current?.focus() }, [])

  // Search as you type (waits 250ms after you stop typing)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      void (async () => {
        const { data, error } = await supabase.rpc('search_people', { p_query: query.trim(), p_limit: 25 })
        if (error) toast.error(error.message)
        setPeople((data ?? []) as Person[])
        setLoading(false)
      })()
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function follow(p: Person) {
    if (!user) { void navigate('/login'); return }
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: p.id })
    if (error) { toast.error(error.message); return }
    setFollowed(prev => new Set(prev).add(p.id))
    toast.success(p.is_private ? 'Follow request sent' : 'Following')
  }

  const searching = query.trim().length > 0

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-lg hover:bg-surface-800">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-surface-800 rounded-xl px-3 py-2.5">
          <SearchIcon className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people and stores"
            className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}><X className="w-4 h-4 text-neutral-400" /></button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          {searching ? 'Results' : 'Suggested for you'}
        </p>

        {loading && people.length === 0 && (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div>
        )}

        {!loading && people.length === 0 && (
          <p className="text-center text-neutral-400 text-sm py-10">
            {searching ? 'No one found. Try another name.' : 'No suggestions yet.'}
          </p>
        )}

        <div className="divide-y divide-surface-800">
          {people.map(p => {
            const name = p.display_name?.trim() || 'KASAJA user'
            const place = [p.city, p.state].filter(Boolean).join(', ')
            const isFollowing = p.is_following || followed.has(p.id)
            return (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <button onClick={() => void navigate(`/profile/${p.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-12 h-12 rounded-full bg-surface-800 overflow-hidden flex items-center justify-center shrink-0">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white font-bold">{name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold flex items-center gap-1 truncate">
                      {name}
                      {p.is_verified && <BadgeCheck size={14} className="text-brand-500 shrink-0" />}
                    </p>
                    {p.store_name && <p className="text-neutral-300 text-xs truncate">{p.store_name}</p>}
                    <p className="text-neutral-500 text-xs flex items-center gap-1 truncate">
                      {place && <><MapPin size={10} /> {place} · </>}{p.followers} followers
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => void follow(p)}
                  disabled={isFollowing}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold shrink-0 ${
                    isFollowing ? 'bg-surface-800 text-neutral-400' : 'bg-brand-500 text-white'
                  }`}
                >
                  {isFollowing ? (p.is_private && !p.is_following ? 'Requested' : 'Following') : 'Follow'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}