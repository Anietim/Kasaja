import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * "N new listings", like the "Show 12 posts" bar on X.
 * Counts active listings posted by other people since the feed was last shown.
 * Checks again every 45 seconds and whenever the tab comes back into view.
 */
let since = new Date().toISOString()
let count = 0
const subs = new Set<(n: number) => void>()
const publish = (n: number) => { count = n; subs.forEach(s => s(n)) }

/** Call when the feed has just been (re)loaded, so the counter starts again from zero. */
export function markFeedSeen() {
  since = new Date().toISOString()
  publish(0)
}

async function check(userId: string) {
  const { count: n, error } = await supabase
    .from('products')
    .select('id, store:stores!inner(owner_id)', { count: 'exact', head: true })
    .eq('status', 'active')
    .gt('created_at', since)
    .neq('store.owner_id', userId)
  if (!error && typeof n === 'number') publish(n)
}

/** Read the count anywhere. Pass `poll` once, high up (the app layout), to keep it fresh. */
export function useNewFeed(poll = false) {
  const { user } = useAuth()
  const [n, setN] = useState(count)

  useEffect(() => {
    subs.add(setN)
    setN(count)
    return () => { subs.delete(setN) }
  }, [])

  useEffect(() => {
    if (!poll || !user) return
    const run = () => { if (document.visibilityState === 'visible') void check(user.id) }
    const t = setInterval(run, 45000)
    document.addEventListener('visibilitychange', run)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', run) }
  }, [poll, user])

  return n
}
