# Voix provisoire : edge-tts phrase par phrase (à remplacer par la voix définitive) puis l'assemble avec des pauses.
import asyncio, edge_tts, os, json, subprocess, sys
import sys
VOICE, RATE, PITCH = (sys.argv[1] if len(sys.argv) > 1 else "fr-FR-RemyMultilingualNeural"), "+2%", "+0Hz"
# (texte, pause après en secondes)
SCRIPT = [
 ("Si tu fixes une hélice de ventilateur au bout d'un manche à balai, en théorie, t'as déjà une éolienne.", .3),
 ("Sauf qu'au ras du sol, l'herbe et les haies freinent le vent, et ton ampoule clignote à peine.", .35),
 ("Alors tu montes ton hélice en haut d'un mât de cent mètres.", .2),
 ("Là-haut, le vent souffle plus fort, et sa puissance grimpe au cube : deux fois plus de vent, c'est huit fois plus d'énergie.", .35),
 ("Mais ta petite hélice n'attrape qu'un filet d'air.", .3),
 ("Alors tu lui fais des pales de soixante mètres. Double leur longueur, et tu balaies quatre fois plus de vent.", .3),
 ("Sauf qu'avec deux pales, tout ton mât tremble à chaque tour.", .3),
 ("Alors tu en mets trois, une tous les cent vingt degrés, et le rotor tourne bien rond.", .3),
 ("Mais ces pales géantes font à peine quinze tours par minute, et ta génératrice en réclame mille cinq cents.", .3),
 ("Alors tu glisses entre les deux une boîte de vitesses qui multiplie la rotation par cent. C'est le multiplicateur.", .35),
 ("D'ailleurs, si t'aimes savoir comment les choses marchent, abonne-toi.", .3),
 ("Mais le lendemain, le vent tourne, et ton éolienne se retrouve de profil.", .3),
 ("Alors tu poses une girouette sur le toit, et des moteurs qui font pivoter la nacelle face au vent.", .35),
 ("Puis arrive la tempête. À quatre-vingt-dix kilomètres-heure, tes pales s'emballent.", .3),
 ("Alors tu les fais tourner sur elles-mêmes pour qu'elles laissent filer le vent. C'est la mise en drapeau.", .35),
 ("Et comme c'est le point le plus haut du coin, la foudre tombe dessus.", .25),
 ("Alors tu caches dans chaque pale un câble en cuivre qui emmène l'éclair jusqu'au sol.", .35),
 ("Ajoute un socle de mille tonnes de béton, des feux rouges pour les avions, et félicitations, t'as construit une éolienne.", .0),
]
async def one(i, txt):
    c = edge_tts.Communicate(txt, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary", proxy=os.environ.get("HTTPS_PROXY"))
    words = []
    with open(f"tmp/s{i:02d}.mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary": words.append([ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]])
    return words
async def main():
    os.makedirs("tmp", exist_ok=True)
    allw = await asyncio.gather(*[one(i, s[0]) for i, s in enumerate(SCRIPT)])
    t, out, sents, parts = 0.0, [], [], []
    for i, (w, (txt, pause)) in enumerate(zip(allw, SCRIPT)):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"tmp/s{i:02d}.mp3", "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse", "-ar", "24000", "-ac", "1", f"tmp/s{i:02d}.wav"], check=True)
        lead = w[0][0] if w else 0
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"tmp/s{i:02d}.wav"], capture_output=True, text=True).stdout)
        sents.append({"i": i, "t": round(t, 3), "end": round(t + d, 3), "text": txt})
        for o, dd, tx in w: out.append({"t": round(t + o - lead, 3), "d": round(dd, 3), "w": tx, "s": i})
        parts.append(f"tmp/s{i:02d}.wav"); t += d + pause
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono", "-t", str(max(pause, .01)), f"tmp/p{i:02d}.wav"], check=True)
        parts.append(f"tmp/p{i:02d}.wav")
    open("tmp/list.txt", "w").write("".join(f"file '{os.path.basename(p)}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "tmp/list.txt", "-c:a", "pcm_s16le", "voix.wav"], check=True)
    json.dump({"words": out, "sentences": sents, "duration": round(t, 3)}, open("timing.json", "w"), ensure_ascii=False, indent=0)
    for s in sents: print(f"{s['t']:6.2f}-{s['end']:6.2f}  {s['text'][:70]}")
    print("total", round(t, 2), "s,", len(out), "mots")
asyncio.run(main())
