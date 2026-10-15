import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Search, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MOCK } from '@/lib/mockData'

interface Thread {
  id: string; other_name: string; other_avatar?: string
  last_message: string; last_at: string; unread: number
  product_title?: string
}

export default function Inbox() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (!user) { setThreads([]); setLoading(false); return }
    const { data } = await supabase
      .from('conversations')
      .select(`id, participant_a, participant_b, last_message_at, last_message_preview, unread_a, unread_b,
        pa:profiles!conversations_participant_a_fkey(display_name, avatar_url),
        pb:profiles!conversations_participant_b_fkey(display_name, avatar_url)`)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(30)
    if (data && data.length > 0) {
      const mapped = (data as unknown as Array<{
        id: string; participant_a: string; participant_b: string
        unread_a: number; unread_b: number
        last_message_at: string; last_message_preview: string
        pa: { display_name: string; avatar_url?: string }[]
        pb: { display_name: string; avatar_url?: string }[]
      }>).map(c => {
        const isA = c.participant_a === user.id
        const raw = (isA ? c.pb : c.pa) as unknown
        const first = (Array.isArray(raw) ? raw[0] : raw) as { display_name?: string; avatar_url?: string } | undefined
        const other = { display_name: first?.display_name || 'KASAJA user', avatar_url: first?.avatar_url }
        return {
          id: c.id, other_name: other.display_name, other_avatar: other.avatar_url,
          last_message: c.last_message_preview ?? '', last_at: c.last_message_at, unread: isA ? c.unread_a : c.unread_b,
        }
      })
      setThreads(mapped)
    } else {
      setThreads([])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => { void load() }, [load])

  const filtered = threads.filter(t => t.other_name.toLowerCase().includes(search.toLowerCase()))
  const timeAgo = (s: string) => {
    const d = new Date(s), now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return 'now'
    if (diff < 60) return `${diff}m`
    if (diff < 1440) return `${Math.floor(diff / 60)}h`
    return `${Math.floor(diff / 1440)}d`
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <div className="bg-surface border-b border-white/10 px-4 pt-4 pb-3 sticky top-0 z-10">
        <h1 className="text-xl font-display font-bold text-white mb-3">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {(Array.from({ length: 5 })).map((_v, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-surface shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-surface rounded w-1/2" />
                  <div className="h-3 bg-surface rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-white font-semibold">No messages yet</p>
            <p className="text-muted text-sm mt-1">Start a chat by tapping a seller on any product</p>
          </div>
        ) : (
          <div className="space-y-1">
                        {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => void navigate(`/inbox/${t.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {t.other_avatar
                    ? <img src={t.other_avatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-brand-400 font-bold text-lg">{t.other_name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold text-sm truncate">{t.other_name}</p>
                    <p className="text-muted text-xs shrink-0 ml-2">{timeAgo(t.last_at)}</p>
                  </div>
                  {t.product_title && (
                    <p className="text-brand-400 text-xs flex items-center gap-1 mt-0.5">
                      <Package className="w-3 h-3" />{t.product_title}
                    </p>
                  )}
                  <p className="text-muted text-sm truncate mt-0.5">{t.last_message}</p>
                </div>
                {t.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-bold">{t.unread}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
