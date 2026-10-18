/* Motor de análisis acústico para mandarín.
   Funciona igual en el navegador y en Node (para validarlo con grabaciones nativas).
   Todo trabaja a 22050 Hz mono (Float32Array). */
(function (root) {
'use strict';
const SR = 22050;

// ---------- utilidades ----------
function resample(x, srIn, srOut) {
  if (srIn === srOut) return Float32Array.from(x);
  const ratio = srIn / srOut, n = Math.floor(x.length / ratio), y = new Float32Array(n);
  if (ratio > 1) {
    // filtro paso bajo de sinc con ventana de Hann (antialias) y lectura a la posición fraccionaria
    const fc = 0.5 / ratio * 0.92, H = Math.ceil(10 * ratio), L = x.length;
    for (let i = 0; i < n; i++) {
      const p = i * ratio, k0 = Math.ceil(p - H), k1 = Math.floor(p + H);
      let s = 0, ws = 0;
      for (let k = Math.max(0, k0); k <= Math.min(L - 1, k1); k++) {
        const d = p - k;
        const sinc = d === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * d) / (Math.PI * d);
        const w = 0.5 + 0.5 * Math.cos(Math.PI * d / H);
        const h = sinc * w; s += x[k] * h; ws += h;
      }
      y[i] = ws ? s / ws : 0;
    }
  } else {
    for (let i = 0; i < n; i++) { const p = i * ratio, k = Math.floor(p), f = p - k; y[i] = x[k] * (1 - f) + (x[Math.min(k + 1, x.length - 1)] * f); }
  }
  return y;
}
function median(a) { if (!a.length) return NaN; const s = Array.from(a).sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pct(a, p) { if (!a.length) return NaN; const s = Array.from(a).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; }
function mean(a) { let s = 0; for (const v of a) s += v; return a.length ? s / a.length : NaN; }
const st = f => 12 * Math.log2(f / 100);         // semitonos respecto a 100 Hz
const hz = s => 100 * Math.pow(2, s / 12);

// FFT radix-2 in place (re, im)
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
const hann = (() => { const cache = {}; return n => cache[n] || (cache[n] = Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)))); })();
function powerSpectrum(x, start, n) {
  const re = new Float64Array(n), im = new Float64Array(n), w = hann(n);
  for (let i = 0; i < n; i++) re[i] = (x[start + i] || 0) * w[i];
  fft(re, im);
  const p = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i];
  return p;
}

// ---------- energía y segmentación ----------
const HOP = 0.005; // 5 ms
function frames(x) {
  const hop = Math.round(HOP * SR), win = Math.round(0.02 * SR);
  const n = Math.max(0, Math.floor((x.length - win) / hop) + 1);
  const e = new Float32Array(n), hf = new Float32Array(n), zc = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, sh = 0, z = 0, prev = 0, s0 = f * hop;
    for (let i = 0; i < win; i++) {
      const v = x[s0 + i]; s += v * v;
      const d = v - (i ? x[s0 + i - 1] : v); sh += d * d; // diferencia de primer orden ~ realza agudos
      if (i && (v >= 0) !== (prev >= 0)) z++; prev = v;
    }
    e[f] = 10 * Math.log10(s / win + 1e-10);
    hf[f] = 10 * Math.log10(sh / win + 1e-10);
    zc[f] = z / win * SR / 2; // Hz aprox
  }
  return { e, hf, zc, hop, win, n };
}

// Encuentra el tramo de habla principal. Devuelve índices de trama [a, b)
function speechRegion(fr, noiseDb) {
  const { e, hf, n } = fr;
  if (!n) return null;
  const peak = Math.max(...e);
  const floor = noiseDb != null ? noiseDb : pct(e, 0.1);
  const thr = Math.max(floor + 8, peak - 45);
  const peakHf = Math.max(...hf), floorHf = pct(hf, 0.1);
  const thrHf = Math.max(floorHf + 10, peakHf - 40);
  const on = new Uint8Array(n);
  for (let i = 0; i < n; i++) on[i] = (e[i] > thr || hf[i] > thrHf) ? 1 : 0;
  // une huecos < 60 ms y busca el bloque más energético
  const gap = Math.round(0.06 / HOP);
  let best = null, a = -1, lastOn = -1e9;
  const blocks = [];
  for (let i = 0; i < n; i++) {
    if (on[i]) { if (a < 0 || i - lastOn > gap) { if (a >= 0) blocks.push([a, lastOn + 1]); a = i; } lastOn = i; }
  }
  if (a >= 0) blocks.push([a, lastOn + 1]);
  let bestE = -Infinity;
  for (const [s, t] of blocks) { let sum = 0; for (let i = s; i < t; i++) sum += Math.pow(10, e[i] / 10); if (sum > bestE) { bestE = sum; best = [s, t]; } }
  if (!best || best[1] - best[0] < 8) return null;
  return { a: best[0], b: best[1], floor, peak };
}

// ---------- tono (YIN) ----------
function yinFrame(x, s0, W, minLag, maxLag) {
  const d = new Float32Array(maxLag + 2);
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) { const v = x[s0 + i] - x[s0 + i + tau]; sum += v * v; }
    d[tau] = sum;
  }
  let run = 0;
  const cm = new Float32Array(maxLag + 2); cm[0] = 1;
  for (let tau = 1; tau <= maxLag + 1; tau++) { run += d[tau]; cm[tau] = run ? d[tau] * tau / run : 1; }
  // candidatos: mínimos locales de la función normalizada
  const cands = [];
  for (let t = minLag; t <= maxLag; t++) {
    if (cm[t] < 0.85 && cm[t] <= cm[t - 1] && cm[t] <= cm[t + 1]) {
      const a = cm[t - 1], b = cm[t], c = cm[t + 1], den = a + c - 2 * b;
      const lag = den ? t + (a - c) / (2 * den) : t;
      cands.push({ f0: SR / lag, ap: b });
    }
  }
  cands.sort((p, q) => p.ap - q.ap);
  return cands.slice(0, 5);
}

function pitchTrack(x, opts = {}) {
  const fmin = opts.fmin || 65, fmax = opts.fmax || 480;
  const hop = Math.round(0.01 * SR), W = Math.round(0.025 * SR);
  const minLag = Math.floor(SR / fmax), maxLag = Math.ceil(SR / fmin);
  const out = [];
  for (let s0 = 0; s0 + W + maxLag + 2 < x.length; s0 += hop) {
    let en = 0; for (let i = 0; i < W; i++) en += x[s0 + i] * x[s0 + i];
    const db = 10 * Math.log10(en / W + 1e-10);
    const c = yinFrame(x, s0, W, minLag, maxLag);
    out.push({ t: (s0 + W / 2) / SR, cands: c, f0: c.length ? c[0].f0 : NaN, ap: c.length ? c[0].ap : 1, db });
  }
  return out;
}

// Viterbi sobre candidatos: elige el camino de tono más continuo y periódico
function viterbiPitch(track, t0, t1) {
  const fr = track.filter(p => p.t >= t0 - 0.01 && p.t <= t1 + 0.01);
  if (!fr.length) return [];
  const peak = Math.max(...fr.map(p => p.db));
  const states = fr.map(p => {
    const loud = p.db > peak - 38;
    const s = (loud ? p.cands : []).map(c => ({ v: st(c.f0), cost: c.ap * 1.1 }));
    s.push({ v: NaN, cost: loud ? 0.7 + (peak - p.db < 20 ? 0.4 : 0) : 0 }); // estado sordo
    return s;
  });
  const trans = (a, b) => {
    const ua = isNaN(a.v), ub = isNaN(b.v);
    if (ua && ub) return 0;
    if (ua || ub) return 0.45;
    const dv = Math.abs(a.v - b.v);
    return 0.09 * dv + (dv > 3 ? 0.5 * (dv - 3) : 0);
  };
  let prev = states[0].map(s => ({ c: s.cost, bp: -1 }));
  const bps = [prev];
  for (let i = 1; i < states.length; i++) {
    const cur = states[i].map(s => {
      let best = Infinity, bp = 0;
      states[i - 1].forEach((p, j) => { const c = prev[j].c + trans(p, s); if (c < best) { best = c; bp = j; } });
      return { c: best + s.cost, bp };
    });
    bps.push(cur); prev = cur;
  }
  let j = 0; prev.forEach((p, k) => { if (p.c < prev[j].c) j = k; });
  const path = [];
  for (let i = states.length - 1; i >= 0; i--) { path.push({ t: fr[i].t, v: states[i][j].v, db: fr[i].db }); j = bps[i][j].bp; }
  path.reverse();
  return path;
}

// Contorno de tono limpio dentro de una región (segundos t0..t1)
function cleanContour(track, t0, t1) {
  const path = viterbiPitch(track, t0, t1).filter(p => !isNaN(p.v));
  if (path.length < 4) return [];
  // mediana móvil de 3 para quitar picos
  const v = path.map(p => p.v);
  path.forEach((p, i) => { p.v = median(v.slice(Math.max(0, i - 1), i + 2)); });
  // corta en bloques por huecos (> 50 ms) o saltos bruscos (> 3.5 st entre tramas)
  const blocks = []; let cur = [];
  path.forEach((p, i) => { const q = path[i - 1]; if (i && (p.t - q.t > 0.05 || Math.abs(p.v - q.v) > 3.5)) { blocks.push(cur); cur = []; } cur.push(p); });
  if (cur.length) blocks.push(cur);
  const energy = bl => bl.reduce((s, p) => s + Math.pow(10, p.db / 10), 0);
  blocks.sort((x, y) => energy(y) - energy(x));
  let main = blocks[0];
  // une bloques vecinos coherentes (T3 con voz rota, pequeñas pérdidas)
  let changed = true;
  while (changed) {
    changed = false;
    for (const bl of blocks) {
      if (main.includes(bl[0]) || bl.length < 4) continue;
      const pk = Math.max(...main.map(p => p.db)), mdb = mean(bl.map(p => p.db));
      if (mdb < pk - 14) continue;
      const first = main[0], last = main[main.length - 1];
      const after = bl[0].t > last.t && bl[0].t - last.t < 0.12 && Math.abs(bl[0].v - last.v) < 6;
      const before = bl[bl.length - 1].t < first.t && first.t - bl[bl.length - 1].t < 0.12 && Math.abs(bl[bl.length - 1].v - first.v) < 6 && energy(bl) > 0.15 * energy(main) / main.length * bl.length;
      if (after || before) { main = after ? main.concat(bl) : bl.concat(main); changed = true; }
    }
  }
  main.sort((a, b) => a.t - b.t);
  return main;
}

// Remuestrea un contorno a N puntos equiespaciados en tiempo
function resampleContour(c, N) {
  if (c.length < 2) return [];
  const t0 = c[0].t, t1 = c[c.length - 1].t, out = [];
  for (let k = 0; k < N; k++) {
    const t = t0 + (t1 - t0) * k / (N - 1);
    let j = 0; while (j < c.length - 2 && c[j + 1].t < t) j++;
    const a = c[j], b = c[j + 1], f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    out.push(a.v + (b.v - a.v) * f);
  }
  return out;
}

// ---------- clasificación de tonos ----------
// Niveles 1..5 (escala de Chao) relativos al rango de la voz [lo, hi] en semitonos.
// Plantillas aprendidas de grabaciones nativas (se sobrescriben con TEMPLATES si existen).
let TEMPLATES = {
  1: [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5],
  2: [3, 2.8, 2.8, 3, 3.3, 3.7, 4.1, 4.5, 4.8, 5],
  3: [2.4, 2, 1.6, 1.3, 1.1, 1.1, 1.3, 1.8, 2.6, 3.4],
  4: [5, 4.9, 4.7, 4.4, 4, 3.5, 3, 2.5, 2, 1.6],
};
function toLevels(v, range) { return v.map(s => 1 + 4 * (s - range.lo) / Math.max(4, range.hi - range.lo)); }

function toneFeatures(L) {
  const n = L.length, mx = Math.max(...L), mn = Math.min(...L), iMin = L.indexOf(mn), iMax = L.indexOf(mx);
  return {
    start: mean(L.slice(0, 2)), end: mean(L.slice(n - 2)), mid: mean(L.slice(Math.floor(n * 0.4), Math.ceil(n * 0.6))),
    mx, mn, iMin: iMin / (n - 1), iMax: iMax / (n - 1), avg: mean(L),
    rise: mean(L.slice(n - 2)) - mn, fall: mx - mean(L.slice(n - 2)), range: mx - mn,
  };
}
function classifyTone(L, opts = {}) {
  // distancia a plantilla (permite un desplazamiento vertical pequeño penalizado)
  const scores = {};
  for (const k of [1, 2, 3, 4]) {
    const T = TEMPLATES[k];
    let best = Infinity;
    for (let sh = -0.8; sh <= 0.8; sh += 0.2) {
      let d = 0; for (let i = 0; i < L.length; i++) { const e = L[i] - (T[i] + sh); d += e * e * (i < 2 ? 0.6 : 1); }
      d = d / L.length + 0.6 * sh * sh;
      if (d < best) best = d;
    }
    scores[k] = best;
  }
  // T3 de contexto (21 sin subida final) también vale como T3 si va bajo
  const f = toneFeatures(L);
  if (opts.allowLowT3 !== false && f.avg < 2.2 && f.mn < 1.8 && f.fall < 2.5) scores[3] = Math.min(scores[3], 0.25);
  const ranked = Object.keys(scores).map(Number).sort((a, b) => scores[a] - scores[b]);
  const best = ranked[0], second = ranked[1];
  const conf = Math.max(0, Math.min(1, (scores[second] - scores[best]) / (scores[second] + 0.05)));
  return { tone: best, scores, conf, f };
}

// ---------- espectro de la fricación ----------
function noiseSpectrum(x, s0, s1) {
  const N = 512; // 23 ms
  if (s1 - s0 < N / 2) { const c = (s0 + s1) >> 1; s0 = Math.max(0, c - N / 2); s1 = s0 + N; }
  const acc = new Float64Array(N / 2); let k = 0;
  for (let s = s0; s + N <= Math.max(s1, s0 + N); s += N / 4) { const p = powerSpectrum(x, s, N); for (let i = 0; i < N / 2; i++) acc[i] += p[i]; k++; }
  for (let i = 0; i < N / 2; i++) acc[i] /= Math.max(1, k);
  return { p: acc, df: SR / N };
}
function spectralFeatures(spec) {
  const { p, df } = spec;
  const lo = Math.round(1000 / df), hi = Math.min(p.length - 1, Math.round(10500 / df));
  let sw = 0, swf = 0;
  for (let i = lo; i <= hi; i++) { sw += p[i]; swf += p[i] * i * df; }
  const centroid = swf / sw;
  // pico del espectro suavizado (ventana ~ 600 Hz) entre 2 y 10.5 kHz
  const sm = []; const w = Math.round(300 / df);
  for (let i = 0; i < p.length; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(p.length - 1, i + w); j++) { s += p[j]; c++; } sm.push(s / c); }
  let pk = Math.round(2000 / df); for (let i = pk; i <= hi; i++) if (sm[i] > sm[pk]) pk = i;
  // reparto de energía por bandas
  const band = (a, b) => { let s = 0; for (let i = Math.round(a / df); i <= Math.min(p.length - 1, Math.round(b / df)); i++) s += p[i]; return s; };
  const tot = band(1000, 10500) + 1e-12;
  return {
    centroid, peak: pk * df,
    low: band(1500, 3800) / tot,   // típico de sh/zh/ch
    mid: band(3800, 6000) / tot,   // típico de x/j/q
    high: band(6000, 10500) / tot, // típico de s/z/c
  };
}

// ---------- formantes (LPC) ----------
function lpcEnvelope(x, s0, N, order, fs) {
  const seg = new Float64Array(N), w = hann(N);
  for (let i = 0; i < N; i++) seg[i] = ((x[s0 + i] || 0) - 0.95 * (x[s0 + i - 1] || 0)) * w[i];
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) { let s = 0; for (let i = k; i < N; i++) s += seg[i] * seg[i - k]; r[k] = s; }
  if (r[0] <= 0) return null;
  r[0] *= 1.0001;
  const a = new Float64Array(order + 1); a[0] = 1; let err = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err; const tmp = a.slice();
    for (let j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
    a[i] = k; err *= (1 - k * k);
  }
  // evalúa la envolvente 0..5000 Hz
  const G = 250, env = new Float64Array(G);
  for (let g = 0; g < G; g++) {
    const om = 2 * Math.PI * (g * 20) / fs; let re = 0, im = 0;
    for (let k = 0; k <= order; k++) { re += a[k] * Math.cos(om * k); im -= a[k] * Math.sin(om * k); }
    env[g] = -10 * Math.log10(re * re + im * im + 1e-12);
  }
  return env; // resolución 20 Hz
}
function formantsAt(x11, s0, fs) {
  const env = lpcEnvelope(x11, s0, Math.round(0.03 * fs), 12, fs);
  if (!env) return null;
  const peaks = [];
  for (let g = 8; g < env.length - 1; g++) if (env[g] > env[g - 1] && env[g] >= env[g + 1]) peaks.push(g * 20);
  // F1 en 200-1100, F2 > F1+250, F3 > F2+300
  const F1 = peaks.find(f => f >= 200 && f <= 1100);
  if (!F1) return null;
  const F2 = peaks.find(f => f > F1 + 250 && f < 3000);
  const F3 = F2 ? peaks.find(f => f > F2 + 250 && f < 4200) : undefined;
  return { F1, F2: F2 || NaN, F3: F3 || NaN };
}
function formantTrack(x, t0, t1) {
  const fs = 11025, x11 = resample(x, SR, fs), out = [];
  for (let t = t0; t < t1 - 0.03; t += 0.01) {
    const f = formantsAt(x11, Math.round(t * fs), fs);
    out.push(Object.assign({ t: t + 0.015 }, f || { F1: NaN, F2: NaN, F3: NaN }));
  }
  return out;
}

// ---------- análisis completo de una sílaba ----------
function analyzeSyllable(x, opts = {}) {
  const fr = frames(x);
  const reg = speechRegion(fr, opts.noiseDb);
  if (!reg) return { ok: false, reason: 'silence' };
  const t0 = reg.a * HOP, t1 = (reg.b * HOP) + 0.02;
  const track = pitchTrack(x, opts.pitch);
  const contour = cleanContour(track, t0, t1);
  // inicio de la sonoridad: primer punto del contorno (vocal)
  let vOn = contour.length ? contour[0].t : NaN;
  // refina el inicio de la voz con energía en graves: busca la subida de energía
  const res = { ok: true, t0, t1, track, contour, voiceOn: vOn, voiceOff: contour.length ? contour[contour.length - 1].t : NaN };
  // inicio estricto de la voz: primera trama claramente periódica y sostenida
  const pk = Math.max(...track.filter(p => p.t >= t0 && p.t <= t1).map(p => p.db), -200);
  let vStrict = NaN;
  for (let i = 0; i + 2 < track.length; i++) {
    const p = track[i]; if (p.t < t0 - 0.02 || p.t > t1) continue;
    if ([0, 1, 2].every(k => track[i + k].ap < 0.3 && track[i + k].db > pk - 25)) { vStrict = p.t - 0.01; break; }
  }
  if (isFinite(vStrict)) res.voiceOn = vStrict;
  // inicio del ruido: desde el inicio de la voz, retrocede mientras haya energía en agudos sobre el ruido de fondo
  const floorHf = opts.noiseHf != null ? opts.noiseHf : pct(fr.hf, 0.1);
  let nOn = res.voiceOn;
  if (isFinite(res.voiceOn)) {
    let i = Math.min(fr.n - 1, Math.round(res.voiceOn / HOP));
    const hfV = Math.max(...Array.from(fr.hf.slice(i, Math.min(fr.n, i + 20))));
    const thr = Math.max(floorHf + 6, hfV - 26); let miss = 0, last = i;
    while (i > 0) { i--; if (fr.hf[i] > thr) { last = i; miss = 0; } else if (++miss > 4) break; }
    nOn = last * HOP + 0.01; // centro de la ventana de 20 ms
  }
  res.noiseOn = nOn;
  res.noiseDur = isFinite(res.voiceOn) ? Math.max(0, res.voiceOn - nOn) : NaN;
  // espectro de la fricación
  vOn = res.voiceOn;
  if (isFinite(vOn) && res.noiseDur > 0.012) {
    const s0 = Math.round((res.noiseOn + 0.004) * SR), s1 = Math.round((vOn - 0.008) * SR);
    res.noise = spectralFeatures(noiseSpectrum(x, s0, Math.max(s1, s0 + 64)));
    // solo la fricación inicial (primeros 60 ms): ahí está el punto de articulación
    const s1e = Math.min(s1, s0 + Math.round(0.06 * SR));
    res.fric = spectralFeatures(noiseSpectrum(x, s0, Math.max(s1e, s0 + 64)));
  }
  // rasgos de la envolvente del ruido: ¿empieza de golpe (africada/oclusiva) o crece poco a poco (fricativa)?
  if (isFinite(vOn) && res.noiseDur > 0.015) {
    const a = Math.round(res.noiseOn / HOP), b = Math.min(fr.n - 1, Math.round((vOn - 0.01) / HOP));
    let mx = -Infinity, imx = a; for (let i = a; i <= b; i++) if (fr.hf[i] > mx) { mx = fr.hf[i]; imx = i; }
    res.noiseRiseFrac = (imx - a) / Math.max(1, b - a); // 0 = pico al principio (ráfaga)
  }
  return res;
}

// Formantes de la parte vocálica de una sílaba ya analizada
function vowelFormants(x, an) {
  if (!an.ok || !isFinite(an.voiceOn)) return null;
  const tr = formantTrack(x, an.voiceOn, an.voiceOff + 0.01);
  return tr;
}


// ---------- palabras de varias sílabas ----------
function analyzeWord(x, nSyl, opts = {}) {
  const fr = frames(x);
  const reg = speechRegion(fr, opts.noiseDb);
  if (!reg) return { ok: false, reason: 'silence' };
  // amplía la región a bloques vecinos con energía (consonantes oclusivas cortan la señal)
  let a = reg.a, b = reg.b; const thr = Math.max(reg.floor + 10, reg.peak - 32);
  const gapMax = Math.round(0.25 / HOP);
  for (let i = a - 1, miss = 0; i >= 0 && miss < gapMax; i--) { if (fr.e[i] > thr) { a = i; miss = 0; } else miss++; }
  for (let i = b, miss = 0; i < fr.n && miss < gapMax; i++) { if (fr.e[i] > thr) { b = i + 1; miss = 0; } else miss++; }
  const t0 = a * HOP, t1 = b * HOP + 0.02;
  const track = pitchTrack(x, opts.pitch);
  const path = viterbiPitch(track, t0, t1);
  const voiced = path.filter(p => !isNaN(p.v));
  if (voiced.length < 4) return { ok: false, reason: 'novoice' };
  // envolvente de energía suavizada a 10 ms (de las tramas del camino)
  const env = path.map(p => p.db);
  const sm = env.map((_, i) => mean(env.slice(Math.max(0, i - 2), i + 3)));
  // candidatos a frontera: tramas sordas (huecos) y valles de energía
  const cands = [];
  for (let i = 1; i < path.length - 1; i++) {
    const uv = isNaN(path[i].v);
    const isMin = sm[i] <= sm[i - 1] && sm[i] <= sm[i + 1];
    if (!uv && !isMin) continue;
    // profundidad del valle respecto a los máximos a izquierda y derecha (ventana 150 ms)
    const L = Math.max(...sm.slice(Math.max(0, i - 15), i + 1)), R = Math.max(...sm.slice(i, i + 16));
    let depth = Math.min(L, R) - sm[i];
    if (uv) depth += 6;
    cands.push({ i, t: path[i].t, depth });
  }
  // agrupa candidatos contiguos (un hueco sordo largo = una frontera)
  const groups = [];
  cands.forEach(c => { const g = groups[groups.length - 1]; if (g && c.i - g.end <= 1) { g.end = c.i; if (c.depth > g.best.depth) g.best = c; g.len++; } else groups.push({ start: c.i, end: c.i, best: c, len: 1 }); });
  groups.forEach(g => { g.score = g.best.depth + Math.min(10, g.len * 1.5); g.t = (path[g.start].t + path[g.end].t) / 2; });
  // excluye fronteras demasiado cerca de los extremos de la parte sonora
  const vt0 = voiced[0].t, vt1 = voiced[voiced.length - 1].t, minSyl = 0.07;
  let pool = groups.filter(g => g.t > vt0 + minSyl && g.t < vt1 - minSyl).sort((p, q) => q.score - p.score);
  const chosen = [];
  for (const g of pool) {
    if (chosen.length >= nSyl - 1) break;
    if (chosen.every(c => Math.abs(c.t - g.t) > minSyl)) chosen.push(g);
  }
  // si faltan fronteras, reparte el tiempo sonoro a partes iguales
  let cuts = chosen.map(c => c.t).sort((p, q) => p - q);
  if (cuts.length < nSyl - 1) { cuts = []; for (let k = 1; k < nSyl; k++) cuts.push(vt0 + (vt1 - vt0) * k / nSyl); }
  const edges = [t0, ...cuts, t1];
  const syls = [];
  for (let k = 0; k < nSyl; k++) {
    const seg = { t0: edges[k], t1: edges[k + 1] };
    const sub = voiced.filter(p => p.t > seg.t0 + 0.005 && p.t < seg.t1 - 0.005);
    // limpieza por saltos dentro de la sílaba: bloque más energético
    const blocks = []; let cur = [];
    sub.forEach((p, i) => { const q = sub[i - 1]; if (i && (p.t - q.t > 0.04 || Math.abs(p.v - q.v) > 3.5)) { blocks.push(cur); cur = []; } cur.push(p); });
    if (cur.length) blocks.push(cur);
    const en = bl => bl.reduce((s, p) => s + Math.pow(10, p.db / 10), 0);
    blocks.sort((p, q) => en(q) - en(p));
    seg.contour = blocks[0] || [];
    syls.push(seg);
  }
  return { ok: true, t0, t1, track, path, syls };
}

// ---------- modelos entrenados con grabaciones nativas ----------
let MODELS = {};
function softmaxLR(m, x) {
  const xn = x.map((v, i) => (isFinite(v) ? v : m.mu[i]) - m.mu[i]).map((v, i) => v / m.sd[i]);
  xn.push(1);
  const K = m.W[0].length, z = new Array(K).fill(0);
  for (let i = 0; i < xn.length; i++) for (let k = 0; k < K; k++) z[k] += xn[i] * m.W[i][k];
  const mx = Math.max(...z), e = z.map(v => Math.exp(v - mx)), s = e.reduce((p, q) => p + q, 0);
  return e.map(v => v / s);
}
function logisticLR(m, x) {
  const xn = x.map((v, i) => ((isFinite(v) ? v : m.mu[i]) - m.mu[i]) / m.sd[i]); xn.push(1);
  let z = 0; for (let i = 0; i < xn.length; i++) z += xn[i] * m.w[i];
  return 1 / (1 + Math.exp(-z));
}
function toneFeatureVec(s, L, dur) {
  const seg = s.slice(1), Ls = L.slice(1);
  const mn = Math.min(...seg), mx = Math.max(...seg);
  const imin = seg.indexOf(mn) / (seg.length - 1), imax = seg.indexOf(mx) / (seg.length - 1);
  const first = Math.max(...s.slice(1, 5)), end = (s[8] + s[9]) / 2, start = (s[1] + s[2]) / 2;
  return [end - start, first - end, end - mn, mx - mn, imin, imax, mean(Ls), Math.min(...Ls), (L[1] + L[2]) / 2, (L[8] + L[9]) / 2,
    s[5] - s[1], s[9] - s[5], Math.min(dur, 0.6)];
}
// Clasifica el tono de un contorno (puntos {t, v}) dado el rango de la voz
function toneOf(contour, range, opts = {}) {
  if (!contour || contour.length < 4) return null;
  const s = resampleContour(contour, 10), L = toLevels(s, range);
  const dur = contour[contour.length - 1].t - contour[0].t;
  const f = toneFeatures(L);
  let probs;
  if (MODELS.tone) probs = softmaxLR(MODELS.tone, toneFeatureVec(s, L, dur));
  else { const r = classifyTone(L); probs = [1, 2, 3, 4].map(k => Math.exp(-r.scores[k] * 3)); const z = probs.reduce((p, q) => p + q); probs = probs.map(p => p / z); }
  // en palabras, un tercer tono bajo sin subida final (medio tercer tono) cuenta como tercero
  if (opts.context && f.avg < 2.3 && f.mn < 1.9 && (f.start - f.end) < 2) { probs[2] = Math.max(probs[2], 0.7); const z = probs.reduce((p, q) => p + q); probs = probs.map(p => p / z); }
  let tone = 1; probs.forEach((p, k) => { if (p > probs[tone - 1]) tone = k + 1; });
  // medio tercer tono (21) frente a cuarto tono (51): el cuarto empieza arriba y cae mucho
  const drop = s[1] - s[9];
  if (opts.context && tone === 4 && drop < 5.5 && f.start < 4.3) { tone = 3; probs = [probs[0], probs[1], Math.max(probs[2], probs[3]), Math.min(probs[2], probs[3])]; }
  return { tone, probs, drop, s, L, f, dur, semis: { start: s[1], end: s[9], min: Math.min(...s.slice(1)), max: Math.max(...s.slice(1)) } };
}
function retroflexProb(fric) {
  if (!fric || !MODELS.retro) return NaN;
  return logisticLR(MODELS.retro, [fric.low, fric.mid, fric.high, fric.centroid / 1000, fric.peak / 1000]);
}

const API = { analyzeWord, toneOf, retroflexProb, softmaxLR, logisticLR, toneFeatureVec, setModels(m) { MODELS = m; }, get MODELS() { return MODELS; }, SR, resample, frames, speechRegion, pitchTrack, viterbiPitch, cleanContour, resampleContour, toLevels, toneFeatures, classifyTone,
  noiseSpectrum, spectralFeatures, formantTrack, analyzeSyllable, vowelFormants, median, pct, mean, st, hz,
  setTemplates(t) { TEMPLATES = t; }, get TEMPLATES() { return TEMPLATES; } };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PYE = API;
})(typeof self !== 'undefined' ? self : this);
