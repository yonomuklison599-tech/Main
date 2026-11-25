// « Dans cette ville, chaque fois que tu rigoles, tu t'envoles » — rendu déterministe : window.render(t)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
await Promise.all([document.fonts.load("900 64px 'Inter Display'"), document.fonts.load("800 34px 'Inter Display'")]);

const HD = new URLSearchParams(location.search).has('hd'), CLEAN = new URLSearchParams(location.search).has('clean');   // ?clean : image sans habillage (photo de profil)
const W = 1080, H = 1920, VO = 0.15, GW = HD ? 1080 : 720, GH = HD ? 1920 : 1280;
const glc = document.getElementById('gl'); glc.width = GW; glc.height = GH;
const out = document.getElementById('out'), g = out.getContext('2d');
let CAP = [], E = {}, END = 0, SHOTS = [];

// ---------------------------------------------------------------- utilitaires
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const easeBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const win = (t, a, b, f = .2) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0, ...o });
const BLOCKERS = [];   // objets qui bloquent la caméra (anti-occlusion)
const box = (w, h, d, m, r = 0) => { const geo = r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function textTex(lines, { w = 1024, h = 512, bg = '#fff8e8', fg = '#2a1c08', border = '#d4462f', size = 110 } = {}) {
  return canvasTex(w, h, c => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = border; c.lineWidth = 26; c.strokeRect(13, 13, w - 26, h - 26);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${size}px 'Inter Display'`;
    lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.08)); });
}

// ---------------------------------------------------------------- moteur
const AVATAR = new URLSearchParams(location.search).has('avatar');   // ?avatar : Tom seul sur fond transparent (photo de profil)
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true, alpha: AVATAR });
renderer.setPixelRatio(1); renderer.setSize(GW, GH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe7ff, 160, 900);
const camera = new THREE.PerspectiveCamera(40, W / H, .05, 4000);
const composer = new EffectComposer(renderer); composer.setSize(GW, GH); composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(GW / 2, GH / 2), .22, .3, .98)); composer.addPass(new OutputPass());
const hemi = new THREE.HemisphereLight(0xdff0ff, 0x7a8a5a, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dd, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const camLight = new THREE.PointLight(0xffffff, 6, 14, 1.6); scene.add(camLight);
const SUN_DIR = V(.45, .8, .4).normalize();

// ciel + nuages
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#3f8fe6') }, mid: { value: new THREE.Color('#8cc6f5') }, bot: { value: new THREE.Color('#dff0ff') } },
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .1 ? mix(mid, top, smoothstep(.1,.6,h)) : mix(bot, mid, smoothstep(-.05,.1,h)); gl_FragColor = vec4(c,1.); }' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat));
const cloudMat = mat('#ffffff', { roughness: 1 });
function cloud(x, y, z, s) { const c = new THREE.Group(); c.position.set(x, y, z); const r = rng(Math.round(x * 7 + z));
  for (let i = 0; i < 6; i++) { const b = box((5 + r() * 6) * s, (3 + r() * 2) * s, (5 + r() * 4) * s, cloudMat, 1.2 * s); b.castShadow = false; b.position.set((i - 2.5) * 3.6 * s, r() * 1.5 * s, (r() - .5) * 4 * s); c.add(b); }
  scene.add(c); return c; }
{ const r = rng(5); for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = 150 + r() * 500; cloud(Math.cos(a) * d, 110 + r() * 140, Math.sin(a) * d, 1.6 + r() * 1.6); } }
// couche de nuages traversée par Lou et Tom
for (const [x, z] of [[-40, -70], [-15, -55], [-45, -40], [-20, -80], [5, -65], [-60, -60]]) cloud(x, 72, z, 1.4);

// sol, rue, trottoirs pavés, place
const cobble = canvasTex(256, 256, c => { c.fillStyle = '#b9b2a6'; c.fillRect(0, 0, 256, 256); const r = rng(9);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32 % 2) * 16; x < 272; x += 32) { const v = 195 + r() * 40; c.fillStyle = `rgb(${v},${v - 6},${v - 16})`; c.beginPath(); c.roundRect(x - 14, y + 2, 28, 28, 6); c.fill(); } });
cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
const ground = box(2000, 1, 2000, mat('#6cbf4f')); ground.position.y = -.5; scene.add(ground);
const road = box(300, .1, 9, mat('#4a4d55')); road.position.set(0, .05, 0); scene.add(road);
for (let x = -140; x < 150; x += 8) { const l = box(3, .02, .35, mat('#f0ead0')); l.position.set(x, .12, 0); scene.add(l); }
for (const z of [-6, 6]) { const tx = cobble.clone(); tx.repeat.set(100, 1); tx.needsUpdate = true; const s = box(300, .3, 3, mat('#ffffff', { map: tx })); s.position.set(0, .15, z); scene.add(s); }
const PLAZA = V(0, 0, -32);
{ const tx = cobble.clone(); tx.repeat.set(12, 9); tx.needsUpdate = true; const p = box(50, .2, 36, mat('#f3dcc4', { map: tx })); p.position.set(0, .1, -32); scene.add(p);
  const alley = box(14, .2, 6, mat('#f3dcc4', { map: tx })); alley.position.set(0, .1, -10.5); scene.add(alley); }
function groundY(x, z) {
  if (Math.abs(x) > 200 || z > 200) return .2;
  if (Math.abs(x) < 25 && z < -13 && z > -50) return .2;
  if (Math.abs(x) < 7 && z <= -7.5 && z >= -13.5) return .2;
  if (Math.abs(z) >= 4.5 && Math.abs(z) <= 7.5) return .3;
  if (Math.abs(z) < 4.5) return .1;
  return 0;
}

// montagnes low-poly enneigées
{ const r = rng(41); for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283 + r() * .2, d = 800 + r() * 200, h = 180 + r() * 180;
  const m = new THREE.Mesh(new THREE.ConeGeometry(h * .9, h, 6), mat('#7d9ac0', { flatShading: true })); m.position.set(Math.cos(a) * d, h / 2 - 20, Math.sin(a) * d); m.rotation.y = r() * 3; scene.add(m);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(h * .32, h * .36, 6), mat('#ffffff', { flatShading: true })); cap.position.set(m.position.x, h - 20 - h * .18, m.position.z); cap.rotation.y = m.rotation.y; scene.add(cap); } }
// arbres ronds
{ const r = rng(11); for (let i = 0; i < 120; i++) { const a = r() * 6.283, d = 110 + r() * 500; const x = Math.cos(a) * d, z = Math.sin(a) * d;
  const tr = box(1.2, 4, 1.2, mat('#7a5230')); tr.position.set(x, 2, z); scene.add(tr); const s = 4 + r() * 3;
  const f = box(s, s, s, mat(r() > .5 ? '#3f9a3a' : '#57b146'), .6); f.position.set(x, 4 + s / 2, z); scene.add(f); } }

// ---------------------------------------------------------------- bâtiments
function makeHouse({ w = 9.2, h = 8, d = 8, wall = '#e9d8b8', roof = '#5a3a32', shutter = '#3b6ea8' }) {
  const grp = new THREE.Group(); const M = c => mat(c);
  const body = box(w, h, d, M(wall)); body.position.y = h / 2; grp.add(body); BLOCKERS.push(body);
  const r1 = box(w + .15, .5, d * .62, M(roof)); r1.position.set(0, h + 1.2, d * .25); r1.rotation.x = -.6; grp.add(r1);
  const r2 = box(w + .15, .5, d * .62, M(roof)); r2.position.set(0, h + 1.2, -d * .25); r2.rotation.x = .6; grp.add(r2);
  const gab = box(w - .2, 2.2, d * .3, M(wall)); gab.position.set(0, h + .9, 0); grp.add(gab);
  const dr = box(1.6, 2.8, .2, M('#6b4423')); dr.position.set(0, 1.4, d / 2 + .05); grp.add(dr);
  const frameM = M('#fbf6ec'), shutM = M(shutter), glass = mat('#5f7f9f', { roughness: .2, metalness: .3 });
  const rows = h > 7.5 ? 2 : 1;
  for (let rr = 0; rr < rows; rr++) { const y = rows === 2 ? (rr ? h * .78 : h * .42) : h * .62;
    for (const x of [-w / 3, w / 3]) {
      const fr = box(1.75, 1.65, .16, frameM); fr.position.set(x, y, d / 2 + .02); grp.add(fr);
      const wi = box(1.4, 1.3, .2, glass); wi.position.set(x, y, d / 2 + .05); grp.add(wi);
      for (const sx of [-1, 1]) { const sh = box(.45, 1.4, .1, shutM); sh.position.set(x + sx * 1.15, y, d / 2 + .06); grp.add(sh); }
      const sill = box(1.9, .15, .4, frameM); sill.position.set(x, y - .85, d / 2 + .15); grp.add(sill);
      if ((rr + Math.round(x)) % 2 === 0) { const fb = box(1.5, .35, .4, M('#7a4a2a')); fb.position.set(x, y - .62, d / 2 + .28); grp.add(fb);
        for (let k = -1; k <= 1; k++) { const fl = box(.35, .3, .3, M(['#ff5d7a', '#ffd23f', '#ff8a3d'][k + 1])); fl.position.set(x + k * .45, y - .32, d / 2 + .3); grp.add(fl); } } } }
  const corn = box(w + .1, .35, d + .2, frameM); corn.position.y = h + .1; grp.add(corn);
  scene.add(grp); return grp;
}
const houses = [];
{ const cols = ['#d9473f', '#f2c14e', '#3fa66b', '#ef8a3a', '#5b8fd9', '#e9e1cf', '#c95b8f', '#f6d7a7'], shut = ['#2f6b3f', '#3b6ea8', '#8a3a2a', '#2a4a7a'];
  let i = 0; for (const z of [-12.5, 12.5]) for (let x = -85; x <= 60; x += 9.4) {
    if (z < 0 && x > -25 && x < 25) continue;          // ouverture vers la place
    if (z > 0 && Math.abs(x - 32.9) < 5) continue;      // emplacement du cinéma
    const hs = makeHouse({ h: 7 + ((i * 5) % 4) * 1.2, wall: cols[i % 8], shutter: shut[i % 4] }); hs.position.set(x, 0, z); hs.rotation.y = z > 0 ? Math.PI : 0; houses.push(hs); i++; } }
// panneau « blagues de papa » sur une façade côté rue
const jokeHouse = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 10.2) < 1) || houses.find(h => h.position.z > 0);
{ const s = box(6.6, 2.2, .2, new THREE.MeshStandardMaterial({ map: textTex(['BLAGUES DE PAPA', 'INTERDITES', 'AU-DESSUS DU 1er ÉTAGE'], { size: 92 }) }));
  s.position.set(jokeHouse.position.x, 5.6, 12.5 - 4.2); s.rotation.y = Math.PI; scene.add(s); }
// cinéma
const cinema = new THREE.Group(); cinema.position.set(32.9, 0, 12.5); cinema.rotation.y = Math.PI; scene.add(cinema);
{ const b = box(9.4, 14, 8, mat('#7a2f4a')); b.position.y = 7; cinema.add(b); BLOCKERS.push(b);
  const mq = box(9, 2.4, .5, new THREE.MeshStandardMaterial({ map: textTex(['CINÉMA'], { w: 1024, h: 256, bg: '#1c1c22', fg: '#ffd23f', border: '#ffd23f', size: 150 }), emissive: new THREE.Color('#ffffff'), emissiveIntensity: .25 }));
  mq.position.set(0, 5.2, 4.3); cinema.add(mq); const dr = box(4, 3.2, .2, mat('#2a1a10')); dr.position.set(0, 1.6, 4.05); cinema.add(dr); }
// mairie à colonnes
const MAIRIE = new THREE.Group(); MAIRIE.position.set(0, 0, -57); scene.add(MAIRIE);
{ const W_ = 28, Hm = 13; const body = box(W_, Hm, 10, mat('#f3efe6')); body.position.y = Hm / 2; MAIRIE.add(body); BLOCKERS.push(body);
  const steps = box(18, .8, 3, mat('#d8d2c6')); steps.position.set(0, .4, 6.3); MAIRIE.add(steps);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, Hm - 1, 14), mat('#ffffff')); c.position.set(-10 + i * 4, (Hm - 1) / 2 + .8, 6.6); c.castShadow = true; MAIRIE.add(c); }
  const ent = box(W_ + 1, 1.2, 4, mat('#ffffff')); ent.position.set(0, Hm + .3, 5.8); MAIRIE.add(ent);
  const sh = new THREE.Shape(); sh.moveTo(-14, 0); sh.lineTo(0, 4); sh.lineTo(14, 0); sh.lineTo(-14, 0);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }), mat('#ffffff')); ped.position.set(0, Hm + .9, 6.8); MAIRIE.add(ped);
  const sign = box(10, 1.6, .2, new THREE.MeshStandardMaterial({ map: textTex(['MAIRIE'], { w: 1024, h: 200, bg: '#2b4a8a', fg: '#ffffff', border: '#ffd23f', size: 130 }) })); sign.position.set(0, Hm - 1.2, 7.4); MAIRIE.add(sign);
  const roof = box(W_ + .5, .6, 10.5, mat('#3a4a6a')); roof.position.y = Hm + .3; MAIRIE.add(roof);
  const pole = box(.25, 7, .25, mat('#ddd')); pole.position.set(0, Hm + 4, 0); MAIRIE.add(pole);
  const flag = box(3, 2, .05, mat('#3b6ee8')); flag.position.set(1.6, Hm + 6.5, 0); MAIRIE.add(flag);
  for (let i = 0; i < 4; i++) for (const x of [-12, -7, 7, 12]) { const wi = box(2, 2.4, .2, mat('#5f7f9f', { roughness: .2 })); wi.position.set(x, 4 + (i % 2) * 5, 5.05); if (i < 2) MAIRIE.add(wi); } }
// estrade + micro
const STAGE = V(0, 1.2, -45);
{ const st = box(14, 1.2, 7, mat('#a8743f')); st.position.set(0, .6, -45); scene.add(st); BLOCKERS.push(st);
  const skirt = box(14.1, .6, 7.1, mat('#d4462f')); skirt.position.set(0, .3, -45); scene.add(skirt);
  const mic = box(.12, 2.2, .12, mat('#222')); mic.position.set(0, 2.3, -42.8); scene.add(mic); const mh = box(.35, .5, .35, mat('#333'), .12); mh.position.set(0, 3.45, -42.8); scene.add(mh); BLOCKERS.push(mh, mic); }
const banana = new THREE.Group(); banana.position.set(-1.6, 1.25, -43.2); scene.add(banana);
{ for (let i = 0; i < 3; i++) { const p = box(.4, .12, 1.1, mat('#ffe04a', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: .15 })); p.rotation.y = (i - 1) * .9; p.position.set(Math.sin((i - 1) * .9) * .3, 0, Math.cos((i - 1) * .9) * .3); banana.add(p); } }
// clocher
const CLOCHER = V(-32, 0, -47);
{ const t = box(7, 30, 7, mat('#d9c7a0')); t.position.set(CLOCHER.x, 15, CLOCHER.z); scene.add(t); BLOCKERS.push(t);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(5.2, 9, 4), mat('#7a3a2a')); sp.position.set(CLOCHER.x, 34.5, CLOCHER.z); sp.rotation.y = Math.PI / 4; scene.add(sp);
  const ft = canvasTex(256, 256, c => { c.fillStyle = '#fff8e6'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 10; c.stroke(); c.lineWidth = 12; c.beginPath(); c.moveTo(128, 128); c.lineTo(128, 40); c.moveTo(128, 128); c.lineTo(190, 128); c.stroke(); });
  const f = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshStandardMaterial({ map: ft })); f.position.set(CLOCHER.x, 25, CLOCHER.z + 3.52); scene.add(f); }
// stands de la fête, guirlandes, ballons
const stalls = [];
for (const [x, z, c] of [[-17, -25, '#e8433a'], [17, -25, '#2f7be8'], [-17, -38, '#3fa66b'], [17, -38, '#f29a2a']]) {
  const s = new THREE.Group(); s.position.set(x, .2, z); s.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(s); stalls.push(s);
  const tb = box(5, 1.2, 2, mat('#a8743f')); tb.position.y = .6; s.add(tb); BLOCKERS.push(tb);
  for (const px of [-2.3, 2.3]) { const p = box(.2, 3.2, .2, mat('#eee')); p.position.set(px, 1.6, -.8); s.add(p); }
  const aw = canvasTex(256, 64, cc => { for (let i = 0; i < 8; i++) { cc.fillStyle = i % 2 ? '#ffffff' : c; cc.fillRect(i * 32, 0, 32, 64); } });
  const a = box(5.6, .2, 2.8, new THREE.MeshStandardMaterial({ map: aw })); a.position.set(0, 3.3, 0); a.rotation.x = .25; s.add(a); }
{ const cols = ['#ff4d4d', '#ffd23f', '#3fbf6b', '#4d8bff', '#ff8a3d', '#c45bff']; let k = 0;
  const line = (a, b) => { const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(a.clone().lerp(b, u).add(V(0, -Math.sin(u * Math.PI) * 1.4, 0))); }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .04, 4), mat('#333')));
    for (let i = 1; i < 14; i++) { const p = pts[i]; const f = new THREE.Mesh(new THREE.ConeGeometry(.45, 1, 3), mat(cols[k++ % 6], { side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.scale.z = .15; f.position.copy(p).add(V(0, -.55, 0)); scene.add(f); } };
  for (let x = -70; x <= 60; x += 16) line(V(x, 8.6, -8.5), V(x, 8.6, 8.5));
  line(V(-24, 9, -14), V(24, 9, -50)); line(V(24, 9, -14), V(-24, 9, -50)); line(V(-24, 9, -30), V(24, 9, -30)); }
const balloonCluster = new THREE.Group(); balloonCluster.position.set(17, .2, -25); scene.add(balloonCluster);
{ const cols = ['#ff4d6d', '#ffd23f', '#4d8bff', '#3fbf6b', '#c45bff']; for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.6, 14, 10), mat(cols[i % 5], { roughness: .35 })); const a = i * 1.1;
  b.position.set(Math.cos(a) * .9, 5 + (i % 3) * .7, Math.sin(a) * .9); b.scale.y = 1.15; balloonCluster.add(b);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, b.position.y - 1.2, 3), mat('#eee')); st.position.set(b.position.x / 2, (b.position.y + 1.2) / 2, b.position.z / 2); balloonCluster.add(st); } }

// intérieurs : cinéma (plafond de 20 m) et cabinet du dentiste
const CINE_IN = V(400, 0, 0);
{ const room = new THREE.Mesh(new THREE.BoxGeometry(22, 24, 26), mat('#5a1f2f', { side: THREE.BackSide })); room.position.set(CINE_IN.x, 12, CINE_IN.z); room.receiveShadow = true; scene.add(room); BLOCKERS.push(room);
  const fl = box(22, .2, 26, mat('#3a1520')); fl.position.set(CINE_IN.x, .1, CINE_IN.z); scene.add(fl);
  const scr = box(16, 8, .2, mat('#dfe8f6', { emissive: new THREE.Color('#dfe8ff'), emissiveIntensity: .25 })); scr.position.set(CINE_IN.x, 9, CINE_IN.z - 12.8); scene.add(scr);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const s = box(1.6, 1, 1.4, mat('#b0203a')); s.position.set(CINE_IN.x - 7.2 + c * 2.4, .7, CINE_IN.z - 2 + r * 2.6); scene.add(s); }
  const ceil = new THREE.PointLight(0xffe2c0, 140, 40, 1.4); ceil.position.set(CINE_IN.x, 20, CINE_IN.z + 4); scene.add(ceil);
  const t20 = box(5, 1.4, .1, new THREE.MeshStandardMaterial({ map: textTex(['PLAFOND : 20 M'], { w: 1024, h: 256, size: 120 }) })); t20.position.set(CINE_IN.x, 15, CINE_IN.z + 12.9); t20.rotation.y = Math.PI; t20.scale.setScalar(1.6); scene.add(t20); }
const DENT_IN = V(400, 0, 100);
{ const room = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 12), mat('#dff3f0', { side: THREE.BackSide })); room.position.set(DENT_IN.x, 3.5, DENT_IN.z); scene.add(room); BLOCKERS.push(room);
  const fl = box(12, .2, 12, mat('#c8d6d4')); fl.position.set(DENT_IN.x, .1, DENT_IN.z); scene.add(fl);
  const ch = box(2.4, 1, 4.4, mat('#3aa6a0'), .2); ch.position.set(DENT_IN.x, 1, DENT_IN.z); scene.add(ch); const bk = box(2.4, 2.6, .6, mat('#3aa6a0'), .2); bk.position.set(DENT_IN.x, 2.4, DENT_IN.z - 2.2); bk.rotation.x = -.35; scene.add(bk);
  for (const z of [-.6, .9]) { const st = box(2.7, .25, .5, mat('#5a3a22')); st.position.set(DENT_IN.x, 2.05, DENT_IN.z + z); scene.add(st); }
  const lamp = new THREE.PointLight(0xffffff, 40, 14, 1.4); lamp.position.set(DENT_IN.x + 1, 5.5, DENT_IN.z + 2); scene.add(lamp); }

// ---------------------------------------------------------------- personnages en blocs
const FACES = {};
function faceTex(expr) {
  if (FACES[expr]) return FACES[expr];
  return FACES[expr] = canvasTex(256, 256, (c) => {
    c.clearRect(0, 0, 256, 256);
    const L = 88, R = 168, EY = 112;
    const eye = (x, y) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, 20, 24, 0, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.ellipse(x, y + 3, 12, 15, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, y - 3, 4.5, 0, 7); c.fill(); };
    const closed = (x, y, up = true) => { c.strokeStyle = '#1a1a1a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); if (up) c.arc(x, y + 6, 16, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(x, y - 4, 16, .15 * Math.PI, .85 * Math.PI); c.stroke(); };
    const brow = (x, y, a) => { c.strokeStyle = '#2a1a10'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 18, y + a); c.lineTo(x + 18, y - a); c.stroke(); };
    const blush = () => { c.fillStyle = 'rgba(255,110,130,.5)'; for (const x of [56, 200]) { c.beginPath(); c.ellipse(x, 152, 20, 11, 0, 0, 7); c.fill(); } };
    const sweat = () => { c.fillStyle = '#7fd3ff'; c.strokeStyle = '#2a8fd0'; c.lineWidth = 3; c.beginPath(); c.moveTo(214, 44); c.quadraticCurveTo(232, 74, 214, 84); c.quadraticCurveTo(196, 74, 214, 44); c.fill(); c.stroke(); };
    c.fillStyle = '#1a1a1a'; c.strokeStyle = '#1a1a1a'; c.lineWidth = 8; c.lineCap = 'round';
    if (expr === 'laugh') { closed(L, EY); closed(R, EY); c.fillStyle = '#5a1a1a'; c.beginPath(); c.moveTo(92, 150); c.quadraticCurveTo(128, 222, 164, 150); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(100, 150, 56, 12); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(128, 190, 18, 10, 0, 0, 7); c.fill(); blush(); return; }
    if (expr === 'giggle') { closed(L, EY); closed(R, EY); c.beginPath(); c.arc(128, 156, 28, .1 * Math.PI, .9 * Math.PI); c.stroke(); blush(); return; }
    if (expr === 'smile') { eye(L, EY); eye(R, EY); c.beginPath(); c.arc(128, 158, 28, .15 * Math.PI, .85 * Math.PI); c.stroke(); blush(); return; }
    if (expr === 'deadpan') { for (const x of [L, R]) { eye(x, EY + 4); c.fillStyle = '#f2c79c'; c.fillRect(x - 24, EY - 24, 48, 22); c.strokeStyle = '#1a1a1a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - 20, EY - 2); c.lineTo(x + 20, EY - 2); c.stroke(); }
      c.lineWidth = 8; c.beginPath(); c.moveTo(108, 176); c.lineTo(148, 176); c.stroke(); return; }
    if (expr === 'stern') { eye(L, EY); eye(R, EY); brow(L, 78, 9); brow(R, 78, -9); c.beginPath(); c.arc(128, 200, 22, 1.25 * Math.PI, 1.75 * Math.PI); c.stroke(); return; }
    if (expr === 'smug') { eye(L, EY); eye(R, EY); brow(L, 78, 6); brow(R, 78, -6); c.beginPath(); c.moveTo(100, 176); c.quadraticCurveTo(140, 186, 164, 162); c.stroke(); return; }
    if (expr === 'shock') { eye(L, EY); eye(R, EY); brow(L, 64, 0); brow(R, 64, 0); c.beginPath(); c.ellipse(128, 184, 16, 22, 0, 0, 7); c.fill(); sweat(); return; }
    if (expr === 'worried') { eye(L, EY); eye(R, EY); brow(L, 74, -8); brow(R, 74, 8); c.beginPath(); c.arc(128, 200, 22, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); sweat(); return; }
    if (expr === 'talk') { eye(L, EY); eye(R, EY); c.beginPath(); c.ellipse(128, 176, 18, 10, 0, 0, 7); c.fill(); return; }
    if (expr === 'sad') { eye(L, EY); eye(R, EY); brow(L, 74, -8); brow(R, 74, 8); c.beginPath(); c.arc(128, 204, 22, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
      c.fillStyle = '#7fd3ff'; c.beginPath(); c.ellipse(L + 4, EY + 34, 6, 10, 0, 0, 7); c.fill(); return; }
    eye(L, EY); eye(R, EY); c.beginPath(); c.moveTo(108, 172); c.lineTo(148, 172); c.stroke();
  });
}
const ALL = [];
function makeChar({ skin = '#f2c79c', shirt = '#e8743b', pants = '#2f4f8f', hair = '#5a3a22', scale = 1, hairStyle = 'short', extras = null }) {
  const c = new THREE.Group(); const root = new THREE.Group(); c.add(root); root.scale.setScalar(scale * .5);
  const S = mat(skin), SH = mat(shirt), P = mat(pants), HM = mat(hair);
  const legs = [], arms = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .5, 2, 0); root.add(hip); const l = box(.95, 2, 1, P, .05); l.position.y = -1; hip.add(l); legs.push(hip); }
  const torso = box(2, 2, 1, SH, .08); torso.position.y = 3; root.add(torso);
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 1.5, 3.85, 0); root.add(sh); const a = box(.95, 2, 1, SH, .05); a.position.y = -.9; sh.add(a);
    const hnd = box(.9, .45, .95, S, .05); hnd.position.y = -1.95; sh.add(hnd); arms.push(sh); }
  const head = new THREE.Group(); head.position.y = 4.02; root.add(head);
  const hd = box(1.45, 1.4, 1.4, S, .28); hd.position.y = .7; head.add(hd);
  const faceM = new THREE.MeshBasicMaterial({ map: faceTex('smile'), transparent: true }); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), faceM); face.position.set(0, .7, .711); head.add(face);
  const hairG = new THREE.Group(); head.add(hairG);
  if (hairStyle === 'short' || hairStyle === 'spiky') { const h1 = box(1.55, .5, 1.52, HM, .14); h1.position.y = 1.4; hairG.add(h1); const h2 = box(1.55, .8, .4, HM, .12); h2.position.set(0, 1.05, -.58); hairG.add(h2);
    if (hairStyle === 'spiky') for (let i = -1; i <= 1; i++) { const sp = box(.42, .5, .42, HM); sp.position.set(i * .45, 1.72, .3 - Math.abs(i) * .2); sp.rotation.z = -i * .3; hairG.add(sp); } }
  if (hairStyle === 'pigtails') { const h1 = box(1.55, .5, 1.52, HM, .14); h1.position.y = 1.4; hairG.add(h1); for (const s of [-1, 1]) { const p = box(.48, .85, .48, HM, .15); p.position.set(s * .97, .8, -.2); hairG.add(p); } }
  if (hairStyle === 'long') { const h1 = box(1.58, .5, 1.55, HM, .14); h1.position.y = 1.4; hairG.add(h1); const h2 = box(1.58, 1.5, .42, HM, .12); h2.position.set(0, .7, -.62); hairG.add(h2); }
  if (hairStyle === 'bun') { const h1 = box(1.58, .5, 1.55, HM, .14); h1.position.y = 1.4; hairG.add(h1); const b = box(.8, .6, .8, HM, .25); b.position.set(0, 1.85, -.2); hairG.add(b); }
  if (extras) extras(root, head, hairG, S);
  c.userData = { root, legs, arms, head, faceM, hairG, hd, torso }; c.visible = false; scene.add(c); ALL.push(c); return c;
}
function setFace(ch, e) { ch.userData.faceM.map = faceTex(e); }
function pose(ch, kind, t, k = 1) {
  const { legs, arms, head, root } = ch.userData; const SC = root.scale.y;
  legs.forEach(l => l.rotation.set(0, 0, 0)); arms.forEach(a => a.rotation.set(0, 0, 0)); head.rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  const s = Math.sin(t * 7);
  if (kind === 'idle') { head.rotation.y = Math.sin(t * .9) * .08; arms[0].rotation.z = -.05; arms[1].rotation.z = .05; }
  if (kind === 'walk') { legs[0].rotation.x = s * .6; legs[1].rotation.x = -s * .6; arms[0].rotation.x = -s * .6; arms[1].rotation.x = s * .6; }
  if (kind === 'heavyWalk') { const q = Math.sin(t * 4); legs[0].rotation.x = q * .35; legs[1].rotation.x = -q * .35; arms[0].rotation.x = -q * .3; arms[1].rotation.x = q * .3; root.rotation.z = q * .04; }
  if (kind === 'laugh') { const q = Math.sin(t * 16); root.rotation.x = .25 + q * .05; arms[0].rotation.set(-.6, 0, -.3); arms[1].rotation.set(-.6, 0, .3); head.rotation.x = -.25 + q * .08; }
  if (kind === 'float') { const q = Math.sin(t * 2.2); arms[0].rotation.z = -1.1 - q * .15; arms[1].rotation.z = 1.1 + q * .15; legs[0].rotation.x = .25 + q * .1; legs[1].rotation.x = -.1 - q * .1; head.rotation.x = -.15; root.rotation.x = Math.sin(t * 1.6) * .06; }
  if (kind === 'floatLaugh') { const q = Math.sin(t * 16); arms[0].rotation.set(-.4, 0, -1.2); arms[1].rotation.set(-.4, 0, 1.2); legs[0].rotation.x = .5 + q * .15; legs[1].rotation.x = -.2 - q * .15; head.rotation.x = -.3 + q * .06; root.rotation.x = .15; }
  if (kind === 'point') { arms[1].rotation.set(-1.5, 0, .25); }
  if (kind === 'pointOut') { arms[1].rotation.set(-1.4, 0, -1.2 + Math.sin(t * 6) * .05); head.rotation.y = -.3; }
  if (kind === 'cast') { arms[0].rotation.z = -2.7 + Math.sin(t * 9) * .2; arms[1].rotation.z = 2.7 - Math.sin(t * 9) * .2; }
  if (kind === 'talk') { arms[1].rotation.set(-1.1 + Math.sin(t * 5) * .25, 0, .2); head.rotation.y = Math.sin(t * 3) * .1; }
  if (kind === 'holdUp') { arms[1].rotation.set(-2.6, 0, 0); }
  if (kind === 'holdOut') { arms[1].rotation.set(-1.5, 0, 0); }
  if (kind === 'juggle') { const q = t * 1.15 * 2 * Math.PI; arms[0].rotation.set(-1.25 + Math.max(0, Math.sin(q)) * .45, 0, .15); arms[1].rotation.set(-1.25 + Math.max(0, -Math.sin(q)) * .45, 0, -.15); head.rotation.x = -.35; }
  if (kind === 'sit') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[0].rotation.x = -.3; arms[1].rotation.x = -.3; }
  if (kind === 'strapped') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; root.rotation.x = -.35; root.position.y += Math.abs(Math.sin(t * 18)) * .06; arms[0].rotation.z = -.15; arms[1].rotation.z = .15; }
  if (kind === 'crossed') { arms[0].rotation.set(.25, 0, -.75); arms[1].rotation.set(.25, 0, .75); }   // mains sur les hanches
  if (kind === 'reach') { arms[1].rotation.set(-2.9, 0, .2); arms[0].rotation.z = -1; }
}
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y <= .35 ? groundY(x, z) : y, z); ch.rotation.y = ry; ch.visible = true; }
const headY = ch => (4.02 + .7) * ch.userData.root.scale.y;   // hauteur du centre de la tête

const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => {
  for (let i = 0; i < 3; i++) { const st = box(2.04, .22, 1.04, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
const lou = makeChar({ shirt: '#ff8fc0', pants: '#ff8fc0', hair: '#3a2010', scale: .62, hairStyle: 'pigtails', extras: (root) => {
  for (const s of [-1, 1]) { const sn = box(1.05, .45, 1.25, mat('#ffffff')); sn.position.set(s * .5, .22, .1); root.add(sn); const lace = box(1.06, .12, .5, mat('#ff4d8b')); lace.position.set(s * .5, .42, .35); root.add(lace); } } });
const mom = makeChar({ shirt: '#7a5fb8', pants: '#3a3a52', hair: '#3a2416', hairStyle: 'long' });
const dad = makeChar({ shirt: '#e8743b', pants: '#4a4a5a', hair: '#2a1a10', hairStyle: 'short' });
const chicken = new THREE.Group(); { const b = box(.9, .7, .6, mat('#ffd23f'), .2); chicken.add(b); const h = box(.4, .45, .4, mat('#ffd23f'), .15); h.position.set(.5, .45, 0); chicken.add(h);
  const bk = box(.25, .12, .15, mat('#ff8a3d')); bk.position.set(.8, .45, 0); chicken.add(bk); const cr = box(.2, .2, .1, mat('#ff3b3b')); cr.position.set(.5, .78, 0); chicken.add(cr); }
dad.userData.arms[1].add(chicken); chicken.position.set(0, -2.6, .4); chicken.scale.setScalar(1.6);
const baker = makeChar({ shirt: '#ffffff', pants: '#d8d8d8', hair: '#8a6a4a', hairStyle: 'short', extras: (root, head) => {
  const hat = box(1.4, 1.2, 1.4, mat('#ffffff'), .35); hat.position.y = 2.1; head.add(hat); } });
const mamie = makeChar({ shirt: '#b04a6a', pants: '#5a4a6a', hair: '#d8d8e0', hairStyle: 'bun' });
const dentures = new THREE.Group(); { const up = box(.8, .25, .5, mat('#ffffff'), .1); dentures.add(up); const gum = box(.8, .15, .5, mat('#ff8a9a'), .07); gum.position.y = .18; dentures.add(gum); }
mamie.userData.arms[1].add(dentures); dentures.position.set(0, -2.5, .5); dentures.scale.setScalar(1.4);
const mayor = makeChar({ shirt: '#3a3e48', pants: '#2e3138', hair: '#6a4a2a', skin: '#e8b88f', hairStyle: 'none', extras: (root, head, hairG) => {
  const tie = box(.32, 1.4, .1, mat('#c0392b')); tie.position.set(0, 3.2, .52); root.add(tie);
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu);
  for (const s of [-1, 1]) { const sh = box(1.4, .9, 1.9, mat('#7d8590', { metalness: .6, roughness: .35 })); sh.position.set(s * .5, .25, .2); root.add(sh); root.userData['shoe' + s] = sh;
    const lb = box(.9, .35, .02, new THREE.MeshStandardMaterial({ map: textTex(['30 KG'], { w: 256, h: 128, bg: '#7d8590', fg: '#ffffff', border: '#7d8590', size: 80 }) })); lb.position.set(s * .5, .3, 1.16); root.add(lb); root.userData['lbl' + s] = lb; }
  const wig = new THREE.Group(); const w1 = box(1.6, .55, 1.56, mat('#7a4a20'), .14); w1.position.y = 1.42; wig.add(w1); const w2 = box(1.6, .9, .4, mat('#7a4a20'), .12); w2.position.set(0, 1.05, -.6); wig.add(w2);
  const w3 = box(1.62, .3, 1.4, mat('#8a5a2a'), .1); w3.position.set(.05, 1.68, .05); wig.add(w3); head.add(wig); root.userData.wig = wig; } });
const oldMayor = makeChar({ shirt: '#1c1c22', pants: '#1c1c22', hair: '#4a4a4a', hairStyle: 'short', extras: (root, head) => {
  const brim = box(1.8, .1, 1.8, mat('#111')); brim.position.y = 1.5; head.add(brim); const top = box(1.2, 1.3, 1.2, mat('#111')); top.position.y = 2.2; head.add(top);
  const mu = box(.8, .1, .08, mat('#4a4a4a')); mu.position.set(0, .585, .74); head.add(mu); } });
const clown = makeChar({ shirt: '#ff4d4d', pants: '#4d8bff', hair: '#ff8a1f', hairStyle: 'spiky', extras: (root, head) => {
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), mat('#ff2020', { roughness: .3 })); nose.position.set(0, .55, .8); head.add(nose);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), mat(['#ffd23f', '#3fbf6b', '#ffffff'][i])); b.position.set(0, 3.6 - i * .55, .55); root.add(b); } } });
const dentist = makeChar({ shirt: '#ffffff', pants: '#ffffff', hair: '#2a1a10', hairStyle: 'short' });
const patient = makeChar({ shirt: '#5b8fd9', pants: '#2a3a5a', hair: '#8a6a2a', hairStyle: 'short' });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
// pigeon au chapeau
const juggleG = new THREE.Group(); scene.add(juggleG); const juggled = [];
for (let i = 0; i < 6; i++) { const bg = box(1.3, .22, .22, mat('#d89a4a'), .1); juggleG.add(bg); juggled.push(bg); }
const pigeon = new THREE.Group(); scene.add(pigeon);
{ const gr = mat('#8a8f9c'), dk = mat('#5a5f6c'); const b = box(.9, .7, 1.3, gr, .3); b.position.y = .55; pigeon.add(b); const h = box(.55, .55, .55, dk, .2); h.position.set(0, 1.05, .55); pigeon.add(h);
  const bk = box(.18, .14, .3, mat('#e8a040')); bk.position.set(0, .98, .9); pigeon.add(bk); for (const s of [-1, 1]) { const e = box(.1, .14, .05, mat('#111')); e.position.set(s * .2, 1.12, .83); pigeon.add(e); }
  const hb = box(.7, .06, .7, mat('#111')); hb.position.set(0, 1.35, .55); pigeon.add(hb); const ht = box(.42, .5, .42, mat('#111')); ht.position.set(0, 1.62, .55); pigeon.add(ht); const band = box(.44, .1, .44, mat('#d4462f')); band.position.set(0, 1.45, .55); pigeon.add(band);
  pigeon.userData.hat = [hb, ht, band]; }
const pigeonWig = new THREE.Group(); { const w1 = box(.9, .32, .9, mat('#7a4a20'), .1); w1.position.y = 1.4; pigeonWig.add(w1); const w2 = box(.9, .5, .25, mat('#7a4a20'), .08); w2.position.set(0, 1.2, .2); pigeonWig.add(w2); }
pigeonWig.position.set(0, 0, .55); pigeon.add(pigeonWig);
const ficelle = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 4), mat('#f4f4f4')); scene.add(ficelle);
function setString(a, b) { const d = b.clone().sub(a); ficelle.position.copy(a).add(b).multiplyScalar(.5); ficelle.scale.set(1, d.length(), 1); ficelle.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); ficelle.visible = true; }
// étincelles du sort
const sparkMat = new THREE.PointsMaterial({ color: '#fff3a0', size: 9, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const sparks = new THREE.Points(new THREE.BufferGeometry(), sparkMat); sparks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)); scene.add(sparks);
const sparkSeeds = []; { const r = rng(21); for (let i = 0; i < 400; i++) sparkSeeds.push([r() * 6.283, r(), r()]); }

// ---------------------------------------------------------------- chronologie (indices des mots)
const w = i => CAP[i].t + VO;
function buildEvents() {
  return { envoles: w(9), sourire: w(11), dixcm: w(12), fourire: w(15), etages: w(18), clown: w(25), centans: w(29), vire: w(34), motif: w(40), serieux: w(43), sort: w(48), toute: w(52),
    cinema: w(57), vingt: w(62), blagues: w(65), premier: w(72), dentiste: w(77), attache: w(79), aucas: w(82), tom: w(87), onze: w(89), decolle: w(94), jamais2: w(95), drole: w(96),
    lou: w(103), rigole: w(105), maman: w(108), ficelle: w(114), ballon: w(115), maire: w(119), plomb: w(122), chaussures: w(125), trente: w(128), souri: w(131), dit: w(135), travail: w(147),
    fete: w(148), pigeon: w(158), chapeau: w(160), eclate: w(162), lache: w(167), montait: w(173), toit: w(175), clocher: w(180), nuages: w(182), essaye: w(184), papa: w(193), rien1: w(200),
    boulanger: w(201), rien2: w(208), mamie: w(209), toujours: w(214), point: w(216), plomb2: w(225), scene: w(227), banane: w(242), chaussures2: w(243), salto: w(254), perruque: w(255),
    partie: w(258), rigole2: w(262), premiere: w(264), trois: w(271), dix: w(273), nuages2: w(275), attrape: w(277), arreter: w(283), triste: w(290), discours: w(297), redesc: w(301),
    depuis: w(55), soir: w(306), sauf: w(322), vu: w(325), pigeon2: w(331), chapeau2: w(336), lahaut: w(339), serieuse: w(343) };
}

// ---------------------------------------------------------------- état de la scène à t
const FETE = { tom: V(5, 0, -24), mom: V(-11, 0, -23), dad: V(7.6, 0, -22.4), baker: V(2.2, 0, -21.6), mamie: V(7, 0, -20.4) };
const LOU_PATH = () => [[E.lache, V(-11.6, 2.6, -23.6)], [E.toit, V(-7, 16, -48)], [E.clocher, V(-27, 33, -44)], [E.nuages, V(-30, 70, -58)], [E.point, V(-32, 88, -62)], [E.attrape + .2, V(-32, 96, -62)]];
function pathAt(P, t) { let i = 0; while (i < P.length - 2 && t > P[i + 1][0]) i++; return P[i][1].clone().lerp(P[i + 1][1], ease(seg(t, P[i][0], P[i + 1][0]))); }
let flash = 0, sepia = 0;
function update(t) {
  ALL.forEach(c => { c.visible = false; c.userData.hairG.visible = true; }); pigeon.visible = false; juggleG.visible = false; ficelle.visible = false; sparks.visible = false; banana.visible = true;
  const S = (a, b) => t >= a && t < b; const bob = k => Math.sin(t * 2.2 + k) * .12;
  // ambiance : soir après « Ce soir-là »
  const eve = ease(seg(t, E.soir - .2, E.soir + 1.2));
  skyMat.uniforms.top.value.set('#3f8fe6').lerp(new THREE.Color('#5a4aa8'), eve); skyMat.uniforms.mid.value.set('#8cc6f5').lerp(new THREE.Color('#f08a6a'), eve); skyMat.uniforms.bot.value.set('#dff0ff').lerp(new THREE.Color('#ffd0a0'), eve);
  scene.fog.color.set('#cfe7ff').lerp(new THREE.Color('#f0b090'), eve); sun.color.set('#fff3dd').lerp(new THREE.Color('#ffb070'), eve); sun.intensity = lerp(2.4, 1.6, eve); hemi.intensity = lerp(1.5, 1.2, eve);
  sepia = win(t, E.clown - .05, E.depuis - .05, .15);

  // A. la règle, dans la rue
  if (S(0, E.clown - .05)) {
    const a = VILL[0]; const k = seg(t, E.envoles - .3, E.envoles + 1.2); place(a, -8, k > 0 ? groundY(-8, 5.6) + easeOut(k) * 3.2 + bob(0) * k : .2, 5.6, Math.PI - .3); setFace(a, 'laugh'); pose(a, k > 0 ? 'floatLaugh' : 'laugh', t);
    for (const [i, x, z, r] of [[4, -12, 6.4, Math.PI - .9], [5, -4.5, 5.2, Math.PI + .5], [8, -14, 5, Math.PI - .5]]) { place(VILL[i], x, .2, z, r); setFace(VILL[i], t > E.envoles ? 'shock' : 'smile'); pose(VILL[i], 'idle', t + i); }
    const b = VILL[2]; const kb = seg(t, E.dixcm, E.dixcm + .4); place(b, 3, groundY(3, 5.6) + easeOut(kb) * .1, 5.6, Math.PI - .2); setFace(b, 'smile'); pose(b, 'idle', t);
    const c = VILL[3]; const kc = seg(t, E.fourire - .1, E.etages + .5); place(c, 12, kc > 0 ? groundY(12, 6) + easeOut(kc) * 8.6 + bob(2) * kc : .2, 6, Math.PI - .2); setFace(c, 'laugh'); pose(c, kc > 0 ? 'floatLaugh' : 'laugh', t);
  }
  // B. flash-back : le clown viré il y a cent ans
  if (S(E.clown - .05, E.depuis - .05)) {
    place(clown, 2, .2, -33, -.4); setFace(clown, t > E.sort - .1 ? 'smug' : (t > E.vire ? 'sad' : 'smile')); pose(clown, t > E.sort - .1 ? 'cast' : 'idle', t);
    place(oldMayor, -2.5, .2, -31.5, 2.2); setFace(oldMayor, 'stern'); pose(oldMayor, t > E.vire - .2 && t < E.sort ? 'pointOut' : 'idle', t);
    VILL.slice(0, 6).forEach((v, i) => { place(v, -6 + i * 2.6, .2, -39.5 - (i % 2) * 1.5, 0); setFace(v, t > E.vire ? 'shock' : 'smile'); pose(v, 'idle', t + i); });
    if (t > E.sort) { const k = seg(t, E.sort, E.toute + 1.2); const p = sparks.geometry.attributes.position.array;
      sparkSeeds.forEach((s, i) => { const r = 2 + k * 40 * s[1]; p[i * 3] = 2 + Math.cos(s[0]) * r; p[i * 3 + 1] = 4 + s[2] * 6 + k * 10 * s[1]; p[i * 3 + 2] = -33 + Math.sin(s[0]) * r; });
      sparks.geometry.attributes.position.needsUpdate = true; sparkMat.opacity = 1 - seg(t, E.toute + .4, E.toute + 1.2); sparks.visible = true; }
  }
  // C. cinéma
  if (S(E.depuis - .05, E.blagues - .05)) {
    VILL.slice(0, 7).forEach((v, i) => { const hgt = [3, 7, 11, 15, 18.5, 5, 13][i]; const k = seg(t, E.depuis + i * .1, E.depuis + .8 + i * .1);
      place(v, CINE_IN.x - 7 + (i % 4) * 4.5, .9 + easeOut(k) * hgt + bob(i) , CINE_IN.z + (i % 3) * 2.5, Math.PI); setFace(v, 'laugh'); pose(v, 'floatLaugh', t + i); });
  }
  // D. blagues de papa (rue, sous le panneau)
  if (S(E.blagues - .05, E.dentiste - .05)) {
    const x0 = jokeHouse.position.x; place(dad, x0 - 1.2, .2, 6.4, Math.PI - .4); setFace(dad, 'talk'); pose(dad, 'talk', t);
    const kid = VILL[7]; const k = seg(t, E.blagues + .4, E.premier); place(kid, x0 + 1.4, groundY(x0 + 1.4, 6.6) + easeOut(k) * 2.6 + bob(1) * k, 6.6, Math.PI + .5); setFace(kid, 'laugh'); pose(kid, k > 0 ? 'floatLaugh' : 'laugh', t);
  }
  // E. dentiste
  if (S(E.dentiste - .05, E.tom - .05)) {
    place(patient, DENT_IN.x, 1.55, DENT_IN.z + .2, 0); setFace(patient, t > E.attache ? 'laugh' : 'worried'); pose(patient, 'strapped', t);
    place(dentist, DENT_IN.x + 2.2, .2, DENT_IN.z + 1.6, -1.6); setFace(dentist, t > E.aucas - .2 ? 'smug' : 'talk'); pose(dentist, 'talk', t);
  }
  // F/G/H. la fête : Tom, Lou, maman, le maire
  const fete = S(E.tom - .05, E.soir - .05);
  if (fete) {
    VILL.forEach((v, i) => { if (i === 9) return; const a = i * .7; const x = -4 + Math.cos(a) * 14, z = -30 + Math.sin(a) * 6; place(v, x, .2, z, Math.atan2(-x, -30 - z) + .3); setFace(v, 'smile'); pose(v, 'idle', t + i); });
  }
  if (S(E.tom - .05, E.essaye - .05)) {
    const vE = VILL[9]; const behindLaugh = t > E.drole - .4;
    place(tom, FETE.tom.x, .2, FETE.tom.z, .35); setFace(tom, 'deadpan'); pose(tom, 'idle', t);
    place(vE, FETE.tom.x - 2.6, behindLaugh ? groundY(0, -26) + easeOut(seg(t, E.drole - .4, E.drole + .6)) * 2.2 + bob(3) : .2, FETE.tom.z - 2.2, .3); setFace(vE, behindLaugh ? 'laugh' : 'smile'); pose(vE, behindLaugh ? 'floatLaugh' : 'idle', t);
  }
  if (S(E.tom - .05, E.attrape - .2)) {
    const lost = t > E.lache; const walkK = seg(t, E.maman - .2, E.ballon + .6);
    const mx = FETE.mom.x + (lost ? 0 : walkK * 1.2), mz = FETE.mom.z;
    place(mom, mx, .2, mz, lost ? .4 : .3); setFace(mom, lost ? 'shock' : 'smile'); pose(mom, lost ? 'reach' : (walkK > 0 && walkK < 1 ? 'walk' : 'holdUp'), t);
    const hand = V(mx + .55, 2.95, mz + .1);
    const lp = lost ? pathAt(LOU_PATH(), t) : V(mx + .3 + Math.sin(t * 1.3) * .3, 2.6 + bob(1) * 1.5, mz - .2);
    place(lou, lp.x, lp.y, lp.z, lost ? Math.PI : .2); setFace(lou, t > E.eclate - .1 || t < E.fete ? 'laugh' : 'shock'); pose(lou, 'floatLaugh', t);
    if (!lost) setString(hand, V(lp.x, lp.y + 1.2, lp.z)); else if (t < E.lache + .5) setString(V(lp.x, lp.y + 1.2, lp.z), V(lp.x, lp.y + 1.2 - 2.4 * (1 - seg(t, E.lache, E.lache + .5)), lp.z));
  }
  if (S(E.fete - .3, E.scene)) { pigeon.visible = true; pigeon.position.set(-14.2, 3.55, -24.6); pigeon.rotation.y = -1.2 + Math.sin(t * 3) * .2; pigeonWig.visible = false; }
  // G. le maire et ses chaussures de plomb
  if (S(E.maire - .05, E.fete - .05)) { const k = seg(t, E.maire - .05, E.travail); place(mayor, lerp(14, 6, k), .2, -34, -Math.PI / 2 + .3); setFace(mayor, t > E.dit - .1 ? 'smug' : 'stern');
    pose(mayor, t > E.dit - .1 ? 'talk' : 'heavyWalk', t); }
  // I. tout le monde essaie de faire rire Tom
  if (S(E.essaye - .05, E.scene)) {
    place(tom, FETE.tom.x, .2, FETE.tom.z, .35); setFace(tom, 'deadpan'); pose(tom, t > E.point - .1 ? 'point' : 'idle', t);
    place(dad, FETE.dad.x, .2, FETE.dad.z, -2.2); setFace(dad, t > E.papa ? 'talk' : 'smile'); pose(dad, t > E.papa ? 'holdOut' : 'idle', t);
    place(baker, FETE.baker.x, .2, FETE.baker.z, 1.9); setFace(baker, 'smile'); pose(baker, t > E.boulanger ? 'juggle' : 'idle', t);
    juggleG.visible = t > E.boulanger; juggleG.position.copy(baker.position); juggleG.rotation.y = baker.rotation.y;
    juggled.forEach((b, j) => { const u = t * 1.15 + j / 6, ph = u % 1, side = Math.floor(u) % 2 ? 1 : -1;   // cascade : lancer d'une main, rattraper de l'autre
      const x = lerp(side * .75, -side * .75, ph), y = 1.75 + 4 * 1.9 * ph * (1 - ph); b.position.set(x, y, .75); b.rotation.set(0, 0, ph * Math.PI * 2 * side); });
    place(mamie, FETE.mamie.x, .2, FETE.mamie.z, -2.6); setFace(mamie, 'smile'); pose(mamie, t > E.mamie + .3 ? 'holdOut' : 'idle', t);
    mamie.userData.faceM.map = faceTex(t > E.mamie + .3 ? 'giggle' : 'smile'); dentures.visible = t > E.mamie + .3;
    if (t > E.point - .3) { const lp = pathAt(LOU_PATH(), t); place(lou, lp.x, lp.y, lp.z, Math.PI); setFace(lou, 'laugh'); pose(lou, 'floatLaugh', t); }
  } else dentures.visible = false;
  // J. discours, peau de banane, salto, perruque
  if (S(E.scene - .3, E.soir - .05)) {
    const walk = seg(t, E.scene - .3, E.banane - .2), slipT = E.banane + .1, flipK = seg(t, slipT, E.salto + .35);
    const x = lerp(-5.5, -1.6, walk); const shoesOff = t > slipT;
    place(mayor, x, STAGE.y + (shoesOff ? Math.sin(flipK * Math.PI) * 3.2 : 0), -43.2, 0);
    mayor.userData.root.rotation.x = 0; pose(mayor, t < slipT ? 'heavyWalk' : 'idle', t);
    if (shoesOff && flipK < 1) mayor.userData.root.rotation.x = -flipK * Math.PI * 2;
    if (flipK >= 1) { pose(mayor, 'sit', t); }
    setFace(mayor, t < E.banane ? 'stern' : (flipK > 0 && flipK < 1 ? 'shock' : 'worried'));
    const ru = mayor.userData.root.userData; for (const s of [-1, 1]) { ru['shoe' + s].visible = !shoesOff; ru['lbl' + s].visible = !shoesOff; }
    ru.wig.visible = t < E.perruque - .15;
    banana.visible = t < slipT + .4;
    if (t > E.scene) { place(tom, FETE.tom.x, .2, FETE.tom.z, -.3); }
  } else { const ru = mayor.userData.root.userData; for (const s of [-1, 1]) { ru['shoe' + s].visible = true; ru['lbl' + s].visible = true; } ru.wig.visible = true; }
  // perruque qui s'envole + chaussures restées sur l'estrade
  if (t > E.perruque - .15 && t < E.soir) { flyWig.visible = true; const k = t - (E.perruque - .15); flyWig.position.set(-1.6 + k * 2.2, STAGE.y + 3 + k * 5, -43.2 - k * 1.5); flyWig.rotation.set(k * 4, k * 3, 0); } else flyWig.visible = false;
  leftShoes.visible = t > E.banane + .15 && t < E.soir - .05;
  // K. Tom rigole et s'envole
  if (S(E.scene, E.soir - .05)) {
    const laughing = t > E.rigole2 - .1; let pos = V(FETE.tom.x, groundY(FETE.tom.x, FETE.tom.z), FETE.tom.z);
    if (t > E.premiere) { const P = [[E.premiere, pos.clone()], [E.trois, V(1, 9.2, -30)], [E.dix, V(-14, 31, -44)], [E.nuages2, V(-28, 70, -58)], [E.attrape, V(-31.4, 94, -61.6)], [E.triste, V(-31, 102, -61)],
        [E.redesc, V(-24, 60, -50)], [E.soir - .2, V(-4, 2.2, -30)]]; pos = pathAt(P, t); }
    if (t > E.scene + .1) { place(tom, pos.x, pos.y, pos.z, t > E.premiere ? Math.PI : -.3); setFace(tom, laughing ? (t > E.triste + .4 ? 'sad' : 'laugh') : 'deadpan');
      pose(tom, t > E.premiere ? (t > E.triste ? 'float' : 'floatLaugh') : (laughing ? 'laugh' : 'idle'), t);
      if (t > E.attrape - .2) { place(lou, pos.x + .5, pos.y - 1.6, pos.z + .2, Math.PI); setFace(lou, 'laugh'); pose(lou, 'floatLaugh', t); tom.userData.arms[0].rotation.set(.2, 0, -.5); } }
    if (t > E.scene && t < E.attrape - .2) { const lp = pathAt(LOU_PATH(), t); place(lou, lp.x, lp.y, lp.z, Math.PI); setFace(lou, 'laugh'); pose(lou, 'floatLaugh', t); }
  }
  // M/N/O. le soir : toute la ville flotte, sauf M. Plomb… puis la perruque sur le pigeon
  if (S(E.soir - .05, END + 1)) {
    const all = [tom, lou, mom, dad, baker, mamie, ...VILL];
    all.forEach((c, i) => { const a = i * .9, rr = 6 + (i % 4) * 3; const x = Math.cos(a) * rr, z = -30 + Math.sin(a) * rr * .7;
      place(c, x, 2.5 + (i % 5) * 1.6 + bob(i), z, Math.atan2(-x, 0) ); setFace(c, 'laugh'); pose(c, 'floatLaugh', t + i); });
    const laughs = t > E.chapeau2 - .3; const up = seg(t, E.lahaut - .6, E.lahaut + 1.4);
    place(mayor, 3, laughs ? STAGE.y + easeOut(up) * 160 + seg(t, E.chapeau2 - .3, E.lahaut) * 1.5 : STAGE.y, -44.2, -.2); mayor.userData.root.userData.wig.visible = false;
    setFace(mayor, laughs ? (t > E.lahaut + 1 ? 'stern' : 'laugh') : (t > E.vu ? 'shock' : 'stern')); pose(mayor, laughs ? (t > E.lahaut + 1 ? 'crossed' : 'floatLaugh') : 'crossed', t);
    const ru = mayor.userData.root.userData; for (const s of [-1, 1]) { ru['shoe' + s].visible = !laughs; ru['lbl' + s].visible = !laughs; }
    leftShoes.visible = laughs; leftShoes.position.set(3, STAGE.y, -44.2);
    if (t > E.vu - .3) { pigeon.visible = true; pigeon.position.set(5.6, STAGE.y, -43); pigeon.rotation.y = -.9; pigeonWig.visible = true; }
  }
}
const flyWig = new THREE.Group(); { const w1 = box(.8, .28, .78, mat('#7a4a20'), .1); flyWig.add(w1); const w2 = box(.8, .45, .2, mat('#7a4a20'), .08); w2.position.set(0, -.2, -.3); flyWig.add(w2); } scene.add(flyWig);
const leftShoes = new THREE.Group(); for (const s of [-1, 1]) { const sh = box(.7, .45, .95, mat('#7d8590', { metalness: .6, roughness: .35 })); sh.position.set(s * .25, .22, .1); leftShoes.add(sh); }
leftShoes.position.set(-1.6, STAGE.y, -43.2); scene.add(leftShoes);

// ---------------------------------------------------------------- plans (calés sur les mots, cadrés sur le sujet réel)
// cadrages : distance, hauteur, focale ; le sujet est relu à chaque image (pas de zoom au mauvais endroit)
const FR = { sign: [13, .6, 44], cine: [12, -2, 56], top: [4, 3.6, 42], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42], feet: [3.4, -.6, 36], high: [9, 9, 42] };
const SUBJ = {
  tom: () => tom, lou: () => lou, mom: () => mom, dad: () => dad, baker: () => baker, mamie: () => mamie, mayor: () => mayor, oldMayor: () => oldMayor, clown: () => clown, patient: () => patient,
  spec1: () => VILL[1], spec4: () => VILL[4], vA: () => VILL[0], vB: () => VILL[2], vC: () => VILL[3], kid: () => VILL[7], vE: () => VILL[9],
};
function subjectPoint(name, part) {
  if (name === 'pigeon') return { p: pigeon.getWorldPosition(V(0, 0, 0)).add(V(0, 1, 0)), face: pigeon.rotation.y };
  if (name === 'banana') return { p: banana.position.clone(), face: 0 };
  if (name === 'shoes') return { p: leftShoes.position.clone().add(V(0, .4, 0)), face: 0 };
  if (name === 'wig') return { p: flyWig.position.clone(), face: 0 };
  if (name.startsWith('@')) { const [x, y, z, f] = name.slice(1).split(',').map(Number); return { p: V(x, y, z), face: f || 0 }; }
  const ch = SUBJ[name](); ch.updateMatrixWorld(true);
  const p = part === 'feet' ? ch.position.clone().add(V(0, .45, 0)) : part === 'body' ? ch.userData.torso.getWorldPosition(V(0, 0, 0)) : ch.userData.hd.getWorldPosition(V(0, 0, 0));
  return { p, face: ch.rotation.y, ch };
}
const RAY = new THREE.Raycaster();
function buildShots() {
  const S = [];
  // S(indice du mot, sujet, cadrage, angle (°, 0 = face au sujet), [partie], [mouvement])
  const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: (typeof i === 'number' && i < 1000 ? w(i) : i) - .06, subj, fr, yaw, part, move });
  A(0, 'vA', 'ws', 20, 'body'); A(5, 'vA', 'mcu', 15); A(9, 'vA', 'fs', -10, 'body', 'up');
  A(10, 'vB', 'mcu', 10); A(12, 'vB', 'fs', 15, 'body'); A(14, 'vC', 'mcu', -15); A(17, 'vC', 'ws', 8, 'body', 'up');
  A(19, '@2,3,-28', 'ws', 0); A(24, 'clown', 'mcu', 10); A(26, 'oldMayor', 'mcu', -20); A(31, '@0,2.5,-32', 'fs', 20, null, 'pan');
  A(40, 'oldMayor', 'cu', 0); A(44, 'clown', 'cu', 15); A(48, 'clown', 'fs', -15, 'body'); A(51, '@2,6,-30', 'xws', 15, null, 'up');
  A(55, 'spec1', 'fs', 10, 'body', 'up'); A(59, '@400,12,4', 'cine', 180, null, 'static'); A(64, '@' + (jokeHouse.position.x) + ',4.2,7', 'sign', 180, null, 'static');
  A(74, 'patient', 'ms', 30); A(78, 'patient', 'mcu', -25); A(82, 'patient', 'cu', 10);
  A(85, 'tom', 'cu', 0); A(88, 'tom', 'mcu', 25); A(92, 'tom', 'fs', 15, 'body'); A(95, 'tom', 'cu', -10); A(96, 'tom', 'ms', -20);
  A(100, 'lou', 'mcu', 10); A(104, 'lou', 'cu', -15); A(108, 'mom', 'fs', 30, 'body'); A(113, 'lou', 'mcu', 40); A(115, '@3,4,-24', 'ws', 0);
  A(118, 'mayor', 'low', 20); A(123, 'mayor', 'feet', 30, 'feet'); A(128, 'mayor', 'feet', -25, 'feet'); A(131, 'mayor', 'cu', 0); A(135, 'mayor', 'mcu', 15); A(142, 'mayor', 'cu', -10);
  A(148, '@0,6,-30', 'ws', 10, null, 'pan'); A(154, 'lou', 'mcu', 15); A(157, 'pigeon', 'fs', 20); A(160, 'pigeon', 'ms', -30); A(162, 'lou', 'cu', 0); A(167, 'mom', 'mcu', 10);
  A(173, 'lou', 'ms', 160, 'body', 'up'); A(175, 'lou', 'ws', 185, 'body'); A(180, 'lou', 'ws', 205, 'body'); A(182, 'lou', 'ws', 165, 'body', 'up');
  A(184, '@5,3,-24', 'fs', 20); A(193, 'dad', 'mcu', -15); A(199, 'tom', 'cu', -35); A(201, 'baker', 'ms', 10, 'body'); A(207, 'tom', 'cu', -10); A(209, 'mamie', 'mcu', 15); A(212, 'mamie', 'cu', 0); A(214, 'tom', 'cu', 0);
  A(216, 'tom', 'low', 160, null, 'up'); A(220, '@-32,88,-62', 'ws', 20);
  A(223, '@2.5,2.5,-44', 'ws', -8); A(227, 'mayor', 'fs', 10, 'body'); A(235, 'mayor', 'ms', 25); A(239, 'banana', 'fs', 65); A(243, 'shoes', 'top', -20); A(249, 'mayor', 'fs', 70, 'body');
  A(255, 'mayor', 'cu', 10); A(257, 'wig', 'ms', 30, null, 'up');
  A(262, 'tom', 'cu', 0); A(264, 'tom', 'mcu', 15); A(271, 'tom', 'fs', 40, 'body', 'up'); A(273, 'tom', 'ws', 30, 'body'); A(275, 'tom', 'ms', -20, 'body');
  A(277, 'lou', 'mcu', 30); A(283, 'tom', 'cu', -10); A(290, 'tom', 'cu', 5); A(297, 'tom', 'mcu', 20); A(301, 'tom', 'ws', 25, 'body', 'up');
  A(306, '@0,5,-30', 'ws', 0, null, 'pan'); A(312, '@0,5,-30', 'ws', 35); A(322, 'mayor', 'mcu', 10); A(325, 'mayor', 'cu', 0); A(331, 'pigeon', 'fs', 10); A(336, 'pigeon', 'ms', -25);
  A(339, 'mayor', 'ws', 10, 'body', 'up'); A(343, 'mayor', 'mcu', 0);
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function cameraAt(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].t <= t) i = k;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : END, k = seg(t, sh.t, t1);
  const { p, face } = subjectPoint(sh.subj, sh.part); const [d0, h, fov] = FR[sh.fr];
  let d = d0 * (sh.move === 'push' ? lerp(1.03, .97, k) : 1), yaw = face + sh.yaw * Math.PI / 180 + (sh.move === 'pan' ? lerp(-.12, .12, k) : 0);
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw)); let hh = h + (sh.move === 'up' ? lerp(-.15, .15, k) * d0 : 0);
  let cam = p.clone().addScaledVector(dir, d).add(V(0, hh, 0));
  let look = p.clone(); if (sh.move === 'up') look.y += lerp(-.08, .1, k) * d0;
  // anti-occlusion : si un obstacle coupe la vue, la caméra passe devant
  const toCam = cam.clone().sub(look), L = toCam.length(); RAY.set(look, toCam.normalize()); RAY.far = L;
  const hit = RAY.intersectObjects(BLOCKERS, false)[0]; if (hit && hit.distance > .6) cam = look.clone().addScaledVector(toCam, Math.max(1.2, hit.distance - .5));
  cam.y = Math.max(cam.y, groundY(cam.x, cam.z) + .35);   // jamais sous le sol
  // personne ne passe devant le sujet : on masque qui coupe la ligne de vue
  const sub = subjectPoint(sh.subj, sh.part).ch, seg3 = look.clone().sub(cam), sl = seg3.length(); seg3.normalize();
  for (const c of ALL) { if (!c.visible || c === sub || (sub === tom && c === lou) || (sub === lou && c === tom)) continue;
    const ctr = c.userData.torso.getWorldPosition(V(0, 0, 0)), rel = ctr.clone().sub(cam), along = rel.dot(seg3);
    if (sub && Math.hypot(ctr.x - sub.position.x, ctr.z - sub.position.z) < 1.4 && Math.abs(ctr.y - sub.userData.torso.getWorldPosition(V(0, 0, 0)).y) < 2.5) { c.visible = false; continue; }
    if (along < -.6 || along > sl - .5) continue; const perp = rel.addScaledVector(seg3, -along).length();
    if (perp < 1.6 * c.userData.root.scale.y * 2 + .3) c.visible = false; }
  return { p: cam, c: look, f: fov, sh: Math.max(12, d0 * 2), cut: t - sh.t };
}

// ---------------------------------------------------------------- habillage : onomatopées + sous-titres
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function onoma(text, x, y, a, { size = 110, rot = -.08, fill = '#ffd23f', stroke = '#1c1c22' } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); g.rotate(rot); const s = easeBack(clamp(a * 1.8)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = stroke;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.strokeText(text, 0, 0); g.shadowColor = 'transparent'; g.fillStyle = fill; g.fillText(text, 0, 0); g.restore();
}
function bubble(text, x, y, a) { if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); const s = easeBack(clamp(a * 1.6)); g.scale(s, s);
  g.fillStyle = '#fff'; g.strokeStyle = '#1c1c22'; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 0, 250, 110, 0, 0, 7); g.fill(); g.stroke();
  for (const [dx, dy, r] of [[-120, 150, 30], [-170, 210, 18]]) { g.beginPath(); g.arc(dx, dy, r, 0, 7); g.fill(); g.stroke(); }
  g.font = "900 70px 'Inter Display'"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1c1c22'; g.fillText(text, 0, 4); g.restore(); }
function overlays(t) {
  const at = (ch, dy = .9) => project(ch.position.clone().add(V(0, headY(ch) + dy, 0)));
  const near = (ch) => { const [x, y, z] = at(ch); return z < 1 && x > 80 && x < W - 80 && y > 220 && y < H - 300 ? [x, y] : null; };
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b) return; const p = near(ch); if (p) onoma(txt, clamp(p[0], 220, W - 220), clamp(p[1] - 120, 280, 1000), win(t, a, b, .12), o); };
  pop('HAHA !', VILL[0], E.envoles - .2, E.sourire - .1); pop('BOING', VILL[2], E.dixcm, E.fourire - .1, { size: 96, rot: .06 }); pop('HAHAHA !', VILL[3], E.fourire, E.clown - .1, { size: 120 });
  pop('POUET POUET', clown, E.serieux, E.sort - .1, { size: 92, rot: .05 }); pop('HAHA !', VILL[7], E.premier - .3, E.dentiste - .1);
  pop('HIHI !', lou, E.rigole, E.maman - .1, { fill: '#ff8fc0' }); pop('CLONK', mayor, E.chaussures, E.souri - .1, { size: 96 }); pop('HAHAHA !', lou, E.eclate, E.lache + .8, { fill: '#ff8fc0', size: 120 });
  pop('PAF !', mayor, E.salto + .5, E.perruque - .2, { size: 130, fill: '#ff4d4d' }); pop('HAHAHAHA !', tom, E.rigole2, E.trois, { size: 120 });
  pop('BLA BLA BLA…', mayor, 0, 0);
  if (t > E.discours - .2 && t < E.redesc) { const p = near(tom); if (p) bubble('BLA BLA BLA…', clamp(p[0] + 120, 280, W - 280), clamp(p[1] - 330, 300, 900), win(t, E.discours - .2, E.redesc, .2)); }
  pop('HAHAHA !', mayor, E.chapeau2, E.lahaut, { size: 120 });
  if (sepia > 0) { g.save(); g.globalAlpha = sepia; g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e8cfa0'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = sepia * .5; const r = rng(Math.floor(t * 24)); g.fillStyle = '#000'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, r() * H, 2, 2 + r() * 6); g.restore(); }
  const fl = (t > E.sort ? .6 * Math.exp(-(t - E.sort) * 6) : 0) + (t > E.salto + .5 ? .3 * Math.exp(-(t - E.salto - .5) * 8) : 0);
  if (fl > .01) { g.fillStyle = `rgba(255,250,230,${fl})`; g.fillRect(0, 0, W, H); }
}
function caption(t) {
  let cur = -1; for (let i = 0; i < CAP.length; i++) if (CAP[i].t + VO <= t) cur = i;
  if (cur < 0) return; const c = CAP[cur], nx = CAP[cur + 1]; const endT = nx && nx.t - c.e < .7 ? nx.t + VO : c.e + VO + .3; if (t > endT) return;
  const k = easeBack(seg(t, c.t + VO, c.t + VO + .1)); g.save(); g.translate(540, 1240); g.scale(lerp(.86, 1, k), lerp(.86, 1, k));
  let size = 86; g.font = `900 ${size}px 'Inter Display'`; while (g.measureText(c.w).width > 900) { size -= 6; g.font = `900 ${size}px 'Inter Display'`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 16; g.shadowOffsetY = 5; g.lineWidth = size * .1; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(c.w, 0, 0);
  g.shadowColor = 'transparent'; g.fillStyle = '#ffffff'; g.fillText(c.w, 0, 0); g.restore();
}

// ---------------------------------------------------------------- rendu
window.setTiming = d => { CAP = d.captions; E = buildEvents(); END = CAP[CAP.length - 1].e + VO + 1.6; SHOTS = buildShots(); window.DURATION = END; window.SHOTS = SHOTS; return END; };
window.renderAvatar = function () {
  scene.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) o.visible = false; });
  const keep = new Set(); tom.traverse(o => keep.add(o)); keep.forEach(o => { if (o.isMesh) o.visible = true; });
  tom.userData.faceM.visible = true; scene.fog = null; scene.background = null;
  tom.visible = true; tom.position.set(0, 0, 0); tom.rotation.y = .25; setFace(tom, 'laugh'); pose(tom, 'floatLaugh', 1.3);
  tom.userData.arms[0].rotation.set(-.15, 0, -2.85); tom.userData.arms[1].rotation.set(-.15, 0, 2.85); tom.userData.root.rotation.x = .05; tom.userData.head.rotation.set(-.1, .1, .08);
  scene.updateMatrixWorld(true); const hp = tom.userData.hd.getWorldPosition(V(0, 0, 0));
  camera.aspect = 1; camera.fov = 34; camera.position.copy(hp).add(V(.7, .1, 3.6)); camera.lookAt(hp.clone().add(V(0, -.32, 0))); camera.updateProjectionMatrix();
  hemi.intensity = 1.6; sun.position.set(4, 8, 6); sun.target.position.set(0, 1, 0); camLight.position.copy(camera.position);
  renderer.setSize(1200, 1200, false); renderer.setClearColor(0x000000, 0); renderer.render(scene, camera);
  return glc.toDataURL('image/png');
};
window.render = function (t) {
  update(t);
  scene.updateMatrixWorld(true);   // positions à jour avant les tests d'obstacles (même sur la 1re image)
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; camera.updateProjectionMatrix();
  const s = cam.c.y > 40 ? 120 : 45, tex = 2 * s / sun.shadow.mapSize.x;
  const ctr = V(Math.round(cam.c.x / tex) * tex, Math.round(cam.c.y / tex) * tex, Math.round(cam.c.z / tex) * tex);
  sun.target.position.copy(ctr); sun.position.copy(ctr).addScaledVector(SUN_DIR, s * 3);
  const sc = sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .1; sc.far = s * 8; sc.updateProjectionMatrix(); }
  camLight.position.copy(cam.p).add(V(0, 1, 0)).lerp(cam.c, .3);
  composer.render();
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(glc, 0, 0, W, H);
  if (CLEAN) return;
  overlays(t);
  const v = g.createRadialGradient(540, 900, 600, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
};
window.ready = Promise.resolve().then(() => { window.__ready = true; });
window.__loaded = true;
