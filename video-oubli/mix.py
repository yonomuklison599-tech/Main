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
we = lambda i: CAP[i]['e'] + VO
# roulette : un tic à chaque carte qui passe la ligne (même formule que scene.js)
TL = we(20) + .75; D = (3 * 10 + 7) * 330
for n in range(1, 38):
    k = 1 - (1 - n * 330 / D) ** .25; fx('pop', k * TL, -15, 1.9, .07)
fx('ding2', TL, -6); fx('riser', TL - 1.6, -16, 1, 1.6); fx('whoosh', w(21), -10); fx('success', w(23), -12)
for i in [26, 36, 46, 56, 79, 106, 112, 137, 160, 179, 213, 250, 257, 271, 280]: fx('whoosh2', w(i) - .12, -12, 1.1, .5)
for t0 in [w(29), w(74), w(93), w(146), w(150), w(228), w(238) + .1]: fx('ding', t0, -9, .7); fx('whoosh', t0, -14, .8, .8)
for t0 in [w(34) + .1, w(55), w(92), w(134), w(145) + .05, w(149) + .05]: fx('impact', t0, -9, 1, .6)
for k in range(6): fx('thud', w(94) + k * (w(99) - w(94)) / 6 + .15, -12, 1.4)
fx('success', w(154), -8); fx('impact', we(178) - .1, -8, 1.1, .6); fx('success', we(178), -9)
fx('success', w(106), -8); fx('sort', w(108), -14, 1, 2); fx('success', w(210), -12)
for k in range(12): fx('pop', w(36) + k * .05, -18, 1.5)
for k in range(5): fx('pop', w(46) + k * .18, -12, 1.2)
for k in range(12): fx('pop', w(186) + k * .12, -16, 1.6)
fx('pop', w(192), -10); fx('pop', w(195), -10); fx('pop', w(197), -10); fx('klaxon', w(197), -20, 1.2, .6)
fx('fou_rire', w(234), -10, 1, 2.2); fx('pop', w(227), -12, 1.3)
fx('suspense', w(213), -14, 1, 3); fx('suspense', w(257), -14, 1, 4); fx('riser', w(277) - 1.2, -12, 1, 1.2); fx('impact', w(278), -8, 1, .7)
fx('impact', w(280), -10, .8, 1); fx('success', w(286), -8); fx('ding2', w(288), -10)
mix = voice + music * duck * db(-20) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
