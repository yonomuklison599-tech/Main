// « Dans cette ville, quand t'as des dettes, tu reçois une petite carte » — rendu déterministe : window.render(t)
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
const TRK = '#2f8a7a';
function bib(root, num) { const tx = textTex([num], { w: 256, h: 192, size: 120, bg: '#ffffff', fg: '#1c1c22', border: '#ffffff' }); for (const z of [-.53, .53]) { const b = box(1.3, .95, .02, new THREE.MeshStandardMaterial({ map: tx })); b.position.set(0, 3.05, z); if (z < 0) b.rotation.y = Math.PI; root.add(b); } }
const tom = makeChar({ shirt: TRK, pants: TRK, hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => bib(root, '456') });
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#ffffff'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const voisin = makeChar({ shirt: '#e8743b', pants: '#3a4a6a', hair: '#2a1a10', hairStyle: 'short' });
const NUMS = ['001', '067', '218', '101', '322', '199', '240', '069', '111', '333'], HAIR = [['#6a4a2a', 'short'], ['#2a1a10', 'short'], ['#d0b070', 'long'], ['#1a1a1a', 'spiky'], ['#8a5a2a', 'bun'], ['#3a2010', 'pigtails'], ['#e8e8f0', 'short'], ['#5a3a1a', 'long'], ['#2a1a10', 'spiky'], ['#a0602a', 'short']];
const P = NUMS.map((n, i) => makeChar({ shirt: TRK, pants: TRK, hair: HAIR[i][0], hairStyle: HAIR[i][1], extras: (root) => bib(root, n) }));
const mayor = makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu); const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); }); } });
const baker = makeChar({ shirt: '#ffffff', pants: '#d8d8d8', hair: '#8a6a4a', hairStyle: 'short', extras: (root, head) => { const hat = box(1.4, 1.2, 1.4, mat('#ffffff'), .35); hat.position.y = 2.1; head.add(hat); } });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
// la poupée géante (costume) : chaussures d'homme et écharpe tricolore qui dépassent
const doll = makeChar({ shirt: '#ff9a2a', pants: '#ffd8a0', hair: '#2a1a10', skin: '#f6d0b0', scale: 5, hairStyle: 'pigtails', extras: (root, head) => {
  const dr = new THREE.Mesh(new THREE.ConeGeometry(2, 2.6, 20), mat('#ff9a2a')); dr.position.y = 1.55; root.add(dr); const col = box(2.1, .3, 1.1, mat('#ffffff'), .1); col.position.y = 3.95; root.add(col);
  for (const s of [-1, 1]) { const sh = box(1.1, .55, 1.6, mat('#141418', { roughness: .3 }), .15); sh.position.set(s * .55, .28, 2.2); root.add(sh); }
  const sc = new THREE.Group(); sc.position.set(0, 3.75, .62); root.add(sc); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.25, .9, .05, mat(c)); b.position.set((i - 1) * .25, -.3, 0); sc.add(b); });
  const zip = box(.12, 3.4, .04, mat('#c0c4cc', { metalness: .6 })); zip.position.set(0, 2.5, -.54); root.add(zip); const pull = box(.3, .35, .1, mat('#c0c4cc', { metalness: .6 })); pull.position.set(0, .9, -.56); root.add(pull); root.userData.pull = pull;
  for (const s of [-1, 1]) { const bw = box(.6, .4, .2, mat('#e8333a'), .1); bw.position.set(s * .97, 1.6, -.2); head.add(bw); } } });
const dollCostume = new THREE.Group(); { const M = mat('#ff9a2a'); const a = box(5, 1, 3, M, .4); a.position.y = .5; dollCostume.add(a); const b = box(3.6, .8, 3.2, mat('#f6d0b0'), .5); b.position.set(0, .45, 3); dollCostume.add(b); const h = box(3.8, .6, 3.4, mat('#2a1a10'), .3); h.position.set(0, .9, 3.2); dollCostume.add(h); } scene.add(dollCostume);
// arène : sable, murs peints en ciel, arbre, lignes
const AR = V(0, 0, -160);
{ const sand = box(50, .04, 90, mat('#e8cf98')); sand.position.set(AR.x, 0, AR.z); sand.receiveShadow = true; scene.add(sand);
  const skyT = canvasTex(1024, 512, c => { const g2 = c.createLinearGradient(0, 0, 0, 512); g2.addColorStop(0, '#5aa8f0'); g2.addColorStop(1, '#cfe8ff'); c.fillStyle = g2; c.fillRect(0, 0, 1024, 512); c.fillStyle = '#ffffff'; const r = rng(3);
    for (let i = 0; i < 14; i++) { const x = r() * 1024, y = 60 + r() * 300, s = 30 + r() * 40; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * s * .7, y + (k % 2) * 10, s * (k === 1 || k === 2 ? 1 : .7), 0, 7); c.fill(); } } });
  skyT.wrapS = THREE.RepeatWrapping; const WM = new THREE.MeshStandardMaterial({ map: skyT, roughness: 1 });
  for (const [x, z, w_, d, rp] of [[-25, -160, 1, 90, 3], [25, -160, 1, 90, 3], [0, -205, 50, 1, 2], [0, -115, 50, 1, 2]]) { const m = WM.clone(); m.map = skyT.clone(); m.map.repeat.set(rp, 1); m.map.needsUpdate = true; const wl = box(w_, 24, d, m); wl.position.set(AR.x + x, 12, z); scene.add(wl); BLOCKERS.push(wl); }
  for (const z of [-128, -190]) { const ln = box(48, .05, .4, mat('#e8333a')); ln.position.set(0, .03, z); scene.add(ln); }
  const tr = box(1.4, 9, 1.4, mat('#6a4a2a')); tr.position.set(-7, 4.5, -199); scene.add(tr); for (const [x, y, s] of [[-7, 10, 5], [-9, 8.6, 3], [-5, 9, 3.4]]) { const f = box(s, s * .8, s, mat('#8a6a3a'), .6); f.position.set(x, y, -199); scene.add(f); } }
// tirelire géante
const pig = new THREE.Group(); pig.position.set(0, 19, -165); scene.add(pig);
{ const PK = mat('#ff9ac8', { roughness: .4 }); const b = box(7, 5, 5, PK, 2); pig.add(b); const sn = box(1.6, 1.4, 1, mat('#ff7ab0'), .5); sn.position.set(0, -.2, 2.8); pig.add(sn); for (const s of [-1, 1]) { const n = box(.3, .4, .1, mat('#a03a6a')); n.position.set(s * .35, -.2, 3.32); pig.add(n); const e = box(.8, 1, .5, PK, .2); e.position.set(s * 1.8, 2.8, 1.4); pig.add(e); const ey = box(.4, .5, .1, mat('#1c1c22')); ey.position.set(s * 1.2, .9, 2.5); pig.add(ey); }
  for (const [x, z] of [[-2.2, -1.6], [2.2, -1.6], [-2.2, 1.6], [2.2, 1.6]]) { const l = box(1, 1.4, 1, PK, .3); l.position.set(x, -3, z); pig.add(l); } const sl = box(2, .15, .3, mat('#1c1c22')); sl.position.set(0, 2.55, 0); pig.add(sl);
  for (const x of [-2.5, 2.5]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 20, 4), mat('#444')); c.position.set(x, 12, 0); pig.add(c); } }
const pigSign = box(9, 2, .2, new THREE.MeshStandardMaterial({ map: textTex(['1 000 000 €'], { w: 1024, h: 228, size: 160, bg: '#1c1c22', fg: '#ffd23f', border: '#ffd23f' }), emissive: new THREE.Color('#ffffff'), emissiveIntensity: .15 })); pigSign.position.set(0, 14.5, -164); scene.add(pigSign);
const flyCoins = []; for (let i = 0; i < 18; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .1, 14), mat('#ffd23f', { metalness: .7, roughness: .25, emissive: new THREE.Color('#ffb020'), emissiveIntensity: .3 })); c.rotation.x = Math.PI / 2; scene.add(c); flyCoins.push(c); }
// carte, camionnette, ardoise de la boulangerie, bureau aux papiers
const HV = houses.find(h => h.position.z < 0 && Math.abs(h.position.x + 47.4) < 1.2), BK = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 10.2) < 1.2);
const cardTex = canvasTex(512, 300, c => { c.fillStyle = '#c8a878'; c.fillRect(0, 0, 512, 300); c.strokeStyle = '#8a6a3a'; c.lineWidth = 8; c.strokeRect(10, 10, 492, 280); c.fillStyle = '#1c1c22'; c.font = "900 150px 'Inter Display'"; c.textAlign = 'center'; c.fillText('?', 256, 165);
  c.font = "800 40px 'Inter Display'"; c.fillText('06 •• •• •• ••', 256, 250); });
const card = box(1.1, .03, .65, new THREE.MeshStandardMaterial({ map: cardTex })); scene.add(card); const cardHand = new THREE.Mesh(new THREE.PlaneGeometry(.9, .53), new THREE.MeshStandardMaterial({ map: cardTex, side: THREE.DoubleSide }));
voisin.userData.arms[1].add(cardHand); cardHand.position.set(0, -2.15, .5); cardHand.rotation.x = -1.1;
const mat_ = box(2.4, .05, 1.4, mat('#8a3a2a')); mat_.position.set(HV.position.x, .02, -8.05); scene.add(mat_);
const van = new THREE.Group(); scene.add(van); { const D = mat('#2a2e3a'); const b = box(6, 3, 2.8, D, .3); b.position.y = 2; van.add(b); const c = box(2, 2.2, 2.7, D, .3); c.position.set(3.6, 1.6, 0); van.add(c); const ws = box(.05, 1.1, 2.3, mat('#1c2a3a', { roughness: .1 })); ws.position.set(4.62, 2.2, 0); van.add(ws);
  for (const x of [-2, 2.8]) for (const z of [-1.4, 1.4]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .4, 16), mat('#111')); wh.rotation.x = Math.PI / 2; wh.position.set(x, .6, z); van.add(wh); } }
{ const sg = box(6.4, 1.5, .2, new THREE.MeshStandardMaterial({ map: textTex(['BOULANGERIE'], { w: 1024, h: 240, bg: '#fff4d8', fg: '#a8541a', border: '#a8541a', size: 120 }) })); sg.position.set(BK.position.x, 4.4, 8.32); sg.rotation.y = Math.PI; scene.add(sg);
  const sl = box(2.4, 1.8, .15, new THREE.MeshStandardMaterial({ map: textTex(['ARDOISE', 'VOISIN :', '3 CROISSANTS'], { w: 512, h: 384, size: 62, bg: '#24302a', fg: '#ffffff', border: '#8a5a2a' }) })); sl.position.set(BK.position.x + 2.4, 1.6, 7.4); sl.rotation.y = Math.PI; scene.add(sl);
  const ea = box(.15, 1.8, .9, mat('#8a5a2a')); ea.position.set(BK.position.x + 2.4, .9, 7.6); scene.add(ea); }
const OFFI = V(400, 0, 0); { const r = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 18), mat('#e8e0cc', { side: THREE.BackSide })); r.position.set(OFFI.x, 4, OFFI.z); r.receiveShadow = true; scene.add(r); BLOCKERS.push(r); const f = box(18, .2, 18, mat('#7a5a3a')); f.position.set(OFFI.x, .1, OFFI.z); scene.add(f);
  const l = new THREE.PointLight(0xfff0d8, 45, 26, 1.4); l.position.set(OFFI.x, 7, OFFI.z + 3); scene.add(l);
  const sg = box(6, 1, .1, new THREE.MeshStandardMaterial({ map: textTex(['SERVICE DES PAPIERS'], { w: 1024, h: 170, size: 90, bg: '#2b4a8a', fg: '#ffffff', border: '#ffd23f' }) })); sg.position.set(OFFI.x, 6, OFFI.z - 8.9); scene.add(sg); }
const DESKS = []; for (let i = 0; i < 6; i++) { const x = OFFI.x - 5 + (i % 3) * 5, z = OFFI.z - 3 + Math.floor(i / 3) * 5; const d = box(3, .2, 1.8, mat('#c8945a'), .05); d.position.set(x, 1.9, z); scene.add(d); const l = box(2.6, 1.8, .15, mat('#8a8f9c')); l.position.set(x, .95, z - .7); scene.add(l);
  const r = rng(i + 5); for (const k of [-1.15, 1.15]) { const h = 1.5 + r() * 3; const p = box(.8, h, .7, mat('#f4f0e8')); p.position.set(x + k, 2 + h / 2, z + .2); scene.add(p); } DESKS.push(V(x, 0, z - 1.3)); }
// argent qui pleut
const CONF = 1200, confGeo = new THREE.BufferGeometry(); confGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3)); confGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3));
const confMat = new THREE.PointsMaterial({ size: 13, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }); const money = new THREE.Points(confGeo, confMat); money.frustumCulled = false; scene.add(money);
const seeds = []; { const r = rng(9); const ca = confGeo.attributes.color.array; for (let i = 0; i < CONF; i++) { seeds.push([r(), r(), r(), r()]); const c = new THREE.Color(i % 3 ? '#5ad07a' : '#ffd23f'); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } }
function rain(t, t0, ctr, R, H0, burst = false) { const k = t - t0; if (k < 0) return; const p = confGeo.attributes.position.array;
  seeds.forEach((s, i) => { const a = s[0] * 6.283, rr = s[1] * R; if (burst) { const sp = Math.min(1, k * 1.4); p[i * 3] = ctr.x + Math.cos(a) * rr * sp; p[i * 3 + 1] = ctr.y + (s[2] - .3) * R * .5 * sp - k * k * 1.5 * s[3]; p[i * 3 + 2] = ctr.z + Math.sin(a) * rr * sp; }
    else { p[i * 3] = ctr.x + Math.cos(a) * rr + Math.sin(k * 2 + i) * .4; p[i * 3 + 1] = ctr.y + ((H0 * s[2] - k * (2 + s[3] * 2)) % H0 + H0) % H0; p[i * 3 + 2] = ctr.z + Math.sin(a) * rr; } });
  confGeo.attributes.position.needsUpdate = true; confMat.opacity = 1; money.visible = true; }
// fumées
const PUFFS = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const m = mat('#ffffff', { transparent: true, roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .25 }); const r = rng(i + 3);
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), m); const a = k * .7; b.userData.dir = V(Math.cos(a) * (.6 + r() * .4), .2 + r() * .9, Math.sin(a) * (.6 + r() * .4)); g.add(b); } g.userData.m = m; g.visible = false; scene.add(g); PUFFS.push(g); }
let puffN = 0; function puff(t, t0, pos, s = 1) { const k = (t - t0) / .7; if (k < 0 || k > 1 || puffN >= PUFFS.length) return; const g = PUFFS[puffN++]; g.visible = true; g.position.copy(pos); g.scale.setScalar(s);
  g.children.forEach(b => { b.position.copy(b.userData.dir).multiplyScalar(easeOut(k) * 1.6); b.scale.setScalar(.5 + easeOut(k) * 1.2); }); g.userData.m.opacity = 1 - k * k; }
const ball = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 12), new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#1c1c22'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(10 + i * 22, 16 + (i % 2) * 30, 8, 0, 7); c.fill(); } }) })); scene.add(ball);

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { carte: 11, avec: 12, appelles: 19, camion: 21, reveilles: 25, numero: 30, voisin: 36, dette: 43, croissants: 45, premier: 49, un: 53, soleil: 56, sauf: 57, poupee: 64, quinze: 67, bouges: 69, elim1: 71, eternue: 73, elim2: 74,
    sourcil: 78, elim3: 81, ici: 82, papiers: 93, toi: 99, gaffe: 107, tom: 109, num: 112, dette2: 116, ballon: 119, fenetre: 124, tirelire: 127, million: 138, remarque: 140, robe: 147, chaussures: 155, echarpe: 158, maire: 161, costume: 166, argent: 169,
    dernier: 175, soleil2: 176, couru: 182, tire: 186, fermeture: 188, tombe: 195, monde: 199, bouge: 202, elimine: 205, tirelire2: 210, explose: 213, ville: 219, remplit: 222, prochaine: 228, toi2: 235 };
  for (const k in N) e[k] = w(N[k]); return e;
}
const BUB = [];
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); BUB.length = 0; puffN = 0; PUFFS.forEach(p => p.visible = false); money.visible = false; flyCoins.forEach(c => c.visible = false); van.visible = false; ball.visible = false; dollCostume.visible = false;
  card.visible = t < E.avec - .2 || t > E.prochaine - .3; cardHand.visible = false;
  const S = (a, b) => t >= a && t < b; const say = (txt, ch, a, b) => { if (t > a && t < b) BUB.push([txt, ch, win(t, a, b, .15)]); }; const hx = HV.position.x;
  card.position.set(hx, .07, -8.05); card.rotation.y = t > E.prochaine ? .2 : -.3;
  // A. la carte sur le paillasson, l'appel, la camionnette
  if (S(0, E.reveilles - .05)) { if (t > E.carte - .5) { place(voisin, hx + .3, .2, -6.6, .2); setFace(voisin, t > E.camion ? 'shock' : t > E.avec ? 'suspicious' : 'smile'); pose(voisin, t > E.avec - .2 ? 'holdOut' : 'reach', t); cardHand.visible = t > E.avec - .2; }
    if (t > E.camion - .4) { van.visible = true; const k = easeOut(seg(t, E.camion - .4, E.camion + 1.2)); van.position.set(lerp(hx - 60, hx - 2, k), .1, -2.8); } }
  // B. réveil en survêtement dans l'arène
  if (S(E.reveilles - .05, E.voisin - .05)) { P.forEach((p, i) => { const x = -14 + (i % 5) * 7, z = -132 - Math.floor(i / 5) * 6; place(p, x, 0, z, i * .7); const up = t > E.reveilles + .4 + i * .08; setFace(p, up ? 'shock' : 'sleep'); pose(p, up ? 'idle' : 'lie', t + i); }); }
  // C. la dette du voisin
  if (S(E.voisin - .05, E.premier - .05)) { const bx = BK.position.x; place(voisin, bx - 1, .2, 6.2, Math.PI - .3); setFace(voisin, t > E.croissants ? 'nervous' : 'worried'); pose(voisin, 'holdOut', t); cardHand.visible = true;
    place(baker, bx + 1.2, .2, 6.6, Math.PI + .5); setFace(baker, 'stern'); pose(baker, 'crossed', t); }
  // D/E. un, deux, trois, soleil ; éliminations
  const arena = S(E.premier - .05, E.ici - .05) || S(E.toi - .05, E.ballon - .3) || S(E.tirelire - .05, E.remplit - .05);
  if (arena) { const fallen = t > E.tire + .2; place(doll, 0, 0, -196, 0); const away = ease(seg(t, E.un - .3, E.un + .1)) * (1 - ease(seg(t, E.soleil - .25, E.soleil + .2))) + ease(seg(t, E.dernier - .3, E.dernier + .1)) * (1 - ease(seg(t, E.soleil2 - .1, E.soleil2 + .3)));
    doll.userData.head.rotation.y = Math.PI * away; setFace(doll, 'smile'); pose(doll, 'idle', 0);
    if (fallen) { doll.visible = false; dollCostume.visible = true; dollCostume.position.set(0, 0, -199.5); puff(t, E.tire + .1, V(0, 4, -196), 4); }
    const adv = (i) => { const z0 = -132 - Math.floor(i / 5) * 6; return z0 - 10 * ease(seg(t, E.un - .1, E.soleil - .2)); };
    const elim = { 0: E.elim1, 7: E.elim2, 1: E.elim3 };
    P.forEach((p, i) => { const x = -14 + (i % 5) * 7; const z = adv(i); const out = elim[i] !== undefined && t > elim[i] - .1; if (out && t > elim[i] + .25 && t < E.elimine) return; place(p, x, 0, z, Math.PI);
      const moving = t > E.un - .1 && t < E.soleil - .2; setFace(p, t > E.elimine - .2 ? 'laugh' : t > E.costume - .5 && t > E.maire ? 'shock' : 'worried'); pose(p, t > E.elimine - .2 ? 'holdUp' : moving ? 'walk' : 'idle', t + i);
      if (i === 0 && t > E.bouges - .3 && t < E.elim1) { p.userData.arms[1].rotation.x = -1.5; } if (i === 7 && t > E.eternue - .3 && t < E.elim2 + .2) { setFace(p, 'sneeze'); pose(p, 'sneezePose', t); }
      if (i === 1 && t > E.sourcil - .5 && t < E.elim3 + .2) setFace(p, 'suspicious');
      if (out) puff(t, elim[i] - .05, V(x, 2, z), 1.2); if (t > E.elimine - .3) { p.position.z = -175 + Math.floor(i / 5) * 3; } });
    const coinT = [E.elim1, E.elim2, E.elim3, E.elimine + .2]; coinT.forEach((c0, j) => flyCoins.forEach((c, i) => { if (i % 4 !== j) return; const k = seg(t, c0 + .1 + (i >> 2) * .05, c0 + 1.1 + (i >> 2) * .05); if (k <= 0 || k >= 1) return; c.visible = true; c.position.set(lerp(-6 + (i % 5) * 3, 0, k), lerp(2, 21.5, k) + Math.sin(k * Math.PI) * 3, lerp(-140, -165, k)); c.rotation.z = t * 6; }));
    // Tom
    const tz = t > E.tirelire - .1 ? -150 : -138; let tx = 3.5; if (t > E.couru - .3) { const k = seg(t, E.couru - .3, E.tire - .2); const k1 = seg(k, 0, .7), k2 = seg(k, .7, 1); tx = k < .7 ? lerp(3.5, 6.8, k1) : lerp(6.8, .6, k2); place(tom, tx, 0, k < .7 ? lerp(tz, -194, k1) : lerp(-194, -199.6, k2), k < .7 ? Math.PI : k < 1 ? Math.PI + 1.2 : 0); pose(tom, k < 1 ? 'run' : 'reach', t); setFace(tom, 'stern'); }
    else { place(tom, tx, 0, tz, Math.PI); setFace(tom, t > E.maire - .2 ? 'shock' : t > E.toi - .1 && t < E.tom ? 'smug' : 'suspicious'); pose(tom, t > E.toi - .1 && t < E.gaffe ? 'pointCam' : 'idle', t); if (t > E.toi - .1 && t < E.tom) tom.rotation.y = 0; }
    if (t > E.elimine - .3) { place(tom, 3, 0, -180, Math.PI - .4); setFace(tom, 'laugh'); pose(tom, 'jump', t); }
    // le maire tombe du costume, bouge, éliminé
    if (fallen) { const wig = t > E.bouge - .2 && t < E.elimine; place(mayor, 1.4, 0, -190.5, 0); setFace(mayor, wig ? 'nervous' : 'shock'); pose(mayor, 'lie', t); if (wig) mayor.userData.root.rotation.z = Math.sin(t * 20) * .1;
      if (t > E.elimine) { puff(t, E.elimine, V(1.4, 1.5, -190), 2); if (t > E.elimine + .3) mayor.visible = false; } }
    pig.visible = t < E.explose; pigSign.visible = t > E.million - .3 && t < E.explose; if (t > E.explose - .05) { rain(t, E.explose - .05, V(0, 19, -165), 28, 0, true); puff(t, E.explose - .05, V(0, 19, -165), 6); }
    say('ÉLIMINÉ !', P[2], E.elimine - .1, E.tirelire2); }
  else { pig.visible = true; pigSign.visible = false; }
  if (S(E.ville - .4, E.remplit - .05)) { rain(t, E.ville - .4, V(0, 0, -30), 22, 22); VILL.forEach((v, i) => { const x = -10 + (i % 4) * 6, z = -28 - Math.floor(i / 4) * 5; place(v, x, .2, z, (i % 2 ? .4 : -.4)); setFace(v, 'laugh'); pose(v, 'jump', t + i * .4); }); }
  // F. le service des papiers
  if (S(E.ici - .05, E.toi - .05) || S(E.remplit - .05, E.prochaine - .05)) { const late = t > E.remplit - .1; [P[0], P[7], P[1], late ? mayor : null].forEach((p, i) => { if (!p) return; const d = DESKS[i]; place(p, d.x, .2, d.z, 0); setFace(p, i === 3 ? 'sad' : 'deadpan'); pose(p, 'holdOut', t + i);
      p.userData.arms[1].rotation.x = -1.4 + Math.max(0, Math.sin(t * 6 + i)) * .5; }); }
  // H. le ballon dans la fenêtre du maire
  if (S(E.ballon - .3, E.tirelire - .05)) { const hb = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 28.6) < 1.2); const k = seg(t, E.ballon - .2, E.fenetre); ball.visible = k < 1;
    place(tom, hb.position.x + 3, .2, 2, Math.PI + .4); setFace(tom, t > E.fenetre - .1 ? 'shock' : 'laugh'); pose(tom, 'idle', t); tom.userData.legs[1].rotation.x = t < E.ballon + .1 ? -1.2 : 0;
    ball.position.set(lerp(hb.position.x + 3, hb.position.x + 3.07, k), lerp(.6, 7.9, k) + Math.sin(k * Math.PI) * 2, lerp(2.6, 8.4, k)); ball.rotation.set(t * 9, t * 5, 0);
    if (t > E.fenetre - .2) { place(mayor, hb.position.x + 3.07, 5.3, 9.6, Math.PI); setFace(mayor, 'stern'); pose(mayor, 'idle', t); } }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], macro2: [1.4, .6, 40], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42],
  feet: [3.4, -.6, 36], high: [9, 9, 42], grp: [13, 1.5, 40], card: [2, 3.2, 36], bigsign: [24, 0, 44], dlow: [16, -5, 48] };
const SUBJ = { tom: () => tom, mayor: () => mayor, voisin: () => voisin, baker: () => baker, doll: () => doll, p0: () => P[0], p1: () => P[1], p2: () => P[2], p7: () => P[7], p4: () => P[4] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  const hx = HV.position.x, bx = BK.position.x, hb = -28.6 + 3;
  A(0, `@${hx},.1,-8.05`, 'card', 0, null, 'static'); A(4, `@${hx},.1,-8.05`, 'card', 25); A(9, 'voisin', 'ms', 10, 'body'); A(12, 'voisin', 'mcu', -15); A(15, 'voisin', 'cu', 0);
  A(18, 'voisin', 'mcu', 30); A(20, `@${hx - 4},2,-3`, 'ws', 90, null, 'static'); A(23, `@${hx - 2},2.5,-3`, 'fs', 60);
  A(25, '@0,1.5,-134', 'grp', 0); A(28, 'p4', 'mcu', 15); A(30, 'p1', 'ms', 180, 'body', 'static'); A(33, 'p2', 'ms', 180, 'body');
  A(36, 'voisin', 'mcu', 10); A(40, 'voisin', 'ms', -20, 'body'); A(43, `@${bx + 2.4},1.6,7.4,3.14`, 'ms', 0, null, 'static'); A(47, 'baker', 'mcu', 0);
  A(49, '@0,6,-150', 'ws', 0); A(53, '@0,8,-196', 'ws', 0, null, 'static'); A(55, '@0,1.5,-140', 'ws', 180); A(56, '@0,11,-195', 'fs', 0, null, 'static'); A(57, '@0,8,-190', 'dlow', 0, null, 'up'); A(64, '@0,7,-195', 'dlow', 15); A(67, '@0,8,-196', 'ws', 20);
  A(69, 'p0', 'mcu', 0); A(71, 'p0', 'ms', 0, 'body', 'static'); A(72, 'p7', 'mcu', 0); A(74, 'p7', 'ms', 10, 'body', 'static'); A(75, 'p1', 'mcu', 0); A(78, 'p1', 'cu', 0, null, 'static'); A(81, 'p1', 'ms', 0, 'body', 'static');
  A(82, `@${OFFI.x},2.5,${OFFI.z}`, 'grp', 0); A(89, 'p0', 'mcu', 0); A(93, `@${OFFI.x},3,${OFFI.z}`, 'grp', 25, null, 'pan');
  A(99, 'tom', 'mcu', 0, null, 'static'); A(103, 'tom', 'cu', 0, null, 'static');
  A(109, 'tom', 'mcu', 0); A(112, 'tom', 'ms', 180, 'body'); A(116, 'tom', 'cu', 0); A(119, 'tom', 'ms', 60, 'body'); A(122, `@${hb},6.5,8.4,3.14`, 'ms', 0, null, 'static');
  A(127, '@0,19,-165', 'ws', 0, null, 'up'); A(131, '@0,10,-155', 'xws', 0); A(134, '@0,19,-165', 'ws', 25); A(138, '@0,14.5,-164', 'bigsign', 0, null, 'static');
  A(140, 'tom', 'mcu', 0); A(144, '@0,4,-193', 'fs', 0); A(150, '@0,2,-191', 'grp', 0, null, 'static'); A(155, '@0,1,-190.6', 'fs', 15); A(157, '@0,9.2,-194.4', 'ms', 0, null, 'static');
  A(161, 'tom', 'cu', 0); A(164, '@0,11,-195', 'fs', 10); A(169, 'tom', 'mcu', 20);
  A(173, '@0,8,-190', 'ws', 0); A(176, '@0,8,-196', 'ws', 0, null, 'static'); A(179, 'tom', 'mcu', 20); A(182, 'tom', 'fs', 0, 'body'); A(184, '@0,2.5,-199', 'ms', 180, null, 'static'); A(187, '@0,3,-196', 'grp', 30);
  A(192, '@1.4,1,-190', 'fs', 20); A(196, '@1.4,1,-190', 'grp', 15); A(200, '@1.4,.8,-190', 'ms', 30, null, 'static');
  A(205, 'p2', 'mcu', 0); A(207, '@0,2,-176,3.14', 'grp', 0); A(210, '@0,19,-165', 'ws', 0, null, 'static'); A(213, '@0,14,-165', 'xws', 0, null, 'static'); A(217, '@0,4,-30', 'ws', 0, null, 'up');
  A(222, 'mayor', 'mcu', 0); A(225, `@${OFFI.x},3,${OFFI.z}`, 'grp', 20);
  A(228, `@${hx},.1,-8.05`, 'card', 0, null, 'static'); A(233, `@${hx},.1,-8.05`, 'card', 15, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function overlays(t) {
  for (const [txt, ch, a] of BUB) { if (!ch.visible) continue; const q = project(ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.2 * sizeOf(ch), 0))); if (q[2] > 1) continue; bubble(txt, clamp(q[0] + 90, 330, W - 330), clamp(q[1] - 240, 300, 820), a); }
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > -100 && q[0] < W + 100) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b || !ch.visible) return; const q = project(ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.1 * sizeOf(ch), 0))); if (q[2] < 1 && q[0] > 0 && q[0] < W && q[1] > 0 && q[1] < H) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1] - 150, 280, 1050), win(t, a, b, .12), o); };
  pop('DRING…', voisin, E.appelles - .1, E.camion - .2, { size: 90 }); popAt('VROUM', van.position.clone().add(V(0, 5, 0)), E.camion, E.reveilles - .2, { size: 110 });
  [[E.elim1, P[0]], [E.elim2, P[7]], [E.elim3, P[1]]].forEach(([e, p]) => popAt('POUF !', p.position.clone().add(V(0, 3.2, 0)), e - .05, e + .8, { size: 120 }));
  pop('ATCHOUM', P[7], E.eternue - .1, E.elim2 - .1, { size: 90 }); popAt('CRAC !', V(-25.53, 7.9, 8.4), E.fenetre - .1, E.fenetre + .8, { size: 130, fill: '#bfe8ff' });
  popAt('ZZZIP !', V(0, 6, -198), E.tire - .1, E.tire + .9, { size: 130 }); popAt('BOUM !', V(0, 19, -165), E.explose - .05, E.explose + 1.1, { size: 170 });
  if (t > E.prochaine - .2) { /* la carte vient vers toi */ }
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
