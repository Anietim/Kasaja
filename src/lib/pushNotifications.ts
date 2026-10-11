// Push Notifications via Web Push API + Supabase Edge Functions
// This module handles subscribing to push notifications and sending them

const VAPID_PUBLIC_KEY: string = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}

export async function subscribeToPush(userId?: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    if (!VAPID_PUBLIC_KEY) return null
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    if (userId) await savePushSubscription(userId, sub)
    return sub
  } catch {
    return null
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    const { supabase } = await import('./supabase')
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  } catch { /* non-blocking */ }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function savePushSubscription(userId: string, sub: PushSubscription): Promise<void> {
  const { supabase } = await import('./supabase')
  const subJson = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subJson.endpoint,
    p256dh: (subJson.keys as Record<string, string>)?.p256dh,
    auth: (subJson.keys as Record<string, string>)?.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export function showLocalNotification(title: string, body: string, url?: string): void {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: url ?? 'kasaja',
    data: { url },
  })
  n.onclick = () => {
    window.focus()
    if (url) window.location.href = url
    n.close()
  }
}
