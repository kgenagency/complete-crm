/* HARIZMA CRM · servis za obaveštenja (Web Push). Ne kešira ništa: CRM se uvek učitava svež. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'HARIZMA', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'HARIZMA CRM', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag,
    icon: 'icon-192.png', badge: 'badge-96.png', vibrate: [60, 40, 60],
    timestamp: d.ts || Date.now(), data: { go: d.go || '' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const go = (e.notification.data || {}).go || '';
  e.waitUntil((async () => {
    const scope = self.registration.scope;
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if (c.url.startsWith(scope)) { try { await c.focus(); } catch (x) {} c.postMessage({ crmGo: go }); return; }
    }
    await self.clients.openWindow(scope + (go ? '#go=' + encodeURIComponent(go) : ''));
  })());
});
