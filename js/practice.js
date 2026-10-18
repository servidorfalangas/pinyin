/* Pestaña Practicar: repaso, puntos débiles, parejas de tonos, escucha, dictado, shadowing y tutor */
(function () {
'use strict';
const U = window.UI, C = window.Content, E = window.PYE;
const { $, $$, esc, shuffle, pick, css, I, toneIcon } = U;

// ---------- utilidades ----------
const COMMON = ['ma', 'ba', 'yi', 'wu', 'da', 'tang', 'fei', 'shi', 'mai', 'hao', 'qi', 'you', 'mi', 'tu', 'li', 'xian', 'zhu', 'ge', 'chu', 'lan', 'wen', 'ying', 'jiao', 'dong']
  .filter(b => [1, 2, 3, 4].every(t => Core.hasSyl(b + t)));
const pct = v => v == null ? '–' : Math.round(v * 100) + ' %';
const rateColor = v => v == null ? 'var(--line)' : v >= 0.8 ? 'var(--jade)' : v >= 0.5 ? 'var(--amber)' : 'var(--cinnabar)';
const rateBg = v => v == null ? 'var(--surface)' : v >= 0.8 ? 'var(--jade-soft)' : v >= 0.5 ? 'var(--amber-soft)' : 'var(--cinnabar-soft)';
const patLabel = p => p.split('-').map(t => t === '5' ? 'neutro' : t).join(' + ');
const patIcons = p => p.split('-').map(t => toneIcon(+t, true)).join('');
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
function combine(...keys) { const rs = keys.map(k => Core.fine.rate(k)).filter(v => v != null); return avg(rs); }
function needCal(fn) { if (!Core.calibration()) { U.toast('Primero calibra tu voz: son 30 segundos'); U.openCalibration(fn); return true; } return false; }

// ---------- preguntas de escucha ----------
const Q = {};
Q.tone = (t) => {
  t = t || pick([1, 2, 3, 4]);
  const base = pick(COMMON);
  return { type: 'listen', cat: 'tone', stat: 'L:tone:' + t, play: { syl: base + t }, prompt: '¿Qué tono has oído?',
    options: [1, 2, 3, 4].map(x => ({ value: x, label: 'tono ' + x, html: toneIcon(x, false, true) + '<span class="sm">' + esc(C.TONES[x].shape) + '</span>' })), answer: t,
    compare: [1, 2, 3, 4].map(x => base + x) };
};
const DISTRACT = { 1: [4, 2], 2: [3, 1], 3: [2, 4], 4: [1, 3], 5: [1, 4] };
Q.pair = (pat) => {
  let pool = Core.pairs.filter(w => w.audio);
  if (pat) { const f = pool.filter(w => w.spoken.join('-') === pat); if (f.length) pool = f; }
  const w = pick(pool), ans = w.spoken.join('-');
  const opts = new Set([ans]);
  const [a, b] = w.spoken;
  [[DISTRACT[a][0], b], [a, DISTRACT[b][0]], [DISTRACT[a][1], DISTRACT[b][1]], [b === 5 ? a : b, a]].forEach(([x, y]) => { if (opts.size < 4 && x !== 5) opts.add(x + '-' + y); });
  while (opts.size < 4) opts.add((1 + Math.floor(Math.random() * 4)) + '-' + (1 + Math.floor(Math.random() * 5)));
  const note = w.tones.join('-') !== ans ? 'Se escribe ' + esc(Core.markWord(w.p)) + ' (' + patLabel(w.tones.join('-')) + '), pero se dice ' + patLabel(ans) + ' por el cambio de tono.' : esc(w.h) + ' · ' + esc(Core.markWord(w.p)) + ' · ' + esc(w.es);
  return { type: 'listen', cat: 'pair', stat: 'L:pair:' + ans, play: { word: w }, prompt: '¿Qué tonos tiene esta palabra?',
    options: shuffle([...opts]).map(p => ({ value: p, label: patLabel(p), html: '<span>' + patIcons(p) + '</span><span class="sm">' + patLabel(p) + '</span>' })), answer: ans, explain: note };
};
const INI_PAIRS = [['b', 'p'], ['d', 't'], ['g', 'k'], ['z', 'c'], ['zh', 'ch'], ['j', 'q'], ['z', 'zh'], ['c', 'ch'], ['s', 'sh'], ['j', 'zh'], ['q', 'ch'], ['x', 'sh'], ['x', 's'], ['l', 'r'], ['f', 'h'], ['n', 'l']];
const FIN_PAIRS = [['an', 'ang'], ['en', 'eng'], ['in', 'ing'], ['ian', 'iang'], ['uan', 'uang'], ['u', 'v'], ['uen', 'ueng'], ['ie', 've'], ['e', 'o'], ['ou', 'uo']];
function sylsFor(ini, fin) { const s = C.spell(ini, fin); return s && [1, 2, 3, 4].some(t => Core.hasSyl(s + t)) ? s : null; }
Q.ini = (pair) => {
  pair = pair || pick(INI_PAIRS);
  const [a, b] = pair;
  const fins = C.TABLE_FIN.filter(f => sylsFor(a, f) && sylsFor(b, f) && !(f === 'i' && ('jqx'.includes(a) !== 'jqx'.includes(b))));
  let sa, sb;
  if (fins.length) { const f = pick(fins); sa = C.spell(a, f); sb = C.spell(b, f); }
  else { const fa = pick(C.TABLE_FIN.filter(f => sylsFor(a, f))), fb = C.TABLE_FIN.find(f => sylsFor(b, f) && (f === fa || f.replace(/^v/, 'u') === fa.replace(/^v/, 'u') || true)); sa = C.spell(a, fa); sb = C.spell(b, fb); }
  const pr = U.pairWithTone(sa, sb); if (!pr) return Q.tone();
  const ans = pick(pr);
  const ia = C.INI[a] ? C.INI[a].how : '', ib = C.INI[b] ? C.INI[b].how : '';
  return { type: 'listen', cat: 'cons', stat: 'L:ini:' + [a, b].sort().join('/'), play: { syl: ans }, prompt: '¿Cuál has oído?',
    options: pr.map(s => ({ value: s, label: Core.mark(s), html: '<span class="big">' + esc(Core.mark(s)) + '</span>' })), answer: ans, compare: pr,
    explain: '<b>' + esc(a) + '</b>: ' + esc(ia) + '<br><b>' + esc(b) + '</b>: ' + esc(ib) };
};
Q.fin = (pair) => {
  pair = pair || pick(FIN_PAIRS);
  const [a, b] = pair;
  const inis = C.TABLE_INI.filter(i => sylsFor(i, a) && sylsFor(i, b));
  if (!inis.length) return Q.fin(pick(FIN_PAIRS.slice(0, 6)));
  const i = pick(inis), pr = U.pairWithTone(C.spell(i, a), C.spell(i, b));
  if (!pr) return Q.tone();
  const ans = pick(pr);
  const ha = C.FIN[a] ? C.FIN[a].how : '', hb = C.FIN[b] ? C.FIN[b].how : '';
  return { type: 'listen', cat: 'vow', stat: 'L:fin:' + [a, b].sort().join('/'), play: { syl: ans }, prompt: '¿Cuál has oído?',
    options: pr.map(s => ({ value: s, label: Core.mark(s), html: '<span class="big">' + esc(Core.mark(s)) + '</span>' })), answer: ans, compare: pr,
    explain: '<b>' + esc(C.display(a)) + '</b>: ' + esc(ha) + '<br><b>' + esc(C.display(b)) + '</b>: ' + esc(hb) };
};
Q.word = () => {
  const pool = Core.words.filter(w => w.audio).concat(Core.pairs);
  const w = pick(pool);
  const others = shuffle(pool.filter(x => x.es !== w.es)).slice(0, 3);
  return { type: 'listen', cat: 'word', stat: 'L:word', play: { word: w }, prompt: '¿Qué significa?', one: true,
    options: shuffle([w, ...others]).map(x => ({ value: x.id, label: x.es, html: '<span>' + esc(x.es) + '</span>' })), answer: w.id,
    explain: esc(w.h) + ' · ' + esc(Core.markWord(w.p)) };
};
Q.sent = () => {
  const s = pick(Core.sentences.filter(x => x.sAudio));
  const others = shuffle(Core.sentences.filter(x => x !== s)).slice(0, 3);
  return { type: 'listen', cat: 'sent', stat: 'L:sent', play: { sent: s }, prompt: '¿Qué quiere decir la frase?', one: true,
    options: shuffle([s, ...others]).map(x => ({ value: x.id, label: x.es, html: '<span>' + esc(x.es) + '</span>' })), answer: s.id,
    explain: '<span class="han" style="font-size:1.2rem">' + esc(s.h) + '</span><br>' + esc(Core.markWord(s.p)) };
};
const CATS = { tone: 'Tonos', pair: 'Parejas de tonos', cons: 'Consonantes', vow: 'Vocales y nasales', word: 'Palabras', sent: 'Frases' };

// ---------- dictado ----------
function answerOf(w) { return w.syls.map((s, i) => { const base = s.replace(/\d$/, ''), t = +s.slice(-1); const sp = w.spoken[i]; return { base, tone: t, alt: sp !== t ? [sp] : [] }; }); }
const D = {};
D.syl = () => { const base = pick(Core.sylBases.filter(b => !/^(_|hm|hng|ng$|m$|n$|ê)/.test(b) && b.length > 1)); const syl = U.sylWithTone(base); return { type: 'dictate', cat: 'dict', play: { syl }, answer: [{ base: syl.slice(0, -1), tone: +syl.slice(-1) }] }; };
D.pair = () => { const w = pick(Core.pairs); return { type: 'dictate', cat: 'dict', play: { word: w }, answer: answerOf(w), show: w, hint: 'Escribe los tonos como se escriben en el diccionario (se aceptan también los cambios de tono).' }; };
D.word = () => { const w = pick(Core.words.filter(x => x.audio)); return { type: 'dictate', cat: 'dict', play: { word: w }, answer: answerOf(w), show: w }; };
D.sent = () => { const s = pick(Core.sentences.filter(x => x.sAudio)); return { type: 'dictate', cat: 'dict', play: { sent: s }, answer: answerOf(s), show: s, prompt: 'Escribe la frase en pinyin' }; };

// ---------- puntos débiles ----------
const VOWEL_NAMES = { v: 'la ü', ve: 'üe', van: 'üan', vn: 'ün', e: 'la e china', 'i-apical': 'la "i" de zi/ci/si', 'i-retro': 'la "i" de zhi/chi/shi', er: 'er' };
function weakLabel(k) {
  const [kind, what, x] = k.split(':');
  const disp = s => C.display(s || '');
  if (kind === 'S') {
    if (what === 'tone') return 'Decir el tono ' + x;
    if (what === 'pair') return 'Decir la pareja ' + x[0] + ' + ' + (x[1] === '5' ? 'neutro' : x[1]);
    if (what === 'asp') return 'El aire en la ' + x;
    if (what === 'retro') return 'La lengua en la ' + x;
    if (what === 'vowel') return 'Pronunciar ' + (VOWEL_NAMES[x] || disp(x));
    if (what === 'nasal') return 'La final -' + disp(x).replace(/^[iu]/, m => m);
    if (what === 'sent') return 'Melodía de las frases';
  }
  if (kind === 'L') {
    if (what === 'tone') return 'Oír el tono ' + x;
    if (what === 'pair') return 'Oír la pareja ' + patLabel(x);
    if (what === 'ini') return 'Distinguir ' + x.split('/').join(' y ');
    if (what === 'fin') return 'Distinguir ' + x.split('/').map(disp).join(' y ');
    if (what === 'word') return 'Entender palabras';
    if (what === 'sent') return 'Entender frases';
  }
  if (kind === 'D') {
    if (what === 'tone') return 'Escribir el tono ' + x;
    if (what === 'ini') return 'Escribir la ' + x;
    if (what === 'fin') return 'Escribir -' + disp(x.replace('i-apical', 'i').replace('i-retro', 'i'));
  }
  return k;
}
function weakList() {
  const f = Core.fine.all();
  return Object.keys(f).filter(k => !k.startsWith('syl:') && (f[k].rec || []).length >= 3).map(k => ({ k, r: Core.fine.rate(k), n: f[k].n }))
    .filter(o => o.r < 0.8).sort((a, b) => a.r - b.r || b.n - a.n);
}
function sylsWithIni(ini, n) { const out = []; const fins = shuffle(C.TABLE_FIN.filter(f => sylsFor(ini, f))); for (const f of fins) { const s = U.sylWithTone(C.spell(ini, f)); if (s) out.push(s); if (out.length >= n) break; } return out; }
function sylsWithFin(canon, n) {
  if (canon === 'i-apical') return shuffle(['zi4', 'ci2', 'si1', 'zi3', 'ci4', 'si4']).slice(0, n);
  if (canon === 'i-retro') return shuffle(['zhi1', 'chi1', 'shi4', 'ri4', 'zhi3', 'shi2']).slice(0, n);
  const out = []; for (const i of shuffle(C.TABLE_INI)) { const sp = sylsFor(i, canon); if (sp) { const s = U.sylWithTone(sp); if (s) out.push(s); } if (out.length >= n) break; } return out;
}
function stepsForWeak(k) {
  const [kind, what, x] = k.split(':');
  const speakS = (syls, focus) => syls.map(s => ({ type: 'speak', target: U.sylTarget(s, focus) }));
  if (kind === 'S' && what === 'tone') return speakS(COMMON.slice().sort(() => Math.random() - .5).slice(0, 3).map(b => b + x), ['tone']);
  if (kind === 'S' && what === 'pair') return shuffle(Core.pairs.filter(w => w.pair === x)).slice(0, 3).map(w => ({ type: 'speak', target: U.wordTarget(w) }));
  if (kind === 'S' && what === 'asp') { const p = INI_PAIRS.find(pp => pp.includes(x) && ['b', 'd', 'g', 'z', 'zh', 'j'].includes(pp[0]) && ['p', 't', 'k', 'c', 'ch', 'q'].includes(pp[1])); return [p ? Q.ini(p) : Q.tone()].concat(speakS(sylsWithIni(x, 3), ['asp'])); }
  if (kind === 'S' && what === 'retro') { const p = INI_PAIRS.find(pp => pp.includes(x) && (pp.includes('zh') || pp.includes('ch') || pp.includes('sh'))); return [p ? Q.ini(p) : Q.tone()].concat(speakS(sylsWithIni(x, 3), ['retro'])); }
  if (kind === 'S' && what === 'vowel') return speakS(sylsWithFin(x, 3), ['vowel']);
  if (kind === 'S' && what === 'nasal') { const p = FIN_PAIRS.find(pp => pp.includes(x)); return (p ? [Q.fin(p)] : []).concat(speakS(sylsWithFin(x, 3), ['nasal'])); }
  if (kind === 'S' && what === 'sent') return [];
  if (kind === 'L' && what === 'tone') return [Q.tone(+x), Q.tone(+x), Q.tone()];
  if (kind === 'L' && what === 'pair') return [Q.pair(x), Q.pair(x), Q.pair()];
  if (kind === 'L' && what === 'ini') { const p = x.split('/'); return [Q.ini(p), Q.ini(p), Q.ini(p)]; }
  if (kind === 'L' && what === 'fin') { const p = x.split('/'); return [Q.fin(p), Q.fin(p), Q.fin(p)]; }
  if (kind === 'L' && what === 'word') return [Q.word(), Q.word(), Q.word()];
  if (kind === 'L' && what === 'sent') return [Q.sent(), Q.sent()];
  if (kind === 'D' && what === 'tone') return [1, 2, 3].map(() => { const syl = pick(COMMON) + x; return { type: 'dictate', cat: 'dict', play: { syl }, answer: [{ base: syl.slice(0, -1), tone: +x }] }; });
  if (kind === 'D' && what === 'ini') return sylsWithIni(x, 3).map(syl => ({ type: 'dictate', cat: 'dict', play: { syl }, answer: [{ base: syl.slice(0, -1), tone: +syl.slice(-1) }] }));
  if (kind === 'D' && what === 'fin') return sylsWithFin(x, 3).map(syl => ({ type: 'dictate', cat: 'dict', play: { syl }, answer: [{ base: syl.slice(0, -1), tone: +syl.slice(-1) }] }));
  return [];
}
function startWeak() {
  const w = weakList().slice(0, 4);
  if (!w.length) return;
  let steps = []; w.forEach(o => { steps = steps.concat(stepsForWeak(o.k)); });
  if (steps.some(s => s.type === 'speak') && needCal(startWeak)) return;
  U.runSession({ title: 'Puntos débiles', steps });
}
function openWeak() {
  const w = weakList();
  if (!w.length) {
    U.openSheet('Tus puntos débiles', '<p>Todavía no tengo suficientes datos para saber qué te cuesta más.</p><p class="muted">Haz el test de escucha o algunas lecciones y aquí aparecerá lo que más fallas, con un botón para practicarlo.</p><div class="row-btns"><button class="btn primary" data-close data-go-test>Hacer el test de escucha</button></div>');
    $('#sheetRoot [data-go-test]').addEventListener('click', () => { U.closeSheet(); startTest(); });
    return;
  }
  const rows = w.slice(0, 10).map(o => '<div class="hbar"><span>' + esc(weakLabel(o.k)) + '</span><div class="track"><i style="width:' + Math.round(o.r * 100) + '%;background:' + rateColor(o.r) + '"></i></div><span class="n">' + pct(o.r) + '</span></div>').join('');
  U.openSheet('Tus puntos débiles', '<p class="muted">Lo que peor te sale últimamente (cuentan tus 10 últimos intentos de cada cosa). La práctica mezcla escuchar y hablar sobre los 4 primeros.</p><div class="bars weak-bars">' + rows + '</div><div class="row-btns"><button class="btn primary" data-weak-go>Practicar mis puntos débiles</button></div>');
  $('#sheetRoot [data-weak-go]').addEventListener('click', () => { U.closeSheet(); startWeak(); });
}

// ---------- test de escucha ----------
function startTest() {
  const plan = [['tone', 4], ['pair', 4], ['cons', 4], ['vow', 3], ['word', 3], ['sent', 2]];
  let steps = [];
  plan.forEach(([c, n]) => { for (let i = 0; i < n; i++) steps.push(Q[{ tone: 'tone', pair: 'pair', cons: 'ini', vow: 'fin', word: 'word', sent: 'sent' }[c]]()); });
  // intercala categorías
  const byCat = {}; steps.forEach(s => (byCat[s.cat] = byCat[s.cat] || []).push(s));
  const mixed = []; let left = true;
  while (left) { left = false; Object.keys(byCat).forEach(k => { const s = byCat[k].shift(); if (s) { mixed.push(s); left = true; } }); }
  U.runSession({ title: 'Test de escucha', steps: mixed, onFinish: (sess, score) => {
    const cats = {}; sess.log.forEach(l => { (cats[l.cat] = cats[l.cat] || []).push(l.v); });
    const res = {}; Object.keys(cats).forEach(k => res[k] = avg(cats[k]));
    const p = U.prog(); p.tests = (p.tests || []).concat([{ at: Date.now(), score, cats: res }]).slice(-30); U.saveProg();
    const worst = Object.keys(res).sort((a, b) => res[a] - res[b])[0];
    return '<div class="panel" style="width:100%;text-align:left"><h3>Por partes</h3><div class="bars">' + Object.keys(CATS).filter(k => res[k] != null).map(k => '<div class="hbar"><span>' + CATS[k] + '</span><div class="track"><i style="width:' + Math.round(res[k] * 100) + '%;background:' + rateColor(res[k]) + '"></i></div><span class="n">' + pct(res[k]) + '</span></div>').join('') + '</div>' +
      (res[worst] < 0.8 ? '<p class="muted">Lo que más te cuesta: <b>' + CATS[worst] + '</b>. En "Entrenar el oído" puedes practicarlo solo.</p>' : '') + historyChart(p.tests) + '</div>';
  } });
}
function historyChart(tests) {
  if (!tests || tests.length < 2) return '<p class="muted">Repite el test cada pocos días para ver cómo mejoras.</p>';
  const t = tests.slice(-10), W = 300, H = 90, x0 = 26, x1 = W - 8, yOf = v => 8 + (1 - v) * (H - 24);
  const pts = t.map((r, i) => [x0 + (x1 - x0) * i / (t.length - 1), yOf(r.score)]);
  let g = '';
  [0, 0.5, 1].forEach(v => { g += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + yOf(v) + '" y2="' + yOf(v) + '" class="tc-grid"/><text x="' + (x0 - 4) + '" y="' + (yOf(v) + 3) + '" class="tc-num" style="font-size:9px">' + (v * 100) + '</text>'; });
  g += '<polyline points="' + pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ') + '" fill="none" stroke="var(--jade)" stroke-width="2.5" stroke-linejoin="round"/>';
  pts.forEach((p, i) => { g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (i === pts.length - 1 ? 4.5 : 3) + '" fill="var(--jade)"/>'; });
  g += '<text x="' + x0 + '" y="' + (H - 2) + '" class="tc-cap">Tus últimos ' + t.length + ' tests</text>';
  return '<svg class="hist" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución de tus resultados">' + g + '</svg>';
}
function openEar() {
  const p = U.prog(); const last = (p.tests || []).slice(-1)[0];
  const modes = [['tone', 'Tonos sueltos', '¿Qué tono es?'], ['pair', 'Parejas de tonos', 'Palabras de dos sílabas'], ['cons', 'Consonantes', 'b/p, z/zh, q/ch, x/sh…'], ['vow', 'Vocales y nasales', 'an/ang, ü/u, in/ing…'], ['word', 'Palabras', 'Oír y entender'], ['sent', 'Frases', 'Oír y entender'], ['mix', 'Todo mezclado', 'Un poco de cada']];
  U.openSheet('Entrenar el oído', '<p class="muted">Sesiones de 10 preguntas. Si fallas, puedes oír las opciones una detrás de otra para notar la diferencia.</p>' +
    '<div class="ear-modes">' + modes.map(([k, t, d]) => { const v = last && last.cats ? last.cats[k] : null; return '<button class="ear-btn" data-ear="' + k + '"><b>' + t + '</b><span class="muted">' + d + '</span>' + (v != null ? '<span class="pill" style="background:' + rateBg(v) + '">' + pct(v) + '</span>' : '') + '</button>'; }).join('') + '</div>');
  $('#sheetRoot').querySelector('.ear-modes').addEventListener('click', e => {
    const b = e.target.closest('[data-ear]'); if (!b) return;
    const k = b.dataset.ear, map = { tone: 'tone', pair: 'pair', cons: 'ini', vow: 'fin', word: 'word', sent: 'sent' };
    const steps = []; for (let i = 0; i < 10; i++) steps.push(k === 'mix' ? Q[pick(Object.values(map))]() : Q[map[k]]());
    U.closeSheet(); U.runSession({ title: 'Oído', steps });
  });
}
function openDict() {
  const modes = [['syl', 'Sílabas sueltas', 'Una sílaba con su tono'], ['pair', 'Parejas de tonos', 'Palabras de dos sílabas'], ['word', 'Palabras', 'Vocabulario de la app'], ['sent', 'Frases', 'Frases cortas enteras']];
  U.openSheet('Dictado', '<p class="muted">Oyes y escribes en pinyin con el número del tono (ma3, ni3 hao3). Te digo si fallaste la inicial, la final o el tono.</p><div class="ear-modes">' + modes.map(([k, t, d]) => '<button class="ear-btn" data-dict="' + k + '"><b>' + t + '</b><span class="muted">' + d + '</span></button>').join('') + '</div>');
  $('#sheetRoot').querySelector('.ear-modes').addEventListener('click', e => {
    const b = e.target.closest('[data-dict]'); if (!b) return;
    const k = b.dataset.dict, n = k === 'sent' ? 5 : 10;
    const steps = []; for (let i = 0; i < n; i++) steps.push(D[k]());
    U.closeSheet(); U.runSession({ title: 'Dictado', steps });
  });
}

// ---------- parejas de tonos ----------
function pairRate(key) {
  const spokenPats = [...new Set(Core.pairs.filter(w => w.pair === key).map(w => w.spoken.join('-')))];
  return combine('S:pair:' + key, ...spokenPats.map(p => 'L:pair:' + p));
}
function openPairs() {
  const ov = U.openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Cerrar">' + I.close + '</button><b style="flex:1">Parejas de tonos</b></div><div class="ex-body pairs-body"></div>');
  $('[data-x]', ov).addEventListener('click', () => { U.closeOverlay(); U.renderCurrent(); });
  const body = $('.pairs-body', ov);
  const render = () => {
    let g = '<p class="muted">En chino casi todas las palabras tienen dos sílabas, así que lo que de verdad hay que dominar son estas 20 combinaciones. Toca una casilla para oír palabras y practicarlas. El color es cómo te sale (oír + decir).</p>';
    g += '<div class="pairgrid"><div class="pg-corner">1.ª ↓ · 2.ª →</div>' + [1, 2, 3, 4, 5].map(b => '<div class="pg-h">' + (b === 5 ? 'neutro' : b) + '</div>').join('');
    [1, 2, 3, 4].forEach(a => {
      g += '<div class="pg-h">' + a + '</div>';
      [1, 2, 3, 4, 5].forEach(b => { const k = '' + a + b, r = pairRate(k); g += '<button class="pg-cell" data-pk="' + k + '" style="background:' + rateBg(r) + '"><span>' + toneIcon(a, true) + toneIcon(b, true) + '</span><small>' + (r == null ? '' : pct(r)) + '</small></button>'; });
    });
    g += '</div><div class="row-btns"><button class="btn primary" data-pq>Test de oído de parejas</button><button class="btn" data-pw>Practicar las peores</button></div>';
    g += '<div class="note"><b>Ojo con 3 + 3:</b> se dice 2 + 3 (nǐ hǎo suena "ní hǎo"). Y el tono 3 delante de otro tono se queda abajo, sin volver a subir.</div>';
    body.innerHTML = g;
  };
  render();
  body.addEventListener('click', e => {
    const c = e.target.closest('[data-pk]'); if (c) return openPairCell(c.dataset.pk, render);
    if (e.target.closest('[data-pq]')) { const steps = []; for (let i = 0; i < 10; i++) steps.push(Q.pair()); U.runSession({ title: 'Parejas', steps }); return; }
    if (e.target.closest('[data-pw]')) {
      if (needCal(openPairs)) return;
      const ranked = Core.PAIR_KEYS.map(k => ({ k, r: pairRate(k) })).sort((x, y) => (x.r == null ? 0.6 : x.r) - (y.r == null ? 0.6 : y.r)).slice(0, 3);
      let steps = []; ranked.forEach(o => { const ws = shuffle(Core.pairs.filter(w => w.pair === o.k)); steps.push(Q.pair(ws[0].spoken.join('-'))); ws.slice(0, 3).forEach(w => steps.push({ type: 'speak', target: U.wordTarget(w) })); });
      U.runSession({ title: 'Parejas', steps });
    }
  });
}
function openPairCell(k, rerender) {
  const ws = Core.pairs.filter(w => w.pair === k);
  const a = +k[0], b = +k[1];
  const spokenDiff = k === '33';
  const back = U.openSheet('Tono ' + a + ' + ' + (b === 5 ? 'neutro' : 'tono ' + b), U.toneChart(spokenDiff ? [2, 3] : b === 5 ? [a] : [a, b]) +
    (spokenDiff ? '<div class="note">Se escribe 3 + 3 pero se dice <b>2 + 3</b>.</div>' : '') + (b === 5 ? '<p class="muted">La segunda sílaba es corta y flojita. Tras un tono 3 queda algo más alta; tras los demás, más baja.</p>' : '') +
    '<div class="wlist pair-words">' + ws.map(w => '<button class="wrow" data-pw="' + esc(w.h) + '"><span class="h">' + esc(w.h) + '</span><span><span class="p">' + esc(Core.markWord(w.p)) + '</span><br><span class="e">' + esc(w.es) + '</span></span><span>' + I.play.replace('<svg', '<svg width="18" height="18"') + '</span></button>').join('') + '</div>' +
    '<div class="row-btns"><button class="btn primary" data-pgo>Practicar esta pareja</button></div>');
  back.addEventListener('click', e => {
    const r = e.target.closest('[data-pw]'); if (r) { const w = ws.find(x => x.h === r.dataset.pw); Core.playWord(w); return; }
    if (e.target.closest('[data-pgo]')) {
      U.closeSheet();
      if (needCal(() => openPairCell(k, rerender))) return;
      const sel = shuffle(ws);
      const steps = [Q.pair(sel[0].spoken.join('-')), Q.pair()].concat(sel.slice(0, 4).map(w => ({ type: 'speak', target: U.wordTarget(w) })));
      U.runSession({ title: 'Pareja ' + k, steps });
    }
  });
}

// ---------- shadowing ----------
function openShadowList() {
  const ov = U.openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Cerrar">' + I.close + '</button><b style="flex:1">Shadowing con frases</b></div><div class="ex-body sh-list"></div>');
  $('[data-x]', ov).addEventListener('click', () => { U.closeOverlay(); U.renderCurrent(); });
  const p = U.prog(); p.sent = p.sent || {};
  const body = $('.sh-list', ov);
  let html = '<p class="muted">Escucha la frase y repítela imitando su melodía, o dila a la vez que el audio (con auriculares). Te comparo la curva de tono de toda la frase y el ritmo.</p>';
  [1, 2].forEach(lv => {
    html += '<h3>' + (lv === 1 ? 'Nivel 1 · frases muy cortas' : 'Nivel 2 · un poco más largas') + '</h3><div class="wlist sent-list">';
    Core.sentences.filter(s => s.level === lv).forEach(s => { const b = p.sent[s.id]; html += '<button class="srow" data-sid="' + s.id + '"><span class="h han">' + esc(s.h) + '</span><span class="e">' + esc(s.es) + '</span><span class="pill" style="background:' + rateBg(b == null ? null : b) + '">' + (b == null ? 'nueva' : pct(b)) + '</span></button>'; });
    html += '</div>';
  });
  body.innerHTML = html;
  body.addEventListener('click', e => { const r = e.target.closest('[data-sid]'); if (r) { if (needCal(openShadowList)) return; openShadow(Core.sentences.find(s => s.id === r.dataset.sid)); } });
}
function sentChips(s) {
  const chars = Array.from(s.h).filter(c => /[一-鿿]/.test(c));
  // 儿 de erhua va pegado a la sílaba anterior
  const out = []; let ci = 0;
  s.syls.forEach((sy, i) => {
    const er = /r\d$/.test(sy) && sy.length > 3; let hz = chars[ci++] || ''; if (er && chars[ci] === '儿') hz += chars[ci++];
    const base = sy.replace(/\d$/, ''), t = s.tones[i], spT = s.spoken[i];
    out.push('<span class="sc t' + spT + '"><span class="han">' + esc(hz) + '</span><small>' + esc(Core.mark(base + t)) + '</small>' + (spT !== t && t !== 5 ? '<em>→ ' + esc(Core.mark(base + spT)) + '</em>' : '') + '</span>');
  });
  return '<div class="sentchips">' + out.join('') + '</div>';
}
function plotBroken(g, pts, x0, x1, yOf, color, width) {
  if (!pts || pts.length < 2) return;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach((p, i) => { const x = x0 + (x1 - x0) * (p.t - t0) / Math.max(1e-3, t1 - t0), y = yOf(p.L); if (i && p.t - pts[i - 1].t < 0.06) g.lineTo(x, y); else g.moveTo(x, y); });
  g.stroke();
}
function openShadow(s) {
  const ov = U.openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Volver">' + I.close + '</button><b style="flex:1">Shadowing</b></div><div class="ex-body sh-body"></div><div class="ex-foot"><button class="btn" data-prev>Anterior</button><button class="btn primary" data-next>Siguiente frase</button></div>');
  $('[data-x]', ov).addEventListener('click', () => openShadowList());
  const body = $('.sh-body', ov);
  body.innerHTML = '<div class="target"><div class="eyebrow">Imita la melodía</div>' + sentChips(s) + '<div class="gloss" style="font-size:1.05rem">' + esc(s.es) + '</div></div>' +
    '<div class="listen-row"><button class="play-btn big" data-a="play">' + I.play + 'Escuchar</button><button class="play-btn" data-a="slow">' + I.slow + 'Lento</button></div>' +
    '<div class="sh-modes"><div class="mic-zone"><button class="mic" data-a="rec" aria-label="Grabar después">' + I.mic + '</button><div class="mic-hint">Repetir después</div></div>' +
    '<div class="mic-zone"><button class="mic mic-alt" data-a="sync" aria-label="Decirla a la vez">' + I.mic + '</button><div class="mic-hint">A la vez<br>(con auriculares)</div></div></div>' +
    '<div class="res-host"></div><p class="muted" style="text-align:center">Audio de referencia con voz sintética de calidad (no hay grabaciones nativas libres de frases).</p>';
  const resHost = $('.res-host', body);
  const st = { last: null, rec: null };
  const play = rate => Core.playSentence(s, { rate });
  setTimeout(() => play(), 350);
  const idx = Core.sentences.indexOf(s);
  $('[data-next]', ov).addEventListener('click', () => openShadow(Core.sentences[(idx + 1) % Core.sentences.length]));
  $('[data-prev]', ov).addEventListener('click', () => openShadow(Core.sentences[(idx - 1 + Core.sentences.length) % Core.sentences.length]));
  async function rec(sync) {
    if (st.rec) { st.rec.stop(); return; }
    resHost.innerHTML = '';
    try { await Core.openMic(); } catch (e) { resHost.innerHTML = U.micErrorHTML(); return; }
    const btn = $(sync ? '[data-a="sync"]' : '[data-a="rec"]', body);
    btn.classList.add('rec'); btn.innerHTML = I.stop;
    let dur = 3;
    const buf = await Core.bufferOf('s', s.id).catch(() => null); if (buf) dur = buf.duration;
    const r = await Core.record(sync ? { fixed: dur + 0.9, onLevel: db => btn.style.setProperty('--lvl', Math.max(2, Math.min(18, (db + 60) / 2.5)) + 'px') } : { maxSec: dur * 2.2 + 1.5, tail: 1.0, maxWait: 6, onLevel: db => btn.style.setProperty('--lvl', Math.max(2, Math.min(18, (db + 60) / 2.5)) + 'px') });
    st.rec = r;
    if (sync) setTimeout(() => play(), 150);
    const out = await r.done; st.rec = null;
    btn.classList.remove('rec'); btn.innerHTML = I.mic; btn.style.removeProperty('--lvl');
    st.last = out.x;
    resHost.innerHTML = '<p class="muted" style="text-align:center">Analizando…</p>';
    let res; try { res = await Core.evaluateSentence(out.x, s); } catch (e) { console.error(e); res = { heard: false, reason: 'No he podido analizar la grabación.' }; }
    if (!res.heard) { resHost.innerHTML = '<div class="note">' + esc(res.reason) + '</div>'; return; }
    show(res);
  }
  function show(res) {
    const sc = res.sim ? res.sim.score : null;
    const kind = sc == null ? 'unsure' : sc >= 0.65 ? 'ok' : sc >= 0.45 ? 'unsure' : 'bad';
    const big = { ok: 'Melodía muy parecida', unsure: 'Bastante parecida', bad: 'Melodía diferente' }[kind];
    let tips = [];
    const ratio = res.durR ? res.durU / res.durR : 1;
    if (ratio > 1.4) tips.push('Vas ' + Math.round((ratio - 1) * 100) + ' % más lento que el audio: intenta decirla de un tirón, sin pararte entre palabras.');
    else if (ratio < 0.7) tips.push('Vas bastante más rápido que el audio: no te comas las sílabas.');
    else tips.push('Buen ritmo: duración parecida a la del audio.');
    if (res.sim && res.sim.errs) {
      const e = res.sim.errs, n = e.length, third = Math.floor(n / 3);
      const parts = [avg(e.slice(0, third)), avg(e.slice(third, 2 * third)), avg(e.slice(2 * third))];
      const worst = parts.indexOf(Math.max(...parts));
      if (parts[worst] > 0.9) tips.push('Donde más te separas es ' + ['al principio', 'en el medio', 'al final'][worst] + ' de la frase. Escucha esa parte en lento.');
    }
    if (s.spoken.some((t, i) => t !== s.tones[i] && s.tones[i] !== 5)) tips.push('Recuerda los cambios de tono marcados con flecha.');
    resHost.innerHTML = '<div class="result"><div class="verdict ' + kind + '"><div class="mark">' + I[kind] + '</div><div><div class="big">' + big + '</div><div class="small">' + (sc == null ? '' : 'Parecido de melodía: ' + Math.round(sc * 100) + ' %') + '</div></div></div>' +
      '<canvas class="contour sent-contour"></canvas><div class="legend"><span><i style="background:var(--ref);height:6px"></i>Referencia</span><span><i style="background:var(--jade)"></i>Tú</span><span>Tiempo ajustado para que coincidan principio y final</span></div>' +
      '<div class="checks">' + tips.map(t => '<div class="check"><span class="pill unsure">Consejo</span><div class="msg">' + esc(t) + '</div></div>').join('') + '</div>' +
      '<div class="res-actions"><button class="btn small" data-a="me">' + I.play.replace('<svg', '<svg width="16" height="16"') + 'Tú</button><button class="btn small" data-a="play">' + I.play.replace('<svg', '<svg width="16" height="16"') + 'Referencia</button><button class="btn small" data-a="cmp">' + I.swap + 'Comparar</button>' + (Core.gemini.key() ? '<button class="btn small" data-a="gem">' + I.spark + 'Gemini</button>' : '') + '</div><div class="gem-host"></div></div>';
    const cv = $('canvas.sent-contour', resHost);
    const { g, w, h } = U.sizeCanvas(cv); const padL = 22, padT = 10, padB = 12;
    U.gridLevels(g, w, h, padL, padT, padB);
    const yOf = L => padT + (5 - Math.max(0.6, Math.min(5.4, L))) * (h - padT - padB) / 4;
    const off = res.sim ? res.sim.offset : 0;
    if (res.refL) plotBroken(g, res.refL, padL + 6, w - 10, yOf, css('--ref'), 6);
    plotBroken(g, res.userL.map(p => ({ t: p.t, L: p.L + off })), padL + 6, w - 10, yOf, css(kind === 'ok' ? '--jade' : kind === 'unsure' ? '--amber' : '--cinnabar'), 3);
    if (sc != null) { const p = U.prog(); p.sent = p.sent || {}; if (!(p.sent[s.id] >= sc)) p.sent[s.id] = sc; U.markDay(); U.saveProg(); Core.fine.add('S:sent', sc >= 0.65 ? 1 : sc >= 0.45 ? 0.5 : 0); }
  }
  body.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const act = a.dataset.a;
    if (act === 'play') play(); else if (act === 'slow') play(0.75);
    else if (act === 'rec') rec(false); else if (act === 'sync') rec(true);
    else if (act === 'me' && st.last) Core.playSamples(st.last);
    else if (act === 'cmp' && st.last) { await play(); await new Promise(r => setTimeout(r, 250)); Core.playSamples(st.last); }
    else if (act === 'gem' && st.last) {
      const gh = $('.gem-host', body); gh.innerHTML = '<div class="gemini muted">Preguntando a Gemini…</div>';
      try { const g = await Core.gemini.ask(st.last, { label: s.h + ' (' + Core.markWord(s.p) + ')' }); const row = (k, v) => v ? '<div><b>' + k + ':</b> ' + esc(v) + '</div>' : ''; gh.innerHTML = '<div class="gemini"><div class="eyebrow">Segunda opinión · Gemini</div>' + row('Oye', g.oigo) + row('Tonos', g.tonos) + row('Consonantes', g.consonantes) + row('Vocales', g.vocales) + row('Consejo', g.consejo) + '</div>'; }
      catch (err) { gh.innerHTML = '<div class="gemini note err">' + esc(err.message) + '</div>'; }
    }
  });
  U.addCleanup(() => { if (st.rec) st.rec.stop(); });
}

// ---------- tutor de conversación ----------
function openTutor() {
  const ov = U.openOverlay('<div class="ex-top"><button class="icon-btn" data-x aria-label="Cerrar">' + I.close + '</button><b style="flex:1">Conversación con Gemini</b></div><div class="ex-body chat-body"></div><div class="ex-foot chat-foot"></div>');
  $('[data-x]', ov).addEventListener('click', () => { U.closeOverlay(); U.renderCurrent(); });
  const body = $('.chat-body', ov), foot = $('.chat-foot', ov);
  if (!Core.gemini.key()) {
    body.innerHTML = '<div class="card"><h3>Necesitas una clave de Gemini</h3><p>El tutor usa Gemini para entenderte y contestarte. La clave es gratis:</p><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>Entra en <b>aistudio.google.com</b> con tu cuenta de Google.</li><li>Pulsa <b>Get API key</b> → <b>Create API key</b>.</li><li>Cópiala y pégala en <b>Ajustes</b> de esta app.</li></ol><p class="muted">Tu suscripción de estudiante es para la app de Gemini; esta clave es aparte, pero el uso gratuito sobra para practicar.</p></div>';
    foot.innerHTML = '<button class="btn primary" data-set>Ir a Ajustes</button>';
    foot.onclick = e => { if (e.target.closest('[data-set]')) { U.closeOverlay(); U.go('settings'); } };
    return;
  }
  const st = { scenario: Core.SCENARIOS[0], level: 1, history: [], busy: false, rec: null, showEs: true };
  const setup = () => {
    body.innerHTML = '<div class="card"><h3>¿De qué hablamos?</h3><p class="muted">Habla con tu voz (o escribe si no sabes decir algo). El tutor te contesta con frases cortas, te dice qué entendió y qué tonos o sonidos fallaste.</p><div class="ear-modes">' +
      Core.SCENARIOS.map(sc => '<button class="ear-btn' + (sc === st.scenario ? ' on' : '') + '" data-sc="' + sc.id + '"><b>' + esc(sc.name) + '</b><span class="muted">' + esc(sc.desc) + '</span></button>').join('') + '</div>' +
      '<div class="seg" role="group" aria-label="Nivel"><button data-lv="1" aria-pressed="' + (st.level === 1) + '">Nivel 1</button><button data-lv="2" aria-pressed="' + (st.level === 2) + '">Nivel 2</button></div></div>';
    foot.innerHTML = '<button class="btn primary" data-start>Empezar</button>';
    body.onclick = e => {
      const sc = e.target.closest('[data-sc]'); if (sc) { st.scenario = Core.SCENARIOS.find(x => x.id === sc.dataset.sc); setup(); return; }
      const lv = e.target.closest('[data-lv]'); if (lv) { st.level = +lv.dataset.lv; setup(); }
    };
    foot.onclick = e => { if (e.target.closest('[data-start]')) start(); };
  };
  const bubbleT = (m, i) => '<div class="bubble tutor"><div class="who">Lǎoshī</div><div class="han b-hz">' + esc(m.respuesta || '') + '</div><div class="b-py">' + esc(m.respuesta_pinyin || '') + '</div>' + (st.showEs ? '<div class="b-es">' + esc(m.respuesta_es || '') + '</div>' : '') +
    '<div class="b-act"><button class="link" data-say="' + i + '">' + I.play.replace('<svg', '<svg width="15" height="15"') + ' Escuchar</button></div></div>';
  const bubbleU = (m) => '<div class="bubble me"><div class="who">Tú</div>' + (m.oido ? '<div class="han b-hz">' + esc(m.oido) + '</div><div class="b-py">' + esc(m.oido_pinyin || '') + '</div>' : '<div class="b-py">' + esc(m.text || '') + '</div>') +
    (m.correcto ? '<div class="b-fix"><b>Mejor así:</b> <span class="han">' + esc(m.correcto) + '</span> · ' + esc(m.correcto_pinyin || '') + ' <button class="link" data-sayfix="' + esc(m.correcto) + '">' + I.play.replace('<svg', '<svg width="14" height="14"') + '</button></div>' : '') +
    (m.pronunciacion ? '<div class="b-note">' + esc(m.pronunciacion) + '</div>' : '') + (m.audio ? '<div class="b-act"><button class="link" data-me="' + m.idx + '">' + I.play.replace('<svg', '<svg width="15" height="15"') + ' Oírme</button></div>' : '') + '</div>';
  const render = (pending) => {
    body.innerHTML = '<div class="chat-top"><span class="pill">' + esc(st.scenario.name) + ' · nivel ' + st.level + '</span><button class="link" data-es>' + (st.showEs ? 'Ocultar traducción' : 'Ver traducción') + '</button></div><div class="chat">' +
      st.history.map((m, i) => m.role === 'model' ? bubbleT(m, i) : bubbleU(m)).join('') + (pending ? '<div class="bubble tutor typing">' + esc(pending) + '</div>' : '') + '</div>';
    body.scrollTop = body.scrollHeight;
    body.onclick = async e => {
      if (e.target.closest('[data-es]')) { st.showEs = !st.showEs; render(); return; }
      const sy = e.target.closest('[data-say]'); if (sy) { const m = st.history[+sy.dataset.say]; if (!(await Core.tutor.say(m.respuesta))) U.toast('Tu móvil no tiene voz china instalada y Gemini no ha podido leerla.'); return; }
      const sf = e.target.closest('[data-sayfix]'); if (sf) { Core.tutor.say(sf.dataset.sayfix); return; }
      const me = e.target.closest('[data-me]'); if (me) { const m = st.history.find(x => x.idx === +me.dataset.me); if (m && m.audio) Core.playSamples(m.audio); }
    };
  };
  const controls = () => {
    foot.innerHTML = '<button class="btn ghost small" data-help>No sé qué decir</button><button class="mic small-mic" data-rec aria-label="Hablar">' + I.mic + '</button><button class="btn ghost small" data-type>Escribir</button>';
    foot.onclick = e => {
      if (st.busy) return;
      if (e.target.closest('[data-rec]')) return recTurn();
      if (e.target.closest('[data-help]')) return send(null, '(No sé qué responder. Dame una frase sencilla de ejemplo que pueda decir y pídeme que la repita.)');
      if (e.target.closest('[data-type]')) {
        foot.innerHTML = '<input class="text" id="chatIn" placeholder="Escribe en chino, pinyin o español" autocomplete="off"><button class="btn primary small" data-send>Enviar</button>';
        const inp = $('#chatIn', foot); inp.focus();
        const go = () => { const v = inp.value.trim(); if (v) send(null, v); else controls(); };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
        foot.onclick = ev => { if (ev.target.closest('[data-send]')) go(); };
      }
    };
  };
  async function recTurn() {
    const btn = $('[data-rec]', foot);
    if (st.rec) { st.rec.stop(); return; }
    try { await Core.openMic(); } catch (e) { body.insertAdjacentHTML('beforeend', U.micErrorHTML()); return; }
    btn.classList.add('rec'); btn.innerHTML = I.stop;
    const r = await Core.record({ maxSec: 12, tail: 1.3, maxWait: 8, onLevel: db => btn.style.setProperty('--lvl', Math.max(2, Math.min(14, (db + 60) / 3)) + 'px') });
    st.rec = r; const out = await r.done; st.rec = null;
    btn.classList.remove('rec'); btn.innerHTML = I.mic;
    if (!out.heard) { U.toast('No te he oído. Toca el micro y habla.'); return; }
    send(out.x, null);
  }
  async function send(audio, text) {
    st.busy = true; render('Lǎoshī está pensando…');
    foot.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const r = await Core.tutor.turn(st.history, st.scenario, st.level, audio, text);
      if (audio || text) st.history.push({ role: 'user', idx: Date.now(), audio, text, oido: r.oido, oido_pinyin: r.oido_pinyin, correcto: r.correcto, correcto_pinyin: r.correcto_pinyin, pronunciacion: r.pronunciacion });
      st.history.push({ role: 'model', respuesta: r.respuesta, respuesta_pinyin: r.respuesta_pinyin, respuesta_es: r.respuesta_es });
      U.markDay(); U.saveProg();
      render(); Core.tutor.say(r.respuesta);
    } catch (err) {
      render(); body.insertAdjacentHTML('beforeend', '<div class="note err">' + esc(err.message || 'Algo ha fallado.') + '</div>');
    }
    st.busy = false; controls();
  }
  function start() { st.history = []; controls(); send(null, null); }
  U.addCleanup(() => { if (st.rec) st.rec.stop(); });
  setup();
}

// ---------- repaso (SRS) y práctica rápida ----------
function startSrs() {
  const items = shuffle(U.dueItems()).slice(0, 12);
  if (!items.length) return;
  if (needCal(startSrs)) return;
  const steps = items.map(it => {
    if (it.type === 'word') { const w = Core.words.find(x => x.h === it.key) || Core.pairs.find(x => x.h === it.key) || U.wordFromPhrase(C.SANDHI.find(p => p.h === it.key) || { h: it.key, p: 'a1', es: '' }); return { type: 'speak', target: U.wordTarget(w) }; }
    return { type: 'speak', target: U.sylTarget(it.key, it.focus || ['tone']) };
  });
  U.runSession({ title: 'Repaso', steps });
}

// ---------- pantalla principal ----------
function renderPractice() {
  const v = $('#v-review'), p = U.prog();
  const due = U.dueItems().length, weak = weakList(), last = (p.tests || []).slice(-1)[0];
  const sentDone = Object.keys(p.sent || {}).length;
  const card = (k, hz, title, sub, extra) => '<button class="pcard" data-p="' + k + '"><span class="pc-hz han">' + hz + '</span><span class="pc-t"><b>' + title + '</b><span class="muted">' + sub + '</span></span>' + (extra || '') + '</button>';
  let html = '<h2>Practicar</h2><div class="pgrid">' +
    card('srs', '复', 'Repaso', due ? due + ' pendientes' : 'Nada pendiente', due ? '<span class="pc-badge">' + due + '</span>' : '') +
    card('weak', '弱', 'Puntos débiles', weak.length ? esc(weakLabel(weak[0].k)) + (weak.length > 1 ? ' y ' + (weak.length - 1) + ' más' : '') : 'Aún sin datos') +
    card('pairs', '声', 'Parejas de tonos', 'Las 20 combinaciones') +
    card('test', '听', 'Test de escucha', last ? 'Último: ' + pct(last.score) : '20 preguntas, unos 5 min') +
    card('ear', '耳', 'Entrenar el oído', 'Tonos, sonidos, palabras') +
    card('dict', '写', 'Dictado', 'Oye y escribe en pinyin') +
    card('shadow', '影', 'Shadowing', sentDone ? sentDone + ' de ' + Core.sentences.length + ' frases' : Core.sentences.length + ' frases cortas') +
    card('tutor', '聊', 'Conversación', Core.gemini.key() ? 'Tutor con Gemini' : 'Necesita clave de Gemini') +
    card('quick', '快', 'Tonos rápidos', '10 sílabas al azar para calentar la voz').replace('class="pcard"', 'class="pcard wide"') +
    '</div>';
  const pc = k => { const s = p.stats[k]; return s && s.n ? s.ok / s.n : null; };
  const bar = (label, val) => '<div class="hbar"><span>' + esc(label) + '</span><div class="track"><i style="width:' + (val == null ? 0 : Math.round(val * 100)) + '%;background:' + rateColor(val) + '"></i></div><span class="n">' + pct(val) + '</span></div>';
  html += '<div class="stats-row"><div class="stat"><b>' + U.streak() + '</b><span>días seguidos</span></div><div class="stat"><b>' + Object.keys(p.done).length + '</b><span>lecciones</span></div><div class="stat"><b>' + p.xp + '</b><span>puntos</span></div></div>';
  html += '<div class="panel"><h3>Cómo te sale</h3><div class="bars">' + [['Tonos', 'tone'], ['Aire (aspiración)', 'asp'], ['Lengua', 'retro'], ['Vocales', 'vowel'], ['Nasales', 'nasal'], ['Oído', 'listen']].map(([l, k]) => bar(l, pc(k))).join('') + '</div></div>';
  html += '<div class="panel"><h3>Por tono</h3><div class="bars">' + [1, 2, 3, 4].map(t => bar('Tono ' + t + ' (decir)', combine('S:tone:' + t)) + bar('Tono ' + t + ' (oír)', combine('L:tone:' + t, 'D:tone:' + t))).join('') + '</div></div>';
  if (p.tests && p.tests.length) html += '<div class="panel"><h3>Test de escucha</h3>' + historyChart(p.tests) + '</div>';
  v.innerHTML = html;
}
$('#v-review').addEventListener('click', e => {
  const c = e.target.closest('[data-p]'); if (!c) return;
  const k = c.dataset.p;
  if (k === 'srs') { if (U.dueItems().length) startSrs(); else U.toast('No tienes nada pendiente. Lo que falles en las lecciones aparecerá aquí.'); }
  else if (k === 'weak') openWeak();
  else if (k === 'pairs') openPairs();
  else if (k === 'test') startTest();
  else if (k === 'ear') openEar();
  else if (k === 'dict') openDict();
  else if (k === 'shadow') openShadowList();
  else if (k === 'tutor') openTutor();
  else if (k === 'quick') {
    if (needCal(() => {})) return;
    const steps = []; for (let i = 0; i < 10; i++) { const s = U.sylWithTone(pick(Core.sylBases.filter(b => b.length > 1 && !/^(_|hm|hng|ng)/.test(b)))); if (s) steps.push({ type: 'speak', target: U.sylTarget(s, ['tone']) }); }
    U.runSession({ title: 'Tonos', steps });
  }
});

U.renderPractice = renderPractice;
window.Practice = { Q, D, weakList, startTest, openPairs, openShadow, openTutor };
if (!$('#v-review').hidden) renderPractice();
})();
