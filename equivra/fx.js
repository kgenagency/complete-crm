/* ================= EQUIVRA CRM · zvuci, animacije, iskačuće kartice (kao Harizma) ================= */
'use strict';
/* ---------- ZVUCI: sve se pravi u pretraživaču (WebAudio), bez ijednog fajla ----------
   jedan zajednički izlaz (kompresor + prostorni odjek), pa kratki „instrumenti“: zvonce, ton, šum */
let AUD = null, BUS = null, NOISE = null;
function audioCtx() { try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); if (AUD.state === 'suspended') AUD.resume().catch(() => {}); return AUD; } catch (e) { return null; } }
const soundOn = () => LS.get('eq_sound', '1') !== '0';
function sfxBus(a) {
  if (BUS && BUS.a === a) return BUS;
  const master = a.createGain(); master.gain.value = 2.2;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
  const lim = a.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
  master.connect(comp); comp.connect(lim); lim.connect(a.destination);
  // odjek kao u velikoj, praznoj sobi (napravljen šumom koji se gasi)
  const len = Math.floor(a.sampleRate * 2.2), ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * Math.min(1, i / 240); }
  const verb = a.createConvolver(); verb.buffer = ir;
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
  const wet = a.createGain(); wet.gain.value = 0.34; verb.connect(tone); tone.connect(wet); wet.connect(master);
  return (BUS = { a, master, verb });
}
function vOut(B, g, o) {
  const ac = B.a; let n = g;
  if ((o.pan || o.pan2) && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.setValueAtTime(o.pan || 0, o.t); if (o.pan2 !== undefined) p.pan.linearRampToValueAtTime(o.pan2, o.t + (o.a || 0) + (o.d || 0)); g.connect(p); n = p; }
  n.connect(B.master);
  if (o.verb) { const s = ac.createGain(); s.gain.value = o.verb; n.connect(s); s.connect(B.verb); }
}
function vOsc(B, o) {
  const ac = B.a, t = o.t, att = o.a ?? 0.005, d = o.d ?? 0.5, osc = ac.createOscillator(), g = ac.createGain();
  g.gain.value = 0; osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + att + d * 0.7); if (o.detune) osc.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.peak ?? 0.1, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + d);
  let n = osc; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); n = fl; }
  n.connect(g); vOut(B, g, o); osc.start(t); osc.stop(t + att + d + 0.05);
}
// zvonce: čist ton + dva metalna prizvuka koji se brže gase
function vBell(B, f, t, peak = 0.1, d = 1.1, pan = 0, verb = 0.35) {
  vOsc(B, { f, t, peak, d, pan, verb, a: 0.004 });
  vOsc(B, { f: f * 2.76, t, peak: peak * 0.2, d: d * 0.32, pan, verb, a: 0.003 });
  vOsc(B, { f: f * 5.4, t, peak: peak * 0.07, d: d * 0.12, pan, verb, a: 0.002 });
}
function noiseBuf(ac) {
  if (NOISE && NOISE.sampleRate === ac.sampleRate) return NOISE;
  const len = ac.sampleRate * 2 | 0; NOISE = ac.createBuffer(1, len, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return NOISE;
}
function vNoise(B, o) {
  const ac = B.a, t = o.t, att = o.a ?? 0.01, d = o.d ?? 0.3, s = ac.createBufferSource(); s.buffer = noiseBuf(ac); s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q ?? 1; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + att + d);
  const g = ac.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.peak ?? 0.06, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + d);
  s.connect(fl); fl.connect(g); vOut(B, g, o); s.start(t, Math.random()); s.stop(t + att + d + 0.05);
}
const C4 = 261.63, E4 = 329.63, G4 = 392.0, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98, B6 = 1975.53, C7 = 2093.0, E7 = 2637.02;
/* p = važnost: tiši zvuk ne prekida jači koji je upravo krenuo */
const SFX = {
  // ulazak u CRM: vazduh dok se crta romb, dubok udar kad se pojavi H, svetlucanje dok se HARIZMA razvlači, tih akord uz pozdrav
  intro: { p: 9, play(B, t) {
    vNoise(B, { t, a: 0.55, d: 0.75, peak: 0.045, f: 260, f2: 3400, q: 0.8, verb: 0.55, pan: -0.25, pan2: 0.25 });
    [[65.41, 0.085], [98.0, 0.05]].forEach(([f, pk]) => vOsc(B, { f, t: t + 0.05, a: 0.75, d: 2.3, peak: pk, type: 'triangle', lp: 380, verb: 0.3 }));
    vOsc(B, { f: 130.81, f2: 128, t: t + 0.68, a: 0.006, d: 1.7, peak: 0.15, verb: 0.55 });
    vBell(B, C4, t + 0.7, 0.11, 1.9, 0, 0.6); vBell(B, G4, t + 0.73, 0.07, 1.7, 0.1, 0.6);
    [C5, E5, G5, B5, D6, G6].forEach((f, i) => vBell(B, f, t + 0.92 + i * 0.075, 0.055 - i * 0.004, 1.5, -0.65 + i * 0.26, 0.75));
    [C4, E4, G4, B4, D5].forEach((f, i) => vOsc(B, { f, t: t + 1.22, a: 0.4, d: 1.7, peak: 0.032, pan: -0.3 + i * 0.15, verb: 0.65, detune: i % 2 ? 5 : -5 }));
  } },
  // nova porudžbina: fioka kase, „ka-čing“ i par novčića
  sale: { v: 1.4, p: 6, vibe: [10, 30, 10, 30, 18], play(B, t) {
    vOsc(B, { f: 160, f2: 70, t, a: 0.003, d: 0.15, peak: 0.2 });
    vNoise(B, { t, a: 0.002, d: 0.05, peak: 0.1, type: 'highpass', f: 5200, verb: 0.1 });
    vBell(B, C7, t + 0.05, 0.1, 0.9, -0.2, 0.3); vBell(B, E7, t + 0.13, 0.095, 1.15, 0.2, 0.35);
    [3136, 3951, 4699, 3520].forEach((f, i) => vBell(B, f, t + 0.24 + i * 0.05 + Math.random() * 0.02, 0.022, 0.5, -0.5 + i * 0.33, 0.4));
  } },
  // rekord ili jubilarna porudžbina: kratka fanfara pa šampanjac
  record: { v: 1.7, p: 10, vibe: [20, 50, 20, 50, 60], play(B, t) {
    const brass = (f, tt, d, pk) => { vOsc(B, { f, t: tt, a: 0.03, d, peak: pk, type: 'sawtooth', lp: 2100, verb: 0.35, pan: -0.2 }); vOsc(B, { f: f * 1.004, t: tt, a: 0.03, d, peak: pk * 0.7, type: 'sawtooth', lp: 1700, verb: 0.35, pan: 0.2 }); };
    brass(G4, t, 0.15, 0.045); brass(C5, t + 0.14, 0.15, 0.045); brass(E5, t + 0.28, 0.15, 0.045); brass(G5, t + 0.42, 1.0, 0.055);
    [C4, E4, G4].forEach(f => vOsc(B, { f, t: t + 0.42, a: 0.05, d: 1.1, peak: 0.03, type: 'triangle', verb: 0.45 }));
    for (let i = 0; i < 12; i++) vBell(B, 1800 + Math.random() * 3000, t + 0.5 + i * 0.06 + Math.random() * 0.03, 0.022, 0.6, Math.random() * 1.6 - 0.8, 0.5);
    vNoise(B, { t: t + 0.42, a: 0.01, d: 0.7, peak: 0.028, type: 'highpass', f: 6500, verb: 0.3 });
  } },
  // zadaci
  new: { p: 4, vibe: 14, play(B, t) { vBell(B, E6, t, 0.16, 1.1, -0.15, 0.3); vBell(B, B6, t + 0.075, 0.14, 1.2, 0.15, 0.3); } },
  done: { p: 4, vibe: [12, 40, 12], play(B, t) { [C6, E6, G6].forEach((f, i) => vBell(B, f, t + i * 0.09, 0.14, 1.1, -0.2 + i * 0.2, 0.3)); } },
  soft: { p: 2, play(B, t) { vBell(B, G6, t, 0.08, 1.0, 0, 0.35); } },
  // porudžbina menja fazu
  move: { p: 2, play(B, t) { vOsc(B, { f: 540, f2: 300, t, a: 0.003, d: 0.09, peak: 0.14 }); vOsc(B, { f: 1080, t: t + 0.004, a: 0.002, d: 0.05, peak: 0.025 }); } },
  shipped: { v: 1.6, p: 4, play(B, t) { vNoise(B, { t, a: 0.06, d: 0.32, peak: 0.06, f: 600, f2: 4200, q: 1.3, verb: 0.3, pan: -0.6, pan2: 0.6 }); vBell(B, E6, t + 0.2, 0.05, 0.8, 0.4, 0.4); } },
  delivered: { p: 5, vibe: 12, play(B, t) { [G5, C6, E6, G6, C7].forEach((f, i) => vBell(B, f, t + i * 0.055, 0.065, 1.0, -0.4 + i * 0.2, 0.45)); vOsc(B, { f: C4, t, a: 0.02, d: 0.9, peak: 0.05, verb: 0.4 }); } },
  // beleške i sitnice
  paper: { v: 1.6, p: 1, play(B, t) { vNoise(B, { t, a: 0.03, d: 0.11, peak: 0.055, f: 1800, f2: 5200, q: 1.5, verb: 0.1 }); vNoise(B, { t: t + 0.07, a: 0.004, d: 0.05, peak: 0.025, type: 'highpass', f: 3200 }); } },
  pin: { p: 2, play(B, t) { vOsc(B, { f: 1800, f2: 900, t, a: 0.001, d: 0.03, peak: 0.06, type: 'triangle' }); vOsc(B, { f: 220, f2: 150, t, a: 0.002, d: 0.08, peak: 0.12 }); } },
  check: { p: 2, play(B, t) { vBell(B, 880, t, 0.06, 0.5, 0, 0.3); vBell(B, E6, t + 0.07, 0.06, 0.7, 0, 0.3); } },
  tick: { p: 0, free: true, play(B, t, up) { vOsc(B, { f: up ? 1600 : 1100, t, a: 0.001, d: 0.025, peak: 0.05, type: 'triangle' }); } },
  trash: { v: 1.4, p: 3, play(B, t) { vNoise(B, { t, a: 0.01, d: 0.22, peak: 0.065, type: 'lowpass', f: 3200, f2: 240, q: 0.8, verb: 0.15 }); vOsc(B, { f: 330, f2: 140, t, a: 0.005, d: 0.2, peak: 0.07, type: 'triangle' }); } },
  restore: { p: 3, play(B, t) { vNoise(B, { t, a: 0.08, d: 0.2, peak: 0.05, type: 'lowpass', f: 300, f2: 3600, verb: 0.2 }); vBell(B, B5, t + 0.18, 0.055, 0.7, 0, 0.35); vBell(B, E6, t + 0.25, 0.05, 0.8, 0, 0.35); } },
  alarm: { p: 9, vibe: 0, play(B, t, urgent) {
    if (urgent) { for (let r = 0; r < 2; r++) [0, 0.16, 0.32].forEach((o, i) => { const s0 = t + r * 0.62 + o; vBell(B, 1760, s0, 0.075, 0.22, -0.2, 0.15); vBell(B, 2349.32, s0 + 0.07, 0.07, 0.22, 0.2, 0.15); }); }
    else [0, 0.18, 0.36].forEach((o, i) => vBell(B, [1174.66, 1567.98, 2349.32][i], t + o, 0.07, 0.9, -0.3 + i * 0.3, 0.4));
  } },
  notif: { p: 2, play(B, t) { vBell(B, D6, t, 0.05, 0.6, 0, 0.35); vBell(B, G6, t + 0.09, 0.045, 0.7, 0, 0.35); } },
  error: { p: 3, vibe: [30, 40, 30], play(B, t) { [[233.08, 0], [196, 0.13]].forEach(([f, d]) => vOsc(B, { f, t: t + d, a: 0.006, d: 0.15, peak: 0.08, type: 'square', lp: 650, verb: 0.05 })); } },
  bye: { p: 8, play(B, t) { [G6, E6, C6, G5].forEach((f, i) => vBell(B, f, t + i * 0.09, 0.055, 1.2, 0.3 - i * 0.2, 0.55)); vOsc(B, { f: 130.81, t: t + 0.2, a: 0.2, d: 1.1, peak: 0.05, type: 'triangle', lp: 500, verb: 0.4 }); } },
};
let sfxLast = { t: 0, p: -1 }, SFX_INTRO = null;
function introFade() { const x = SFX_INTRO; if (!x) return; try { [x.out, x.vs].forEach(g => g.gain.setTargetAtTime(0, x.a.currentTime, 0.06)); } catch (e) {} SFX_INTRO = null; }
function sfx(name, vol = 1, arg) {
  const s = SFX[name]; if (!s || !soundOn()) return false;
  const now = performance.now();
  if (!s.free && now - sfxLast.t < 350 && s.p <= sfxLast.p) return false;
  const a = audioCtx(); if (!a) return false;
  if (!s.free) sfxLast = { t: now, p: s.p };
  const go = () => {
    if (a.state !== 'running') return;
    const B = sfxBus(a), out = a.createGain(), vs = a.createGain(), g = vol * (s.v || 1); out.gain.value = g; vs.gain.value = g; out.connect(B.master); vs.connect(B.verb);
    try { s.play({ a, master: out, verb: vs }, a.currentTime + 0.03, arg); } catch (e) {}
    if (name === 'intro') SFX_INTRO = { a, out, vs };
  };
  // bez dodira korisnika pretraživač ne pušta zvuk; ako se ne odglavi odmah, preskačemo (da ne zakasni)
  if (a.state === 'running') go(); else a.resume().then(() => { if (performance.now() - now < 600) go(); }).catch(() => {});
  if (s.vibe && vol >= 0.8) { try { if (navigator.vibrate) navigator.vibrate(s.vibe); } catch (e) {} }
  return true;
}
// EQUIVRA dodatak: kas konja (novi kupac / prijava sa sajta) i čekić aukcije (prodato)
SFX.gallop = { v: 1.5, p: 5, vibe: [12, 60, 12, 60, 12], play(B, t) {
  for (let i = 0; i < 6; i++) { const tt = t + i * 0.13 + (i % 3 === 2 ? 0.05 : 0); vNoise(B, { t: tt, a: 0.002, d: 0.06, peak: 0.09, type: 'lowpass', f: 900, f2: 300, q: 2, pan: -0.5 + i * 0.2, verb: 0.15 }); vOsc(B, { f: 180, f2: 90, t: tt, a: 0.002, d: 0.06, peak: 0.08, pan: -0.5 + i * 0.2 }); }
  vBell(B, G6, t + 0.85, 0.05, 0.9, 0.3, 0.45); vBell(B, D6, t + 0.93, 0.045, 1.0, 0.1, 0.45);
} };
SFX.gavel = { v: 1.6, p: 10, vibe: [40, 80, 40, 80, 120], play(B, t) {
  [0, 0.32, 0.64].forEach((o, i) => { vOsc(B, { f: 210, f2: 95, t: t + o, a: 0.001, d: 0.12, peak: 0.26, verb: 0.35 }); vNoise(B, { t: t + o, a: 0.001, d: 0.05, peak: 0.12, type: 'bandpass', f: 1600, q: 1.2, verb: 0.3 }); });
  [C5, E5, G5, C6].forEach((f, i) => vBell(B, f, t + 0.95 + i * 0.07, 0.07, 1.4, -0.3 + i * 0.2, 0.55));
} };
function setSound(on) { LS.set('eq_sound', on ? '1' : '0'); document.querySelectorAll('[data-soundbtn]').forEach((b) => { b.textContent = on ? '🔔 Zvuci uključeni' : '🔕 Zvuci isključeni'; }); if (on) { audioCtx(); setTimeout(() => sfx('done'), 30); } }

/* ---------- uvodna animacija (dodir otključava zvuk, kao kod Harizme) ---------- */
function splash(name) {
  const el = document.getElementById('splash'); if (!el) return Promise.resolve();
  const h = new Date().getHours(), hi = h < 11 ? 'Dobro jutro' : h < 18 ? 'Dobar dan' : 'Dobro veče';
  el.querySelector('.hello').innerHTML = `${hi}, ${esc(name)}<span class="hello-sub">${new Date().toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' })}</span>`;
  el.classList.remove('hidden');
  const unlocked = sessionStorage.getItem('eq_gate') === '1';
  return new Promise((res) => {
    const run = () => { el.classList.remove('gate'); sfx('intro'); setTimeout(() => { el.classList.add('hide'); res(); }, 2300); setTimeout(() => el.classList.add('hidden'), 3000); };
    if (unlocked && !soundOn()) { el.classList.remove('gate'); setTimeout(() => { el.classList.add('hide'); res(); }, 1500); setTimeout(() => el.classList.add('hidden'), 2200); return; }
    el.classList.add('gate');
    const go = () => { el.removeEventListener('click', go); document.removeEventListener('keydown', go); sessionStorage.setItem('eq_gate', '1'); audioCtx(); run(); };
    el.addEventListener('click', go); document.addEventListener('keydown', go);
  });
}

/* ---------- proslava (konj prodat, kupac kupio) ---------- */
function celebrate(title, sub) {
  let el = document.getElementById('cele');
  if (!el) { el = document.createElement('div'); el.id = 'cele'; el.className = 'cele'; el.setAttribute('role', 'status'); document.body.appendChild(el); el.addEventListener('click', () => el.classList.remove('in')); }
  const mob = innerWidth < 700, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, cols = ['#C8AB7A', '#EFEBE1', '#7E8C74', '#E3CFA3', '#9A7B36'];
  const bits = reduce ? '' : Array.from({ length: mob ? 34 : 60 }, () => { const x = Math.random() * 100, dx = (Math.random() - 0.5) * 30, r = (Math.random() - 0.5) * 900, del = Math.random() * 0.35, dur = 1.6 + Math.random() * 1.2, w = 5 + Math.random() * 6;
    return `<i style="left:${x}%;--dx:${dx}vw;--r:${r}deg;--del:${del}s;--dur:${dur}s;width:${w}px;height:${w * (Math.random() < 0.5 ? 0.45 : 1)}px;background:${cols[Math.random() * cols.length | 0]};border-radius:${Math.random() < 0.3 ? '50%' : '2px'}"></i>`; }).join('');
  el.innerHTML = `<div class="cele-bits">${bits}</div><div class="cele-card"><img class="cele-ic" src="mono.webp" alt=""><div class="cele-t">${esc(title)}</div>${sub ? `<div class="cele-s">${esc(sub)}</div>` : ''}</div>`;
  void el.offsetWidth; el.classList.add('in'); sfx('gavel');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('in'), 3800);
}

/* ---------- iskačuća kartica kad napraviš ili završiš zadatak ---------- */
let tpopT = null;
function tpopHide() { const el = document.getElementById('tpop'); if (el) el.classList.remove('in'); }
function taskPop(kind, info) {
  let el = document.getElementById('tpop');
  if (!el) { el = document.createElement('div'); el.id = 'tpop'; el.className = 'tpop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); el.addEventListener('click', (e) => { if (e.target.closest('[data-tpsound]')) { setSound(!soundOn()); e.target.textContent = soundOn() ? '🔔' : '🔕'; return; } tpopHide(); if (el.dataset.id && typeof openTask === 'function' && !e.target.closest('[data-tpclose]')) openTask(el.dataset.id); }); }
  const f = isF(who()), done = kind === 'done';
  const head = done ? (f ? 'Bravo, završila si zadatak' : 'Bravo, završio si zadatak') : kind === 'assign' ? (f ? 'Dodelila si zadatak' : 'Dodelio si zadatak') : (f ? 'Napravila si zadatak' : 'Napravio si zadatak');
  const parts = Array.from({ length: 10 }, (_, i) => { const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5, r = 34 + Math.random() * 22; return `<i style="--dx:${Math.cos(ang) * r}px;--dy:${Math.sin(ang) * r}px;--d:${Math.random() * 90}ms"></i>`; }).join('');
  const as = info.assignee ? [info.assignee] : [];
  el.className = 'tpop' + (done ? ' done' : ''); el.dataset.id = info.id || '';
  el.innerHTML = `<div class="tp-ic"><span class="tp-burst">${parts}</span><svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><circle cx="18" cy="18" r="16" class="tp-c"/><path d="M11 18.5l4.6 4.6L25.5 13" class="tp-k"/></svg></div>
    <div class="tp-body"><div class="tp-h">${head}</div><div class="tp-t">${esc(String(info.title || '').slice(0, 90))}</div>
      <div class="tp-m">${info.priority === 'hitno' ? '<span class="tk-pr hitno">HITNO</span>' : ''}${as.map((k, i) => `<span class="tp-av av ${avCls(k)}" style="--i:${i}">${esc(personName(k).charAt(0))}</span>`).join('')}${as.length ? `<span class="tp-who">${esc(as.map(personName).join(', '))}</span>` : ''}${!done && info.due ? `<span class="tk-due">⏱ ${esc(dueTxt(info))}</span>` : ''}</div></div>
    <div class="tp-side"><button type="button" class="tp-btn" data-tpsound title="Zvuk">${soundOn() ? '🔔' : '🔕'}</button><button type="button" class="tp-btn" data-tpclose title="Zatvori">✕</button></div>
    <div class="tp-bar"></div>`;
  void el.offsetWidth; el.classList.add('in');
  sfx(done ? 'done' : 'new');
  clearTimeout(tpopT); tpopT = setTimeout(tpopHide, 5200);
}

/* ---------- kartice obaveštenja (dole desno) ---------- */
function ncard(nf) {
  let tray = document.getElementById('ntray');
  if (!tray) { tray = document.createElement('div'); tray.id = 'ntray'; tray.className = 'ntray'; document.body.appendChild(tray); }
  const alarm = nf.kind === 'urgent' || nf.kind === 'deadline';
  const c = document.createElement('div'); c.className = 'ncard' + (alarm ? ' alarm' : '') + (nf.kind === 'lead' ? ' lead' : '');
  const av = nf.actor && nf.actor !== 'sajt' && nf.actor !== 'sistem' ? `<span class="av ${avCls(nf.actor)}">${esc(personName(nf.actor).charAt(0))}</span>` : `<span class="av sys">${nf.kind === 'lead' ? '🐎' : nf.kind === 'deadline' ? '⏰' : '✦'}</span>`;
  c.innerHTML = `${av}<div class="n-body"><div class="n-t">${esc(nf.title)}</div><div class="n-s">${esc(nf.body || '')}</div><div class="n-w">${nf.actor && nf.actor !== 'sistem' ? esc(personName(nf.actor)) + ' · ' : ''}upravo</div></div><button class="n-x" aria-label="Zatvori">✕</button>`;
  c.addEventListener('click', (e) => { close(); if (!e.target.closest('.n-x')) openGo(nf.go); });
  tray.appendChild(c); while (tray.children.length > 4) tray.firstChild.remove();
  function close() { c.classList.add('out'); setTimeout(() => c.remove(), 320); }
  setTimeout(close, alarm ? 12000 : 7000);
  sfx(nf.kind === 'lead' ? 'gallop' : nf.kind === 'done' ? 'done' : alarm ? 'alarm' : 'notif', 1, nf.kind === 'urgent');
}
