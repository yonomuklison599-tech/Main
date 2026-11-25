# Vidéo « Tu viens de construire un pont suspendu »

Format viral « on part d'un problème et on construit pas à pas » : vertical 1080×1920, 30 i/s, 57,7 s.

## Ce qui retient le spectateur

- **Accroche immédiate** : la planche tombe dès la première image, pas d'intro ni de fondu.
- **Boucle problème → solution** : chaque « Mais… » casse le pont et chaque « Alors… » le reconstruit.
- **Barre de progression « TON PONT »** qui monte et qui **retombe en rouge** à chaque échec : on veut voir les 100 %.
- **Caméra toujours en mouvement** : poussée lente permanente, changement de plan toutes les 2 à 3 s, coups de zoom et secousses sur les impacts.
- **Musique qui se coupe net** à chaque échec, montée avant la révélation, final en majeur avec confettis.
- **Sous-titres karaoké** : 1 à 3 mots, mot prononcé en jaune.
- **Appel à s'abonner au milieu**, comme dans les références, et une fin coupée net qui boucle.

## Fichiers

- `pont-suspendu.mp4` : la vidéo finale.
- `voix.py` : la voix off (edge-tts `fr-FR-HenriNeural`, phrase par phrase avec des pauses) qui produit `voix.wav` et `timing.json`.
- `events.js` : la chronologie commune à l'image et au son.
- `scene.html` : l'animation en canvas 2D.
- `render.js` : le rendu image par image (Playwright + ffmpeg).
- `stills.js` : sort quelques images fixes pour contrôler le rendu.
- `mix.py` : compose la musique (synthèse, libre de droits), place les bruitages et mixe le tout (baisse de la musique sous la voix, −14 LUFS).

## Refaire la vidéo

```
python3 voix.py
node render.js timing.json muet.mp4
python3 mix.py sfx audio_final.wav
ffmpeg -i muet.mp4 -i audio_final.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest pont-suspendu.mp4
```

## Bruitages (CC0, Freesound via Openverse, attribution facultative)

- `anvil` : « Anvil Hit 1 » par michorvath (CC0) : https://freesound.org/people/michorvath/sounds/270589
- `clank` : « Concrete Hit 2 » par dslrguide (CC0) : https://freesound.org/people/dslrguide/sounds/321478
- `creak` : « Wood Creak Single V1 » par Rudmer_Rotteveel (CC0) : https://freesound.org/people/Rudmer_Rotteveel/sounds/502505
- `ding` : « Ping Ping.wav » par MATRIXXX_ (CC0) : https://freesound.org/people/MATRIXXX_/sounds/445058
- `ding2` : « ding.wav » par Daphne_in_Wonderland (CC0) : https://freesound.org/people/Daphne_in_Wonderland/sounds/127149
- `metal` : « Metal Hit 2 » par dslrguide (CC0) : https://freesound.org/people/dslrguide/sounds/321482
- `pop` : « UI Button Click » par benzix2 (CC0) : https://freesound.org/people/benzix2/sounds/467951
- `rain` : « Heavy rain outside my room.wav » par maaark (CC0) : https://freesound.org/people/maaark/sounds/23234
- `riser` : « Riser » par Rizzard (CC0) : https://freesound.org/people/Rizzard/sounds/561207
- `river` : « Stream River Water Up Close » par jackthemurray (CC0) : https://freesound.org/people/jackthemurray/sounds/433589
- `rumble` : « Sounds For Earthquakes - Metal.wav » par RutgerMuller (CC0) : https://freesound.org/people/RutgerMuller/sounds/51106
- `snap` : « Wood Break.wav » par Deathscyp (CC0) : https://freesound.org/people/Deathscyp/sounds/443293
- `splash` : « Big Splash.wav » par Bird_man (CC0) : https://freesound.org/people/Bird_man/sounds/316744
- `stress` : « Old_Truck_Metal_Squeaks-Creaks-Rattle-Impact_Door_Hollow_Open_Close_Impact.wav » par dilsun (CC0) : https://freesound.org/people/dilsun/sounds/508274
- `success` : « Achievement Happy Beeps Jingle » par CogFireStudios (CC0) : https://freesound.org/people/CogFireStudios/sounds/619838
- `tension` : « Stretch - Medium » par stevenmaertens (CC0) : https://freesound.org/people/stevenmaertens/sounds/676987
- `thud` : « ANI Big Pipe Hit » par ani_music (CC0) : https://freesound.org/people/ani_music/sounds/244983
- `thunder` : « Forest Thunder » par Electroviolence (CC0) : https://freesound.org/people/Electroviolence/sounds/234536
- `whoosh` : « Swosh swoosh whoosh air sound, free, high quality » par qubodup (CC0) : https://freesound.org/people/qubodup/sounds/60026
- `whoosh2` : « whoosh.wav » par LloydEvans09 (CC0) : https://freesound.org/people/LloydEvans09/sounds/332003
- `wind` : « WIND BLOWING.mp3 » par Podcapocalipsis (CC0) : https://freesound.org/people/Podcapocalipsis/sounds/521696

La musique est générée par `mix.py` : aucun droit tiers.
