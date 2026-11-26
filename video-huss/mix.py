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
CHANTS = [(10, 12, 'huss1'), (17, 18, 'tchiki1'), (26, 28, 'huss2'), (36, 38, 'huss1'), (47, 48, 'tchiki1'), (67, 68, 'tchiki1'), (71, 72, 'tchiki1'), (91, 93, 'huss2'), (112, 114, 'huss1')]
def wav(n): return decode(f'sfx/{n}.wav')
for a_, b_, n in CHANTS:
    t0, t1 = CAP[a_]['t'] + VO - .06, CAP[b_]['e'] + VO + .08
    i0, i1 = int(t0 * SR), int(t1 * SR); fadeN = int(.03 * SR); env_ = np.ones(i1 - i0); env_[:fadeN] = np.linspace(1, 0, fadeN); env_[-fadeN:] = np.linspace(0, 1, fadeN); env_[fadeN:-fadeN] = 0
    voice[i0:i1] *= env_
    x = wav(n); x = x / (np.max(np.abs(x)) + 1e-9) * .9; put(voice, x, t0 + .02)
fx('thud', w(25) + .2, -10, 1.3); fx('thud', w(35) + .2, -10, 1.4); fx('impact', w(51), -10, 1.2, .6)
fx('ambiance_fete', w(80), -18, 1, 5); fx('suspense', w(94), -14, 1, 3); fx('riser', w(107), -10, 1, 1.6); fx('foule', w(115), -6, 1, 3); fx('foule_rire', w(116), -10, 1, 3); fx('suspense', w(126), -16, 1, 2); fx('pop', w(136), -10, 1.3)
mix = voice + music * duck * db(-20) + sfx * db(-6)
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix[:int(DUR * SR)]; mix[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))
with wave.open('tmp_mix.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'tmp_mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', 'audio_final.wav'], check=True)
os.remove('tmp_mix.wav'); print('ok', round(DUR, 2), 's')
