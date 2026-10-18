/* Interfaz */
(function () {
'use strict';
const E = window.PYE, C = window.Content;
const store = Core.store;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------- iconos ----------
const I = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 16c0-4 3.5-7 8-7s8 3 8 7H3z"/><path d="M19 16l2-1M6 16v2M16 16v2M19 13a2 2 0 1 0 0-4"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--jade)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bad: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cinnabar)" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  unsure: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  star: on => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="' + (on ? 'var(--amber)' : 'var(--line)') + '"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" width="18" height="18"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>',
};

// ---------- estado ----------
const DEFAULT_SETTINGS = { voice: 'auto', theme: 'system', track: 'pron' };
let settings = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));
if (!settings.v2voice) { settings.voice = 'auto'; settings.v2voice = 1; try { localStorage.setItem('py.settings', JSON.stringify(settings)); } catch (e) {} }
let prog = store.get('prog', { done: {}, xp: 0, days: {}, stats: {}, byTone: {}, words: {} });
let srs = store.get('srs', {});
const saveSettings = () => store.set('settings', settings);
const saveProg = () => store.set('prog', prog);
const saveSrs = () => store.set('srs', srs);
function applyTheme() { const r = document.documentElement; if (settings.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', settings.theme); }
applyTheme();
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function streak() {
  let n = 0; const d = new Date();
  if (!prog.days[todayKey()]) d.setDate(d.getDate() - 1);
  for (;;) { const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (prog.days[k]) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function markDay() { prog.days[todayKey()] = (prog.days[todayKey()] || 0) + 1; }
function recordCheck(key, state) {
  const s = prog.stats[key] || (prog.stats[key] = { n: 0, ok: 0 });
  s.n++; s.ok += state === 'ok' ? 1 : state === 'unsure' ? 0.5 : 0;
}
function recordTone(t, ok) { const s = prog.byTone[t] || (prog.byTone[t] = { n: 0, ok: 0 }); s.n++; if (ok) s.ok++; }
function updateChips() {
  $('#streakChip').innerHTML = '<span aria-hidden="true">🔥</span> ' + streak();
  $('#xpChip').textContent = prog.xp + ' pts';
  const due = dueItems().length; const b = $('#dueBadge'); b.hidden = !due; b.textContent = due > 99 ? '99+' : due;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }

// ---------- repaso espaciado ----------
const INTERVAL_H = [0.15, 24, 72, 168, 384, 960];
function srsAdd(item, ok) {
  const id = item.type + ':' + item.key;
  const s = srs[id] || (srs[id] = Object.assign({ box: 0, due: 0, n: 0, fails: 0 }, item));
  s.n++;
  if (ok) s.box = Math.min(5, s.box + 1); else { s.box = 0; s.fails++; }
  s.due = Date.now() + INTERVAL_H[s.box] * 3600e3;
  if (ok && s.box >= 4 && s.fails === 0) delete srs[id];
  saveSrs();
}
function dueItems() { const now = Date.now(); return Object.values(srs).filter(s => s.due <= now); }

// ---------- dibujo ----------
const CHAO = { 1: [5, 5], 2: [3, 5], 3: [2, 1, 4], 4: [5, 1], 5: [3, 3] };
const toneColor = t => css('--t' + t) || css('--jade');
function toneIcon(t, small, big) {
  const pts = CHAO[t] || [3, 3], w = 34, h = 26;
  const xs = pts.map((_, i) => 4 + i * (w - 8) / (pts.length - 1)), ys = pts.map(v => h - 3 - (v - 1) * (h - 6) / 4);
  const d = 'M' + xs.map((x, i) => x.toFixed(1) + ' ' + ys[i].toFixed(1)).join(' L');
  return '<svg class="toneicon" viewBox="0 0 34 26" aria-label="tono ' + t + '"' + (small ? ' style="width:26px;height:20px"' : big ? ' style="width:54px;height:40px"' : '') + '><line x1="2" y1="3" x2="32" y2="3"/><line x1="2" y1="23" x2="32" y2="23"/><path d="' + d + '" stroke="var(--t' + (t === 5 ? 2 : t) + ')"' + (t === 5 ? ' stroke-dasharray="2 4"' : '') + '/></svg>';
}
// Diagrama grande de los tonos en la escala de 5 alturas
function toneChart(tones) {
  const W = 300, H = 164, x0 = 34, x1 = W - 12, yOf = L => 28 + (5 - L) * (H - 48) / 4;
  let g = '';
  for (let L = 1; L <= 5; L++) g += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + yOf(L) + '" y2="' + yOf(L) + '" class="tc-grid' + (L === 1 || L === 5 ? ' edge' : '') + '"/><text x="' + (x0 - 8) + '" y="' + (yOf(L) + 4) + '" class="tc-num">' + L + '</text>';
  g += '<text x="' + x0 + '" y="' + (H - 4) + '" class="tc-cap">1 = lo más grave de tu voz</text><text x="' + x1 + '" y="' + (H - 4) + '" class="tc-cap" text-anchor="end">5 = lo más agudo</text>';
  const n = tones.length, slot = (x1 - x0) / n;
  tones.forEach((t, k) => {
    const pts = CHAO[t], a = x0 + k * slot + 10, b = a + slot - 20;
    const P = pts.map((L, i) => [a + (b - a) * i / (pts.length - 1), yOf(L)]);
    const d = P.length === 3 ? 'M' + P[0].join(' ') + ' Q' + P[1][0] + ' ' + (P[1][1] + 14) + ' ' + P[2].join(' ') : 'M' + P[0].join(' ') + ' L' + P[1].join(' ');
    g += '<path d="' + d + '" class="tc-line" pathLength="1" style="stroke:var(--t' + t + ');animation-delay:' + (k * 0.35) + 's"/><circle cx="' + P[P.length - 1][0] + '" cy="' + P[P.length - 1][1] + '" r="4.5" style="fill:var(--t' + t + ')"/>' +
      '<text x="' + ((a + b) / 2) + '" y="13" class="tc-t" text-anchor="middle" style="fill:var(--t' + t + ')">' + (n > 1 ? 'Tono ' + t : 'Tono ' + t + ' · ' + C.TONES[t].chao) + '</text>';
  });
  return '<svg class="tonechart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Forma de los tonos ' + tones.join(', ') + '">' + g + '</svg>';
}
function sizeCanvas(cv) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300, h = cv.clientHeight || 150;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}
function gridLevels(g, w, h, padL, padT, padB) {
  g.font = '11px ' + css('--f-body'); g.fillStyle = css('--ink-2'); g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let L = 1; L <= 5; L++) {
    const y = padT + (5 - L) * (h - padT - padB) / 4;
    g.strokeStyle = css('--line'); g.lineWidth = 1; g.setLineDash(L === 1 || L === 5 ? [] : [3, 4]);
    g.beginPath(); g.moveTo(padL, y); g.lineTo(w - 4, y); g.stroke();
    g.fillText(String(L), padL - 6, y);
  }
  g.setLineDash([]);
}
function plotLine(g, pts, x0, x1, yOf, color, width, dash) {
  if (!pts || pts.length < 2) return;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []);
  g.beginPath();
  pts.forEach((p, i) => { const x = x0 + (x1 - x0) * (p.t - t0) / Math.max(1e-3, t1 - t0); const y = yOf(p.L); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.stroke(); g.setLineDash([]);
}
function drawSyllable(cv, ref, user, color, isModel) {
  const { g, w, h } = sizeCanvas(cv);
  const padL = 22, padT = 10, padB = 12;
  g.clearRect(0, 0, w, h);
  gridLevels(g, w, h, padL, padT, padB);
  const yOf = L => padT + (5 - Math.max(0.6, Math.min(5.4, L))) * (h - padT - padB) / 4;
  if (ref) plotLine(g, ref, padL + 6, w - 10, yOf, css('--ref'), 7, null);
  if (user) plotLine(g, user, padL + 6, w - 10, yOf, color, 3.5, null);
}
function drawWord(cv, refSyls, userSyls, targets) {
  const { g, w, h } = sizeCanvas(cv);
  const padL = 22, padT = 10, padB = 12, n = targets.length;
  g.clearRect(0, 0, w, h);
  gridLevels(g, w, h, padL, padT, padB);
  const yOf = L => padT + (5 - Math.max(0.6, Math.min(5.4, L))) * (h - padT - padB) / 4;
  const slot = (w - padL - 10) / n;
  for (let k = 0; k < n; k++) {
    const x0 = padL + 6 + k * slot, x1 = x0 + slot - 12;
    if (refSyls && refSyls[k]) plotLine(g, refSyls[k], x0, x1, yOf, css('--ref'), 7);
    if (userSyls && userSyls[k]) plotLine(g, userSyls[k].pts, x0, x1, yOf, userSyls[k].color, 3.5);
    if (k) { g.strokeStyle = css('--line'); g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - 6, padT); g.lineTo(x0 - 6, h - padB); g.stroke(); }
  }
}
const levelsOf = contour => { const R = Core.range(); return contour.map(p => ({ t: p.t, L: 1 + 4 * (p.v - R.lo) / (R.hi - R.lo) })); };
function meter(zones, value, labels) {
  // zones: [{to, cls, label}] en 0..1 ; value 0..1
  let prev = 0;
  const z = zones.map(zn => { const wdt = (zn.to - prev) * 100; prev = zn.to; return '<div class="z" style="width:' + wdt + '%;background:var(' + zn.bg + ')">' + esc(zn.label || '') + '</div>'; }).join('');
  const v = Math.max(0, Math.min(1, value));
  return '<div class="meter" role="img" aria-label="' + esc(labels || '') + '">' + z + '<div class="needle" style="left:' + (v * 100).toFixed(1) + '%"></div></div>';
}
function checkMeter(c) {
  const good = '--jade-soft', badc = '--cinnabar-soft', mid = '--amber-soft';
  if (c.key === 'asp') {
    const max = 260, lo = c.lo / max, hi = c.hi / max;
    return meter([{ to: lo, bg: c.want ? badc : good, label: 'sin aire' }, { to: hi, bg: mid, label: '' }, { to: 1, bg: c.want ? good : badc, label: 'con aire' }], c.ms / max, c.ms + ' ms');
  }
  if (c.key === 'retro') return meter([{ to: 0.38, bg: c.want ? badc : good, label: 'lengua delante' }, { to: 0.62, bg: mid, label: '' }, { to: 1, bg: c.want ? good : badc, label: 'doblada atrás' }], c.p);
  if (c.key === 'nasal') return meter([{ to: 0.4, bg: c.want ? badc : good, label: '-n' }, { to: 0.6, bg: mid, label: '' }, { to: 1, bg: c.want ? good : badc, label: '-ng' }], c.p);
  if (c.key === 'vowel' && isFinite(c.value)) {
    if (c.label === 'Vocal ü') return meter([{ to: 0.45, bg: badc, label: 'u' }, { to: 0.58, bg: mid }, { to: 1, bg: good, label: 'ü' }], c.value);
    if (c.label === 'Vocal u') return meter([{ to: 0.4, bg: good, label: 'u' }, { to: 0.55, bg: mid }, { to: 1, bg: badc, label: 'ü' }], c.value);
    if (c.label === 'Vocal e') return meter([{ to: 0.46, bg: good, label: 'e china' }, { to: 0.56, bg: mid }, { to: 1, bg: badc, label: 'e española' }], c.value);
    if (c.label === 'La "i"') return meter([{ to: 0.7, bg: good, label: 'zumbido' }, { to: 0.8, bg: mid }, { to: 1, bg: badc, label: 'i española' }], c.value);
    if (c.label === 'er') return meter([{ to: 0.4, bg: good, label: 'con r' }, { to: 0.58, bg: mid }, { to: 1, bg: badc, label: 'sin r' }], (c.value - 0.7) / 0.4);
  }
  return '';
}

// ---------- vistas ----------
let current = 'map';
function go(view) {
  current = view;
  $$('main > .view').forEach(v => v.hidden = v.id !== 'v-' + view);
  $$('#tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.go === view ? 'page' : 'false'));
  ({ map: renderMap, review: () => (window.UI && UI.renderPractice ? UI.renderPractice() : renderReview()), table: renderTable, words: renderWords, settings: renderSettings })[view]();
  $('#main').scrollTop = 0;
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b) go(b.dataset.go); });

// ---------- lecciones ----------
const PRON_LESSONS = C.PRON.flatMap(s => s.lessons.map(l => Object.assign({ section: s.id }, l)));
const VOCAB_SECTIONS = Core.units.map(u => {
  const ws = Core.words.filter(w => w.unit === u.id);
  const chunks = []; for (let i = 0; i < ws.length; i += 6) chunks.push(ws.slice(i, i + 6));
  if (chunks.length > 1 && chunks[chunks.length - 1].length < 3) { const last = chunks.pop(); chunks[chunks.length - 1].push(...last); }
  return { id: 'U' + u.id, title: u.name, sub: ws.length + ' palabras', lessons: chunks.map((c, k) => ({ id: 'V' + u.id + '-' + (k + 1), title: u.name + (chunks.length > 1 ? ' ' + (k + 1) : ''), icon: c[0].h, kind: 'vocab', words: c, section: 'U' + u.id })) };
});
const VOCAB_LESSONS = VOCAB_SECTIONS.flatMap(s => s.lessons);
const lessonById = id => PRON_LESSONS.find(l => l.id === id) || VOCAB_LESSONS.find(l => l.id === id);
function isUnlocked(list, i) { return i === 0 || !!prog.done[list[i].id] || !!prog.done[list[i - 1].id]; }

function renderMap() {
  const v = $('#v-map');
  const cal = Core.calibration();
  const track = settings.track;
  const sections = track === 'pron' ? C.PRON : VOCAB_SECTIONS;
  const list = track === 'pron' ? PRON_LESSONS : VOCAB_LESSONS;
  const firstOpen = list.findIndex(l => !prog.done[l.id]);
  let html = '<div class="map-head"><div class="seg" role="group" aria-label="Recorrido">' +
    '<button data-track="pron" aria-pressed="' + (track === 'pron') + '">Pronunciación</button><button data-track="vocab" aria-pressed="' + (track === 'vocab') + '">Vocabulario</button></div></div>';
  if (!cal) html += '<div class="calib-banner"><p><b>Primero, calibra tu voz.</b> 30 segundos para que la app se adapte a tu tono y a tus vocales.</p><button class="btn primary small" data-act="calib">Calibrar</button></div>';
  const offsets = [0, 46, 70, 46, 0, -46, -70, -46];
  let gi = 0;
  sections.forEach(sec => {
    const done = sec.lessons.filter(l => prog.done[l.id]).length;
    html += '<div class="section"><div class="section-h"><div class="letter">' + esc(sec.id.replace('U', '')) + '</div><div><h2>' + esc(sec.title) + '</h2><p>' + esc(sec.sub) + '</p></div><div class="prog">' + done + '/' + sec.lessons.length + '</div></div><div class="path">';
    sec.lessons.forEach(l => {
      const i = list.findIndex(x => x.id === l.id), unlocked = isUnlocked(list, i), d = prog.done[l.id];
      const cls = d ? 'done' : unlocked ? 'unlocked' + (i === firstOpen ? ' current' : '') : '';
      const stars = d ? '<div class="stars">' + [1, 2, 3].map(k => I.star(k <= d.stars)).join('') + '</div>' : '';
      const iconTxt = l.kind === 'vocab' ? '<span class="han" style="font-size:1.6rem">' + esc(l.icon) + '</span>' : esc(l.icon);
      html += '<div class="node-wrap" style="--dx:' + offsets[gi++ % offsets.length] + 'px"><button class="node ' + cls + '" data-lesson="' + l.id + '" aria-label="' + esc(l.title) + '">' + iconTxt + (!unlocked && !d ? '<span class="lock">' + I.lock + '</span>' : '') + '</button><div class="node-label">' + esc(l.title) + '</div>' + stars + '</div>';
    });
    html += '</div></div>';
  });
  v.innerHTML = html;
}
$('#v-map').addEventListener('click', e => {
  const t = e.target.closest('[data-track]'); if (t) { settings.track = t.dataset.track; saveSettings(); renderMap(); return; }
  if (e.target.closest('[data-act="calib"]')) { openCalibration(); return; }
  const n = e.target.closest('[data-lesson]'); if (n) openLessonSheet(n.dataset.lesson);
});

function lessonDesc(l) {
  if (l.kind === 'vocab') return l.words.map(w => w.h).join(' · ');
  if (l.kind === 'contrast') return 'Escucha y distingue ' + C.display(l.a) + ' y ' + C.display(l.b) + ', y luego dilas tú.';
  if (l.kind === 'tone') return 'Escucha, imita y comprueba tu curva de tono.';
  if (l.kind === 'pairs') return 'Palabras de dos sílabas: tono a tono.';
  if (l.kind === 'sandhi') return 'Dos terceros tonos seguidos, 不 y 一.';
  if (l.kind === 'neutral') return 'Palabras con sílaba átona.';
  return 'Mira cómo se hace y practica.';
}
function openLessonSheet(id) {
  const l = lessonById(id); if (!l) return;
  const list = l.kind === 'vocab' ? VOCAB_LESSONS : PRON_LESSONS;
  const unlocked = isUnlocked(list, list.findIndex(x => x.id === l.id));
  const d = prog.done[id];
  openSheet(l.title, '<p class="muted">' + esc(lessonDesc(l)) + '</p>' +
    (d ? '<div class="kv"><span>Tu mejor resultado</span><b>' + Math.round(d.best * 100) + ' %</b></div>' : '') +
    (!unlocked ? '<div class="note">Esta lección aún está bloqueada. Puedes hacerla igualmente si ya dominas lo anterior.</div>' : '') +
    '<div class="row-btns"><button class="btn primary" data-start="' + id + '">' + (d ? 'Repetir' : unlocked ? 'Empezar' : 'Hacer igualmente') + '</button></div>');
}

// Construye los pasos de una lección
function sylWithTone(base, prefer) {
  const ts = shuffle(prefer || [1, 2, 3, 4]);
  for (const t of ts) if (Core.sylOK(base + t)) return base + t;
  for (const t of ts) if (Core.hasSyl(base + t)) return base + t;
  for (const t of [1, 2, 3, 4]) if (Core.hasSyl(base + t)) return base + t;
  return null;
}
function pairWithTone(a, b) {
  for (const t of shuffle([1, 2, 3, 4])) if (Core.sylOK(a + t) && Core.sylOK(b + t)) return [a + t, b + t];
  for (const t of shuffle([1, 2, 3, 4])) if (Core.hasSyl(a + t) && Core.hasSyl(b + t)) return [a + t, b + t];
  return null;
}
const sylTarget = (syl, focus) => ({ type: 'syl', syl, focus: focus || ['tone'] });
const wordTarget = w => ({ type: 'word', w });
function wordFromPhrase(ph) { const syls = ph.p.split(' '); const tones = syls.map(s => +s.slice(-1)); const vw = Core.words.find(w => w.h === ph.h); return vw || { id: 'ph-' + ph.h, h: ph.h, p: ph.p, es: ph.es, syls, tones, spoken: Core.spokenTones(tones, ph.h), audio: false }; }
function buildSteps(l) {
  const steps = [];
  const intro = (l.intro || []).map(id => ({ type: 'intro', card: C.intro(id) }));
  if (l.kind === 'tone') {
    steps.push(...intro);
    if (l.tones.length > 1) {
      for (let k = 0; k < 4; k++) {
        const t = pick(l.tones); const base = pick(['ma', 'ba', 'yi', 'wu', 'da', 'tang', 'fei', 'shi']);
        const syl = Core.hasSyl(base + t) ? base + t : 'ma' + t;
        steps.push({ type: 'listen', play: { syl }, prompt: '¿Qué tono has oído?', options: l.tones.map(tt => ({ value: tt, html: toneIcon(tt, false, true) + '<span class="sm">' + esc(C.TONES[tt].shape) + '</span>' })), answer: t });
      }
    }
    const sp = l.mixed ? shuffle(l.speak).slice(0, 8) : shuffle(l.speak).slice(0, 7);
    sp.forEach(s => steps.push({ type: 'speak', target: sylTarget(s, ['tone']) }));
  } else if (l.kind === 'contrast') {
    steps.push(...intro);
    const pairs = shuffle(l.pairs).map(([a, b]) => pairWithTone(a, b)).filter(Boolean);
    pairs.slice(0, 4).forEach(([a, b]) => { const ans = pick([a, b]); steps.push({ type: 'listen', play: { syl: ans }, prompt: '¿Cuál has oído?', options: [a, b].map(s => ({ value: s, html: '<span class="big">' + esc(Core.mark(s)) + '</span>' })), answer: ans }); });
    const focus = [l.check];
    pairs.slice(0, 4).forEach(([a, b]) => { steps.push({ type: 'speak', target: sylTarget(a, focus) }); steps.push({ type: 'speak', target: sylTarget(b, focus) }); });
  } else if (l.kind === 'set') {
    steps.push(...intro);
    (l.listenPairs || []).slice(0, 3).forEach(([a, b]) => { const pr = pairWithTone(a, b); if (!pr) return; const ans = pick(pr); steps.push({ type: 'listen', play: { syl: ans }, prompt: '¿Cuál has oído?', options: pr.map(s => ({ value: s, html: '<span class="big">' + esc(Core.mark(s)) + '</span>' })), answer: ans }); });
    shuffle(l.speak).slice(0, 8).forEach(s => steps.push({ type: 'speak', target: sylTarget(s, [l.check]) }));
    (l.words || []).forEach(h => { const w = Core.words.find(x => x.h === h); if (w) steps.push({ type: 'speak', target: wordTarget(w) }); });
  } else if (l.kind === 'pairs') {
    steps.push(...intro);
    const pool = shuffle(Core.words.filter(w => w.syls.length === 2 && Core.wordAudioOK(w) && !w.tones.includes(5)));
    pool.slice(0, 4).forEach(w => {
      const pat = w.spoken.join('-');
      const opts = new Set([pat]); while (opts.size < 4) opts.add([1 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 4)].join('-'));
      steps.push({ type: 'listen', play: { word: w }, prompt: '¿Qué tonos tiene ' + w.h + '?', options: shuffle([...opts]).map(p => ({ value: p, html: '<span>' + p.split('-').map(t => toneIcon(+t, true)).join('') + '</span><span class="sm">' + p.replace('-', ' + ') + '</span>' })), answer: pat });
    });
    pool.slice(4, 10).forEach(w => steps.push({ type: 'speak', target: wordTarget(w) }));
  } else if (l.kind === 'sandhi') {
    steps.push(...intro);
    const ph = C.SANDHI.map(wordFromPhrase);
    const nh = ph.find(w => w.h === '你好');
    steps.push({ type: 'listen', play: { word: nh }, prompt: '¿Cómo se dice 你好 de verdad?', options: [{ value: 'a', html: '<span class="big">nǐ hǎo</span><span class="sm">3 + 3</span>' }, { value: 'b', html: '<span class="big">ní hǎo</span><span class="sm">2 + 3</span>' }], answer: 'b' });
    shuffle(ph).slice(0, 7).forEach(w => steps.push({ type: 'speak', target: wordTarget(w) }));
  } else if (l.kind === 'neutral') {
    steps.push(...intro);
    shuffle(C.NEUTRAL).slice(0, 7).forEach(h => { const w = Core.words.find(x => x.h === h); if (w) steps.push({ type: 'speak', target: wordTarget(w) }); });
  } else if (l.kind === 'vocab') {
    const ws = l.words;
    ws.forEach(w => steps.push({ type: 'learn', w }));
    shuffle(ws).forEach(w => {
      const others = shuffle(Core.words.filter(x => x !== w && x.es !== w.es)).slice(0, 3);
      steps.push({ type: 'listen', play: { word: w }, prompt: '¿Qué significa?', show: w, options: shuffle([w, ...others]).map(x => ({ value: x.id, html: '<span>' + esc(x.es) + '</span>' })), answer: w.id, one: true });
    });
    shuffle(ws).slice(0, 3).forEach(w => {
      const others = shuffle(Core.words.filter(x => x !== w && x.syls.length === w.syls.length)).slice(0, 3);
      steps.push({ type: 'listen', play: { word: w }, prompt: '¿Qué palabra has oído?', options: shuffle([w, ...others]).map(x => ({ value: x.id, html: '<span class="han" style="font-size:1.5rem">' + esc(x.h) + '</span><span class="sm">' + esc(Core.markWord(x.p)) + '</span>' })), answer: w.id });
    });
    shuffle(ws).forEach(w => steps.push({ type: 'speak', target: wordTarget(w) }));
  }
  return steps;
}

// ---------- pantalla completa ----------
let overlayCleanup = [];
function openOverlay(html) {
  closeOverlay();
  const root = $('#overlayRoot');
  root.innerHTML = '<div class="overlay" role="dialog" aria-modal="true"><div class="ex">' + html + '</div></div>';
  return root.firstElementChild;
}
function closeOverlay() { overlayCleanup.forEach(f => { try { f(); } catch (e) {} }); overlayCleanup = []; $('#overlayRoot').innerHTML = ''; updateChips(); }

// ---------- hoja inferior ----------
function openSheet(title, body) {
  $('#sheetRoot').innerHTML = '<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-h"><h2>' + esc(title) + '</h2><button class="icon-btn" data-close aria-label="Cerrar">' + I.close + '</button></div><div class="sheet-b">' + body + '</div></div></div>';
  const back = $('#sheetRoot .sheet-back');
  return back;
}
function closeSheet() { $$('#sheetRoot .mouth').forEach(m => m._m && m._m.stop()); $('#sheetRoot').innerHTML = ''; }
$('#sheetRoot').addEventListener('click', e => {
  if (e.target.classList.contains('sheet-back') || e.target.closest('[data-close]')) { closeSheet(); return; }
  const st = e.target.closest('[data-start]'); if (st) { closeSheet(); startLesson(st.dataset.start); return; }
});

// ---------- tarjeta de explicación ----------
function introCardHTML(card) {
  let h = '<div class="card"><div><div class="eyebrow">' + (card.kind === 'ini' ? 'Consonante · ' + esc(card.sub || '') : card.kind === 'fin' ? 'Vocal / final' : 'Cómo suena') + '</div><h3>' + esc(card.title) + '</h3></div>';
  if (card.tones) h += toneChart(card.tones);
  h += '<p class="body">' + esc(card.body) + '</p>';
  if (card.es || card.en) h += '<div class="compare">' + (card.es ? '<div><b>En español</b>' + esc(card.es) + '</div>' : '') + (card.en ? '<div><b>En inglés</b>' + esc(card.en) + '</div>' : '') + '</div>';
  if (card.mistake) h += '<div class="note"><b>Error típico:</b> ' + esc(card.mistake) + '</div>';
  if (card.test) h += '<div class="note"><b>Prueba:</b> ' + esc(card.test) + '</div>';
  if (card.seq) h += '<div class="mouth" data-seq="' + esc(card.seq) + '"><div class="mouth-host"></div><button class="btn small" data-replay>' + I.play.replace('<svg', '<svg width="16" height="16"') + ' Ver otra vez</button></div>';
  const ex = card.ex || exampleSyls(card);
  if (ex.length) h += '<div class="ex-chips">' + ex.map(s => '<button class="chip" data-say="' + esc(s) + '">' + I.play.replace('<svg', '<svg width="14" height="14"') + esc(Core.mark(s)) + '</button>').join('') + '</div>';
  return h + '</div>';
}
function exampleSyls(card) {
  if (card.kind === 'ini') return ['a', 'u', 'i', 'e', 'ao', 'an'].map(f => sylWithTone(card.key + f, [1, 4])).filter(Boolean).slice(0, 4);
  if (card.kind === 'fin') {
    const k = card.key;
    if (k === 'i-apical') return ['zi4', 'ci2', 'si1'];
    if (k === 'i-retro') return ['zhi1', 'chi1', 'shi4', 'ri4'];
    const opts = C.TABLE_INI.map(i => C.spell(i, k)).filter(s => s && (Core.hasSyl(s + '1') || Core.hasSyl(s + '4')));
    return opts.slice(0, 4).map(s => sylWithTone(s, [1, 4])).filter(Boolean);
  }
  return [];
}
function mountMouths(root) {
  $$('.mouth', root).forEach(m => {
    const mo = window.Mouth.build($('.mouth-host', m)); m._m = mo;
    const seq = window.Mouth.SEQ[m.dataset.seq];
    if (seq) setTimeout(() => mo.play(seq), 250);
    overlayCleanup.push(() => mo.stop());
  });
}
document.addEventListener('click', e => {
  const r = e.target.closest('[data-replay]'); if (r) { const m = r.closest('.mouth'); if (m && m._m) m._m.play(window.Mouth.SEQ[m.dataset.seq]); return; }
  const s = e.target.closest('[data-say]'); if (s) { Core.playSyl(s.dataset.say); return; }
});
function helpFor(target) {
  // tarjetas útiles para un objetivo (sílaba o palabra)
  if (target.type === 'word') { return [C.intro('tones')]; }
  const sp = Core.split(target.syl), cards = [];
  if (target.focus && target.focus.includes('tone') || !target.focus) cards.push(C.intro('tone' + sp.tone));
  if (sp.ini && C.INI[sp.ini]) cards.push(C.intro('ini:' + sp.ini));
  const fk = C.FIN[sp.canon] ? sp.canon : C.FIN[sp.fin] ? sp.fin : null;
  if (fk) cards.push(C.intro('fin:' + fk));
  if (target.focus && !target.focus.includes('tone')) cards.push(cards.shift());
  return cards.filter(Boolean);
}
function openHelp(target) {
  const cards = helpFor(target);
  const back = openSheet('Cómo se hace', cards.map(introCardHTML).join(''));
  $$('.mouth', back).forEach(m => { const mo = window.Mouth.build($('.mouth-host', m)); m._m = mo; const seq = window.Mouth.SEQ[m.dataset.seq]; if (seq) setTimeout(() => mo.play(seq), 250); });
}

// ---------- ejercicio de hablar ----------
function targetHTML(t) {
  if (t.type === 'word') {
    const w = t.w;
    const diff = w.spoken.some((s, i) => s !== w.tones[i] && s !== 5);
    return '<div class="target"><div class="eyebrow">Di esta palabra</div><div class="hz">' + esc(w.h) + '</div><div class="py" style="font-size:clamp(2rem,10vw,2.8rem)">' + esc(Core.markWord(w.p)) + '</div>' +
      '<div class="toneicons">' + w.spoken.map(s => toneIcon(s)).join('') + '</div>' +
      (diff ? '<div class="spoken">Se dice: ' + esc(w.syls.map((s, i) => Core.mark(s.replace(/\d$/, '') + w.spoken[i])).join(' ')) + '</div>' : '') +
      '<div class="gloss">' + esc(w.es) + '</div></div>';
  }
  const sp = Core.split(t.syl);
  return '<div class="target"><div class="eyebrow">Di esta sílaba</div><div class="py">' + esc(Core.mark(t.syl)) + '</div><div class="toneicons">' + toneIcon(sp.tone) + '<span class="muted">' + esc(C.TONES[sp.tone] ? C.TONES[sp.tone].shape : '') + '</span></div></div>';
}
function speakWidget(host, target, opts = {}) {
  host.innerHTML = targetHTML(target) +
    '<div class="listen-row"><button class="play-btn" data-a="play">' + I.play + 'Escuchar</button><button class="play-btn" data-a="slow">' + I.slow + 'Lento</button><button class="play-btn" data-a="help">' + I.help + 'Cómo se hace</button></div>' +
    '<div class="mic-zone"><button class="mic" data-a="rec" aria-label="Grabar">' + I.mic + '</button><div class="mic-hint">Toca y habla. Para solo cuando te calles.</div><canvas class="live" hidden></canvas></div>' +
    '<div class="res-host"></div>';
  const st = { rec: null, last: null, best: null, attempts: 0, live: [] };
  const mic = $('[data-a="rec"]', host), hint = $('.mic-hint', host), live = $('canvas.live', host), resHost = $('.res-host', host);
  const playNative = (rate) => target.type === 'word' ? Core.playWord(target.w, { rate }) : Core.playSyl(target.syl, { rate });
  if (opts.autoplay !== false) setTimeout(() => playNative(), 300);
  function drawLive() {
    const { g, w, h } = sizeCanvas(live); g.clearRect(0, 0, w, h);
    g.strokeStyle = css('--line'); g.lineWidth = 1;
    for (let L = 1; L <= 5; L++) { const y = 6 + (5 - L) * (h - 12) / 4; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const pts = st.live.slice(-60); const R = Core.range();
    g.fillStyle = css('--jade');
    pts.forEach((p, i) => { if (p == null) return; const L = 1 + 4 * (p - R.lo) / (R.hi - R.lo); const y = 6 + (5 - Math.max(0.6, Math.min(5.4, L))) * (h - 12) / 4; g.beginPath(); g.arc(w - (pts.length - i) * (w / 60), y, 3.5, 0, 7); g.fill(); });
  }
  async function startRec() {
    if (st.rec) { st.rec.stop(); return; }
    resHost.innerHTML = '';
    try { await Core.openMic(); } catch (e) { resHost.innerHTML = micErrorHTML(); return; }
    mic.classList.add('rec'); mic.innerHTML = I.stop; hint.textContent = 'Te escucho… (toca para parar)'; live.hidden = false; st.live = [];
    const r = await Core.record({ maxSec: target.type === 'word' ? 2.2 + target.w.syls.length * 0.9 : 2.8, tail: 0.7, onLevel: (db, pst) => {
      mic.style.setProperty('--lvl', Math.max(2, Math.min(18, (db + 60) / 2.5)) + 'px');
      if (pst != null) st.live.push(pst); else if (st.live.length && st.live[st.live.length - 1] != null) st.live.push(null);
      drawLive();
    } });
    st.rec = r;
    const out = await r.done;
    st.rec = null;
    mic.classList.remove('rec'); mic.innerHTML = I.mic; mic.style.removeProperty('--lvl'); hint.textContent = 'Toca para repetir.'; live.hidden = true;
    evaluate(out.x);
  }
  async function evaluate(x) {
    st.last = x;
    mic.classList.add('busy');
    await new Promise(r => setTimeout(r, 30));
    let res;
    try { res = target.type === 'word' ? Core.evaluateWord(x, target.w) : Core.evaluateSyllable(x, target.syl, { focus: target.focus, checkU: (target.focus || []).includes('vowel') }); }
    catch (e) { console.error(e); res = { heard: false, reason: 'No he podido analizar la grabación.' }; }
    mic.classList.remove('busy');
    if (!res.heard) { resHost.innerHTML = '<div class="note">' + esc(res.reason || 'No te he oído bien.') + '</div>'; return; }
    st.attempts++;
    const score = scoreOf(res, target);
    if (!st.best || score > st.best.score) st.best = { score, res };
    renderResult(res, score);
    if (opts.onResult) opts.onResult(res, score, st.attempts);
  }
  function scoreOf(res, t) {
    if (t.type === 'word') return res.single ? scoreOf(res.single, { type: 'syl', focus: ['tone'] }) : res.score;
    const focus = t.focus || ['tone'];
    let graded = res.checks.filter(c => focus.includes(c.key) || c.key === 'tone');
    if (!graded.length) graded = res.checks;
    if (!graded.length) return 1;
    return graded.reduce((s, c) => s + (c.state === 'ok' ? 1 : c.state === 'unsure' ? 0.5 : 0), 0) / graded.length;
  }
  async function renderResult(res, score) {
    const kind = score >= 0.99 ? 'ok' : score >= 0.5 ? 'unsure' : 'bad';
    const big = { ok: '¡Muy bien!', unsure: 'Casi', bad: 'Otra vez' }[kind];
    let html = '<div class="result"><div class="verdict ' + kind + '"><div class="mark">' + I[kind] + '</div><div><div class="big">' + big + '</div><div class="small">' + (kind === 'ok' ? 'Así se dice.' : 'Mira qué cambiar y repite.') + '</div></div></div>';
    if (target.type === 'syl' || res.single) {
      const r = res.single || res;
      html += '<canvas class="contour"></canvas><div class="legend"><span><i style="background:var(--ref);height:6px"></i>Nativo</span><span><i style="background:var(--jade)"></i>Tú</span><span>1 = lo más grave de tu voz · 5 = lo más agudo</span></div>';
      html += '<div class="checks">' + r.checks.map(c => '<div class="check"><span class="pill ' + c.state + '">' + esc(c.label) + '</span><div class="msg">' + esc(c.msg) + '</div>' + checkMeter(c) + '</div>').join('') + '</div>';
      if (r.checks.some(c => c.key === 'asp')) html += '<div class="air"><div class="eyebrow">Mira el aire</div><canvas class="airwave"></canvas><div class="legend"><span><i style="background:var(--amber);height:8px"></i>Aire (soplo o roce)</span><span><i style="background:var(--jade);height:8px"></i>Voz</span></div></div>';
    } else {
      html += '<canvas class="contour"></canvas><div class="syl-strip">' + res.syls.map((s, i) => '<div class="syl-box ' + (s.state === 'skip' ? '' : s.state) + '"><span class="s">' + esc(Core.mark(target.w.syls[i].replace(/\d$/, '') + s.target)) + '</span>' + toneIcon(s.target, true) + '<small>' + esc(s.state === 'skip' ? 'neutro' : s.state === 'ok' ? 'bien' : s.heardAs ? 'sonó a tono ' + s.heardAs : '¿?') + '</small></div>').join('') + '</div>';
      const bad = res.syls.filter(s => s.state === 'bad');
      if (bad.length) html += '<div class="checks">' + bad.map(s => '<div class="check"><span class="pill bad">' + esc(Core.mark(s.syl.replace(/\d$/, '') + s.target)) + '</span><div class="msg">' + esc(wordToneTip(s)) + '</div></div>').join('') + '</div>';
    }
    html += '<div class="res-actions"><button class="btn small" data-a="me">' + I.play.replace('<svg', '<svg width="16" height="16"') + 'Tú</button><button class="btn small" data-a="play">' + I.play.replace('<svg', '<svg width="16" height="16"') + 'Nativo</button><button class="btn small" data-a="cmp">' + I.swap + 'Comparar</button>' +
      (Core.gemini.key() ? '<button class="btn small" data-a="gem">' + I.spark + 'Gemini</button>' : '') + '</div><div class="gem-host"></div></div>';
    resHost.innerHTML = html;
    const cv = $('canvas.contour', resHost);
    const userColor = css(kind === 'ok' ? '--jade' : kind === 'unsure' ? '--amber' : '--cinnabar');
    if (target.type === 'syl' || res.single) {
      const r = res.single || res;
      const rv = Core.refVoice(r.syl);
      const ref = rv ? await Core.refContour(rv, r.syl).catch(() => null) : null;
      drawSyllable(cv, ref ? ref.pts : idealContour(r.sp.tone), levelsOf(r.an.contour), userColor, !ref);
      if (!ref) { const lg = $('.legend span', resHost); if (lg) lg.innerHTML = '<i style="background:var(--ref);height:6px"></i>Curva modelo'; }
      const aw = $('canvas.airwave', resHost);
      if (aw) drawAir(aw, r, st.last).catch(() => {});
    } else {
      const w = target.w;
      const ref = w.audio ? await Core.refContour('w', w.h, w.syls.length).catch(() => null) : null;
      const refSyls = ref ? ref.syls.map((s, k) => s.pts || idealContour(w.spoken[k])) : w.spoken.map(t => idealContour(t));
      const userSyls = res.syls.map(s => ({ pts: levelsOf(s.contour), color: css(s.state === 'ok' ? '--jade' : s.state === 'bad' ? '--cinnabar' : '--amber') }));
      drawWord(cv, refSyls, userSyls, w.spoken);
    }
  }
  host.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const act = a.dataset.a;
    if (act === 'play') playNative();
    else if (act === 'slow') playNative(0.75);
    else if (act === 'help') openHelp(target);
    else if (act === 'rec') startRec();
    else if (act === 'me' && st.last) Core.playSamples(st.last);
    else if (act === 'cmp' && st.last) { await playNative(); await new Promise(r => setTimeout(r, 250)); Core.playSamples(st.last); }
    else if (act === 'gem' && st.last) {
      const gh = $('.gem-host', host); gh.innerHTML = '<div class="gemini muted">Preguntando a Gemini…</div>';
      try {
        const label = target.type === 'word' ? target.w.h + ' (' + Core.markWord(target.w.p) + ')' : Core.mark(target.syl);
        const g = await Core.gemini.ask(st.last, { label });
        const row = (k, v) => v ? '<div><b>' + k + ':</b> ' + esc(v) + '</div>' : '';
        gh.innerHTML = '<div class="gemini"><div class="eyebrow">Segunda opinión · Gemini</div>' + row('Oye', g.oigo) + row('Tonos', g.tonos) + row('Consonantes', g.consonantes) + row('Vocales', g.vocales) + row('Consejo', g.consejo) + '</div>';
      } catch (err) { gh.innerHTML = '<div class="gemini note err">' + esc(err.message || 'No he podido preguntar a Gemini.') + '</div>'; }
    }
  });
  overlayCleanup.push(() => { if (st.rec) st.rec.stop(); });
  return { best: () => st.best, attempts: () => st.attempts };
}
// Dibuja la onda del principio de la sílaba (nativo arriba, tú abajo) con el aire resaltado
async function drawAir(cv, r, x) {
  const bank = Core.voicesFor(r.syl)[0];
  const buf = await Core.bufferOf(bank, r.syl).catch(() => null);
  const rows = [];
  if (buf) { const nx = Core.samplesOf(buf); const na = E.analyzeSyllable(nx); if (na.ok) rows.push({ label: 'Nativo', x: nx, an: na }); }
  rows.push({ label: 'Tú', x, an: r.an });
  const { g, w, h } = sizeCanvas(cv); g.clearRect(0, 0, w, h);
  const span = 0.42, rowH = h / rows.length, padL = 54;
  g.font = '700 12px ' + css('--f-body'); g.textBaseline = 'middle';
  rows.forEach((row, k) => {
    const y0 = k * rowH, mid = y0 + rowH / 2, an = row.an;
    const t0 = Math.max(0, (isFinite(an.noiseOn) ? an.noiseOn : an.t0) - 0.04), SR = E.SR;
    const n = Math.round(span * SR), s0 = Math.round(t0 * SR), cols = Math.floor(w - padL - 6), per = Math.max(1, Math.floor(n / cols));
    let peak = 1e-6; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(row.x[s0 + i] || 0));
    const xOf = t => padL + (t - t0) / span * (w - padL - 6);
    // zonas
    if (isFinite(an.noiseOn) && isFinite(an.voiceOn) && an.voiceOn > an.noiseOn) { g.fillStyle = css('--amber-soft'); g.fillRect(xOf(an.noiseOn), y0 + 4, xOf(an.voiceOn) - xOf(an.noiseOn), rowH - 8); }
    if (isFinite(an.voiceOn)) { g.fillStyle = css('--jade-soft'); g.fillRect(xOf(an.voiceOn), y0 + 4, w - 6 - xOf(an.voiceOn), rowH - 8); }
    for (let c = 0; c < cols; c++) {
      let m = 0; for (let i = 0; i < per; i++) m = Math.max(m, Math.abs(row.x[s0 + c * per + i] || 0));
      const a = Math.sqrt(m / peak) * (rowH / 2 - 8), t = t0 + c * per / SR;
      g.fillStyle = isFinite(an.voiceOn) && t >= an.voiceOn ? css('--jade') : isFinite(an.noiseOn) && t >= an.noiseOn ? css('--amber') : css('--line');
      g.fillRect(padL + c, mid - a, 1, Math.max(1, 2 * a));
    }
    g.fillStyle = css('--ink'); g.textAlign = 'left'; g.fillText(row.label, 4, mid - 8);
    g.fillStyle = css('--ink-2'); g.font = '11px ' + css('--f-body'); g.fillText(Math.round((an.noiseDur || 0) * 1000) + ' ms', 4, mid + 9); g.font = '700 12px ' + css('--f-body');
    if (k) { g.strokeStyle = css('--line'); g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0); g.stroke(); }
  });
}
function idealContour(t) { const p = CHAO[t] || [3, 3]; return p.map((L, i) => ({ t: i / (p.length - 1), L })); }
function wordToneTip(s) {
  const tips = { 1: 'Mantén esta sílaba alta y plana.', 2: 'Esta sílaba debe subir con claridad.', 3: 'Esta sílaba va abajo del todo (sin subir si va delante de otra).', 4: 'Esta sílaba cae desde arriba, seca.' };
  return 'Ha sonado a tono ' + s.heardAs + '. ' + tips[s.target];
}
function micErrorHTML() {
  if (Core.micState === 'denied') return '<div class="note err"><b>No tengo permiso para usar el micrófono.</b> Toca el candado de la barra de direcciones, permite el micrófono y vuelve a intentarlo.</div>';
  return '<div class="note err"><b>Aquí no puedo usar el micrófono.</b> Abre la app desde <b>servidorfalangas.github.io/pinyin</b> en Chrome; desde ahí funciona el micro y puedes instalarla en el móvil.</div>';
}

// ---------- ejecutor de lecciones ----------
function startLesson(id) {
  const l = lessonById(id); if (!l) return;
  if (l.kind !== 'vocab' && !Core.calibration()) { toast('Primero calibra tu voz: son 30 segundos'); openCalibration(() => startLesson(id)); return; }
  runSession({ title: l.title, steps: buildSteps(l), lesson: l });
}
function runSession(sess) {
  const ov = openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Salir">' + I.close + '</button><div class="bar"><i style="width:0"></i></div></div><div class="ex-body"></div><div class="ex-foot"></div>');
  const body = $('.ex-body', ov), foot = $('.ex-foot', ov), bar = $('.bar i', ov);
  sess.i = 0; sess.results = []; sess.wrong = []; sess.log = [];
  $('[data-x]', ov).addEventListener('click', () => { closeOverlay(); renderCurrent(); });
  const graded = () => sess.steps.filter(s => s.type === 'speak' || s.type === 'listen').length;
  function show() {
    body.onclick = null; foot.onclick = null;
    bar.style.width = (100 * sess.i / sess.steps.length) + '%';
    foot.className = 'ex-foot'; foot.innerHTML = '';
    body.scrollTop = 0;
    const s = sess.steps[sess.i];
    if (!s) return finish();
    if (s.type === 'intro') {
      body.innerHTML = introCardHTML(s.card); mountMouths(body);
      foot.innerHTML = '<button class="btn primary" data-n>Continuar</button>';
    } else if (s.type === 'learn') {
      const w = s.w;
      body.innerHTML = '<div class="target"><div class="eyebrow">Palabra nueva</div><div class="hz" style="font-size:3.4rem">' + esc(w.h) + '</div><div class="py" style="font-size:2.2rem">' + esc(Core.markWord(w.p)) + '</div><div class="toneicons">' + w.spoken.map(t => toneIcon(t)).join('') + '</div><div class="gloss" style="font-size:1.1rem">' + esc(w.es) + '</div></div><div class="listen-row"><button class="play-btn big" data-pw>' + I.play + 'Escuchar</button></div>' + wordNotes(w);
      $('[data-pw]', body).addEventListener('click', () => Core.playWord(w));
      setTimeout(() => Core.playWord(w), 300);
      foot.innerHTML = '<button class="btn primary" data-n>Continuar</button>';
    } else if (s.type === 'listen') {
      let chosen = null;
      const showWord = s.show ? '<div class="target"><div class="hz" style="font-size:3rem">' + esc(s.show.h) + '</div><div class="py" style="font-size:1.8rem">' + esc(Core.markWord(s.show.p)) + '</div></div>' : '';
      body.innerHTML = '<div class="eyebrow" style="text-align:center">' + esc(s.prompt) + '</div>' + showWord + '<div class="listen-row"><button class="play-btn big" data-pl>' + I.play + 'Escuchar</button><button class="play-btn" data-sl>' + I.slow + 'Lento</button></div><div class="options' + (s.one ? ' one' : '') + '">' + s.options.map((o, k) => '<button class="opt" data-o="' + k + '">' + o.html + '</button>').join('') + '</div>';
      const play = rate => s.play.sent ? Core.playSentence(s.play.sent, { rate }) : s.play.word ? Core.playWord(s.play.word, { rate }) : Core.playSyl(s.play.syl, { rate });
      setTimeout(() => play(), 300);
      $('[data-pl]', body).addEventListener('click', () => play());
      $('[data-sl]', body).addEventListener('click', () => play(0.75));
      foot.innerHTML = '<button class="btn primary" data-chk disabled>Comprobar</button>';
      body.onclick = e => {
        const o = e.target.closest('[data-o]'); if (!o || foot.dataset.locked) return;
        $$('.opt', body).forEach(x => x.classList.remove('sel')); o.classList.add('sel'); chosen = +o.dataset.o; $('[data-chk]', foot).disabled = false;
      };
      foot.onclick = e => {
        if (!e.target.closest('[data-chk]') || chosen == null) return;
        foot.dataset.locked = '1';
        const ok = s.options[chosen].value === s.answer;
        $$('.opt', body).forEach((x, k) => { if (s.options[k].value === s.answer) x.classList.add('right'); else if (k === chosen) x.classList.add('wrong'); });
        sess.results.push(ok ? 1 : 0);
        sess.log.push({ cat: s.cat || 'listen', v: ok ? 1 : 0 });
        recordCheck('listen', ok ? 'ok' : 'bad');
        if (s.stat) Core.fine.add(s.stat, ok ? 1 : 0);
        if (!ok) { sess.wrong.push(s); play(); }
        foot.className = 'ex-foot ' + (ok ? 'ok' : 'bad');
        foot.innerHTML = '<div style="flex:1;align-self:center;font-weight:700">' + (ok ? '¡Correcto!' : 'Era: ' + esc(s.options.find(o => o.value === s.answer).label || s.options.find(o => o.value === s.answer).html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())) + '</div><button class="btn primary" data-n>Continuar</button>';
        if (s.explain) body.insertAdjacentHTML('beforeend', '<div class="note">' + s.explain + '</div>');
        if (!ok && s.compare) body.insertAdjacentHTML('beforeend', '<div class="listen-row">' + s.compare.map(c => '<button class="play-btn" data-say="' + esc(c) + '">' + I.play + esc(Core.mark(c)) + '</button>').join('') + '</div>');
        body.onclick = null; delete foot.dataset.locked;
        foot.onclick = ev => { if (ev.target.closest('[data-n]')) { sess.i++; show(); } };
      };
      return;
    } else if (s.type === 'dictate') {
      dictateStep(s, body, foot, (v) => { sess.results.push(v); sess.log.push({ cat: s.cat || 'dict', v }); if (v < 0.99) sess.wrong.push(s); }, () => { sess.i++; show(); });
      return;
    } else if (s.type === 'speak') {
      body.innerHTML = '<div class="speak-host view"></div>';
      let recorded = false;
      const sw = speakWidget($('.speak-host', body), s.target, { onResult: (res, score, n) => {
        if (n === 1) {
          // estadísticas solo con el primer intento
          if (s.target.type === 'syl') { res.checks.forEach(c => recordCheck(c.key, c.state)); const tc = res.checks.find(c => c.key === 'tone'); if (tc) recordTone(res.sp.tone, tc.state === 'ok'); }
          else if (res.syls) res.syls.forEach(x => { if (x.state !== 'skip') { recordCheck('tone', x.state); recordTone(x.target, x.state === 'ok'); } });
          else if (res.single) res.single.checks.forEach(c => recordCheck(c.key, c.state));
          fineFromResult(res, s.target);
        }
        recorded = true; $('[data-n]', foot).disabled = false; $('[data-n]', foot).textContent = 'Continuar';
      } });
      foot.innerHTML = '<button class="btn ghost" data-skip>Ahora no puedo hablar</button><button class="btn primary" data-n disabled>Graba para seguir</button>';
      foot.onclick = e => {
        if (e.target.closest('[data-skip]')) { sess.results.push(null); sess.i++; foot.onclick = null; show(); return; }
        if (!e.target.closest('[data-n]') || !recorded) return;
        const best = sw.best(); const sc = best ? best.score : 0;
        sess.results.push(sc); sess.log.push({ cat: s.cat || 'speak', v: sc });
        const item = s.target.type === 'word' ? { type: 'word', key: s.target.w.h } : { type: 'syl', key: s.target.syl, focus: s.target.focus };
        if (sc < 0.75) { sess.wrong.push(s); srsAdd(item, false); } else if (srs[item.type + ':' + item.key]) srsAdd(item, true);
        if (s.target.type === 'word' && Core.words.includes(s.target.w)) { const wp = prog.words[s.target.w.h] || (prog.words[s.target.w.h] = { n: 0, ok: 0 }); wp.n++; wp.ok += sc; }
        sess.i++; foot.onclick = null; show();
      };
      return;
    }
    foot.onclick = e => { if (e.target.closest('[data-n]')) { sess.i++; foot.onclick = null; show(); } };
  }
  function finish() {
    bar.style.width = '100%';
    const vals = sess.results.filter(v => v != null);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const stars = score >= 0.9 ? 3 : score >= 0.75 ? 2 : score >= 0.5 ? 1 : 0;
    const gained = Math.round(score * 10) + (stars ? 10 : 2);
    prog.xp += gained; markDay();
    if (sess.lesson) {
      const prev = prog.done[sess.lesson.id];
      if (stars > 0 && (!prev || score > prev.best)) prog.done[sess.lesson.id] = { stars, best: score, at: Date.now() };
      else if (prev) prev.at = Date.now();
    }
    saveProg();
    const extra = sess.onFinish ? sess.onFinish(sess, score) || '' : '';
    const wrongNames = [...new Set(sess.wrong.filter(s => s.type === 'speak').map(s => s.target.type === 'word' ? s.target.w.h : Core.mark(s.target.syl)))];
    const head = sess.lesson ? (stars === 3 ? '¡Excelente!' : stars === 2 ? '¡Muy bien!' : stars === 1 ? 'Superada' : 'Hay que repetirla') : (score >= 0.9 ? '¡Excelente!' : score >= 0.75 ? '¡Muy bien!' : score >= 0.5 ? 'Bien, sigue así' : 'Hay que practicar más');
    body.innerHTML = '<div class="summary"><div class="bigstars">' + [1, 2, 3].map(k => I.star(k <= stars)).join('') + '</div><div class="score">' + Math.round(score * 100) + ' %</div><h2>' + head + '</h2><p class="muted">+' + gained + ' puntos' + (vals.length < graded() ? ' · ' + (graded() - vals.length) + ' ejercicios saltados' : '') + '</p>' +
      extra + (wrongNames.length ? '<div class="panel" style="width:100%;text-align:left"><h3>Para el repaso</h3><p class="muted">Te los volveré a pedir en la pestaña Practicar:</p><div class="ex-chips">' + wrongNames.map(n => '<span class="chip">' + esc(n) + '</span>').join('') + '</div></div>' : '') + '</div>';
    foot.innerHTML = (stars === 0 && sess.lesson ? '<button class="btn" data-again>Repetir</button>' : '') + '<button class="btn primary" data-end>Terminar</button>';
    foot.onclick = e => {
      if (e.target.closest('[data-end]')) { closeOverlay(); renderCurrent(); }
      if (e.target.closest('[data-again]')) { closeOverlay(); startLesson(sess.lesson.id); }
    };
  }
  show();
}
// estadísticas finas a partir de un resultado de hablar
const ST_V = st => st === 'ok' ? 1 : st === 'unsure' ? 0.5 : 0;
function fineFromResult(res, target) {
  const fromChecks = (r) => {
    const sp = r.sp; if (!sp) return;
    const map = { tone: 'S:tone:' + sp.tone, asp: 'S:asp:' + sp.ini, retro: 'S:retro:' + sp.ini, vowel: 'S:vowel:' + sp.canon, nasal: 'S:nasal:' + sp.canon };
    r.checks.forEach(c => { if (map[c.key]) Core.fine.add(map[c.key], ST_V(c.state)); });
    if (r.checks.length) Core.fine.add('syl:' + sp.base, r.checks.reduce((a, c) => a + ST_V(c.state), 0) / r.checks.length);
  };
  if (target.type === 'syl') return fromChecks(res);
  if (res.single) return fromChecks(res.single);
  if (!res.syls) return;
  const w = target.w, graded = [];
  res.syls.forEach((x, i) => {
    if (x.state === 'skip') return;
    const v = ST_V(x.state); graded.push(v);
    Core.fine.add('S:tone:' + x.target, v);
    const base = w.syls[i].replace(/\d$/, ''); if (Core.hasSyl(base + '1') || Core.hasSyl(base + '4')) Core.fine.add('syl:' + base, v);
  });
  if (w.syls.length === 2 && graded.length) Core.fine.add('S:pair:' + w.tones.join(''), graded.reduce((a, b) => a + b, 0) / graded.length);
}

// ---------- dictado ----------
function sylParts(base) { const sp = Core.split(base + '1'); return sp ? { ini: sp.spelledIni && 'yw'.includes(sp.spelledIni) ? '' : sp.ini, fin: sp.canon } : { ini: '', fin: base }; }
function dictateStep(s, body, foot, onScore, next) {
  const play = rate => s.play.sent ? Core.playSentence(s.play.sent, { rate }) : s.play.word ? Core.playWord(s.play.word, { rate }) : Core.playSyl(s.play.syl, { rate });
  body.innerHTML = '<div class="eyebrow" style="text-align:center">' + esc(s.prompt || 'Escribe en pinyin lo que oyes') + '</div>' +
    '<div class="listen-row"><button class="play-btn big" data-pl>' + I.play + 'Escuchar</button><button class="play-btn" data-sl>' + I.slow + 'Lento</button></div>' +
    '<input class="text dict-in" id="dictIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (s.answer.length > 1 ? 'por ejemplo: ni3 hao3' : 'por ejemplo: ma3') + '">' +
    '<div class="keys"><button data-k="1">1 ā</button><button data-k="2">2 á</button><button data-k="3">3 ǎ</button><button data-k="4">4 à</button><button data-k="5">neutro</button><button data-k="ü">ü</button><button data-k=" ">espacio</button><button data-k="del">⌫</button></div>' +
    '<p class="muted" style="text-align:center">Pon el número del tono detrás de cada sílaba. Para la ü escribe v o usa el botón.' + (s.hint ? ' ' + esc(s.hint) : '') + '</p><div class="dict-res"></div>';
  const inp = $('#dictIn', body);
  setTimeout(() => play(), 300);
  $('[data-pl]', body).addEventListener('click', () => play());
  $('[data-sl]', body).addEventListener('click', () => play(0.75));
  body.onclick = e => {
    const k = e.target.closest('[data-k]'); if (!k || inp.disabled) return;
    const v = k.dataset.k;
    if (v === 'del') inp.value = inp.value.slice(0, -1); else inp.value += (v === '5' ? '5 ' : /[1-4]/.test(v) ? v + ' ' : v === 'ü' ? 'v' : v);
    inp.focus();
  };
  foot.innerHTML = '<button class="btn primary" data-chk>Comprobar</button>';
  const check = () => {
    if (inp.disabled) return;
    const got = Core.parsePinyin(inp.value);
    if (!got.length) { inp.focus(); return; }
    inp.disabled = true;
    const rows = []; let total = 0;
    s.answer.forEach((a, i) => {
      const g = got[i] || { base: '', tone: 0 };
      const pa = sylParts(a.base.replace(/r$/, a.base.length > 2 ? '' : 'r')), pg = sylParts(g.base.replace(/r$/, g.base.length > 2 ? '' : 'r'));
      const iniOk = g.base && pa.ini === pg.ini, finOk = g.base && pa.fin === pg.fin && (a.base.endsWith('r') === g.base.endsWith('r'));
      const okTones = [a.tone].concat(a.alt || []);
      const toneOk = !!g.base && (okTones.includes(g.tone) || (a.tone === 5 && g.tone === 5));
      const v = ((iniOk ? 1 : 0) + (finOk ? 1 : 0) + (toneOk ? 1 : 0)) / 3; total += v;
      if (a.tone >= 1 && a.tone <= 4) Core.fine.add('D:tone:' + a.tone, toneOk ? 1 : 0);
      if (pa.ini) Core.fine.add('D:ini:' + pa.ini, iniOk ? 1 : 0);
      Core.fine.add('D:fin:' + pa.fin, finOk ? 1 : 0);
      rows.push('<div class="dict-row"><span class="py-ok">' + esc(Core.mark(a.base + a.tone)) + '</span><span class="py-you">' + (g.base ? esc(Core.mark(g.base + g.tone)) : '—') + '</span>' +
        '<div class="pills"><span class="pill ' + (iniOk ? 'ok' : 'bad') + '">inicial</span><span class="pill ' + (finOk ? 'ok' : 'bad') + '">final</span><span class="pill ' + (toneOk ? 'ok' : 'bad') + '">tono</span></div>' +
        (!iniOk || !finOk ? '<button class="link" data-ab="' + esc(a.base + (a.tone === 5 ? 1 : a.tone)) + '|' + esc((g.base || '') + (g.tone === 5 || !g.tone ? 1 : g.tone)) + '">oír las dos</button>' : '') + '</div>');
    });
    if (got.length > s.answer.length) rows.push('<p class="muted">Has escrito ' + (got.length - s.answer.length) + ' sílaba(s) de más.</p>');
    const score = total / s.answer.length;
    $('.dict-res', body).innerHTML = '<div class="result"><div class="dict-head"><span>Correcto</span><span>Tú</span></div>' + rows.join('') + (s.show ? '<div class="target" style="padding-top:4px"><div class="hz" style="font-size:2rem">' + esc(s.show.h) + '</div><div class="gloss">' + esc(s.show.es) + '</div></div>' : '') + '</div>';
    onScore(score);
    foot.className = 'ex-foot ' + (score >= 0.99 ? 'ok' : 'bad');
    foot.innerHTML = '<div style="flex:1;align-self:center;font-weight:700">' + (score >= 0.99 ? '¡Perfecto!' : Math.round(score * 100) + ' % bien') + '</div><button class="btn primary" data-n>Continuar</button>';
    foot.onclick = e => { if (e.target.closest('[data-n]')) { body.onclick = null; next(); } };
    if (score < 0.99) play();
  };
  foot.onclick = e => { if (e.target.closest('[data-chk]')) check(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
  body.addEventListener('click', async e => { const ab = e.target.closest('[data-ab]'); if (!ab) return; const [x, y] = ab.dataset.ab.split('|'); await Core.playSyl(x); await new Promise(r => setTimeout(r, 300)); if (y && Core.hasSyl(y)) Core.playSyl(y); });
}

function wordNotes(w) {
  const diff = w.spoken.some((s, i) => s !== w.tones[i] && s !== 5);
  const notes = [];
  if (diff) notes.push('Ojo: al hablar se dice ' + w.syls.map((s, i) => Core.mark(s.replace(/\d$/, '') + w.spoken[i])).join(' ') + ' (cambio de tono).');
  if (w.tones.includes(5)) notes.push('La sílaba sin marca es neutra: corta y suave.');
  return notes.length ? '<div class="note">' + notes.map(esc).join('<br>') + '</div>' : '';
}
function renderCurrent() { go(current); }

// ---------- práctica libre ----------
function openPractice(target, title) {
  const ov = openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Cerrar">' + I.close + '</button><b style="flex:1">' + esc(title || 'Práctica') + '</b></div><div class="ex-body"><div class="speak-host view"></div></div>');
  $('[data-x]', ov).addEventListener('click', () => { closeOverlay(); renderCurrent(); });
  if (!Core.calibration()) $('.speak-host', ov).insertAdjacentHTML('beforebegin', '<div class="note">Aún no has calibrado tu voz: las medidas serán menos precisas. <button class="link" data-cal>Calibrar ahora</button></div>');
  ov.addEventListener('click', e => { if (e.target.closest('[data-cal]')) openCalibration(() => openPractice(target, title)); });
  speakWidget($('.speak-host', ov), target, { onResult: (res, score, n) => {
    if (n === 1) { markDay(); if (res.checks) res.checks.forEach(c => recordCheck(c.key, c.state)); saveProg(); }
    const item = target.type === 'word' ? { type: 'word', key: target.w.h } : { type: 'syl', key: target.syl, focus: target.focus };
    if (n === 1) { if (score < 0.75) srsAdd(item, false); else if (srs[item.type + ':' + item.key]) srsAdd(item, true); }
  } });
}

// ---------- calibración ----------
const CAL_STEPS = [
  { id: 'noise', title: 'Silencio', say: '🤫', text: 'Quédate en silencio 2 segundos para que mida el ruido de fondo.', fixed: 2 },
  { id: 't1', title: 'Tonos 1/4', say: 'mā', syl: 'ma1', text: 'Escucha y repite: alto y plano.' },
  { id: 't2', title: 'Tonos 2/4', say: 'má', syl: 'ma2', text: 'Escucha y repite: sube.' },
  { id: 't3', title: 'Tonos 3/4', say: 'mǎ', syl: 'ma3', text: 'Escucha y repite: baja hasta el fondo de tu voz.' },
  { id: 't4', title: 'Tonos 4/4', say: 'mà', syl: 'ma4', text: 'Escucha y repite: cae de arriba abajo.' },
  { id: 'a', title: 'Vocal a', say: 'aaaa', text: 'Di "aaaa" sostenido, con tu voz normal.', fixed: 2.2 },
  { id: 'i', title: 'Vocal i', say: 'iiii', text: 'Di "iiii" sostenido, con sonrisa.', fixed: 2.2 },
  { id: 'u', title: 'Vocal u', say: 'uuuu', text: 'Di "uuuu" sostenido, con los labios redondos.', fixed: 2.2 },
  { id: 's', title: 'Sonido s', say: 'sssss', text: 'Sisea "sssss" sin voz, como una serpiente.', fixed: 2.2 },
  { id: 'sh', title: 'Sonido sh', say: 'shhhh', text: 'Haz "shhhh", como para mandar callar.', fixed: 2.2 },
];
function openCalibration(after) {
  const ov = openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Cerrar">' + I.close + '</button><b style="flex:1">Calibrar tu voz</b></div><div class="ex-body"></div><div class="ex-foot"></div>');
  const body = $('.ex-body', ov), foot = $('.ex-foot', ov);
  $('[data-x]', ov).addEventListener('click', () => { closeOverlay(); renderCurrent(); });
  const got = {}; let i = -1;
  function intro() {
    body.innerHTML = '<div class="card"><h3>30 segundos para adaptarme a tu voz</h3><p>Cada voz es distinta: unas son graves y otras agudas, y cada micrófono suena diferente. Te pediré 10 cosas muy cortas:</p><ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>2 segundos de silencio, para medir el ruido.</li><li><b>mā má mǎ mà</b>: así sé dónde están lo más agudo y lo más grave de tu voz (los niveles 1 a 5 de los tonos).</li><li>Las vocales <b>a</b>, <b>i</b>, <b>u</b>: así puedo medir la ü, la e china y las nasales con tu boca.</li><li><b>sss</b> y <b>shhh</b>: así sé cómo suenan en tu micro la lengua delante y la lengua atrás.</li></ul><div class="note">Busca un sitio tranquilo, sujeta el móvil a un palmo de la boca y habla con tu voz normal.</div></div>';
    foot.innerHTML = '<button class="btn primary" data-go1>Empezar</button>';
    foot.onclick = async e => { if (!e.target.closest('[data-go1]')) return; try { await Core.openMic(); } catch (err) { body.insertAdjacentHTML('afterbegin', micErrorHTML()); return; } i = 0; step(); };
  }
  function dots() { return '<div class="calib-dots">' + CAL_STEPS.map((_, k) => '<i class="' + (k < i ? 'on' : '') + '"></i>').join('') + '</div>'; }
  function step() {
    const s = CAL_STEPS[i];
    if (!s) return summary();
    body.innerHTML = dots() + '<div class="calib-step"><div class="eyebrow">' + esc(s.title) + '</div><div class="say">' + esc(s.say) + '</div><p>' + esc(s.text) + '</p>' + (s.syl ? '<button class="play-btn" data-pl>' + I.play + 'Escuchar</button>' : '') + '<button class="mic" data-rec aria-label="Grabar">' + I.mic + '</button><div class="mic-hint">' + (s.fixed ? 'Toca y ' + (s.id === 'noise' ? 'no digas nada.' : 'mantén el sonido hasta que pare.') : 'Toca y repite.') + '</div><div class="cal-msg"></div></div>';
    foot.innerHTML = '<button class="btn ghost" data-back' + (i === 0 ? ' disabled' : '') + '>Atrás</button><button class="btn" data-skipc>Saltar</button>';
    if (s.syl) { setTimeout(() => Core.playSyl(s.syl), 300); $('[data-pl]', body).addEventListener('click', () => Core.playSyl(s.syl)); }
    const mic = $('[data-rec]', body), msg = $('.cal-msg', body);
    let busy = false;
    mic.addEventListener('click', async () => {
      if (busy) return; busy = true;
      mic.classList.add('rec'); mic.innerHTML = I.stop;
      const r = await Core.record({ fixed: s.fixed || 0, maxSec: 2.5, tail: 0.6, onLevel: db => mic.style.setProperty('--lvl', Math.max(2, Math.min(18, (db + 60) / 2.5)) + 'px') });
      const out = await r.done;
      mic.classList.remove('rec'); mic.innerHTML = I.mic; busy = false;
      const ok = process(s, out.x);
      if (ok === true) { msg.innerHTML = '<div class="pill ok">Hecho</div>'; setTimeout(() => { i++; step(); }, 500); }
      else msg.innerHTML = '<div class="note">' + esc(ok) + '</div>';
    });
    foot.onclick = e => { if (e.target.closest('[data-back]') && i > 0) { i--; step(); } if (e.target.closest('[data-skipc]')) { i++; step(); } };
  }
  function process(s, x) {
    try {
      if (s.id === 'noise') { got.noise = Core.calibrate.noise(x); return true; }
      if (s.id[0] === 't') {
        const an = E.analyzeSyllable(x, { noiseDb: got.noise ? got.noise.e + 3 : undefined });
        if (!an.ok || an.contour.length < 6) return 'No te he oído bien. Repite un poco más fuerte.';
        got[s.id] = an.contour; return true;
      }
      if ('aiu'.includes(s.id)) { const v = Core.calibrate.vowel(x); if (!v) return 'No he podido medir la vocal. Mantenla 2 segundos con voz clara.'; got[s.id] = v; return true; }
      if (s.id === 's' || s.id === 'sh') { const f = Core.calibrate.fric(x); if (!f) return 'No lo he oído. Hazlo un poco más fuerte y mantenlo.'; got[s.id] = f; return true; }
    } catch (err) { console.error(err); return 'Algo ha fallado al medir. Repite.'; }
    return true;
  }
  function summary() {
    const prev = Core.calibration() || {};
    const tones = ['t1', 't2', 't3', 't4'].map(k => got[k]).filter(Boolean);
    const range = tones.length >= 3 ? Core.calibrate.tones(tones) : prev.range;
    const vowels = got.a && got.i && got.u ? { a: got.a, i: got.i, u: got.u } : prev.vowels;
    const fric = got.s && got.sh ? { s: got.s, sh: got.sh } : prev.fric;
    const cal = { range, vowels, fric, noise: got.noise || prev.noise, at: Date.now() };
    const warns = [];
    if (cal.noise && cal.noise.e > -38) warns.push('Hay bastante ruido de fondo: las medidas serán menos fiables.');
    if (vowels && !(vowels.i.F2 > vowels.a.F2 && vowels.a.F2 > vowels.u.F2)) warns.push('Las vocales no han salido como esperaba. Si las medidas de vocales fallan, repite la calibración.');
    if (fric && !(fric.sh.low > fric.s.low)) warns.push('Tu "sh" y tu "s" se parecen mucho en este micro: la medida de la lengua será menos fiable.');
    if (fric && fric.s.high < 0.15) warns.push('Tu micro recorta los agudos: la diferencia s / sh será menos precisa.');
    if (!range) { body.innerHTML = '<div class="note err">Necesito al menos tres de los cuatro tonos para calibrar. Vuelve a intentarlo.</div>'; foot.innerHTML = '<button class="btn primary" data-re>Repetir</button>'; foot.onclick = e => { if (e.target.closest('[data-re]')) { i = 0; step(); } }; return; }
    Core.saveCalibration(cal);
    const semis = (range.hi - range.lo).toFixed(0);
    body.innerHTML = dots() + '<div class="card"><h3>Listo, ya conozco tu voz</h3><div class="kv"><span>Tu rango de tonos</span><b>' + semis + ' semitonos (' + Math.round(E.hz(range.lo)) + '–' + Math.round(E.hz(range.hi)) + ' Hz)</b></div>' +
      (vowels ? '<div class="kv"><span>Vocales a · i · u</span><b>medidas</b></div>' : '<div class="kv"><span>Vocales</span><b>sin medir</b></div>') +
      (fric ? '<div class="kv"><span>s · sh</span><b>medidas</b></div>' : '<div class="kv"><span>s · sh</span><b>sin medir</b></div>') +
      warns.map(w => '<div class="note">' + esc(w) + '</div>').join('') + '<p class="muted">Puedes repetir la calibración cuando quieras desde Ajustes (por ejemplo, si cambias de móvil o de sitio).</p></div>';
    foot.innerHTML = '<button class="btn primary" data-fin>' + (after ? 'Seguir' : 'Terminar') + '</button>';
    foot.onclick = e => { if (e.target.closest('[data-fin]')) { closeOverlay(); if (after) after(); else renderCurrent(); } };
  }
  intro();
}

// ---------- tabla de pinyin ----------
let tableTone = 1, tableHeat = false;
// Trampas de escritura: lo que se escribe no es lo que suena
function trapNote(ini, fin) {
  if (fin === 'iou') return { short: 'iu = iou', text: 'Se escribe <b>' + esc(C.spell(ini, fin)) + '</b> pero suena con una o en medio: "' + esc((ini || 'y') + 'iou') + '". En tonos 3 y 4 la o se oye bastante.' };
  if (fin === 'uei') return { short: 'ui = uei', text: 'Se escribe <b>' + esc(C.spell(ini, fin)) + '</b> pero suena "' + esc((ini || 'w') + 'uei') + '": hay una e escondida.' };
  if (fin === 'uen') return { short: 'un = uen', text: 'Se escribe <b>' + esc(C.spell(ini, fin)) + '</b> pero suena "' + esc((ini || 'w') + 'uən') + '": con una e neutra en medio.' };
  if (fin === 'ian') return { short: 'ian = ien', text: 'Se escribe <b>' + esc(C.spell(ini, fin)) + '</b> pero suena casi "' + esc((ini || 'y') + 'ien') + '": la a se cierra hacia una e.' };
  if (fin[0] === 'v' && (!ini || 'jqx'.includes(ini))) return { short: 'u = ü', text: 'Después de <b>j, q, x</b> y en <b>yu</b> se escribe u, pero suena <b>ü</b> (lengua de i, labios de u). Los puntos de la ü se quitan porque ahí nunca puede ir una u normal.' };
  if (fin === 'i' && ['z', 'c', 's'].includes(ini)) return { short: 'i ≠ i', text: 'Aquí la i no suena i: es un zumbido "zzz" con la lengua donde estaba.' };
  if (fin === 'i' && ['zh', 'ch', 'sh', 'r'].includes(ini)) return { short: 'i ≠ i', text: 'Aquí la i no suena i: la lengua sigue doblada hacia atrás, como una "r" inglesa.' };
  if (fin === 'e' && ini) return null;
  if (fin === 'o' && 'bpmf'.includes(ini) && ini) return { short: 'o = uo', text: 'Después de b, p, m, f la o suena "uo": bo suena casi "buo".' };
  return null;
}
// Sílabas con las que se confunde un hispanohablante
const CONF_INI = [['z', 'zh', 'j'], ['c', 'ch', 'q'], ['s', 'sh', 'x'], ['b', 'p'], ['d', 't'], ['g', 'k'], ['z', 'c'], ['zh', 'ch'], ['j', 'q'], ['l', 'r'], ['n', 'l'], ['f', 'h']];
const CONF_FIN = [['an', 'ang'], ['en', 'eng'], ['in', 'ing'], ['ian', 'iang'], ['uan', 'uang'], ['v', 'u'], ['uen', 'ueng'], ['ie', 've'], ['e', 'o'], ['i', 'v']];
function confusables(base) {
  const sp = Core.split(base + '1'); if (!sp) return [];
  const ini = sp.spelledIni && 'yw'.includes(sp.spelledIni) ? '' : sp.ini;
  let fin = sp.canon === 'i-apical' || sp.canon === 'i-retro' ? 'i' : sp.canon;
  const out = new Set();
  const tryAdd = (i, f) => {
    let ff = f;
    if (i && 'jqx'.includes(i) && ff === 'u') ff = 'v';
    if (i && 'jqx'.includes(i) && /^u(an|e|n)?$/.test(ff) && !'jqx'.includes(ini)) ff = 'v' + ff.slice(1);
    if (!'jqx'.includes(i || '-') && ff[0] === 'v' && ini && 'jqx'.includes(ini) && i) ff = 'u' + ff.slice(1);
    const cand = C.spell(i, ff);
    if (cand && cand !== base && [1, 2, 3, 4].some(t => Core.hasSyl(cand + t))) out.add(cand);
  };
  CONF_INI.forEach(g => { if (g.includes(ini)) g.forEach(i => i !== ini && tryAdd(i, fin)); });
  CONF_FIN.forEach(g => { if (g.includes(fin)) g.forEach(f => f !== fin && tryAdd(ini, f)); });
  return [...out].slice(0, 6);
}
function heatClass(base) { const r = Core.fine.rate('syl:' + base); return r == null ? '' : r >= 0.8 ? ' h3' : r >= 0.5 ? ' h2' : ' h1'; }
function renderTable() {
  const v = $('#v-table');
  let html = '<div class="tbl-tools"><h2 style="flex:1">Tabla de pinyin</h2><div class="seg" role="group" aria-label="Tono">' + [1, 2, 3, 4].map(t => '<button data-tt="' + t + '" aria-pressed="' + (t === tableTone) + '">' + t + '</button>').join('') + '</div></div>' +
    '<div class="tbl-tools"><p class="muted" style="flex:1">Toca una sílaba para escucharla, ver cómo se pone la boca y practicarla. El punto marca una trampa de escritura.</p><button class="btn small' + (tableHeat ? ' primary' : '') + '" data-heat aria-pressed="' + tableHeat + '">Mis resultados</button></div>' +
    (tableHeat ? '<div class="legend heat-legend"><span><i class="hl0"></i>Sin practicar</span><span><i class="hl1"></i>Flojo</span><span><i class="hl2"></i>En marcha</span><span><i class="hl3"></i>Bien</span></div>' : '');
  html += '<div class="tbl-wrap' + (tableHeat ? ' heat' : '') + '"><table class="py"><thead><tr><th class="ini"></th>' + C.TABLE_FIN.map(f => '<th>' + esc(f === 'v' ? 'ü' : f.replace(/^v/, 'ü')) + '</th>').join('') + '</tr></thead><tbody>';
  C.TABLE_INI.forEach(ini => {
    html += '<tr><td class="ini">' + esc(ini || '–') + '</td>';
    C.TABLE_FIN.forEach(fin => {
      const s = C.spell(ini, fin);
      const has = s && [1, 2, 3, 4].some(t => Core.hasSyl(s + t));
      const trap = has && trapNote(ini, fin);
      html += '<td>' + (has ? '<button class="' + (tableHeat ? heatClass(s) : '') + (trap ? ' trap' : '') + '" data-syl="' + esc(s) + '" data-ini="' + esc(ini) + '" data-fin="' + esc(fin) + '">' + esc(C.display(s)) + '</button>' : '') + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  v.innerHTML = html;
}
$('#v-table').addEventListener('click', e => {
  const t = e.target.closest('[data-tt]'); if (t) { tableTone = +t.dataset.tt; $$('[data-tt]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.tt === tableTone))); return; }
  if (e.target.closest('[data-heat]')) { const sc = $('.tbl-wrap') ? [$('.tbl-wrap').scrollLeft, $('.tbl-wrap').scrollTop] : [0, 0]; tableHeat = !tableHeat; renderTable(); const tw = $('.tbl-wrap'); if (tw) { tw.scrollLeft = sc[0]; tw.scrollTop = sc[1]; } return; }
  const b = e.target.closest('[data-syl]'); if (!b) return;
  const syl = b.dataset.syl;
  const tt = Core.hasSyl(syl + tableTone) ? tableTone : [1, 2, 3, 4].find(x => Core.hasSyl(syl + x));
  Core.playSyl(syl + tt);
  openSylSheet(syl, b.dataset.ini, b.dataset.fin, tt);
});
function openSylSheet(base, ini, fin, tone0) {
  const tones = [1, 2, 3, 4].filter(t => Core.hasSyl(base + t));
  let cur = tone0 || tones[0];
  let html = '<div class="tone-btns">' + [1, 2, 3, 4].map(t => { const ex = Core.example(base + t); return '<button class="btn" data-pt="' + t + '"' + (tones.includes(t) ? '' : ' disabled') + '><b>' + esc(Core.mark(base + t)) + '</b>' + toneIcon(t, true) + (ex ? '<span class="ex-char han">' + esc(ex[0]) + '</span>' + (ex[1] ? '<span class="ex-es">' + esc(ex[1]) + '</span>' : '') : '') + '</button>'; }).join('') + '</div>';
  html += '<div class="row-btns"><button class="btn small" data-voice="auto">Automática</button><button class="btn small" data-voice="v1">Voz 1</button><button class="btn small" data-voice="v2">Voz 2</button></div>';
  html += '<div class="row-btns">' + tones.map(t => '<button class="btn primary small" data-prac="' + t + '">' + I.mic.replace('<svg', '<svg width="16" height="16"') + 'Practicar ' + esc(Core.mark(base + t)) + '</button>').join('') + '</div>';
  const trap = trapNote(ini, fin);
  if (trap) html += '<div class="note"><b>Ojo, trampa de escritura:</b> ' + trap.text + '</div>';
  const conf = confusables(base);
  if (conf.length) html += '<div class="card conf"><div><div class="eyebrow">Se confunde con</div><p class="muted">Toca para oír las dos seguidas. Elige el tono arriba.</p></div><div class="conf-list">' + conf.map(c => '<button class="conf-btn" data-conf="' + esc(c) + '"><span>' + esc(C.display(base)) + '</span><span class="vs">↔</span><span>' + esc(C.display(c)) + '</span></button>').join('') + '</div></div>';
  const r = Core.fine.rate('syl:' + base);
  if (r != null) html += '<div class="kv"><span>Cómo te sale esta sílaba</span><b>' + Math.round(r * 100) + ' %</b></div>';
  const cards = [];
  if (ini && C.INI[ini]) cards.push(C.intro('ini:' + ini));
  const sp = Core.split(base + '1');
  const fk = sp && C.FIN[sp.canon] ? sp.canon : C.FIN[fin] ? fin : null;
  if (fk) cards.push(C.intro('fin:' + fk));
  html += cards.map(introCardHTML).join('');
  const back = openSheet(C.display(base), html);
  let voice = Core.voice();
  const setV = () => $$('[data-voice]', back).forEach(b => b.classList.toggle('primary', b.dataset.voice === voice));
  const setT = () => $$('[data-pt]', back).forEach(b => b.classList.toggle('sel-tone', +b.dataset.pt === cur));
  setV(); setT();
  $$('.mouth', back).forEach(m => { const mo = window.Mouth.build($('.mouth-host', m)); m._m = mo; const seq = window.Mouth.SEQ[m.dataset.seq]; if (seq) setTimeout(() => mo.play(seq), 300); });
  const pv = s => (voice === 'auto' || Core.recQuality(voice, s) < 0.45) ? Core.playSyl(s) : Core.playSyl(s, { voice });
  back.addEventListener('click', async e => {
    const p = e.target.closest('[data-pt]'); if (p) { cur = +p.dataset.pt; setT(); pv(base + cur); return; }
    const vv = e.target.closest('[data-voice]'); if (vv) { voice = vv.dataset.voice; setV(); return; }
    const cf = e.target.closest('[data-conf]'); if (cf) {
      const other = cf.dataset.conf; const t = Core.hasSyl(other + cur) && Core.hasSyl(base + cur) ? cur : [1, 2, 3, 4].find(x => Core.hasSyl(other + x) && Core.hasSyl(base + x));
      if (!t) return; cf.classList.add('playing'); await pv(base + t); await new Promise(r => setTimeout(r, 350)); await pv(other + t); cf.classList.remove('playing'); return;
    }
    const pr = e.target.closest('[data-prac]'); if (pr) { closeSheet(); const syl = base + pr.dataset.prac; openPractice(sylTarget(syl, focusFor(syl)), 'Practicar ' + Core.mark(syl)); }
  });
}
function focusFor(syl) {
  const sp = Core.split(syl), f = ['tone'];
  if (sp.ini in Core.ASP) f.push('asp');
  if (sp.ini in Core.RETRO_SET) f.push('retro');
  if (['v', 've', 'van', 'vn', 'e', 'i-apical', 'i-retro', 'er'].includes(sp.canon)) f.push('vowel');
  if (sp.canon in Core.NASAL_FAM) f.push('nasal');
  return f;
}

// ---------- palabras ----------
let openUnit = 1;
function renderWords() {
  const v = $('#v-words');
  let html = '<h2>Palabras</h2><p class="muted">Toca una palabra para escucharla y practicarla. El punto indica cómo te sale: rojo flojo, ámbar en marcha, verde bien.</p>';
  Core.units.forEach(u => {
    const ws = Core.words.filter(w => w.unit === u.id);
    const good = ws.filter(w => { const p = prog.words[w.h]; return p && p.ok / p.n >= 0.8; }).length;
    html += '<div class="unit"><button data-unit="' + u.id + '" aria-expanded="' + (openUnit === u.id) + '"><h3>' + esc(u.name) + '</h3><span>' + good + '/' + ws.length + '</span></button>';
    if (openUnit === u.id) html += '<div class="wlist">' + ws.map(w => { const p = prog.words[w.h]; const r = p ? p.ok / p.n : -1; return '<button class="wrow" data-word="' + esc(w.h) + '"><span class="h">' + esc(w.h) + '</span><span><span class="p">' + esc(Core.markWord(w.p)) + '</span><br><span class="e">' + esc(w.es) + '</span></span><span class="dot ' + (r < 0 ? '' : r < 0.5 ? 'b1' : r < 0.8 ? 'b2' : 'b3') + '"></span></button>'; }).join('') + '</div>';
    html += '</div>';
  });
  v.innerHTML = html;
}
$('#v-words').addEventListener('click', e => {
  const u = e.target.closest('[data-unit]'); if (u) { openUnit = openUnit === +u.dataset.unit ? 0 : +u.dataset.unit; renderWords(); return; }
  const w = e.target.closest('[data-word]'); if (w) { const word = Core.words.find(x => x.h === w.dataset.word); if (word) openPractice(wordTarget(word), word.h); }
});

// ---------- repaso ----------
function renderReview() {
  const v = $('#v-review');
  const due = dueItems(), all = Object.values(srs);
  const pct = k => { const s = prog.stats[k]; return s && s.n ? s.ok / s.n : null; };
  const rows = [['Tonos', 'tone'], ['Aire (aspiración)', 'asp'], ['Lengua', 'retro'], ['Vocales', 'vowel'], ['Nasales', 'nasal'], ['Oído', 'listen']];
  const tRows = [1, 2, 3, 4].map(t => { const s = prog.byTone[t]; return ['Tono ' + t, s && s.n ? s.ok / s.n : null, s ? s.n : 0]; });
  const bar = (label, val, n) => '<div class="hbar"><span>' + esc(label) + '</span><div class="track"><i style="width:' + (val == null ? 0 : Math.round(val * 100)) + '%;background:' + (val == null ? 'var(--line)' : val >= 0.8 ? 'var(--jade)' : val >= 0.5 ? 'var(--amber)' : 'var(--cinnabar)') + '"></i></div><span class="n">' + (val == null ? '–' : Math.round(val * 100) + '%') + '</span></div>';
  v.innerHTML = '<h2>Repaso</h2>' +
    '<div class="panel"><h3>' + (due.length ? 'Tienes ' + due.length + ' para repasar' : 'Nada pendiente ahora mismo') + '</h3><p class="muted">Aquí vuelven las sílabas y palabras que te han costado, cada vez más espaciadas hasta que te salen solas.' + (all.length ? ' En la lista: ' + all.length + '.' : '') + '</p>' +
    '<div class="row-btns"><button class="btn primary" data-rev' + (due.length ? '' : ' disabled') + '>Empezar repaso</button><button class="btn" data-free>Práctica rápida de tonos</button></div></div>' +
    '<div class="stats-row"><div class="stat"><b>' + streak() + '</b><span>días seguidos</span></div><div class="stat"><b>' + Object.keys(prog.done).length + '</b><span>lecciones</span></div><div class="stat"><b>' + prog.xp + '</b><span>puntos</span></div></div>' +
    '<div class="panel"><h3>Cómo te sale</h3><div class="bars">' + rows.map(([l, k]) => bar(l, pct(k))).join('') + '</div></div>' +
    '<div class="panel"><h3>Por tono</h3><div class="bars">' + tRows.map(([l, val]) => bar(l, val)).join('') + '</div></div>';
}
$('#v-review').addEventListener('click', e => {
  if (e.target.closest('[data-rev]')) {
    const items = shuffle(dueItems()).slice(0, 12);
    const steps = items.map(it => it.type === 'word' ? (() => { const w = Core.words.find(x => x.h === it.key) || wordFromPhrase(C.SANDHI.find(p => p.h === it.key) || { h: it.key, p: 'a1', es: '' }); return { type: 'speak', target: wordTarget(w) }; })() : { type: 'speak', target: sylTarget(it.key, it.focus || ['tone']) });
    if (!Core.calibration()) { openCalibration(); return; }
    runSession({ title: 'Repaso', steps });
  }
  if (e.target.closest('[data-free]')) {
    if (!Core.calibration()) { openCalibration(); return; }
    const pool = Core.sylBases.filter(b => !/^(_|hm|hng|ng|m$|n$)/.test(b));
    const steps = [];
    for (let k = 0; k < 10; k++) { const s = sylWithTone(pick(pool)); if (s) steps.push({ type: 'speak', target: sylTarget(s, ['tone']) }); }
    runSession({ title: 'Tonos', steps });
  }
});

// ---------- ajustes ----------
let confirmReset = false;
function renderSettings() {
  const v = $('#v-settings'), cal = Core.calibration();
  const g = store.get('gemini', {});
  v.innerHTML = '<h2>Ajustes</h2>' +
    '<div class="panel"><h3>Tu voz</h3>' + (cal ? '<div class="kv"><span>Calibrada</span><b>' + new Date(cal.at).toLocaleDateString('es-ES') + '</b></div>' + (cal.range ? '<div class="kv"><span>Rango de tonos</span><b>' + Math.round(E.hz(cal.range.lo)) + '–' + Math.round(E.hz(cal.range.hi)) + ' Hz</b></div>' : '') : '<p class="muted">Aún no has calibrado tu voz.</p>') +
    '<button class="btn primary" data-cal>' + (cal ? 'Repetir calibración' : 'Calibrar ahora') + '</button></div>' +
    '<div class="panel"><h3>Audio de referencia</h3><p class="muted">Dos voces nativas para las sílabas (las palabras tienen una tercera). He analizado las 3.282 grabaciones de sílabas: en "Automática" suena siempre la que tiene el tono más claro, y las que no sonaban al tono correcto no se usan nunca.</p><div class="seg" role="group" aria-label="Voz">' + [['auto', 'Automática'], ['v1', 'Voz 1'], ['v2', 'Voz 2']].map(([k, l]) => '<button data-voice="' + k + '" aria-pressed="' + (settings.voice === k) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="panel"><h3>Tema</h3><div class="seg" role="group" aria-label="Tema">' + [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => '<button data-theme="' + k + '" aria-pressed="' + (settings.theme === k) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="panel"><h3>Segunda opinión con Gemini (opcional)</h3><p class="muted">La app evalúa todo en tu móvil, sin enviar nada. Con una clave de Gemini se activan dos extras: la segunda opinión después de cada intento y el tutor de conversación. El audio se envía a Google solo cuando usas esas funciones.</p><p class="muted"><b>Cómo conseguir la clave (gratis):</b> entra en aistudio.google.com con tu cuenta de Google → "Get API key" → "Create API key" y pégala aquí. Ojo: la suscripción de Gemini para estudiantes es para la app de Gemini y no incluye esta clave, pero la clave tiene un uso gratuito que sobra para practicar.</p>' +
    '<input class="text" id="gemKey" type="password" autocomplete="off" placeholder="Pega aquí tu clave de Gemini" value="' + esc(g.key || '') + '"><div class="row-btns"><button class="btn small" data-gsave>Guardar y probar</button>' + (g.key ? '<button class="btn small danger" data-gdel>Quitar</button>' : '') + '</div><div id="gemMsg" class="muted">' + (g.model ? 'Modelo: ' + esc(g.model) : '') + '</div></div>' +
    '<div class="panel"><h3>Instalar en el móvil</h3><p class="muted">En Chrome: menú ⋮ → "Añadir a pantalla de inicio" o "Instalar aplicación". Funciona sin internet una vez abierta.</p></div>' +
    '<div class="panel"><h3>Progreso</h3>' + (confirmReset ? '<div class="confirm"><b>¿Borrar todo tu progreso?</b><span class="muted">Se borran lecciones, puntos y repaso. La calibración se mantiene.</span><div class="row-btns"><button class="btn" data-rno>Cancelar</button><button class="btn danger" data-ryes>Borrar</button></div></div>' : '<button class="btn danger" data-reset>Borrar progreso</button>') + '</div>' +
    '<div class="panel"><h3>Créditos</h3><p class="muted">Voz 1 (sílabas): Chen Wang. Palabras: Yue Tan. Ambas del proyecto audio-cmn de Hugo Lopez (CC BY-SA). Voz 2 (sílabas): colección mp3-chinese-pinyin-sound (dominio público). Los modelos de detección se han ajustado con estas grabaciones.</p></div>';
}
$('#v-settings').addEventListener('click', async e => {
  if (e.target.closest('[data-cal]')) return openCalibration();
  const vv = e.target.closest('[data-voice]'); if (vv) { settings.voice = vv.dataset.voice; saveSettings(); renderSettings(); Core.playSyl('ma1', settings.voice === 'auto' ? {} : { voice: settings.voice }); return; }
  const th = e.target.closest('[data-theme]'); if (th) { settings.theme = th.dataset.theme; saveSettings(); applyTheme(); renderSettings(); return; }
  if (e.target.closest('[data-reset]')) { confirmReset = true; renderSettings(); return; }
  if (e.target.closest('[data-rno]')) { confirmReset = false; renderSettings(); return; }
  if (e.target.closest('[data-ryes]')) { confirmReset = false; prog = { done: {}, xp: 0, days: {}, stats: {}, byTone: {}, words: {} }; srs = {}; saveProg(); saveSrs(); updateChips(); renderSettings(); toast('Progreso borrado'); return; }
  if (e.target.closest('[data-gdel]')) { store.del('gemini'); renderSettings(); return; }
  if (e.target.closest('[data-gsave]')) {
    const key = $('#gemKey').value.trim(); const msg = $('#gemMsg');
    if (!key) { msg.textContent = 'Pega primero la clave.'; return; }
    msg.textContent = 'Probando la clave…';
    try { const model = await Core.gemini.pickModel(key); store.set('gemini', { key, model }); msg.textContent = 'Funciona. Modelo: ' + model; }
    catch (err) { msg.textContent = err.message || 'No ha funcionado.'; }
  }
});

// ---------- piezas para practice.js ----------
window.UI = { $, $$, esc, shuffle, pick, css, I, toneIcon, toneChart, CHAO, openOverlay, closeOverlay, openSheet, closeSheet, runSession, speakWidget, sylTarget, wordTarget, sylWithTone, pairWithTone,
  toast, prog: () => prog, saveProg, srsAdd, dueItems, srs: () => srs, openCalibration, micErrorHTML, sizeCanvas, gridLevels, plotLine, renderCurrent, go, addCleanup: f => overlayCleanup.push(f),
  streak, markDay, recordCheck, fineFromResult, levelsOf, introCardHTML, mountMouths, openPractice, focusFor, confusables, updateChips, wordFromPhrase };

// ---------- inicio ----------
updateChips();
go('map');
Core.preload();
if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.host)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.addEventListener('resize', () => {});
})();
