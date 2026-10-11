const CACHE = 'kasaja-v1'
const STATIC = ['/','index.html','/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase')) return // never cache API calls
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request).then(res => {
      if (res.ok && !e.request.url.includes('chrome-extension')) {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }))
  )
})

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'KASAJA', {
      body: data.body ?? 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/home' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = e.notification.data?.url ?? '/home'
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
