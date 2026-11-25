# « Dans cette ville » : musique storytime composée en code + bruitages (ElevenLabs/CC0) + voix Liam -> audio_final.wav
import json, subprocess, os, wave
import numpy as np
SR = 44100; VO = 0.15
rng = np.random.default_rng(5)
CAP = json.load(open('timing.json'))['captions']
import re
nrm = lambda x: re.sub(r'[.,:;!?…«»"]', '', x.lower())
def find(word, occ=1):
    n = 0
    for c in CAP:
        if nrm(c['w']) == nrm(word):
            n += 1
            if n == occ: return c['t'] + VO
    raise KeyError(word)
E = dict(choisit=find('choisit'), disparait=find('disparaît'), gens=find('gens', 2), boulangerie=find('boulangerie'), baguette=find('baguette'), seule=find('seule'),
         minuit=find('minuit'), prie=find('prie'), voisin=find('voisin'), noe=find('noé'), jade=find('jade'), six=find('six'), zero=find('zéro'), voit=find('voit'),
         tour=find('tour'), quarante=find('quarante'), panneau=find('panneau'), honnete=find('honnête'), evid=find('évidemment'), nuit=find('nuit', 2), rayon=find('rayon'),
         volets=find('volets'), yeux=find('yeux'), jadeFix=find('jade', 2), rebondit=find('rebondit'), miroir=find('miroir'), renvoyait=find('renvoyait'), croissants=find('croissants'),
         couru=find('couru'), quarante2=find('quarante', 2), ascenseur=find("l'ascenseur"), gardes=find('gardes'), billets=find('billets'), pousse=find('miroir', 2), rien=find('rien'),
         fesses=find('fesses'), bas=find('bas'), crier=find('crier'), manivelle=find('manivelle'), clac1=find('clac'), clac2=find('clac', 2), clac3=find('clac', 3), toits=find('toits'),
         chat=find('chat'), remonte=find('remonté'), matin2=find('matin', 3), bankerPJ=find('banquier', 4), billet=find('billet'), depuis=find('depuis'), ronfle=find('ronfle'),
         regarde=find('regarde', 2), hier=find('hier'), rouge=find('rouge'), pasLune=find('venait'))
E['four'] = E['boulangerie'] + 1.1; E['pain'] = E['boulangerie'] + .2; E['tourne2'] = E['clac1'] - .35; E['encore'] = E['clac2']; E['encore2'] = E['clac3']; E['deuxieme'] = E['rouge'] - .5
DUR = CAP[-1]['e'] + VO + 1.8; N = int(DUR * SR) + SR
def decode(p): return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout, dtype=np.float32).copy()
def lp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4); return np.fft.irfft(X, len(x))
def env_ad(n, a, d):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na); e[na:] = np.exp(-np.arange(n - na) / (d * SR)); return e
def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def lp_fast(x, fc):  # filtre passe-bas rapide (FFT)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4); return np.fft.irfft(X, len(x))
def kick():
    n = int(.38 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) + .3 * np.sin(ph) * np.exp(-t * 60)
def clap():
    n = int(.25 * SR); nz = hp_fast(rng.standard_normal(n), 900); e = np.zeros(n)
    for o in (0, .011, .022): i = int(o * SR); e[i:] += np.exp(-np.arange(n - i) / (.03 * SR))
    return nz * e * .5
def hat(open_=False):
    n = int((.18 if open_ else .05) * SR); return hp_fast(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / ((.06 if open_ else .012) * SR)) * .35
def tom(f0):
    n = int(.5 * SR); t = np.arange(n) / SR; f = f0 * (1 + .6 * np.exp(-t * 20)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
def pluck(freq, dur=.45, bright=.5):  # Karplus-Strong
    n = int(dur * SR); p = max(2, int(SR / freq)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * (.994 - .01 * (1 - bright))
    return out * env_ad(n, .002, dur * .5)
def saw(freq, n, detune=0):
    t = np.arange(n) / SR; return 2 * ((t * freq * (1 + detune)) % 1) - 1
def bass(freq, dur):
    n = int(dur * SR); x = saw(freq, n) + .5 * np.sin(2 * np.pi * freq * np.arange(n) / SR)
    return lp_fast(x, 380) * env_ad(n, .005, dur * .6)
def pad(freqs, dur, fc=1400):
    n = int(dur * SR); x = sum(saw(f, n, d) for f in freqs for d in (-.004, 0, .005)) / (3 * len(freqs))
    e = np.minimum(1, np.arange(n) / (.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (.5 * SR)); return lp_fast(x, fc) * e
def bell(freq, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * freq * t) + .4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 3)


def nf(m): return 440 * 2 ** ((m - 69) / 12)
def piano(freq, dur=1.6, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for h, a in [(1, 1), (2, .45), (3, .22), (4, .12), (5, .06)]: x += a * np.sin(2 * np.pi * freq * h * t * (1 + .0004 * h * h)) * np.exp(-t * (1.6 + h * .9))
    return x * np.minimum(1, t / .004) * vel * .5
def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def section(t):
    if t < E['noe']: return 'mystere'
    if t < E['nuit']: return 'chaleur'
    if t < E['rebondit']: return 'tension'
    if t < E['couru']: return 'revel'
    if t < E['rien']: return 'course'
    if t < E['fesses']: return 'silence'
    if t < E['remonte'] + .3: return 'climax'
    if t < E['depuis']: return 'matin'
    if t < E['hier']: return 'douce'
    return 'fin'
music = np.zeros(N)
MIN = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]     # Am F C E
MAJ = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]     # C G Am F
BEAT = 60 / 120; K, CL, HC = kick(), clap(), hat()
BELL = {}; PK = {}; PN = {}
def bl(m, d=1.2):
    if (m, d) not in BELL: BELL[(m, d)] = bell(nf(m), d)
    return BELL[(m, d)]
def pz(m, d=.3):
    if (m, d) not in PK: PK[(m, d)] = pluck(nf(m), d, .3)
    return PK[(m, d)]
def pn(m, d=1.6):
    if (m, d) not in PN: PN[(m, d)] = piano(nf(m), d)
    return PN[(m, d)]
for s in range(int(DUR / (BEAT / 2))):
    t = s * BEAT / 2; sec = section(t); bar = int(t // 2); st = s % 8
    ch = (MAJ if sec in ('matin', 'douce') else MIN)[bar % 4]
    arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 24, ch[0] + 36, ch[2] + 24, ch[1] + 24, ch[2] + 24]
    if sec == 'mystere':
        put(music, bl(arp[st], 1.0), t, .16)
        if st == 0: put(music, pn(ch[0] - 12, 2.2), t, .5)
    elif sec == 'chaleur':
        put(music, bl(arp[st], .9), t, .13)
        if st % 4 == 0: put(music, K, t, .45)
        if st % 2 == 0: put(music, pz(ch[0], .35), t, .35)
        if st in (2, 6): put(music, HC, t, .25)
        if st == 0: put(music, pn(ch[0] - 12, 2.2), t, .45); put(music, pn(ch[1], 2.0), t, .25)
    elif sec == 'tension':
        put(music, HC, t, .18 + .25 * (t - E['nuit']) / (E['rebondit'] - E['nuit']))
        if st == 0: put(music, pn(45 - 12, 2.5), t, .55)
        if st % 4 == 0: put(music, bl(81 if st == 0 else 80, .6), t, .08)
    elif sec == 'revel':
        if st % 4 == 0: put(music, K, t, .7)
        if st == 0: put(music, pn(ch[0] - 12, 2.2), t, .6)
        put(music, bl(arp[st] - 12, .8), t, .1)
    elif sec == 'course':
        k = (t - E['couru']) / (E['rien'] - E['couru'])
        if st % 2 == 0: put(music, K, t, .8)
        if st in (2, 6): put(music, CL, t, .45)
        put(music, HC, t, .3); put(music, HC, t + BEAT / 4, .2)
        put(music, pz(arp[st] - 12, .25), t, .4); put(music, pz(arp[(st + 2) % 8] - 12, .2), t + BEAT / 4, .25 + .2 * k)
        if st % 2 == 0: put(music, bass(nf(ch[0] - 12), .24), t, .5)
    elif sec == 'climax':
        k = max(0, (t - E['crier']) / (E['remonte'] + .3 - E['crier']))
        if st % 2 == 0: put(music, K, t, .5 + .5 * k)
        if k > .3: put(music, CL, t, .15 + .4 * k)
        put(music, pz(arp[st] - 12, .25), t, .35); put(music, bl(arp[st], .7), t, .1 + .1 * k)
        if st % 2 == 0: put(music, bass(nf(ch[0] - 12), .24), t, .6)
    elif sec == 'matin':
        put(music, bl(arp[st], 1.2), t, .14)
        if st == 0: put(music, pn(ch[0] - 12, 2.4), t, .5); put(music, pn(ch[2], 2.2), t, .3)
    elif sec == 'douce':
        put(music, bl(arp[st], 1.0), t, .12)
        if st % 4 == 0: put(music, K, t, .35)
        if st % 2 == 0: put(music, pz(ch[0], .35), t, .3)
        if st == 0: put(music, pn(ch[0] - 12, 2.2), t, .4)
    elif sec == 'fin':
        if st == 0: put(music, pn(45 - 12, 3.0), t, .55); put(music, bl(81, 2.0), t + .5, .1)
        if st == 4: put(music, bl(76, 1.5), t, .07)
for b in range(int(DUR // 2)):
    t = b * 2.0; sec = section(t)
    if sec == 'silence': continue
    chs = (MAJ if sec in ('matin', 'douce') else MIN)[b % 4]
    put(music, pad([nf(m) for m in chs], 2.0, 700 if sec in ('tension', 'fin', 'revel') else 1100), t, .22 if sec != 'climax' else .32)
gate = np.ones(N); i, j = int(E['rien'] * SR), int(E['fesses'] * SR); gate[i:j] = .12
music *= np.convolve(gate, np.ones(880) / 880, mode='same'); music /= np.max(np.abs(music)) + 1e-9

import glob
ext = sorted(glob.glob('musique_fond.*'))
if ext:   # musique fournie : accélérée (+12 %) et bouclée sur toute la durée, coupure gardée sur « Rien. »
    raw = decode(ext[0]); tmpf = 'tmp_fast.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ext[0], '-af', 'atempo=1.12', '-ac', '1', '-ar', str(SR), tmpf], check=True)
    fast = decode(tmpf); os.remove(tmpf); reps = int(np.ceil(N / len(fast))); m2 = np.tile(fast, reps)[:N]
    gate2 = np.ones(N); gate2[int(E['rien'] * SR):int(E['fesses'] * SR)] = .15
    music = m2 * np.convolve(gate2, np.ones(880) / 880, mode='same'); music /= np.max(np.abs(music)) + 1e-9
voice = decode('voix.wav'); v = np.zeros(N); put(v, voice, VO); voice = v / (np.max(np.abs(v)) + 1e-9) * .9
envv = np.sqrt(np.convolve(voice ** 2, np.ones(2205) / 2205, mode='same')); envv = np.convolve(envv, np.ones(8820) / 8820, mode='same')
duck = 1 - .5 * np.clip(envv / (np.percentile(envv[envv > 1e-4], 60) + 1e-9), 0, 1)

def load(name):
    x = decode(f'sfx/{name}.mp3'); a = np.abs(x); x = x[np.argmax(a > a.max() * .03):]; return x / (np.max(np.abs(x)) + 1e-9)
def pitch(x, r): return np.interp(np.arange(0, len(x), r), np.arange(len(x)), x)
def seg_(x, d, fade=.3):
    n = min(len(x), int(d * SR)); y = x[:n].copy(); f = min(n, int(fade * SR)); y[-f:] *= np.linspace(1, 0, f); return y
sfx = np.zeros(N); CACHE = {}
def db(x): return 10 ** (x / 20)
def fx(name, t, g=-6, r=1.0, d=None):
    if name not in CACHE: CACHE[name] = load(name)
    x = CACHE[name] if r == 1 else pitch(CACHE[name], r)
    if d: x = seg_(x, d)
    put(sfx, x, t, db(g))
# ambiance de nuit
for a, b in [(0, E['matin2'] - .2), (E['regarde'] - .2, DUR)]:
    t = a
    while t < b: fx('nuit', t, -21, 1, min(11.5, b - t)); t += 11
fx('oiseaux', E['matin2'], -14, 1, 6)
# rayons et disparitions
fx('rayon', E['choisit'] - .4, -8); fx('disparait', E['disparait'], -4); fx('foule', E['gens'] + .2, -13)
fx('rayon', E['boulangerie'] - .5, -10); fx('disparait', E['four'], -6); fx('pop', E['seule'], -6, .8)
fx('ding', E['minuit'], -9, .55, 1.5); fx('ding', E['minuit'] + .55, -11, .55, 1.5)
fx('rayon', E['prie'] - .1, -14, .9)
fx('suspense', E['nuit'] - .3, -8); fx('rayon', E['rayon'] - .3, -6, .95)
fx('thud', E['volets'] + .1, -10, 1.3); fx('pop', E['yeux'] + .1, -10, .7)
fx('impact', E['rebondit'] - .05, -3); fx('balayage', E['rebondit'], -8)
fx('ding2', E['miroir'] + .2, -9, .9); fx('pop', E['croissants'], -8, .75)
fx('escaliers', E['quarante2'] - .1, -6, 1, 3.2); fx('ding', E['ascenseur'] + .4, -10, 1.3, 1); fx('billets', E['billets'] - .4, -7)
fx('miroir', E['pousse'] + .2, -4); fx('impact', E['rien'] - .05, -6, 1.3, 1.5); fx('miroir', E['fesses'] + .1, -6, 1.1); fx('pop', E['fesses'] + .9, -8, .6)
fx('disparait', E['bas'] + .2, -9, .8); fx('suspense', E['crier'] - .5, -9)
for c in ('clac1', 'clac2', 'clac3'): fx('manivelle', E[c] - .08, -3, 1 + .06 * int(c[-1]), .6); fx('thud', E[c], -8, 1.4)
fx('riser', E['toits'] - 1.6, -8); fx('balayage', E['toits'], -4); fx('foule', E['chat'], -9, 2.2, .8); fx('balayage', E['remonte'] - .3, -4, .85)
fx('impact', E['remonte'] + .6, 0); fx('disparait', E['remonte'] + .8, -4, .8)
fx('foule', E['bankerPJ'] + .4, -14, 1.1); fx('pop', E['billet'], -6, .9)
fx('suspense', E['hier'] - .3, -9); fx('rayon', E['rouge'] - .3, -6, .7); fx('impact', E['pasLune'] + .6, -3, .9)
# souffles sur les coupes
for k in ['disparait', 'boulangerie', 'minuit', 'noe', 'jade', 'tour', 'nuit', 'jadeFix', 'rebondit', 'renvoyait', 'couru', 'gardes', 'pousse', 'manivelle', 'toits', 'matin2', 'depuis', 'hier']:
    fx('whoosh' if hash(k) % 2 else 'whoosh2', E[k] - .12, -19, 1.1, .6)
for k in ['noe', 'jade', 'six', 'zero', 'quarante', 'panneau', 'miroir', 'quarante2', 'matin2']: fx('pop', E[k] + .2, -11, 1.15)
# ronflements (synthèse simple)
def snore(d=1.2):
    n = int(d * SR); tt_ = np.arange(n) / SR; env = np.sin(np.pi * tt_ / d) ** 2
    return lp_fast(rng.standard_normal(n) * (1 + .8 * np.sin(2 * np.pi * 28 * tt_)), 500) * env * .5
for k in range(3): put(sfx, snore(), E['ronfle'] - .1 + k * 1.4, db(-8))

tt = np.arange(N) / SR
mix = voice + music * duck * db(-13) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True); os.remove('tmp_mix.wav')
m = music[:int(DUR * SR)] * .8
with wave.open('musique_seule.wav', 'wb') as f: f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((m * 32767).astype(np.int16).tobytes())
print('ok', round(DUR, 2), 's')
