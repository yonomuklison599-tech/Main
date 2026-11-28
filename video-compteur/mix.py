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
for i in [24, 31, 36, 43, 48, 100, 106, 112, 120, 131, 138, 148, 208, 221, 265, 284, 295, 343, 347]: fx('whoosh2', w(i) - .12, -13, 1.1, .5)
fx('ambiance_fete', 0, -26, 1, 4.5); fx('pop', w(13), -10, 1.3); fx('ding', w(16), -14, 1.4)
fx('ding2', w(30), -10); fx('ding', w(35), -12, 1.2); fx('ding', w(38), -12, 1.3); fx('foule_rire', w(24), -24, 1, 2)
for i in [45, 57, 63, 71]: fx('ding', w(i), -10, .7)
fx('suspense', w(48), -18, 1, 3); fx('thud', w(109), -6, 1.1); fx('success', w(110), -18); fx('impact', w(115), -10, 1, .5)
fx('suspense', w(120), -14, 1, 4); fx('pop', w(133), -12); fx('impact', w(136), -12, 1.2, .4); fx('pop', w(141), -12); fx('impact', w(145), -12, 1.2, .4); fx('pop', w(151), -12); fx('impact', w(155), -12, 1.2, .4)
fx('suspense', w(208), -14, 1, 5)
for k in range(46): bip(w(221) + k * 0.95, -18)
fx('impact', w(259), -10, .7, 1); fx('riser', w(274), -16, 1, 1.4); fx('whoosh', w(276), -12, 1, .6); fx('suspense', w(284), -16, 1, 3)
fx('riser', w(343) - 1.2, -10, 1, 1.2); fx('ding2', w(344), -6); fx('success', w(363), -8); fx('ding2', w(363) + .1, -10)
for k in range(6): bip(w(365) + k * .55, -10 + k)
for i in [52, 68, 86, 157, 178, 198, 232, 316, 318, 320, 369, 376]: fx('whoosh2', w(i) - .12, -14, 1.1, .5)
fx('foule_rire', w(58), -16, 1, 2.5); fx('ambiance_fete', w(80), -22, 1, 2.5); fx('pop', w(94), -8, 1.3); fx('ding', w(95), -10, 1.2); fx('descente', w(98), -14, 1, 1.5)
fx('suspense', w(157), -16, 1, 4); fx('ding', w(166), -12, .7); fx('riser', w(203) - .8, -14, 1, 1); fx('impact', w(207), -12, 1, .5)
for k in range(3): fx('ding', w(316) + k * (w(322) - w(316)) / 3, -12, .8 + k * .1)
fx('success', w(393), -10); fx('ding2', w(394), -10); fx('success', w(405), -6); fx('ding2', w(405) + .15, -8)
for k in range(30): bip(w(376) + k * .9, -20)
mix = voice + music * duck * db(-20) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
