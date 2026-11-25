// EQUIVRA CRM · keš za brže otvaranje + obaveštenja na telefon (podaci uvek idu uživo iz baze)
const V = 'eq-crm-202611251130';
const SHELL = ['./', 'index.html', 'app.js', 'fx.js', 'config.js', 'mono.webp', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'EQUIVRA CRM', body: e.data ? e.data.text() : '' }; }
  const alarm = d.kind === 'urgent' || d.kind === 'deadline';
  e.waitUntil((async () => {
    // CRM je otvoren i ispred tebe: kartica sa zvukom se već pojavila u aplikaciji, ovde samo tiho
    let quiet = false;
    try { const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); quiet = wins.some((c) => c.visibilityState === 'visible' && c.focused); } catch (x) {}
    await self.registration.showNotification(d.title || 'EQUIVRA CRM', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag && !quiet, silent: quiet, requireInteraction: alarm && !quiet,
      icon: 'icon-192.png', badge: 'favicon-64.png',
      vibrate: quiet ? undefined : alarm ? [400, 150, 400, 150, 600] : d.kind === 'lead' ? [60, 40, 60, 40, 60] : [60, 40, 60],
      timestamp: d.ts || Date.now(), data: { go: d.go || '' },
    });
    if (quiet && d.tag) { await new Promise((r) => setTimeout(r, 2500)); try { (await self.registration.getNotifications({ tag: d.tag })).forEach((n) => n.close()); } catch (x) {} }
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const go = (e.notification.data || {}).go || '';
  e.waitUntil((async () => {
    const scope = self.registration.scope;
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) { if (c.url.startsWith(scope)) { try { await c.focus(); } catch (x) {} c.postMessage({ eqGo: go }); return; } }
    await self.clients.openWindow(scope + (go ? '#go=' + encodeURIComponent(go) : ''));
  })());
});
