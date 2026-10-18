# Pinyin 发音

Entrenador de pronunciación de chino mandarín para hispanohablantes. Lo más importante es que **escucha de verdad**: en vez de pasar tu voz por un dictado (que adivina la palabra y te perdona los errores), mide directamente la acústica de lo que dices.

**Abrir la app:** https://servidorfalangas.github.io/pinyin/

## Qué mide

| Qué | Cómo lo mide | Fiabilidad con voces nativas |
|---|---|---|
| Tonos 1–4 | Curva de tono (YIN + Viterbi, con corrección de errores de octava) normalizada a tu rango de voz. Sílabas sueltas: modelo entrenado con dos voces nativas. Palabras: red pequeña entrenada con 5.400 palabras nativas | 94–99 % en sílabas sueltas; ~95 % sílaba a sílaba en palabras nativas no vistas al entrenar |
| Aire: b/p, d/t, g/k, z/c, zh/ch, j/q | Duración del soplo entre que empieza el ruido y empieza la voz | ~90 % |
| Lengua: z/zh, c/ch, s/sh, j/q/x | Espectro del siseo (energía grave = lengua doblada) + tu propia s/sh de la calibración | 85–90 % (≈95 % cuando está segura) |
| ü frente a u, la e china, la "i" de zi/zhi, er | Formantes de la vocal comparados con tus a/i/u | Muy clara para ü/u e i; buena para e y er |
| -n frente a -ng | Formantes al final de la sílaba con un modelo entrenado | an/ang y ian/iang ~93 %, en/eng y uan/uang ~85 %, in/ing difícil |

Todas las grabaciones de referencia se han revisado con el mismo analizador: de cada sílaba suena la grabación con el tono más claro, las que no suenan al tono correcto no se usan, y si una referencia no es fiable se dibuja la curva modelo del tono en vez de la de la grabación.

Cuando no está segura, la app lo dice ("No lo tengo claro") en vez de inventarse un veredicto.

## Contenido

- **Ruta de pronunciación:** tonos (con pares de tonos, sandhi y tono neutro), aspiración, posición de la lengua, vocales difíciles y nasales.
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
