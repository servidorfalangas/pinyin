/* Corte lateral de la cabeza, animado: dónde va la lengua, cómo van los labios y si sale aire. */
(function () {
'use strict';
const NS = 'http://www.w3.org/2000/svg';

// Lengua: punta, hoja, delante, medio, dorso, raíz + punto inferior de la punta
const T = {
  rest:     { p: [[64,106],[76,100],[96,96],[120,96],[146,104],[160,140]], u: [69,113] },
  alveolar: { p: [[62,92],[74,93],[96,95],[120,98],[146,106],[160,140]], u: [68,101] },
  ridge:    { p: [[67,85],[79,88],[98,94],[121,98],[146,106],[160,140]], u: [72,94] },
  retro:    { p: [[83,79],[98,98],[111,101],[127,100],[148,106],[160,140]], u: [94,92] },
  palatal:  { p: [[60,108],[72,97],[92,80],[118,81],[144,100],[160,140]], u: [65,114] },
  velar:    { p: [[62,108],[76,105],[98,101],[122,90],[141,78],[160,140]], u: [67,114] },
  i:        { p: [[62,106],[74,96],[94,83],[118,86],[144,100],[160,140]], u: [67,113] },
  u:        { p: [[64,110],[78,106],[100,101],[124,90],[144,84],[160,140]], u: [69,116] },
  a:        { p: [[64,113],[78,113],[100,114],[124,114],[148,118],[160,146]], u: [69,119] },
  e:        { p: [[64,108],[78,105],[100,101],[124,96],[146,96],[160,140]], u: [69,115] },
  er:       { p: [[86,85],[99,99],[110,101],[126,100],[148,104],[160,140]], u: [94,94] },
};
// Labios (punto delantero de arriba y de abajo) y apertura de la mandíbula
const L = {
  neutral: { ul: [45,90], ll: [46,104], jaw: 0 },
  spread:  { ul: [48,92], ll: [49,102], jaw: -1 },
  round:   { ul: [37,92], ll: [38,103], jaw: 0 },
  closed:  { ul: [46,97], ll: [46,98],  jaw: -2 },
  open:    { ul: [46,87], ll: [48,114], jaw: 8 },
  f:       { ul: [46,94], ll: [55,98],  jaw: -1 },
};
const lerp = (a, b, t) => a + (b - a) * t;
const lp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const f1 = v => v.toFixed(1);

// curva suave por puntos (Catmull-Rom -> Bézier)
function smooth(pts) {
  let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ' C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
  }
  return d;
}
function tonguePath(t, jaw) {
  // la parte delantera de la lengua baja con la mandíbula
  const pts = t.p.map(([x, y], i) => [x, y + jaw * Math.max(0, 1 - i / 5)]);
  const u = [t.u[0], t.u[1] + jaw];
  return smooth(pts) + ' L162 ' + f1(160 + jaw * 0.3) + ' L150 ' + f1(168 + jaw * 0.4) + ' C120 ' + f1(160 + jaw * 0.6) + ' 92 ' + f1(140 + jaw) + ' 76 ' + f1(124 + jaw) +
    ' C' + f1(u[0] - 6) + ' ' + f1(u[1] + 6) + ' ' + f1(u[0]) + ' ' + f1(u[1] + 2) + ' ' + f1(u[0]) + ' ' + f1(u[1]) +
    ' C' + f1(u[0] - 1) + ' ' + f1(u[1] - 4) + ' ' + f1(pts[0][0] + 2) + ' ' + f1(pts[0][1] + 3) + ' ' + f1(pts[0][0]) + ' ' + f1(pts[0][1]) + ' Z';
}
function profilePath(l) {
  const [ux, uy] = l.ul, [lx, ly] = l.ll, j = l.jaw;
  return 'M240 0 L78 0 C72 14 68 28 66 40 C62 50 50 58 40 63 C42 68 48 71 55 72 C53 78 ' + f1(ux - 1) + ' ' + f1(uy - 7) + ' ' + f1(ux) + ' ' + f1(uy) +
    ' Q' + f1((ux + 57) / 2) + ' ' + f1(uy + 4) + ' 57 ' + f1((uy + ly) / 2) + ' Q' + f1((lx + 57) / 2) + ' ' + f1(ly - 3) + ' ' + f1(lx) + ' ' + f1(ly) +
    ' C' + f1(lx + 1) + ' ' + f1(ly + 9) + ' 51 ' + f1(118 + j) + ' 49 ' + f1(127 + j) + ' C47 ' + f1(138 + j) + ' 58 ' + f1(147 + j) + ' 80 ' + f1(151 + j) + ' C98 ' + f1(155 + j * 0.5) + ' 106 172 110 200 L240 200 Z';
}
function cavityPath(l) {
  const j = l.jaw, my = (l.ul[1] + l.ll[1]) / 2;
  return 'M57 ' + f1(my - 3) + ' C60 88 64 85 69 84 C84 76 104 72 126 72 C142 72 156 80 163 96 L172 112 L176 200 L122 200 C114 170 102 ' + f1(156 + j * 0.5) + ' 86 ' + f1(150 + j) +
    ' C70 ' + f1(140 + j) + ' 60 ' + f1(126 + j) + ' 58 ' + f1(110 + j) + ' L57 ' + f1(my + 3) + ' Z';
}

function build(host) {
  host.innerHTML = '';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 200');
  svg.setAttribute('class', 'mouth-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Corte lateral de la boca');
  svg.innerHTML =
    '<path class="m-skin"/>' +
    '<path class="m-nose" d="M66 40 C80 46 100 52 126 56 C150 58 164 66 172 80 L164 96 C156 80 142 72 126 72 C104 72 84 76 69 84 C66 70 62 58 58 52 Z"/>' +
    '<path class="m-cavity"/>' +
    '<path class="m-tongue"/>' +
    '<path class="m-palate" d="M58 86 C62 84 66 84 69 84 C84 76 104 72 126 72 C134 72 140 73 142 74"/>' +
    '<path class="m-velum" d="M142 74 C152 79 160 87 163 96 C165 102 161 106 158 104"/>' +
    '<path class="m-wall" d="M172 112 L176 200"/>' +
    '<path class="m-teeth" d="M55 84 L62 84 L61 96 L56 95 Z"/>' +
    '<path class="m-teeth m-lowteeth" d="M56 101 L62 101 L64 111 L58 111 Z"/>' +
    '<text class="m-lbl" x="101" y="136">lengua</text>' +
    '<g class="m-paper"><line x1="16" y1="68" x2="16" y2="72" class="m-line"/><rect x="13" y="72" width="6" height="40" rx="1.5" class="m-paperstrip"/></g>' +
    '<g class="m-puffs"></g>' +
    '<rect class="m-capbg" x="4" y="178" width="232" height="18" rx="5"/><text class="m-cap" x="120" y="190.5" text-anchor="middle"></text>';
  host.appendChild(svg);
  const q = s => svg.querySelector(s);
  const st = { t: T.rest, l: L.neutral, raf: 0, timers: [] };
  function draw(t, l) {
    q('.m-skin').setAttribute('d', profilePath(l));
    q('.m-cavity').setAttribute('d', cavityPath(l));
    q('.m-tongue').setAttribute('d', tonguePath(t, l.jaw));
    q('.m-lowteeth').setAttribute('transform', 'translate(0 ' + f1(l.jaw) + ')');
  }
  function animate(toT, toL, ms) {
    const fromT = st.t, fromL = st.l, t0 = performance.now();
    cancelAnimationFrame(st.raf);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = now => {
      const k = reduce ? 1 : ease(Math.min(1, (now - t0) / ms));
      const t = { p: fromT.p.map((p, i) => lp2(p, toT.p[i], k)), u: lp2(fromT.u, toT.u, k) };
      const l = { ul: lp2(fromL.ul, toL.ul, k), ll: lp2(fromL.ll, toL.ll, k), jaw: lerp(fromL.jaw, toL.jaw, k) };
      draw(t, l);
      if (k < 1) st.raf = requestAnimationFrame(step); else { st.t = toT; st.l = toL; }
    };
    st.raf = requestAnimationFrame(step);
  }
  function puff(kind) {
    const g = q('.m-puffs'); g.innerHTML = '';
    const n = kind === 'strong' ? 10 : kind === 'hiss' ? 8 : kind === 'weak' ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'm-puff ' + kind);
      c.setAttribute('cx', 38); c.setAttribute('cy', 97 + (i % 3 - 1) * 3.5); c.setAttribute('r', kind === 'weak' ? 1.8 : 2.8);
      c.style.animationDelay = (i * (kind === 'hiss' ? 80 : 45)) + 'ms';
      g.appendChild(c);
    }
    const paper = q('.m-paper');
    paper.classList.remove('blow', 'nudge'); void paper.getBoundingClientRect();
    if (kind === 'strong') paper.classList.add('blow'); else if (kind === 'weak') paper.classList.add('nudge');
  }
  function caption(s) { q('.m-cap').textContent = s || ''; q('.m-capbg').style.opacity = s ? 1 : 0; }
  function clear() { st.timers.forEach(clearTimeout); st.timers = []; }
  function play(seq, loop) {
    clear();
    let t = 0;
    seq.forEach(step => {
      st.timers.push(setTimeout(() => {
        animate(T[step.t || 'rest'], L[step.l || 'neutral'], step.ms || 380);
        if (step.puff !== undefined) puff(step.puff);
        if (step.cap !== undefined) caption(step.cap);
      }, t));
      t += (step.hold || 700);
    });
    if (loop) st.timers.push(setTimeout(() => play(seq, loop), t + 600));
  }
  draw(T.rest, L.neutral); caption('');
  return { play, stop: clear, el: svg };
}

const REST = { t: 'rest', l: 'neutral', cap: '', puff: null, hold: 600 };
function stopSeq(tongue, lips, air, cap) {
  return [{ t: tongue, l: lips, cap, puff: null, hold: 1000 }, { t: 'a', l: 'open', puff: air, hold: 1000 }, REST];
}
function fricSeq(tongue, lips, cap) {
  return [{ t: tongue, l: lips, cap, puff: null, hold: 450 }, { t: tongue, l: lips, puff: 'hiss', hold: 1000 }, { t: 'i', l: lips, puff: null, hold: 500 }, REST];
}
const SEQ = {
  b: stopSeq('rest', 'closed', 'weak', 'Labios cerrados · se sueltan sin aire'),
  p: stopSeq('rest', 'closed', 'strong', 'Labios cerrados · se sueltan con soplo'),
  m: [{ t: 'rest', l: 'closed', cap: 'Labios cerrados · suena por la nariz', hold: 1200 }, { t: 'a', l: 'open', hold: 800 }, REST],
  f: fricSeq('rest', 'f', 'Labio de abajo contra los dientes'),
  d: stopSeq('alveolar', 'neutral', 'weak', 'Punta tras los dientes · sin aire'),
  t: stopSeq('alveolar', 'neutral', 'strong', 'Punta tras los dientes · con soplo'),
  n: [{ t: 'ridge', l: 'neutral', cap: 'Punta arriba · sale por la nariz', hold: 1200 }, { t: 'a', l: 'open', hold: 800 }, REST],
  l: [{ t: 'ridge', l: 'neutral', cap: 'Punta arriba, como en español', hold: 1100 }, { t: 'a', l: 'open', hold: 800 }, REST],
  g: stopSeq('velar', 'neutral', 'weak', 'Fondo de la lengua al velo · sin aire'),
  k: stopSeq('velar', 'neutral', 'strong', 'Fondo de la lengua al velo · con soplo'),
  h: [{ t: 'velar', l: 'neutral', cap: 'Roce suave al fondo', hold: 450 }, { t: 'u', l: 'neutral', puff: 'hiss', hold: 1000 }, { t: 'a', l: 'open', puff: null, hold: 600 }, REST],
  j: stopSeq('palatal', 'spread', 'weak', 'Punta abajo, dorso al paladar · sin aire'),
  q: stopSeq('palatal', 'spread', 'strong', 'Punta abajo, dorso al paladar · con soplo'),
  x: fricSeq('palatal', 'spread', 'Punta abajo · sonríe y sopla'),
  zh: stopSeq('retro', 'neutral', 'weak', 'Punta doblada hacia atrás · sin aire'),
  ch: stopSeq('retro', 'neutral', 'strong', 'Punta doblada hacia atrás · con soplo'),
  sh: fricSeq('retro', 'neutral', 'Punta doblada hacia atrás · sopla'),
  r: [{ t: 'retro', l: 'neutral', cap: 'Punta atrás SIN tocar · vibra la voz', hold: 1400 }, { t: 'retro', l: 'neutral', puff: 'weak', hold: 600 }, REST],
  z: stopSeq('alveolar', 'spread', 'weak', 'Punta tras los dientes de arriba · sin aire'),
  c: stopSeq('alveolar', 'spread', 'strong', 'Punta tras los dientes de arriba · con soplo'),
  s: fricSeq('alveolar', 'spread', 'Como la s española'),
  a: [{ t: 'a', l: 'open', cap: 'Boca bien abierta', hold: 1500 }, REST],
  o: [{ t: 'u', l: 'round', cap: 'Empieza en u…', hold: 800 }, { t: 'e', l: 'round', cap: '…y abre hacia o', hold: 1100 }, REST],
  e: [{ t: 'e', l: 'neutral', cap: 'Labios relajados · lengua atrás', hold: 1600 }, REST],
  i: [{ t: 'i', l: 'spread', cap: 'Sonrisa · lengua alta delante', hold: 1500 }, REST],
  u: [{ t: 'u', l: 'round', cap: 'Labios redondos y adelante', hold: 1500 }, REST],
  v: [{ t: 'i', l: 'spread', cap: '1. Di i', hold: 1200 }, { t: 'i', l: 'round', cap: '2. Sin mover la lengua, redondea', hold: 1700 }, REST],
  er: [{ t: 'a', l: 'neutral', cap: '1. Di a', hold: 1000 }, { t: 'er', l: 'neutral', cap: '2. Curva la punta hacia atrás', hold: 1500 }, REST],
  'n-final': [{ t: 'a', l: 'open', cap: 'Vocal…', hold: 900 }, { t: 'ridge', l: 'neutral', cap: '…y la PUNTA sube (-n)', hold: 1400 }, REST],
  'ng-final': [{ t: 'a', l: 'open', cap: 'Vocal…', hold: 900 }, { t: 'velar', l: 'open', cap: '…sube el FONDO, boca abierta (-ng)', hold: 1400 }, REST],
  apical: [{ t: 'alveolar', l: 'spread', cap: 'La lengua no se mueve: zumbido zzz', hold: 1600 }, REST],
  retrovowel: [{ t: 'retro', l: 'neutral', cap: 'La lengua sigue atrás: rrr', hold: 1600 }, REST],
};

window.Mouth = { build, SEQ };
})();
