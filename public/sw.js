// Service Worker do Da Fala
// Permite notificações e manter a app "viva" em background

const CACHE_NAME = 'dafala-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notificações push (quando alguém fala no canal)
self.addEventListener('push', (event) => {
  let data = { title: 'Da Fala', body: 'Alguém está a falar!' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    /* usa default */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      tag: 'dafala-voice',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Clicar na notificação abre a app no canal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
