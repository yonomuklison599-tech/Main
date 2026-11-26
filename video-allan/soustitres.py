# Aligne voix.wav mot par mot puis recale l'orthographe des sous-titres sur histoire.txt -> timing.json
import json, re, difflib, unicodedata, subprocess, numpy as np
from faster_whisper import WhisperModel
txt = re.sub(r'\[[^\]]*\]', '', open('histoire.txt').read())
# temps des mots = alignement par bloc (fiable) recalé à travers les coupes de montage_voix.py puis atempo
AL = json.load(open('alignement.json')); a = np.zeros(int(float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','voix.wav'],capture_output=True,text=True).stdout)*16000))
W = []; off = 0.
for bi, blk in enumerate(AL):
    Wb = blk['words']; segs_ = []; cur = max(0, Wb[0]['t'] - .05); o = off
    for i in range(1, len(Wb)):
        gap = Wb[i]['t'] - Wb[i-1]['e']; prev = Wb[i-1]['w']
        keep = .42 if prev.endswith('...') or prev.endswith('…') else .28 if prev[-1:] in '.?!' else .14 if prev[-1:] in ',:;' else .12
        if gap > keep + .05:
            c0 = Wb[i-1]['e'] + .06; segs_.append((cur, c0, o)); o += c0 - cur + max(0, keep - .12); cur = Wb[i]['t'] - .06
    endb = min(blk['dur'], Wb[-1]['e'] + .25); segs_.append((cur, endb, o)); o += endb - cur
    def mp(t):
        for s0, s1, oo in segs_:
            if t <= s1 + 1e-6: return (oo + max(0, t - s0)) / 1.12
        return (segs_[-1][2] + t - segs_[-1][0]) / 1.12
    for w in Wb: W.append({'t': round(mp(w['t']), 3), 'e': round(mp(w['e']), 3), 'w': w['w']})
    off = o + (.3 if bi < len(AL) - 1 else 0)
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
