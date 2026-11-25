#!/bin/bash
# Rendu complet de la vidéo sur Mac (carte graphique) : ./rendre_mac.sh
# Résultat : video-ville/dans-cette-ville.mp4 (1080×1920, 30 i/s)
set -e
cd "$(dirname "$0")"
command -v brew >/dev/null || { echo "Installe d'abord Homebrew : https://brew.sh"; exit 1; }
command -v node >/dev/null || brew install node
command -v ffmpeg >/dev/null || brew install ffmpeg
command -v python3 >/dev/null || brew install python
python3 -c "import numpy" 2>/dev/null || python3 -m pip install --user numpy
[ -d node_modules/three ] || npm install
[ -d node_modules/playwright ] || npm install playwright@1
npx playwright install chromium
echo "▶ Rendu de l'image (3D en 1080p avec la carte graphique)…"
node render.js timing.json muet.mp4 --gpu --hd --fps 30
echo "▶ Mixage du son (voix + musique + bruitages)…"
python3 mix.py
echo "▶ Assemblage…"
ffmpeg -v error -y -i muet.mp4 -i audio_final.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart dans-cette-ville.mp4
rm -f muet.mp4
echo "✅ Terminé : $(pwd)/dans-cette-ville.mp4"
open -R dans-cette-ville.mp4 2>/dev/null || true
