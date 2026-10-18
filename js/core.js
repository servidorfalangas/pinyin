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
function spokenTones(tones, hanzi, under) {
  // hanzi -> una entrada por sílaba (sin puntuación; el 儿 de erhua va con la sílaba anterior)
  const chars = Array.from(hanzi || '').filter(c => /[\u4e00-\u9fff]/.test(c));
  const h = []; let ci = 0;
  for (let i = 0; i < tones.length; i++) { h.push(chars[ci++] || ''); if (chars[ci] === '儿' && tones.length < chars.length - (ci - i - 1) && h.length === i + 1 && chars.length > tones.length) { ci++; } }
  const t = tones.slice();
  // tono "de fondo" de los neutros que vienen de un tono 4 (个, 下, 样…): cuenta como 4 para 不 y 一
  const NEUTRAL4 = { '个': 4, '下': 4, '样': 4, '是': 4, '过': 4, '去': 4 };
  const base = i => t[i] === 5 && NEUTRAL4[h[i]] ? NEUTRAL4[h[i]] : t[i];
  for (let i = 0; i < t.length - 1; i++) {
    const nx = base(i + 1);
    if (h[i] === '不' && t[i] === 4 && nx === 4) t[i] = 2;
    if (h[i] === '一' && t[i] === 1) {
      const prev = h[i - 1] || '', next = h[i + 1] || '';
      const counting = /[第十期周统唯]/.test(prev) || /[月号日]/.test(next);
      if (!counting && nx && nx !== 5) t[i] = nx === 4 ? 2 : 4;
    }
  }
  for (let i = t.length - 2; i >= 0; i--) if (t[i] === 3 && t[i + 1] === 3) t[i] = 2;
  return t;
}
Core.spokenTones = spokenTones;
const SYLS = new Set([...Object.keys(D.audio.v1), ...Object.keys(D.audio.v2)]);
Core.hasSyl = s => SYLS.has(s);
const REAL = new Set(D.real || []);
// sílaba que existe de verdad en mandarín (no solo grabada)
Core.realSyl = s => SYLS.has(s) && (!REAL.size || REAL.has(s));
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
Core.voice = () => store.get('settings', {}).voice || 'auto';
// Calidad de cada grabación (0-1): cuánto se parece su tono al que debería tener. Por debajo de 0,45 no se usa.
const QOK = 0.45;
Core.recQuality = (bank, syl) => { const q = (D.q || {})[syl]; if (!q || !D.audio[bank][syl]) return 0; return bank === 'v1' ? q[0] : q[1]; };
// Orden de voces para una sílaba: la elegida si su grabación es buena; si no, la más clara
Core.voicesFor = syl => {
  const pref = Core.voice();
  const have = ['v1', 'v2'].filter(b => D.audio[b][syl]);
  const byQ = have.slice().sort((a, b) => Core.recQuality(b, syl) - Core.recQuality(a, syl));
  if ((pref === 'v1' || pref === 'v2') && have.includes(pref) && Core.recQuality(pref, syl) >= QOK) return [pref].concat(byQ.filter(b => b !== pref));
  return byQ;
};
Core.sylOK = syl => ['v1', 'v2'].some(b => Core.recQuality(b, syl) >= QOK);
// Una grabación de palabra es fiable para ejercicios de oído si todas sus sílabas suenan al tono esperado
Core.wordAudioOK = w => !!(w && D.audio.w[w.h] && !((D.wq || {})[w.h] || []).includes(0));
Core.refVoice = syl => { const v = Core.voicesFor(syl)[0]; return v && Core.recQuality(v, syl) >= QOK ? v : null; };
// Reproduce una sílaba ("ma3"), probando la voz elegida y luego la otra
Core.playSyl = async (syl, opts = {}) => {
  const order = opts.voice ? [opts.voice] : Core.voicesFor(syl);
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
// las grabaciones nativas vienen recortadas: se les añade silencio como el de una grabación real antes de medirlas
Core.padRef = x => { const n = Math.round(0.3 * E.SR), y = new Float32Array(x.length + 2 * n); let s = 1; for (let i = 0; i < y.length; i++) { s = (s * 16807) % 2147483647; y[i] = (s / 2147483647 - 0.5) * 0.0006; } y.set(x.map((v, i) => v + y[n + i]), n); return y; };

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

// rasgos de vocal: perfil de bandas respecto a tus a / i / u (calibración)
function bandFeat(B, V) {
  const A = V.a.vb, I = V.i.vb, U = V.u.vb, d = (p, q) => Math.sqrt(p.reduce((s, v, i) => s + (v - q[i]) * (v - q[i]), 0)) / 10;
  return B.map((v, i) => v - (I[i] + U[i]) / 2).concat([d(B, I), d(B, U), d(B, A)]);
}
Core.bandFeat = bandFeat;
function formantSummary(x, an) {
  if (!an || !an.ok || !isFinite(an.voiceOn)) return null;
  const tr = E.formantTrack(x, an.voiceOn, (an.vowelOff || an.voiceOff) + 0.01);
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
    const tr = E.formantTrack(x, an.voiceOn + 0.1, (an.vowelOff || an.voiceOff) - 0.1);
    const med = k => E.median(tr.map(p => p[k]).filter(isFinite));
    const r = { F1: med('F1'), F2: med('F2'), F3: med('F3') };
    r.vb = E.bandProfile(x, an.voiceOn + 0.1, (an.vowelOff || an.voiceOff) - 0.1);
    return isFinite(r.F1) && isFinite(r.F2) && r.vb ? r : null;
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
    2: { 1: 'Casi no sube (' + rise + ' semitonos). Empieza a media altura y sube de forma clara y continua hasta arriba, como un "¿¡qué!?".', 3: 'Has bajado antes de subir (eso suena a tono 3). Empieza a media altura y sube recto desde el principio.', 4: '¡Al revés! Este tono sube, no baja.' },
    3: { 1: 'Demasiado alto: el tono 3 vive en lo más bajo de tu voz, casi rasposo.', 2: 'Ha sonado a tono 2: antes de subir, baja hasta el fondo de tu voz y quédate ahí un momento.', 4: 'Empiezas muy arriba: el tono 3 arranca a media-baja altura (nivel 2) y baja hasta el fondo.' },
    4: { 1: 'Cae poco (' + drop + ' semitonos). Empieza bien arriba y déjalo caer hasta abajo, como un "¡No!" rotundo.', 2: '¡Al revés! Este tono cae, no sube.', 3: 'Empieza más arriba: el tono 4 cae desde lo más alto de tu voz, seco y rápido.' },
  };
  return 'He oído un ' + TONE_NAMES[r.tone] + '. ' + ((m[target] && m[target][r.tone]) || '');
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
    // umbrales medidos en las voces nativas: delante de vocal cerrada (i, u, ü) el roce dura más
    const high = 'jq'.includes(sp.ini) || ['i-apical', 'i-retro', 'u', 'uen', 'uei', 'iou', 'in', 'ing', 'ong', 'ou', 'i', 'v'].includes(sp.canon);
    const lo = stop ? (high ? 38 : 36) : (high ? 110 : 92), hi = stop ? (high ? 60 : 56) : (high ? 140 : 118);
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
    if (!stop && high && state !== 'ok') msg += ' (Delante de i, u o ü el roce dura más, por eso aquí el límite es más alto.)';
    const snr = an.hfPeak - an.hfFloor;
    if (isFinite(snr) && snr < 28 && state === 'bad' && want) { state = 'unsure'; msg = 'Hay bastante ruido de fondo y no distingo bien el soplo (' + ms + ' ms medidos). Prueba en un sitio más tranquilo o más cerca del micro.'; }
    checks.push({ key: 'asp', label: 'Aire', state, msg, ms, lo, hi, want });
  }
  // lengua: delante (z c s), plana con el dorso al paladar (j q x) o levantada atrás (zh ch sh)
  if (sp.ini in RETRO_SET && an.fric) {
    const R2 = (D.models || {}).retro2, cf = cal && cal.fric;
    const fv = f => [f.low, f.mid, f.high, f.centroid / 1000, f.peak / 1000];
    let p;
    if (R2 && cf && cf.s && cf.sh) {
      const x5 = fv(an.fric), S = fv(cf.s), SH = fv(cf.sh), d = SH.map((v, i) => v - S[i]);
      const t = x5.reduce((s, v, i) => s + (v - S[i]) * d[i], 0) / (d.reduce((s, v) => s + v * v, 0) || 1);
      const feats = x5.concat([t, 'uov'.includes(sp.canon[0]) ? 1 : 0]);
      // probabilidad de "lengua levantada atrás" frente a la alternativa que toca
      p = E.logisticLR('jqx'.includes(sp.ini) ? R2.pr : R2.dr, feats);
    } else p = E.retroflexProb(an.fric);
    const want = RETRO_SET[sp.ini] === 1;
    const pt = want ? p : 1 - p; // probabilidad de que suene a lo pedido
    let state = pt >= 0.65 ? 'ok' : pt <= 0.2 ? 'bad' : 'unsure', msg;
    const front = 'jqx'.includes(sp.ini) ? 'la punta de la lengua abajo, tocando los dientes de abajo, con el centro de la lengua contra el paladar' : 'la punta de la lengua adelante, detrás de los dientes de arriba';
    if (want) msg = state === 'ok' ? 'Lengua hacia atrás: suena a ' + sp.ini + '.' : state === 'bad' ? 'Suena con la lengua delante (como ' + ({ zh: 'z', ch: 'c', sh: 's' })[sp.ini] + '). Levanta la punta hasta el paladar, justo detrás del bulto de la encía (sin enrollarla hacia el fondo).' : 'No lo tengo claro: levanta un poco más la punta, detrás de la encía.';
    else msg = state === 'ok' ? 'Lengua bien colocada: suena a ' + sp.ini + '.' : state === 'bad' ? 'Suena con la lengua levantada (como zh/ch/sh). Pon ' + front + '.' : 'No lo tengo claro. Pon ' + front + '.';
    if (!(cf && cf.s && cf.sh) && state === 'bad') { state = 'unsure'; msg += ' (Calibra tu voz para que lo mida mejor.)'; }
    checks.push({ key: 'retro', label: 'Lengua', state, msg, p: pt, lo: 0.2, hi: 0.65, scale: [want ? 'lengua delante' : 'lengua atrás', want ? 'lengua atrás' : ('jqx'.includes(sp.ini) ? 'lengua plana' : 'lengua delante')], want });
  }
  // vocales, r y nasales: se comparan perfiles espectrales con tus a / i / u de la calibración
  const needsV = ['v', 've', 'van', 'vn', 'e', 'i-apical', 'i-retro', 'er'].includes(sp.canon) || sp.canon in NASAL_FAM || (sp.canon === 'u' && opts.checkU);
  const BM = (D.models || {}).band || {};
  if (needsV) {
    const V = cal && cal.vowels;
    const haveRef = V && V.a && V.i && V.u && V.a.vb && V.i.vb && V.u.vb;
    const vbs = haveRef ? E.vowelBands(x, an) : null;
    out.bands = vbs;
    const P = (name, seg, extra) => { const m = BM[name], B = vbs && vbs[seg]; if (!m || !B) return NaN; return E.logisticLR(m, bandFeat(B, V).concat(extra || [])); };
    const c = sp.canon;
    const vowelKey = ['v', 've', 'van', 'vn', 'e', 'i-apical', 'i-retro', 'er'].includes(c) || (c === 'u' && opts.checkU);
    if (!haveRef) {
      if (vowelKey || c in NASAL_FAM) checks.push({ key: vowelKey ? 'vowel' : 'nasal', label: vowelKey ? 'Vocal' : 'Final', state: 'na', msg: 'Para medir ' + (vowelKey ? 'la vocal' : 'la final -n / -ng') + ' necesito que repitas la calibración (Ajustes → Calibrar): ahora mido las vocales de otra forma, más fiable.' });
    } else if (vbs) {
      const band3 = (p, okAt, badAt) => p >= okAt ? 'ok' : p <= badAt ? 'bad' : 'unsure';
      if (c === 'v') {
        const pu = P('v_u', 'm'), pi = P('v_i', 'm');
        let state = band3(pu, 0.65, 0.3), msg = 'Buena ü: lengua de i con los labios redondos.';
        if (state === 'bad') msg = 'Ha sonado a "u". Coloca la lengua como para decir "i" y, sin moverla, redondea los labios.';
        else if (pi <= 0.25) { state = 'bad'; msg = 'Ha sonado a "i": te falta redondear los labios. Di "i" y, sin mover la lengua, pon los labios como para silbar.'; }
        else if (state === 'unsure') msg = 'Está entre u y ü: adelanta más la lengua, como en "i", y mantén los labios redondos.';
        else if (pi < 0.5) { state = 'unsure'; msg = 'Casi: redondea y adelanta un poco más los labios.'; }
        checks.push({ key: 'vowel', label: 'Vocal ü', state, msg, p: pu, lo: 0.3, hi: 0.65, scale: ['u', 'ü'] });
      } else if (c === 've' || c === 'van' || c === 'vn') {
        const p = P('vb_u', 'b');
        const state = band3(p, 0.65, 0.3);
        checks.push({ key: 'vowel', label: 'Vocal ü', state, p, lo: 0.3, hi: 0.65, scale: ['u', 'ü'], msg: state === 'ok' ? 'Bien: empieza con ü (lengua de i, labios redondos).' : state === 'bad' ? 'Ha empezado con "u". Esta sílaba empieza con ü: lengua de i y labios redondos, como en yu.' : 'No lo tengo claro: empieza con la lengua más adelante, como para decir "i", y los labios redondos.' });
      } else if (c === 'u' && opts.checkU) {
        const p = P('v_u', 'm'), state = p <= 0.35 ? 'ok' : p >= 0.7 ? 'bad' : 'unsure';
        checks.push({ key: 'vowel', label: 'Vocal u', state, p, lo: 0.35, hi: 0.7, scale: ['u', 'ü'], invert: true, msg: state === 'ok' ? 'Buena u, bien redonda y atrás.' : state === 'bad' ? 'Ha sonado a ü: la u se hace con la lengua atrás, como en español.' : 'No lo tengo claro: lleva la lengua más atrás.' });
      } else if (c === 'e') {
        const p = P('e_es', 'm'), state = band3(p, 0.65, 0.3);
        checks.push({ key: 'vowel', label: 'Vocal e', state, p, lo: 0.3, hi: 0.65, scale: ['e española', 'e china'], msg: state === 'ok' ? 'Buena e china: lengua atrás y labios relajados.' : state === 'bad' ? 'Ha sonado a e española. La e china se hace más atrás: boca entreabierta, labios relajados, como un "eh…" de duda que tira hacia "u".' : 'Casi: lleva la lengua un poco más atrás y no sonrías.' });
      } else if (c === 'i-apical' || c === 'i-retro') {
        const p = P(c === 'i-apical' ? 'ap_i' : 'rt_i', 'm'), state = band3(p, 0.65, 0.3);
        checks.push({ key: 'vowel', label: 'La "i"', state, p, lo: 0.3, hi: 0.65, scale: ['i española', c === 'i-apical' ? 'zumbido' : 'lengua atrás'], msg: state === 'ok' ? (c === 'i-apical' ? 'Bien: es un zumbido, no una i.' : 'Bien: la lengua se queda atrás, no es una i.') : state === 'bad' ? 'Ha sonado una i española. Aquí la i no se pronuncia como i: ' + (c === 'i-apical' ? 'deja la lengua donde está y alarga la consonante con voz, como un "zzz".' : 'deja la lengua levantada hacia atrás y alarga con voz, como una "r" inglesa.') : 'Suena un poco a i: no muevas la lengua al pasar a la vocal.' });
      } else if (c === 'er') {
        // er: la punta curvada baja mucho el tercer formante
        const fsE = formantSummary(x, an), F3m = (V.a.F3 + V.i.F3 + V.u.F3) / 3;
        const k = fsE ? Math.min(fsE.m.F3 || 9e9, fsE.e.F3 || 9e9) / F3m : NaN;
        const state = !isFinite(k) ? 'na' : k < 0.86 ? 'ok' : k < 0.95 ? 'unsure' : 'bad', p = isFinite(k) ? Math.max(0, Math.min(1, (1.05 - k) / 0.35)) : NaN;
        checks.push({ key: 'vowel', label: 'er', state, p, lo: 0.29, hi: 0.54, scale: ['sin r', 'con r'], msg: state === 'na' ? 'No he podido medir la r final. Escucha y compara.' : state === 'ok' ? 'Buena er: se nota la punta curvada.' : 'Falta la "r": empieza con una vocal neutra "ə" y, mientras la dices, curva la punta de la lengua hacia atrás (como "her" en inglés americano).' });
      }
      // nasal final: la vocal ya suena distinta antes de -n / -ng (a delante en an, atrás en ang)
      if (c in NASAL_FAM) {
        const fam = { an: 'an', ang: 'an', en: 'en', eng: 'en', in: 'in', ing: 'in', ian: 'ian', iang: 'ian', uan: 'uan', uang: 'uan' }[c];
        const NM = ((D.models || {}).nasal2 || {})[fam], fsm = formantSummary(x, an);
        let p = NaN;
        if (NM && fsm && isFinite(fsm.m.F2) && isFinite(fsm.m.F1) && vbs.m && vbs.e) {
          const I = V.i.vb, U = V.u.vb, mid = vbs.m.map((v, i) => v - (I[i] + U[i]) / 2), de = vbs.e.map((v, i) => v - vbs.m[i]);
          p = E.logisticLR(NM, [fsm.m.F2 / V.a.F2, (fsm.m.F2 - V.u.F2) / (V.i.F2 - V.u.F2), fsm.m.F1 / V.a.F1].concat(mid.slice(2, 9), de.slice(2, 9)));
        }
        const diff = vbs.e && vbs.m ? vbs.e.map((v, i) => v - vbs.m[i]) : [];
        const pc = P('nasal_coda', 'e', diff);
        const want = NASAL_NG[c] === 1, hard = fam === 'in';
        const pt = want ? p : 1 - p;
        const ngTip = 'Al final no subas la punta: sube el fondo de la lengua, como la n de "tengo", "cinco" o "tango", y quédate ahí sin decir la g. La vocal de antes va más atrás.';
        const nTip = 'Al final, sube la punta de la lengua hasta tocar detrás de los dientes de arriba, como la n de "tanto" o "antes". La vocal de antes va más adelante.';
        let state, msg;
        if (!isFinite(p)) { state = 'na'; msg = 'No he podido medir la final en esta grabación. Escucha y compara.'; }
        else {
          state = pt >= (hard ? 0.8 : 0.65) ? 'ok' : (!hard && pt <= 0.15) ? 'bad' : 'unsure';
          msg = state === 'ok' ? (want ? 'Final -ng bien hecha.' : 'Final -n bien hecha.') : state === 'bad' ? (want ? 'Ha sonado -n. ' + ngTip : 'Ha sonado -ng. ' + nTip) : 'No lo tengo claro. ' + (want ? ngTip : nTip) + (hard ? ' (in/ing es el par más difícil de distinguir, también de medir.)' : '');
          if (pc <= 0.1 && state !== 'bad') { state = 'unsure'; msg = 'Casi no se oye la nasal del final: termina con ' + (want ? '-ng (el fondo de la lengua arriba)' : '-n (la punta arriba)') + ' y mantenla un momento.'; }
        }
        checks.push({ key: 'nasal', label: want ? 'Final -ng' : 'Final -n', state, msg, p: pt, want, lo: hard ? 0.5 : 0.15, hi: hard ? 0.8 : 0.65, scale: [want ? '-n' : '-ng', want ? '-ng' : '-n'] });
      }
    }
  }
  // sílaba sin nasal: si se oye una n/ng al final, es otra sílaba (ba ≠ ban)
  if (!(sp.canon in NASAL_FAM) && !/n$|ng$/.test(sp.canon) && cal && cal.vowels && cal.vowels.a && cal.vowels.a.vb && BM.nasal_coda && (opts.focus || []).length) {
    const vb2 = out.bands || E.vowelBands(x, an);
    if (vb2 && vb2.e && vb2.m) { const pc = E.logisticLR(BM.nasal_coda, bandFeat(vb2.e, cal.vowels).concat(vb2.e.map((v, i) => v - vb2.m[i]))); if (pc >= 0.9) checks.push({ key: 'coda', label: 'Final', state: 'unsure', msg: 'Me ha parecido oír una n al final, y esta sílaba no la lleva: termina en vocal.' }); }
  }
  // orden: lo que se está practicando primero
  const focus = opts.focus || [];
  // lo que se practica y no se ha podido medir: se dice, y no cuenta como aprobado
  const applies = { asp: sp.ini in ASP, retro: sp.ini in RETRO_SET, vowel: ['v', 've', 'van', 'vn', 'e', 'i-apical', 'i-retro', 'er'].includes(sp.canon) || (sp.canon === 'u' && !!opts.checkU), nasal: sp.canon in NASAL_FAM };
  const NA = { r: 'la r', asp: 'el aire', retro: 'la posición de la lengua', vowel: 'la vocal', nasal: 'la final -n / -ng' };
  focus.forEach(k => { if (applies[k] && !checks.some(c => c.key === k)) checks.push({ key: k, label: { r: 'La r', asp: 'Aire', retro: 'Lengua', vowel: 'Vocal', nasal: 'Final' }[k], state: 'na', msg: 'No he podido medir ' + NA[k] + ' en esta grabación (¿ruido, o la consonante muy floja?). Escucha al nativo, compara y repite.' }); });
  checks.sort((a, b) => (focus.includes(b.key) ? 1 : 0) - (focus.includes(a.key) ? 1 : 0));
  // sílaba con la que ha sonado (para poder escucharla)
  const sounded = [];
  checks.forEach(ch => {
    if (ch.state !== 'bad') return;
    let s = null;
    if (ch.key === 'tone' && ch.heardAs) s = sp.base + ch.heardAs;
    if (ch.key === 'asp') { const m = { b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g', z: 'c', c: 'z', zh: 'ch', ch: 'zh', j: 'q', q: 'j' }[sp.ini]; if (m) s = m + sp.base.slice(sp.ini.length) + sp.tone; }
    if (ch.key === 'retro') { const m = { z: 'zh', zh: 'z', c: 'ch', ch: 'c', s: 'sh', sh: 's', x: 'sh', q: 'ch', j: 'zh' }[sp.ini]; if (m && !'jqx'.includes(sp.ini)) s = m + sp.base.slice(sp.ini.length) + sp.tone; else if (m) { const f = { i: 'i', ia: 'a', ie: 'e', iao: 'ao', iu: 'ou', ian: 'an', in: 'en', iang: 'ang', ing: 'eng', iong: 'ong', u: 'u', ue: 'uo', uan: 'uan', un: 'un' }[sp.base.slice(1)]; if (f) s = m + f + sp.tone; } }
    if (ch.key === 'nasal') s = (sp.base.endsWith('ng') ? sp.base.slice(0, -1) : sp.base + 'g') + sp.tone;
    if (ch.key === 'vowel' && sp.canon[0] === 'v' && (sp.ini === 'l' || sp.ini === 'n')) s = sp.ini + 'u' + sp.base.slice(2) + sp.tone;
    if (ch.key === 'vowel' && sp.canon === 'u' && (sp.ini === 'l' || sp.ini === 'n')) s = sp.ini + 'v' + sp.tone;
    if (s && Core.hasSyl(s) && Core.sylOK(s) && !sounded.includes(s)) { ch.rival = s; sounded.push(s); }
  });
  out.sounded = sounded;
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
  const wt = D.models.word ? E.wordTones(D.models.word, an.syls.map(s => s.contour), range) : an.syls.map(s => E.toneOf(s.contour, range, { context: true }));
  an.syls.forEach((s, i) => {
    const target = w.spoken[i];
    const res = { target, syl: w.syls[i], contour: s.contour, t0: s.t0, t1: s.t1 };
    if (target === 5) { res.state = 'skip'; res.msg = 'Neutro: corto y suave.'; }
    else {
      const r = wt[i];
      if (!r) { res.state = 'unsure'; res.msg = 'No he podido medir esta sílaba.'; }
      else {
        const pT = r.probs ? r.probs[target - 1] : 0;
        res.heardAs = r.tone; res.r = r;
        res.state = r.tone === target ? 'ok' : pT >= 0.25 ? 'unsure' : 'bad';
        res.msg = r.tone === target ? 'Bien.' : res.state === 'unsure' ? 'Casi: suena un poco a ' + TONE_NAMES[r.tone] + '.' : 'Ha sonado a ' + TONE_NAMES[r.tone] + '.';
      }
    }
    out.syls.push(res);
  });
  const graded = out.syls.filter(s => s.state !== 'skip');
  out.score = graded.length ? graded.reduce((acc, s) => acc + (s.state === 'ok' ? 1 : s.state === 'unsure' ? 0.5 : 0), 0) / graded.length : 1;
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
    const flags = bank === 'w' ? (D.wq || {})[key] : null;
    res = { t0: an.t0, t1: an.t1, syls: an.syls.map((s, k) => ({ t0: s.t0, t1: s.t1, model: !!(flags && flags[k] === 0), pts: flags && flags[k] === 0 ? null : s.contour.map(p => ({ t: p.t, L: 1 + 4 * (p.v - lo) / (hi - lo) })) })) };
  } else {
    if ((bank === 'v1' || bank === 'v2') && Core.recQuality(bank, key) < QOK) return null;
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
      'Cada vez: 1) escucha con atención lo que dice el alumno (puede mezclar español si no sabe una palabra) y transcribe EXACTAMENTE lo que pronunció, con los tonos que realmente usó, aunque estén mal (pero los cambios de tono normales del habla, como 3+3 → 2+3 o 不/一, no son errores); 2) si hay errores de gramática, vocabulario o pronunciación, da la frase correcta; 3) comenta en español, en una o dos frases cortas, los tonos o sonidos que pronunció mal (sé concreto: qué sílaba y qué tono o sonido); si lo pronunció bien, díselo; 4) continúa la conversación con UNA sola frase corta en chino que termine con una pregunta fácil de contestar. ' +
      'No escribas nada fuera del JSON. Responde SOLO con este JSON: {"oido":"caracteres de lo que dijo","oido_pinyin":"pinyin con marcas de lo que pronunció realmente","correcto":"frase correcta en caracteres o cadena vacía si estaba bien","correcto_pinyin":"pinyin con marcas o vacío","pronunciacion":"comentario en español","respuesta":"tu frase en caracteres","respuesta_pinyin":"pinyin con marcas","respuesta_num":"pinyin con números de tono, una sílaba por carácter (el 儿 de erhua va pegado a la sílaba anterior, p. ej. dianr3), separado por espacios","respuesta_es":"traducción al español"}';
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
    const prompt = 'Eres un profesor nativo de pronunciación de chino mandarín para hispanohablantes. El alumno intentaba decir «' + target.label + '»' + (target.spoken ? ' (pronunciación hablada esperada, ya con los cambios de tono: ' + target.spoken + ')' : '') + '. Ten en cuenta los cambios de tono del habla (3+3 se dice 2+3, 不 y 一, medio tercer tono, neutros): si el alumno los aplica bien, NO es un error. ' +
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
