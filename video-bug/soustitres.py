# Aligne voix.wav mot par mot puis recale l'orthographe des sous-titres sur histoire.txt -> timing.json
import json, re, difflib, unicodedata, subprocess, numpy as np
from faster_whisper import WhisperModel
txt = re.sub(r'\[[^\]]*\]', '', open('histoire.txt').read())
m = WhisperModel('small', compute_type='int8')
a = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i','voix.wav','-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout, dtype=np.float32)
segs, _ = m.transcribe(a, language='fr', word_timestamps=True, initial_prompt=txt[:800])
W = [{'t': round(w.start,3), 'e': round(w.end,3), 'w': w.word.strip()} for s in segs for w in s.words]
mm = []
for w in W:
    if mm and w['w'][:1] in "'’": mm[-1]['w'] += w['w']; mm[-1]['e'] = w['e']
    else: mm.append(dict(w))
script = [x for x in txt.replace('«', '').replace('»', '').split()]
def n(s): s = unicodedata.normalize('NFD', s.lower()); return re.sub(r'[^a-z0-9]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))
script = [x for x in script if n(x)]
mm = [x for x in mm if n(x['w'])]
sm = difflib.SequenceMatcher(None, [n(x['w']) for x in mm], [n(x) for x in script], autojunk=False)
out = []
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == 'equal':
        for k in range(i2 - i1): out.append({**mm[i1 + k], 'w': script[j1 + k]})
    elif op in ('replace', 'insert'):
        t0 = mm[i1]['t'] if i1 < len(mm) and op == 'replace' else (out[-1]['e'] if out else 0)
        t1 = mm[i2 - 1]['e'] if op == 'replace' else (mm[i1]['t'] if i1 < len(mm) else t0 + .4 * (j2 - j1))
        if t1 - t0 < .18 * (j2 - j1): t1 = t0 + .18 * (j2 - j1)
        for k in range(j2 - j1):
            out.append({'t': round(t0 + (t1 - t0) * k / (j2 - j1), 3), 'e': round(t0 + (t1 - t0) * (k + 1) / (j2 - j1), 3), 'w': script[j1 + k]})
mm = out
for i, x in enumerate(mm): x['i'] = i
json.dump({'words': W, 'captions': mm, 'duration': len(a) / 16000}, open('timing.json', 'w'), ensure_ascii=False, indent=0)
print(len(mm), 'mots', round(len(a) / 16000, 1), 's')
print(' '.join(f"{x['i']}:{x['w']}" for x in mm))
