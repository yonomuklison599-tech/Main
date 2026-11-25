# Compose la musique (synthèse numpy), place les bruitages sur la chronologie et mixe le tout avec la voix.
# Usage : python3 mix.py <dossier_sfx> <sortie.wav>
import json, subprocess, sys, os
import numpy as np

SR = 44100
SFX_DIR, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
info = json.loads(subprocess.run(["node", "-e", f"const m=require('{HERE}/events.js');console.log(JSON.stringify(m))"], capture_output=True, text=True, check=True).stdout)
VO, EV = info["VO"], info["EV"]
T = {k: v + VO for k, v in EV.items()}
CUTS = [(a + VO, b + VO) for a, b in info["MUSIC_CUTS"]]
DUR = T["end"]; N = int(DUR * SR) + SR
rng = np.random.default_rng(3)

def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

# ---------------------------------------------------------------- musique
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
music = np.zeros(N)
def put(buf, x, t, g=1.0):
    i = int(t * SR);
    if i >= len(buf) or i < 0: return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def in_cut(t): return any(a <= t < b for a, b in CUTS)
def section(t):
    if T["storm"] <= t < T["sweep"]: return "storm"
    if T["tacoma"] <= t < T["tacomaEnd"]: return "tacoma"
    if T["riser"] <= t < T["bravo"]: return "riser"
    if t >= T["bravo"]: return "final"
    if T["newDeck"] <= t < T["riser"]: return "build"
    return "groove"

BEAT = .5  # 120 BPM
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]       # Am F C G
FINAL = [[53, 57, 60], [55, 59, 62], [48, 52, 55, 60]]                    # F G C
PLUCK_CACHE = {}
def pk(m, d=.42, b=.5):
    k = (m, d, b)
    if k not in PLUCK_CACHE: PLUCK_CACHE[k] = pluck(nf(m), d, b)
    return PLUCK_CACHE[k]
K, CL, HC, HO = kick(), clap(), hat(), hat(True)
nsteps = int(DUR / (BEAT / 2))
for s in range(nsteps):            # pas de double-croche (0,25 s)
    t = s * BEAT / 2; sec = section(t); bar = int(t // 2); ch = CHORDS[bar % 4]; st = s % 8
    if in_cut(t) and sec != "tacoma": continue
    if sec in ("groove", "build"):
        if st % 2 == 0: put(music, K, t, .9)
        if st in (2, 6): put(music, CL, t, .55)
        if st % 2 == 1: put(music, HC, t, .5)
        if sec == "build" or t > T["clear"]: put(music, HC, t + BEAT / 4, .25)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
        if st % 2 == 0 or sec == "build": put(music, pk(arp[(s // (1 if sec == 'build' else 2)) % 4] + (12 if sec == "build" and bar % 2 else 0), .4), t, .38)
        if st % 2 == 0: put(music, bass(nf(ch[0] - 12), .24), t, .55)
    elif sec == "storm":
        if st == 0: put(music, K, t, 1.0); put(music, tom(70), t, .6)
        if st == 4: put(music, tom(90), t, .5)
        if st % 4 == 2: put(music, bass(nf(45 - 12), .4), t, .6)
    elif sec == "riser":
        put(music, CL, t, .15 + .55 * (t - T["riser"]) / (T["bravo"] - T["riser"]))
        put(music, CL, t + BEAT / 4, .1 + .4 * (t - T["riser"]) / (T["bravo"] - T["riser"]))
    elif sec == "final":
        fb = int((t - T["bravo"]) // 1.0); chf = FINAL[min(fb, 2)] if fb < 3 else FINAL[2]
        if t > DUR - .4: continue
        if st % 2 == 0: put(music, K, t, .95)
        if st in (2, 6): put(music, CL, t, .5)
        put(music, HC, t, .35)
        put(music, pk(chf[s % len(chf)] + 24, .35, .8), t, .3)
        if st % 2 == 0: put(music, bass(nf(chf[0] - 12), .24), t, .6)
# nappes
for b in range(int(DUR // 2)):
    t = b * 2.0; sec = section(t)
    if in_cut(t) and sec != "tacoma": continue
    if sec in ("groove", "build"): put(music, pad([nf(m) for m in CHORDS[b % 4]], 2.0, 900), t, .22)
    if sec == "storm": put(music, pad([nf(45), nf(48), nf(51)], 2.0, 500), t, .3)
    if sec == "tacoma": put(music, pad([nf(57), nf(60), nf(63)], 2.0, 700), t, .2); put(music, bell(nf(81), 1.5), t + .5, .05)
put(music, pad([nf(m) for m in FINAL[2]] + [nf(72)], DUR - T["bravo"], 2200), T["bravo"], .3)
put(music, bell(nf(84), 2.5), T["bravo"], .25); put(music, bell(nf(79), 2.5), T["bravo"] + .25, .18)
# coupure nette : silence complet pendant les échecs (sauf tacoma), petit fondu de 15 ms
gate = np.ones(N)
for a, b in CUTS:
    i, j = int(a * SR), int(b * SR); gate[i:j] = 0
gate = np.convolve(gate, np.ones(660) / 660, mode="same")
tac = (np.arange(N) / SR >= T["tacoma"]) & (np.arange(N) / SR < T["tacomaEnd"]); gate[tac] = 1
music *= gate
music /= np.max(np.abs(music)) + 1e-9

# ---------------------------------------------------------------- voix
voice = decode(os.path.join(HERE, "voix.wav")); v = np.zeros(N); put(v, voice, VO); voice = v
voice = voice / (np.max(np.abs(voice)) + 1e-9) * .9
# ducking : enveloppe de la voix
envv = np.sqrt(np.convolve(voice ** 2, np.ones(2205) / 2205, mode="same")); envv = np.convolve(envv, np.ones(8820) / 8820, mode="same")
duck = 1 - .55 * np.clip(envv / (np.percentile(envv[envv > 1e-4], 60) + 1e-9), 0, 1)

# ---------------------------------------------------------------- bruitages
def load(name):
    for ext in ("mp3", "wav", "ogg", "flac"):
        p = os.path.join(SFX_DIR, f"{name}.{ext}")
        if os.path.exists(p):
            x = decode(p); a = np.abs(x); idx = np.argmax(a > a.max() * .05); x = x[idx:]
            return x / (np.max(np.abs(x)) + 1e-9)
    raise FileNotFoundError(name)
def pitch(x, r): return np.interp(np.arange(0, len(x), r), np.arange(len(x)), x)
def seg_(x, d, fade=.3):
    n = min(len(x), int(d * SR)); y = x[:n].copy(); f = int(fade * SR); y[-f:] *= np.linspace(1, 0, f); y[:min(f, n)] *= np.linspace(0, 1, min(f, n)); return y
S = {n: load(n) for n in ["whoosh", "whoosh2", "pop", "ding", "ding2", "creak", "snap", "splash", "river", "thunder", "rain", "clank", "metal", "anvil",
                          "thud", "wind", "stress", "riser", "success", "rumble", "tension"]}
sfx = np.zeros(N)
def db(x): return 10 ** (x / 20)
def fx(name, t, g=-6, r=1.0, d=None):
    x = S[name] if r == 1 else pitch(S[name], r)
    if d: x = seg_(x, d)
    put(sfx, x, t, db(g))
# whooshs sur les mouvements de caméra rapides
KEYS = [0, 3.85, 5.2, 6.4, 7.15, 9.45, 12.85, 15.3, 16.9, 22.7, 25.85, 27.3, 29.2, 36.2, 38.5, 40.1, 40.95, 44.85, 46.4, 47.7, 49.0, 51.7, 52.9]
for i, k in enumerate(KEYS[1:]): fx("whoosh" if i % 2 else "whoosh2", k + VO - .05, -13, 1 + .08 * (i % 3), .8)
fx("whoosh", T["plankDrop"], -8); fx("thud", T["plankLand"], -6, .8); fx("clank", T["plankLand"], -10)
for n in ("pontLabel", "heroIn", "heroBack", "span", "cableLabel", "hangLabel", "forces", "anchorLabel", "trussLabel"): fx("pop", T[n], -9, 1.1)
fx("creak", T["bend"], -4, .9); fx("creak", T["bend"] + .45, -2, .8); fx("tension", T["bend"] + .2, -10, .7, 1.0)
fx("snap", T["snap"], 0); fx("splash", T["splash1"], -2)
fx("whoosh", T["pillarDrop"], -8, .8); fx("clank", T["pillarLand"], -2, .8); fx("thud", T["pillarLand"], -6, .7); fx("splash", T["pillarLand"] + .05, -12, 1.2)
fx("thud", T["planksLand"], -8, 1.1)
fx("pop", T["half"], -6, 1.3); fx("ding", T["eight"], -6, 1, 1.4)
fx("rain", T["storm"], -13, 1, T["clear"] + .6 - T["storm"]); fx("thunder", T["thunder"] - .1, -1, 1, 6)
fx("river", T["rise"], -9, 1, T["clear"] + .6 - T["rise"]); fx("rumble", T["rise"], -8, 1, 3)
fx("snap", T["sweep"], -3, .8); fx("splash", T["sweep"] + .7, -4, .85)
fx("metal", T["tower1"], -5); fx("anvil", T["tower1"] + .05, -12); fx("metal", T["tower2"], -5, 1.06); fx("anvil", T["tower2"] + .05, -12, 1.06)
fx("tension", T["cable"], -5, 1, 1.2); fx("metal", T["cableEnd"], -10, 1.4)
fx("whoosh2", T["deck"], -6)
for i in range(13): fx("pop", T["hangers"] + i * (T["hangersEnd"] - T["hangers"]) / 13, -11, 1 + i * .05)
fx("stress", T["lean"] - .1, -1, 1, 2.2); fx("rumble", T["lean"], -8, 1.2, 1.8)
fx("whoosh", T["fix"], -6); fx("tension", T["back"], -5, .9, 1.2)
fx("whoosh", T["anchor"], -7, .7); fx("clank", T["anchorLand"], 0, .7); fx("thud", T["anchorLand"], -3, .6)
fx("whoosh2", T["cta"], -7); fx("ding2", T["ctaDing"], -5)
fx("wind", T["wind"], -6, 1, T["collapse"] + 1.2 - T["wind"]); fx("stress", T["twist"] - .5, -3, .85, 2.0)
fx("snap", T["collapse"], 0, .7); fx("rumble", T["collapse"], -6, 1, 2); fx("splash", T["splash2"], -2, .9)
fx("thud", T["stamp"], -4, .9)
fx("whoosh2", T["newDeck"], -6)
for i in range(16): fx("pop", T["truss"] + i * (T["trussEnd"] - T["truss"]) / 16, -14, 1.2 + i * .03)
fx("wind", T["wind2"], -14, 1, T["wind2End"] - T["wind2"] + .3); fx("ding2", T["holds"], -5, 1.1)
fx("whoosh", T["rails"], -8, 1.2)
for i in range(7): fx("pop", T["lamps"] + i * (T["lampsEnd"] - T["lamps"]) / 7, -9, 1 + i * .09)
fx("whoosh2", T["asphalt"], -7, .9)
r = S["riser"]; put(sfx, r[-int((T["bravo"] - T["riser"]) * SR):] if len(r) > (T["bravo"] - T["riser"]) * SR else r, T["bravo"] - min(len(r) / SR, T["bravo"] - T["riser"]), db(-8))
fx("success", T["bravo"], -4); fx("ding", T["bravo"], -10, 1.2, 1.2)
fx("whoosh", (T["car"] + T["carEnd"]) / 2 - .3, -12, .8)

# ---------------------------------------------------------------- mixage
tt = np.arange(N) / SR
boost = 1 + (db(10) - 1) * np.clip((tt - (T["bravo"] + 2.4)) / .6, 0, 1)   # la musique remonte quand la voix se tait
mix = voice * db(0) + music * duck * boost * db(-12) + sfx * db(-7)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix[: int(DUR * SR)]
fadeN = int(.25 * SR); mix[-fadeN:] *= np.linspace(1, 0, fadeN)
tmp = OUT + ".raw.wav"
import wave
with wave.open(tmp, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "2", OUT], check=True)
os.remove(tmp)
with wave.open(os.path.join(os.path.dirname(OUT), "musique_seule.wav"), "wb") as w:
    m = music[: int(DUR * SR)] * .8; w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m * 32767).astype(np.int16).tobytes())
print("ok", DUR, "s")
