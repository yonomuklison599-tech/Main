# Resserre les silences de la voix ElevenLabs et accélère légèrement (sans changer la hauteur) -> voix.wav
import json, subprocess, numpy as np
SR = 44100
AL = json.load(open('alignement.json'))
DRAMA = {'Au', 'Depuis,', 'Hier,', 'Rien.', 'Il', 'En'}   # pauses dramatiques conservées un peu plus longues
def load(f): return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout, dtype=np.float32)
out = []
for bi, blk in enumerate(AL):
    a = load(blk['file']); W = blk['words']
    cur = max(0, W[0]['t'] - .05)
    for i in range(1, len(W)):
        gap = W[i]['t'] - W[i-1]['e']
        if gap > .38:
            keep = .62 if W[i]['w'] in DRAMA else min(.42, .22 + .25 * (gap - .38))
            cut0 = W[i-1]['e'] + .06; out.append(a[int(cur*SR):int(cut0*SR)])
            out.append(np.zeros(int((keep - .12) * SR), np.float32)); cur = W[i]['t'] - .06
    out.append(a[int(cur*SR):int(min(len(a)/SR, W[-1]['e'] + .25)*SR)])
    if bi < len(AL) - 1: out.append(np.zeros(int(.4 * SR), np.float32))
y = np.concatenate(out)
f = int(.004 * SR)
open('tmp_voix.raw','wb').write(y.astype(np.float32).tobytes())
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','tmp_voix.raw','-af','atempo=1.13,highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=80','voix.wav'],check=True)
subprocess.run(['rm','tmp_voix.raw'])
print(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','voix.wav'],capture_output=True,text=True).stdout)
