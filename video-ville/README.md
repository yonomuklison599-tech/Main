# « Dans cette ville » : la lune et le miroir

Une histoire courte au format viral « Dans cette ville… », en 3D avec des personnages en blocs. Vertical 1080×1920, 30 i/s, environ 111 s.

## Pipeline

1. `histoire.txt` : le texte, avec les indications de jeu du modèle ElevenLabs v3 ([whispers], [excited]…).
2. La voix est générée avec ElevenLabs (voix « Liam », modèle `eleven_v3`, en français) en 4 blocs, `voix_0..3.mp3`.
3. `aligne.py` transcrit les blocs. `montage_voix.py` resserre les silences et accélère la voix de ×1,13 sans changer sa hauteur, ce qui produit `voix.wav`. `timing.json` contient l'horodatage de chaque mot, recalé sur le texte écrit pour les sous-titres.
4. `scene.js` (avec `scene.html`) : la ville 3D (three.js), les personnages en blocs à visages expressifs et une quarantaine de plans calés sur les mots.
5. `render.js` fait le rendu image par image, éventuellement par morceaux (`--from`, `--to`).
6. `mix.py` compose la musique « storytime » (boîte à musique, piano, pizzicati, coupure sur « Rien. »), place les bruitages et baisse la musique sous la voix, à −14 LUFS.

## Sons

- `sfx/rayon, disparait, nuit, foule, billets, escaliers, miroir, manivelle, balayage, impact, suspense, oiseaux` : générés avec ElevenLabs Sound Effects.
- Les autres bruitages sont en CC0 (Freesound via Openverse). Les crédits sont dans `../video-eolienne/README.md`.
- La musique est générée par `mix.py` : aucun droit tiers.

La clé ElevenLabs n'est stockée dans aucun fichier : elle est injectée par le proxy de l'environnement.

## Rendre la vidéo sur Mac (beaucoup plus rapide)

```bash
git clone https://github.com/yonomuklison599-tech/Main.git
cd Main && git checkout claude/video-autre-sujet-tqs85w
./video-ville/rendre_mac.sh
```

Le script installe ce qui manque (Node, ffmpeg, numpy, Chromium pour Playwright), rend la 3D en 1080p à 30 i/s avec la carte graphique du Mac, mixe le son et produit `video-ville/dans-cette-ville.mp4`.
Les options de `render.js` sont `--gpu` (carte graphique), `--hd` (3D en 1080p), `--fps 30`, `--from`/`--to` (un morceau) et `--stills t1 t2…` (images de contrôle).
