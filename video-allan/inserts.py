# Insère les vrais sons (huss / tchiki) dans les silences de la narration, aux marqueurs {H} {T} de histoire_src.txt
import re, json, subprocess, unicodedata, numpy as np, wave
SR = 44100
def n(s): s = unicodedata.normalize('NFD', s.lower()); return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))
src = re.sub(r'\[[^\]]*\]', '', open('histoire_src.txt').read()).replace('«', '').replace('»', '')
marks, k = [], 0
for tok in src.split():
    m = re.fullmatch(r'\{(H|T)\}', tok)
    if m: marks.append((k - 1, m.group(1))); continue
    if n(tok): k += 1
def load(f): return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout, dtype=np.float32).copy()
SND = {'H': load('sfx/huss.wav'), 'T': load('sfx/tchiki.wav')}
TXT = {'H': 'HUSS HUSS HUSS', 'T': 'TCHIKI BRRR'}
d = json.load(open('timing.json')); C = d['captions']; v = load('voix.wav')
def rms(x): x = x[np.abs(x) > .02]; return np.sqrt(np.mean(x ** 2))
VR = rms(v)   # niveau des sons calé sur la voix (+2 dB)
out, cur, shift, events, newcap = [], 0, 0.0, [], []
mi = {i: s for i, s in marks}
for c in C:
    c2 = dict(c); c2['t'] = round(c['t'] + shift, 3); c2['e'] = round(c['e'] + shift, 3); newcap.append(c2)
    if c['i'] in mi:
        s = mi[c['i']]; cut = c['e'] + .12; ci = int(cut * SR); out.append(v[cur:ci]); cur = ci
        x = SND[s] * (VR * 10 ** (2 / 20) / (rms(SND[s]) + 1e-9)); gap = np.zeros(int(.08 * SR), np.float32)
        t0 = cut + shift + .08; events.append({'t': round(t0, 3), 'e': round(t0 + len(x) / SR, 3), 's': s})
        newcap.append({'t': round(t0, 3), 'e': round(t0 + len(x) / SR, 3), 'w': TXT[s], 'chant': s})
        out += [gap, x.astype(np.float32), np.zeros(int(.12 * SR), np.float32)]; shift += .08 + len(x) / SR + .12
out.append(v[cur:]); y = np.concatenate(out)
for i, c in enumerate(newcap): c['i'] = i
d['captions'] = newcap; d['events'] = events; d['duration'] = len(y) / SR; json.dump(d, open('timing.json', 'w'), ensure_ascii=False, indent=0)
with wave.open('voix.wav', 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(len(events), 'sons insérés', round(len(y) / SR, 1), 's'); print(' '.join(f"{c['i']}:{c['w']}" for c in newcap))
