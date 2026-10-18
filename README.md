# Pinyin 发音

Entrenador de pronunciación de chino mandarín para hispanohablantes. Lo más importante es que **escucha de verdad**: en vez de pasar tu voz por un dictado (que adivina la palabra y te perdona los errores), mide directamente la acústica de lo que dices.

**Abrir la app:** https://servidorfalangas.github.io/pinyin/

## Qué mide

Cifras medidas con las grabaciones nativas de la app (dos voces, en silencio y con ruido de fondo). Para que las comparaciones con tu voz sean justas, la calibración guarda tus a, i, u y tus s, sh.

| Qué | Cómo lo mide | Fiabilidad |
|---|---|---|
| Tonos 1–4 | Curva de tono (YIN + Viterbi, con corrección de errores de octava) normalizada a tu rango de voz. Palabras: red pequeña entrenada con 5.400 palabras nativas | Muy alta: 94–99 % en sílabas sueltas, ~95 % en palabras |
| Aire: b/p, d/t, g/k, z/c, zh/ch, j/q | Duración del soplo entre el ruido y la voz, con límites distintos según la vocal que sigue | Alta. Con ruido de fondo avisa en vez de suspender |
| Lengua: z/zh, c/ch, s/sh, j/q/x | Espectro del siseo comparado con tu propia s y sh | Buena para delante/atrás (~85–90 %). j/q/x frente a z/c/s no se distingue bien |
| ü frente a u, la e china, la "i" de zi/zhi | Perfil espectral de la vocal comparado con tus a, i, u | Alta (~90–97 %) |
| er | Bajada del tercer formante | Aceptable |
| -n frente a -ng | Calidad de la vocal antes de la nasal | Aproximada (75–90 % según la pareja). in/ing nunca se da por mala |
| r china | No se mide | La app lo dice y te pide comparar con el nativo |

Si lo que estás practicando sale mal, el resultado es "Otra vez". Si algo no se ha podido medir, la app lo dice en vez de darlo por bueno. Y si en una sílaba concreta hasta las grabaciones nativas fallan una medida, esa medida no te suspende.

## Contenido

- **Ruta de pronunciación:** tonos (cambios de tono, medio tercer tono, parejas, tono neutro y preguntas), vocales (e china, ü, la "i" de zi/zhi, er, erhua, leer el pinyin), aspiración, posición de la lengua y nasales.
- **Ruta de vocabulario:** 201 palabras (HSK 1 y algunas de HSK 2) en 11 unidades.
- **Practicar:**
  - Repaso espaciado y **puntos débiles**: arma una sesión con lo que peor te sale (oír, decir y escribir).
  - **Parejas de tonos:** las 20 combinaciones con 120 palabras grabadas por nativos y un mapa de cómo te sale cada una.
  - **Test de escucha** (20 preguntas: tonos, parejas, consonantes, vocales, palabras y frases) con historial, y **entrenamiento del oído** por partes.
  - **Dictado** de sílabas, palabras y frases, con corrección de inicial, final y tono.
  - **Shadowing** con 36 frases cortas: compara la melodía de toda la frase y el ritmo.
  - **Conversación con un tutor de Gemini** (con tu propia clave gratuita): te entiende por voz, te corrige y te dice qué tonos fallaste.
- **Tabla de pinyin** con todas las sílabas en los 4 tonos, dos voces nativas, un carácter de ejemplo por tono, trampas de escritura marcadas, sílabas con las que se confunde, tu mapa de resultados, explicaciones comparando con el español y el inglés, y animación de la boca en corte lateral.
- **Ver el aire:** en las consonantes con soplo se dibuja la onda de tu voz junto a la del nativo, con el soplo resaltado.

Todo funciona en el móvil, sin cuentas y sin enviar tu voz a ningún servidor (salvo si pides la opinión de Gemini).

## Instalar en Android

Abre la dirección en Chrome → menú ⋮ → **Instalar aplicación** (o "Añadir a pantalla de inicio"). Después funciona sin conexión.

## Créditos de audio

- Voz 1 (sílabas): Chen Wang · Palabras: Yue Tan — proyecto [audio-cmn](https://github.com/hugolpz/audio-cmn) de Hugo Lopez, licencia CC BY-SA.
- Voz 2 (sílabas): [mp3-chinese-pinyin-sound](https://github.com/davinfifield/mp3-chinese-pinyin-sound), dominio público.
- Frases: voz sintética generada con [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) y el modelo Matcha zh-baker.
- Lista de palabras HSK para elegir las parejas de tonos: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT).

Los audios se han recortado, normalizado y empaquetado en `audio/*.mp3` (se distribuyen bajo la misma licencia CC BY-SA en el caso de audio-cmn).
