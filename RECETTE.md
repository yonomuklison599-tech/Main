# Recette des vidéos « Dans cette ville… »

Ces règles viennent des références TikTok envoyées (@storyenblocs, @tikcast_fr, @silowblox, @mttrrs_1) et de tous les retours sur les vidéos précédentes. Chaque nouvelle vidéo les suit toutes.

## Format TikTok
- Vertical **1080×1920 (9:16)**, 30 i/s, H.264 et AAC, son à −14 LUFS.
- Durée **75 à 95 s**, soit 280 à 320 mots environ.
- **Une coupe toutes les 0,8 à 1,2 s.** Les plans qui montrent un panneau ou une pancarte restent **au moins 2,5 s**, avec le panneau cadré en entier.
- Rien d'important dans les 300 px du bas ni à droite, où se trouve l'interface de TikTok. Les sous-titres sont vers 63 % de la hauteur.

## Histoire
1. **Accroche dès le premier mot** : « Dans cette ville, [règle absurde] », puis la règle **chiffrée** ou illustrée tout de suite (« Un petit…, ça fait… ; un gros…, ça fait… »).
2. **Une origine** en une ou deux phrases (une sorcière, un clown, le maire…).
3. **3 ou 4 exemples gags du quotidien qui montent en puissance**, et des listes qui partent en vrille (« Le boulanger… Puis des jumeaux… Puis le chat. »).
4. **Interpellation directe du spectateur** : « Et toi, oui toi, dans ton lit… ».
5. « **Moi, c'est [prénom].** » Le héros est un enfant, souvent l'exception à la règle.
6. **Un méchant** (en général le maire) qui profite ou abuse de la règle.
7. **La crise**, puis **le retournement**, qui passe par un objet ou une phrase mis en place plus tôt (rappel).
8. **Une chute pince-sans-rire** et, si possible, une boucle qui renvoie au début ou au spectateur.
- De l'**humour partout** : phrases courtes, pauses avant les chutes, onomatopées.
- **Varier les fins.** Une partie des vidéos se termine par un **plot twist** qui explique, en une ou deux phrases, pourquoi tout se déroulait ainsi ou pourquoi un personnage agissait comme ça. Exemples : le méchant protégeait en fait la ville ; la règle venait du narrateur lui-même. Le twist doit être préparé par un détail visible plus tôt, pour que le spectateur ait envie de revoir la vidéo.
- **Varier les sujets** : règles absurdes, parodies de films ou de séries jamais nommés, tendances du moment.
- **Légende sans question.** La question va dans le commentaire épinglé.

## Voix
- **Une seule voix : Liam** (ElevenLabs, `eleven_v3`, français). Le narrateur est le héros : il **joue** l'histoire.
- Chaque phrase porte une indication de jeu. **L'accroche est la partie la plus énergique** (« excité », « intrigué »). Le blasé et le chuchoté sont réservés aux chutes.
- Les dialogues des personnages sont dits par Liam, avec une indication de jeu (moqueur, paniqué…).
- Le montage garde de vraies pauses avant chaque chute, et accélère au plus ×1,05 pour ne pas aplatir l'intonation.
- **Ne générer la voix qu'une fois le texte validé**, pour économiser les crédits.

## Image
- 3D en blocs, façon Roblox : tête posée sur le torse, visages expressifs (sueur, joues, larmes), couleurs saturées, décors riches (façades, intérieurs détaillés, fanions, pavés, montagnes).
- Sous-titres : **un mot à la fois**, blanc avec une ombre, dans la casse d'origine.
- **Pas** d'étiquette de chapitre ni de carte de nom. Sont autorisés : les **onomatopées** (HAHA !, PAF !, RONF, TOC TOC…), les **bulles de dialogue** et les **panneaux qui font partie du décor**.
- **La caméra vise toujours la position réelle du sujet** et contourne les obstacles. Les passants qui gênent la vue sont masqués, et la caméra ne descend jamais sous le sol.
- Gros plans **pas trop serrés**. La moustache et les accessoires ne doivent pas cacher la bouche ni les yeux.
- Aucune surface ne doit se superposer à une autre (sinon l'image scintille), et les ombres sont stabilisées.
- **Chaque plan est vérifié un par un** avec `verifier_plans.js` avant le rendu final.

## Son
- Musique : *In this town* (fournie), accélérée ×1,10 sans changer la hauteur, et baissée sous la voix.
- Bruitages calés sur les mots (ElevenLabs Sound Effects, et CC0), un par action.

## Production
- Tout est préparé dans le cloud. Le rendu final se fait sur le Mac (`git pull`, puis `render.js --gpu --hd --fps 30`, `mix.py` et ffmpeg), en environ 2 minutes.
