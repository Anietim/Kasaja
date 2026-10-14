import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Total unread messages for the signed-in user (like the WhatsApp badge).
export function useUnreadMessages(): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user || import.meta.env.DEV) { setCount(0); return }
    const load = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('participant_a, unread_a, unread_b')
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      setCount((data ?? []).reduce(
        (sum, c) => sum + Number(c.participant_a === user.id ? c.unread_a : c.unread_b), 0))
    }
    void load()
    const ch = supabase
      .channel(`unread:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void load() })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [user])

  return count
}