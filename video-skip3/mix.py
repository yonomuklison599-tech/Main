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
def bip(t0, g_=-10):
    n = int(.13 * SR); tt = np.arange(n) / SR; x = np.sin(2 * np.pi * 1050 * tt) * np.minimum(1, np.minimum(tt / .005, (.13 - tt) / .02)); put(sfx, x * .9, t0, db(g_))
TL = we(17) + .75; D = (5 * 5 + 4) * 330
for n in range(1, 30):
    k = 1 - (1 - n * 330 / D) ** .25; fx('pop', k * TL, -15, 1.9, .07)
fx('impact', TL, -6, .8, 1); fx('riser', TL - 1.6, -16, 1, 1.6)
for k in range(3): bip(.2 + k * .9, -14)
for i in [22, 44, 70, 88, 108, 116, 135, 144, 158, 174]: fx('whoosh2', w(i) - .12, -12, 1.1, .5)
fx('impact', w(27), -8, 1, .6); fx('klaxon', w(33), -16, 1, .5); fx('impact', w(34), -4, .7, 1); fx('pop', w(36), -10)
fx('suspense', w(44), -14, 1, 3); fx('impact', w(55), -6, .7, 1); fx('whoosh', w(63), -8, 1.6, .5); fx('descente', w(64), -14, 1, 2)
for k in range(12): bip(w(70) + k * .9, -12)
fx('pop', w(83), -12); fx('suspense', w(88), -18, 1, 3)
for k in range(5): bip(w(108) + k * .5, -16)
for k in range(14): bip(w(116) + k * .9, -16)
fx('riser', w(139) - .8, -10, 1, 1.2); fx('ding2', w(142), -6); fx('success', w(150), -12)
fx('suspense', w(158), -16, 1, 3); fx('success', w(174), -10); fx('foule', w(179), -18, 1, 1.4); fx('ding2', w(192), -8)
mix = voice + music * duck * db(-20) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
