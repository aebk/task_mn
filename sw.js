const CACHE_NAME = 'taskflow-v1';
const ASSETS = ['/task_mn/', '/task_mn/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    })).catch(() => caches.match('/task_mn/index.html'))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'TaskFlow', body: 'Reminder' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-96.png',
      tag: data.tag || 'taskflow',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('/task_mn/');
    })
  );
});

// Scheduled local notifications via message passing
const scheduledTimers = new Map();

self.addEventListener('message', e => {
  const { type, id, delay, title, body, tag } = e.data;
  if (type === 'SCHEDULE_NOTIFICATION') {
    if (scheduledTimers.has(id)) clearTimeout(scheduledTimers.get(id));
    const tid = setTimeout(() => {
      self.registration.showNotification(title, { body, tag: tag || id, icon: '/icon-192.png', vibrate: [200, 100, 200] });
      scheduledTimers.delete(id);
    }, delay);
    scheduledTimers.set(id, tid);
  } else if (type === 'CANCEL_NOTIFICATION') {
    if (scheduledTimers.has(id)) { clearTimeout(scheduledTimers.get(id)); scheduledTimers.delete(id); }
  }
});
