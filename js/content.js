/* Contenido: explicaciones, trucos y lecciones */
(function () {
'use strict';
const C = {};
window.Content = C;

// ---------- tonos ----------
C.TONES = {
  1: { name: 'Tono 1', mark: 'ā', chao: '55', shape: 'Alto y plano', how: 'Arranca en lo alto de tu voz y mantenlo recto, sin bajar al final. Como cantar una nota aguda o el "¡aaa!" que dices en el médico.', trick: 'Truco: imagina que tu voz es una línea recta en lo más alto. Si notas que baja al final, alárgalo un poco más.', ex: ['ma1', 'ba1', 'shu1', 'fei1'] },
  2: { name: 'Tono 2', mark: 'á', chao: '35', shape: 'Sube', how: 'Empieza a media altura y sube de forma continua hasta arriba. Como cuando preguntas sorprendido: "¿¡Qué!?" o "¿Sí?".', trick: 'Truco: mueve la cabeza hacia arriba mientras lo dices. La subida tiene que notarse: unos 5 semitonos.', ex: ['ma2', 'ren2', 'cha2', 'lai2'] },
  3: { name: 'Tono 3', mark: 'ǎ', chao: '214', shape: 'Baja al fondo', how: 'Baja hasta lo más grave de tu voz (casi rasposo) y, si la sílaba va sola o al final, vuelve a subir un poco. Dentro de una frase casi siempre se queda abajo: "¡bah…!" desganado.', trick: 'Truco: lo importante es tocar el fondo de tu voz. Baja la barbilla al decirlo. La subida final es secundaria.', ex: ['ma3', 'ni3', 'hao3', 'wo3'] },
  4: { name: 'Tono 4', mark: 'à', chao: '51', shape: 'Cae de golpe', how: 'Empieza arriba del todo y cae rápido y seco hasta abajo. Como una orden: "¡No!", "¡Ya!", "¡Fuera!".', trick: 'Truco: da un pequeño golpe con la mano hacia abajo mientras lo dices. Tiene que ser corto y decidido.', ex: ['ma4', 'bu4', 'qu4', 'kan4'] },
  5: { name: 'Tono neutro', mark: 'a', chao: '—', shape: 'Corto y suave', how: 'Sílaba corta, flojita y sin tono propio. Su altura depende de la sílaba de antes: tras un tono 3 queda algo más alta; tras los demás, más baja.', trick: 'Truco: dila como la última sílaba de "mamá" en "Ma-ma" de un niño: corta y sin fuerza.', ex: [] },
};

// ---------- iniciales ----------
// seq: animación de la boca (Mouth.SEQ). es: comparación con el español. en: con el inglés.
C.INI = {
  b: { group: 'Labios', how: 'Labios cerrados y se sueltan SIN soplar. Las cuerdas vocales no vibran.', es: 'Suena como la p de "papá", suave y sin aire. No es la b española.', en: 'Como la p de "spin" (sin aire).', mistake: 'Hacerla vibrar como la b española o soplar como una p inglesa.', seq: 'b' },
  p: { group: 'Labios', how: 'Como la b, pero con un soplo fuerte de aire al soltar los labios.', es: 'Una p española con un soplido detrás: "p-jja".', en: 'Como la p de "pen" o "pie".', mistake: 'No soplar: entonces suena a b.', seq: 'p', test: 'Pon la palma de la mano delante de la boca: con p notas el aire, con b casi nada.' },
  m: { group: 'Labios', how: 'Igual que en español.', es: 'm de "mamá".', en: 'm de "mother".', seq: 'm' },
  f: { group: 'Labios', how: 'Igual que en español: el labio de abajo toca los dientes de arriba.', es: 'f de "foca".', en: 'f de "fun".', seq: 'f' },
  d: { group: 'Punta de la lengua', how: 'La punta de la lengua detrás de los dientes de arriba y se suelta SIN aire.', es: 'Suena como la t española de "taza". No es la d de "dedo".', en: 'Como la t de "stop".', mistake: 'Hacerla vibrar como una d española.', seq: 'd' },
  t: { group: 'Punta de la lengua', how: 'Como la d, pero con soplo fuerte.', es: 't española con un soplido detrás.', en: 'Como la t de "top" o "tea".', mistake: 'No soplar: suena a d.', seq: 't', test: 'Con una tira de papel delante de la boca: con t se mueve, con d casi no.' },
  n: { group: 'Punta de la lengua', how: 'Igual que en español.', es: 'n de "nada".', en: 'n de "no".', seq: 'n' },
  l: { group: 'Punta de la lengua', how: 'Igual que en español.', es: 'l de "luna".', en: 'l de "love".', seq: 'l' },
  g: { group: 'Fondo de la lengua', how: 'El fondo de la lengua toca el paladar blando y se suelta SIN aire.', es: 'Suena como la c de "casa", suave. No es la g de "gato".', en: 'Como la k de "sky".', mistake: 'Hacerla vibrar como la g española.', seq: 'g' },
  k: { group: 'Fondo de la lengua', how: 'Como la g, pero con un soplo fuerte.', es: 'c de "casa" con un soplido detrás.', en: 'Como la k de "kite".', mistake: 'No soplar: suena a g.', seq: 'k' },
  h: { group: 'Fondo de la lengua', how: 'Roce suave al fondo de la boca.', es: 'Como la j de "jamón", pero más suave y menos áspera.', en: 'Una h inglesa con algo más de roce.', mistake: 'Rascar demasiado fuerte como una jota muy marcada.', seq: 'h' },
  j: { group: 'Lengua plana', how: 'La punta de la lengua ABAJO, tocando los dientes de abajo. El centro de la lengua toca el paladar. Labios en sonrisa. Sin aire.', es: 'Como una "ch" muy suave y sin aire, con la punta de la lengua abajo.', en: 'Parecida a la j de "jeep", pero sin vibrar y con sonrisa.', mistake: 'Pronunciarla como la jota española (eso sería h) o como una ch con la punta arriba.', seq: 'j' },
  q: { group: 'Lengua plana', how: 'Igual que j (punta abajo, sonrisa), pero con un soplo fuerte.', es: 'Una "ch" española con soplido, con la punta de la lengua abajo detrás de los dientes. No es una "c" ni una "k".', en: 'Como la ch de "cheese" con sonrisa y aire.', mistake: 'Decirla como "k" (leyendo la q del español) o con la lengua doblada como ch.', seq: 'q' },
  x: { group: 'Lengua plana', how: 'Punta de la lengua abajo, el centro cerca del paladar, sonríe y sopla.', es: 'Entre una s y una "sh", con sonrisa. No es la x de "taxi".', en: 'Como la sh de "she" pero sonriendo y con la lengua plana.', mistake: 'Decir "ks" o una s española normal.', seq: 'x' },
  zh: { group: 'Lengua doblada', how: 'Dobla la punta de la lengua hacia arriba y atrás, hacia el paladar. Suelta sin aire.', es: 'Como una "ch" española sin aire, pero con la punta de la lengua doblada hacia atrás.', en: 'Como la j de "jump" sin vibrar y con la lengua más atrás.', mistake: 'Ponerla como la z (punta adelante) o como la ch española.', seq: 'zh' },
  ch: { group: 'Lengua doblada', how: 'Como zh (punta doblada atrás), pero con soplo fuerte.', es: 'Una "ch" con la punta de la lengua doblada hacia atrás y mucho aire.', en: 'Como la ch de "church", con la lengua más atrás.', mistake: 'Usar la ch española tal cual: la lengua va más atrás.', seq: 'ch' },
  sh: { group: 'Lengua doblada', how: 'Punta doblada hacia atrás, sin tocar, y sopla.', es: 'Como el "sh" que haces para mandar callar, con la punta hacia atrás.', en: 'Como la sh de "shop", con la lengua más atrás.', mistake: 'Decirla como una s española.', seq: 'sh' },
  r: { group: 'Lengua doblada', how: 'Punta doblada hacia atrás SIN tocar el paladar, y que vibre la voz.', es: 'NO es la r española: no golpea ni vibra la lengua. Se parece a la "ll" de los argentinos ("yo" → "sho") con la lengua más atrás.', en: 'Como la r de "run" o la s de "pleasure".', mistake: 'Hacer una r española (golpe o vibración).', seq: 'r' },
  z: { group: 'Punta adelante', how: 'Punta de la lengua detrás de los dientes de arriba. Suelta sin aire: "ds".', es: 'Como una "ts" suave y sin aire. No es la z española (no se saca la lengua).', en: 'Como "ds" en "kids", sin vibrar.', mistake: 'Decirla como la z española (zeta, con la lengua entre los dientes).', seq: 'z' },
  c: { group: 'Punta adelante', how: 'Como z pero con soplo fuerte: "ts" con aire.', es: 'Como la "ts" de "tsunami" o la "zz" de "pizza" con soplido. No es la c de "casa".', en: 'Como "ts" en "cats", con aire.', mistake: 'Leerla como "k" o como zeta.', seq: 'c' },
  s: { group: 'Punta adelante', how: 'Igual que la s española.', es: 's de "sol".', en: 's de "sun".', seq: 's' },
};

// ---------- finales ----------
C.FIN = {
  a: { how: 'Como la a española, bien abierta.', seq: 'a' },
  o: { how: 'Una "uo" rápida: los labios empiezan redondos.', es: '"bo" suena casi "buo".', seq: 'o' },
  e: { how: 'NO es la e española. Boca entreabierta, labios relajados (sin redondear) y la lengua hacia atrás.', es: 'Como un "eh…" de duda que tira hacia "u", o la "u" inglesa de "duh". Truco: di "o" y separa los labios sin mover nada más.', seq: 'e' },
  i: { how: 'Como la i española. Ojo: después de z, c, s y zh, ch, sh, r no se pronuncia como i (mira esas sílabas).', seq: 'i' },
  u: { how: 'Como la u española, con los labios bien redondos.', seq: 'u' },
  v: { how: 'La ü: di "i" y, SIN mover la lengua, redondea los labios como para silbar.', es: 'Como la u francesa ("tu") o la ü alemana. Después de j, q, x e y se escribe u pero suena ü.', seq: 'v' },
  ai: { how: 'Como "ai" en "aire".', seq: 'a' }, ei: { how: 'Como "ei" en "reina".', seq: 'e' }, ao: { how: 'Como "ao" en "Bilbao".', seq: 'a' }, ou: { how: 'Como "ou" en "bou": o y u rápidas.', seq: 'o' },
  an: { how: 'a abierta y adelantada; al final la punta de la lengua sube a los dientes de arriba.', seq: 'n-final' },
  en: { how: 'Una e neutra y corta ("ən") y la punta de la lengua arriba.', seq: 'n-final' },
  ang: { how: 'a profunda y abierta; al final el fondo de la lengua sube, la boca sigue abierta y la punta se queda abajo. Como "sang" en inglés.', seq: 'ng-final' },
  eng: { how: '"əng", como la "ung" de "sung" en inglés. La punta de la lengua se queda abajo.', seq: 'ng-final' },
  ong: { how: '"ung" con los labios redondos, como en "hung" inglés pero redondeando.', seq: 'ng-final' },
  er: { how: 'Di "a" y, sin parar, curva la punta de la lengua hacia atrás.', es: 'Suena como "are" en inglés americano. Aquí no hay ninguna e española.', seq: 'er' },
  ia: { how: '"ia" como en "Asia".', seq: 'a' }, ie: { how: '"ie" con la e española de "pie".', seq: 'e' }, iao: { how: '"iao", como "miau".', seq: 'a' },
  iou: { how: 'Se escribe iu pero suena "iou": la o se oye un poco, sobre todo en tonos 3 y 4.', seq: 'o' },
  ian: { how: '¡Ojo! Se escribe ian pero suena "ien".', seq: 'n-final' }, in: { how: '"in" con la punta de la lengua arriba al final.', seq: 'n-final' },
  iang: { how: '"iang" con a abierta y final ng.', seq: 'ng-final' }, ing: { how: 'Casi "iəng": una pequeña schwa antes de la ng.', seq: 'ng-final' }, iong: { how: '"iung", como "yung".', seq: 'ng-final' },
  ua: { how: '"ua" como en "agua".', seq: 'a' }, uo: { how: '"uo" como en "cuota".', seq: 'o' }, uai: { how: '"uai" como "guay".', seq: 'a' },
  uei: { how: 'Se escribe ui pero suena "uei".', seq: 'e' }, uan: { how: '"uan" como "Juan", final -n.', seq: 'n-final' }, uen: { how: 'Se escribe un pero suena "uən".', seq: 'n-final' },
  uang: { how: '"uang" con final ng.', seq: 'ng-final' }, ueng: { how: '"uəng".', seq: 'ng-final' },
  ve: { how: '"üe": ü y una e como la española.', seq: 'v' }, van: { how: '"üen": ü + en.', seq: 'v' }, vn: { how: '"ün": ü + n.', seq: 'v' },
  'i-apical': { how: 'Después de z, c, s la "i" no es i: la lengua se queda donde está y alargas la consonante con voz, como un zumbido "zzz".', es: 'Si dices "si" como en español, está mal. Es más bien "sz", "tsz".', seq: 'apical' },
  'i-retro': { how: 'Después de zh, ch, sh, r la "i" no es i: la lengua sigue doblada hacia atrás y alargas con voz, como una "r" inglesa.', es: '"shi" no es "chi" ni "si": es "shr", con la lengua atrás.', seq: 'retrovowel' },
};

// ---------- lecciones de pronunciación ----------
const P = (focus, pairs, opts = {}) => Object.assign({ focus, pairs }, opts);
C.PRON = [
  { id: 'A', title: 'Los tonos', sub: 'Lo más importante: sin tonos no te entienden', lessons: [
    { id: 'A1', title: 'Tono 1', icon: 'ā', kind: 'tone', tones: [1], intro: ['tone1'], speak: ['ma1', 'ba1', 'ta1', 'fei1', 'shu1', 'ka1', 'gao1', 'xin1'] },
    { id: 'A2', title: 'Tono 4', icon: 'à', kind: 'tone', tones: [1, 4], intro: ['tone4'], speak: ['ma4', 'bu4', 'qu4', 'kan4', 'da4', 'shi4', 'mai4', 'huo4'] },
    { id: 'A3', title: 'Tono 2', icon: 'á', kind: 'tone', tones: [1, 2, 4], intro: ['tone2'], speak: ['ma2', 'ren2', 'cha2', 'lai2', 'hui2', 'nian2', 'qian2', 'tai2'] },
    { id: 'A4', title: 'Tono 3', icon: 'ǎ', kind: 'tone', tones: [1, 2, 3, 4], intro: ['tone3'], speak: ['ma3', 'ni3', 'hao3', 'wo3', 'shui3', 'mai3', 'gou3', 'xie3'] },
    { id: 'A5', title: 'Los cuatro', icon: '1234', kind: 'tone', tones: [1, 2, 3, 4], intro: ['tones'], speak: ['ma1', 'ma2', 'ma3', 'ma4', 'yi1', 'yi2', 'yi3', 'yi4', 'tang1', 'tang2', 'tang3', 'tang4'], mixed: true },
    { id: 'A6', title: '2 o 3', icon: '2·3', kind: 'tone', tones: [2, 3], intro: ['tone23'], speak: ['mai2', 'mai3', 'hao2', 'hao3', 'mi2', 'mi3', 'you2', 'you3', 'qi2', 'qi3'], mixed: true },
    { id: 'A7', title: 'Parejas de tonos', icon: '◠◡', kind: 'pairs', intro: ['pairs'] },
    { id: 'A8', title: 'Cambios de tono', icon: '3→2', kind: 'sandhi', intro: ['sandhi'] },
    { id: 'A9', title: 'Tono neutro', icon: '·', kind: 'neutral', intro: ['neutral'] },
  ] },
  { id: 'B', title: 'El aire', sub: 'Con soplo o sin soplo cambia la palabra', lessons: [
    { id: 'B1', title: 'b · p', icon: 'b p', kind: 'contrast', check: 'asp', a: 'b', b: 'p', intro: ['ini:b', 'ini:p'], pairs: [['ba', 'pa'], ['bu', 'pu'], ['bao', 'pao'], ['bi', 'pi'], ['bai', 'pai'], ['ban', 'pan']] },
    { id: 'B2', title: 'd · t', icon: 'd t', kind: 'contrast', check: 'asp', a: 'd', b: 't', intro: ['ini:d', 'ini:t'], pairs: [['da', 'ta'], ['du', 'tu'], ['dao', 'tao'], ['dou', 'tou'], ['di', 'ti'], ['dan', 'tan']] },
    { id: 'B3', title: 'g · k', icon: 'g k', kind: 'contrast', check: 'asp', a: 'g', b: 'k', intro: ['ini:g', 'ini:k'], pairs: [['ge', 'ke'], ['gu', 'ku'], ['gai', 'kai'], ['gan', 'kan'], ['gou', 'kou'], ['gua', 'kua']] },
    { id: 'B4', title: 'z · c', icon: 'z c', kind: 'contrast', check: 'asp', a: 'z', b: 'c', intro: ['ini:z', 'ini:c'], pairs: [['zi', 'ci'], ['zao', 'cao'], ['zuo', 'cuo'], ['zai', 'cai'], ['zu', 'cu'], ['zan', 'can']] },
    { id: 'B5', title: 'zh · ch', icon: 'zh ch', kind: 'contrast', check: 'asp', a: 'zh', b: 'ch', intro: ['ini:zh', 'ini:ch'], pairs: [['zhi', 'chi'], ['zhu', 'chu'], ['zhao', 'chao'], ['zhang', 'chang'], ['zhe', 'che'], ['zhou', 'chou']] },
    { id: 'B6', title: 'j · q', icon: 'j q', kind: 'contrast', check: 'asp', a: 'j', b: 'q', intro: ['ini:j', 'ini:q'], pairs: [['ji', 'qi'], ['jia', 'qia'], ['jiu', 'qiu'], ['jian', 'qian'], ['jin', 'qin'], ['ju', 'qu']] },
  ] },
  { id: 'C', title: 'La lengua', sub: 'Adelante, doblada o plana', lessons: [
    { id: 'C1', title: 'z c s', icon: 'z c s', kind: 'set', check: 'retro', intro: ['ini:z', 'ini:c', 'ini:s'], speak: ['za1', 'zao3', 'zuo4', 'ca1', 'cai4', 'cuo4', 'sa1', 'san1', 'suo3'] },
    { id: 'C2', title: 'zh ch sh', icon: 'zh ch sh', kind: 'set', check: 'retro', intro: ['ini:zh', 'ini:ch', 'ini:sh'], speak: ['zha1', 'zhao3', 'zhuo1', 'cha2', 'chao3', 'chuo1', 'sha1', 'shan1', 'shuo1'] },
    { id: 'C3', title: 'z · zh', icon: 'z zh', kind: 'contrast', check: 'retro', a: 'z', b: 'zh', intro: ['ini:z', 'ini:zh'], pairs: [['za', 'zha'], ['zu', 'zhu'], ['zao', 'zhao'], ['zai', 'zhai'], ['zou', 'zhou'], ['zan', 'zhan']] },
    { id: 'C4', title: 'c · ch', icon: 'c ch', kind: 'contrast', check: 'retro', a: 'c', b: 'ch', intro: ['ini:c', 'ini:ch'], pairs: [['ca', 'cha'], ['cu', 'chu'], ['cao', 'chao'], ['cai', 'chai'], ['can', 'chan'], ['ceng', 'cheng']] },
    { id: 'C5', title: 's · sh', icon: 's sh', kind: 'contrast', check: 'retro', a: 's', b: 'sh', intro: ['ini:s', 'ini:sh'], pairs: [['sa', 'sha'], ['su', 'shu'], ['se', 'she'], ['sao', 'shao'], ['san', 'shan'], ['sou', 'shou']] },
    { id: 'C6', title: 'j q x', icon: 'j q x', kind: 'set', check: 'retro', intro: ['ini:j', 'ini:q', 'ini:x'], speak: ['jia1', 'jiu3', 'ju4', 'qi1', 'qian2', 'qu4', 'xi1', 'xiao3', 'xue2'] },
    { id: 'C7', title: 'q · ch', icon: 'q ch', kind: 'contrast', check: 'retro', a: 'q', b: 'ch', intro: ['ini:q', 'ini:ch'], pairs: [['qu', 'chu'], ['qiao', 'chao'], ['qian', 'chan'], ['qiang', 'chang'], ['qiu', 'chou'], ['qia', 'cha']] },
    { id: 'C8', title: 'x · sh', icon: 'x sh', kind: 'contrast', check: 'retro', a: 'x', b: 'sh', intro: ['ini:x', 'ini:sh'], pairs: [['xu', 'shu'], ['xiao', 'shao'], ['xian', 'shan'], ['xiang', 'shang'], ['xiu', 'shou'], ['xia', 'sha']] },
    { id: 'C9', title: 'La r china', icon: 'r', kind: 'set', check: 'tone', intro: ['ini:r'], speak: ['ri4', 're4', 'ren2', 'rou4', 'ru4', 'rang4', 'ruan3', 'rong2'], listenPairs: [['lu', 'ru'], ['lan', 'ran'], ['lou', 'rou'], ['le', 're']] },
  ] },
  { id: 'D', title: 'Vocales', sub: 'Las que no existen en español', lessons: [
    { id: 'D1', title: 'ü · u', icon: 'ü u', kind: 'contrast', check: 'vowel', a: 'ü', b: 'u', intro: ['fin:v', 'fin:u'], pairs: [['lv', 'lu'], ['nv', 'nu'], ['ju', 'zhu'], ['qu', 'chu'], ['xu', 'shu'], ['yu', 'wu']] },
    { id: 'D2', title: 'La e china', icon: 'e', kind: 'set', check: 'vowel', intro: ['fin:e'], speak: ['e4', 'de2', 'ge1', 'ke4', 'he2', 'le4', 'she2', 'zhe4', 'che1', 're4'] },
    { id: 'D3', title: 'La i que no es i', icon: 'zi zhi', kind: 'set', check: 'vowel', intro: ['fin:i-apical', 'fin:i-retro'], speak: ['zi4', 'ci2', 'si4', 'zhi1', 'chi1', 'shi4', 'ri4', 'si1', 'shi2'], listenPairs: [['si', 'xi'], ['shi', 'xi'], ['zi', 'ji'], ['chi', 'qi']] },
    { id: 'D4', title: 'er', icon: 'er', kind: 'set', check: 'vowel', intro: ['fin:er'], speak: ['er2', 'er3', 'er4'], words: ['二', '儿子', '女儿', '哪儿', '一点儿'] },
  ] },
  { id: 'E', title: 'Nasales', sub: '-n o -ng: punta arriba o fondo arriba', lessons: [
    { id: 'E1', title: 'an · ang', icon: 'an ang', kind: 'contrast', check: 'nasal', a: 'an', b: 'ang', intro: ['fin:an', 'fin:ang'], pairs: [['ban', 'bang'], ['fan', 'fang'], ['man', 'mang'], ['tan', 'tang'], ['zhan', 'zhang'], ['shan', 'shang']] },
    { id: 'E2', title: 'en · eng', icon: 'en eng', kind: 'contrast', check: 'nasal', a: 'en', b: 'eng', intro: ['fin:en', 'fin:eng'], pairs: [['ben', 'beng'], ['fen', 'feng'], ['men', 'meng'], ['gen', 'geng'], ['chen', 'cheng'], ['shen', 'sheng']] },
    { id: 'E3', title: 'ian · iang', icon: 'ian iang', kind: 'contrast', check: 'nasal', a: 'ian', b: 'iang', intro: ['fin:ian', 'fin:iang'], pairs: [['lian', 'liang'], ['jian', 'jiang'], ['qian', 'qiang'], ['xian', 'xiang'], ['nian', 'niang'], ['yan', 'yang']] },
    { id: 'E4', title: 'uan · uang', icon: 'uan uang', kind: 'contrast', check: 'nasal', a: 'uan', b: 'uang', intro: ['fin:uan', 'fin:uang'], pairs: [['guan', 'guang'], ['huan', 'huang'], ['kuan', 'kuang'], ['chuan', 'chuang'], ['zhuan', 'zhuang'], ['wan', 'wang']] },
    { id: 'E5', title: 'in · ing', icon: 'in ing', kind: 'contrast', check: 'nasal', a: 'in', b: 'ing', intro: ['fin:in', 'fin:ing'], pairs: [['bin', 'bing'], ['lin', 'ling'], ['min', 'ming'], ['jin', 'jing'], ['xin', 'xing'], ['yin', 'ying']] },
  ] },
];

// Frases para sandhi y neutro (se dicen con la voz del sistema o sílaba a sílaba si no hay grabación)
C.SANDHI = [
  { h: '你好', p: 'ni3 hao3', es: 'hola' }, { h: '很好', p: 'hen3 hao3', es: 'muy bien' }, { h: '可以', p: 'ke3 yi3', es: 'poder' },
  { h: '水果', p: 'shui3 guo3', es: 'fruta' }, { h: '小姐', p: 'xiao3 jie3', es: 'señorita' }, { h: '所以', p: 'suo3 yi3', es: 'por eso' },
  { h: '不是', p: 'bu4 shi4', es: 'no ser' }, { h: '不对', p: 'bu4 dui4', es: 'incorrecto' }, { h: '不客气', p: 'bu4 ke4 qi5', es: 'de nada' },
  { h: '一个', p: 'yi1 ge4', es: 'uno (de algo)' }, { h: '一起', p: 'yi1 qi3', es: 'juntos' }, { h: '一天', p: 'yi1 tian1', es: 'un día' },
];
C.NEUTRAL = ['妈妈', '爸爸', '谢谢', '朋友', '东西', '名字', '喜欢', '漂亮', '什么', '衣服', '先生', '桌子'];

// Intro cards: id -> contenido
C.intro = id => {
  if (id.startsWith('tone')) {
    if (id === 'tones') return { title: 'Los cuatro tonos', body: 'En chino cada sílaba tiene una melodía, y cambiarla cambia la palabra: mā (madre), má (cáñamo), mǎ (caballo), mà (regañar). Imagina tu voz dividida en 5 alturas, de 1 (lo más grave) a 5 (lo más agudo).', tones: [1, 2, 3, 4] };
    if (id === 'tone23') return { title: 'Tono 2 o tono 3', body: 'Es la confusión más común. El tono 2 sube desde el principio, de media altura a arriba. El tono 3 primero baja hasta el fondo de tu voz y solo al final sube un poco.', tones: [2, 3] };
    if (id === 'pairs') return { title: 'Parejas de tonos', body: 'En palabras de dos sílabas los tonos se encadenan. El tono 3 delante de otra sílaba suele quedarse abajo (sin subir), y el tono 4 cae menos que cuando va solo. Vas a escuchar palabras y decir qué tonos tienen.' };
    if (id === 'sandhi') return { title: 'Cambios de tono', body: 'Tres reglas que cambian el tono al hablar:\n• Dos terceros tonos seguidos: el primero se dice como tono 2. 你好 nǐ hǎo suena "ní hǎo".\n• 不 bù delante de un tono 4 se dice bú: 不是 "bú shì".\n• 一 yī delante de tono 4 se dice yí; delante de los demás, yì: 一个 "yí ge", 一起 "yì qǐ".' };
    if (id === 'neutral') return { title: 'El tono neutro', body: C.TONES[5].how + ' ' + C.TONES[5].trick + ' Aquí la app comprueba los tonos de las demás sílabas y que la neutra sea más corta.' };
    const n = +id.slice(4); const t = C.TONES[n];
    return { title: t.name + ': ' + t.shape.toLowerCase(), body: t.how + '\n\n' + t.trick, tones: [n], ex: t.ex };
  }
  if (id.startsWith('ini:')) { const k = id.slice(4), h = C.INI[k]; return { title: k, sub: h.group, body: h.how, es: h.es, en: h.en, mistake: h.mistake, test: h.test, seq: h.seq, kind: 'ini', key: k }; }
  if (id.startsWith('fin:')) { const k = id.slice(4), h = C.FIN[k]; return { title: k === 'v' ? 'ü' : k.startsWith('i-') ? (k === 'i-apical' ? 'zi ci si' : 'zhi chi shi ri') : k, body: h.how, es: h.es, seq: h.seq, kind: 'fin', key: k }; }
  return { title: id, body: '' };
};

// ---------- tabla de pinyin ----------
C.TABLE_INI = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'];
C.TABLE_FIN = ['a', 'o', 'e', 'i', 'u', 'v', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er',
  'ia', 'ie', 'iao', 'iou', 'ian', 'in', 'iang', 'ing', 'iong', 'ua', 'uo', 'uai', 'uei', 'uan', 'uen', 'uang', 'ueng', 've', 'van', 'vn'];
// Forma escrita de una combinación inicial + final (o null)
C.spell = (ini, fin) => {
  if (!ini) {
    const y = { i: 'yi', ia: 'ya', ie: 'ye', iao: 'yao', iou: 'you', ian: 'yan', in: 'yin', iang: 'yang', ing: 'ying', iong: 'yong', u: 'wu', ua: 'wa', uo: 'wo', uai: 'wai', uei: 'wei', uan: 'wan', uen: 'wen', uang: 'wang', ueng: 'weng', v: 'yu', ve: 'yue', van: 'yuan', vn: 'yun' };
    return y[fin] || fin;
  }
  let f = fin;
  if ('jqx'.includes(ini) && fin[0] === 'u') return null;
  if ('jqx'.includes(ini) && fin[0] === 'v') f = 'u' + fin.slice(1);
  else if (fin === 'iou') f = 'iu';
  else if (fin === 'uei') f = 'ui';
  else if (fin === 'uen') f = 'un';
  return ini + f;
};
C.display = s => s.replace(/v/g, 'ü');
})();
