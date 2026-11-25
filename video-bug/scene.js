// « Dans cette ville, il se passe des trucs bizarres » (plot twist : c'est un jeu vidéo) — rendu déterministe : window.render(t)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe7ff, 160, 900);
const camera = new THREE.PerspectiveCamera(40, W / H, .05, 4000);
const composer = new EffectComposer(renderer); composer.setSize(GW, GH); composer.addPass(new RenderPass(scene, camera));
const FAST = new URLSearchParams(location.search).has('fast');   // ?fast : sans occlusion ambiante (vérification rapide)
const gtao = new GTAOPass(scene, camera, GW, GH); gtao.blendIntensity = .85; gtao.updateGtaoMaterial({ radius: .9, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 16 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
if (!FAST) composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(GW / 2, GH / 2), .28, .45, .92); composer.addPass(bloom);
const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: .0025, maxblur: .006 }); composer.addPass(bokeh);
composer.addPass(new OutputPass());
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, sat: { value: 1.14 }, con: { value: 1.06 }, warm: { value: .03 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float sat, con, warm; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114)); vec3 r = mix(vec3(l), c.rgb, sat); r = (r - .5) * con + .5; r += vec3(warm, warm * .4, -warm * .6); gl_FragColor = vec4(clamp(r, 0., 1.), c.a); }' });
composer.addPass(grade);
const hemi = new THREE.HemisphereLight(0xd6ecff, 0xb89a70, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c2, 2.7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.radius = 6; sun.shadow.blurSamples = 12; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const camLight = new THREE.PointLight(0xffffff, 6, 14, 1.6); let CAMI = 6; scene.add(camLight);
const rim = new THREE.DirectionalLight(0xbfe0ff, 1.4); scene.add(rim, rim.target);
const SUN_DIR = V(.45, .8, .4).normalize();

// ciel + nuages
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#3f8fe6') }, mid: { value: new THREE.Color('#8cc6f5') }, bot: { value: new THREE.Color('#dff0ff') } },
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .1 ? mix(mid, top, smoothstep(.1,.6,h)) : mix(bot, mid, smoothstep(-.05,.1,h)); gl_FragColor = vec4(c,1.); }' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat));
const cloudMat = mat('#ffffff', { roughness: 1 });
function cloud(x, y, z, s) { const c = new THREE.Group(); c.position.set(x, y, z); const r = rng(Math.round(Math.abs(x * 7 + z)) + 1);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry((3 + r() * 2.5) * s, 16, 10), cloudMat); b.scale.y = .75; b.position.set((i - 2) * 3.6 * s, (i === 2 ? 1.6 : r()) * s, (r() - .5) * 3 * s); c.add(b); }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8 * s, 8 * s, 1.2 * s, 20), cloudMat); base.scale.z = .45; base.position.y = -1.6 * s; c.add(base);
  scene.add(c); return c; }
{ const r = rng(5); for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = 150 + r() * 500; cloud(Math.cos(a) * d, 110 + r() * 140, Math.sin(a) * d, 1.6 + r() * 1.6); } }
// couche de nuages traversée par Lou et Tom

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
const WIN = mat('#5f7f9f', { roughness: .2, metalness: .3, emissive: new THREE.Color('#ffc66a'), emissiveIntensity: 0 });
function makeHouse({ w = 9.2, h = 8, d = 8, wall = '#e9d8b8', roof = '#5a3a32', shutter = '#3b6ea8' }) {
  const grp = new THREE.Group(); const M = c => mat(c);
  const body = box(w, h, d, M(wall), .3); body.position.y = h / 2; grp.add(body); BLOCKERS.push(body);
  const r1 = box(w + .15, .5, d * .62, M(roof), .2); r1.position.set(0, h + 1.2, d * .25); r1.rotation.x = -.6; grp.add(r1);
  const r2 = box(w + .15, .5, d * .62, M(roof), .2); r2.position.set(0, h + 1.2, -d * .25); r2.rotation.x = .6; grp.add(r2);
  const gab = box(w - .2, 2.2, d * .3, M(wall)); gab.position.set(0, h + .9, 0); grp.add(gab);
  const dr = box(1.6, 2.8, .2, M('#6b4423')); dr.position.set(0, 1.4, d / 2 + .05); grp.add(dr);
  const frameM = M('#fbf6ec'), shutM = M(shutter), glass = WIN;
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
    if (expr === 'yawn') { closed(L, EY, false); closed(R, EY, false); brow(L, 82, -5); brow(R, 82, 5); c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(128, 186, 30, 44, 0, 0, 7); c.fill();
      c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(128, 212, 18, 12, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(110, 142, 36, 8); c.fillStyle = '#7fd3ff'; c.beginPath(); c.ellipse(60, EY + 20, 6, 10, 0, 0, 7); c.fill(); return; }
    if (expr === 'sneeze') { c.lineWidth = 10; for (const x of [L, R]) { c.beginPath(); c.moveTo(x - 18, EY - 10); c.lineTo(x + 2, EY); c.lineTo(x - 18, EY + 10); c.stroke(); } c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(128, 182, 26, 18, 0, 0, 7); c.fill();
      c.fillStyle = '#bfe8ff'; for (const [x, y] of [[96, 226], [128, 236], [160, 228], [112, 246], [146, 248]]) { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); } return; }
    if (expr === 'presneeze') { eye(L, EY - 6); eye(R, EY - 6); brow(L, 70, -10); brow(R, 70, 10); c.beginPath(); c.ellipse(128, 182, 14, 10, 0, 0, 7); c.fill(); c.fillStyle = '#ff9a9a'; c.beginPath(); c.ellipse(128, 150, 20, 12, 0, 0, 7); c.fill(); return; }
    if (expr === 'tired') { eye(L, EY + 6); eye(R, EY + 6); c.fillStyle = '#f2c79c'; for (const x of [L, R]) c.fillRect(x - 24, EY - 22, 48, 22); c.strokeStyle = '#6a4a8a'; c.lineWidth = 7; for (const x of [L, R]) { c.beginPath(); c.arc(x, EY + 22, 18, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 8; c.beginPath(); c.moveTo(110, 184); c.lineTo(146, 180); c.stroke(); return; }
    if (expr === 'shh') { closed(L, EY); eye(R, EY); c.beginPath(); c.ellipse(128, 176, 10, 8, 0, 0, 7); c.fill(); blush(); return; }
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
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .5, 2, 0); root.add(hip); const l = box(.95, 2, 1, P, .14); l.position.y = -1; hip.add(l); legs.push(hip); }
  const torso = box(2, 2, 1, SH, .2); torso.position.y = 3; root.add(torso);
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 1.5, 3.85, 0); root.add(sh); const a = box(.95, 2, 1, SH, .14); a.position.y = -.9; sh.add(a);
    const hnd = box(.9, .45, .95, S, .05); hnd.position.y = -1.95; sh.add(hnd); arms.push(sh); }
  const head = new THREE.Group(); head.position.y = 4.02; root.add(head);
  const hd = box(1.45, 1.4, 1.4, S, .36); hd.position.y = .7; head.add(hd);
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
  if (kind === 'run') { const q = Math.sin(t * 13); legs[0].rotation.x = q * 1; legs[1].rotation.x = -q * 1; arms[0].rotation.x = -q * 1.1; arms[1].rotation.x = q * 1.1; root.rotation.x = .22; root.position.y = Math.abs(Math.cos(t * 13)) * .25 * SC; }
  if (kind === 'oldwalk') { const q = Math.sin(t * 2.6); legs[0].rotation.x = q * .25; legs[1].rotation.x = -q * .25; arms[0].rotation.x = .4; arms[1].rotation.x = .4; root.rotation.x = .35; head.rotation.x = -.35; }
  if (kind === 'crawl') { const q = Math.sin(t * 3); root.rotation.x = 1.45; root.position.y = .55 * SC; root.position.z = -2.2 * SC; arms[0].rotation.x = -2.6 + q * .5; arms[1].rotation.x = -2.6 - q * .5; legs[0].rotation.x = q * .3; legs[1].rotation.x = -q * .3; head.rotation.x = -1.1; }
  if (kind === 'pointUp') { arms[1].rotation.set(-2.7, 0, -.35); head.rotation.x = .05; }
  if (kind === 'windup') { arms[1].rotation.set(-2.9 + Math.sin(t * 3) * .1, 0, .3); root.rotation.y = .4; }
  if (kind === 'throw') { arms[1].rotation.set(-1.2, 0, -.2); root.rotation.y = -.35; root.rotation.x = .15; }
  if (kind === 'robot') { arms[0].rotation.z = -.02; arms[1].rotation.z = .02; }
  if (kind === 'jump') { const q = Math.abs(Math.sin(t * 6)); root.position.y = q * 1.4 * SC; arms[0].rotation.z = -2.6; arms[1].rotation.z = 2.6; legs[0].rotation.x = -q * .4; legs[1].rotation.x = q * .2; }
  if (kind === 'doze') { head.rotation.x = .55 + Math.sin(t * 1.2) * .05; arms[0].rotation.z = -.02; arms[1].rotation.z = .02; root.rotation.x = .06; root.rotation.z = Math.sin(t * .9) * .05; }
  if (kind === 'lie') { root.rotation.x = -Math.PI / 2; root.position.y = .55 * SC; root.position.z = 2.4 * SC; arms[0].rotation.z = -.5; arms[1].rotation.z = .5; legs[0].rotation.z = -.1; legs[1].rotation.z = .1; head.rotation.y = .3; }
  if (kind === 'deskSleep') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; root.rotation.x = .75; arms[0].rotation.set(-2.2, 0, .4); arms[1].rotation.set(-2.2, 0, -.4); head.rotation.x = .2; }
  if (kind === 'yawnPose') { arms[0].rotation.set(-.3, 0, -2.7); arms[1].rotation.set(-.3, 0, 2.7); head.rotation.x = -.25; }
  if (kind === 'sneezePose') { root.rotation.x = .35; head.rotation.x = .25; arms[0].rotation.set(-1.2, 0, .5); arms[1].rotation.set(-1.2, 0, -.5); }
  if (kind === 'shhPose') { arms[1].rotation.set(-2.6, 0, -.55); head.rotation.x = .05; }
  if (kind === 'sitDoze') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; head.rotation.x = .55; head.rotation.z = .25; arms[0].rotation.x = -.3; arms[1].rotation.x = -.3; }
  if (kind === 'eyeroll') { arms[0].rotation.set(.25, 0, -.75); arms[1].rotation.set(.25, 0, .75); head.rotation.x = -.55; head.rotation.z = Math.sin(t * 2) * .2; }
  if (kind === 'facepalm') { arms[1].rotation.set(-2.5, 0, -.7); head.rotation.x = .35; }
  if (kind === 'phoneLook') { arms[1].rotation.set(-1.3, 0, -.2); arms[0].rotation.set(-1.1, 0, .3); head.rotation.x = .45; }
  if (kind === 'cry') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[0].rotation.set(-2.2, 0, .6); arms[1].rotation.set(-2.2, 0, -.6); head.rotation.x = .5; root.rotation.z = Math.sin(t * 14) * .04; }
  if (kind === 'eatSit') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[1].rotation.set(-2 + Math.max(0, Math.sin(t * 3)) * .5, 0, -.4); arms[0].rotation.x = -.3; root.rotation.x = -.1; }
  if (kind === 'jog') { const q = Math.sin(t * 9); legs[0].rotation.x = q * .6; legs[1].rotation.x = -q * .6; arms[0].rotation.set(-.9 - q * .5, 0, 0); arms[1].rotation.set(-.9 + q * .5, 0, 0); root.position.y = Math.abs(Math.cos(t * 9)) * .15 * SC; }
  if (kind === 'dance') { const q = Math.sin(t * 8); arms[0].rotation.set(0, 0, -1.8 - q * .8); arms[1].rotation.set(0, 0, 1.8 - q * .8); legs[0].rotation.x = q * .4; legs[1].rotation.x = -q * .4; root.rotation.z = q * .15; head.rotation.z = -q * .2; }
  if (kind === 'scoop') { const q = Math.sin(t * 7); arms[0].rotation.set(-1.2 - q * .9, 0, .3); arms[1].rotation.set(-1.2 + q * .9, 0, -.3); root.rotation.x = .3; head.rotation.x = .3; }
  if (kind === 'hide') { arms[0].rotation.set(0, 0, -1.55); arms[1].rotation.set(0, 0, 1.55); }
  if (kind === 'sitBored') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[0].rotation.x = -.2; arms[1].rotation.x = -.2; head.rotation.x = .15; head.rotation.z = .2; }
  if (kind === 'peek') { root.rotation.z = .35; arms[1].rotation.set(0, 0, 2.2); arms[0].rotation.set(-.6, 0, 0); }
  if (kind === 'reach') { arms[1].rotation.set(-2.9, 0, .2); arms[0].rotation.z = -1; }
}
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y <= .35 ? groundY(x, z) : y, z); ch.rotation.y = ry; ch.visible = true; }
const headY = ch => (4.02 + .7) * ch.userData.root.scale.y;   // hauteur du centre de la tête
// ---------------------------------------------------------------- personnages
const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => { for (let i = 0; i < 3; i++) { const st = box(2.06, .22, 1.06, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#e8433a'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const mayor = makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu); const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); });
  const bd = box(.9, .45, .05, new THREE.MeshStandardMaterial({ map: textTex(['MODO'], { w: 256, h: 128, size: 80, bg: '#3aff7a', fg: '#1c1c22', border: '#1c1c22' }) })); bd.position.set(-.55, 3.3, .66); bd.visible = false; root.add(bd); root.userData.badge = bd; } });
const baker = makeChar({ shirt: '#ffffff', pants: '#d8d8d8', hair: '#8a6a4a', hairStyle: 'short', extras: (root, head) => { const hat = box(1.4, 1.2, 1.4, mat('#ffffff'), .35); hat.position.y = 2.1; head.add(hat); } });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
const wrench = (() => { const g = new THREE.Group(); g.add(box(.15, 1, .15, mat('#c0c4cc', { metalness: .7 }))); const h = box(.45, .2, .15, mat('#c0c4cc', { metalness: .7 })); h.position.y = .5; g.add(h); mayor.userData.arms[1].add(g); g.position.set(0, -2.2, .4); g.rotation.x = -1.2; g.visible = false; return g; })();
const dog = new THREE.Group(); scene.add(dog); { const C = mat('#c89a5a'); const b = box(1.6, .8, .8, C, .3); b.position.y = .8; dog.add(b); const h = box(.8, .7, .7, C, .3); h.position.set(.85, 1.35, 0); dog.add(h); for (const s of [-1, 1]) { const e = box(.2, .5, .3, mat('#8a5a2a'), .08); e.position.set(.75, 1.45, s * .4); dog.add(e); }
  const n = box(.18, .18, .22, mat('#1c1c22')); n.position.set(1.27, 1.3, 0); dog.add(n); for (const s of [-1, 1]) { const ey = box(.07, .12, .1, mat('#1c1c22')); ey.position.set(1.26, 1.5, s * .18); dog.add(ey); } for (const [x, z] of [[-.5, -.25], [-.5, .25], [.5, -.25], [.5, .25]]) { const l = box(.22, .45, .22, C); l.position.set(x, .22, z); dog.add(l); } }
// décor : boulangerie, mur du voisin, fissure du ciel, sous-sol avec écran
const BK = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 10.2) < 1.2), HV = houses.find(h => h.position.z < 0 && Math.abs(h.position.x + 47.4) < 1.2);
{ const sg = box(6.4, 1.5, .2, new THREE.MeshStandardMaterial({ map: textTex(['BOULANGERIE'], { w: 1024, h: 240, bg: '#fff4d8', fg: '#a8541a', border: '#a8541a', size: 120 }) })); sg.position.set(BK.position.x, 4.4, 8.32); sg.rotation.y = Math.PI; scene.add(sg);
  const ct = box(4.4, 1.3, 1.4, mat('#a8743f'), .06); ct.position.set(BK.position.x, .95, 6.8); scene.add(ct); for (let i = 0; i < 5; i++) { const b = box(1.4, .2, .22, mat('#d89a4a'), .1); b.position.set(BK.position.x - 1.2 + i * .6, 1.75, 6.8); b.rotation.y = .3; scene.add(b); } }
const crackTex = canvasTex(512, 512, c => { c.clearRect(0, 0, 512, 512); c.strokeStyle = '#0a0a14'; c.lineCap = 'round'; const r = rng(7); const br = (x, y, a, l, w_) => { if (l < 20 || w_ < 1) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; c.lineWidth = w_; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); br(x2, y2, a + (r() - .5) * 1.2, l * .75, w_ * .7); if (r() > .45) br(x2, y2, a + (r() - .5) * 2.4, l * .55, w_ * .5); };
  br(256, 256, 0, 90, 16); br(256, 256, Math.PI, 90, 16); br(256, 256, 2, 70, 12); br(256, 256, -1.2, 70, 12); c.fillStyle = '#ff2ad8'; for (let i = 0; i < 40; i++) c.fillRect(200 + r() * 112, 200 + r() * 112, 8, 8); c.fillStyle = '#2affd8'; for (let i = 0; i < 30; i++) c.fillRect(180 + r() * 152, 180 + r() * 152, 6, 6); });
const crack = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, fog: false, toneMapped: false })); crack.position.set(0, 60, -90); scene.add(crack);
const BAS = V(400, 0, 0); { const r = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 16), mat('#2a2a36', { side: THREE.BackSide })); r.position.set(BAS.x, 4, BAS.z); scene.add(r); BLOCKERS.push(r); const f = box(16, .2, 16, mat('#3a3a46')); f.position.set(BAS.x, .1, BAS.z); scene.add(f);
  for (let i = 0; i < 4; i++) { const sv = box(1.4, 4, 1.4, mat('#1c1c22'), .05); sv.position.set(BAS.x - 6 + i * 1.6, 2, BAS.z - 6.8); scene.add(sv); for (let k = 0; k < 6; k++) { const led = box(.12, .08, .05, mat('#3aff7a', { emissive: new THREE.Color('#3aff7a'), emissiveIntensity: 2 })); led.position.set(BAS.x - 6.3 + i * 1.6 + (k % 3) * .25, 1 + k * .45, BAS.z - 6.08); scene.add(led); } }
  const l = new THREE.PointLight(0x7ad0ff, 30, 22, 1.4); l.position.set(BAS.x, 6, BAS.z + 3); scene.add(l); }
function hudTex(lines, sub) { return canvasTex(1024, 576, c => { c.fillStyle = '#06101e'; c.fillRect(0, 0, 1024, 576); c.strokeStyle = '#2affd8'; c.lineWidth = 10; c.strokeRect(10, 10, 1004, 556); c.fillStyle = 'rgba(42,255,216,.08)'; for (let y = 0; y < 576; y += 8) c.fillRect(0, y, 1024, 3);
  if (sub === 'tom') { c.fillStyle = '#f2c79c'; c.fillRect(110, 150, 220, 210); c.fillStyle = '#6a3a1a'; c.fillRect(100, 110, 240, 70); for (let i = 0; i < 3; i++) c.fillRect(120 + i * 70, 70, 50, 50); c.fillStyle = '#1a1a1a'; c.fillRect(160, 230, 28, 36); c.fillRect(256, 230, 28, 36); c.fillRect(190, 310, 70, 12);
    c.fillStyle = '#3fa66b'; c.fillRect(90, 380, 260, 150); c.fillStyle = '#fff'; c.fillRect(90, 410, 260, 22); c.fillRect(90, 460, 260, 22); }
  c.fillStyle = '#2affd8'; c.font = "900 64px 'Inter Display'"; c.textAlign = sub === 'tom' ? 'left' : 'center'; lines.forEach((l, i) => c.fillText(l, sub === 'tom' ? 400 : 512, 200 + i * 100));
  if (sub === 'tom') { c.fillStyle = '#ff3b6a'; c.fillRect(400, 420, 500, 40); c.fillStyle = '#3aff7a'; c.fillRect(400, 420, 380, 40); c.fillStyle = '#ffffff'; c.font = "800 34px 'Inter Display'"; c.fillText('VIE', 400, 405); } }); }
const HUD = { tom: hudTex(['JOUEUR : TOM', 'NIVEAU 3'], 'tom'), bugs: hudTex(['BUG #1 : BOULANGER', '(BOUCLE)', 'BUG #2 : COLLISION', 'VOISIN'], ''), pause: hudTex(['PAUSE', 'RAISON : TOILETTES'], ''), modo: hudTex(['MODÉRATEUR', 'RÉPARATIONS : 1 284'], '') };
const screen = box(10, 5.6, .2, new THREE.MeshBasicMaterial({ map: HUD.tom, toneMapped: false })); screen.position.set(BAS.x, 5.3, BAS.z - 7.8); scene.add(screen);
// fondu au noir
let BLACK = 0;

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { boulanger: 10, bonjour: 18, chien: 24, voisin: 26, mur: 30, matins: 33, fige: 43, pile: 44, pause: 53, fissure: 63, personne: 67, tom: 70, comprendre: 77, nuit: 80, sous: 88, ecran: 93, tete: 97, joueur: 103, maire: 107, derriere: 111, tu: 113, ville: 120, jeu: 123, bug: 128, voisin2: 129, collision: 137,
    pauses: 139, toilettes: 148, maire2: 151, modo: 154, reparait: 156, soudain: 163, voix: 165, chéri: 173, eteins: 174, minuit: 179, noir: 184, bonne: 185, toi: 188, controle: 195 };
  for (const k in N) e[k] = w(N[k]); return e;
}
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); dog.visible = false; wrench.visible = false; mayor.userData.root.userData.badge.visible = false;
  const S = (a, b) => t >= a && t < b; const night = t > E.nuit - .1;
  const NK = ease(seg(t, E.nuit - .2, E.nuit + .4)); skyMat.uniforms.top.value.set('#3f8fe6').lerp(new THREE.Color('#0a1030'), NK); skyMat.uniforms.mid.value.set('#8cc6f5').lerp(new THREE.Color('#1c2a5a'), NK); skyMat.uniforms.bot.value.set('#dff0ff').lerp(new THREE.Color('#2a3a6a'), NK);
  sun.intensity = lerp(2.7, .25, NK); hemi.intensity = lerp(1.35, .5, NK); scene.fog.color.set('#cfe7ff').lerp(new THREE.Color('#1c2440'), NK); WIN.emissiveIntensity = NK * 1.2;
  crack.visible = t > E.pause && t < E.tom || t > E.soudain; crack.material.opacity = t > E.soudain ? 1 : 1; crack.lookAt(camera.position);
  BLACK = seg(t, E.noir - .4, E.noir + .1) * (1 - .5 * seg(t, E.bonne - .3, E.bonne + .3));
  screen.material.map = t > E.reparait - .4 ? HUD.modo : t > E.pauses - .2 ? HUD.pause : t > E.bug - .3 ? HUD.bugs : HUD.tom;
  const frozen = S(E.fige - .1, E.pause + .4);
  const tt = frozen ? E.fige - .1 : t;
  // A. le boulanger en boucle, le chien
  if (S(0, E.voisin - .05)) { const bx = BK.position.x; place(baker, bx, .2, 7.8, Math.PI); setFace(baker, 'smile'); pose(baker, 'talk', t); VILL.slice(0, 3).forEach((v, i) => { place(v, bx - 2 + i * 2, .2, 5.4, Math.PI * 0 + (i - 1) * .2); setFace(v, 'tired'); pose(v, 'idle', t + i); });
    if (t > E.chien - .8) { dog.visible = true; dog.position.set(bx + .6, .2, 5.6); dog.rotation.y = Math.PI / 2; } }
  // B. le voisin dans le mur
  if (S(E.voisin - .05, E.fige - .1)) { const v = VILL[3]; place(v, HV.position.x + 2, .2, -8.15 + Math.sin(t * 20) * .05, Math.PI); setFace(v, 'deadpan'); pose(v, 'walk', t); }
  // C. la ville se fige
  if (S(E.fige - .1, E.fissure - .05)) { VILL.forEach((v, i) => { const x = -14 + i * 4, z = i % 2 ? 5 : -5.2; place(v, x, .2, z, i % 2 ? Math.PI - .4 : .4); setFace(v, ['laugh', 'talk', 'smile', 'shock'][i % 4]); pose(v, ['walk', 'jump', 'talk', 'run'][i % 4], frozen ? tt + i : t + i); });
    dog.visible = true; dog.position.set(0, .2 + (frozen ? 1.2 : 0), 4); dog.rotation.y = 1; }
  // D. la fissure ; E. Tom
  if (S(E.fissure - .05, E.nuit - .1)) { place(tom, 3, .2, -30, Math.PI); setFace(tom, t > E.tom ? 'stern' : 'suspicious'); pose(tom, t > E.tom - .1 ? 'idle' : 'pointUp', t); }
  // F. le sous-sol, l'écran
  if (S(E.nuit - .1, E.soudain - .05)) { if (t < E.sous - .2) { place(tom, lerp(-6, 0, seg(t, E.nuit, E.sous)), .2, -44, Math.PI); setFace(tom, 'suspicious'); pose(tom, 'walk', t); }
    else { place(tom, BAS.x + 1, .2, BAS.z - 1.5, Math.PI); setFace(tom, t > E.tete - .3 ? 'shock' : 'suspicious'); pose(tom, 'idle', t); if (t > E.maire - .1) { tom.rotation.y = .2; } if (t > E.ville) { setFace(tom, t > E.toilettes ? 'laugh' : 'shock'); }
      if (t > E.maire - .3) { const k = seg(t, E.maire - .3, E.derriere); place(mayor, lerp(BAS.x + 6, BAS.x - 1.5, k), .2, lerp(BAS.z + 5, BAS.z + 1.2, k), Math.PI - .8); setFace(mayor, t > E.tu - .1 && t < E.ville ? 'stern' : t > E.modo ? 'smile' : 'talk'); pose(mayor, k < 1 ? 'walk' : 'talk', t);
        mayor.userData.root.userData.badge.visible = t > E.modo - .3; wrench.visible = t > E.reparait - .2; } } }
  // G. la voix du ciel
  if (S(E.soudain - .05, END + 1)) { VILL.forEach((v, i) => { const x = -10 + (i % 4) * 6, z = -28 - Math.floor(i / 4) * 5; place(v, x, .2, z, Math.PI); setFace(v, 'shock'); pose(v, 'idle', t + i); });
    place(tom, 2, .2, -24, Math.PI); setFace(tom, t > E.bonne - .2 ? 'smug' : 'shock'); pose(tom, t > E.toi - .1 ? 'pointCam' : 'idle', t); if (t > E.bonne - .2) tom.rotation.y = 0;
    place(mayor, -2, .2, -24.5, Math.PI); setFace(mayor, 'shock'); pose(mayor, 'idle', t); mayor.userData.root.userData.badge.visible = true; }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42], high: [9, 9, 42], grp: [13, 1.5, 40], sky: [50, -20, 50], scr: [11, 0, 44] };
const SUBJ = { tom: () => tom, mayor: () => mayor, baker: () => baker, v3: () => VILL[3], v1: () => VILL[1], v0: () => VILL[0] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  const bx = BK.position.x, hx = HV.position.x;
  A(0, '@0,4,0', 'ws', 80, null, 'pan'); A(4, `@${bx},2,6.8,3.14`, 'grp', 0); A(10, 'baker', 'mcu', 0); A(14, 'baker', 'cu', 0); A(18, 'baker', 'mcu', 15, null, 'static'); A(21, `@${bx + .6},1.2,5.6,3.14`, 'ms', 30);
  A(25, 'v3', 'ms', 160, 'body'); A(28, `@${hx + 2},2,-8`, 'fs', 30); A(31, 'v3', 'mcu', 120); A(34, `@${hx + 2},2,-8`, 'ms', -40, null, 'static');
  A(37, '@-2,2.5,0', 'ws', 85); A(41, 'v1', 'mcu', 10, null, 'static'); A(44, 'v0', 'mcu', -10, null, 'static'); A(48, '@0,2.2,4', 'fs', 0, null, 'static'); A(51, '@-2,2.5,0', 'ws', 95, null, 'static');
  A(54, '@0,40,-60', 'sky', 0, null, 'up'); A(59, '@0,10,-40', 'xws', 0, null, 'static'); A(65, 'tom', 'mcu', 0); A(70, 'tom', 'cu', 0); A(74, 'tom', 'mcu', 20);
  A(78, '@0,6,-44', 'ws', 0, null, 'static'); A(82, 'tom', 'ms', 30, 'body'); A(87, `@${BAS.x},3,${BAS.z - 3}`, 'grp', 0); A(91, `@${BAS.x},5.3,${BAS.z - 7.8}`, 'scr', 0, null, 'static'); A(95, 'tom', 'cu', 0); A(99, `@${BAS.x},5.3,${BAS.z - 7.8}`, 'scr', 0, null, 'static');
  A(107, 'mayor', 'mcu', 20); A(110, `@${BAS.x},2.6,${BAS.z}`, 'grp', 30); A(113, 'mayor', 'cu', 0, null, 'static'); A(119, 'tom', 'cu', 20); A(122, `@${BAS.x},5.3,${BAS.z - 7.8}`, 'scr', 0, null, 'static'); A(129, 'tom', 'mcu', 25);
  A(138, `@${BAS.x},5.3,${BAS.z - 7.8}`, 'scr', 0, null, 'static'); A(141, 'mayor', 'mcu', 10); A(145, 'tom', 'cu', 15); A(149, 'mayor', 'ms', 20, 'body'); A(153, 'mayor', 'mcu', 0); A(156, `@${BAS.x},5.3,${BAS.z - 7.8}`, 'scr', 0, null, 'static');
  A(163, '@0,40,-60', 'sky', 0, null, 'up'); A(168, '@0,3,-26,3.14', 'grp', 0); A(172, 'tom', 'mcu', 0); A(176, '@0,10,-30', 'xws', 0, null, 'static'); A(180, '@0,3,-26,3.14', 'grp', 0, null, 'static');
  A(185, 'tom', 'mcu', 0, null, 'static'); A(190, 'tom', 'cu', 0, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function bubble2(text, x, y, a) { if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.font = "900 58px 'Inter Display'"; const bw = g.measureText(text).width + 80; g.fillStyle = '#fff'; g.strokeStyle = '#1c1c22'; g.lineWidth = 8; g.beginPath(); g.roundRect(x - bw / 2, y - 55, bw, 110, 40); g.fill(); g.stroke();
  g.fillStyle = '#1c1c22'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 4); g.restore(); }
function overlays(t) {
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > -100 && q[0] < W + 100) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  if (baker.visible && t < E.voisin) { const q = project(baker.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.4, 0))); if (q[2] < 1) { const ph = (t * .8) % 1; bubble2('Bonjour, une baguette ?', clamp(q[0], 300, W - 300), clamp(q[1] - 120, 300, 800), ph < .8 ? 1 : 0); } }
  popAt('BONK', V(HV.position.x + 2, 3.8, -8.2), E.mur - .2, E.fige - .2, { size: 100 }); if (t > E.mur && t < E.fige - .2 && Math.floor(t * 3) % 2) popAt('BONK', V(HV.position.x + 2.6, 4.4, -8.2), E.mur, E.fige - .2, { size: 80 });
  if (t > E.fige - .1 && t < E.pause + .4) { const a = win(t, E.fige - .1, E.pause + .4, .1); g.save(); g.globalAlpha = a * .9; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.fillRect(400, 640, 90, 300); g.fillRect(590, 640, 90, 300); g.restore(); }
  if (t > E.chéri - .4 && t < E.noir) popAt('« ÉTEINS TA CONSOLE ! »', V(0, 30, -60), E.chéri - .4, E.noir, { size: 70, fill: '#ffffff' });
  if (BLACK > 0) { g.fillStyle = `rgba(0,0,0,${BLACK})`; g.fillRect(0, 0, W, H); if (t > E.bonne - .3) { g.fillStyle = 'rgba(0,0,0,.55)'; } }
}
const sizeOf = ch => Math.max(.06, ch.scale.x * ch.userData.root.scale.y / .5);
function subjectPoint(name, part) {
  if (name.startsWith('@')) { const [x, y, z, f] = name.slice(1).split(',').map(Number); return { p: V(x, y, z), face: f || 0, k: 1 }; }
  const ch = SUBJ[name](); ch.updateMatrixWorld(true);
  const p = part === 'feet' ? ch.position.clone().add(V(0, .45 * sizeOf(ch), 0)) : part === 'body' ? ch.userData.torso.getWorldPosition(V(0, 0, 0)) : ch.userData.hd.getWorldPosition(V(0, 0, 0));
  return { p, face: ch.rotation.y, ch, k: sizeOf(ch) };
}
const RAY = new THREE.Raycaster();
function cameraAt(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].t <= t) i = k;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : END, k = seg(t, sh.t, t1);
  const sp = subjectPoint(sh.subj, sh.part), { p, face } = sp; const [D0, H0, fov] = FR[sh.fr]; const d0 = D0 * sp.k, h = H0 * sp.k;
  let d = d0 * (sh.move === 'push' ? lerp(1.04, .96, k) : 1), yaw = face + sh.yaw * Math.PI / 180 + (sh.move === 'pan' ? lerp(-.12, .12, k) : 0);
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw)); const hh = h + (sh.move === 'up' ? lerp(-.15, .15, k) * d0 : 0);
  let cam = p.clone().addScaledVector(dir, d).add(V(0, hh, 0));
  const look = p.clone(); if (sh.move === 'up') look.y += lerp(-.08, .1, k) * d0;
  const toCam = cam.clone().sub(look), L = toCam.length(); RAY.set(look, toCam.normalize()); RAY.far = L;
  const hit = RAY.intersectObjects(BLOCKERS, false)[0]; if (hit && hit.distance > .6 * sp.k) cam = look.clone().addScaledVector(toCam, Math.max(1.2 * sp.k, hit.distance - .5 * sp.k));
  cam.y = Math.max(cam.y, groundY(cam.x, cam.z) + .12);
  const sub = sp.ch, seg3 = look.clone().sub(cam), sl = seg3.length(); seg3.normalize();
  for (const c of sub ? ALL : []) { if (!c.visible || c === sub) continue;
    const ctr = c.userData.torso.getWorldPosition(V(0, 0, 0)), rel = ctr.clone().sub(cam), along = rel.dot(seg3); const cs = c.scale.x * c.userData.root.scale.y;
    if (along < -.6 * sp.k || along > sl - 1.3 * sp.k) continue; const perp = rel.addScaledVector(seg3, -along).length();
    if (perp < 3.2 * cs + .3 * sp.k) c.visible = false; }
  return { p: cam, c: look, f: fov };
}

function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function onoma(text, x, y, a, { size = 110, rot = -.08, fill = '#ffd23f', stroke = '#1c1c22' } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); g.rotate(rot); const s = easeBack(clamp(a * 1.8)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = stroke;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.strokeText(text, 0, 0); g.shadowColor = 'transparent'; g.fillStyle = fill; g.fillText(text, 0, 0); g.restore(); }
function bubble(text, x, y, a, tail = -1) { if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); const s = easeBack(clamp(a * 1.6)); g.scale(s, s);
  g.font = "900 62px 'Inter Display'"; const words = text.split(' '), lines = ['']; for (const wd of words) { const tt = (lines[lines.length - 1] + ' ' + wd).trim(); if (g.measureText(tt).width > 520 && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tt; }
  const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 90, bh = lines.length * 70 + 60;
  g.fillStyle = '#fff'; g.strokeStyle = '#1c1c22'; g.lineWidth = 8; g.beginPath(); g.moveTo(tail * 40, bh / 2 - 4); g.lineTo(tail * 110, bh / 2 + 70); g.lineTo(tail * -30, bh / 2 - 4); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 44); g.fill(); g.stroke(); g.beginPath(); g.moveTo(tail * 36, bh / 2 - 6); g.lineTo(tail * -26, bh / 2 - 6); g.lineWidth = 12; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#1c1c22'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * 70 + 4)); g.restore(); }
function caption(t) {
  let cur = -1; for (let i = 0; i < CAP.length; i++) if (CAP[i].t + VO <= t) cur = i;
  if (cur < 0) return; const c = CAP[cur], nx = CAP[cur + 1]; const endT = nx && nx.t - c.e < .7 ? nx.t + VO : c.e + VO + .3; if (t > endT) return;
  const k = easeBack(seg(t, c.t + VO, c.t + VO + .1)); g.save(); g.translate(540, 1240); g.scale(lerp(.86, 1, k), lerp(.86, 1, k));
  let size = 86; g.font = `900 ${size}px 'Inter Display'`; while (g.measureText(c.w).width > 900) { size -= 6; g.font = `900 ${size}px 'Inter Display'`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 16; g.shadowOffsetY = 5; g.lineWidth = size * .22; g.strokeStyle = '#111'; g.strokeText(c.w, 0, 0);
  g.shadowColor = 'transparent'; g.fillStyle = '#ffe14a'; g.fillText(c.w, 0, 0); g.restore();
}



// ---------------------------------------------------------------- rendu
window.setTiming = d => { CAP = d.captions; E = buildEvents(); END = CAP[CAP.length - 1].e + VO + 1.6; SHOTS = buildShots(); window.DURATION = END; window.SHOTS = SHOTS; return END; };
window.render = function (t) {
  update(t);
  scene.updateMatrixWorld(true);
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; const fd = cam.p.distanceTo(cam.c); camera.near = fd < 3 ? .02 : .05; camera.updateProjectionMatrix();
  bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = fd < 8 ? .004 : fd < 16 ? .002 : .0006; bokeh.uniforms.maxblur.value = .007;
  const s = 45, tex = 2 * s / sun.shadow.mapSize.x;
  const ctr = V(Math.round(cam.c.x / tex) * tex, Math.round(cam.c.y / tex) * tex, Math.round(cam.c.z / tex) * tex);
  sun.target.position.copy(ctr); sun.position.copy(ctr).addScaledVector(SUN_DIR, s * 3);
  const sc = sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .1; sc.far = s * 8; sc.updateProjectionMatrix(); }
  const back = cam.c.clone().sub(cam.p).setY(0).normalize(); rim.target.position.copy(cam.c); rim.position.copy(cam.c).addScaledVector(back, 20).add(V(0, 12, 0));
  camLight.position.copy(cam.p).add(V(0, 1, 0)).lerp(cam.c, .3); camLight.intensity = 6 * clamp(fd / 5, .2, 1);
  composer.render();
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(glc, 0, 0, W, H);
  if (CLEAN) return;
  overlays(t);
  const v = g.createRadialGradient(540, 900, 650, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
};
window.ready = Promise.resolve().then(() => { window.__ready = true; });
window.__loaded = true;
