# Vidéo « Si tu tombes dans un lac gelé »

Animation verticale 1080×1920, 30 i/s, 27 s : voix off, sous-titres mot par mot, style motion design 2D.

- `scene.html` : la scène en canvas 2D. `window.render(t)` dessine l'image à l'instant t.
- `voix.mp3` et `mots.json` : la voix off (edge-tts, voix `fr-FR-RemyMultilingualNeural`, débit -6 %) et l'horodatage de chaque mot.
- `render.js` : rend la scène image par image avec Playwright et encode avec ffmpeg.
- `stills.js` : sort quelques images fixes pour contrôler le rendu.
- `lac-gele.mp4` : la vidéo finale.

Pour refaire le rendu : `node render.js mots.json muet.mp4`, puis mixer `voix.mp3` (décalée de 0,3 s) avec ffmpeg.
