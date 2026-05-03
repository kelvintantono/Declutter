// Service Worker — Rumah Bersih
const CACHE = 'rumah-bersih-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return
  const { title, body } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'daily-reminder',
      renotify: true,
      actions: [{ action: 'open', title: 'Buka App' }]
    })
  )
})

// Open app on notification click
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
