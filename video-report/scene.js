// « Dans cette ville, tout le monde attend le même jeu vidéo depuis douze ans » — rendu déterministe : window.render(t)
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
// ---------------------------------------------------------------- personnages (et leur âge)
const WHITE = new THREE.Color('#ecebf2');
function ageable(ch) { const ms = new Set(); ch.userData.hairG.traverse(o => { if (o.isMesh) ms.add(o.material); }); ch.userData.hairMats = [...ms]; ch.userData.hair0 = [...ms].map(m => m.color.clone());
  const pv = new THREE.Group(); pv.position.set(0, .35, .58); ch.userData.head.add(pv); const b = box(1.25, 1, .35, mat('#ecebf2'), .12); b.position.y = -.5; pv.add(b); ch.userData.beard = pv; pv.visible = false; return ch; }
function age(ch, white, beard = 0, bcol) { ch.userData.hairMats.forEach((m, i) => m.color.copy(ch.userData.hair0[i]).lerp(WHITE, white)); const b = ch.userData.beard; b.visible = beard > .02; b.scale.set(1, Math.max(.02, beard), 1); if (bcol) b.children[0].material.color.set(bcol); }
const tom = ageable(makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => { for (let i = 0; i < 3; i++) { const st = box(2.06, .22, 1.06, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } }));
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#e8433a'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const whiteHair = box(.12, .7, .12, mat('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: .5 })); whiteHair.position.set(.2, 2.05, .3); whiteHair.rotation.z = -.3; tom.userData.head.add(whiteHair);
const mayor = ageable(makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu); const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); }); } }));
const dad = ageable(makeChar({ shirt: '#e8743b', pants: '#4a4a5a', hair: '#2a1a10', hairStyle: 'short' }));
const mom = ageable(makeChar({ shirt: '#7a5fb8', pants: '#3a3a52', hair: '#3a2416', hairStyle: 'long' }));
const papy = ageable(makeChar({ shirt: '#a0784a', pants: '#5a5a5a', hair: '#6a4a2a', hairStyle: 'short' }));
const kids = [0, 1, 2].map(i => ageable(makeChar({ shirt: ['#ff7aa0', '#5bb0d9', '#e0c050'][i], pants: '#3a3a52', hair: ['#d8a040', '#2a1a10', '#6a3a1a'][i], hairStyle: ['pigtails', 'spiky', 'short'][i], scale: .62 })));
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long']].map(([s, p, h, st]) => ageable(makeChar({ shirt: s, pants: p, hair: h, hairStyle: st })));
const hold = (ch, obj, y = -2.1, z = .45) => { ch.userData.arms[1].add(obj); obj.position.set(0, y, z); obj.visible = false; return obj; };
const phoneMesh = () => { const g = new THREE.Group(); g.add(box(.5, .9, .1, mat('#1c1c22'), .04)); const sc = box(.42, .78, .02, mat('#ff9ad8', { emissive: new THREE.Color('#ff7ac8'), emissiveIntensity: .9 })); sc.position.z = .06; g.add(sc); g.rotation.x = -1.2; return g; };
const phones = VILL.map(v => hold(v, phoneMesh(), -2.1, .4));
const stamp = hold(mayor, (() => { const g = new THREE.Group(); g.add(box(.25, .7, .25, mat('#6a3a1a'))); const b = box(.8, .3, .6, mat('#c0392b'), .05); b.position.y = -.45; g.add(b); return g; })(), -2.3, .3);
const stampT = hold(tom, (() => { const g = new THREE.Group(); g.add(box(.25, .7, .25, mat('#6a3a1a'))); const b = box(.8, .3, .6, mat('#c0392b'), .05); b.position.y = -.45; g.add(b); return g; })(), -2.3, .3);
const cake = hold(tom, (() => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, .5, 20), mat('#ffb0c8')); g.add(c); const top = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .1, 20), mat('#ffffff')); top.position.y = .28; g.add(top);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const cd = box(.06, .3, .06, mat(['#5ad0ff', '#ffd23f', '#ff6ad5'][i % 3])); cd.position.set(Math.cos(a) * .5, .48, Math.sin(a) * .5); g.add(cd); const fl = box(.07, .1, .07, mat('#ffb020', { emissive: new THREE.Color('#ff9a20'), emissiveIntensity: 2 })); fl.position.set(Math.cos(a) * .5, .68, Math.sin(a) * .5); g.add(fl); }
  g.rotation.x = 1.5; return g; })(), -2.2, .9);
// chien à la retraite
const dog = new THREE.Group(); scene.add(dog); { const C = mat('#c89a5a'); const b = box(1.8, .9, .9, C, .3); b.position.y = .9; dog.add(b); const h = box(.9, .8, .8, C, .3); h.position.set(.95, 1.5, 0); dog.add(h); for (const s of [-1, 1]) { const e = box(.2, .55, .35, mat('#8a5a2a'), .08); e.position.set(.85, 1.6, s * .45); dog.add(e); }
  const n = box(.2, .2, .25, mat('#1c1c22')); n.position.set(1.42, 1.45, 0); dog.add(n); for (const [x, z] of [[-.6, -.3], [-.6, .3], [.6, -.3], [.6, .3]]) { const l = box(.25, .5, .25, C); l.position.set(x, .25, z); dog.add(l); }
  const gl = new THREE.Group(); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.14, .03, 6, 14), mat('#1c1c22')); r.position.set(1.36, 1.62, s * .2); r.rotation.y = Math.PI / 2; gl.add(r); } dog.add(gl); dog.userData.old = gl;
  const cn = box(.08, 1.6, .08, mat('#6a3a1a')); cn.position.set(1.4, .8, .5); dog.add(cn); dog.userData.cane = cn; const sg = box(1.6, .5, .05, new THREE.MeshStandardMaterial({ map: textTex(['RETRAITÉ'], { w: 512, h: 160, size: 100 }) })); sg.position.set(0, 2.4, .5); dog.add(sg); dog.userData.sign = sg; }
// décor : coucher de soleil rose, palmiers, flamants roses
function palm(x, z, h = 9, lean = .15) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); let y = 0; for (let i = 0; i < 7; i++) { const s = box(.75 - i * .04, h / 7 + .05, .75 - i * .04, mat(i % 2 ? '#9a7a4a' : '#8a6a3a'), .1); s.position.set(i * lean * .4, y + h / 14, 0); g.add(s); y += h / 7; }
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; const l = box(3.6, .12, .9, mat(i % 2 ? '#3fae5a' : '#2f9a4a'), .05); l.position.set(7 * lean * .4 + Math.cos(a) * 1.6, y - .3, Math.sin(a) * 1.6); l.rotation.set(0, -a, -.45); g.add(l); } return g; }
for (let x = -76; x <= 56; x += 16) { palm(x + 8, -7.4); if (Math.abs(x - 18.4) > 6) palm(x, 7.4, 9.5, -.1); }
for (const [x, z] of [[-20, -18], [20, -18], [-22, -40], [22, -40], [-12, -50], [12, -50]]) palm(x, z, 11);
function flamingo(x, z, ry) { const g = new THREE.Group(); g.position.set(x, .2, z); g.rotation.y = ry; scene.add(g); const P = mat('#ff7ab8'); const b = box(1.2, .7, .6, P, .25); b.position.y = 2.2; g.add(b);
  const n = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(.5, 2.4, 0), V(.9, 3.2, 0), V(.6, 3.8, 0), V(.9, 4.1, 0)]), 12, .1, 6), P); g.add(n); const h = box(.35, .3, .3, P, .1); h.position.set(.95, 4.15, 0); g.add(h);
  const bk = box(.35, .12, .14, mat('#1c1c22')); bk.position.set(1.25, 4.05, 0); g.add(bk); for (const zz of [-.12, .12]) { const l = box(.06, 1.9, .06, mat('#ff9ac8')); l.position.set(0, .95, zz); g.add(l); } return g; }
const FLAM = [flamingo(-6, -20, .4), flamingo(-4.5, -21.5, -2.4), flamingo(6, -21, 2.8), flamingo(-8, 6.4, 1.2)];
// magasin de jeux (façade au sud), panneau de date, file d'attente
const SH = houses.find(h => h.position.z > 0 && Math.abs(h.position.x - 18.4) < 1.2);
const NEON = mat('#ff4dc8', { emissive: new THREE.Color('#ff4dc8'), emissiveIntensity: 1.4 });
{ const sg = box(7.4, 1.6, .2, new THREE.MeshStandardMaterial({ map: textTex(['JEUX VIDÉO'], { w: 1024, h: 220, size: 150, bg: '#1c1430', fg: '#ff7ad8', border: '#5ad0ff' }), emissive: new THREE.Color('#ffffff'), emissiveIntensity: .3 })); sg.position.set(SH.position.x, 6.3, 8.32); sg.rotation.y = Math.PI; scene.add(sg);
  for (const x of [-3.8, 3.8]) { const n = box(.15, 5, .15, NEON); n.position.set(SH.position.x + x, 3.1, 8.3); scene.add(n); } }
const DATES = ['2025', '2026', '2027', '2028'].map((y, i) => canvasTex(512, 300, c => { c.fillStyle = '#1c1430'; c.fillRect(0, 0, 512, 300); c.strokeStyle = '#5ad0ff'; c.lineWidth = 14; c.strokeRect(7, 7, 498, 286); c.fillStyle = '#ffffff'; c.font = "900 64px 'Inter Display'"; c.textAlign = 'center'; c.fillText('SORTIE', 256, 92);
  c.fillStyle = '#ffd23f'; c.font = "900 130px 'Inter Display'"; c.fillText(y, 256, 230); }));
const dateSign = box(3.2, 1.9, .12, new THREE.MeshStandardMaterial({ map: DATES[0], emissive: new THREE.Color('#ffffff'), emissiveMap: DATES[0], emissiveIntensity: .25 })); dateSign.position.set(SH.position.x + 2.4, 2.4, 8.3); dateSign.rotation.y = Math.PI; scene.add(dateSign);
const consoleSign = box(4.4, 1.4, .12, new THREE.MeshStandardMaterial({ map: textTex(['DISPONIBLE SUR', '1 SEULE CONSOLE'], { w: 1024, h: 326, size: 110, bg: '#ffd23f', fg: '#1c1c22', border: '#1c1c22' }) })); consoleSign.position.set(SH.position.x + 2.4, 2.4, 8.26); consoleSign.rotation.y = Math.PI; scene.add(consoleSign);
const QX = (i) => SH.position.x - 2.6 - i * 2.3;
const chairs = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const s = box(1.3, .15, 1.2, mat('#3a7ae8')); s.position.y = 1.05; g.add(s); const b = box(1.3, 1.3, .12, mat('#3a7ae8')); b.position.set(0, 1.7, -.6); g.add(b); for (const x of [-.55, .55]) { const l = box(.08, 1, .08, mat('#888')); l.position.set(x, .5, 0); g.add(l); } g.position.set(QX(i), .3, 5.9); g.rotation.y = -Math.PI / 2; scene.add(g); chairs.push(g); }
{ const t = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.6, 4), mat('#ffa020')); t.position.set(QX(6) - 1.2, 1.6, 6.2); t.rotation.y = .78; scene.add(t); }
// stand du maire : crème anti-rides
const STD = V(QX(3), .3, 2.2); const standG = new THREE.Group(); scene.add(standG); { const scene = standG; const tb = box(3.4, 1.1, 1.4, mat('#a8743f'), .06); tb.position.set(STD.x, .85, STD.z); scene.add(tb); for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .45, 12), mat('#ffffff')); j.position.set(STD.x - 1.1 + i * .55, 1.65, STD.z); scene.add(j); const l = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .12, 12), mat('#ff7ab8')); l.position.set(STD.x - 1.1 + i * .55, 1.93, STD.z); scene.add(l); }
  const sg = box(3.6, 1.4, .1, new THREE.MeshStandardMaterial({ map: textTex(['CRÈME ANTI-RIDES', '99 €'], { w: 1024, h: 400, size: 120, bg: '#ffffff', fg: '#e8333a', border: '#ff7ab8' }) })); sg.position.set(STD.x, 4.6, STD.z - 2.4); scene.add(sg); for (const x of [-1.6, 1.6]) { const p = box(.12, 4.4, .12, mat('#ddd')); p.position.set(STD.x + x, 2.4, STD.z - 2.45); scene.add(p); } }
// écran géant (bande-annonce) + routeur
const trailerTex = canvasTex(1024, 576, c => { const g2 = c.createLinearGradient(0, 0, 0, 576); g2.addColorStop(0, '#5a2a9a'); g2.addColorStop(.55, '#ff6a9a'); g2.addColorStop(1, '#ffb060'); c.fillStyle = g2; c.fillRect(0, 0, 1024, 576); c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(512, 360, 110, 0, 7); c.fill();
  c.fillStyle = '#2a1a4a'; c.fillRect(0, 430, 1024, 146); for (const [x, h] of [[120, 300], [260, 240], [780, 280], [920, 320]]) { c.fillRect(x - 10, 430 - h, 20, h); for (let i = 0; i < 6; i++) { c.save(); c.translate(x, 430 - h); c.rotate(i * 1.05); c.fillRect(0, -8, 90, 16); c.restore(); } }
  c.fillStyle = '#ff7ab8'; for (const x of [400, 640]) { c.fillRect(x, 470, 40, 26); c.fillRect(x + 30, 420, 8, 50); c.fillRect(x + 30, 410, 22, 14); } });
const screen = box(14, 7.9, .3, new THREE.MeshBasicMaterial({ map: trailerTex, toneMapped: false })); screen.position.set(0, STAGE.y + 5.2, -48.4); scene.add(screen); { const fr = box(14.6, 8.5, .2, mat('#1c1c22')); fr.position.set(0, STAGE.y + 5.2, -48.6); scene.add(fr); }
const ROUTER = V(9, 0, -26); const router = new THREE.Group(); router.position.copy(ROUTER); scene.add(router); { const p = box(.25, 4, .25, mat('#2a2e3a')); p.position.y = 2; router.add(p); const b = box(1.8, .5, 1.1, mat('#1c1c22'), .1); b.position.y = 4.2; router.add(b);
  for (const x of [-.6, .6]) { const a = box(.08, 1, .08, mat('#1c1c22')); a.position.set(x, 4.9, -.3); router.add(a); } const sg = box(1.6, .5, .05, new THREE.MeshStandardMaterial({ map: textTex(['WIFI'], { w: 256, h: 80, size: 60, bg: '#5ad0ff', fg: '#1c1c22', border: '#1c1c22' }) })); sg.position.set(0, 3.5, .15); router.add(sg); }
// bureau du maire : lettres, agenda
const OFF = V(400, 0, 0); { const r = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 16), mat('#e8dcc4', { side: THREE.BackSide })); r.position.set(OFF.x, 4, OFF.z); scene.add(r); BLOCKERS.push(r); const f = box(16, .2, 16, mat('#7a4a2a')); f.position.set(OFF.x, .1, OFF.z); scene.add(f);
  const l = new THREE.PointLight(0xffe0b0, 40, 24, 1.4); l.position.set(OFF.x, 7, OFF.z + 3); scene.add(l); const d = box(5, 1.6, 2.4, mat('#6a3a1a'), .06); d.position.set(OFF.x, .9, OFF.z - 1); scene.add(d);
  for (let i = 0; i < 6; i++) { const lt = box(1, .04, .7, mat('#ffffff')); lt.position.set(OFF.x - 1.6 + (i % 3) * .3, 1.73 + i * .04, OFF.z - 1 + (i % 2) * .1); scene.add(lt); }
  const win_ = box(3, 2.2, .1, mat('#ffb080', { emissive: new THREE.Color('#ff8a6a'), emissiveIntensity: .6 })); win_.position.set(OFF.x, 4.6, OFF.z - 7.9); scene.add(win_); }
const AG = [false, true].map(st => canvasTex(512, 360, c => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, 512, 360); c.fillStyle = '#c8b8a0'; c.fillRect(250, 0, 12, 360); c.fillStyle = '#1c1c22'; c.font = "900 44px 'Inter Display'"; c.textAlign = 'center'; c.fillText('AGENDA', 128, 70); c.font = "800 34px 'Inter Display'"; c.fillText('ÉLECTIONS', 384, 160);
  c.fillStyle = '#c8ccd4'; for (let i = 0; i < 5; i++) c.fillRect(40, 110 + i * 40, 170, 10); if (st) { c.save(); c.translate(384, 230); c.rotate(-.2); c.strokeStyle = '#d4202a'; c.lineWidth = 8; c.strokeRect(-120, -40, 240, 80); c.fillStyle = '#d4202a'; c.font = "900 42px 'Inter Display'"; c.fillText('REPOUSSÉ', 0, 15); c.restore(); } }));
const agenda = box(1.8, .06, 1.3, new THREE.MeshStandardMaterial({ map: AG[0], color: new THREE.Color('#cfc6b4') })); agenda.position.set(OFF.x + 1.2, 1.74, OFF.z - .8); scene.add(agenda);
// confettis
const CONF = 900, confGeo = new THREE.BufferGeometry(); confGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3)); confGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CONF * 3), 3));
const confMat = new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }); const confetti = new THREE.Points(confGeo, confMat); confetti.frustumCulled = false; scene.add(confetti);
const seeds = []; { const r = rng(9); const cols = ['#ff7ad8', '#5ad0ff', '#ffd23f', '#ffffff', '#8aff6a']; const ca = confGeo.attributes.color.array; for (let i = 0; i < CONF; i++) { seeds.push([r(), r(), r(), r()]); const c = new THREE.Color(cols[i % 5]); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; } }
function rain(t, t0, ctr, R, H0) { const k = t - t0; if (k < 0) return; const p = confGeo.attributes.position.array; seeds.forEach((s, i) => { const a = s[0] * 6.283, rr = s[1] * R; p[i * 3] = ctr.x + Math.cos(a) * rr + Math.sin(k * 2 + i) * .4; p[i * 3 + 1] = ctr.y + ((H0 * s[2] - k * (2 + s[3] * 2)) % H0 + H0) % H0; p[i * 3 + 2] = ctr.z + Math.sin(a) * rr; });
  confGeo.attributes.position.needsUpdate = true; confetti.visible = true; }
const PUFFS = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const m = mat('#ffffff', { transparent: true, roughness: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .25 }); const r = rng(i + 3);
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), m); const a = k * .7; b.userData.dir = V(Math.cos(a) * (.6 + r() * .4), .2 + r() * .9, Math.sin(a) * (.6 + r() * .4)); g.add(b); } g.userData.m = m; g.visible = false; scene.add(g); PUFFS.push(g); }
let puffN = 0; function puff(t, t0, pos, s = 1, col = '#ffffff') { const k = (t - t0) / .7; if (k < 0 || k > 1 || puffN >= PUFFS.length) return; const g = PUFFS[puffN++]; g.visible = true; g.position.copy(pos); g.scale.setScalar(s); g.userData.m.color.set(col);
  g.children.forEach(b => { b.position.copy(b.userData.dir).multiplyScalar(easeOut(k) * 1.6); b.scale.setScalar(.5 + easeOut(k) * 1.2); }); g.userData.m.opacity = 1 - k * k; }

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { douze: 11, repousse: 22, vieillit: 26, r1: 29, barbe: 36, r2: 37, blancs: 45, r3: 46, retraite: 53, magasin: 56, file: 63, premier: 65, petits: 78, bande: 86, soleil: 97, palmiers: 100, flamants: 102, internet: 104, saute: 106, trois: 107,
    toi: 111, cheveux: 121, blanc: 127, tom: 128, naissance: 140, douze2: 142, toujours: 144, mais: 148, maire: 157, cremes: 160, etait: 166, envoyait: 171, tampon: 177, alors: 179, bureau: 186, pris: 188, tamponne: 193, elections: 196, vieilli: 201, barbe2: 208, pieds: 211, dedans: 217,
    lendemain: 220, sorti: 224, jeunesse: 231, enfin: 232, console: 239, autres: 241, prochaine: 245 };
  for (const k in N) e[k] = w(N[k]); return e;
}
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); if (c.userData.hairMats) age(c, 0, 0); }); puffN = 0; PUFFS.forEach(p => p.visible = false); confetti.visible = false; phones.forEach(p => p.visible = false); [stamp, stampT, cake].forEach(o => o.visible = false); whiteHair.visible = false;
  const S = (a, b) => t >= a && t < b;
  // coucher de soleil permanent
  skyMat.uniforms.top.value.set('#4a2a8a'); skyMat.uniforms.mid.value.set('#ff6a9a'); skyMat.uniforms.bot.value.set('#ffc080'); scene.fog.color.set('#ffb0a0'); sun.color.set('#ffb88a'); sun.intensity = 2.3; hemi.color.set('#ffc8e0'); hemi.groundColor.set('#8a6a7a'); hemi.intensity = 1.25;
  rim.color.set('#ff9ad8'); rim.intensity = 2; WIN.emissiveIntensity = .5; NEON.emissiveIntensity = 1.2 + Math.sin(t * 6) * .3;
  const nRep = (t > E.r1) + (t > E.r2) + (t > E.r3) + (t > E.repousse - .1 && t < E.r1 - .3 ? 0 : 0); dateSign.material.map = dateSign.material.emissiveMap = DATES[Math.min(3, nRep + (t > E.mais ? 1 : 0))]; consoleSign.visible = t > E.enfin - .2; dateSign.visible = !consoleSign.visible;
  agenda.material.map = t > E.tamponne ? AG[1] : AG[0]; dog.visible = false; router.visible = t < E.internet || t > E.toi;
  const young = t > E.sorti - .1; standG.visible = t > E.mais - .3 && t < E.etait;
  // A. la règle, tout le monde vieillit
  if (S(0, E.r1 - .05)) { VILL.slice(0, 6).forEach((v, i) => { const x = SH.position.x - 4 - i * 3, z = i % 2 ? 3.4 : 4.2; place(v, x, .2, z, Math.PI - .3 + (i % 3) * .3); const a = seg(t, E.vieillit - .2, E.vieillit + .6);
    setFace(v, a > .5 ? 'shock' : 'smile'); pose(v, a > .5 ? 'oldwalk' : 'idle', t + i); phones[i].visible = a < .5; age(v, a * .8, a * .5); }); puff(t, E.vieillit - .2, V(SH.position.x - 11, 2, 5.5), 2.5); }
  // B. papa, maman, le chien
  if (S(E.r1 - .05, E.magasin - .05)) { const x0 = -38; place(dad, x0 - 1.6, .2, -6, .3); const bd = ease(seg(t, E.r1 + .2, E.barbe)); age(dad, 0, bd * 1.3, '#2a1a10'); setFace(dad, bd > .5 ? 'shock' : 'smile'); pose(dad, 'idle', t); puff(t, E.r1 + .1, V(x0 - 1.6, 3.4, -5.6), .7);
    if (t > E.r2 - .2) { place(mom, x0 + 1.6, .2, -6, -.3); const w2 = ease(seg(t, E.r2 + .2, E.blancs)); age(mom, w2); setFace(mom, w2 > .5 ? 'shock' : 'smile'); pose(mom, 'idle', t); puff(t, E.r2 + .1, V(x0 + 1.6, 3.6, -5.6), .7); }
    if (t > E.r3 - .2) { dog.visible = true; dog.position.set(x0, .2, -5); dog.rotation.y = -Math.PI / 2 + .4; const o = t > E.r3 + .5; dog.userData.old.visible = o; dog.userData.cane.visible = o; dog.userData.sign.visible = o; dog.children[0].material.color.set(o ? '#b8a890' : '#c89a5a'); puff(t, E.r3 + .3, V(x0, 1.6, -5), .9); } }
  // C. la file d'attente (et le stand du maire plus tard)
  const queue = S(E.magasin - .05, E.bande - .05) || S(E.mais - .05, E.alors - .05) || S(E.lendemain - .05, END + 1);
  if (queue) { place(papy, QX(0), 1.35, 5.9, -Math.PI / 2); age(papy, young ? 0 : 1, young ? 0 : 3.2); setFace(papy, young ? 'laugh' : 'sleep'); pose(papy, young ? 'jump' : 'sitDoze', t); if (!young) papy.userData.root.position.y = -1.45 * .5;
    kids.forEach((k, i) => { place(k, QX(1) + i * .9 - .9, .2, 4.6, -Math.PI / 2 + .3); setFace(k, young ? 'laugh' : 'smile'); pose(k, young ? 'jump' : 'idle', t + i); });
    VILL.forEach((v, i) => { if (i < 1) return; const x = QX(i + 1), z = 5.9; if (young) { const k = seg(t, E.sorti + i * .1, E.sorti + 1.5 + i * .1); place(v, lerp(x, SH.position.x, k), .2, lerp(z, 8.6, k), -Math.PI / 2 + k * .8); if (k >= 1) v.visible = false; setFace(v, 'laugh'); pose(v, 'run', t + i); }
      else { place(v, x, 1.35, z, -Math.PI / 2); age(v, .5, .4 + (i % 3) * .3); setFace(v, i % 2 ? 'sleep' : 'tired'); pose(v, i % 2 ? 'sitDoze' : 'sit', t + i); v.userData.root.position.y = -1.45 * .5; } });
    if (t > E.mais - .05 && t < E.alors) { place(mayor, STD.x, .3, STD.z - 1.4, 0); setFace(mayor, 'smug'); pose(mayor, 'holdOut', t); }
    if (t > E.lendemain) { rain(t, E.sorti - .1, V(SH.position.x - 6, 0, 5), 12, 14); place(tom, QX(2), .2, 3.2, Math.PI - .3); setFace(tom, t > E.enfin - .1 ? 'deadpan' : 'laugh'); pose(tom, t > E.enfin - .1 ? 'idle' : 'jump', t); if (t > E.autres - .1) { setFace(tom, 'shh'); pose(tom, 'shhPose', t); } } }
  // D. la bande-annonce, internet saute
  if (S(E.bande - .05, E.toi - .05)) { VILL.forEach((v, i) => { const x = -10 + (i % 5) * 5, z = -30 - Math.floor(i / 5) * 4; place(v, x, .2, z, Math.PI); setFace(v, t > E.internet ? 'shock' : 'laugh'); pose(v, t > E.internet ? 'idle' : 'holdOut', t + i); phones[i].visible = t < E.internet; });
    puff(t, E.internet - .05, ROUTER.clone().add(V(0, 4.4, 0)), 1.5, '#5a5a5a'); }
  // E. « et toi… un cheveu blanc ? » ; F. Tom, douze ans
  if (S(E.toi - .05, E.mais - .05)) { place(tom, -20, .2, 5.4, Math.PI); const cakeOn = t > E.naissance - .3; setFace(tom, t > E.douze2 - .2 ? 'deadpan' : t < E.tom ? 'smug' : 'smile'); pose(tom, cakeOn ? 'holdOut' : t > E.cheveux - .2 && t < E.tom ? 'pointUp' : t < E.tom ? 'pointCam' : 'idle', t);
    cake.visible = cakeOn; whiteHair.visible = t > E.blanc - .3 && t < E.tom; }
  // G. le maire et le tampon
  if (S(E.etait - .05, E.alors - .05)) { place(mayor, OFF.x, .2, OFF.z + 1.2, Math.PI); setFace(mayor, 'smug'); pose(mayor, 'holdOut', t); stamp.visible = true; mayor.userData.arms[1].rotation.x = -1.3 + Math.max(0, Math.sin(t * 7)) * .6; }
  // H. Tom se glisse, tamponne l'agenda ; le maire vieillit
  if (S(E.alors - .05, E.lendemain - .05)) { const k = seg(t, E.alors, E.pris - .3); place(tom, lerp(OFF.x - 6, OFF.x + 3, k), .2, lerp(OFF.z + 4, OFF.z - .7, k), k < 1 ? 1.9 : -Math.PI / 2); setFace(tom, t > E.tamponne ? 'laugh' : 'smug'); pose(tom, k < 1 ? 'oldwalk' : 'holdOut', t); stampT.visible = t > E.pris - .3;
    if (k >= 1) tom.userData.arms[1].rotation.x = -1.3 + (t > E.tamponne - .2 && t < E.tamponne + .3 ? .6 : 0);
    const mz = OFF.z + 3.6; place(mayor, OFF.x - 1.8, .2, mz, Math.PI - .5); const a = ease(seg(t, E.vieilli - .1, E.barbe2 + .3)); age(mayor, a, a * 4.6); const trip = t > E.dedans - .4;
    setFace(mayor, t > E.vieilli - .2 ? (trip ? 'shock' : 'worried') : t > E.elections - .2 ? 'shock' : 'sleep'); pose(mayor, trip ? 'lie' : t > E.elections - .2 ? 'idle' : 'doze', t); if (t > E.pieds - .2 && !trip) { pose(mayor, 'walk', t); } puff(t, E.vieilli - .15, V(OFF.x - 1.8, 4, mz), 1.6); }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42], feet: [3.4, -.6, 36], high: [9, 9, 42], grp: [13, 1.5, 40], screen: [24, 0, 44], top: [1.3, 3.2, 38] };
const SUBJ = { tom: () => tom, mayor: () => mayor, dad: () => dad, mom: () => mom, papy: () => papy, k0: () => kids[0], v1: () => VILL[1], v2: () => VILL[2], v3: () => VILL[3], v5: () => VILL[5] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  const sx = SH.position.x;
  A(0, `@${sx},4,7`, 'ws', 180, null, 'up'); A(5, `@${sx - 8},2.4,5.5,3.14`, 'grp', 0); A(11, 'v2', 'mcu', 0); A(14, `@${sx + 2.4},2.4,8.3,3.14`, 'ms', 0, null, 'static'); A(23, `@${sx - 10},2.2,5.5,3.14`, 'grp', 10); A(26, 'v1', 'mcu', 10);
  A(29, 'dad', 'mcu', 10); A(33, 'dad', 'cu', 0); A(37, 'mom', 'mcu', -10); A(42, 'mom', 'cu', 0); A(46, '@-38,1.6,-5', 'fs', 0); A(50, '@-38,1.6,-5', 'ms', 20, null, 'static');
  A(54, `@${sx},4,7`, 'ws', 160, null, 'pan'); A(58, `@${sx - 6},2,5.8,3.14`, 'grp', 20); A(63, `@${sx - 10},2,5.8,3.14`, 'grp', -15, null, 'pan'); A(65, 'papy', 'ms', 60, 'body'); A(71, 'papy', 'ms', 60, 'body'); A(77, `@${QX(1)},1.4,4.6,-1.27`, 'fs', 0); A(80, `@${sx - 4},1.6,5.2,3.14`, 'grp', 0);
  A(84, '@0,6,-34', 'ws', 0); A(89, '@0,2,-31,3.14', 'grp', 0); A(93, 'v2', 'mcu', 0); A(97, `@0,${STAGE.y + 5.2},-48.4`, 'screen', 0, null, 'static'); A(104, `@${ROUTER.x},4.2,${ROUTER.z}`, 'ms', 20, null, 'static'); A(106, 'v3', 'mcu', 0); A(107, '@0,3,-31,3.14', 'grp', 20);
  A(111, 'tom', 'mcu', 0, null, 'static'); A(115, 'tom', 'cu', 0); A(118, 'tom', 'mcu', 10, null, 'static'); A(125, 'tom', 'cu', 0, null, 'static');
  A(128, 'tom', 'mcu', 15); A(134, 'tom', 'ms', -10, 'body'); A(141, 'tom', 'cu', 0, null, 'static');
  A(148, `@${sx - 6},2,5.8,3.14`, 'grp', 15); A(153, `@${STD.x},2.4,${STD.z}`, 'ms', 0); A(157, 'mayor', 'mcu', 25); A(162, `@${STD.x},3,${STD.z}`, 'fs', 20);
  A(166, 'mayor', 'mcu', 0); A(171, `@${OFF.x},2.5,${OFF.z + 1.2}`, 'grp', 0); A(174, 'mayor', 'cu', 10);
  A(179, `@${OFF.x - 1},2.2,${OFF.z + 1}`, 'grp', 20); A(183, 'tom', 'mcu', 60); A(187, 'tom', 'mcu', 0); A(191, `@${OFF.x + 1.2},1.75,${OFF.z - .8}`, 'top', 0, null, 'static'); A(196, `@${OFF.x + 1.2},1.75,${OFF.z - .8}`, 'top', 0, null, 'static');
  A(198, 'mayor', 'mcu', 10); A(203, 'mayor', 'ms', 0, 'body'); A(207, 'mayor', 'fs', 15, 'body', 'up'); A(212, `@${OFF.x - 1.8},1,${OFF.z + 4}`, 'fs', 30);
  A(218, `@${sx},4,7`, 'ws', 180, null, 'up'); A(221, `@${sx - 6},2,5.8,3.14`, 'grp', 0); A(225, 'papy', 'ms', 40, 'body'); A(229, `@${sx - 4},2,5.2,3.14`, 'grp', 20);
  A(232, 'tom', 'mcu', 0); A(235, `@${sx + 2.4},2.4,8.3,3.14`, 'ms', 20, null, 'static'); A(240, 'tom', 'cu', -30, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
function overlays(t) {
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > -100 && q[0] < W + 100) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b || !ch.visible) return; const q = project(ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.1 * sizeOf(ch), 0))); if (q[2] < 1 && q[0] > 0 && q[0] < W && q[1] > 0 && q[1] < H) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1] - 150, 280, 1050), win(t, a, b, .12), o); };
  pop('+1 AN', VILL[1], E.vieillit - .1, E.r1 - .1, { size: 110, fill: '#ff7ad8' }); pop('+1 AN', dad, E.r1 + .1, E.r2 - .3, { size: 100, fill: '#ff7ad8' }); pop('+1 AN', mom, E.r2 + .1, E.r3 - .3, { size: 100, fill: '#ff7ad8' });
  popAt('+1 AN', V(-38, 3.4, -5), E.r3 + .2, E.magasin - .1, { size: 100, fill: '#ff7ad8' }); pop('RONF…', papy, E.premier, E.bande - .2, { size: 80, fill: '#bfe8ff' });
  popAt('BZZT… PAF !', ROUTER.clone().add(V(0, 6, 0)), E.internet - .05, E.trois + .6, { size: 110, fill: '#5ad0ff' }); popAt('PAF !', V(OFF.x + 1.2, 2.6, OFF.z - .8), E.tamponne - .1, E.tamponne + .8, { size: 130, fill: '#ff4d4d' });
  pop('+10 ANS', mayor, E.vieilli - .1, E.barbe2, { size: 120, fill: '#ff7ad8' }); pop('BOUM', mayor, E.dedans - .2, E.lendemain - .1, { size: 110 }); pop('YOUPI !', papy, E.sorti, E.jeunesse + .4, { size: 110 });
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
