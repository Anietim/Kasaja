import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface AppNotification {
  id: string
  type: 'message' | 'order' | 'delivery' | 'group_reply' | 'price_offer' | 'bid' | 'system' | 'payment'
  title: string
  body: string
  read: boolean
  link?: string
  created_at: string
  avatar?: string
}


// Every part of the app that calls useNotifications() (the bell, the panel) shares one list,
// so opening notifications updates the bell's count right away.
type Listener = (n: AppNotification[]) => void
const listeners = new Set<Listener>()

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setLocal] = useState<AppNotification[]>([])
  const setNotifications = useCallback((u: AppNotification[] | ((p: AppNotification[]) => AppNotification[])) => {
    setLocal(prev => {
      const next = typeof u === 'function' ? u(prev) : u
      queueMicrotask(() => listeners.forEach(l => { if (l !== setLocal) l(next) }))
      return next
    })
  }, [])
  useEffect(() => { listeners.add(setLocal); return () => { listeners.delete(setLocal) } }, [])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.read).length

  const load = useCallback(async () => {
    if (import.meta.env.DEV) {
      setNotifications([])
      setLoading(false)
      return
    }
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as AppNotification[]) ?? [])
    setLoading(false)
  }, [user])

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    if (!import.meta.env.DEV && user) {
      await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id)
    }
  }, [user])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (!import.meta.env.DEV && user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    }
  }, [user])

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (!import.meta.env.DEV && user) {
      await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  // Supabase Realtime subscription (production only)
  useEffect(() => {
    if (import.meta.env.DEV || !user) return
    const channel = supabase
      .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
      }, payload => {
        const n = payload.new as AppNotification
        setNotifications(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev]))
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body, icon: '/icon-192.png' })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
      }, payload => {
        const u = payload.new as AppNotification
        setNotifications(prev => prev.map(x => (x.id === u.id ? { ...x, ...u } : x)))
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, setNotifications])

  return { notifications, unreadCount, loading, markRead, markAllRead, deleteNotification }
}

// Helper: send a group reply notification to the post author
export async function sendGroupNotification(opts: {
  recipientId: string
  senderName: string
  groupId: string
  groupName: string
  replyText: string
  type: 'reply' | 'dm' | 'post'
}): Promise<void> {
  if (import.meta.env.DEV) return // skip in dev — no real session
  const titles: Record<string, string> = {
    reply: `Price reply in ${opts.groupName}`,
    dm: `New message from ${opts.senderName}`,
    post: `New post in ${opts.groupName}`,
  }
  const bodies: Record<string, string> = {
    reply: `${opts.senderName}: "${opts.replyText.slice(0, 80)}"`,
    dm: opts.replyText.slice(0, 80),
    post: `${opts.senderName} posted: "${opts.replyText.slice(0, 80)}"`,
  }
  await supabase.from('notifications').insert({
    user_id: opts.recipientId,
    type: opts.type === 'dm' ? 'message' : 'group_reply',
    title: titles[opts.type],
    body: bodies[opts.type],
    data: { group_id: opts.groupId },
    link: `/groups/${opts.groupId}`,
    is_read: false,
  })
}
