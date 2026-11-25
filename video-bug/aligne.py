# Transcrit chaque bloc de voix avec horodatage par mot (faster-whisper)
import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel('small', compute_type='int8')
res = []
for f in sys.argv[1:]:
    a = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout, dtype=np.float32)
    segs, _ = m.transcribe(a, language='fr', word_timestamps=True, vad_filter=False)
    words = [{'t': round(w.start,3), 'e': round(w.end,3), 'w': w.word.strip()} for s in segs for w in s.words]
    res.append({'file': f, 'dur': len(a)/16000, 'words': words})
json.dump(res, open('alignement.json','w'), ensure_ascii=False, indent=0)
for r in res:
    gaps = [(round(r['words'][i]['t']-r['words'][i-1]['e'],2), r['words'][i]['w']) for i in range(1,len(r['words'])) if r['words'][i]['t']-r['words'][i-1]['e']>.6]
    print(r['file'], round(r['dur'],1),'s', len(r['words']),'mots | pauses >0.6s:', gaps)
    print('   ', ' '.join(w['w'] for w in r['words']))
