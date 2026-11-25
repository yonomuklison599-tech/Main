// « Dans cette ville, chaque mensonge te fait rapetisser » — rendu déterministe : window.render(t)
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
    const hs = makeHouse({ h: 7 + ((i * 5) % 4) * 1.2, wall: cols[i % 8], shutter: shut[i % 4] }); hs.position.set(x, 0, z); hs.rotation.y = z > 0 ? Math.PI : 0; houses.push(hs); i++; } }

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
const GARL0 = scene.children.length;
{ const cols = ['#ff4d4d', '#ffd23f', '#3fbf6b', '#4d8bff', '#ff8a3d', '#c45bff']; let k = 0;
  const line = (a, b) => { const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(a.clone().lerp(b, u).add(V(0, -Math.sin(u * Math.PI) * 1.4, 0))); }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .04, 4), mat('#333')));
    for (let i = 1; i < 14; i++) { const p = pts[i]; const f = new THREE.Mesh(new THREE.ConeGeometry(.45, 1, 3), mat(cols[k++ % 6], { side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.scale.z = .15; f.position.copy(p).add(V(0, -.55, 0)); scene.add(f); } };
  for (let x = -70; x <= 60; x += 16) line(V(x, 8.6, -8.5), V(x, 8.6, 8.5));
  line(V(-24, 9, -14), V(24, 9, -50)); line(V(24, 9, -14), V(-24, 9, -50)); line(V(-24, 9, -30), V(24, 9, -30)); }
const GARL = scene.children.slice(GARL0);
const balloonCluster = new THREE.Group(); balloonCluster.position.set(17, .2, -25); scene.add(balloonCluster);
{ const cols = ['#ff4d6d', '#ffd23f', '#4d8bff', '#3fbf6b', '#c45bff']; for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.6, 14, 10), mat(cols[i % 5], { roughness: .35 })); const a = i * 1.1;
  b.position.set(Math.cos(a) * .9, 5 + (i % 3) * .7, Math.sin(a) * .9); b.scale.y = 1.15; balloonCluster.add(b);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, b.position.y - 1.2, 3), mat('#eee')); st.position.set(b.position.x / 2, (b.position.y + 1.2) / 2, b.position.z / 2); balloonCluster.add(st); } }


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
    if (expr === 'disgust') { closed(L, EY, false); closed(R, EY, false); brow(L, 80, -6); brow(R, 80, 6); c.fillStyle = 'rgba(120,200,80,.45)'; c.fillRect(30, 140, 196, 90);
      c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(128, 182, 30, 14, 0, 0, 7); c.fill(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(128, 198, 16, 16, 0, 0, 7); c.fill(); return; }
    if (expr === 'sleep') { closed(L, EY, false); closed(R, EY, false); c.beginPath(); c.ellipse(128, 176, 10, 12, 0, 0, 7); c.fill(); blush(); return; }
    if (expr === 'crumbs') { eye(L, EY); eye(R, EY); c.beginPath(); c.moveTo(100, 172); c.quadraticCurveTo(128, 186, 156, 172); c.stroke(); sweat();
      c.fillStyle = '#8a5a2a'; for (const [x, y] of [[96, 190], [112, 198], [150, 194], [160, 184], [130, 204], [84, 180], [170, 200]]) { c.fillRect(x, y, 9, 8); } return; }
    if (expr === 'nervous') { eye(L, EY); eye(R, EY); brow(L, 74, -8); brow(R, 74, 8); c.beginPath(); c.moveTo(96, 172); c.lineTo(108, 164); c.lineTo(120, 174); c.lineTo(132, 164); c.lineTo(144, 174); c.lineTo(156, 164); c.stroke(); sweat(); return; }
    if (expr === 'suspicious') { for (const x of [L, R]) { eye(x, EY + 4); c.fillStyle = '#f2c79c'; c.fillRect(x - 24, EY - 24, 48, 20); c.fillRect(x - 24, EY + 18, 48, 14); } brow(L, 84, 8); brow(R, 80, 0);
      c.beginPath(); c.moveTo(104, 178); c.lineTo(150, 170); c.stroke(); return; }
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
  if (kind === 'pointCam') { arms[1].rotation.set(-1.55, 0, -.15); head.rotation.x = .05; }
  if (kind === 'pointDown') { arms[1].rotation.set(-.6, 0, -.1); head.rotation.x = .35; }
  if (kind === 'eat') { arms[1].rotation.set(-2.1, 0, -.15); head.rotation.x = -.05; }
  if (kind === 'reach') { arms[1].rotation.set(-2.9, 0, .2); arms[0].rotation.z = -1; }
}
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y <= .35 ? groundY(x, z) : y, z); ch.rotation.y = ry; ch.visible = true; }
const headY = ch => (4.02 + .7) * ch.userData.root.scale.y;   // hauteur du centre de la tête
const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => {
  for (let i = 0; i < 3; i++) { const st = box(2.04, .22, 1.04, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
tom.userData.legs.forEach(h => { const so = box(1.0, .4, 1.04, mat('#ffffff')); so.position.y = -1.55; h.add(so); const sn = box(1.06, .34, 1.3, mat('#e8433a'), .08); sn.position.set(0, -1.86, .14); h.add(sn); });
const sash = (root, z = .52) => { const sg = new THREE.Group(); sg.position.set(0, 3, z); sg.rotation.z = .75; root.add(sg);
  ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); }); return sg; };
const tomSash = sash(tom.userData.root);
const mom = makeChar({ shirt: '#7a5fb8', pants: '#3a3a52', hair: '#3a2416', hairStyle: 'long' });
const dad = makeChar({ shirt: '#e8743b', pants: '#4a4a5a', hair: '#2a1a10', hairStyle: 'short' });
const papy = makeChar({ shirt: '#a0784a', pants: '#5a5a5a', hair: '#e8e8ee', hairStyle: 'short', extras: (root, head) => {
  for (const s of [-1, 1]) { const gl = box(.42, .3, .06, mat('#222')); gl.position.set(s * .32, .78, .74); head.add(gl); } } });
const voisine = makeChar({ shirt: '#e85a8a', pants: '#3a2a4a', hair: '#d8a040', hairStyle: 'long', extras: (root, head) => {
  const hg = new THREE.Group(); hg.position.y = 1.65; head.add(hg); const brim = box(3, .12, 3, mat('#ffd23f')); hg.add(brim); const cr = box(1.6, .9, 1.6, mat('#ffd23f'), .2); cr.position.y = .5; hg.add(cr);
  const pine = box(.7, 1.1, .7, mat('#e8a02a'), .2); pine.position.y = 1.45; hg.add(pine); for (let i = 0; i < 4; i++) { const lf = box(.18, .8, .1, mat('#3fa63a')); lf.position.set((i - 1.5) * .15, 2.3, 0); lf.rotation.z = (i - 1.5) * .35; hg.add(lf); }
  for (let i = 0; i < 6; i++) { const a = i * 1.05; const fl = box(.35, .3, .35, mat(['#ff4d6d', '#ffffff', '#c45bff'][i % 3]), .1); fl.position.set(Math.cos(a) * 1.15, .15, Math.sin(a) * 1.15); hg.add(fl); } } });
const prof = makeChar({ shirt: '#d8333a', pants: '#d8333a', hair: '#2a1a10', hairStyle: 'short', extras: (root, head) => {
  for (const s of [-1, 1]) { const st = box(.08, 2, 1.02, mat('#ffffff')); st.position.set(s * .96, 3, 0); root.add(st); }
  const hb = box(1.5, .22, 1.46, mat('#ffffff')); hb.position.y = 1.2; head.add(hb); const wh = box(.25, .18, .3, mat('#c0c4cc', { metalness: .6, roughness: .3 })); wh.position.set(.3, 3.4, .6); root.add(wh); } });
const fee = makeChar({ shirt: '#ff9ad8', pants: '#ff9ad8', hair: '#ffd86a', hairStyle: 'bun', scale: .8, extras: (root) => {
  for (const s of [-1, 1]) { const wg = box(1.8, 2.4, .05, mat('#bfe8ff', { transparent: true, opacity: .7, emissive: new THREE.Color('#9fd8ff'), emissiveIntensity: .3 })); wg.position.set(s * 1.1, 3.6, -.7); wg.rotation.y = s * .5; root.add(wg); }
  const sk = box(2.6, 1.2, 1.5, mat('#ff7ac8'), .1); sk.position.y = 1.9; root.add(sk); } });
const wand = new THREE.Group(); { const st = box(.12, 1.6, .12, mat('#ffffff')); st.position.y = .8; wand.add(st); const star = box(.5, .5, .12, mat('#ffe04a', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: .8 })); star.position.y = 1.7; star.rotation.z = .785; wand.add(star); }
fee.userData.arms[1].add(wand); wand.position.set(0, -2.1, .3); wand.rotation.x = 1.2;
// le maire : un grand manteau sur des échasses, avec un masque… et un maire minuscule dedans
const COAT = '#23304a';
const mayor = makeChar({ shirt: COAT, pants: '#6a4a2a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.55, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu);
  const cg = new THREE.Group(); root.add(cg); const C = mat(COAT);
  const back = box(2.5, 3.85, .12, C); back.position.set(0, 2.1, -.62); cg.add(back);
  for (const s of [-1, 1]) { const sd = box(.12, 3.85, 1.36, C); sd.position.set(s * 1.19, 2.1, 0); cg.add(sd); }
  const top = box(2.5, .14, 1.36, C); top.position.set(0, 3.98, 0); cg.add(top);
  const door = new THREE.Group(); door.position.set(-1.25, 2.1, .66); cg.add(door);
  const pn = box(2.5, 3.85, .12, C); pn.position.x = 1.25; door.add(pn);
  for (let i = 0; i < 3; i++) { const bt = box(.22, .22, .08, mat('#ffd23f', { metalness: .5, roughness: .3 })); bt.position.set(1.85, .9 - i * .8, .08); door.add(bt); }
  const sg = new THREE.Group(); sg.position.set(1.25, .7, .09); sg.rotation.z = .7; door.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.6, .04, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); });
  const shelf = box(1.6, .1, .9, mat('#8a5a2a')); shelf.position.set(0, 1.95, .05); cg.add(shelf);
  for (const s of [-1, 1]) { const lv = box(.06, .5, .06, mat('#c0392b')); lv.position.set(s * .5, 2.25, .2); lv.rotation.z = s * .3; cg.add(lv); }
  const stilts = new THREE.Group(); root.add(stilts); for (const s of [-1, 1]) { const p = box(.28, 2.4, .28, mat('#9a6a3a')); p.position.set(s * .5, 1.2, 0); stilts.add(p); const ft = box(.45, .15, .6, mat('#7a4a2a')); ft.position.set(s * .5, .07, .1); stilts.add(ft); }
  root.userData.coat = cg; root.userData.door = door; root.userData.stilts = stilts; } });
mayor.userData.legs.forEach(h => h.visible = false); mayor.userData.torso.visible = false;
const mini = makeChar({ shirt: '#3a3e48', pants: '#2e3138', hair: '#6a4a2a', skin: '#e8b88f', scale: .166, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu); } });
sash(mini.userData.root);
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
// accessoires tenus en main
const hold = (ch, obj, y = -2.1, z = .45) => { ch.userData.arms[1].add(obj); obj.position.set(0, y, z); obj.visible = false; return obj; };
const phoneOf = ch => { const g = new THREE.Group(); const b = box(.5, .9, .1, mat('#1c1c22')); g.add(b); const sc = box(.42, .78, .02, mat('#7fd3ff', { emissive: new THREE.Color('#7fd3ff'), emissiveIntensity: .6 })); sc.position.z = .06; g.add(sc); g.rotation.x = -1.2; return hold(ch, g, -2.1, .4); };
const phones = [VILL[2], VILL[5], VILL[6], VILL[7]].map(phoneOf);
const bowls = VILL.slice(0, 8).map(ch => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.45, .3, .35, 14), mat('#ffffff')); g.add(b);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .05, 14), mat('#7aa83a')); s.position.y = .14; g.add(s); g.rotation.x = 1.5; return hold(ch, g, -2.1, .55); });
const spoon = (() => { const g = new THREE.Group(); const h = box(.08, .9, .08, mat('#c0c4cc', { metalness: .6, roughness: .3 })); g.add(h); const c = box(.3, .1, .4, mat('#7aa83a')); c.position.set(0, .5, .1); g.add(c); g.rotation.x = 1.4; return hold(tom, g, -2.05, .4); })();
const ladle = (() => { const g = new THREE.Group(); const h = box(.12, 2.2, .12, mat('#8a8f9c', { metalness: .5 })); g.add(h); const c = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8, 0, 6.3, 0, 1.6), mat('#8a8f9c', { metalness: .5, side: THREE.DoubleSide })); c.position.y = -1.1; c.rotation.x = Math.PI; g.add(c); g.rotation.x = 1.8; return hold(mayor, g, -2.1, .6); })();
const cookie = hold(dad, (() => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .1, 14), mat('#c8904a')); c.rotation.x = 1.4; return c; })(), -2.1, .5);
const ringLight = new THREE.Mesh(new THREE.TorusGeometry(.18, .025, 6, 20), mat('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.2 })); scene.add(ringLight);

// maison de Tom (porte ouverte) + toise sur la façade
const TH = houses.find(h => h.position.z < 0 && Math.abs(h.position.x + 37.8) < 1.2);
const doorway = box(1.6, 2.8, .1, mat('#1a120c')); doorway.position.set(TH.position.x, 1.4, -8.38); scene.add(doorway);
const openDoor = box(.15, 2.8, 1.6, mat('#6b4423')); openDoor.position.set(TH.position.x - .85, 1.4, -7.6); scene.add(openDoor);
const toise = new THREE.Group(); toise.position.set(TH.position.x + 1.55, 0, -8.36); scene.add(toise);
{ const tx = canvasTex(128, 1024, c => { c.fillStyle = '#fff8e8'; c.fillRect(0, 0, 128, 1024); c.fillStyle = '#2a1c08'; for (let i = 0; i < 100; i++) { const y = 1024 - i * 10.24; c.fillRect(0, y, i % 10 ? 30 : 70, i % 10 ? 3 : 6); } });
  const b = box(.7, 5.4, .06, new THREE.MeshStandardMaterial({ map: tx })); b.position.y = 2.7; toise.add(b); }
const TAG = { a: textTex(['2,10 m'], { w: 512, h: 220, size: 150 }), b: textTex(['1,99 m'], { w: 512, h: 220, size: 150 }) };
const toiseMark = new THREE.Group(); toise.add(toiseMark);
{ const ar = box(1.1, .1, .1, mat('#e8333a')); ar.position.x = .2; toiseMark.add(ar); const lb = box(1.25, .54, .05, new THREE.MeshStandardMaterial({ map: TAG.a })); lb.position.set(1.3, 0, .02); toiseMark.add(lb); toiseMark.userData.lb = lb; }
// pot de fleurs cassé, boîte d'allumettes
const potBroken = new THREE.Group(); potBroken.position.set(13.6, .3, 5.2); scene.add(potBroken);
for (let i = 0; i < 4; i++) { const p = box(.4, .35, .25, mat('#c0603a')); p.position.set((i - 1.5) * .45, .17, (i % 2) * .3); p.rotation.y = i; potBroken.add(p); }
{ const soil = box(.9, .12, .7, mat('#5a3a22')); soil.position.set(0, .06, .5); potBroken.add(soil); const fl = box(.3, .3, .3, mat('#ff4d6d')); fl.position.set(.5, .15, .8); potBroken.add(fl); }
const MATCH = V(20, .3, 5.2);
{ const g = new THREE.Group(); g.position.copy(MATCH); scene.add(g); const tray = box(.55, .14, .9, mat('#f2e2c0')); tray.position.y = .07; g.add(tray);
  const sl = box(.6, .18, .95, new THREE.MeshStandardMaterial({ map: canvasTex(256, 384, c => { c.fillStyle = '#d4462f'; c.fillRect(0, 0, 256, 384); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(128, 192, 80, 0, 7); c.fill(); c.fillStyle = '#1c1c22'; c.font = "900 54px 'Inter Display'"; c.textAlign = 'center'; c.fillText('ALLUMETTES', 128, 360); }) }));
  sl.position.set(0, .09, -.8); g.add(sl); const pil = box(.36, .06, .16, mat('#ffffff'), .03); pil.position.set(0, .16, -.3); g.add(pil);
  const bl = box(.48, .05, .5, mat('#4d8bff')); bl.position.set(0, .17, .15); g.add(bl); }
// cuisine
const KIT = V(400, 0, 0);
{ const room = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), mat('#ffe9c8', { side: THREE.BackSide })); room.position.set(KIT.x, 3.5, KIT.z); room.receiveShadow = true; scene.add(room); BLOCKERS.push(room);
  const fl = box(14, .2, 14, mat('#c9b89a')); fl.position.set(KIT.x, .1, KIT.z); scene.add(fl);
  const tb = box(4, .25, 2.4, mat('#a8743f')); tb.position.set(KIT.x, 1.9, KIT.z); scene.add(tb); for (const [x, z] of [[-1.7, -1], [1.7, -1], [-1.7, 1], [1.7, 1]]) { const l = box(.2, 1.8, .2, mat('#7a5230')); l.position.set(KIT.x + x, .9, KIT.z + z); scene.add(l); }
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1.1, 16), mat('#cfe8ff', { transparent: true, opacity: .45, roughness: .1 })); jar.position.set(KIT.x + .9, 2.6, KIT.z - .4); scene.add(jar);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .14, 16), mat('#d4462f')); lid.position.set(KIT.x + .9, 3.2, KIT.z - .4); scene.add(lid);
  const lab = box(1.6, .5, .04, new THREE.MeshStandardMaterial({ map: textTex(['COOKIES'], { w: 512, h: 160, size: 110 }) })); lab.position.set(KIT.x + .9, 2.55, KIT.z + .14); scene.add(lab);
  const pl = new THREE.Mesh(new THREE.CylinderGeometry(.6, .5, .08, 18), mat('#ffffff')); pl.position.set(KIT.x - .6, 2.07, KIT.z + .3); scene.add(pl);
  for (let i = 0; i < 7; i++) { const c = box(.08, .05, .08, mat('#8a5a2a')); c.position.set(KIT.x - .6 + Math.cos(i * 2.1) * .3, 2.13, KIT.z + .3 + Math.sin(i * 2.1) * .3); scene.add(c); }
  const fr = box(2, 5, 1.6, mat('#e8eef4'), .1); fr.position.set(KIT.x - 5.5, 2.5, KIT.z - 5.6); scene.add(fr);
  const ct = box(6, 2, 1.6, mat('#3fa6a0')); ct.position.set(KIT.x + 2, 1, KIT.z - 6.1); scene.add(ct);
  const lamp = new THREE.PointLight(0xfff0d8, 60, 18, 1.4); lamp.position.set(KIT.x, 6, KIT.z + 2); scene.add(lamp); }
// classe : trousse, dé à coudre, téléphone
const CLS = V(400, 0, 100), DESK = 2.2;
{ const room = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 14), mat('#dff0e0', { side: THREE.BackSide })); room.position.set(CLS.x, 3.5, CLS.z); room.receiveShadow = true; scene.add(room); BLOCKERS.push(room);
  const fl = box(14, .2, 14, mat('#b89a74')); fl.position.set(CLS.x, .1, CLS.z); scene.add(fl);
  const dk = box(5, .2, 3, mat('#c8945a')); dk.position.set(CLS.x, DESK - .1, CLS.z); scene.add(dk); for (const [x, z] of [[-2.3, -1.3], [2.3, -1.3], [-2.3, 1.3], [2.3, 1.3]]) { const l = box(.18, DESK - .2, .18, mat('#8a8f9c')); l.position.set(CLS.x + x, (DESK - .2) / 2, CLS.z + z); scene.add(l); }
  const bd = box(8, 3.2, .1, new THREE.MeshStandardMaterial({ map: textTex(['INTERDIT', 'DE MENTIR'], { w: 1024, h: 410, bg: '#24503a', fg: '#ffffff', border: '#8a5a2a', size: 140 }) })); bd.position.set(CLS.x, 4.2, CLS.z - 6.9); scene.add(bd);
  const lamp = new THREE.PointLight(0xfff6e8, 50, 18, 1.4); lamp.position.set(CLS.x, 6, CLS.z + 2); scene.add(lamp); }
const TROUSSE = V(CLS.x - 1.2, DESK, CLS.z + .2);
{ const g = new THREE.Group(); g.position.copy(TROUSSE); scene.add(g); const B = mat('#2f7be8');
  const bt = box(1.8, .06, .7, B); bt.position.y = .03; g.add(bt); for (const s of [-1, 1]) { const wl = box(1.8, .28, .06, B); wl.position.set(0, .14, s * .35); g.add(wl); const we = box(.06, .28, .7, B); we.position.set(s * .9, .14, 0); g.add(we); }
  const zp = box(1.8, .05, .05, mat('#c0c4cc', { metalness: .6 })); zp.position.set(0, .3, .36); g.add(zp); const lid = box(1.8, .06, .7, B); lid.position.set(0, .48, -.55); lid.rotation.x = 1.1; g.add(lid);
  const pen = box(1.3, .1, .1, mat('#ffd23f')); pen.position.set(.25, .12, -.2); pen.rotation.y = .2; g.add(pen); }
const THIMBLE = V(CLS.x + 1.3, DESK, CLS.z + .3);
{ const M = mat('#c8ccd4', { metalness: .7, roughness: .35, side: THREE.DoubleSide }); const c = new THREE.Mesh(new THREE.CylinderGeometry(.34, .38, .42, 24, 1, true), M); c.position.set(THIMBLE.x, DESK + .21, THIMBLE.z); c.castShadow = true; scene.add(c);
  const b = new THREE.Mesh(new THREE.CircleGeometry(.36, 24), M); b.rotation.x = -Math.PI / 2; b.position.set(THIMBLE.x, DESK + .01, THIMBLE.z); scene.add(b); }
const PHONE = V(CLS.x + .2, DESK, CLS.z + 1);
const CB = { off: canvasTex(512, 900, c => drawPhone(c, false)), on: canvasTex(512, 900, c => drawPhone(c, true)) };
function drawPhone(c, on) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 900); c.fillStyle = '#1c1c22'; c.font = "900 46px 'Inter Display'"; c.textAlign = 'left'; c.fillText('Conditions', 50, 100); c.fillText("d'utilisation", 50, 152);
  c.strokeStyle = '#1c1c22'; c.lineWidth = 10; c.strokeRect(50, 215, 84, 84); if (on) { c.strokeStyle = '#2bb04a'; c.lineWidth = 18; c.beginPath(); c.moveTo(62, 255); c.lineTo(88, 285); c.lineTo(146, 200); c.stroke(); }
  c.fillStyle = '#1c1c22'; c.font = "800 40px 'Inter Display'"; c.fillText("J'ai lu et", 160, 248); c.fillText("j'accepte", 160, 292);
  c.fillStyle = '#c8ccd4'; for (let i = 0; i < 9; i++) c.fillRect(50, 360 + i * 40, 410 - (i % 3) * 60, 16);
  c.fillStyle = on ? '#2b7be8' : '#a8b0c0'; c.beginPath(); c.roundRect(50, 770, 412, 90, 24); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = "900 44px 'Inter Display'"; c.fillText('CONTINUER', 256, 830); }
const phoneScr = box(1.3, .06, 2.3, new THREE.MeshBasicMaterial({ map: CB.off, color: new THREE.Color('#e4e4e4'), toneMapped: false }));
{ const b = box(1.45, .08, 2.5, mat('#1c1c22'), .04); b.position.set(PHONE.x, DESK + .04, PHONE.z); scene.add(b); phoneScr.position.set(PHONE.x, DESK + .07, PHONE.z); scene.add(phoneScr); }
// estrade : banderole, table à soupe
const banner = box(13, 2.6, .2, new THREE.MeshStandardMaterial({ map: textTex(['ÉLECTIONS'], { w: 1024, h: 205, bg: '#2b4a8a', fg: '#ffffff', border: '#ffd23f', size: 140 }) })); banner.position.set(0, 7.2, -47.8); scene.add(banner);
const BAN2 = textTex(['PLUS DE DEVOIRS', 'LE MERCREDI !'], { w: 1024, h: 205, bg: '#2bb04a', fg: '#ffffff', border: '#ffd23f', size: 80 }), BAN1 = banner.material.map;
for (const x of [-6.3, 6.3]) { const p = box(.3, 7.5, .3, mat('#ddd')); p.position.set(x, 4.5, -47.8); scene.add(p); }
const poster = box(3.4, 4.4, .15, new THREE.MeshStandardMaterial({ map: canvasTex(512, 660, c => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, 512, 660); c.fillStyle = '#e8333a'; c.fillRect(0, 0, 512, 120);
  c.fillStyle = '#fff'; c.font = "900 84px 'Inter Display'"; c.textAlign = 'center'; c.fillText('VOTEZ', 256, 92); c.fillStyle = '#1c1c22'; c.font = "900 110px 'Inter Display'"; c.fillText('GRAND', 256, 560);
  c.fillStyle = '#23304a'; c.fillRect(186, 250, 140, 230); c.fillStyle = '#e8b88f'; c.fillRect(206, 150, 100, 100); c.fillStyle = '#3a2a1a'; c.fillRect(226, 210, 60, 8); }) }));
poster.position.set(-12, 3.2, -38); poster.rotation.y = .5; scene.add(poster); { const p = box(.25, 1.2, .25, mat('#8a5a2a')); p.position.set(-12, .6, -38.1); scene.add(p); }
const SOUP = V(0, .2, -34); const soupG = [];
{ const tb = box(5, 1.1, 2.2, mat('#a8743f')); tb.position.set(SOUP.x, .75, SOUP.z); scene.add(tb); BLOCKERS.push(tb); const cl = box(5.1, .1, 2.3, mat('#ffffff')); cl.position.set(SOUP.x, 1.32, SOUP.z); scene.add(cl); soupG.push(tb, cl);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.95, .85, 1.2, 20), mat('#4a4f5a', { metalness: .5, roughness: .4 })); pot.position.set(SOUP.x, 1.97, SOUP.z); pot.castShadow = true; scene.add(pot); soupG.push(pot);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(.88, .88, .05, 20), mat('#7aa83a', { emissive: new THREE.Color('#5a8a1a'), emissiveIntensity: .25 })); sp.position.set(SOUP.x, 2.5, SOUP.z); scene.add(sp); soupG.push(sp); }
const stink = []; for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 10; k++) pts.push(V(Math.sin(k * .9 + i) * .12, k * .09, 0));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .03, 5), mat('#8ad04a', { transparent: true, opacity: .8, emissive: new THREE.Color('#6ab02a'), emissiveIntensity: .4 })); scene.add(m); stink.push(m); }
const flies = []; for (let i = 0; i < 4; i++) { const f = box(.1, .08, .14, mat('#111')); scene.add(f); flies.push(f); }
const crack = box(.14, .02, 1.2, mat('#2a2420')); crack.position.set(3.4, .205, -34.1); crack.rotation.y = 1.2; scene.add(crack);
// pigeon
const pigeon = new THREE.Group(); scene.add(pigeon);
{ const gr = mat('#8a8f9c'), dk = mat('#5a5f6c'); const b = box(.9, .7, 1.3, gr, .3); b.position.y = .55; pigeon.add(b); const h = new THREE.Group(); h.position.set(0, 1.05, .55); pigeon.add(h); pigeon.userData.head = h;
  h.add(box(.55, .55, .55, dk, .2)); const bk = box(.18, .14, .3, mat('#e8a040')); bk.position.set(0, -.07, .35); h.add(bk); for (const s of [-1, 1]) { const e = box(.1, .14, .05, mat('#111')); e.position.set(s * .2, .07, .28); h.add(e); }
  for (const s of [-1, 1]) { const wg = box(.1, .45, 1, dk, .05); wg.position.set(s * .48, .6, -.05); pigeon.add(wg); pigeon.userData['w' + s] = wg; }
  for (const s of [-1, 1]) { const lg = box(.08, .3, .08, mat('#e8a040')); lg.position.set(s * .2, .15, 0); pigeon.add(lg); } }
// étincelles du sort + fumées « pouf »
const sparkMat = new THREE.PointsMaterial({ color: '#fff3a0', size: 9, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const sparks = new THREE.Points(new THREE.BufferGeometry(), sparkMat); sparks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(500 * 3), 3)); scene.add(sparks);
const sparkSeeds = []; { const r = rng(21); for (let i = 0; i < 500; i++) sparkSeeds.push([r() * 6.283, r(), r()]); }
const PUFFS = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const m = mat('#ffffff', { transparent: true, roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .25 }); const r = rng(i + 3);
  for (let k = 0; k < 9; k++) { const b = box(.7, .7, .7, m, .25); b.castShadow = false; const a = k * .7; b.userData.dir = V(Math.cos(a) * (.6 + r() * .4), .2 + r() * .9, Math.sin(a) * (.6 + r() * .4)); g.add(b); }
  g.userData.m = m; g.visible = false; scene.add(g); PUFFS.push(g); }
let puffN = 0;
function puff(t, t0, pos, s = 1) { const k = (t - t0) / .7; if (k < 0 || k > 1 || puffN >= PUFFS.length) return; const g = PUFFS[puffN++]; g.visible = true; g.position.copy(pos); g.scale.setScalar(s);
  g.children.forEach(b => { b.position.copy(b.userData.dir).multiplyScalar(easeOut(k) * 1.6); b.scale.setScalar(.4 + easeOut(k) * 1.1); }); g.userData.m.opacity = 1 - k * k; }

// ---------------------------------------------------------------- chronologie (indices des mots)
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { rapetisser: 7, petit: 8, centimetre: 11, gros: 13, dors: 16, tout: 22, promis: 31, impots: 35, fee: 36, paf: 44, toute: 50, depuis: 53, pere: 57, pouf1: 65, miettes: 70,
    mere: 76, pouf2: 87, passe: 89, prof: 96, pouf3: 107, trousse: 108, influ: 114, toi: 123, coche: 129, regarde: 135, tom: 138, ducoup: 145, mesure: 151, seul: 156, trois: 165, bizarre: 168,
    jour: 170, echasses: 176, manteau: 181, gomme: 182, elections: 189, goutez: 204, tout2: 215, delicieux: 220, p1: 221, p2: 222, p3: 223, ville2: 224, gouter: 231, degueu: 234, ajoute: 236,
    jamais: 247, poufM: 253, tombe: 256, pigeon: 260, miette: 265, maire2: 267, promesse: 272, mercredi: 279, fin: 280, mesure2: 281 };
  for (const k in N) e[k] = w(N[k]); return e;
}

// ---------------------------------------------------------------- état de la scène à t
const TOM_K = 1.36, TOM_END = TOM_K * 1.99 / 2.1;
let flash = 0;
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); pigeon.visible = false; sparks.visible = false; ringLight.visible = false; puffN = 0; PUFFS.forEach(p => p.visible = false);
  [...phones, ...bowls, spoon, ladle, cookie].forEach(o => o.visible = false); tomSash.visible = false; stink.forEach(s => s.visible = false); flies.forEach(f => f.visible = false);
  const mu = mayor.userData.root.userData; mu.coat.position.y = 0; mu.door.rotation.y = 0; mayor.userData.root.rotation.set(0, 0, 0); mayor.userData.head.visible = true;
  banner.material.map = t > E.promesse - .3 ? BAN2 : BAN1; toiseMark.userData.lb.material.map = t > E.mesure2 + .6 ? TAG.b : TAG.a;
  phoneScr.material.map = t > E.coche ? CB.on : CB.off;
  GARL.forEach(o => o.visible = !(t > E.promesse - .1 && t < E.fin - .1));
  soupG.forEach(o => o.visible = t > E.elections - .05 && t < E.maire2); crack.visible = t > E.elections;
  const S = (a, b) => t >= a && t < b; const bob = k => Math.sin(t * 2.2 + k) * .12;
  const shrink = (ch, t0, from, to, d = .35) => { ch.scale.setScalar(lerp(from, to, easeBack(seg(t, t0, t0 + d)))); };

  // A. la règle, dans la rue
  if (S(0, E.tout - .05)) {
    place(papy, -8, .2, 5.6, Math.PI - .25); setFace(papy, t < E.rapetisser - .1 ? 'smug' : 'shock'); pose(papy, t < E.rapetisser ? 'talk' : 'idle', t); shrink(papy, E.rapetisser - .05, 1, .45);
    puff(t, E.rapetisser - .1, papy.position.clone().add(V(0, 1, 0)), 1.2);
    for (const [i, x, r] of [[4, -11.5, Math.PI - .9], [8, -5, Math.PI + .6]]) { place(VILL[i], x, .2, 6.2, r); setFace(VILL[i], t > E.rapetisser ? 'shock' : 'smile'); pose(VILL[i], 'idle', t + i); }
    const b = VILL[2]; place(b, 3, .2, 5.6, Math.PI - .2); setFace(b, t < E.centimetre ? 'smug' : 'shock'); pose(b, 'holdOut', t); phones[0].visible = true; shrink(b, E.centimetre - .05, 1, .96, .25);
    puff(t, E.centimetre - .1, b.position.clone().add(V(0, .4, 0)), .5);
    const c = VILL[3]; place(c, 12, .2, 5.8, Math.PI - .3); setFace(c, t < E.gros ? 'nervous' : 'nervous'); pose(c, 'talk', t);
    if (t > E.dors - .5) c.visible = false; puff(t, E.dors - .6, c.position.clone().add(V(0, 1.2, 0)), 1.5);
    if (t > E.dors - .3) { const z = VILL[3]; place(z, MATCH.x, MATCH.y + .17, MATCH.z + .3, 0); z.scale.setScalar(.1); setFace(z, 'sleep'); pose(z, 'idle', 0);
      z.userData.root.rotation.x = -Math.PI / 2; z.userData.root.position.y = .55 * z.userData.root.scale.y; }
  }
  // B. l'origine : la promesse du maire, la fée, le sort
  if (S(E.tout - .05, E.depuis - .05)) {
    place(mayor, 2.2, STAGE.y, -44.6, 0); setFace(mayor, t > E.promis - .2 ? 'talk' : 'smug'); pose(mayor, t > E.promis - .2 && t < E.fee ? 'holdUp' : 'talk', t);
    VILL.forEach((v, i) => { const x = -8 + (i % 5) * 4, z = -34 + Math.floor(i / 5) * 3.2 + (i % 2) * .6; place(v, x, .2, z, Math.PI + (x > 0 ? .25 : -.25)); setFace(v, t > E.paf ? 'shock' : 'smile'); pose(v, t > E.impots && t < E.fee + .5 ? 'holdUp' : 'idle', t + i); });
    place(fee, -9, 3.2 + bob(1) * 2, -49.5, .4); setFace(fee, t > E.paf - .1 ? 'smug' : 'deadpan'); pose(fee, t > E.paf - .15 ? 'cast' : 'idle', t);
    if (t > E.paf) { const k = seg(t, E.paf, E.toute + 1.5); const p = sparks.geometry.attributes.position.array;
      sparkSeeds.forEach((s, i) => { const r = 1 + k * 55 * s[1]; p[i * 3] = -9 + Math.cos(s[0]) * r; p[i * 3 + 1] = 4 + s[2] * 8 + k * 10 * s[1]; p[i * 3 + 2] = -49.5 + Math.sin(s[0]) * r; });
      sparks.geometry.attributes.position.needsUpdate = true; sparkMat.opacity = 1 - seg(t, E.toute + .6, E.toute + 1.5); sparks.visible = true; }
  }
  // C. depuis, c'est le chaos (tailles au hasard)
  if (S(E.depuis - .05, E.pere - .05)) {
    const sz = [.3, 1, .55, .18, .8, 1, .4, .65, .25, .9]; VILL.forEach((v, i) => { const x = -20 + i * 4.2, z = i % 2 ? 5.4 : -5.4; place(v, x, .2, z, i % 2 ? Math.PI - .3 : .3); v.scale.setScalar(sz[i]); setFace(v, ['shock', 'worried', 'smile', 'shock', 'talk'][i % 5]); pose(v, i % 3 ? 'walk' : 'idle', t + i); });
  }
  // D. papa et le dernier cookie (cuisine)
  if (S(E.pere - .05, E.mere - .05)) {
    place(dad, KIT.x - .6, .2, KIT.z + 2.4, 0); setFace(dad, 'crumbs'); pose(dad, t < E.pouf1 ? 'talk' : 'idle', t); shrink(dad, E.pouf1 - .05, 1, .86);
    puff(t, E.pouf1 - .1, dad.position.clone().add(V(0, 1.4, 0)), 1);
    place(mom, KIT.x + 2.4, .2, KIT.z + 3.4, -1.9); setFace(mom, t > E.pouf1 ? 'smug' : 'suspicious'); pose(mom, 'crossed', t);
  }
  // E. maman et le chapeau de la voisine (devant la maison)
  if (S(E.mere - .05, E.prof - .05)) {
    const x0 = TH.position.x; place(voisine, x0 + 1.0, .2, -4.0, -2.07); setFace(voisine, 'smile'); pose(voisine, 'idle', t);
    const wk = seg(t, E.passe - .3, E.prof - .5); const mz = lerp(-5.2, -8.6, wk), mx = lerp(x0 - 1.2, x0, wk);
    place(mom, mx, .2, mz, wk > 0 ? Math.PI - .3 * (1 - wk) : 1.07); setFace(mom, t < E.pouf2 ? 'smile' : 'shock'); pose(mom, wk > 0 && wk < 1 ? 'walk' : 'talk', t);
    shrink(mom, E.pouf2 - .05, 1, .42); puff(t, E.pouf2 - .1, V(x0 - 1.2, 1.2, -5.2), 1.1); if (mz < -8.4) mom.visible = false;
  }
  // F. le prof de sport
  if (S(E.prof - .05, E.trousse - .05)) { place(prof, 6, .2, -26, -.3); setFace(prof, t < E.pouf3 ? 'smug' : 'shock'); pose(prof, 'crossed', t); shrink(prof, E.pouf3, 1, .2); puff(t, E.pouf3 - .05, V(6, 1.2, -26), 1.2);
    place(VILL[1], 9, .2, -23.5, -2.4); setFace(VILL[1], 'smile'); pose(VILL[1], 'idle', t); }
  // G. la trousse et le dé à coudre
  if (S(E.trousse - .05, E.toi - .05)) {
    place(prof, TROUSSE.x, DESK + .06, TROUSSE.z, 0); prof.scale.setScalar(.22); setFace(prof, 'smile'); pose(prof, 'cast', t * .6);
    [5, 6, 7].forEach((k, j) => { const v = VILL[k]; place(v, THIMBLE.x + (j - 1) * .16, DESK + .02, THIMBLE.z + (j % 2) * .08, (j - 1) * .5); v.scale.setScalar(.2); setFace(v, 'smile'); pose(v, 'holdOut', t + j); phones[j + 1].visible = true; });
    ringLight.visible = true; ringLight.position.set(THIMBLE.x, DESK + .75, THIMBLE.z + .45);
  }
  // H. « Et toi, oui toi… »
  if (S(E.toi - .05, E.tom - .05) && !S(E.coche - .05, E.regarde - .05)) { place(tom, -20, .2, 5.4, Math.PI); tom.scale.setScalar(TOM_K); setFace(tom, 'smug'); pose(tom, t > E.regarde ? 'pointDown' : 'pointCam', t); }
  // I. Tom, 2,10 m, devant sa maison et la toise
  if (S(E.tom - .05, E.seul - .05) || S(E.fin - .3, END + 1)) {
    const x0 = TH.position.x; place(tom, x0 + 1.55, .2, -7.55, 0); const endK = t > E.fin - .3;
    tom.scale.setScalar(endK ? lerp(TOM_K, TOM_END, easeBack(seg(t, E.mesure2 + .3, E.mesure2 + .7))) : TOM_K); if (endK) { tomSash.visible = true; puff(t, E.mesure2 + .25, V(x0 + 1.55, 3, -7.3), .8); }
    setFace(tom, endK ? (t > E.mesure2 + .5 ? 'deadpan' : 'smile') : (t > E.ducoup ? 'deadpan' : 'smile')); pose(tom, 'idle', t);
    if (!endK && t > E.ducoup - .3) { place(dad, x0 + .1, .2, -6.6, .4); dad.scale.setScalar(.86); setFace(dad, 'smile'); pose(dad, 'idle', t); place(mom, x0 + 3.0, .2, -6.4, -.4); mom.scale.setScalar(.42); setFace(mom, 'smile'); pose(mom, 'idle', t); }
    tom.updateMatrixWorld(true); const hp = tom.userData.hd.getWorldPosition(V(0, 0, 0)); toiseMark.position.y = hp.y + 1.25 * tom.userData.root.scale.y * tom.scale.x;
  } else toiseMark.position.y = 4.6;
  // J. le maire, 3 m, échasses, maire minuscule
  if (S(E.seul - .05, E.elections - .05)) {
    place(mayor, -14, .2, -47.5, .35); setFace(mayor, t > E.manteau ? 'shock' : 'smug'); pose(mayor, 'crossed', t);
    if (t > E.jour) mu.coat.position.y = .9 * Math.sin(Math.PI * seg(t, E.jour + .2, E.manteau - .3)) ** .5;
    mu.door.rotation.y = -1.9 * easeOut(seg(t, E.manteau - .2, E.manteau + .4));
    if (t > E.manteau - .3) { mayor.updateMatrixWorld(true); const mp = mayor.userData.root.localToWorld(V(0, 2.02, .1)); place(mini, mp.x, mp.y, mp.z, mayor.rotation.y); setFace(mini, t > E.gomme + .3 ? "worried" : "shock"); pose(mini, "idle", t); }
    place(tom, -9.5, .2, -42.5, -2.4); tom.scale.setScalar(TOM_K); setFace(tom, t > E.gomme ? 'shock' : 'suspicious'); pose(tom, 'idle', t);
  }
  // K. élections, soupe, « délicieux », pouf pouf pouf
  if (S(E.elections - .05, E.maire2 - .05)) {
    const fall = seg(t, E.poufM, E.poufM + .5);
    place(mayor, SOUP.x + 3.4, .2, SOUP.z - 1.2, -.25); setFace(mayor, t > E.jamais - .1 ? 'talk' : 'smug'); pose(mayor, t > E.goutez - .1 && t < E.poufM ? 'holdOut' : 'talk', t); ladle.visible = t > E.goutez - .1 && t < E.poufM;
    if (t > E.poufM) { mayor.userData.root.rotation.x = -fall * 1.45; mu.door.rotation.y = -1.2 * fall; puff(t, E.poufM - .05, V(SOUP.x + 3.4, 3.5, SOUP.z - 1.2), 2.2); }
    const line = VILL.slice(0, 8); line.forEach((v, i) => { const x = -7 + i * 2, z = SOUP.z + 5 + (i % 2) * .8; place(v, x, .2, z, Math.PI); const grp = i < 3 ? E.p1 : i < 6 ? E.p2 : E.p3;
      const said = t > E.delicieux - .1; setFace(v, t > grp ? 'shock' : said ? 'nervous' : 'smile'); pose(v, t > E.tout2 - .1 && t < grp ? 'holdOut' : 'idle', t + i); bowls[i].visible = t > E.goutez && t < grp;
      shrink(v, grp - .02, 1, .11); puff(t, grp - .06, V(x, 1, z), .7); if (t > E.ville2) { v.position.set(8.4 - Math.floor(i / 4) * .45, groundY(0, -30), SOUP.z + 4.6 + (i % 4) * .42); v.rotation.y = 1.57; } });
    place(tom, 9.5, .2, SOUP.z + 5.2, t > E.ville2 ? -1.3 : (t > E.gouter - .2 ? -.75 : Math.PI + .4)); tom.scale.setScalar(TOM_K); spoon.visible = t > E.gouter - .1 && t < E.ajoute;
    setFace(tom, t > E.degueu - .1 && t < E.ajoute ? 'disgust' : t > E.ajoute ? 'smug' : t > E.poufM ? 'smile' : 'deadpan'); pose(tom, t > E.gouter - .1 && t < E.degueu - .2 ? 'eat' : t > E.ajoute && t < E.jamais ? 'talk' : 'idle', t);
    stink.forEach((s, i) => { s.visible = t > E.goutez - .5; s.position.set(SOUP.x - .4 + i * .4, 2.55 + ((t * .5 + i * .33) % 1) * .4, SOUP.z); s.material.opacity = .8; });
    flies.forEach((f, i) => { f.visible = t > E.goutez - .5 && t < E.poufM; const a = t * (3 + i) + i * 1.6; f.position.set(SOUP.x + Math.cos(a) * (.7 + i * .12), 3 + Math.sin(a * 1.3) * .3 + i * .1, SOUP.z + Math.sin(a) * (.7 + i * .12)); f.rotation.y = -a; });
    // le mini-maire : caché dans le manteau, tombe entre deux pavés, puis le pigeon le picore
    if (t > E.poufM - .05 && t < E.pigeon + .65) { const ft = seg(t, E.poufM, E.poufM + .45), sink = seg(t, E.tombe, E.tombe + .4);
      const p = V(SOUP.x + 3.3, 2.3, SOUP.z - .8).lerp(V(crack.position.x, .2, crack.position.z + .1), easeOut(ft)); p.y = lerp(2.3, .2, ft * ft) - sink * .1;
      place(mini, p.x, p.y, p.z, .3); mini.scale.setScalar(lerp(1, .5, seg(t, E.poufM, E.poufM + .3))); setFace(mini, 'shock'); pose(mini, ft < 1 ? 'cast' : 'reach', t * 2); }
    if (t > E.pigeon - .4) { pigeon.visible = true; const wk = seg(t, E.pigeon - .4, E.pigeon + .3), fl = seg(t, E.miette + .2, E.miette + 1.6);
      pigeon.position.set(lerp(6.4, crack.position.x + 1, wk) + fl * 3, .2 + fl * fl * 6, crack.position.z + .1); pigeon.rotation.y = -1.57 + fl * .4;
      const peck = t > E.pigeon + .3 && t < E.pigeon + 1 ? Math.sin(seg(t, E.pigeon + .3, E.pigeon + 1) * Math.PI) : 0; pigeon.userData.head.rotation.x = peck * 1.1; pigeon.userData.head.position.set(0, 1.05 - peck * .3, .55 + peck * .25);
      for (const s of [-1, 1]) pigeon.userData['w' + s].rotation.z = fl > 0 ? s * Math.sin(t * 30) * .8 : 0; }
  }
  // L. Tom maire, sur l'estrade
  if (S(E.maire2 - .05, E.fin - .3)) {
    place(tom, -2.2, STAGE.y, -44.6, .15); tom.scale.setScalar(TOM_K); tomSash.visible = true; setFace(tom, 'smile'); pose(tom, t > E.promesse ? 'holdUp' : 'talk', t);
    VILL.forEach((v, i) => { const x = -6 + (i % 5) * 3, z = -38.5 + Math.floor(i / 5) * 1.6; place(v, x, .2, z, Math.PI); v.scale.setScalar(.2); setFace(v, 'laugh'); pose(v, 'holdUp', t + i); v.position.y += Math.abs(Math.sin(t * 6 + i)) * .2; });
  }
}

// ---------------------------------------------------------------- plans (calés sur les mots, cadrés sur le sujet réel)
const FR = { sign: [12, .4, 44], toise: [8.5, .3, 40], phone: [1.6, 3.8, 40], macro: [2.4, 1.2, 38], macro2: [1.5, .3, 40], banner: [33, .5, 44], mws: [16, 3, 40], grp: [13, 1.2, 40], puf: [6, 2.2, 40], top: [4, 3.6, 42], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38],
  fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42], feet: [3.4, -.6, 36], high: [9, 9, 42] };
const SUBJ = { tom: () => tom, mom: () => mom, dad: () => dad, papy: () => papy, voisine: () => voisine, prof: () => prof, fee: () => fee, mayor: () => mayor, mini: () => mini,
  vA: () => VILL[0], vB: () => VILL[2], vC: () => VILL[3], v4: () => VILL[4], v6: () => VILL[6] };
const sizeOf = ch => Math.max(.06, ch.scale.x * ch.userData.root.scale.y / .5);
function subjectPoint(name, part) {
  if (name === 'pigeon') return { p: pigeon.position.clone().add(V(0, .8, 0)), face: pigeon.rotation.y, k: 1 };
  if (name.startsWith('@')) { const [x, y, z, f] = name.slice(1).split(',').map(Number); return { p: V(x, y, z), face: f || 0, k: 1 }; }
  const ch = SUBJ[name](); ch.updateMatrixWorld(true);
  const p = part === 'feet' ? ch.position.clone().add(V(0, .45 * sizeOf(ch), 0)) : part === 'body' ? ch.userData.torso.getWorldPosition(V(0, 0, 0)) : ch.userData.hd.getWorldPosition(V(0, 0, 0));
  return { p, face: ch.rotation.y, ch, k: sizeOf(ch) };
}
const RAY = new THREE.Raycaster();
function buildShots() {
  const S = [];
  const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  // A. la règle
  A(0, 'papy', 'ms', 15); A(3, 'papy', 'mcu', -10); A(6, 'papy', 'fs', 0, 'body');
  A(8, 'vB', 'mcu', 10); A(10, 'vB', 'ms', -15, 'body'); A(13, 'vC', 'mcu', 15); A(15, 'vC', 'fs', -10, 'body');
  A(16, '@20,.45,5.3', 'macro', 15, null, 'static'); A(19, '@20,.45,5.3', 'macro2', -35);
  // B. l'origine
  A(22, '@1,4,-38', 'ws', 0, null, 'pan'); A(24, 'mayor', 'low', 15); A(28, 'mayor', 'mcu', -15); A(31, 'mayor', 'ms', 10, 'body'); A(33, 'vC', 'ms', 10, 'body');
  A(36, 'fee', 'ms', 10); A(39, 'fee', 'mcu', -15); A(43, 'fee', 'fs', 0, 'body'); A(46, '@-9,6,-45', 'xws', 10, null, 'up'); A(50, '@0,4,-25', 'xws', 25);
  // C. chaos
  A(53, '@-2,2,0', 'ws', 80, null, 'pan');
  // D. papa
  A(57, 'dad', 'mcu', 10); A(59, 'dad', 'ms', -20); A(62, 'mom', 'mcu', 15); A(65, 'dad', 'fs', 0, 'body'); A(68, 'mom', 'cu', 0); A(70, 'dad', 'cu', 0);
  // E. maman et le chapeau
  A(76, 'voisine', 'ms', 10, 'body'); A(80, 'voisine', 'mcu', 25); A(81, 'mom', 'mcu', 20); A(85, 'voisine', 'cu', 10); A(87, 'mom', 'fs', 20, 'body'); A(89, '@-38.4,1.4,-7', 'fs', 25);
  // F/G. le prof, la trousse, le dé à coudre
  A(96, 'prof', 'ms', 10, 'body'); A(99, 'prof', 'mcu', -15); A(103, 'prof', 'cu', 5); A(107, 'prof', 'fs', 0, 'body');
  A(108, '@398.8,2.5,100.2', 'macro', 20); A(111, '@398.8,2.5,100.2', 'macro2', -25); A(114, '@401.3,2.55,100.3', 'macro', 15); A(118, '@401.3,2.55,100.3', 'macro2', -20);
  // H. « Et toi… »
  A(123, 'tom', 'cu', 0, null, 'static'); A(126, 'tom', 'mcu', 10); A(129, '@400.2,2.25,101', 'phone', 0, null, 'static'); A(135, 'tom', 'cu', -5);
  // I. Tom et la toise
  A(138, 'tom', 'mcu', 15); A(141, 'tom', 'cu', -10); A(145, '@-36.6,2.2,-7', 'grp', 0); A(150, '@-36,3.3,-8.3', 'toise', 0, null, 'static');
  // J. le maire, les échasses, le mini-maire
  A(156, 'mayor', 'fs', 10, 'body'); A(160, 'mayor', 'low', 20); A(165, 'mayor', 'low', -15, 'body'); A(167, 'mayor', 'mcu', 0); A(168, 'tom', 'cu', -10);
  A(170, 'mayor', 'feet', 20, 'feet'); A(176, 'mayor', 'feet', -10, 'feet'); A(178, 'mayor', 'ms', 10, 'body'); A(182, 'mini', 'fs', 0, 'body'); A(185, 'tom', 'cu', 0); A(187, 'mini', 'ms', 20);
  // K. élections et soupe
  A(189, '@0,5,-40', 'ws', 0); A(193, 'mayor', 'mcu', 15); A(197, '@-12,2.3,-38,.5', 'sign', 0, null, 'static'); A(201, 'mayor', 'cu', -10);
  A(204, 'mayor', 'ms', 10, 'body'); A(207, '@0,2.6,-34', 'ms', 25); A(210, 'mayor', 'cu', 0); A(212, '@0,2,-30,3.14', 'high', 0);
  A(215, 'vA', 'mcu', 0); A(218, 'v4', 'mcu', -10); A(220, 'v6', 'cu', 0); A(221, '@-5,1.2,-29,3.14', 'puf', -35, null, 'static'); A(222, '@0,1.2,-29,3.14', 'puf', 35, null, 'static'); A(223, '@5,1.2,-29,3.14', 'puf', 35, null, 'static');
  A(224, 'tom', 'feet', -20, 'feet'); A(227, 'tom', 'low', -30);
  A(231, 'tom', 'mcu', -35); A(233, 'tom', 'cu', 0); A(236, 'tom', 'mcu', -20); A(239, 'mayor', 'mcu', 10); A(243, 'tom', 'cu', 10); A(247, 'mayor', 'cu', 0); A(250, 'mayor', 'mcu', 15);
  A(253, '@.4,2.5,-35', 'fs', 30, null, 'static'); A(255, '@3.4,.35,-34.1', 'macro', 20); A(258, '@3.4,.35,-34.1', 'macro2', -25); A(260, 'pigeon', 'ms', 90); A(264, 'pigeon', 'fs', 80, null, 'up');
  // L. Tom maire + toise finale
  A(267, 'tom', 'mcu', 10); A(270, 'tom', 'mws', 15, 'body'); A(272, '@0,6.2,-47.8', 'banner', 0, null, 'static'); A(280, 'tom', 'mcu', 0); A(281, '@-36,3.3,-8.3', 'toise', 0, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function cameraAt(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].t <= t) i = k;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : END, k = seg(t, sh.t, t1);
  const sp = subjectPoint(sh.subj, sh.part), { p, face } = sp; const [D0, H0, fov] = FR[sh.fr]; const d0 = D0 * sp.k, h = H0 * sp.k;
  let d = d0 * (sh.move === 'push' ? lerp(1.03, .97, k) : 1), yaw = face + sh.yaw * Math.PI / 180 + (sh.move === 'pan' ? lerp(-.12, .12, k) : 0);
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw)); const hh = h + (sh.move === 'up' ? lerp(-.15, .15, k) * d0 : 0);
  let cam = p.clone().addScaledVector(dir, d).add(V(0, hh, 0));
  const look = p.clone(); if (sh.move === 'up') look.y += lerp(-.08, .1, k) * d0;
  const toCam = cam.clone().sub(look), L = toCam.length(); RAY.set(look, toCam.normalize()); RAY.far = L;
  const hit = RAY.intersectObjects(BLOCKERS, false)[0]; if (hit && hit.distance > .6 * sp.k) cam = look.clone().addScaledVector(toCam, Math.max(1.2 * sp.k, hit.distance - .5 * sp.k));
  cam.y = Math.max(cam.y, groundY(cam.x, cam.z) + .12);
  const sub = sp.ch, seg3 = look.clone().sub(cam), sl = seg3.length(); seg3.normalize();
  for (const c of sub ? ALL : []) { if (!c.visible || c === sub || c.scale.x * c.userData.root.scale.y < .1 || (sub === mayor && c === mini) || (sub === mini && c === mayor)) continue;
    const ctr = c.userData.torso.getWorldPosition(V(0, 0, 0)), rel = ctr.clone().sub(cam), along = rel.dot(seg3); const cs = c.scale.x * c.userData.root.scale.y;
    if (sub && Math.hypot(ctr.x - sub.position.x, ctr.z - sub.position.z) < 1.4 * sp.k && Math.abs(ctr.y - sub.userData.torso.getWorldPosition(V(0, 0, 0)).y) < 2.5 * sp.k) { c.visible = false; continue; }
    if (along < -.6 * sp.k || along > sl - 1.3 * sp.k) continue; const perp = rel.addScaledVector(seg3, -along).length();
    if (perp < 3.2 * cs + .3 * sp.k) c.visible = false; }
  return { p: cam, c: look, f: fov, cut: t - sh.t };
}

// ---------------------------------------------------------------- habillage : onomatopées, bulles, sous-titres
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function onoma(text, x, y, a, { size = 110, rot = -.08, fill = '#ffd23f', stroke = '#1c1c22' } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); g.rotate(rot); const s = easeBack(clamp(a * 1.8)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = stroke;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.strokeText(text, 0, 0); g.shadowColor = 'transparent'; g.fillStyle = fill; g.fillText(text, 0, 0); g.restore();
}
function bubble(text, x, y, a, tail = -1) { if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); const s = easeBack(clamp(a * 1.6)); g.scale(s, s);
  g.font = "900 62px 'Inter Display'"; const words = text.split(' '), lines = ['']; for (const wd of words) { const tt = (lines[lines.length - 1] + ' ' + wd).trim(); if (g.measureText(tt).width > 520 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tt; }
  const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 90, bh = lines.length * 70 + 60;
  g.fillStyle = '#fff'; g.strokeStyle = '#1c1c22'; g.lineWidth = 8; g.beginPath(); g.moveTo(tail * 40, bh / 2 - 4); g.lineTo(tail * 110, bh / 2 + 70); g.lineTo(tail * -30, bh / 2 - 4); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 44); g.fill(); g.stroke(); g.beginPath(); g.moveTo(tail * 36, bh / 2 - 6); g.lineTo(tail * -26, bh / 2 - 6); g.lineWidth = 12; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#1c1c22'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * 70 + 4)); g.restore(); }
function overlays(t) {
  const headAt = (ch, dy = .9) => { const p = ch.userData.hd.getWorldPosition(V(0, 0, 0)); p.y += dy * sizeOf(ch); return project(p); };
  const onScreen = ([x, y, z]) => z < 1 && x > 60 && x < W - 60 && y > 150 && y < H - 300;
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (onScreen(q)) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b || !ch.visible) return; const q = headAt(ch); if (onScreen(q)) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1] - 110, 280, 1050), win(t, a, b, .12), o); };
  const say = (txt, ch, a, b) => { if (t < a || t > b || !ch.visible) return; const q = headAt(ch, 1.2); if (onScreen(q) || q[2] < 1) bubble(txt, clamp(q[0] + 90, 330, W - 330), clamp(q[1] - 260, 300, 820), win(t, a, b, .15)); };
  say("J'ai 25 ans !", papy, .1, E.rapetisser - .12); pop('POUF !', papy, E.rapetisser - .1, E.petit - .05, { size: 130 });
  say("J'arrive dans 2 min !", VILL[2], E.petit - .25, E.centimetre - .08); pop('-1 cm', VILL[2], E.centimetre - .05, E.gros - .1, { size: 100, fill: '#ff8a3d' });
  say("C'est pas moi !", VILL[3], E.gros - .25, E.dors - .55); popAt('POUF !', VILL[3].position.clone().add(V(0, 2.4, 0)), E.dors - .6, E.dors - .1, { size: 140 });
  if (t > E.dors) popAt('RONF…', V(MATCH.x + .25, MATCH.y + .55, MATCH.z + .2), E.dors + .2, E.tout - .1, { size: 96, fill: '#bfe8ff', rot: .1 });
  pop('PFFF…', fee, E.fee + .5, E.paf - .15, { size: 96, fill: '#ff9ad8', rot: .06 }); pop('PAF !', fee, E.paf, E.paf + 1.1, { size: 150, fill: '#ff4d4d' });
  pop('POUF !', dad, E.pouf1 - .05, E.pouf1 + 1, { size: 130 }); pop('POUF !', mom, E.pouf2 - .05, E.pouf2 + 1, { size: 130 }); pop('POUF !', prof, E.pouf3, E.pouf3 + .9, { size: 130 });
  popAt('CLIC', V(PHONE.x + .25, DESK + .3, PHONE.z - .5), E.coche, E.coche + .9, { size: 96, fill: '#7fd3ff' });
  popAt('BZZZ', V(SOUP.x + .8, 3.3, SOUP.z), E.goutez + .2, E.goutez + 1.8, { size: 80, fill: '#c8f07a', rot: .1 });
  for (const [k, x] of [['p1', -5], ['p2', 0], ['p3', 5]]) popAt('POUF !', V(x, 2.6, SOUP.z + 5.2), E[k] - .03, E[k] + .7, { size: 120 });
  pop('BEURK !', tom, E.degueu - .05, E.ajoute - .1, { size: 130, fill: '#8ad04a' });
  popAt('POUF !!!', V(SOUP.x + 3.4, 4.4, SOUP.z - 1.2), E.poufM - .05, E.poufM + 1.2, { size: 160, fill: '#ff4d4d' });
  if (pigeon.visible) popAt('MIAM !', pigeon.position.clone().add(V(0, 2, 0)), E.miette - .3, E.miette + 1.2, { size: 110, fill: '#ffd23f' });
  pop('POUF', tom, E.mesure2 + .25, E.mesure2 + 1, { size: 90 });
  const fl = t > E.paf ? .6 * Math.exp(-(t - E.paf) * 6) : 0; if (fl > .01) { g.fillStyle = `rgba(255,240,250,${fl})`; g.fillRect(0, 0, W, H); }
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
window.render = function (t) {
  update(t);
  scene.updateMatrixWorld(true);
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; camera.near = cam.p.distanceTo(cam.c) < 3 ? .02 : .05; camera.updateProjectionMatrix();
  const s = 45, tex = 2 * s / sun.shadow.mapSize.x;
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
