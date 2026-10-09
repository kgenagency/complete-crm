/* HARIZMA CRM · servis za obaveštenja (Web Push). Ne kešira ništa: CRM se uvek učitava svež. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
/* samo otvaranje stranice ide preko servisa (zbog instalacije kao aplikacija); bez interneta pokaže kratku poruku umesto greške */
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HARIZMA</title><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1B2620;color:#E8E4D9;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div><div style="font-size:42px;font-family:Georgia,serif">H</div><p style="font-size:17px">Nema interneta.</p><p style="opacity:.7">CRM će se otvoriti čim se veza vrati.</p><button onclick="location.reload()" style="margin-top:10px;padding:12px 22px;border:0;border-radius:12px;background:#C9A96E;color:#1B2620;font-weight:700;font-size:15px">Pokušaj ponovo</button></div></body>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'HARIZMA', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    // chat i @oznake: ako je CRM upravo otvoren i ispred tebe, vidiš karticu u aplikaciji, pa obaveštenje stiže tiho i samo se skloni
    let quiet = false;
    const alarm = d.kind === 'deadline' || d.kind === 'urgent';
    if (d.kind === 'chat' || d.kind === 'call' || d.kind === 'mention' || alarm) {
      try {
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }), front = wins.find(c => c.visibilityState === 'visible' && c.focused);
        quiet = !!front;
        if (front && alarm) front.postMessage({ crmAlarm: d }); // CRM je otvoren: pokaže svoju karticu sa alarmom
      } catch (x) {}
    }
    const call = d.kind === 'call' && !quiet, urgent = d.kind === 'urgent';
    await self.registration.showNotification(d.title || 'HARIZMA CRM', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag && !quiet, silent: quiet, requireInteraction: (call || alarm) && !quiet,
      icon: urgent ? 'alarm-urgent.png' : d.kind === 'deadline' ? 'alarm-192.png' : 'icon-192.png', badge: 'badge-96.png',
      vibrate: quiet ? undefined : call ? [300, 150, 300, 150, 300, 150, 300] : urgent ? [600, 200, 600, 200, 600, 200, 600] : alarm ? [250, 120, 250, 120, 500] : [60, 40, 60],
      actions: alarm && !quiet && d.task ? [{ action: 'done', title: '✓ Gotovo' }, { action: 'open', title: 'Otvori zadatak' }] : undefined,
      timestamp: d.ts || Date.now(), data: { go: d.go || '', done: d.task ? 'taskdone:' + d.task : '' },
    });
    if (quiet && d.tag) { await new Promise(r => setTimeout(r, 2500)); try { (await self.registration.getNotifications({ tag: d.tag })).forEach(n => n.close()); } catch (x) {} }
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const dt = e.notification.data || {}, go = (e.action === 'done' && dt.done) ? dt.done : (dt.go || '');
  e.waitUntil((async () => {
    const scope = self.registration.scope;
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if (c.url.startsWith(scope)) { try { await c.focus(); } catch (x) {} c.postMessage({ crmGo: go }); return; }
    }
    await self.clients.openWindow(scope + (go ? '#go=' + encodeURIComponent(go) : ''));
  })());
});
