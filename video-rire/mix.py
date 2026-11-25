# Mixage : voix Liam + musique de fond fournie (accélérée ×1,10, baissée sous la voix) + bruitages calés sur les mots -> audio_final.wav
import json, subprocess, os, wave
import numpy as np

SR, VO = 44100, 0.15
CAP = json.load(open('timing.json'))['captions']
w = lambda i: CAP[i]['t'] + VO
DUR = CAP[-1]['e'] + VO + 1.6
N = int(DUR * SR) + SR

def decode(p, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', p] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()
def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def db(x): return 10 ** (x / 20)

# voix
voice = np.zeros(N); put(voice, decode('voix.wav'), VO); voice /= np.max(np.abs(voice)) + 1e-9; voice *= .9
env = np.sqrt(np.convolve(voice ** 2, np.ones(2205) / 2205, mode='same')); env = np.convolve(env, np.ones(8820) / 8820, mode='same')
duck = 1 - .5 * np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)

# musique fournie, accélérée sans changer la hauteur, bouclée si besoin
m = decode('musique_fond.mp3', 'atempo=1.10'); music = np.tile(m, int(np.ceil(N / len(m))))[:N]; music /= np.max(np.abs(music)) + 1e-9
fade = np.ones(N); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)); music *= fade

# bruitages
CACHE = {}
def load(n):
    if n not in CACHE:
        x = decode(f'sfx/{n}.mp3'); a = np.abs(x); x = x[np.argmax(a > a.max() * .03):]; CACHE[n] = x / (np.max(np.abs(x)) + 1e-9)
    return CACHE[n]
def pitch(x, r): return np.interp(np.arange(0, len(x), r), np.arange(len(x)), x)
def cut(x, d, f=.25):
    n = min(len(x), int(d * SR)); y = x[:n].copy(); k = min(n, int(f * SR)); y[-k:] *= np.linspace(1, 0, k); return y
sfx = np.zeros(N)
def fx(n, t, g=-6, r=1.0, d=None):
    x = load(n) if r == 1 else pitch(load(n), r)
    if d: x = cut(x, d)
    put(sfx, x, t, db(g))
fx('rire_enfant', w(5), -10, .85, 2); fx('envol', w(9), -6); fx('pop', w(12), -6, 1.3); fx('fou_rire', w(14), -9, 1, 2.2); fx('envol', w(16), -6, 1.15)
fx('whoosh2', w(19) - .1, -10, .8)                              # passage au flash-back
fx('foule', w(34), -12); fx('klaxon', w(43), -4); fx('sort', w(48), -3); fx('impact', w(48) + .1, -9, 1.2, 1.5)
fx('whoosh', w(55) - .1, -10); fx('foule_rire', w(57), -10, 1, 3); fx('rire_enfant', w(70), -11, 1.1, 1.5)
fx('dentier', w(79), -8); fx('fou_rire', w(80), -14, 1.15, 1.5)
fx('ambiance_fete', w(85), -22, 1, 10); fx('ambiance_fete', w(85) + 9.8, -22, 1, 10)
fx('rire_enfant', w(105), -9); fx('thud', w(125), -6, .6); fx('thud', w(125) + .45, -6, .55); fx('thud', w(128), -8, .5)
fx('ambiance_fete', w(148), -20, 1, 10); fx('pigeon', w(158), -6); fx('rire_enfant', w(162), -5, 1, 2.5); fx('envol', w(170), -5, .9); fx('vent_haut', w(180), -14, 1, 4)
fx('ambiance_fete', w(184), -21, 1, 10); fx('pop', w(197), -9, .8); fx('whoosh', w(204), -12, 1.4); fx('dentier', w(211), -6)
fx('vent_haut', w(216), -16, 1, 3)
fx('banane', w(242) + .05, -3); fx('thud', w(244), -6, .7); fx('whoosh2', w(249), -6, .9); fx('thud', w(254) + .4, -4, .8); fx('foule', w(255), -12, 1.1)
fx('whoosh', w(257), -8, 1.3)
fx('fou_rire', w(262), -4, 1, 3.5); fx('envol', w(271), -4); fx('envol', w(273), -5, 1.2); fx('vent_haut', w(275), -12, 1, 5)
fx('pop', w(278), -8, 1.2); fx('descente', w(301), -5)
fx('foule_rire', w(306), -8, 1, 4); fx('foule_rire', w(310) + 1.5, -12, .95, 4)
fx('pigeon', w(331), -6, 1.1); fx('fou_rire', w(336), -6, .8, 3); fx('envol', w(339), -5, .8); fx('success', w(347), -12)

mix = voice + music * duck * db(-13) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
