// « Dans cette ville, les mots que tu dis tombent par terre » — rendu déterministe : window.render(t)
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
// ---------------------------------------------------------------- mots en blocs
const WT = {}; function wordTex(word, bg, fg) { const k = word + bg + fg; if (WT[k]) return WT[k]; const n = Math.max(3, word.length); return WT[k] = canvasTex(Math.min(1024, 90 * n + 60), 200, (c, w_, h_) => { c.fillStyle = bg; c.fillRect(0, 0, w_, h_);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, 0, w_, 18); c.fillStyle = fg; c.font = `900 ${Math.min(150, Math.floor((w_ - 40) / (word.length * .62)))}px 'Inter Display'`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(word, w_ / 2, h_ / 2 + 6); }); }
function wordBlock(word, s = 1, bg = '#ffd23f', fg = '#1c1c22') { const len = Math.max(1, word.length * .42); const tm = new THREE.MeshStandardMaterial({ map: wordTex(word, bg, fg), roughness: .6 }), pm = mat(bg);
  const geo = new RoundedBoxGeometry(s * len, s * .72, s * .72, 2, .06 * s); const m = new THREE.Mesh(geo, [pm, pm, pm, pm, tm, tm]); m.castShadow = m.receiveShadow = true; m.visible = false; scene.add(m); return m; }
function drop(m, t, t0, from, to, ry = 0, dur = .55) { if (t < t0) { m.visible = false; return; } const k = clamp((t - t0) / dur); m.visible = true; m.position.copy(from).lerp(to, k); m.position.y = lerp(from.y, to.y, k * k) + (k < 1 ? Math.sin(k * Math.PI) * .6 : 0);
  m.rotation.set((1 - k) * 1.2, ry, (1 - k) * .6); }
const ALLW = []; const W_ = (...a) => { const b = wordBlock(...a); ALLW.push(b); return b; };
// personnages
const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => { for (let i = 0; i < 3; i++) { const st = box(2.06, .22, 1.06, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#e8433a'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const mayor = makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu); const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); }); } });
const mamie = makeChar({ shirt: '#b04a6a', pants: '#5a4a6a', hair: '#e8e8f0', hairStyle: 'bun' });
const prof = makeChar({ shirt: '#e8e0d0', pants: '#5a4a3a', hair: '#8a8a8a', hairStyle: 'short', extras: (root, head) => { const tie = box(.32, 1.4, .1, mat('#2b4ad8')); tie.position.set(0, 3.2, .52); root.add(tie);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 6, 16), mat('#1c1c22')); f.position.set(s * .32, .83, .75); head.add(f); } } });
const cousin = makeChar({ shirt: '#1c1c22', pants: '#3a3a52', hair: '#1a1a1a', hairStyle: 'spiky', extras: (root, head) => { const cap = box(1.6, .4, 1.6, mat('#e8333a'), .12); cap.position.y = 1.6; head.add(cap); const v = box(1.2, .1, .7, mat('#e8333a')); v.position.set(0, 1.45, -.95); head.add(v); } });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
const HV = houses.find(h => h.position.z < 0 && Math.abs(h.position.x + 47.4) < 1.2), BK = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 10.2) < 1.2); const hx = HV.position.x;
// rue : bonjour, salut, oui, gros mot ; arrêt de bus, voiture
const wBonjour = W_('BONJOUR', 1, '#5ad0ff'), wSalut = W_('SALUT', 1, '#8aff6a'), wOui = W_('OUI', .55, '#ffd23f'), wGros = W_('#@!%&', 3, '#c0392b', '#ffffff'), wGros2 = W_('$#@%!', 2.6, '#8a1a1a', '#ffd23f');
const car = new THREE.Group(); { const C = mat('#3a7ae8'); const b = box(4, 1.2, 2.1, C, .3); b.position.y = .95; car.add(b); const tp = box(2.2, .9, 1.9, C, .3); tp.position.set(-.2, 1.9, 0); car.add(tp); for (const x of [-1.3, 1.3]) for (const z of [-1.05, 1.05]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .3, 14), mat('#111')); wh.rotation.x = Math.PI / 2; wh.position.set(x, .45, z); car.add(wh); } }
car.position.set(hx + 9, .1, -2.2); scene.add(car);
{ const p = box(.15, 3.2, .15, mat('#2a2e3a')); p.position.set(hx + 5, 1.6, -5.2); scene.add(p); const sg = box(1.4, .9, .08, new THREE.MeshStandardMaterial({ map: textTex(['BUS'], { w: 256, h: 160, size: 100, bg: '#2b4ad8', fg: '#ffffff', border: '#ffffff' }) })); sg.position.set(hx + 5, 3.2, -5.15); scene.add(sg); }
// mamie : la porte bloquée
const JTA = []; for (let i = 0; i < 14; i++) JTA.push(W_("JE T'AIME", .8, '#ff7ab8', '#ffffff'));
// classe : les « donc »
const CL = V(400, 0, 0), RM = V(400, 0, 100), TR = V(400, 0, -100);
function room(P, col, floor, sz = 14) { const r = new THREE.Mesh(new THREE.BoxGeometry(sz, 7, sz), mat(col, { side: THREE.BackSide })); r.position.set(P.x, 3.5, P.z); r.receiveShadow = true; scene.add(r); BLOCKERS.push(r); const f = box(sz, .2, sz, mat(floor)); f.position.set(P.x, .1, P.z); scene.add(f);
  const l = new THREE.PointLight(0xfff0d8, 40, 22, 1.4); l.position.set(P.x, 6, P.z + 3); scene.add(l); }
room(CL, '#dff0e0', '#b89a74'); room(RM, '#e0e4ff', '#8a6a4a', 10); room(TR, '#fff4e0', '#c8a878', 10);
{ const bd = box(8, 2.6, .1, new THREE.MeshStandardMaterial({ map: textTex(['2 + 2 = ?'], { w: 1024, h: 330, bg: '#24503a', fg: '#ffffff', border: '#8a5a2a', size: 160 }) })); bd.position.set(CL.x, 4.2, CL.z - 6.9); scene.add(bd); }
const DONC = []; { for (let i = 0; i < 90; i++) DONC.push(W_('DONC', .9, ['#ffd23f', '#ffb020', '#fff08a'][i % 3])); }
const STUD = [[0, -3, 0], [2, 0, 0], [5, 3, 0], [8, -3, 3], [9, 0, 3], [6, 3, 3]];
const bed = (P, col) => { const b = box(3, .8, 5, mat(col), .15); b.position.set(P.x + 2.5, .6, P.z - 2); scene.add(b); const pl = box(2.4, .35, 1, mat('#ffffff'), .12); pl.position.set(P.x + 2.5, 1.15, P.z - 3.9); scene.add(pl); };
bed(RM, '#3a7ae8'); bed(TR, '#3fae5a');
const WESH = []; for (let i = 0; i < 110; i++) WESH.push(W_('WESH', .7, ['#5ad0ff', '#3a8ae8', '#8ad8ff'][i % 3], '#1c1c22'));
{ const po = box(2.6, 1.6, .05, new THREE.MeshStandardMaterial({ map: textTex(['WESH'], { w: 512, h: 300, size: 160, bg: '#1c1c22', fg: '#5ad0ff', border: '#5ad0ff' }) })); po.position.set(RM.x - 2, 4, RM.z - 4.9); scene.add(po);
  const sh = box(3, .2, 1, mat('#8a5a2a')); sh.position.set(TR.x - 2.5, 2.6, TR.z - 4.4); scene.add(sh); for (let i = 0; i < 6; i++) { const bk = box(.35, 1, .8, mat(['#e8333a', '#3a7ae8', '#ffd23f'][i % 3])); bk.position.set(TR.x - 3.6 + i * .4, 3.2, TR.z - 4.4); scene.add(bk); } }
const wOK = W_('OK', .6, '#8aff6a');
// place : les « bla bla bla », la promesse
const BLA = []; { const r = rng(12); for (let i = 0; i < 150; i++) { const b = W_('BLA', 1.1, ['#ffd23f', '#ff9ad8', '#5ad0ff', '#8aff6a', '#ffb020'][i % 5]); b.userData.to = V(-18 + r() * 36, .55 + Math.floor(i / 75) * .78, -16 - r() * 26); b.userData.ry = r() * 3; b.userData.t = r(); BLA.push(b); } }
const PROM = ['JE', 'VAIS', 'NETTOYER', 'LA VILLE'].map((w2, i) => W_(w2, 1.3, '#ffffff', '#2b4ad8'));
// débat : pupitres + la tour
const podium = x => { const g = new THREE.Group(); g.position.set(x, STAGE.y, -44.2); scene.add(g); const b = box(1.8, 1.3, 1, mat('#2b4ad8'), .08); b.position.y = .65; g.add(b); const tp = box(2, .15, 1.2, mat('#ffffff')); tp.position.y = 1.35; g.add(tp); return g; };
const podM = podium(-3.2), podT = podium(3.2); const debat = box(8, 1.4, .15, new THREE.MeshStandardMaterial({ map: textTex(['DÉBAT'], { w: 1024, h: 180, size: 140, bg: '#e8333a', fg: '#ffffff', border: '#ffffff' }) })); debat.position.set(0, STAGE.y + 6.2, -47.8); scene.add(debat);
const TOWER = []; for (let L = 0; L < 7; L++) for (let k = 0; k < 8; k++) { const b = W_('BLA', 1.25, ['#ffd23f', '#ff9ad8', '#5ad0ff', '#8aff6a'][(L + k) % 4]); const a = k / 8 * 6.283 + L * .39; b.userData.to = V(-3.2 + Math.cos(a) * 1.9, STAGE.y + .45 + L * .9, -44.6 + Math.sin(a) * 1.9); b.userData.ry = -a + Math.PI / 2; b.userData.L = L; TOWER.push(b); }
const POST = ['BONJOUR', 'ÇA VA ?', 'MERCI'].map((txt, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshStandardMaterial({ map: textTex([txt], { w: 256, h: 256, size: txt.length > 6 ? 44 : 56, bg: '#fff07a', fg: '#1c1c22', border: '#fff07a' }) }));
  p.position.set(-3.2 + (i - 1) * .9, STAGE.y + 3.2 + (i % 2) * .7, -44.6 + 2.34); p.rotation.z = (i - 1) * .15; p.visible = false; scene.add(p); return p; });
// fin : les mots de Tom
const TOMW = ['BON', 'JE', 'VOUS', 'LAISSE', "J'AI", 'DIT', 'TROP', 'DE', 'MOTS'].map((w2, i) => W_(w2, .8, ['#ffd23f', '#5ad0ff', '#8aff6a', '#ff9ad8'][i % 4]));
const STREETW = ['MDR', 'OK', 'SALUT', 'BAH', 'OUAIS'].map((w2, i) => W_(w2, .7, ['#ffd23f', '#5ad0ff', '#8aff6a', '#ff9ad8', '#ffb020'][i]));

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { dis: 7, tombent: 8, restent: 13, toujours: 15, petit: 17, cube: 22, gros: 23, bloc: 28, voisin: 29, bus: 34, gros2: 36, ecrase: 39, mamie: 42, aime: 45, porte: 56, prof: 57, donc: 62, classe: 67, donc2: 73, cousin: 74, wesh: 81, piscine: 86,
    toi: 89, regarde: 98, tom: 101, chambre: 108, probleme: 114, maire: 118, quatre: 122, place: 126, promesse: 136, je: 137, nettoyer: 139, ville: 141, quatre2: 142, alors: 148, debat: 154, parlez: 158, parle: 163, empilaient: 170, mur: 175, tour: 178, enferme: 185, sans: 193, depuis: 195, postit: 200, bon: 201, laisse: 204, trop: 208, range: 214 };
  for (const k in N) e[k] = w(N[k]); return e;
}
function update(t) {
  podM.visible = podT.visible = debat.visible = t > E.alors - .1 && t < E.bon;
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); ALLW.forEach(b => b.visible = false); POST.forEach(p => p.visible = false); car.scale.set(1, 1, 1);
  const S = (a, b) => t >= a && t < b; const mouth = ch => { ch.updateMatrixWorld(true); return ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(Math.sin(ch.rotation.y) * .8, -.3, Math.cos(ch.rotation.y) * .8)); };
  const talk = (ch, a, b) => { if (t > a && t < b) setFace(ch, Math.floor(t * 8) % 2 ? 'talk' : 'smile'); };
  // A. la règle dans la rue
  if (S(0, E.mamie - .05)) { const a = VILL[1], b = VILL[4], c = VILL[5], v = VILL[3];
    place(a, hx, .2, -5.8, 0); setFace(a, 'smile'); pose(a, 'talk', t); talk(a, E.dis - .3, E.tombent + .3); drop(wBonjour, t, E.dis - .1, V(hx, 2.4, -5), V(hx + .3, .62, -4.4), .2);
    place(b, hx + 3.6, .2, -6.2, -.4); setFace(b, 'smile'); pose(b, 'talk', t + 1); drop(wSalut, t, E.restent - .1, V(hx + 3.4, 2.4, -5.4), V(hx + 3, .62, -4.7), -.3);
    drop(wOui, t, E.cube - .4, V(hx + .1, 2.4, -5), V(hx - .9, .5, -4.6), .5); talk(a, E.petit, E.cube);
    place(c, hx - 3.4, .2, -6, .4); setFace(c, t > E.gros ? 'stern' : 'smile'); pose(c, t > E.gros ? 'talk' : 'idle', t); drop(wGros, t, E.bloc - .5, V(hx - 3.2, 6, -4.2), V(hx - 3.2, 1.2, -3.6), .1, .45);
    if (t > E.voisin - .2) { const k = seg(t, E.voisin - .2, E.bus + .3); place(v, lerp(hx + 2, hx + 6.5, k), .2, -4.9, Math.PI / 2); setFace(v, t > E.bus ? 'stern' : 'worried'); pose(v, k < 1 ? 'run' : 'talk', t);
      drop(wGros2, t, E.ecrase - .5, V(hx + 9, 7, -2.2), V(hx + 9, 1.05, -2.2), 0, .4); if (t > E.ecrase - .1) car.scale.set(1.1, .3, 1.15); } }
  // B. mamie, la porte bloquée
  if (S(E.mamie - .05, E.prof - .05)) { const bx = BK.position.x; place(mamie, bx + .2, .2, 8.05, Math.PI); setFace(mamie, t > E.porte - .5 ? 'worried' : 'smile'); pose(mamie, t > E.porte - .5 ? 'reach' : 'talk', t);
    JTA.forEach((b, i) => { const row = Math.floor(i / 5), col = i % 5; drop(b, t, E.mamie - .5 + i * .05, V(bx, 3, 7.4), V(bx - 3.2 + col * 1.6 + (row % 2) * .5, .62 + row * .62, 7.2 - (i % 2) * .5), (i % 3) * .2); if (t > E.aime + .4) b.visible = true; }); }
  // C. la classe sous les « donc »
  if (S(E.prof - .05, E.cousin - .05)) { place(prof, CL.x + 3, .2, CL.z - 5, 0); setFace(prof, 'talk'); pose(prof, 'talk', t); talk(prof, E.prof, E.cousin);
    STUD.forEach(([i, x, z], j) => { const v = VILL[i]; place(v, CL.x + x, .2, CL.z + z, Math.PI); setFace(v, t > E.classe ? 'worried' : 'smile'); pose(v, 'idle', t + j); });
    DONC.forEach((b, i) => { const row = Math.floor(i / 30), c2 = i % 30; const to = V(CL.x - 6 + (c2 % 6) * 2.4 + (row % 2) * .6, .6 + row * .65, CL.z - 2 + Math.floor(c2 / 6) * 1.6); drop(b, t, E.donc - .2 + i * .045, V(CL.x + 3, 3, CL.z - 4.4), to, (i % 4) * .4, .5); }); }
  // D. la piscine à « wesh »
  if (S(E.cousin - .05, E.toi - .05)) { const lvl = seg(t, E.wesh - .4, E.piscine); place(cousin, RM.x - 1, .2 + 0, RM.z, .3); setFace(cousin, t > E.piscine - .2 ? 'laugh' : 'talk'); pose(cousin, t > E.piscine - .3 ? 'cast' : 'talk', t); talk(cousin, E.cousin, E.piscine - .3);
    WESH.forEach((b, i) => { const L = Math.floor(i / 40), c2 = i % 40; const to = V(RM.x - 4 + (c2 % 8) * 1.15 + (L % 2) * .4, .5 + L * .55, RM.z - 4 + Math.floor(c2 / 8) * 1.9); if (i / WESH.length < lvl * 1.05) drop(b, t, E.wesh - .4 + i * .02, V(RM.x - 1, 3, RM.z + .6), to, (i % 5) * .5, .45); }); }
  // E. « regarde par terre »
  if (S(E.toi - .05, E.tom - .05)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.regarde ? 'smug' : 'smile'); pose(tom, t > E.regarde ? 'pointDown' : 'pointCam', t); STREETW.forEach((b, i) => { b.visible = true; b.position.set(-20 + Math.cos(i * 1.3) * 1.8, .65, 5.4 - 1.4 + Math.sin(i * 1.3) * 1.1); b.rotation.set(0, i, 0); }); }
  // F. la chambre de Tom
  if (S(E.tom - .05, E.probleme - .05)) { place(tom, TR.x - .5, .2, TR.z + 1, .2); setFace(tom, t > E.chambre ? 'deadpan' : 'smile'); pose(tom, 'idle', t); wOK.visible = true; wOK.position.set(TR.x - 1.5, 2.95, TR.z - 4.2); wOK.rotation.set(0, 0, 0); }
  // G. la place ensevelie, la promesse
  if (S(E.probleme - .05, E.alors - .05)) { place(mayor, 0, STAGE.y, -44.8, 0); setFace(mayor, 'talk'); pose(mayor, 'talk', t); talk(mayor, E.probleme, E.alors);
    BLA.forEach((b, i) => { b.visible = true; b.position.copy(b.userData.to); b.rotation.set(0, b.userData.ry, 0); if (t < E.place) { const k = seg(t, E.maire + b.userData.t * 3, E.maire + b.userData.t * 3 + .5); if (k <= 0) b.visible = false; else b.position.y += (1 - k * k) * 8; } });
    VILL.forEach((v, i) => { const x = -12 + (i % 5) * 6, z = -24 - Math.floor(i / 5) * 6; place(v, x, .2, z, Math.PI); v.position.y = -.9 * seg(t, E.place - .5, E.place + .5); setFace(v, t > E.place ? 'worried' : 'smile'); pose(v, t > E.place ? 'reach' : 'idle', t + i); });
    PROM.forEach((b, i) => drop(b, t, [E.je, E.je + .3, E.nettoyer, E.ville][i] - .1, V(0, 4, -42.5), V(-3 + i * 2.1, 1.5 + STAGE.y * 0, -40.5), (i - 1.5) * .2)); }
  // H/I. le débat, la tour
  if (S(E.alors - .05, E.bon - .05)) { const shutL = 7 * seg(t, E.parle - .2, E.enferme);
    place(mayor, -3.2, STAGE.y, -45.2, 0); setFace(mayor, t > E.tour ? 'worried' : 'talk'); pose(mayor, 'talk', t); talk(mayor, E.parle, E.tour);
    place(tom, 3.2, STAGE.y, -45.2, -.15); setFace(tom, t > E.parle ? 'smug' : 'smile'); pose(tom, t > E.parlez - .2 && t < E.parle ? 'talk' : 'idle', t);
    TOWER.forEach(b => { const L = b.userData.L; const t0 = E.parle + (E.enferme - E.parle) * (L / 7) + (TOWER.indexOf(b) % 8) * .04; drop(b, t, t0, V(-3.2, STAGE.y + 3.6, -44.6), b.userData.to, b.userData.ry, .45); });
    if (t > E.depuis - .1) POST.forEach((p, i) => { p.visible = t > E.postit - .6 + i * .35; p.position.set(-3.2 + (i - 1) * .9, STAGE.y + 3.2 + (i % 2) * .7, -44.6 + 2.62); });
    VILL.forEach((v, i) => { const x = -10 + (i % 5) * 5, z = -34 - Math.floor(i / 5) * 3.5; place(v, x, .2, z, Math.PI); setFace(v, t > E.tour ? 'laugh' : 'smile'); pose(v, 'idle', t + i); }); }
  // J. Tom range ses mots
  if (S(E.bon - .05, END + 1)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.range - .3 ? 'smug' : 'talk'); pose(tom, t > E.range - .4 ? 'holdOut' : 'talk', t); talk(tom, E.bon, E.range - .4);
    TOMW.forEach((b, i) => drop(b, t, E.bon - .1 + i * .32, V(-20, 2.3, 4.4), V(-20 + (i % 2 ? 1 : -1) * (1.8 + (i % 3) * .5), .58 + (i > 5 ? .62 : 0), 5.4 - .6 + ((i >> 1) % 3) * .6), i * .7)); }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42], feet: [3.4, -.6, 36], high: [9, 9, 42], grp: [13, 1.5, 40], tower: [16, 2, 40] };
const SUBJ = { tom: () => tom, mayor: () => mayor, mamie: () => mamie, prof: () => prof, cousin: () => cousin, v1: () => VILL[1], v3: () => VILL[3], v4: () => VILL[4], v5: () => VILL[5], v2: () => VILL[2] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  const bx = BK.position.x;
  A(0, 'v1', 'mcu', 10); A(5, 'v1', 'ms', 25, 'body'); A(8, `@${hx + .3},.8,-4.4`, 'ms', 20, null, 'static'); A(11, `@${hx + 1.5},1.2,-5`, 'grp', 0); A(15, 'v4', 'ms', -15, 'body');
  A(17, 'v1', 'mcu', 0); A(20, `@${hx - .9},.6,-4.6`, 'ms', 40, null, 'static'); A(23, 'v5', 'mcu', 10); A(26, `@${hx - 3.2},1.5,-3.6`, 'fs', 15, null, 'static');
  A(29, `@${hx + 4},1.5,-4.9`, 'grp', 0); A(33, 'v3', 'mcu', 0); A(36, `@${hx + 8},2,-2.4`, 'fs', 40, null, 'static'); A(40, `@${hx + 9},1.2,-2.2`, 'ms', 60, null, 'static');
  A(42, `@${bx},2,7.4,3.14`, 'grp', 0); A(46, 'mamie', 'mcu', 0); A(50, `@${bx},1.8,7.2,3.14`, 'fs', 20); A(54, 'mamie', 'mcu', -20);
  A(57, 'prof', 'mcu', 10); A(61, 'prof', 'ms', -20, 'body'); A(64, `@${CL.x},2,${CL.z}`, 'grp', 180, null, 'up'); A(67, `@${CL.x - 1},1.6,${CL.z + 1},3.14`, 'grp', 0); A(71, 'v2', 'mcu', 180);
  A(74, 'cousin', 'mcu', 10); A(78, 'cousin', 'ms', -20, 'body'); A(82, `@${RM.x},1.5,${RM.z - 1}`, 'grp', 20, null, 'up'); A(86, 'cousin', 'mcu', 0);
  A(89, 'tom', 'mcu', 0, null, 'static'); A(93, 'tom', 'cu', 0); A(98, '@-20,.6,4.4,3.14', 'high', 0, null, 'static');
  A(101, 'tom', 'mcu', 10); A(104, `@${TR.x},2,${TR.z}`, 'grp', 15); A(108, `@${TR.x - 1.5},2.9,${TR.z - 4.2}`, 'macro', 0, null, 'static'); A(111, 'tom', 'cu', 0);
  A(114, 'mayor', 'mcu', 30); A(118, 'mayor', 'cu', 30); A(122, '@0,4,-30', 'ws', 0); A(126, '@0,2,-28', 'grp', 15, null, 'pan'); A(131, 'v2', 'mcu', 0);
  A(134, 'mayor', 'mcu', -30); A(137, '@0,2,-40.5', 'fs', 0, null, 'static'); A(142, '@0,1.8,-40.5', 'ms', 20, null, 'static');
  A(148, 'tom', 'ms', -20, 'body'); A(152, '@0,3.4,-44.8', 'grp', 25); A(155, 'tom', 'mcu', -25); A(158, 'tom', 'ms', 25, 'body');
  A(163, 'mayor', 'ms', 20, 'body'); A(166, '@-3.2,3,-44.6', 'tower', 0); A(170, '@-3.2,4,-44.6', 'tower', 25, null, 'up'); A(175, '@-3.2,4,-44.6', 'fs', 0, null, 'static'); A(178, '@-3.2,4.5,-44.6', 'tower', -20);
  A(183, '@0,4.5,-44', 'ws', 0, null, 'static'); A(188, '@-3.2,5,-44.6', 'fs', 10); A(193, '@-3.2,3,-44.6', 'tower', 0, null, 'static'); A(196, '@-3.2,3.6,-42', 'ms', 0, null, 'static');
  A(201, 'tom', 'mcu', 0, null, 'static'); A(205, '@-20,1.2,4.6,3.14', 'fs', 15); A(209, 'tom', 'mcu', 0); A(212, 'tom', 'ms', -15, 'body', 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function overlays(t) {
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > -100 && q[0] < W + 100) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  popAt('BOUM !', V(hx - 3.2, 3.6, -3.6), E.bloc - .1, E.bloc + .8, { size: 140 }); popAt('CRAAAC !', V(hx + 9, 4.2, -2.2), E.ecrase - .1, E.ecrase + .9, { size: 130, fill: '#ff4d4d' });
  popAt('TOC TOC', V(BK.position.x, 3.8, 7.8), E.porte - .6, E.prof - .1, { size: 100 }); popAt('PLOUF', V(RM.x - 1, 3.4, RM.z), E.piscine, E.toi - .1, { size: 110, fill: '#5ad0ff' });
  popAt('BLA BLA BLA', V(0, 7, -43.7), E.maire, E.quatre + .5, { size: 100, fill: '#ffd23f' }); popAt('… BLA BLA …', V(-3.2, STAGE.y + 8, -44.6), E.enferme, E.sans + .3, { size: 100 });
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
