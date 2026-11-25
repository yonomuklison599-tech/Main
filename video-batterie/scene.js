// « Dans cette ville, ta batterie, c'est ta vie » — rendu déterministe : window.render(t)
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
const camLight = new THREE.PointLight(0xffffff, 6, 14, 1.6); scene.add(camLight);
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
  if (kind === 'reach') { arms[1].rotation.set(-2.9, 0, .2); arms[0].rotation.z = -1; }
}
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y <= .35 ? groundY(x, z) : y, z); ch.rotation.y = ry; ch.visible = true; }
const headY = ch => (4.02 + .7) * ch.userData.root.scale.y;   // hauteur du centre de la tête
// ---------------------------------------------------------------- personnages
const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => {
  for (let i = 0; i < 3; i++) { const st = box(2.06, .22, 1.06, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#e8433a'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const mamie = makeChar({ shirt: '#b04a6a', pants: '#5a4a6a', hair: '#e8e8f0', hairStyle: 'bun', extras: (root, head) => {
  const sh = box(2.3, .9, 1.25, mat('#e8d0a0'), .2); sh.position.y = 3.6; root.add(sh); } });
const halo = new THREE.Mesh(new THREE.TorusGeometry(.75, .1, 8, 32), mat('#ffe680', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 1.6 })); halo.rotation.x = Math.PI / 2; halo.position.y = 2.1; mamie.userData.head.add(halo);
const mayor = makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); });
  const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly); } });
const voisin = makeChar({ shirt: '#e8743b', pants: '#3a4a6a', hair: '#2a1a10', hairStyle: 'short' });
const GREY = { skin: '#a8a8a8', shirt: '#8c8c8c', pants: '#6c6c6c', hair: '#5c5c5c' };
const voisinGris = makeChar({ ...GREY, hairStyle: 'short' });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long'], ['#e85a8a', '#2a2a3a', '#d8a040', 'long'], ['#4a7ae8', '#3a3a3a', '#8a5a2a', 'spiky']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
// accessoires
const hold = (ch, obj, y = -2.1, z = .45) => { ch.userData.arms[1].add(obj); obj.position.set(0, y, z); obj.visible = false; return obj; };
const phoneMesh = () => { const g = new THREE.Group(); g.add(box(.5, .9, .1, mat('#1c1c22'), .04)); const sc = box(.42, .78, .02, mat('#7fd3ff', { emissive: new THREE.Color('#7fd3ff'), emissiveIntensity: .8 })); sc.position.z = .06; g.add(sc); g.rotation.x = -1.2; return g; };
const phones = new Map(); [tom, voisin, ...VILL].forEach(ch => phones.set(ch, hold(ch, phoneMesh(), -2.1, .4)));
const nokiaMesh = () => { const g = new THREE.Group(); g.add(box(.5, 1.05, .28, mat('#2a4a9a', { roughness: .35 }), .1)); const sc = box(.34, .3, .04, mat('#a8c890', { emissive: new THREE.Color('#90b878'), emissiveIntensity: .5 })); sc.position.set(0, .22, .15); g.add(sc);
  for (let i = 0; i < 9; i++) { const k = box(.08, .05, .03, mat('#d8d8e0')); k.position.set(((i % 3) - 1) * .11, -.12 - Math.floor(i / 3) * .1, .15); g.add(k); } return g; };
const nokiaMamie = hold(mamie, nokiaMesh(), -2.1, .45); nokiaMamie.rotation.x = -1.1;
const nokiaTom = hold(tom, nokiaMesh(), -2.15, .3);
const nokiaFly = nokiaMesh(); nokiaFly.scale.setScalar(1.3); scene.add(nokiaFly);
const charger = (() => { const g = new THREE.Group(); g.add(box(.5, .5, .5, mat('#ffffff'), .08)); for (const s of [-1, 1]) { const p = box(.06, .06, .35, mat('#c0c4cc', { metalness: .7 })); p.position.set(s * .12, 0, .4); g.add(p); }
  const cb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -.25, 0), V(.2, -.9, .2), V(-.3, -1.3, .1), V(-.1, -1.8, .3)]), 16, .05, 5), mat('#ffffff')); g.add(cb); return hold(tom, g, -2.2, .45); })();
// câbles (tube entre deux points, recalculé si besoin)
const CABLES = []; function cable(a, b, sag = .6) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(b, .3).add(V(0, -sag, 0)), a.clone().lerp(b, .7).add(V(0, -sag, 0)), b]), 20, .04, 5), mat('#f4f4f4')); m.castShadow = true; scene.add(m); m.visible = false; CABLES.push(m); return m; }
function outlet(x, y, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.add(box(.7, .7, .1, mat('#ffffff'), .08)); for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 10), mat('#222')); h.rotation.x = Math.PI / 2; h.position.set(s * .15, 0, .06); g.add(h); } scene.add(g); return g; }
// lampadaires (éteints, puis allumés la nuit)
const LAMP_ON = mat('#fff4d0', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0 });
for (const z of [-7.6, 7.6]) for (let x = -76; x <= 56; x += 16) { const p = box(.3, 6, .3, mat('#2a2e3a')); p.position.set(x, 3, z); scene.add(p); const gl = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 12), LAMP_ON); gl.position.set(x, 6.4, z); scene.add(gl); }
for (const [x, z] of [[-14, -18], [14, -18], [-14, -44], [14, -44]]) { const p = box(.3, 6, .3, mat('#2a2e3a')); p.position.set(x, 3, z); scene.add(p); const gl = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 12), LAMP_ON); gl.position.set(x, 6.4, z); scene.add(gl); }
// prises sur les façades + dormeurs ; le café
const HB = houses.find(h => h.position.z < 0 && Math.abs(h.position.x + 56.8) < 1.2);
const OUT1 = [V(HB.position.x - 2.2, .9, -8.42), V(HB.position.x + 2.2, .9, -8.42), V(HB.position.x + 7.2, .9, -8.42)]; OUT1.forEach(p => outlet(p.x, p.y, p.z));
const outGold = outlet(HB.position.x - 2.2, 2.6, -8.42); outGold.scale.setScalar(1.6); outGold.children[0].material = mat('#ffcf40', { metalness: .8, roughness: .25, emissive: new THREE.Color('#ffb020'), emissiveIntensity: .35 });
const CF = houses.find(h => h.position.z > 0 && Math.abs(h.position.x - 18.4) < 1.2);
{ const sg = box(5.4, 1.5, .2, new THREE.MeshStandardMaterial({ map: textTex(['CAFÉ'], { w: 1024, h: 280, bg: '#5a2a1a', fg: '#ffd23f', border: '#ffd23f', size: 180 }) })); sg.position.set(CF.position.x, 4.4, 8.32); sg.rotation.y = Math.PI; scene.add(sg);
  const aw = canvasTex(256, 64, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#2bb04a'; c.fillRect(i * 32, 0, 32, 64); } });
  const a = box(8, .2, 2, new THREE.MeshStandardMaterial({ map: aw })); a.position.set(CF.position.x, 3.5, 7.6); a.rotation.x = -.25; scene.add(a);
  for (const x of [-2.5, 2.5]) { const tb = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, .1, 16), mat('#ffffff')); tb.position.set(CF.position.x + x, 1.6, 6.2); scene.add(tb); const l = box(.12, 1.4, .12, mat('#333')); l.position.set(CF.position.x + x, .9, 6.2); scene.add(l); } }
const OUTC = V(CF.position.x + 1.2, .9, 8.42); outlet(OUTC.x, OUTC.y, OUTC.z, Math.PI);
// banc de mamie
{ const b = box(3.4, .25, 1.1, mat('#a8743f'), .08); b.position.set(-20, 1.15, -6.4); scene.add(b); const bk = box(3.4, 1, .2, mat('#a8743f'), .08); bk.position.set(-20, 1.9, -6.95); scene.add(bk);
  for (const x of [-1.5, 1.5]) { const l = box(.2, 1, .9, mat('#2a2e3a')); l.position.set(-20 + x, .6, -6.4); scene.add(l); } }
// le maire : levier de l'électricité + stand de batteries
const LEVER = V(-6, .8, -49.6);
const leverArm = new THREE.Group(); { const bx = box(2.2, 2.6, 1, mat('#c8ccd4', { metalness: .4 }), .1); bx.position.set(LEVER.x, LEVER.y + 1.3, LEVER.z); scene.add(bx);
  const lb = box(1.9, .6, .05, new THREE.MeshStandardMaterial({ map: textTex(['⚡ VILLE'], { w: 512, h: 160, bg: '#ffd23f', fg: '#1c1c22', border: '#1c1c22', size: 100 }) })); lb.position.set(LEVER.x, LEVER.y + 2.2, LEVER.z + .53); scene.add(lb);
  leverArm.position.set(LEVER.x + .4, LEVER.y + 1.2, LEVER.z + .55); scene.add(leverArm); const st = box(.15, 1.4, .15, mat('#333')); st.position.y = .7; leverArm.add(st); const kn = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), mat('#e8333a')); kn.position.y = 1.45; leverArm.add(kn); }
const STALL = V(7, .2, -44);
const powerbank = () => { const g = new THREE.Group(); g.add(box(.6, .25, 1, mat('#2a2e3a'), .06)); for (let i = 0; i < 4; i++) { const l = box(.08, .05, .08, mat('#3aff7a', { emissive: new THREE.Color('#3aff7a'), emissiveIntensity: 1.4 })); l.position.set(-.18 + i * .12, .13, .4); g.add(l); } return g; };
{ const tb = box(5, 1.1, 2.2, mat('#a8743f'), .08); tb.position.set(STALL.x, .75, STALL.z); scene.add(tb); BLOCKERS.push(tb);
  for (let i = 0; i < 12; i++) { const p = powerbank(); p.position.set(STALL.x - 2 + (i % 6) * .8, 1.45 + Math.floor(i / 6) * .27, STALL.z - .2); scene.add(p); }
  const sg = box(5.4, 2.4, .15, new THREE.MeshStandardMaterial({ map: textTex(['BATTERIES', '1000 €'], { w: 1024, h: 455, bg: '#ffd23f', fg: '#c0392b', border: '#1c1c22', size: 170 }) })); sg.position.set(STALL.x, 5.2, STALL.z - 3.4); scene.add(sg);
  for (const x of [-2.4, 2.4]) { const p = box(.2, 5, .2, mat('#8a5a2a')); p.position.set(STALL.x + x, 2.5, STALL.z - 3.45); scene.add(p); } }
// bureau du maire : fenêtre, montagne de batteries, bureau
const OFF = V(400, 0, 0);
const offGlass = box(3.6, 2.8, .1, mat('#bfe8ff', { transparent: true, opacity: .55, roughness: .05 })); const shards = [];
const mountain = []; const desk = [];
{ const room = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 18), mat('#e8dcc4', { side: THREE.BackSide })); room.position.set(OFF.x, 4.5, OFF.z); room.receiveShadow = true; scene.add(room); BLOCKERS.push(room);
  const fl = box(18, .2, 18, mat('#7a4a2a')); fl.position.set(OFF.x, .1, OFF.z); scene.add(fl); const rug = box(9, .05, 7, mat('#a8283a')); rug.position.set(OFF.x, .22, OFF.z); scene.add(rug);
  const sky = box(3.6, 2.8, .05, mat('#3a3a7a', { emissive: new THREE.Color('#5a4aa8'), emissiveIntensity: .6 })); sky.position.set(OFF.x, 4.6, OFF.z + 8.94); scene.add(sky);
  for (const [w_, h_, x, y] of [[4.2, .3, 0, 6.15], [4.2, .3, 0, 3.05], [.3, 3.4, -1.95, 4.6], [.3, 3.4, 1.95, 4.6]]) { const f = box(w_, h_, .3, mat('#ffffff')); f.position.set(OFF.x + x, y, OFF.z + 8.85); scene.add(f); }
  offGlass.position.set(OFF.x, 4.6, OFF.z + 8.82); scene.add(offGlass);
  for (let i = 0; i < 14; i++) { const s = box(.5 + (i % 3) * .2, .4 + (i % 2) * .3, .05, mat('#bfe8ff', { transparent: true, opacity: .6 })); s.userData.v = V(((i * 37) % 11 - 5) * .25, ((i * 53) % 7 - 2) * .3, -2 - (i % 4)); s.userData.r = V(i, i * 1.3, i * .7); scene.add(s); s.visible = false; shards.push(s); }
  const r = rng(77); for (let i = 0; i < 70; i++) { const p = powerbank(); const a = r() * 6.283, d = r() * 2.8, lvl = Math.max(0, 3.2 - d * 1.05 - r() * .4);
    p.position.set(OFF.x + Math.cos(a) * d, .3 + lvl, OFF.z + Math.sin(a) * d); p.rotation.set((r() - .5) * .5, r() * 6, (r() - .5) * .5); p.scale.setScalar(1.4); scene.add(p); p.userData.p0 = p.position.clone(); p.userData.r0 = p.rotation.clone();
    p.userData.v = V(Math.cos(a) * (2 + r() * 5), 3 + r() * 6, Math.sin(a) * (2 + r() * 5) - 3); mountain.push(p); }
  for (const [x, w_] of [[-1.25, 2.5], [1.25, 2.5]]) { const d = box(w_, 1.6, 2.2, mat('#6a3a1a'), .06); d.position.set(OFF.x + x, .9, OFF.z - 5.5); scene.add(d); d.userData.p0 = d.position.clone(); desk.push(d); }
  const nm = box(2.4, .5, .1, new THREE.MeshStandardMaterial({ map: textTex(['LE MAIRE'], { w: 512, h: 110, size: 80, bg: '#ffd23f', fg: '#1c1c22', border: '#1c1c22' }) })); nm.position.set(OFF.x, 1.3, OFF.z - 4.38); scene.add(nm); desk.push(nm); nm.userData.p0 = nm.position.clone();
  const lamp = new THREE.PointLight(0xffe0b0, 35, 26, 1.4); lamp.position.set(OFF.x, 8, OFF.z + 2); scene.add(lamp); }
// boulangerie (fin)
const BK = houses.find(h => h.position.z > 0 && Math.abs(h.position.x + 10.2) < 1.2);
{ const sg = box(6.4, 1.5, .2, new THREE.MeshStandardMaterial({ map: textTex(['BOULANGERIE'], { w: 1024, h: 240, bg: '#fff4d8', fg: '#a8541a', border: '#a8541a', size: 120 }) })); sg.position.set(BK.position.x, 4.4, 8.32); sg.rotation.y = Math.PI; scene.add(sg); }
// fumées, étincelles, confettis
const PUFFS = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const m = mat('#ffffff', { transparent: true, roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .25 }); const r = rng(i + 3);
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), m); const a = k * .7; b.userData.dir = V(Math.cos(a) * (.6 + r() * .4), .2 + r() * .9, Math.sin(a) * (.6 + r() * .4)); g.add(b); }
  g.userData.m = m; g.visible = false; scene.add(g); PUFFS.push(g); }
let puffN = 0;
function puff(t, t0, pos, s = 1, col = '#ffffff') { const k = (t - t0) / .7; if (k < 0 || k > 1 || puffN >= PUFFS.length) return; const g = PUFFS[puffN++]; g.visible = true; g.position.copy(pos); g.scale.setScalar(s); g.userData.m.color.set(col);
  g.children.forEach(b => { b.position.copy(b.userData.dir).multiplyScalar(easeOut(k) * 1.6); b.scale.setScalar(.5 + easeOut(k) * 1.2); }); g.userData.m.opacity = 1 - k * k; }
const CONF = 900, confGeo = new THREE.BufferGeometry(); confGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3)); confGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3));
const confMat = new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }); const confetti = new THREE.Points(confGeo, confMat); confetti.frustumCulled = false; scene.add(confetti);
const confSeed = []; { const r = rng(9); const cols = ['#ffd23f', '#7fe8ff', '#ff6ad5', '#8aff6a', '#ffffff']; const ca = confGeo.attributes.color.array;
  for (let i = 0; i < CONF; i++) { confSeed.push([r(), r(), r(), r()]); const c = new THREE.Color(cols[i % 5]); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } }
function confettiAt(t, t0, ctr, R) { const k = t - t0; if (k < 0 || k > 4) return; const p = confGeo.attributes.position.array;
  confSeed.forEach((s, i) => { const a = s[0] * 6.283, sp = (.4 + s[1]) * R; p[i * 3] = ctr.x + Math.cos(a) * sp * Math.min(1, k * 1.5) + Math.sin(k * 3 + i) * .3; p[i * 3 + 1] = ctr.y + (s[2] * 2 - .3) * R * .6 * Math.min(1, k * 2) - k * k * .8 * s[3]; p[i * 3 + 2] = ctr.z + Math.sin(a) * sp * Math.min(1, k * 1.5); });
  confGeo.attributes.position.needsUpdate = true; confMat.opacity = 1 - seg(k, 3, 4); confetti.visible = true; }

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { vie: 9, cent: 10, vingt: 16, un: 24, rampes: 28, regarde: 31, oui: 37, esperance: 41, ici: 44, gens: 53, cafe: 59, prise: 63, deux: 65, voisin: 68, active: 71, gris: 80, parle: 81, cligner: 89,
    mamie: 92, nokia: 99, barre: 100, immortelle: 108, tom: 109, chargeur: 116, enfin: 117, maire: 121, coupe: 128, ville: 133, vends: 136, mille: 141, tombe: 143, dix: 149, cinq: 153, puis2: 154, rampe: 159,
    lemaire: 163, cent2: 168, montagne: 174, alors: 177, mamie2: 181, sonNokia: 182, lance: 186, forces: 190, traverse: 193, fenetre: 195, montagne2: 197, bureau: 202, paf: 205, rayure: 211, toutes: 212, explose: 216,
    remontee: 224, cent3: 226, lemaire2: 229, un2: 234, rampe2: 239, boulangerie: 242, trois: 246, toi: 249, combien: 252, branche: 253 };
  for (const k in N) e[k] = w(N[k]); return e;
}

// ---------------------------------------------------------------- état de la scène
let NIGHT = 0, DARK = 0;
const BATT = new Map();
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); BATT.clear(); puffN = 0; PUFFS.forEach(p => p.visible = false); confetti.visible = false; nokiaFly.visible = false;
  phones.forEach(p => p.visible = false); [nokiaMamie, nokiaTom, charger].forEach(o => o.visible = false); CABLES.forEach(c => c.visible = false); shards.forEach(s => s.visible = false);
  const S = (a, b) => t >= a && t < b; const bat = (ch, v, k = {}) => BATT.set(ch, { v, ...k });
  // ambiance : jour -> coupure (crépuscule, tout éteint) -> nuit illuminée après l'explosion
  DARK = ease(seg(t, E.coupe, E.coupe + .6)) * (1 - ease(seg(t, E.explose, E.explose + .8))); NIGHT = ease(seg(t, E.explose, E.explose + .8));
  const day = [new THREE.Color('#3f8fe6'), new THREE.Color('#8cc6f5'), new THREE.Color('#dff0ff')], dusk = [new THREE.Color('#1c1a4a'), new THREE.Color('#5a3a7a'), new THREE.Color('#c86a5a')], night = [new THREE.Color('#141a4a'), new THREE.Color('#3a3a8a'), new THREE.Color('#e88a6a')];
  ['top', 'mid', 'bot'].forEach((k, i) => skyMat.uniforms[k].value.copy(day[i]).lerp(dusk[i], DARK).lerp(night[i], NIGHT));
  scene.fog.color.set('#cfe7ff').lerp(new THREE.Color('#4a3a6a'), DARK).lerp(new THREE.Color('#5a4a8a'), NIGHT);
  sun.color.set('#ffe6c2').lerp(new THREE.Color('#ff9a6a'), DARK).lerp(new THREE.Color('#8aa0ff'), NIGHT); sun.intensity = lerp(2.7, .7, Math.max(DARK, NIGHT)); hemi.intensity = lerp(1.35, .55, DARK) * (1 - NIGHT) + NIGHT * .75;
  hemi.color.set('#d6ecff').lerp(new THREE.Color('#7a6aa8'), Math.max(DARK, NIGHT)); rim.color.set('#bfe0ff').lerp(new THREE.Color('#ff9ad8'), NIGHT); rim.intensity = 1.4 + NIGHT * 1.2;
  LAMP_ON.emissiveIntensity = (1 - DARK) * (t < E.coupe ? 0 : 0) + NIGHT * 2.4; WIN.emissiveIntensity = NIGHT * 1.3; camLight.intensity = 6 + NIGHT * 8 + DARK * 2;
  // A. la règle : 100 %, 20 %, 1 %
  if (S(0, E.regarde - .05)) {
    const crowd = [[0, -12, 5.6], [1, -6, 6.2], [4, 6, 5.2], [5, 10, 6.4], [8, -16, -5.4], [9, 2, -5.8]];
    if (t < E.cent - .1) crowd.forEach(([i, x, z], j) => { const v = VILL[i]; place(v, x, .2, z, z > 0 ? Math.PI - .4 + j * .2 : .3); setFace(v, 'smile'); pose(v, 'idle', t + j); phones.get(v).visible = true; v.userData.arms[1].rotation.set(-1.2, 0, 0); bat(v, [86, 54, 12, 100, 33, 71][j]); });
    if (S(E.cent - .1, E.vingt - .1)) { const v = VILL[2]; const x = lerp(-14, 12, seg(t, E.cent - .1, E.vingt)); place(v, x, .2, 5.4, Math.PI / 2); setFace(v, 'laugh'); pose(v, 'run', t); bat(v, 100); }
    if (S(E.vingt - .1, E.un - .1)) { const v = VILL[5]; const x = lerp(-3, -1, seg(t, E.vingt - .1, E.un)); place(v, x, .2, 5.4, Math.PI / 2); setFace(v, 'worried'); pose(v, 'oldwalk', t); bat(v, 20); }
    if (S(E.un - .1, E.regarde)) { const v = VILL[3]; const x = lerp(1, 1.6, seg(t, E.un - .1, E.regarde)); place(v, x, .2, 5.4, Math.PI / 2); setFace(v, 'sad'); pose(v, 'crawl', t); bat(v, 1); }
  }
  // B. « regarde en haut de ton écran »
  if (S(w(29) - .1, E.ici - .05)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.esperance - .2 ? 'deadpan' : 'smug'); pose(tom, t < E.esperance - .2 ? 'pointUp' : 'idle', t); bat(tom, 100); }
  // C. les prises : plus précieuses que l'or, les dormeurs, le café
  if (S(E.ici - .05, E.voisin - .05)) {
    [[0, -2.2], [1, 2.2], [4, 7.2]].forEach(([i, dx], j) => { const v = VILL[i]; const x = HB.position.x + dx + .9; place(v, x, .2, -7.3, 0); setFace(v, 'sleep'); pose(v, 'sit', t); phones.get(v).visible = true; v.userData.arms[1].rotation.set(-.9, 0, .1); bat(v, [3, 7, 2][j]);
      const c = CABLES[j] || cable(V(0, 0, 0), V(0, 0, 0)); if (!c.userData.set) { c.geometry.dispose(); c.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([OUT1[j].clone().add(V(0, 0, .1)), V(x - .4, .35, -8), V(x + .2, .4, -7), V(x + .35, 1.1, -6.6)]), 20, .04, 5); c.userData.set = 1; } c.visible = true; });
    if (t > E.cafe - .2) { const pile = [[6, 0, 0], [7, .9, .2], [8, -.9, .2], [9, .45, .9], [10, -.45, .9], [11, 0, 1.7], [5, 1.6, .9], [2, -1.6, .9]];
      pile.forEach(([i, dx, lvl], j) => { const v = VILL[i]; place(v, OUTC.x + dx, .2 + lvl * 1.45, OUTC.z - 1.4 - (j % 3) * .25, Math.PI); setFace(v, j % 2 ? 'worried' : 'shock'); pose(v, lvl > 0 ? 'sit' : 'idle', t + j); if (lvl > 0) v.userData.root.position.y = 0; phones.get(v).visible = true; v.userData.arms[1].rotation.set(-1.3, 0, 0); bat(v, 2 + j * 3); });
      const c = CABLES[3] || cable(V(0, 0, 0), V(0, 0, 0)); if (!c.userData.set) { c.geometry.dispose(); c.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([OUTC.clone().add(V(0, 0, -.1)), V(OUTC.x, .6, 7.4), V(OUTC.x - .2, 1.4, 7.2)]), 16, .05, 5); c.userData.set = 1; } c.visible = true; }
  }
  // D. le voisin en mode économie d'énergie
  if (S(E.voisin - .05, E.mamie - .05)) { const grey = t > E.gris - .4; const v = grey ? voisinGris : voisin; place(v, -30, .2, 5.6, Math.PI - .2); setFace(v, grey ? 'deadpan' : 'smile');
    pose(v, grey ? 'robot' : 'holdOut', t); if (!grey) phones.get(voisin).visible = true; bat(v, grey ? 15 : 18, { eco: grey }); puff(t, E.gris - .45, V(-30, 1.8, 5.6), 1, '#c8c8c8'); }
  // E. mamie et son Nokia
  if (S(E.mamie - .05, E.tom - .05)) { place(mamie, -20, 1.27, -6.4, 0); setFace(mamie, 'smile'); pose(mamie, 'sit', t); mamie.userData.root.position.y = -1.45 * .5; nokiaMamie.visible = true; mamie.userData.arms[1].rotation.set(-1.5, 0, .1); bat(mamie, 1, { nokia: true }); }
  // F. Tom et son chargeur
  if (S(E.tom - .05, E.maire - .05)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.enfin ? 'worried' : 'smile'); pose(tom, t > E.chargeur - .3 && t < E.enfin ? 'holdUp' : 'idle', t); charger.visible = t > E.chargeur - .3; bat(tom, 100, { plug: t < E.enfin }); }
  // G. le maire coupe l'électricité, vend ses batteries
  if (S(E.maire - .05, E.tombe - .05)) { const sell = t > E.vends - .1; place(mayor, sell ? STALL.x : LEVER.x + 1.8, .2, sell ? STALL.z - 1.9 : LEVER.z + .6, sell ? 0 : -.6);
    setFace(mayor, t > E.coupe - .1 ? 'smug' : 'talk'); pose(mayor, sell ? 'talk' : (t > E.coupe - .3 ? 'reach' : 'talk'), t); bat(mayor, 100);
    leverArm.rotation.x = -1.2 * easeBack(seg(t, E.coupe - .2, E.coupe + .1)); }
  else leverArm.rotation.x = t > E.coupe ? -1.2 : 0;
  // H. tout le monde tombe à 10 %, 5 %, rampe jusqu'à la mairie
  if (S(E.tombe - .05, E.lemaire - .05)) { const crawl = t > E.puis2 - .1; VILL.forEach((v, i) => { const x = -10 + (i % 6) * 4, z0 = -22 - Math.floor(i / 6) * 3.5; const z = crawl ? z0 - (t - E.puis2) * .9 : z0;
      place(v, x, .2, z, Math.PI); setFace(v, crawl ? 'sad' : 'worried'); pose(v, crawl ? 'crawl' : 'oldwalk', t + i * .3); bat(v, t > E.cinq - .1 ? 5 : 10); });
    place(tom, 13, .2, -22, Math.PI - .3); setFace(tom, 'worried'); pose(tom, crawl ? 'crawl' : 'oldwalk', t); bat(tom, t > E.cinq - .1 ? 5 : 10); }
  // I. le maire sur sa montagne de batteries (bureau)
  const office = S(E.lemaire - .05, E.alors - .05) || S(E.traverse - .05, E.toutes - .05);
  mountain.forEach(p => { p.visible = t < E.toutes + .3; p.position.copy(p.userData.p0); p.rotation.copy(p.userData.r0); });
  desk.forEach(d => { d.visible = true; d.position.copy(d.userData.p0); d.rotation.set(0, 0, 0); });
  offGlass.visible = t < E.fenetre;
  if (office) { place(mayor, OFF.x, 3.4, OFF.z + .2, 0); setFace(mayor, t > E.montagne2 ? 'shock' : 'smug'); pose(mayor, 'sit', t); mayor.userData.root.position.y = 0; bat(mayor, 100); phones.get(VILL[0]); }
  // J. mamie donne le Nokia, Tom le lance
  if (S(E.alors - .05, E.traverse - .05)) { const P0 = V(3, .2, -36); place(tom, P0.x, .2, P0.z, Math.PI); place(mamie, P0.x - 2.2, .2, P0.z + .8, 2); setFace(mamie, 'smile'); pose(mamie, t < E.lance - .4 ? 'holdOut' : 'idle', t); bat(mamie, 1, { nokia: true });
    nokiaMamie.visible = t < E.sonNokia + .1; mamie.userData.arms[1].rotation.set(-1.5, 0, 0); nokiaTom.visible = t > E.sonNokia + .1 && t < E.forces - .05;
    setFace(tom, t > E.lance ? 'stern' : 'smile'); pose(tom, t < E.lance ? 'windup' : 'throw', t); bat(tom, 5);
    if (t > E.forces - .05) { const k = seg(t, E.forces - .05, E.traverse - .05); nokiaFly.visible = true; nokiaFly.position.set(lerp(P0.x, -12, k), lerp(4, 9, k) + Math.sin(k * Math.PI) * 4, lerp(P0.z, -51.9, k)); nokiaFly.rotation.set(t * 14, t * 9, 0); } }
  // K. le Nokia traverse tout
  if (S(E.traverse - .05, E.toutes - .05)) { const k = seg(t, E.traverse - .05, E.paf); const z = lerp(OFF.z + 10, OFF.z - 8.6, k);
    nokiaFly.visible = true; nokiaFly.position.set(OFF.x + .1, lerp(4.6, 1.6, k) + Math.sin(k * Math.PI) * 1.2, z); nokiaFly.rotation.set(t * 16, t * 7, 0); if (t > E.paf) { nokiaFly.position.set(OFF.x + .1, .45, OFF.z - 8.2); nokiaFly.rotation.set(-Math.PI / 2, .3, 0); }
    if (t > E.fenetre - .1) { const ks = t - E.fenetre + .1; shards.forEach(s => { s.visible = ks < 2.5; s.position.set(OFF.x + s.userData.v.x * ks * 2, Math.max(.3, 4.6 + s.userData.v.y * ks * 2 - ks * ks * 4), OFF.z + 8.8 + s.userData.v.z * ks); s.rotation.set(s.userData.r.x * ks, s.userData.r.y * ks, s.userData.r.z * ks); }); }
    const hm = t - (E.montagne2 - .15); if (hm > 0) { mountain.forEach(p => { p.position.copy(p.userData.p0).addScaledVector(p.userData.v, Math.min(hm, 1.2) * .9); p.position.y = Math.max(.3, p.position.y - hm * hm * 2.5); p.rotation.x += hm * 4; }); place(mayor, OFF.x + Math.min(hm, .8) * 3, Math.max(.2, 3.4 + hm * 3 - hm * hm * 6), OFF.z + .2, 0); pose(mayor, hm < .6 ? 'jump' : 'sit', t); }
    const hd = t - (E.bureau - .1); if (hd > 0) desk.forEach((d, i) => { const s = i === 0 ? -1 : i === 1 ? 1 : 0; d.position.set(d.userData.p0.x + s * Math.min(hd, .5) * 3, d.userData.p0.y + (s ? 0 : -Math.min(hd, .4) * 2), d.userData.p0.z); d.rotation.z = s * Math.min(hd, .5) * 1.2; }); }
  // L. confettis d'électricité, la ville se rallume
  if (S(E.toutes - .05, E.lemaire2 - .05)) { confettiAt(t, E.explose - .1, V(0, 10, -36), 26);
    VILL.forEach((v, i) => { const x = -10 + (i % 6) * 4, z = -26 - Math.floor(i / 6) * 3.5; place(v, x, .2, z, i % 2 ? .3 : -.3); setFace(v, t > E.explose ? 'laugh' : 'sad'); pose(v, t > E.explose ? 'jump' : 'crawl', t + i * .4); bat(v, t > E.remontee ? 100 : 5); });
    place(tom, 15, .2, -31, -.3); setFace(tom, t > E.explose ? 'laugh' : 'worried'); pose(tom, t > E.explose ? 'jump' : 'crawl', t); bat(tom, t > E.remontee ? 100 : 5);
    place(mamie, 18, .2, -31.5, -.5); setFace(mamie, 'laugh'); pose(mamie, 'holdUp', t); bat(mamie, 1, { nokia: true }); }
  // M. le maire à 1 %, rampe vers la boulangerie
  if (S(E.lemaire2 - .05, E.toi - .05)) { const x = lerp(BK.position.x - 7, BK.position.x - 5.5, seg(t, E.lemaire2, E.toi)); place(mayor, x, .2, 6.2, Math.PI / 2); setFace(mayor, 'sad'); pose(mayor, 'crawl', t); bat(mayor, 1); }
  // N. « Et toi, t'es à combien ? »
  if (S(E.toi - .05, END + 1)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.branche - .1 ? 'smug' : 'smile'); pose(tom, t > E.branche - .1 ? 'idle' : 'pointCam', t); bat(tom, 100); }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], macro2: [1.5, .3, 40], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42],
  feet: [3.4, -.6, 36], high: [9, 9, 42], grp: [13, 1.5, 40], track: [7, 1, 38] };
const SUBJ = { tom: () => tom, mamie: () => mamie, mayor: () => mayor, voisin: () => voisin, gris: () => voisinGris, v2: () => VILL[2], v5: () => VILL[5], v3: () => VILL[3], v0: () => VILL[0], v1: () => VILL[1], v4: () => VILL[4], v6: () => VILL[6] };
const sizeOf = ch => Math.max(.06, ch.scale.x * ch.userData.root.scale.y / .5);
function subjectPoint(name, part) {
  if (name === 'nokia') return { p: nokiaFly.position.clone(), face: Math.PI, k: .5 };
  if (name.startsWith('@')) { const [x, y, z, f] = name.slice(1).split(',').map(Number); return { p: V(x, y, z), face: f || 0, k: 1 }; }
  const ch = SUBJ[name](); ch.updateMatrixWorld(true);
  const p = part === 'feet' ? ch.position.clone().add(V(0, .45 * sizeOf(ch), 0)) : part === 'body' ? ch.userData.torso.getWorldPosition(V(0, 0, 0)) : ch.userData.hd.getWorldPosition(V(0, 0, 0));
  return { p, face: ch.rotation.y, ch, k: sizeOf(ch) };
}
const RAY = new THREE.Raycaster();
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  const hx = HB.position.x, cx = CF.position.x;
  A(0, '@-3,2.5,1', 'ws', 88, null, 'pan'); A(3, 'v0', 'mcu', 15); A(6, 'v4', 'mcu', -15);
  A(10, 'v2', 'track', 70, 'body', 'static'); A(13, 'v2', 'mcu', 30); A(16, 'v5', 'ms', 50, 'body'); A(19, 'v5', 'mcu', 20); A(24, 'v3', 'fs', 60, 'body'); A(27, 'v3', 'cu', 0);
  A(29, 'tom', 'mcu', 10, null, 'static'); A(31, 'tom', 'ms', 0, 'body', 'static'); A(37, 'tom', 'cu', 0, null, 'static'); A(39, 'tom', 'cu', -10);
  A(44, `@${hx - 2.2},2.2,-8.4`, 'ms', 0, null, 'static'); A(48, `@${hx - 2.2},2.6,-8.4`, 'macro', 20);
  A(53, `@${hx + 1},1.3,-7.4`, 'grp', 10); A(55, 'v0', 'mcu', 0); A(57, 'v1', 'ms', 20, 'body');
  A(59, `@${cx},4.4,8.3,3.14`, 'sign', 0, null, 'static'); A(63, `@${cx + 1},2.4,${OUTC.z - 1.4},3.14`, 'ms', -25); A(65, `@${cx + 1},2.4,${OUTC.z - 1.4},3.14`, 'grp', 15);
  A(68, 'voisin', 'ms', 10, 'body'); A(71, 'voisin', 'mcu', -20); A(76, 'gris', 'ms', 0, 'body'); A(81, 'gris', 'mcu', 15); A(85, 'gris', 'cu', 0, null, 'static');
  A(92, 'mamie', 'ms', 15, 'body'); A(95, 'mamie', 'mcu', -15); A(100, 'mamie', 'cu', 10); A(105, 'mamie', 'mcu', 0, null, 'up');
  A(109, 'tom', 'mcu', 10); A(112, 'tom', 'fs', -15, 'body'); A(115, 'tom', 'cu', 0); A(117, 'tom', 'mcu', 20);
  A(119, 'mayor', 'low', 15); A(124, 'mayor', 'mcu', -10); A(127, `@${LEVER.x + .4},2.6,${LEVER.z + .6}`, 'ms', 20); A(129, '@0,4,-36', 'ws', 0, null, 'static'); A(133, '@-20,3,0', 'ws', 85);
  A(134, 'mayor', 'ms', 10, 'body'); A(137, `@${STALL.x},3.6,${STALL.z - 1.1}`, 'sign', 0, null, 'static'); A(141, 'mayor', 'cu', 0);
  A(143, '@2,2,-26,3.14', 'grp', 0); A(147, 'v1', 'mcu', 0); A(152, 'tom', 'mcu', -20); A(154, '@2,1.2,-28,3.14', 'high', 0); A(158, 'v4', 'fs', 40, 'body');
  A(163, `@${OFF.x},4,${OFF.z}`, 'fs', 0); A(166, 'mayor', 'mcu', 10); A(171, `@${OFF.x},2,${OFF.z}`, 'grp', -25, null, 'up');
  A(177, 'mamie', 'mcu', 15); A(182, 'tom', 'mcu', 20); A(184, 'tom', 'ms', -30, 'body'); A(188, 'nokia', 'ms', 90, null, 'static');
  A(191, `@${OFF.x},4.6,${OFF.z + 8.8},3.14`, 'ms', 25, null, 'static'); A(196, `@${OFF.x},2.4,${OFF.z}`, 'grp', 30, null, 'static'); A(200, `@${OFF.x},1.2,${OFF.z - 5.5}`, 'fs', 25, null, 'static');
  A(205, `@${OFF.x},2,${OFF.z - 5}`, 'ms', 15, null, 'static'); A(207, `@${OFF.x + .1},.45,${OFF.z - 8.2}`, 'macro', 0, null, 'static');
  A(212, '@0,8,-34', 'ws', 0, null, 'up'); A(216, '@0,6,-24', 'xws', 10, null, 'static'); A(220, 'tom', 'mcu', 0); A(224, '@0,2.5,-28', 'grp', -10); A(226, 'mamie', 'mcu', -10);
  A(229, 'mayor', 'fs', 70, 'body'); A(233, 'mayor', 'cu', 80); A(238, `@${BK.position.x},4.4,8.3,3.14`, 'sign', 0, null, 'static'); A(243, 'mayor', 'fs', 40, 'body');
  A(248, 'tom', 'mcu', 0, null, 'static'); A(252, 'tom', 'cu', 0, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
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

// ---------------------------------------------------------------- habillage
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function onoma(text, x, y, a, { size = 110, rot = -.08, fill = '#ffd23f', stroke = '#1c1c22' } = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); g.rotate(rot); const s = easeBack(clamp(a * 1.8)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = stroke;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.strokeText(text, 0, 0); g.shadowColor = 'transparent'; g.fillStyle = fill; g.fillText(text, 0, 0); g.restore(); }
function battIcon(x, y, s, b) { const v = b.v, col = b.nokia ? '#9ad07a' : b.eco ? '#ffd23f' : v > 50 ? '#3fd06a' : v > 15 ? '#ffb030' : '#ff3b3b';
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
  g.fillStyle = 'rgba(20,20,28,.85)'; g.beginPath(); g.roundRect(-92, -34, 184, 68, 20); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.roundRect(-80, -22, 70, 44, 9); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(-10, -9, 7, 18);
  if (b.nokia) { g.fillStyle = col; g.fillRect(-73, -15, 13, 30); } else { g.fillStyle = col; g.fillRect(-73, -15, Math.max(3, 56 * v / 100), 30); }
  g.fillStyle = '#ffffff'; g.font = "900 40px 'Inter Display'"; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(b.nokia ? '∞' : b.eco ? 'ÉCO' : v + '%', 6, 2);
  if (b.plug) { g.fillStyle = '#ffd23f'; g.font = "900 34px 'Inter Display'"; g.fillText('⚡', -60, 2); }
  g.restore(); }
function overlays(t) {
  for (const [ch, b] of BATT) { if (!ch.visible) continue; const hp = ch.userData.hd.getWorldPosition(V(0, 0, 0)); const sz = sizeOf(ch); const top = project(hp.clone().add(V(0, 1.6 * sz, 0))), bot = project(hp.clone().add(V(0, .6 * sz, 0)));
    if (top[2] > 1 || top[0] < 60 || top[0] > W - 60 || top[1] < 120 || top[1] > H - 320) continue; const px = Math.abs(bot[1] - top[1]); const s = clamp(px / 140, .35, 1.25); if (s < .4) continue;
    battIcon(top[0], top[1] - 20 * s, s, b); }
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b || !ch.visible) return; const q = project(ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.1 * sizeOf(ch), 0))); if (q[2] < 1) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1] - 150, 280, 1050), win(t, a, b, .12), o); };
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > 0 && q[0] < W) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  if (t > E.regarde && t < E.ici - .1) { const a = win(t, E.regarde, E.ici - .1, .2), bob = Math.sin(t * 9) * 18; g.save(); g.globalAlpha = a; g.translate(860 + bob * .6, 260 - bob); g.rotate(-.62);
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#1c1c22'; g.lineWidth = 12; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, -120); g.lineTo(90, 0); g.lineTo(34, 0); g.lineTo(34, 150); g.lineTo(-34, 150); g.lineTo(-34, 0); g.lineTo(-90, 0); g.closePath(); g.stroke(); g.fill(); g.restore(); }
  pop('VROUM !', VILL[2], E.cent, E.vingt - .2, { size: 110 }); pop('ZZZ…', VILL[0], E.gens, E.cafe - .2, { size: 90, fill: '#bfe8ff', rot: .1 });
  popAt('✨', V(HB.position.x - 2.2, 3.9, -8.2), E.ici, E.gens - .2, { size: 120 });
  pop('BIP…', voisinGris, E.parle, E.cligner, { size: 80, fill: '#c8c8c8' });
  pop('CLAC !', mayor, E.coupe - .1, E.coupe + .9, { size: 120 });
  popAt('BZZT…', V(0, 9, -30), E.coupe + .2, E.ville + .3, { size: 110, fill: '#bfe8ff' });
  if (nokiaFly.visible && t > E.forces && t < E.traverse) popAt('FIOUUU', nokiaFly.position.clone().add(V(0, 2, 0)), E.forces, E.traverse - .1, { size: 90, rot: .1 });
  popAt('CRAC !', V(OFF.x, 6.4, OFF.z + 8.6), E.fenetre - .1, E.fenetre + .9, { size: 130, fill: '#bfe8ff' });
  popAt('PAF !', V(OFF.x, 2.6, OFF.z - 6), E.paf - .05, E.paf + 1, { size: 160, fill: '#ff4d4d' });
  popAt('BOUM !', V(0, 12, -34), E.explose - .1, E.explose + 1.2, { size: 170, fill: '#ffd23f' });
  const fl = (t > E.explose - .1 ? .7 * Math.exp(-(t - E.explose + .1) * 5) : 0) + (t > E.coupe ? .35 * Math.exp(-(t - E.coupe) * 9) : 0); if (fl > .01) { g.fillStyle = `rgba(255,248,220,${fl})`; g.fillRect(0, 0, W, H); }
}
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
  camLight.position.copy(cam.p).add(V(0, 1, 0)).lerp(cam.c, .3);
  composer.render();
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(glc, 0, 0, W, H);
  if (CLEAN) return;
  overlays(t);
  const v = g.createRadialGradient(540, 900, 650, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
};
window.ready = Promise.resolve().then(() => { window.__ready = true; });
window.__loaded = true;
