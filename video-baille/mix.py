# Mixage : voix Liam + musique fournie (×1,10, baissée sous la voix) + bruitages calés sur les mots -> audio_final.wav
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
voice = np.zeros(N); put(voice, decode('voix.wav'), VO); voice /= np.max(np.abs(voice)) + 1e-9; voice *= .9
env = np.sqrt(np.convolve(voice ** 2, np.ones(2205) / 2205, mode='same')); env = np.convolve(env, np.ones(8820) / 8820, mode='same')
duck = 1 - .5 * np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
m = decode('musique_fond.mp3', 'atempo=1.10'); music = np.tile(m, int(np.ceil(N / len(m))))[:N]; music /= np.max(np.abs(music)) + 1e-9
fade = np.ones(N); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)); music *= fade
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
def pouf(t, g=-4, r=1.0): fx('pop', t, g, r); fx('whoosh2', t - .05, g - 8, 1.3 * r, .5)
fx('descente', w(5), -12, .6, 1.4); fx('thud', w(12), -12, .6); fx('descente', w(14) + .4, -12, .7, 1.2); fx('descente', w(22) + .3, -10, .5, 1.8); fx('thud', w(26), -10, .5); fx('thud', w(26) + .3, -12, .6)
fx('pop', w(35), -6, .7); fx('impact', w(35), -12, 1.4, .5); fx('success', w(36), -14, 1.2, 1)
fx('descente', w(46), -12, .6, 1.4); fx('thud', w(49), -14, .6); fx('ding', w(53), -10, .8); fx('success', w(58), -14, 1, 1)
fx('klaxon', w(60) - .3, -16); fx('descente', w(65), -12, .6, 1.4); fx('ding2', w(74), -12, 1.4); fx('ding2', w(77), -12, .8); fx('klaxon', w(80), -18, .9)
fx('ambiance_fete', w(83), -24, 1, 4); fx('descente', w(91), -12, .6, 1.4); fx('thud', w(95), -10, .6); fx('thud', w(95) + .25, -12, .7)
fx('pigeon', w(106), -18, 1.6); fx('descente', w(113), -16, .9, .8); fx('descente', w(114) + .9, -16, 1, .8)
fx('suspense', w(127), -16, 1, 2); fx('success', w(141), -14, 1.2, 1)
fx('ambiance_fete', w(155), -24, 1, 6); fx('foule', w(167), -16, 1, 2); fx('ding', w(173), -8, .9)
fx('descente', w(177), -4, .45, 3); fx('impact', w(178), -14, .5, 2); fx('thud', w(187), -6, .6); fx('thud', w(187) + .2, -8, .7); fx('thud', w(187) + .45, -8, .5)
fx('suspense', w(193), -16, .9, 2); fx('pop', w(199), -12, .8)
fx('whoosh', w(205), -8); fx('whoosh2', w(207), -10); fx('success', w(211), -12, 1.3, 1); fx('riser', w(213), -14, 1, 2)
fx('impact', w(220), -2, .7, 1.5); fx('pop', w(220), -4, .6); fx('whoosh2', w(220), -6, .8); fx('foule_rire', w(222), -8, 1, 3); fx('foule', w(228), -12, 1, 3); fx('success', w(232), -10)
fx('descente', w(241), -10, .6, 1.4); fx('thud', w(243), -10, .6); fx('pop', w(255), -12, 1.4)
mix = voice + music * duck * db(-13) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
