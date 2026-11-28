# Ajoute des silences après certains mots (roulette qui s'arrête, suspense) et décale les sous-titres
import json, subprocess, numpy as np, wave
SR = 44100; ADD = {15: 1.5, 105: .45, 172: .4, 176: .3}
v = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i','voix.wav','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout, dtype=np.float32)
d = json.load(open('timing.json')); C = d['captions']; out, cur, sh = [], 0, 0.
for c in C:
    c['t'] = round(c['t'] + sh, 3); c['e'] = round(c['e'] + sh, 3)
    if c['i'] in ADD:
        ci = int((c['e'] - sh + .08) * SR); out += [v[cur:ci], np.zeros(int(ADD[c['i']] * SR), np.float32)]; cur = ci; sh += ADD[c['i']]
out.append(v[cur:]); y = np.concatenate(out); d['duration'] = len(y) / SR; json.dump(d, open('timing.json','w'), ensure_ascii=False, indent=0)
with wave.open('voix.wav','wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes())
print(round(len(y)/SR,1), 's')
