# Génère la voix off phrase par phrase (edge-tts, fr-FR-HenriNeural) puis l'assemble avec des pauses.
import asyncio, edge_tts, os, json, subprocess, sys
VOICE, RATE, PITCH = "fr-FR-HenriNeural", "+4%", "-2Hz"
# (texte, pause après en secondes)
SCRIPT = [
 ("Si tu poses une planche au-dessus d'une rivière, en théorie, t'as déjà un pont.", .35),
 ("Mais dès que tu marches au milieu, elle plie… et elle casse.", .45),
 ("Alors tu plantes un pilier au milieu de la rivière.", .2),
 ("La portée est deux fois plus courte, donc la planche plie huit fois moins.", .4),
 ("Mais au premier orage, la rivière gonfle, et le courant arrache ton pilier.", .45),
 ("Alors, plus rien dans l'eau. Tu montes une tour sur chaque rive, et tu tends un câble d'acier entre les deux.", .25),
 ("Tu y suspends la route avec des câbles verticaux : les suspentes.", .35),
 ("Mais le câble tire tellement fort qu'il couche les tours vers la rivière.", .4),
 ("Alors tu prolonges le câble derrière chaque tour, et tu l'ancres dans un énorme bloc de béton enterré.", .3),
 ("Et si t'as appris un truc, abonne-toi.", .3),
 ("Mais un jour de grand vent, ta route trop souple se met à onduler… se tord… et s'effondre.", .35),
 ("C'est exactement ce qui est arrivé au pont de Tacoma, en 1940.", .4),
 ("Alors tu rigidifies la route avec une poutre en triangles, que le vent ne peut plus tordre.", .3),
 ("Tu ajoutes des garde-corps, des lampadaires, et une couche de bitume.", .4),
 ("Félicitations, tu viens de construire un pont suspendu.", .0),
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
