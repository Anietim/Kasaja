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

const DEV_MOCK: AppNotification[] = [
  { id: '1', type: 'message', title: 'New message from Amara', body: 'Is this item still available?', read: false, link: '/inbox', created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: '2', type: 'order', title: 'Order confirmed', body: 'Your order #KJ-2891 has been confirmed by the seller.', read: false, link: '/orders', created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: '3', type: 'bid', title: 'Rider bid received', body: 'Emeka (⭐4.9) offered ₦1,800 for your delivery.', read: false, link: '/delivery', created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: '4', type: 'group_reply', title: 'Price reply in Balogun Market', body: 'Seller replied: "Ankara 6 yards — ₦4,500"', read: false, link: '/groups/demo-group-id', created_at: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: '5', type: 'payment', title: 'Payment received', body: '₦12,500 received for your Xiaomi Redmi Note 13 listing.', read: true, link: '/store/dashboard', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '6', type: 'delivery', title: 'Rider picked up your order', body: 'Tunde is on the way. ETA: 22 minutes.', read: true, link: '/orders', created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: '7', type: 'price_offer', title: 'Counter offer received', body: 'Buyer countered ₦8,000 on your Samsung Galaxy A15.', read: true, link: '/store/dashboard', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: '8', type: 'system', title: 'Store verified ✓', body: 'Congratulations! Your store has been verified.', read: true, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
]

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.read).length

  const load = useCallback(async () => {
    if (import.meta.env.DEV) {
      setNotifications(DEV_MOCK)
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
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const n = payload.new as AppNotification
        setNotifications(prev => [n, ...prev])
        // Browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          new Notification(n.title, { body: n.body, icon: '/kasaja-icon.png' })
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user])

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
