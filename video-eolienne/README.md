# Vidéo « T'as construit une éolienne » (3D)

Format « on part d'un problème et on construit pas à pas », en 3D low-poly (three.js) : vertical 1080×1920, 30 i/s, environ 82 s.

## Pipeline

1. `voix.py` génère la voix phrase par phrase, puis `voix.wav` et `timing.json` (l'horodatage de chaque mot). **La voix actuelle est provisoire.**
2. `events.js` accroche chaque animation et chaque bruitage à un mot du texte : changer de voix recale tout automatiquement.
3. `scene.js` (avec `scene.html`) contient la scène 3D, les plans de caméra et l'habillage (sous-titres d'un mot, étiquettes, chiffres-chocs).
4. `render.js` fait le rendu WebGL image par image (Chromium + SwiftShader) et l'encode avec ffmpeg. `--stills t1 t2 …` sort des images de contrôle.
5. `mix.py` compose la musique (libre de droits), place les bruitages et baisse la musique sous la voix, à −14 LUFS.

```
npm install
python3 voix.py                      # ou bien déposer voix.wav + timing.json venant d'une autre voix
node render.js timing.json muet.mp4
python3 mix.py sfx audio_final.wav
ffmpeg -i muet.mp4 -i audio_final.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest eolienne.mp4
```

## Bruitages (CC0, Freesound via Openverse)

- `anvil` : « Anvil Hit 1 » par michorvath : https://freesound.org/people/michorvath/sounds/270589
- `clank` : « Concrete Hit 2 » par dslrguide : https://freesound.org/people/dslrguide/sounds/321478
- `creak` : « Wood Creak Single V1 » par Rudmer_Rotteveel : https://freesound.org/people/Rudmer_Rotteveel/sounds/502505
- `ding` : « Ping Ping.wav » par MATRIXXX_ : https://freesound.org/people/MATRIXXX_/sounds/445058
- `ding2` : « ding.wav » par Daphne_in_Wonderland : https://freesound.org/people/Daphne_in_Wonderland/sounds/127149
- `flicker` : « Desk Lamp Switch On » par nintendoto : https://freesound.org/people/nintendoto/sounds/556765
- `gears` : « mechanism.mp3 » par Rhulk : https://freesound.org/people/Rhulk/sounds/245462
- `gust` : « Wind Gust » par crashoverride6 : https://freesound.org/people/crashoverride6/sounds/146932
- `hum` : « electric humming heavy.mp3 » par Mikes-MultiMedia : https://freesound.org/people/Mikes-MultiMedia/sounds/349696
- `lightning` : « shipboard_railgun.mp3 » par deleted_user_1941307 : https://freesound.org/people/deleted_user_1941307/sounds/155790
- `metal` : « Metal Hit 2 » par dslrguide : https://freesound.org/people/dslrguide/sounds/321482
- `pop` : « UI Button Click » par benzix2 : https://freesound.org/people/benzix2/sounds/467951
- `rain` : « Heavy rain outside my room.wav » par maaark : https://freesound.org/people/maaark/sounds/23234
- `riser` : « Riser » par Rizzard : https://freesound.org/people/Rizzard/sounds/561207
- `river` : « Stream River Water Up Close » par jackthemurray : https://freesound.org/people/jackthemurray/sounds/433589
- `rumble` : « Sounds For Earthquakes - Metal.wav » par RutgerMuller : https://freesound.org/people/RutgerMuller/sounds/51106
- `servo` : « glitch_robot_2.flac » par hullum : https://freesound.org/people/hullum/sounds/415556
- `snap` : « Wood Break.wav » par Deathscyp : https://freesound.org/people/Deathscyp/sounds/443293
- `splash` : « Big Splash.wav » par Bird_man : https://freesound.org/people/Bird_man/sounds/316744
- `stress` : « Old_Truck_Metal_Squeaks-Creaks-Rattle-Impact_Door_Hollow_Open_Close_Impact.wav » par dilsun : https://freesound.org/people/dilsun/sounds/508274
- `success` : « Achievement Happy Beeps Jingle » par CogFireStudios : https://freesound.org/people/CogFireStudios/sounds/619838
- `switch` : « Light Switch Turn Off Sound » par ChrisTutorials : https://freesound.org/people/ChrisTutorials/sounds/440499
- `tension` : « Stretch - Medium » par stevenmaertens : https://freesound.org/people/stevenmaertens/sounds/676987
- `thud` : « ANI Big Pipe Hit » par ani_music : https://freesound.org/people/ani_music/sounds/244983
- `thunder` : « Forest Thunder » par Electroviolence : https://freesound.org/people/Electroviolence/sounds/234536
- `turbine` : « Wind Turbine Whine 2.wav » par DeVern : https://freesound.org/people/DeVern/sounds/434101
- `whoosh` : « Swosh swoosh whoosh air sound, free, high quality » par qubodup : https://freesound.org/people/qubodup/sounds/60026
- `whoosh2` : « whoosh.wav » par LloydEvans09 : https://freesound.org/people/LloydEvans09/sounds/332003
- `wind` : « WIND BLOWING.mp3 » par Podcapocalipsis : https://freesound.org/people/Podcapocalipsis/sounds/521696
- `zap` : « Electric zap.wav » par michael_grinnell : https://freesound.org/people/michael_grinnell/sounds/512471
