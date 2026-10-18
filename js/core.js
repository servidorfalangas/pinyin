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
