# Dónde seguir (sesión cortada el 18-10-2026 21:11)

Todo esto está en la rama `wip-perfeccion`, que NO se ha publicado. `main` (lo que está en GitHub Pages) sigue igual que antes.

## Hecho en esta rama (falta probarlo en el navegador)
- **Contenido** (informe del profesor nativo, `/home/claude/qa/reports/content.md`):
  - lecciones nuevas: A10 medio tercer tono, A11 preguntas, D5 ou·uo, D6 leer el pinyin, B7 h, C10 j·zh y E6 un·ong;
  - A8 (cambios de tono) pasa a ir antes de A7, y el bloque de vocales va justo después de tonos;
  - tarjeta de erhua;
  - iconos y curvas modelo según el contexto (el 3 delante de otra sílaba = 21; la altura del neutro depende del tono anterior);
  - trampas de escritura separadas de las notas de sonido;
  - `D.real`: lista de sílabas que existen de verdad, sacada del HSK; la tabla y los ejercicios ya no ofrecen sílabas inexistentes.
- **Veredicto** (informe del perfeccionista, `/home/claude/qa/reports/perfect.md`):
  - si sale mal lo que se practica, el veredicto es "Otra vez";
  - lo que no se ha podido medir sale como estado `na`;
  - dice con qué sílaba ha sonado (botón "Oír las dos");
  - "He oído un tono X";
  - los demás medidores van en "Otros detalles" y no cuentan;
  - una lección solo se aprueba si al menos la mitad de lo que se dice sale bien;
  - lo practicado desde la tabla cuenta para las estadísticas;
  - la calibración comprueba cada paso y avisa del ruido a partir de -50 dB;
  - las curvas ya no se cortan;
  - la r sale como nota informativa: no se puede medir con fiabilidad.
- **Detección:**
  - formantes por raíces del LPC (`formantsRoots`);
  - perfiles de bandas (`bandProfile` / `vowelBands`) comparados con la a, i, u de la calibración, con modelos nuevos en `D.models.band`, `nasal2` y `retro2`;
  - umbrales de aire según la vocal que sigue;
  - control de ruido en el aire;
  - `vowelOff` para no medir la cola de ruido.
  - Regresión con voces nativas (`/home/claude/reg/new_summ.txt`): los nativos que salen "mal" en vocales bajan de 15/22 a 1/0; en nasales, de 14/146 a 2/3; en lengua, de 38/39 a 17/16.
  - La calibración nueva guarda `vb`. Si un usuario tiene una calibración antigua, el mapa le pide que la repita.

## Pendiente (en este orden)
1. **Audio v1:** al pasar `afftdn` a la voz 1 se rompieron 11 grabaciones, porque el detector de tono se engancha al ruido musical: shi3, tang3, san2, san3, shao2, sheng2, chan4, qiang2, tang2, zhuang4 (y xun2 en v2). Hay que volver a codificar v1 SIN `afftdn`: el cambio ya está escrito en `/home/claude/work/enc3.sh`, falta ejecutarlo. Después `python3 rebuild.py`, copiar `v1.bin` a `audio/v1.mp3` y comprobar con `node /home/claude/reg/q2.js` (debe salir 0 grabaciones que fallen el tono).
2. Las grabaciones nativas que fallan alguna medida (`new.json` → nativos en "bad", sobre todo el aire de v2: chu1, chuan1…): darles menos prioridad en `Core.voicesFor` y, si fallan todas las voces de una sílaba, bajar ese "mal" a "dudoso".
3. Volver a pasar `cd /home/claude/reg && python3 reg.py /home/claude/pinyin new.json all && python3 summ.py new.json`, y probar las pantallas con Playwright: lecciones nuevas, el resultado de un intento y la calibración.
4. Actualizar el README: la tabla "Qué mide" con la fiabilidad real (nasales aproximadas; la r no se mide).
5. Hacer merge a `main` y push. Reconstruir el artefacto desde `index.html` y volver a publicarlo con los ficheros cambiados.

## Actualización 19-10-2026
- Hecho: voz 1 recodificada sin `afftdn`; las 9 grabaciones cuyo tono se estropeó vuelven a la versión anterior (`enc_old`). Añadido `D.natfail`: si la grabación nativa falla una medida, esa voz va detrás, y si fallan todas las voces de la sílaba, no se suspende por esa medida. README actualizado. Publicado en `main`.
- Pendiente:
  - prueba completa en el navegador (lecciones nuevas, pantalla de resultado, calibración nueva);
  - volver a publicar el artefacto de Claude, que sigue en la versión anterior;
  - recalcular `natfail` con `reg.py` (se calculó antes de recodificar la voz 1).
