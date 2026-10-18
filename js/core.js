/* Núcleo: almacenamiento, pinyin, audio, grabación, evaluación y calibración */
(function () {
'use strict';
const D = window.PYDATA, E = window.PYE;
E.setModels({ tone: D.models.tone, retro: D.models.retro });
const Core = {};
window.Core = Core;

// ---------- almacenamiento ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('py.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('py.' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('py.' + k); } catch (e) {} },
};
Core.store = store;

// ---------- pinyin ----------
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];
Core.INITIALS = INITIALS;
const MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', v: 'ǖǘǚǜ' };
// "zhuang4" -> "zhuàng"; "lv3" -> "lǚ"
function mark(syl) {
  const m = /^([a-zv]+?)(r?)([1-5])?$/.exec(syl.replace('ü', 'v'));
  if (!m) return syl;
  let [, base, r, t] = m; t = +(t || 5);
  if (/r$/.test(base) && base !== 'er' && !r) { /* erhua already in base */ }
  let s = base;
  if (t >= 1 && t <= 4) {
    let idx = -1;
    if (s.includes('a')) idx = s.indexOf('a');
    else if (s.includes('e')) idx = s.indexOf('e');
    else if (s.includes('ou')) idx = s.indexOf('o');
    else { for (let i = s.length - 1; i >= 0; i--) if ('iouv'.includes(s[i])) { idx = i; break; } }
    if (idx >= 0) s = s.slice(0, idx) + MARKS[s[idx]][t - 1] + s.slice(idx + 1);
  }
  return (s + r).replace(/v/g, 'ü');
}
Core.mark = mark;
Core.markWord = p => p.split(' ').map((x, i) => (i && /^[aeoāáǎàēéěèōóǒò]/.test(mark(x)) ? "'" : '') + mark(x)).join('');
function split(syl) { // "zhuang4" -> {ini:'zh', fin:'uang', tone:4, base:'zhuang'}
  const m = /^([a-zv]+)([1-5])?$/.exec(syl); if (!m) return null;
  const base = m[1], tone = +(m[2] || 5);
  let ini = '';
  for (const i of [...INITIALS, 'y', 'w']) if (base.startsWith(i) && base.length > i.length) { ini = i; break; }
  let fin = base.slice(ini.length);
  // final canónica
  let canon = fin;
  if (ini === 'y') { canon = ({ i: 'i', a: 'ia', e: 'ie', ao: 'iao', ou: 'iou', an: 'ian', in: 'in', ang: 'iang', ing: 'ing', ong: 'iong', u: 'v', ue: 've', uan: 'van', un: 'vn' })[fin] || ('i' + fin); }
  else if (ini === 'w') { canon = ({ u: 'u', a: 'ua', o: 'uo', ai: 'uai', ei: 'uei', an: 'uan', en: 'uen', ang: 'uang', eng: 'ueng' })[fin] || ('u' + fin); }
  else if ('jqx'.includes(ini) && ini && fin[0] === 'u') canon = 'v' + fin.slice(1);
  else if (fin === 'iu') canon = 'iou';
  else if (fin === 'ui') canon = 'uei';
  else if (fin === 'un') canon = 'uen';
  if (fin === 'i' && ['z', 'c', 's'].includes(ini)) canon = 'i-apical';
  if (fin === 'i' && ['zh', 'ch', 'sh', 'r'].includes(ini)) canon = 'i-retro';
  return { ini: (ini === 'y' || ini === 'w') ? '' : ini, spelledIni: ini, fin, canon, tone, base };
}
Core.split = split;
// tonos hablados: sandhi del tercer tono, 不 y 一
function spokenTones(tones, hanzi) {
  const t = tones.slice(), h = Array.from(hanzi || '');
  for (let i = 0; i < t.length - 1; i++) {
    if (h[i] === '不' && t[i + 1] === 4) t[i] = 2;
    if (h[i] === '一') { if (t[i + 1] === 4) t[i] = 2; else if (t[i + 1] && t[i + 1] !== 5) t[i] = 4; }
  }
  for (let i = t.length - 2; i >= 0; i--) if (t[i] === 3 && t[i + 1] === 3) t[i] = 2;
  return t;
}
Core.spokenTones = spokenTones;
const SYLS = new Set([...Object.keys(D.audio.v1), ...Object.keys(D.audio.v2)]);
Core.hasSyl = s => SYLS.has(s);
Core.sylBases = [...new Set([...SYLS].map(s => s.replace(/\d$/, '')))];

// vocabulario
Core.words = D.vocab.map(([u, h, p, es], i) => {
  const syls = p.split(' ');
  const tones = syls.map(s => +s.slice(-1));
  return { id: 'w' + i, unit: u, h, p, es, syls, tones, spoken: spokenTones(tones, h), audio: !!D.audio.w[h] };
});
Core.units = D.units;

// ---------- audio ----------
let ctx = null;
Core.ctx = () => {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};
const bins = {}, decoded = new Map();
function loadBin(name) {
  if (!bins[name]) bins[name] = fetch('audio/' + name + '.mp3').then(r => { if (!r.ok) throw new Error('audio'); return r.arrayBuffer(); });
  return bins[name];
}
Core.preload = () => { loadBin('v1').catch(() => {}); };
async function getBuffer(bank, key) {
  const id = bank + ':' + key;
  if (decoded.has(id)) return decoded.get(id);
  const ent = D.audio[bank][key]; if (!ent) return null;
  const ab = await loadBin(bank);
  const slice = ab.slice(ent[0], ent[0] + ent[1]);
  const buf = await new Promise((res, rej) => Core.ctx().decodeAudioData(slice, res, rej));
  decoded.set(id, buf);
  return buf;
}
Core.getBuffer = getBuffer;
let current = null;
function playBuffer(buf, rate = 1) {
  const c = Core.ctx();
  if (current) { try { current.stop(); } catch (e) {} }
  const src = c.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  src.connect(c.destination); src.start(); current = src;
  return new Promise(r => { src.onended = r; });
}
Core.playBuffer = playBuffer;
Core.voice = () => store.get('settings', {}).voice || 'v1';
// Reproduce una sílaba ("ma3"), probando la voz elegida y luego la otra
Core.playSyl = async (syl, opts = {}) => {
  const order = opts.voice ? [opts.voice] : [Core.voice(), Core.voice() === 'v1' ? 'v2' : 'v1'];
  for (const v of order) { const b = await getBuffer(v, syl).catch(() => null); if (b) { await playBuffer(b, opts.rate || 1); return v; } }
  return speak(Core.markWord(syl));
};
// Palabra: grabación nativa > voz del sistema > sílabas encadenadas
Core.playWord = async (w, opts = {}) => {
  if (D.audio.w[w.h] && !opts.tts) { const b = await getBuffer('w', w.h).catch(() => null); if (b) { await playBuffer(b, opts.rate || 1); return 'w'; } }
  if (await speak(w.h)) return 'tts';
  for (let i = 0; i < w.syls.length; i++) {
    let base = w.syls[i].replace(/\d$/, '');
    if (base.length > 2 && base.endsWith('r')) base = base.slice(0, -1);
    const t = w.spoken[i] === 5 ? (w.tones[i] === 5 ? 1 : w.tones[i]) : w.spoken[i];
    await Core.playSyl(base + t);
  }
  return 'syl';
};
function zhVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) {} }
function speak(text) {
  const v = zhVoice(); if (!v) return Promise.resolve(false);
  return new Promise(res => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = 0.8;
      u.onend = () => res(true); u.onerror = () => res(false);
      speechSynthesis.speak(u);
      setTimeout(() => res(true), 6000);
    } catch (e) { res(false); }
  });
}
Core.speak = speak;
Core.hasTTS = () => !!zhVoice();

// Audio float32 (22050 Hz) -> AudioBuffer para escucharte
Core.playSamples = (x, sr = E.SR) => {
  const c = Core.ctx(); const b = c.createBuffer(1, x.length, sr); b.copyToChannel(x, 0); return playBuffer(b);
};
// Decodifica un buffer nativo a 22050 mono para analizarlo
Core.samplesOf = buf => E.resample(buf.getChannelData(0), buf.sampleRate, E.SR);

// ---------- grabación ----------
let stream = null;
Core.micState = 'unknown'; // unknown | ok | denied | unavailable
Core.openMic = async () => {
  if (stream && stream.active) return stream;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { Core.micState = 'unavailable'; throw new Error('unavailable'); }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    Core.micState = 'ok';
    return stream;
  } catch (e) {
    Core.micState = (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) ? 'denied' : 'unavailable';
    throw e;
  }
};
Core.closeMic = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };

/* Graba hasta que detecta silencio tras hablar (o hasta maxSec / stop()).
   onLevel(db, pitchSt|null) se llama ~20 veces por segundo. */
Core.record = async (opts = {}) => {
  const c = Core.ctx();
  const s = await Core.openMic();
  const src = c.createMediaStreamSource(s);
  const proc = c.createScriptProcessor(2048, 1, 1);
  const sink = c.createGain(); sink.gain.value = 0;
  const sr = c.sampleRate, chunks = [];
  const cal = Core.calibration();
  const noiseDb = opts.fixed ? -200 : (cal && cal.noise ? cal.noise.e : null);
  let started = false, silentFor = 0, total = 0, speechT = 0, peak = -200, stopped = false, floor = noiseDb != null ? noiseDb : null;
  const maxSec = opts.maxSec || 3, tail = opts.tail || 0.65, fixed = opts.fixed || 0, maxWait = opts.maxWait || 6;
  let resolveFn;
  const done = new Promise(r => { resolveFn = r; });
  const finish = (why) => {
    if (stopped) return; stopped = true;
    try { proc.disconnect(); src.disconnect(); sink.disconnect(); } catch (e) {}
    if (!fixed && startIdx > 0) chunks.splice(0, Math.max(0, startIdx - Math.ceil(0.4 * sr / 2048)));
    let n = 0; chunks.forEach(ch => n += ch.length);
    const all = new Float32Array(n); let o = 0; chunks.forEach(ch => { all.set(ch, o); o += ch.length; });
    resolveFn({ x: E.resample(all, sr, E.SR), why, heard: started || !!fixed });
  };
  let lastPitchT = 0, startIdx = 0;
  proc.onaudioprocess = ev => {
    if (stopped) return;
    const d = new Float32Array(ev.inputBuffer.getChannelData(0)); chunks.push(d);
    const dur = d.length / sr; total += dur;
    let e = 0; for (let i = 0; i < d.length; i++) e += d[i] * d[i];
    const db = 10 * Math.log10(e / d.length + 1e-10);
    if (noiseDb == null && !started) floor = floor == null ? db : Math.min(floor, db);
    peak = Math.max(peak, db);
    const thr = Math.max((floor ?? -60) + 12, -55);
    if (!fixed) {
      if (db > thr) { if (!started) startIdx = chunks.length - 1; started = true; silentFor = 0; }
      else if (started) { silentFor += dur; if (silentFor >= tail) finish('silence'); }
    }
    // tono en vivo
    let pst = null;
    if (opts.onLevel) {
      if (total - lastPitchT > 0.05 && db > thr) {
        lastPitchT = total;
        const last = E.resample(d, sr, E.SR);
        const tr = E.pitchTrack(last.length > 900 ? last : last, { fmin: 70, fmax: 450 });
        const good = tr.filter(p => p.ap < 0.3);
        if (good.length) pst = E.st(E.median(good.map(p => p.f0)));
      }
      opts.onLevel(db, pst, started);
    }
    if (started) speechT += dur;
    if (fixed && total >= fixed) finish('fixed');
    else if (!fixed && started && speechT >= maxSec) finish('max');
    else if (!fixed && !started && total >= maxWait) finish('nospeech');
  };
  src.connect(proc); proc.connect(sink); sink.connect(c.destination);
  return { done, stop: () => finish('manual') };
};

// ---------- calibración ----------
Core.calibration = () => store.get('cal', null);
Core.saveCalibration = cal => store.set('cal', cal);
Core.defaultRange = () => ({ lo: 4, hi: 16 });
Core.range = () => { const c = Core.calibration(); return c && c.range ? c.range : Core.defaultRange(); };

function formantSummary(x, an) {
  if (!an || !an.ok || !isFinite(an.voiceOn)) return null;
  const tr = E.formantTrack(x, an.voiceOn, an.voiceOff + 0.01);
  if (tr.length < 3) return null;
  const seg = (a, b, k) => { const n = tr.length; const v = tr.slice(Math.floor(n * a), Math.ceil(n * b)).map(p => p[k]).filter(isFinite); return v.length ? E.median(v) : NaN; };
  return {
    b: { F1: seg(0, 0.25, 'F1'), F2: seg(0, 0.25, 'F2'), F3: seg(0, 0.25, 'F3') },
    m: { F1: seg(0.3, 0.6, 'F1'), F2: seg(0.3, 0.6, 'F2'), F3: seg(0.3, 0.6, 'F3') },
    e: { F1: seg(0.75, 1, 'F1'), F2: seg(0.75, 1, 'F2'), F3: seg(0.75, 1, 'F3') },
    track: tr,
  };
}
Core.formantSummary = formantSummary;

Core.calibrate = {
  noise(x) { const fr = E.frames(x); return { e: E.median(Array.from(fr.e)), hf: E.median(Array.from(fr.hf)) }; },
  tones(list) { // list de contornos
    const all = list.flat().map(p => p.v);
    if (all.length < 10) return null;
    let lo = E.pct(all, 0.04), hi = E.pct(all, 0.96);
    if (hi - lo < 7) { const mid = (hi + lo) / 2; lo = mid - 4.5; hi = mid + 4.5; }
    return { lo, hi };
  },
  vowel(x) {
    const an = E.analyzeSyllable(x); if (!an.ok || !isFinite(an.voiceOn)) return null;
    const tr = E.formantTrack(x, an.voiceOn + 0.1, an.voiceOff - 0.1);
    const med = k => E.median(tr.map(p => p[k]).filter(isFinite));
    const r = { F1: med('F1'), F2: med('F2'), F3: med('F3') };
    return isFinite(r.F1) && isFinite(r.F2) ? r : null;
  },
  fric(x) {
    const fr = E.frames(x); const reg = E.speechRegion(fr); if (!reg) return null;
    const a = Math.round((reg.a * 0.005 + 0.15) * E.SR), b = Math.round((reg.b * 0.005 - 0.15) * E.SR);
    if (b - a < 2000) return null;
    return E.spectralFeatures(E.noiseSpectrum(x, a, b));
  },
};

// ---------- evaluación ----------
const ASP = { b: 0, d: 0, g: 0, z: 0, zh: 0, j: 0, p: 1, t: 1, k: 1, c: 1, ch: 1, q: 1 };
const STOPS = 'bdgptk';
const RETRO_SET = { z: 0, c: 0, s: 0, j: 0, q: 0, x: 0, zh: 1, ch: 1, sh: 1 };
const NASAL_FAM = { an: 0, ang: 0, en: 1, eng: 1, in: 2, ing: 2, ian: 3, iang: 3, uan: 4, uang: 4 };
const NASAL_NG = { an: 0, ang: 1, en: 0, eng: 1, in: 0, ing: 1, ian: 0, iang: 1, uan: 0, uang: 1 };
Core.ASP = ASP; Core.RETRO_SET = RETRO_SET; Core.NASAL_FAM = NASAL_FAM;

const TONE_NAMES = { 1: 'tono 1 (alto)', 2: 'tono 2 (sube)', 3: 'tono 3 (baja)', 4: 'tono 4 (cae)', 5: 'tono neutro' };
Core.TONE_NAMES = TONE_NAMES;

function toneMessage(target, r) {
  const st = r.semis, rise = (st.end - st.min).toFixed(0), drop = (st.max - st.end).toFixed(0);
  const f = r.f;
  if (r.tone === target) {
    const ok = { 1: 'Alto y plano, como una nota cantada.', 2: 'Sube con decisión: has subido ' + rise + ' semitonos.', 3: 'Bajas hasta el fondo de tu voz.', 4: 'Cae de arriba abajo: ' + drop + ' semitonos de caída.' }[target];
    let extra = '';
    if (target === 1 && f.avg < 3.6) extra = ' Podría ir aún más alto.';
    if (target === 4 && st.max - st.end < 6) extra = ' Puedes dejarlo caer todavía más.';
    if (target === 2 && st.end - st.min < 3.5) extra = ' Puedes subir un poco más.';
    return ok + extra;
  }
  const m = {
    1: { 2: 'Ha subido: el tono 1 no se mueve, mantenlo plano y alto.', 3: 'Demasiado bajo: el tono 1 va en lo más alto de tu voz (nivel 5).', 4: 'Se te cae: mantenlo plano hasta el final, como un "¡aaa!" cantado.' },
    2: { 1: 'Casi no sube (' + rise + ' semitonos). Empieza a media altura y sube de golpe, como un "¿¡qué!?".', 3: 'Has bajado antes de subir (eso suena a tono 3). Empieza a media altura y sube recto desde el principio.', 4: '¡Al revés! Este tono sube, no baja.' },
    3: { 1: 'Demasiado alto: el tono 3 vive en lo más bajo de tu voz, casi rasposo.', 2: 'Ha sonado a tono 2: antes de subir, baja hasta el fondo de tu voz y quédate ahí un momento.', 4: 'Empiezas muy arriba: el tono 3 arranca a media altura y baja hasta el fondo.' },
    4: { 1: 'Cae poco (' + drop + ' semitonos). Empieza bien arriba y déjalo caer hasta abajo, como un "¡No!" rotundo.', 2: '¡Al revés! Este tono cae, no sube.', 3: 'Empieza más arriba: el tono 4 cae desde lo más alto de tu voz, seco y rápido.' },
  };
  return (m[target] && m[target][r.tone]) || 'Ha sonado a ' + TONE_NAMES[r.tone] + '.';
}

/* Evalúa una grabación contra una sílaba objetivo ("zhuang4"). focus: lista de claves a destacar.
   Devuelve { heard, checks:[{key,label,state:'ok'|'bad'|'unsure',msg,...}], an, tone } */
Core.evaluateSyllable = (x, syl, opts = {}) => {
  const sp = split(syl);
  const cal = Core.calibration();
  const range = Core.range();
  const an = E.analyzeSyllable(x, { noiseDb: cal && cal.noise ? cal.noise.e + 3 : undefined, noiseHf: cal && cal.noise ? cal.noise.hf : undefined });
  const out = { heard: false, checks: [], an, syl, sp };
  if (!an.ok || an.contour.length < 5) { out.reason = 'No te he oído bien. Habla un poco más fuerte y cerca del micro.'; return out; }
  out.heard = true;
  const checks = out.checks;
  // tono
  if (sp.tone >= 1 && sp.tone <= 4 && opts.tone !== false) {
    const r = E.toneOf(an.contour, range);
    out.tone = r;
    const p = r.probs[sp.tone - 1];
    const state = r.tone === sp.tone ? (p > 0.55 ? 'ok' : 'ok') : (p > 0.3 ? 'unsure' : 'bad');
    checks.push({ key: 'tone', label: 'Tono', state, heardAs: r.tone, msg: toneMessage(sp.tone, r) });
  }
  // aspiración
  if (sp.ini in ASP && isFinite(an.noiseDur)) {
    const ms = Math.round(an.noiseDur * 1000), stop = STOPS.includes(sp.ini);
    // antes de la "i" de zi/zhi la vocal también roza, así que el ruido dura más
    const apical = sp.canon === 'i-apical' || sp.canon === 'i-retro';
    const lo = stop ? 35 : apical ? 115 : 95, hi = stop ? 60 : apical ? 150 : 118;
    const want = ASP[sp.ini] === 1;
    let state, msg;
    if (want) {
      if (ms >= hi) { state = 'ok'; msg = 'Buen soplo de aire: ' + ms + ' ms.'; }
      else if (ms <= lo) { state = 'bad'; msg = 'Sin aire (' + ms + ' ms). Sopla fuerte al soltar la ' + sp.ini + ', como si apagaras una vela: más de ' + hi + ' ms.'; }
      else { state = 'unsure'; msg = 'Algo de aire (' + ms + ' ms), pero sopla más fuerte: más de ' + hi + ' ms.'; }
    } else {
      if (ms <= lo) { state = 'ok'; msg = 'Seca, sin soplo: ' + ms + ' ms.'; }
      else if (ms >= hi) { state = 'bad'; msg = 'Te ha salido aire (' + ms + ' ms): suena a ' + ({ b: 'p', d: 't', g: 'k', z: 'c', zh: 'ch', j: 'q' })[sp.ini] + '. Suelta la consonante sin soplar, suave y pegada a la vocal.'; }
      else { state = 'unsure'; msg = 'Un poco de aire (' + ms + ' ms). Intenta que sea más seca: menos de ' + lo + ' ms.'; }
    }
    checks.push({ key: 'asp', label: 'Aire', state, msg, ms, lo, hi, want });
  }
  // lengua delante / detrás
  if (sp.ini in RETRO_SET && an.fric) {
    let p = E.retroflexProb(an.fric);
    if (cal && cal.fric && cal.fric.s && cal.fric.sh) {
      const v = f => [f.low * 3, f.mid * 2, f.high * 3, f.centroid / 2000];
      const d = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
      const ds = d(v(an.fric), v(cal.fric.s)), dsh = d(v(an.fric), v(cal.fric.sh));
      p = 0.6 * p + 0.4 * (ds / (ds + dsh + 1e-9));
    }
    const want = RETRO_SET[sp.ini] === 1;
    let state, msg;
    const front = 'jqx'.includes(sp.ini) ? 'la punta de la lengua abajo, tocando los dientes de abajo, y sonríe' : 'la punta de la lengua adelante, detrás de los dientes de arriba';
    if (want) {
      if (p >= 0.62) { state = 'ok'; msg = 'Lengua hacia atrás: suena a ' + sp.ini + '.'; }
      else if (p <= 0.38) { state = 'bad'; msg = 'Suena con la lengua delante (como ' + ({ zh: 'z', ch: 'c', sh: 's' })[sp.ini] + '). Dobla la punta hacia arriba y atrás, hacia el paladar.'; }
      else { state = 'unsure'; msg = 'No lo tengo claro: dobla un poco más la punta hacia atrás.'; }
    } else {
      if (p <= 0.38) { state = 'ok'; msg = 'Lengua bien colocada: suena a ' + sp.ini + '.'; }
      else if (p >= 0.62) { state = 'bad'; msg = 'Suena con la lengua hacia atrás (como zh/ch/sh). Pon ' + front + '.'; }
      else { state = 'unsure'; msg = 'No lo tengo claro. Pon ' + front + '.'; }
    }
    checks.push({ key: 'retro', label: 'Lengua', state, msg, p, want });
  }
  // vocales y nasales: necesitan la calibración de vocales
  const needsV = ['v', 've', 'van', 'vn', 'e', 'i-apical', 'i-retro', 'er'].includes(sp.canon) || sp.canon in NASAL_FAM || (sp.canon === 'u' && opts.checkU);
  if (needsV) {
    const V = cal && cal.vowels;
    if (!V || !V.i || !V.u || !V.a) checks.push({ key: 'vowel', label: 'Vocal', state: 'unsure', msg: 'Calibra tu voz (Ajustes) para que pueda medir las vocales.' });
    else {
      const fs = formantSummary(x, an);
      out.formants = fs;
      if (fs) {
        const n2 = v => (v - V.u.F2) / (V.i.F2 - V.u.F2);
        const F3m = (V.a.F3 + V.i.F3 + V.u.F3) / 3;
        const c = sp.canon;
        if (c[0] === 'v') {
          const k = n2(fs.m.F2), r3 = fs.m.F3 / V.i.F3;
          let state = 'ok', msg = 'Buena ü: lengua de i con los labios redondos.';
          if (k < 0.45) { state = 'bad'; msg = 'Ha sonado a "u". Coloca la lengua como para decir "i" y, sin moverla, redondea los labios.'; }
          else if (k < 0.58) { state = 'unsure'; msg = 'Está entre u y ü: adelanta más la lengua (como en "i").'; }
          else if (r3 > 0.95 && isFinite(r3)) { state = 'unsure'; msg = 'Suena casi a "i": redondea y adelanta más los labios, como para silbar.'; }
          checks.push({ key: 'vowel', label: 'Vocal ü', state, msg, value: k });
        } else if (c === 'u') {
          const k = n2(fs.m.F2);
          checks.push({ key: 'vowel', label: 'Vocal u', state: k < 0.4 ? 'ok' : k < 0.55 ? 'unsure' : 'bad', msg: k < 0.4 ? 'Buena u, bien redonda.' : 'Ha sonado a ü: retrasa la lengua; la u se hace atrás.', value: k });
        } else if (c === 'e') {
          const k = n2(fs.m.F2);
          let state = 'ok', msg = 'Buena e china: lengua atrás y labios relajados.';
          if (k > 0.56) { state = 'bad'; msg = 'Ha sonado a e española. La e china se hace más atrás: boca entreabierta, labios relajados, como un "eh..." de duda que tira hacia "u".'; }
          else if (k > 0.46) { state = 'unsure'; msg = 'Casi: lleva la lengua un poco más atrás.'; }
          checks.push({ key: 'vowel', label: 'Vocal e', state, msg, value: k });
        } else if (c === 'i-apical' || c === 'i-retro') {
          const k = n2(fs.m.F2);
          let state = 'ok', msg = c === 'i-apical' ? 'Bien: es un zumbido, no una i.' : 'Bien: la lengua se queda atrás, no es una i.';
          if (k > 0.8) { state = 'bad'; msg = 'Ha sonado una i española. Aquí la i no se pronuncia como i: ' + (c === 'i-apical' ? 'deja la lengua donde está y alarga la consonante con voz, como un "zzz".' : 'deja la lengua doblada hacia atrás y alarga con voz, como una "r" inglesa.'); }
          else if (k > 0.7) { state = 'unsure'; msg = 'Suena un poco a i: no muevas la lengua al pasar a la vocal.'; }
          checks.push({ key: 'vowel', label: 'La "i"', state, msg, value: k });
        } else if (c === 'er') {
          const k = Math.min(fs.m.F3, fs.e.F3) / F3m;
          let state = k < 0.86 ? 'ok' : k < 0.93 ? 'unsure' : 'bad';
          checks.push({ key: 'vowel', label: 'er', state, value: k, msg: state === 'ok' ? 'Buena er: se nota la punta doblada.' : 'Falta la "r": di "a" y, sin parar, curva la punta de la lengua hacia atrás, como "are" en inglés americano.' });
        } else if (c in NASAL_FAM) {
          const fam = [0, 0, 0, 0, 0]; fam[NASAL_FAM[c]] = 1;
          const m2 = n2(fs.m.F2), e2 = n2(fs.e.F2), b2 = n2(fs.b.F2), e3 = fs.e.F3 / V.a.F3;
          const p = E.logisticLR(D.models.nasal, [m2, e2, e2 - m2, e3, b2, b2 - m2, ...fam]);
          const want = NASAL_NG[c] === 1, hard = NASAL_FAM[c] === 2;
          let state, msg;
          const ngTip = 'Al final, deja la boca abierta y sube el fondo de la lengua, como en "sang" en inglés. La punta se queda abajo.';
          const nTip = 'Al final, sube la punta de la lengua hasta tocar detrás de los dientes de arriba.';
          if (want) { state = p >= 0.6 ? 'ok' : p <= 0.4 ? 'bad' : 'unsure'; msg = state === 'ok' ? 'Final -ng bien hecha.' : state === 'bad' ? 'Ha sonado -n. ' + ngTip : 'No lo tengo claro. ' + ngTip; }
          else { state = p <= 0.4 ? 'ok' : p >= 0.6 ? 'bad' : 'unsure'; msg = state === 'ok' ? 'Final -n bien hecha.' : state === 'bad' ? 'Ha sonado -ng. ' + nTip : 'No lo tengo claro. ' + nTip; }
          if (hard && state !== 'ok') state = 'unsure';
          checks.push({ key: 'nasal', label: want ? 'Final -ng' : 'Final -n', state, msg: msg + (hard ? ' (in/ing es el par más difícil de medir.)' : ''), p, want });
        }
      }
    }
  }
  // orden: lo que se está practicando primero
  const focus = opts.focus || [];
  checks.sort((a, b) => (focus.includes(b.key) ? 1 : 0) - (focus.includes(a.key) ? 1 : 0));
  return out;
};

// Palabra de varias sílabas: tono por sílaba
Core.evaluateWord = (x, w) => {
  const range = Core.range();
  const cal = Core.calibration();
  const n = w.syls.length;
  const out = { heard: false, word: w, syls: [] };
  if (n === 1) {
    const r = Core.evaluateSyllable(x, w.syls[0].replace(/r(\d)$/, '$1'), { focus: ['tone'] });
    return Object.assign(out, { heard: r.heard, single: r, reason: r.reason, an: r.an });
  }
  const an = E.analyzeWord(x, n, { noiseDb: cal && cal.noise ? cal.noise.e + 3 : undefined });
  out.an = an;
  if (!an.ok) { out.reason = 'No te he oído bien. Habla un poco más fuerte y cerca del micro.'; return out; }
  out.heard = true;
  an.syls.forEach((s, i) => {
    const target = w.spoken[i];
    const res = { target, syl: w.syls[i], contour: s.contour, t0: s.t0, t1: s.t1 };
    if (target === 5) { res.state = 'skip'; res.msg = 'Neutro: corto y suave.'; }
    else {
      const r = E.toneOf(s.contour, range, { context: true });
      if (!r) { res.state = 'unsure'; res.msg = 'No he podido medir esta sílaba.'; }
      else { res.heardAs = r.tone; res.r = r; res.state = r.tone === target ? 'ok' : 'bad'; res.msg = r.tone === target ? 'Bien.' : 'Ha sonado a ' + TONE_NAMES[r.tone] + '.'; }
    }
    out.syls.push(res);
  });
  const graded = out.syls.filter(s => s.state !== 'skip');
  out.score = graded.length ? graded.filter(s => s.state === 'ok').length / graded.length : 1;
  return out;
};

// Contorno nativo de referencia (en niveles 1-5)
const refCache = new Map();
Core.refContour = async (bank, key, nSyl) => {
  const id = bank + ':' + key + ':' + (nSyl || 1);
  if (refCache.has(id)) return refCache.get(id);
  const buf = await getBuffer(bank, key).catch(() => null);
  if (!buf) return null;
  const x = Core.samplesOf(buf);
  const R = D.nativeRange[bank];
  let res;
  if (nSyl && nSyl > 1) {
    const an = E.analyzeWord(x, nSyl);
    if (!an.ok) return null;
    const all = an.syls.flatMap(s => s.contour.map(p => p.v));
    const lo = Math.min(R.lo, E.pct(all, 0.03)), hi = Math.max(R.hi, E.pct(all, 0.97));
    res = { t0: an.t0, t1: an.t1, syls: an.syls.map(s => ({ t0: s.t0, t1: s.t1, pts: s.contour.map(p => ({ t: p.t, L: 1 + 4 * (p.v - lo) / (hi - lo) })) })) };
  } else {
    const an = E.analyzeSyllable(x);
    if (!an.ok) return null;
    res = { pts: an.contour.map(p => ({ t: p.t, L: 1 + 4 * (p.v - R.lo) / (R.hi - R.lo) })) };
  }
  refCache.set(id, res);
  return res;
};


// ---------- parejas de tonos, frases y ejemplos ----------
const mkWord = (id, h, p, es, extra) => { const syls = p.split(' '); const tones = syls.map(x => +x.slice(-1)); return Object.assign({ id, h, p, es, syls, tones, spoken: spokenTones(tones, h), audio: !!D.audio.w[h] }, extra || {}); };
Core.mkWord = mkWord;
Core.pairs = (D.pairs || []).map(([k, h, p, es], i) => mkWord('p' + i, h, p, es, { pair: k }));
Core.PAIR_KEYS = []; for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4, 5]) Core.PAIR_KEYS.push('' + a + b);
Core.sentences = (D.sentences || []).map(([id, lv, h, p, es]) => mkWord(id, h, p, es, { level: lv, sent: true, audio: false, sAudio: !!D.audio.s[id] }));
Core.example = syl => (D.examples || {})[syl] || null;
Core.playSentence = async (s, opts = {}) => {
  const b = await getBuffer('s', s.id).catch(() => null);
  if (b) { await playBuffer(b, opts.rate || 1); return 's'; }
  return speak(s.h);
};
Core.bufferOf = (bank, key) => getBuffer(bank, key);

// ---------- estadísticas finas (para los puntos débiles y el mapa de la tabla) ----------
Core.fine = {
  all: () => store.get('fine', {}),
  add(key, v) { const f = store.get('fine', {}); const s = f[key] || (f[key] = { n: 0, ok: 0, last: 0, rec: [] }); s.n++; s.ok += v; s.last = Date.now(); s.rec = (s.rec || []).concat([Math.round(v * 100) / 100]).slice(-10); store.set('fine', f); },
  rate(key) { const s = store.get('fine', {})[key]; if (!s || !s.n) return null; const r = s.rec && s.rec.length ? s.rec : null; return r ? r.reduce((a, b) => a + b, 0) / r.length : s.ok / s.n; },
  reset() { store.del('fine'); },
};

// ---------- leer pinyin escrito por el usuario ----------
const MARK2 = {}; Object.entries(MARKS).forEach(([b, ms]) => Array.from(ms).forEach((m, i) => { MARK2[m] = [b, i + 1]; }));
MARK2['ü'] = ['v', 0];
const BASESET = new Set(Core.sylBases.concat(['r']));
// "nǐ hǎo", "ni3hao3", "ni3 hao3", "lü4", "lu:4" -> [{base:'ni', tone:3}, ...]
Core.parsePinyin = input => {
  let s = String(input || '').toLowerCase().normalize('NFC').replace(/u:/g, 'v').replace(/[’'`·,.!?;，。？！]/g, ' ');
  const letters = [], tones = []; // tones[i] = tono pegado a la letra i (por marca) o número tras ella
  for (const ch of s) {
    if (MARK2[ch]) { letters.push(MARK2[ch][0]); tones.push(MARK2[ch][1] || 0); }
    else if (/[a-z]/.test(ch)) { letters.push(ch); tones.push(0); }
    else if (/[1-5]/.test(ch)) { if (letters.length) { letters.push('#' + ch); tones.push(0); } }
    else if (/\s/.test(ch)) { letters.push(' '); tones.push(0); }
  }
  // segmenta: los espacios y números son cortes firmes; dentro, mayor coincidencia con sílabas válidas
  const out = []; let chunk = [], chunkT = [];
  const flush = (num) => {
    const str = chunk.join('');
    if (str) {
      const n = str.length, best = new Array(n + 1).fill(null); best[0] = [];
      for (let i = 0; i < n; i++) if (best[i]) for (let j = Math.min(n, i + 6); j > i; j--) { const sub = str.slice(i, j); if (BASESET.has(sub) && (!best[j] || best[j].length > best[i].length + 1)) best[j] = best[i].concat([[i, j]]); }
      const segs = best[n] || [[0, n]];
      segs.forEach(([a, b], k) => { let t = 0; for (let i = a; i < b; i++) if (chunkT[i]) t = chunkT[i]; if (k === segs.length - 1 && num) t = num; out.push({ base: str.slice(a, b), tone: t || 5 }); });
    }
    chunk = []; chunkT = [];
  };
  letters.forEach((l, i) => { if (l === ' ') flush(0); else if (l[0] === '#') flush(+l[1]); else { chunk.push(l); chunkT.push(tones[i]); } });
  flush(0);
  // erhua: "dian" + "r" -> "dianr"
  const res = [];
  out.forEach(o => { if (o.base === 'r' && res.length) { res[res.length - 1].base += 'r'; if (o.tone !== 5) res[res.length - 1].tone = o.tone; } else res.push(o); });
  return res;
};

// ---------- frases (shadowing) ----------
Core.levelsOf = (pts, range) => pts.map(p => ({ t: p.t, L: 1 + 4 * (p.v - range.lo) / Math.max(5, range.hi - range.lo) }));
Core.evaluateSentence = async (x, s) => {
  const n = s.syls.length, cal = Core.calibration(), range = Core.range();
  const an = E.analyzeWord(x, n, { noiseDb: cal && cal.noise ? cal.noise.e + 3 : undefined });
  if (!an.ok) return { heard: false, reason: 'No te he oído bien. Habla un poco más fuerte y cerca del micro.' };
  const user = an.syls.flatMap(sy => sy.contour);
  if (user.length < 8) return { heard: false, reason: 'Casi no he captado tu voz. Repite la frase entera.' };
  const ref = await Core.refContour('s', s.id, n).catch(() => null);
  const userL = Core.levelsOf(user, range);
  let sim = null, refL = null;
  if (ref) { refL = ref.syls.flatMap(sy => sy.pts); sim = E.contourSimilarity(refL, userL); }
  const durU = user[user.length - 1].t - user[0].t, durR = refL ? refL[refL.length - 1].t - refL[0].t : null;
  return { heard: true, an, userL, refL, ref, sim, durU, durR, user };
};

// ---------- tutor de conversación con Gemini ----------
Core.SCENARIOS = [
  { id: 'intro', name: 'Presentarse', desc: 'Nombre, de dónde eres, a qué te dedicas' },
  { id: 'food', name: 'En el restaurante', desc: 'Pedir comida y bebida, preguntar el precio' },
  { id: 'shop', name: 'De compras', desc: 'Precios, colores, regatear' },
  { id: 'day', name: 'Tu día', desc: 'Qué haces hoy, horarios, el tiempo' },
  { id: 'hobby', name: 'Aficiones', desc: 'Qué te gusta hacer, deportes, música' },
  { id: 'free', name: 'Libre', desc: 'Habla de lo que quieras' },
];
Core.tutor = {
  async turn(history, scenario, level, audioX, text) {
    const key = Core.gemini.key(); if (!key) throw new Error('Añade tu clave de Gemini en Ajustes.');
    let model = Core.gemini.model();
    if (!model) { model = await Core.gemini.pickModel(key); store.set('gemini', { key, model }); }
    const lv = level === 2 ? 'HSK 2-3 (frases de hasta 12 caracteres)' : 'HSK 1 (frases muy cortas, de 3 a 7 caracteres, vocabulario básico)';
    const sys = 'Eres Lǎoshī, un profesor nativo de chino mandarín, amable y paciente, que practica conversación con un alumno hispanohablante. Tema: ' + scenario.name + ' (' + scenario.desc + '). Nivel del alumno: ' + lv + '. ' +
      'Cada vez: 1) escucha con atención lo que dice el alumno (puede mezclar español si no sabe una palabra) y transcribe EXACTAMENTE lo que pronunció, con los tonos que realmente usó, aunque estén mal; 2) si hay errores de gramática, vocabulario o pronunciación, da la frase correcta; 3) comenta en español, en una o dos frases cortas, los tonos o sonidos que pronunció mal (sé concreto: qué sílaba y qué tono o sonido); si lo pronunció bien, díselo; 4) continúa la conversación con UNA sola frase corta en chino que termine con una pregunta fácil de contestar. ' +
      'No escribas nada fuera del JSON. Responde SOLO con este JSON: {"oido":"caracteres de lo que dijo","oido_pinyin":"pinyin con marcas de lo que pronunció realmente","correcto":"frase correcta en caracteres o cadena vacía si estaba bien","correcto_pinyin":"pinyin con marcas o vacío","pronunciacion":"comentario en español","respuesta":"tu frase en caracteres","respuesta_pinyin":"pinyin con marcas","respuesta_num":"pinyin con números de tono, una sílaba por carácter, separado por espacios","respuesta_es":"traducción al español"}';
    const contents = [];
    history.forEach(h => {
      if (h.role === 'user') contents.push({ role: 'user', parts: [{ text: 'Alumno: ' + (h.oido || h.text || '') }] });
      else contents.push({ role: 'model', parts: [{ text: JSON.stringify({ respuesta: h.respuesta, respuesta_pinyin: h.respuesta_pinyin }) }] });
    });
    if (contents.length && contents[0].role === 'model') contents.unshift({ role: 'user', parts: [{ text: 'Empieza tú la conversación.' }] });
    const parts = [];
    if (audioX) { parts.push({ text: 'Esto es lo que ha dicho el alumno ahora (audio):' }); parts.push({ inline_data: { mime_type: 'audio/wav', data: b64(Core.toWav16k(audioX)) } }); }
    else if (text) parts.push({ text: 'El alumno ha escrito: ' + text });
    else parts.push({ text: 'Empieza tú la conversación con un saludo y una primera pregunta sobre el tema. Deja "oido", "correcto" y "pronunciacion" vacíos.' });
    contents.push({ role: 'user', parts });
    const body = { systemInstruction: { parts: [{ text: sys }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.6 } };
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { if (r.status === 404) store.set('gemini', { key }); throw new Error(r.status === 429 ? 'Has llegado al límite gratuito de Gemini por ahora. Prueba en unos minutos.' : 'Gemini respondió con un error (' + r.status + ').'); }
    const j = await r.json();
    const txt = ((j.candidates || [])[0] || {}).content?.parts?.map(p => p.text || '').join('') || '';
    try { return JSON.parse(txt.replace(/^```json|```$/g, '').trim()); } catch (e) { throw new Error('No he entendido la respuesta de Gemini. Inténtalo otra vez.'); }
  },
  ttsCache: new Map(),
  // Voz para el tutor: la del móvil si tiene chino; si no, la de Gemini
  async say(text) {
    if (Core.hasTTS()) return speak(text);
    const key = Core.gemini.key(); if (!key) return false;
    try {
      let buf = this.ttsCache.get(text);
      if (!buf) {
        const g = store.get('gemini', {});
        let model = g.ttsModel;
        if (!model) {
          const lr = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key)); const lj = await lr.json();
          model = (lj.models || []).map(m => m.name.replace('models/', '')).filter(n => /tts/.test(n) && /flash/.test(n)).sort().reverse()[0];
          if (!model) return false; store.set('gemini', Object.assign({}, g, { ttsModel: model }));
        }
        const body = { contents: [{ parts: [{ text: 'Lee en chino mandarín estándar, despacio y claro: ' + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } };
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) return false;
        const j = await r.json();
        const part = ((j.candidates || [])[0] || {}).content?.parts?.find(p => p.inlineData || p.inline_data);
        const d = part && (part.inlineData || part.inline_data); if (!d) return false;
        const bin = atob(d.data), n = bin.length >> 1, pcm = new Float32Array(n);
        for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; pcm[i] = v / 32768; }
        const rate = +((d.mimeType || d.mime_type || '').match(/rate=(\d+)/) || [0, 24000])[1];
        const c = Core.ctx(); buf = c.createBuffer(1, n, rate); buf.copyToChannel(pcm, 0); this.ttsCache.set(text, buf);
      }
      await playBuffer(buf); return true;
    } catch (e) { return false; }
  },
};

// WAV 16 kHz para enviar a Gemini
Core.toWav16k = x => {
  const y = E.resample(x, E.SR, 16000), n = y.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let peak = 1e-6; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
  const g = Math.min(8, 0.9 / peak);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, y[i] * g * 32767)), true);
  return buf;
};
const b64 = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };

// ---------- segunda opinión con Gemini (opcional, con la clave del usuario) ----------
Core.gemini = {
  key: () => store.get('gemini', {}).key || '',
  model: () => store.get('gemini', {}).model || '',
  async pickModel(key) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key));
    if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'La clave no es válida.' : 'No he podido conectar con Gemini (' + r.status + ').');
    const j = await r.json();
    const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''));
    const pref = [/^gemini-3(\.\d)?-flash$/, /^gemini-3(\.\d)?-flash-preview$/, /^gemini-3(\.\d)?-flash-lite$/, /flash-latest$/, /^gemini-\d(\.\d)?-flash$/, /flash/];
    for (const re of pref) { const m = ok.filter(n => re.test(n) && !/image|tts|live|audio-dialog|embedding/.test(n)).sort().reverse()[0]; if (m) return m; }
    throw new Error('Tu clave no tiene acceso a ningún modelo Flash.');
  },
  async ask(x, target) {
    const key = this.key(); if (!key) throw new Error('Añade tu clave de Gemini en Ajustes.');
    let model = this.model();
    if (!model) { model = await this.pickModel(key); store.set('gemini', { key, model }); }
    const prompt = 'Eres un profesor nativo de pronunciación de chino mandarín para hispanohablantes. El alumno intentaba decir «' + target.label + '». ' +
      'Escucha el audio con atención y sé exigente con los tonos, la aspiración (b/p, d/t, g/k, z/c, zh/ch, j/q), la posición de la lengua (z/zh, c/ch, s/sh, j/q/x), la ü, la e, la er y las nasales -n/-ng. ' +
      'Responde SOLO con JSON: {"oigo":"pinyin con marcas de tono de lo que realmente oyes","tonos":"bien|regular|mal","consonantes":"bien|regular|mal","vocales":"bien|regular|mal","consejo":"una o dos frases en español, concretas"}';
    const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'audio/wav', data: b64(Core.toWav16k(x)) } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } };
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { if (r.status === 404) store.set('gemini', { key }); const t = await r.text().catch(() => ''); throw new Error('Gemini respondió ' + r.status + (r.status === 429 ? ': has llegado al límite gratuito, prueba en un rato.' : '.') + (t && r.status !== 429 ? '' : '')); }
    const j = await r.json();
    const txt = ((j.candidates || [])[0] || {}).content?.parts?.map(p => p.text || '').join('') || '';
    try { return JSON.parse(txt.replace(/^```json|```$/g, '').trim()); } catch (e) { return { consejo: txt.slice(0, 400) }; }
  },
};
})();
