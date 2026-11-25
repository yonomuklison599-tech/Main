// « Dans cette ville, si tu bâilles, tout le monde autour de toi s'endort » — rendu déterministe : window.render(t)
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
  if (kind === 'reach') { arms[1].rotation.set(-2.9, 0, .2); arms[0].rotation.z = -1; }
}
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y <= .35 ? groundY(x, z) : y, z); ch.rotation.y = ry; ch.visible = true; }
const headY = ch => (4.02 + .7) * ch.userData.root.scale.y;   // hauteur du centre de la tête
// ---------------------------------------------------------------- personnages
const tom = makeChar({ shirt: '#3fa66b', pants: '#2f4f8f', hair: '#6a3a1a', scale: .86, hairStyle: 'spiky', extras: (root) => {
  for (let i = 0; i < 3; i++) { const st = box(2.06, .22, 1.06, mat('#ffffff')); st.position.y = 2.4 + i * .5; root.add(st); } } });
tom.userData.legs.forEach(h => { const sn = box(1.06, .34, 1.3, mat('#e8433a'), .1); sn.position.set(0, -1.86, .14); h.add(sn); });
const mayor = makeChar({ shirt: '#23304a', pants: '#23304a', hair: '#6a4a2a', skin: '#e8b88f', scale: 1.15, hairStyle: 'short', extras: (root, head) => {
  const mu = box(.8, .1, .08, mat('#3a2a1a')); mu.position.set(0, .585, .74); head.add(mu);
  const sg = new THREE.Group(); sg.position.set(0, 3, .56); sg.rotation.z = .75; root.add(sg); ['#2b4ad8', '#ffffff', '#e8333a'].forEach((c, i) => { const b = box(.2, 2.9, .06, mat(c)); b.position.x = (i - 1) * .2; sg.add(b); });
  const belly = box(2.1, 1.3, .5, mat('#23304a'), .25); belly.position.set(0, 2.7, .4); root.add(belly); } });
const prof = makeChar({ shirt: '#e8e0d0', pants: '#5a4a3a', hair: '#8a8a8a', hairStyle: 'short', extras: (root, head) => {
  const tie = box(.32, 1.4, .1, mat('#2b4ad8')); tie.position.set(0, 3.2, .52); root.add(tie); const vest = box(2.1, 1.4, 1.05, mat('#8a5a3a'), .15); vest.position.y = 2.75; root.add(vest);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 6, 16), mat('#1c1c22')); f.position.set(s * .32, .83, .75); head.add(f); } } });
const chauffeur = makeChar({ shirt: '#4a7ae8', pants: '#2a3a5a', hair: '#3a2010', hairStyle: 'short', extras: (root, head) => {
  const cap = box(1.6, .45, 1.6, mat('#2a3a6a'), .12); cap.position.y = 1.62; head.add(cap); const vis = box(1.2, .1, .6, mat('#1c1c22')); vis.position.set(0, 1.45, .95); head.add(vis); } });
const bride = makeChar({ shirt: '#ffffff', pants: '#ffffff', hair: '#d8a040', hairStyle: 'bun', extras: (root, head) => {
  const sk = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.6, 16), mat('#ffffff')); sk.position.y = 1.2; root.add(sk);
  const veil = box(1.9, 2.2, .1, mat('#ffffff', { transparent: true, opacity: .55 })); veil.position.set(0, .6, -.85); head.add(veil); } });
const groom = makeChar({ shirt: '#1c1c22', pants: '#1c1c22', hair: '#2a1a10', hairStyle: 'short', extras: (root) => {
  const sh = box(.7, 1.6, .1, mat('#ffffff')); sh.position.set(0, 3.1, .51); root.add(sh); const bt = box(.5, .22, .14, mat('#e8333a')); bt.position.set(0, 3.8, .56); root.add(bt); } });
const mom = makeChar({ shirt: '#7a5fb8', pants: '#3a3a52', hair: '#3a2416', hairStyle: 'long' });
const dad = makeChar({ shirt: '#e8743b', pants: '#4a4a5a', hair: '#2a1a10', hairStyle: 'short' });
const mamie = makeChar({ shirt: '#b04a6a', pants: '#5a4a6a', hair: '#e8e8f0', hairStyle: 'bun' });
const VILL = [['#d95b5b', '#3a3a3a', '#6a4a2a', 'short'], ['#5bb0d9', '#2a2a5a', '#2a1a10', 'long'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'short'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'spiky'],
  ['#c07bd0', '#2a2a2a', '#d0b070', 'long'], ['#f0a050', '#3a2a5a', '#3a2010', 'short'], ['#5fd0c0', '#2a3a4a', '#6a3a1a', 'bun'], ['#ff7aa0', '#4a2a3a', '#2a1a10', 'pigtails'],
  ['#9a8af0', '#3a3a3a', '#5a3a1a', 'short'], ['#f2d04a', '#2f4f8f', '#3a2010', 'long'], ['#e85a8a', '#2a2a3a', '#d8a040', 'long'], ['#4a7ae8', '#3a3a3a', '#8a5a2a', 'spiky']].map(([s, p, h, st]) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: st }));
const hold = (ch, obj, y = -2.1, z = .45) => { ch.userData.arms[1].add(obj); obj.visible = false; obj.position.set(0, y, z); return obj; };
const pepper = hold(tom, (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, .8, 14), mat('#1c1c22', { roughness: .4 })); g.add(b); const tp = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8, 0, 6.3, 0, 1.6), mat('#c0c4cc', { metalness: .7 })); tp.position.y = .4; g.add(tp);
  const lb = box(.5, .3, .02, new THREE.MeshStandardMaterial({ map: textTex(['POIVRE'], { w: 256, h: 128, size: 60, bg: '#ffd23f', fg: '#1c1c22', border: '#1c1c22' }) })); lb.position.set(0, 0, .31); g.add(lb); g.rotation.x = -1.4; return g; })(), -2.2, .3);
const bowl = hold(tom, (() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .32, .4, 14), mat('#ffffff'))); const c = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .05, 14), mat('#f0c060')); c.position.y = .15; g.add(c); g.rotation.x = 1.5; return g; })(), -2.15, .55);
const ballot = hold(mayor, box(.6, .8, .05, mat('#ffffff')), -2.1, .5);
// vagues de bâillement / d'éternuement
const WAVES = []; for (let i = 0; i < 6; i++) { const m = new THREE.MeshBasicMaterial({ color: '#c8a8ff', transparent: true, opacity: .6, depthWrite: false, side: THREE.DoubleSide }); const r = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 8, 64), m); r.rotation.x = Math.PI / 2; r.visible = false; scene.add(r); WAVES.push(r); }
let waveN = 0;
function wave(t, t0, pos, R, col = '#c8a8ff', dur = 1.2) { const k = (t - t0) / dur; if (k < 0 || k > 1 || waveN >= WAVES.length) return; for (let j = 0; j < 2; j++) { const kk = k - j * .18; if (kk < 0 || waveN >= WAVES.length) continue;
  const r = WAVES[waveN++]; r.visible = true; r.position.copy(pos); r.scale.setScalar(.3 + easeOut(kk) * R); r.material.color.set(col); r.material.opacity = .7 * (1 - kk); } }
// toile d'araignée (le temps passe)
const webTex = canvasTex(256, 256, c => { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a / 2) * 256, Math.sin(a / 2) * 256); c.stroke(); }
  for (let r = 30; r < 256; r += 34) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI / 2); c.stroke(); } });
const webMat = new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const WEBS = []; function web(x, y, z, s, ry = 0, rz = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), webMat); m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.visible = false; scene.add(m); WEBS.push(m); return m; }
// banderole élections, haut-parleurs, bouton, urne, tableau
{ const b = box(13, 2.6, .2, new THREE.MeshStandardMaterial({ map: textTex(['ÉLECTIONS'], { w: 1024, h: 205, bg: '#2b4a8a', fg: '#ffffff', border: '#ffd23f', size: 140 }) })); b.position.set(0, 7.2, -47.8); scene.add(b);
  for (const x of [-6.3, 6.3]) { const p = box(.3, 7.5, .3, mat('#ddd')); p.position.set(x, 4.5, -47.8); scene.add(p); } }
const SPK = []; for (const [x, z, ry] of [[-14, -20, .6], [14, -20, -.6], [-14, -40, 2.4], [14, -40, -2.4], [-6.3, -47.6, 0], [6.3, -47.6, 0]]) { const y0 = z < -46 ? 8.8 : 6.2; if (z > -46) { const p = box(.3, y0, .3, mat('#2a2e3a')); p.position.set(x, y0 / 2, z); scene.add(p); }
  const g = new THREE.Group(); g.position.set(x, y0 + .3, z); g.rotation.y = ry; scene.add(g); const hn = new THREE.Mesh(new THREE.CylinderGeometry(.9, .25, 1.4, 16, 1, true), mat('#d8d8e0', { side: THREE.DoubleSide, metalness: .3 })); hn.rotation.x = Math.PI / 2; hn.position.z = .6; g.add(hn); g.add(box(.7, .7, .7, mat('#2a2e3a'), .1)); SPK.push(g); }
const BTN = V(2.4, STAGE.y, -43.6); { const p = box(.8, 2, .8, mat('#c8ccd4'), .08); p.position.set(BTN.x, BTN.y + 1, BTN.z); scene.add(p); const b = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .2, 16), mat('#e8333a', { emissive: new THREE.Color('#ff2020'), emissiveIntensity: .4 })); b.position.set(BTN.x, BTN.y + 2.1, BTN.z); scene.add(b); }
const URNE = V(-9, .2, -33); { const tb = box(3, 1.1, 1.6, mat('#a8743f'), .06); tb.position.set(URNE.x, .75, URNE.z); scene.add(tb); const u = box(1.3, 1.3, 1.3, mat('#dff0ff', { transparent: true, opacity: .45, roughness: .05 }), .05); u.position.set(URNE.x, 1.95, URNE.z); scene.add(u);
  const sl = box(.7, .05, .12, mat('#1c1c22')); sl.position.set(URNE.x, 2.62, URNE.z); scene.add(sl); const sg = box(2.6, 1, .1, new THREE.MeshStandardMaterial({ map: textTex(['VOTE'], { w: 512, h: 200, size: 140, bg: '#2b4a8a', fg: '#ffffff', border: '#ffd23f' }) })); sg.position.set(URNE.x, 3.4, URNE.z - .7); scene.add(sg);
  const p = box(.15, 3, .15, mat('#ddd')); p.position.set(URNE.x, 1.8, URNE.z - .75); scene.add(p); }
const ballots = []; for (let i = 0; i < 8; i++) { const b = box(.4, .03, .5, mat('#ffffff')); b.position.set(URNE.x - .35 + (i % 3) * .3, 1.42 + Math.floor(i / 3) * .05, URNE.z + (i % 2) * .2 - .1); b.rotation.y = i; b.visible = false; scene.add(b); ballots.push(b); }
const board = box(5, 3, .2, new THREE.MeshStandardMaterial({ map: textTex(['1 VOTE', 'MAIRE : 100 %'], { w: 1024, h: 614, size: 150, bg: '#1c1c22', fg: '#3aff7a', border: '#ffd23f' }) })); board.position.set(-15, 4.2, -36); board.rotation.y = .6; scene.add(board);
{ const p = box(.25, 3, .25, mat('#2a2e3a')); p.position.set(-15, 1.5, -36.1); scene.add(p); }
// bus + feu rouge
const BUS = V(-28, .1, -1.8); const bus = new THREE.Group(); bus.position.copy(BUS); scene.add(bus);
{ const Y = mat('#f2c14e'), G = mat('#bfe8ff', { transparent: true, opacity: .3, roughness: .05 }); const lo = box(10, 1.9, 3.6, Y, .25); lo.position.y = 1.35; bus.add(lo); const st = box(10.05, .3, 3.65, mat('#2b4ad8')); st.position.y = 2.1; bus.add(st);
  const rf = box(10, .45, 3.6, Y, .2); rf.position.y = 4.25; bus.add(rf); for (let x = -4.85; x <= 4.9; x += 2.4) for (const z of [-1.7, 1.7]) { const pl = box(.3, 1.8, .2, Y); pl.position.set(x, 3.15, z); bus.add(pl); }
  for (const z of [-1.75, 1.75]) { const gl = box(9.6, 1.7, .05, G); gl.position.set(0, 3.15, z); bus.add(gl); } const fw = box(.05, 1.7, 3.3, G); fw.position.set(4.95, 3.15, 0); bus.add(fw); const bw = box(.2, 1.8, 3.5, Y); bw.position.set(-4.9, 3.15, 0); bus.add(bw);
  for (const x of [-3.2, 3.2]) for (const z of [-1.8, 1.8]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .5, 18), mat('#1c1c22')); wh.rotation.x = Math.PI / 2; wh.position.set(x, .75, z); bus.add(wh); }
  for (const x of [-3, -.6, 1.8]) for (const z of [-1, 1]) { const se = box(.9, .8, 1, mat('#2b4ad8')); se.position.set(x, 2.3, z); bus.add(se); }
  const sg = box(2.2, .5, .05, new THREE.MeshStandardMaterial({ map: textTex(['LIGNE 12'], { w: 512, h: 120, size: 90, bg: '#1c1c22', fg: '#ffb020', border: '#1c1c22' }) })); sg.position.set(4.6, 4.75, 0); sg.rotation.y = Math.PI / 2; bus.add(sg); }
const TL = V(-20.5, .3, -4.6); const tlLamps = [];
{ const p = box(.3, 6.5, .3, mat('#2a2e3a')); p.position.set(TL.x, 3.25, TL.z); scene.add(p); const hd = box(.9, 2.6, .8, mat('#1c1c22'), .1); hd.position.set(TL.x, 6.6, TL.z); scene.add(hd);
  ['#ff3030', '#ffb020', '#30ff60'].forEach((c, i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), mat(c, { emissive: new THREE.Color(c), emissiveIntensity: 0 })); l.position.set(TL.x - .42, 7.4 - i * .8, TL.z); scene.add(l); tlLamps.push(l); }); }
// chat sur un muret
const WALL = V(8, .3, -7.9); { const wl = box(7, 1.6, .9, mat('#c8b898'), .08); wl.position.set(WALL.x, WALL.y + .8, WALL.z); scene.add(wl); }
const CATF = { smile: canvasTex(128, 128, c => { c.fillStyle = '#1a1a1a'; for (const x of [40, 88]) { c.beginPath(); c.ellipse(x, 56, 9, 14, 0, 0, 7); c.fill(); } c.fillStyle = '#ff8a9a'; c.beginPath(); c.moveTo(56, 74); c.lineTo(72, 74); c.lineTo(64, 84); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 4; c.beginPath(); c.arc(58, 88, 7, 0, Math.PI); c.arc(70, 88, 7, 0, Math.PI); c.stroke(); }),
  yawn: canvasTex(128, 128, c => { c.strokeStyle = '#1a1a1a'; c.lineWidth = 6; for (const x of [40, 88]) { c.beginPath(); c.arc(x, 50, 12, .1 * Math.PI, .9 * Math.PI); c.stroke(); } c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(64, 92, 20, 26, 0, 0, 7); c.fill(); c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(64, 106, 12, 8, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(48, 72); c.lineTo(54, 82); c.lineTo(58, 72); c.moveTo(70, 72); c.lineTo(74, 82); c.lineTo(80, 72); c.fill(); }) };
const cat = new THREE.Group(); scene.add(cat); const catFace = new THREE.MeshBasicMaterial({ map: CATF.smile, transparent: true });
{ const O = mat('#f0a050'), Wt = mat('#fff4e0'); const b = box(1.7, .9, .9, O, .3); b.position.set(0, .45, -.3); b.rotation.y = Math.PI / 2; cat.add(b); const hd = box(1, .85, .85, O, .3); hd.position.set(0, 1.05, .35); cat.add(hd);
  const fc = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), catFace); fc.position.set(0, 1.03, .79); cat.add(fc); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.2, .4, 4), O); e.position.set(s * .32, 1.6, .35); cat.add(e); }
  const ch = box(.6, .45, .1, Wt, .1); ch.position.set(0, .55, .32); cat.add(ch); const tl = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, .5, -1), V(.3, 1, -1.4), V(.1, 1.6, -1.3)]), 12, .1, 6), O); cat.add(tl); }
cat.position.set(WALL.x, WALL.y + 1.6, WALL.z); cat.scale.setScalar(1.3);
// intérieurs : salon (famille endormie), classe, cuisine
const LIV = V(400, 0, 0), CLS = V(400, 0, 100), KIT = V(400, 0, -100);
function room(P, col, floor) { const r = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 16), mat(col, { side: THREE.BackSide })); r.position.set(P.x, 4, P.z); r.receiveShadow = true; scene.add(r); BLOCKERS.push(r); const f = box(16, .2, 16, mat(floor)); f.position.set(P.x, .1, P.z); scene.add(f);
  const l = new THREE.PointLight(0xffe8c8, 45, 24, 1.4); l.position.set(P.x, 7, P.z + 2); scene.add(l); }
room(LIV, '#e8d8f0', '#8a6a4a'); room(CLS, '#dff0e0', '#b89a74'); room(KIT, '#fff0d8', '#c9b89a');
{ const c = box(7, 1.2, 2.2, mat('#5a7ad8'), .3); c.position.set(LIV.x, .8, LIV.z - 3); scene.add(c); const bk = box(7, 2, .7, mat('#5a7ad8'), .3); bk.position.set(LIV.x, 2, LIV.z - 4); scene.add(bk);
  for (const s of [-1, 1]) { const a = box(.7, 1.6, 2.2, mat('#4a6ac8'), .3); a.position.set(LIV.x + s * 3.6, 1.1, LIV.z - 3); scene.add(a); }
  const tv = box(4, 2.4, .3, mat('#1c1c22'), .1); tv.position.set(LIV.x, 2.6, LIV.z + 6.5); scene.add(tv); const sc = box(3.6, 2, .05, mat('#7fd3ff', { emissive: new THREE.Color('#5ab0ff'), emissiveIntensity: .7 })); sc.position.set(LIV.x, 2.6, LIV.z + 6.33); scene.add(sc);
  const cal = box(2, 2.4, .05, new THREE.MeshStandardMaterial({ map: textTex(['2019'], { w: 256, h: 300, size: 100, bg: '#ffffff', fg: '#e8333a', border: '#1c1c22' }) })); cal.position.set(LIV.x - 4.5, 4.6, LIV.z - 7.9); scene.add(cal); }
web(LIV.x - 3.4, 3.2, LIV.z - 3.6, 2.6, 0, 0); web(LIV.x + 2.6, 3.4, LIV.z - 3.6, 2.2, 0, -1.2); web(LIV.x - .4, 4, LIV.z - 3.7, 2, 0, -.6);
const DESKS = []; for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 4; c2++) { const x = CLS.x - 4.5 + c2 * 3, z = CLS.z - 1 + r * 3.2; const d = box(2.2, .2, 1.3, mat('#c8945a'), .05); d.position.set(x, 1.9, z - 1); scene.add(d);
  const l = box(1.8, 1.8, .15, mat('#8a8f9c')); l.position.set(x, .95, z - 1.5); scene.add(l); const sto = box(1.2, 1.05, 1.1, mat('#5a6a8a'), .05); sto.position.set(x, .6, z + .15); scene.add(sto);
  const pp = box(.9, .02, .7, new THREE.MeshStandardMaterial({ map: textTex(['0/20'], { w: 256, h: 200, size: 110, bg: '#ffffff', fg: '#e8333a', border: '#ffffff' }) })); pp.position.set(x + .5, 2.02, z - 1.1); pp.visible = false; scene.add(pp); DESKS.push({ x, z, pp }); }
{ const bd = box(9, 3.2, .1, new THREE.MeshStandardMaterial({ map: textTex(['CONTRÔLE', 'DE MATHS'], { w: 1024, h: 364, bg: '#24503a', fg: '#ffffff', border: '#8a5a2a', size: 130 }) })); bd.position.set(CLS.x, 4.4, CLS.z - 7.9); scene.add(bd);
  const pd = box(3, 2, 1.4, mat('#8a5a3a'), .06); pd.position.set(CLS.x + 3.5, 1, CLS.z - 5.6); scene.add(pd); }
{ const ct = box(8, 2.2, 2, mat('#3fa6a0'), .08); ct.position.set(KIT.x, 1.1, KIT.z - 6.5); scene.add(ct); const top = box(8.1, .2, 2.1, mat('#f4f0e8')); top.position.set(KIT.x, 2.3, KIT.z - 6.5); scene.add(top);
  for (let i = 0; i < 4; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .8, 12), mat(['#e8333a', '#ffd23f', '#3fd06a', '#ffffff'][i])); j.position.set(KIT.x - 3 + i * .8, 2.8, KIT.z - 6.6); scene.add(j); }
  const fr = box(2, 5, 1.6, mat('#e8eef4'), .1); fr.position.set(KIT.x - 6, 2.5, KIT.z - 6.4); scene.add(fr); }
const PEP = V(KIT.x + 1.6, 2.8, KIT.z - 6.3); const pepTable = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, .8, 14), mat('#1c1c22', { roughness: .4 })); pepTable.add(b);
  const lb = box(.5, .3, .02, new THREE.MeshStandardMaterial({ map: textTex(['POIVRE'], { w: 256, h: 128, size: 60, bg: '#ffd23f', fg: '#1c1c22', border: '#1c1c22' }) })); lb.position.set(0, 0, .31); pepTable.add(lb); } pepTable.position.copy(PEP); scene.add(pepTable);
web(-3.2, 4.2, -45.4, 2.4, 0, -.4); web(-.4, 3.6, -45.2, 2, 0, -1.6);
const mayorWeb = web(0, 0, 0, 1.6, 0, 0);

// ---------------------------------------------------------------- chronologie
const w = i => CAP[i].t + VO;
function buildEvents() {
  const e = {}; const N = { baille: 5, endort: 12, petit: 13, sieste: 20, gros: 21, ronfle: 27, heureux: 28, atchoum: 35, prof: 41, baille2: 46, trente: 50, zeros: 53, fier: 59, chauffeur: 60, baille3: 65, vert: 74, rouge: 77, toujours: 81,
    mariage: 83, maire: 88, baille4: 91, oui: 95, trois: 96, chat: 106, quarante: 114, rue: 118, toi: 124, monte: 131, resiste: 132, tom: 136, jamais: 142, ducoup: 143, depuis: 153, elections: 155, haut: 165, votez: 167, appuye: 173,
    geant: 178, ville: 183, effondre: 188, sauf: 189, moi: 192, voter: 193, cent: 201, alors: 204, cuisine: 209, poivre: 211, micro: 218, atchoum2: 220, reveille: 225, vote: 228, maire2: 234, surprise: 237, baille5: 241, dort: 243, rdv: 245, combien: 249, dis: 255 };
  for (const k in N) e[k] = w(N[k]); return e;
}
let SUNSET = 0; const SLEEP = new Set();
function update(t) {
  ALL.forEach(c => { c.visible = false; c.scale.setScalar(1); }); SLEEP.clear(); waveN = 0; WAVES.forEach(r => r.visible = false); WEBS.forEach(m => m.visible = false); [pepper, bowl, ballot].forEach(o => o.visible = false);
  ballots.forEach(b => b.visible = false); DESKS.forEach(d => d.pp.visible = t > E.zeros - .2 && t < E.chauffeur); board.visible = t > E.voter - .5 && t < E.atchoum2; pepTable.visible = t < E.poivre - .1; catFace.map = CATF.smile;
  const S = (a, b) => t >= a && t < b; const zz = ch => SLEEP.add(ch);
  SUNSET = ease(seg(t, E.maire2, E.dort + 1)); const sk = [['#3f8fe6', '#ff8a6a'], ['#8cc6f5', '#ffb07a'], ['#dff0ff', '#ffd8a0']];
  ['top', 'mid', 'bot'].forEach((k, i) => skyMat.uniforms[k].value.set(sk[i][0]).lerp(new THREE.Color(sk[i][1]), SUNSET)); sun.color.set('#ffe6c2').lerp(new THREE.Color('#ff9a5a'), SUNSET); scene.fog.color.set('#cfe7ff').lerp(new THREE.Color('#ffc8a0'), SUNSET);
  tlLamps.forEach((l, i) => l.material.emissiveIntensity = (i === 0 ? !(t > E.vert && t < E.rouge) : i === 2 ? (t > E.vert && t < E.rouge) : 0) ? 2.2 : .05);
  // A. la règle
  if (S(0, E.prof - .05)) {
    const yawnA = VILL[0], ppl = [[1, -8, 6.4, Math.PI - .5], [4, -2, 5.2, Math.PI + .4], [5, -6.5, 4.8, 2.6], [6, 2.5, 6.6, Math.PI - .2], [7, 6, 5.4, Math.PI + .3], [9, 10, 6.2, Math.PI - .4], [10, -12, 5.6, Math.PI + .2], [11, 13.5, 5, Math.PI]];
    const tA = E.baille - .2, tB = E.petit + .4, tC = E.gros + .3, tW = E.atchoum - .05;
    const asleep = (x) => (t > tA + .5 && Math.abs(x + 4.5) < 5) || (t > tB + .6 && x < 8) || t > tC + .7;
    place(yawnA, -4.5, .2, 5.8, Math.PI); const yA = t > tA && t < tA + 1.2; setFace(yawnA, yA ? 'yawn' : t > tW ? 'shock' : 'smile'); pose(yawnA, yA ? 'yawnPose' : t > tA + 1.2 && t < tW ? 'doze' : 'idle', t); if (t > tA + 1.2 && t < tW) zz(yawnA);
    wave(t, tA + .2, V(-4.5, 2.4, 5.8), 6); wave(t, tB + .2, V(1, 2.4, 5.6), 12); wave(t, tC + .2, V(8, 2.4, 5.8), 40, '#c8a8ff', 1.6); wave(t, tW + .05, V(-14, 2.4, 5.8), 40, '#ffe14a', 1.2);
    for (const [i, x, z, r] of ppl) { const v = VILL[i]; place(v, x, .2, z, r); const zzz = asleep(x) && t < tW + .1; setFace(v, zzz ? 'sleep' : t > tW ? 'shock' : 'smile'); pose(v, zzz ? (i % 3 === 0 ? 'lie' : 'doze') : t > tW && t < tW + .6 ? 'jump' : 'idle', t + i); if (zzz) zz(v);
      if (i === 2) {} }
    const b = VILL[2]; place(b, 1, .2, 5.6, Math.PI - .3); const yB = t > tB && t < tB + 1.1; setFace(b, yB ? 'yawn' : (t > tB + 1.1 && t < tW) ? 'sleep' : 'smile'); pose(b, yB ? 'yawnPose' : (t > tB + 1.1 && t < tW) ? 'doze' : 'idle', t); if (t > tB + 1.1 && t < tW) zz(b);
    const c = VILL[3]; place(c, 8, .2, 5.8, Math.PI + .2); const yC = t > tC && t < tC + 1.3; setFace(c, yC ? 'yawn' : (t > tC + 1.3 && t < tW) ? 'sleep' : 'smile'); pose(c, yC ? 'yawnPose' : (t > tC + 1.3 && t < tW) ? 'lie' : 'idle', t); if (t > tC + 1.3 && t < tW) zz(c);
    const sn = VILL[8]; if (t > E.heureux - .2) { place(sn, -14, .2, 5.8, Math.PI); setFace(sn, t > tW - .7 && t < tW ? 'presneeze' : t > tW && t < tW + .8 ? 'sneeze' : 'smile'); pose(sn, t > tW && t < tW + .8 ? 'sneezePose' : 'idle', t); }
  }
  // B. le prof et le contrôle
  if (S(E.prof - .05, E.chauffeur - .05)) { const y0 = E.baille2 - .1; DESKS.forEach((d, i) => { const v = VILL[i]; place(v, d.x, 1.55, d.z, Math.PI); const sl = t > y0 + .7; setFace(v, sl ? 'sleep' : 'worried'); pose(v, sl ? 'deskSleep' : 'sit', t + i); v.userData.root.position.y = sl ? -1.45 * .5 + .2 : -1.45 * .5; if (sl) zz(v); });
    place(prof, CLS.x + 3.5, .2, CLS.z - 4.3, 0); const yp = t > y0 && t < y0 + 1.2; setFace(prof, yp ? 'yawn' : t > E.fier - .3 ? 'smug' : 'stern'); pose(prof, yp ? 'yawnPose' : t > E.zeros ? 'crossed' : 'idle', t); wave(t, y0 + .2, V(CLS.x + 3.5, 2.6, CLS.z - 4.3), 14); }
  // C. le bus au feu rouge
  if (S(E.chauffeur - .05, E.mariage - .05)) { const y0 = E.baille3 - .1; const sl = t > y0 + .8; const P = (x, z) => V(BUS.x + x, BUS.y, BUS.z + z);
    const d = P(3.8, -1); place(chauffeur, d.x, 1.35, d.z, Math.PI / 2); setFace(chauffeur, t > y0 && t < y0 + 1.1 ? 'yawn' : sl ? 'sleep' : 'smile'); pose(chauffeur, sl ? 'sitDoze' : t > y0 && t < y0 + 1.1 ? 'yawnPose' : 'sit', t); if (sl) zz(chauffeur);
    [[0, -.6, 1], [1, 1.8, 1], [4, -3, -1], [5, -.6, -1]].forEach(([i, x, z]) => { const v = VILL[i]; const p = P(x, z); place(v, p.x, 1.35, p.z, Math.PI / 2); setFace(v, t > y0 + .5 ? 'sleep' : 'smile'); pose(v, t > y0 + .5 ? 'sitDoze' : 'sit', t + i); if (t > y0 + .5) zz(v); });
    wave(t, y0 + .2, V(BUS.x + 3.8, 3.2, BUS.z), 8); }
  // D. le mariage
  if (S(E.mariage - .05, E.chat - .05)) { const y0 = E.baille4 - .1, sl = t > E.oui - .3, later = t > E.trois - .1;
    place(mayor, -3, STAGE.y, -46.6, 0); setFace(mayor, t > y0 && t < y0 + 1.2 ? 'yawn' : t > y0 + 1.2 ? 'sleep' : 'talk'); pose(mayor, t > y0 && t < y0 + 1.2 ? 'yawnPose' : t > y0 + 1.2 ? 'doze' : 'talk', t); if (t > y0 + 1.2) zz(mayor);
    place(bride, -4.2, STAGE.y, -44.4, Math.PI - .25); place(groom, -1.8, STAGE.y, -44.4, Math.PI + .25); [bride, groom].forEach(c => { setFace(c, sl ? 'sleep' : 'smile'); pose(c, sl ? 'doze' : 'idle', t); if (sl) zz(c); });
    VILL.slice(0, 8).forEach((v, i) => { const x = -9 + (i % 4) * 4, z = -38 + Math.floor(i / 4) * 2.5; place(v, x, .2, z, Math.PI); setFace(v, sl ? 'sleep' : 'smile'); pose(v, sl ? (i % 2 ? 'lie' : 'doze') : 'idle', t + i); if (sl) zz(v); });
    wave(t, y0 + .2, V(-3, 4.4, -46.6), 16); if (later) WEBS.slice(-3, -1).forEach(m => m.visible = true); }
  // E. le chat qui bâille 40 fois par jour
  if (S(E.chat - .05, E.toi - .05)) { const ph = (t - E.chat) % 1.1; const yawning = t > E.quarante - .4 && ph < .55; catFace.map = yawning ? CATF.yawn : CATF.smile; cat.rotation.y = 0;
    if (yawning) wave(t, t - ph, V(WALL.x, 4, WALL.z), 7, '#c8a8ff', .55);
    [[1, 3, -5.2, .3], [4, 6.5, -4.6, -.2], [6, 11, -5.4, -.6], [9, 14, -4.8, .2]].forEach(([i, x, z, r], j) => { const v = VILL[i]; place(v, x, .2, z, r); setFace(v, 'tired'); pose(v, t > E.rue + .2 && j % 2 ? 'doze' : 'oldwalk', t + j); }); }
  // F. « Et toi, là… »
  if (S(E.toi - .05, E.tom - .05)) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, t > E.resiste - .1 ? 'shh' : 'smug'); pose(tom, t > E.resiste - .1 ? 'shhPose' : 'pointCam', t); }
  // G. Tom, seul réveillé de la famille
  if (S(E.tom - .05, E.elections - .05)) { const inside = t > E.ducoup - .2;
    if (!inside) { place(tom, -20, .2, 5.4, Math.PI); setFace(tom, 'smile'); pose(tom, t > E.jamais - .3 ? 'crossed' : 'idle', t); }
    else { place(tom, LIV.x + 4.6, .2, LIV.z + 1.4, -.5); setFace(tom, 'deadpan'); pose(tom, 'holdOut', t); bowl.visible = true;
      [[mom, -2], [dad, 0], [mamie, 2]].forEach(([c, x]) => { place(c, LIV.x + x, 1.55, LIV.z - 3, 0); setFace(c, 'sleep'); pose(c, 'sitDoze', t + x); c.userData.root.position.y = -1.45 * .5 + .05; zz(c); });
      if (t > E.depuis - .2) WEBS.slice(0, 3).forEach(m => m.visible = true); } }
  // H. élections : haut-parleurs, bouton, bâillement géant
  const plaza = S(E.elections - .05, E.alors - .05) || S(E.micro - 1.2, END + 1);
  if (plaza) { const fallT = E.effondre - .5, wake = E.atchoum2 + .2; const down = t > fallT && t < wake;
    VILL.forEach((v, i) => { const x = -10 + (i % 6) * 4, z = -30 - Math.floor(i / 6) * 4; place(v, x, .2, z, Math.PI + (i % 2 ? .2 : -.2)); const y = t > E.geant && t < fallT;
      setFace(v, down ? 'sleep' : y ? 'tired' : t > wake ? 'laugh' : 'smile'); pose(v, down ? 'lie' : y ? 'doze' : t > wake && t < E.vote ? 'jump' : 'idle', t + i * .4); if (down) zz(v);
      if (t > E.vote - .3 && i < 6) { const k = clamp((t - E.vote) / 3 - i * .1); v.position.set(lerp(x, URNE.x + 1.6 + i * .2, k), .2, lerp(z, URNE.z + 1.6 + i * 1.1, k)); v.rotation.y = Math.PI + .6; pose(v, k > 0 && k < 1 ? 'walk' : 'idle', t); } });
    if (t > E.vote) ballots.forEach((b, i) => b.visible = t > E.vote + .4 + i * .3);
    wave(t, E.geant - .1, V(0, 6, -36), 34, '#c8a8ff', 1.6); wave(t, E.geant + .3, V(0, 6, -36), 34, '#c8a8ff', 1.6); wave(t, E.atchoum2, V(0, 5, -40), 40, '#ffe14a', 1.4); wave(t, E.atchoum2 + .3, V(0, 5, -40), 40, '#ffe14a', 1.4);
    // le maire
    if (t < E.voter - .2) { place(mayor, 0, STAGE.y, -43.7, 0); setFace(mayor, t > E.appuye - .2 ? 'smug' : 'talk'); pose(mayor, t > E.appuye - .3 && t < E.geant ? 'point' : 'talk', t); if (t > E.appuye - .3 && t < E.geant) mayor.rotation.y = -.9; }
    else if (t < E.alors) { const k = seg(t, E.voter - .2, E.seul - .2); place(mayor, lerp(-3, URNE.x + .2, k), .2, lerp(-38, URNE.z + 1.5, k), Math.PI + .3); setFace(mayor, 'smug'); pose(mayor, k < 1 ? 'walk' : 'holdOut', t); ballot.visible = true; }
    else if (t < E.maire2) { place(mayor, -3.2, STAGE.y, -44.2, .3); setFace(mayor, t > E.atchoum2 ? 'shock' : 'smug'); pose(mayor, 'idle', t); }
    else { const y0 = E.baille5 - .1; place(mayor, -3.2, STAGE.y, -44.2, .3); setFace(mayor, t > y0 && t < y0 + 1.1 ? 'yawn' : t > y0 + 1.1 ? 'sleep' : 'shock'); pose(mayor, t > y0 && t < y0 + 1.1 ? 'yawnPose' : t > y0 + 1.1 ? 'lie' : 'idle', t);
      if (t > y0 + 1.1) { zz(mayor); mayorWeb.visible = t > E.rdv - .3; mayorWeb.position.set(-3.2, STAGE.y + 1, -43.4); mayorWeb.rotation.set(-Math.PI / 2, 0, 0); } }
    // Tom
    if (t < E.alors) { place(tom, 9, .2, -31, Math.PI - .4); setFace(tom, t > E.geant ? (t > E.moi - .2 ? 'stern' : 'shock') : 'suspicious'); pose(tom, 'idle', t); }
    else if (t < E.atchoum2 + .9) { place(tom, 0, STAGE.y, -43.7, 0); setFace(tom, t > E.atchoum2 - .05 ? 'sneeze' : 'presneeze'); pose(tom, t > E.atchoum2 - .05 ? 'sneezePose' : 'holdUp', t); pepper.visible = t < E.atchoum2 - .05; }
    else { place(tom, -1.4, STAGE.y, -45.5, -.2); setFace(tom, t > E.combien - .1 ? 'smug' : 'laugh'); pose(tom, t > E.combien - .1 ? 'pointCam' : 'jump', t); if (t > E.combien - .1) { tom.rotation.y = 0; } } }
  // I. la cuisine, le poivre
  if (S(E.alors - .05, E.micro - 1.2)) { const k = seg(t, E.alors, E.cuisine - .4); place(tom, lerp(KIT.x - 5, PEP.x, k), .2, lerp(KIT.z + 3, PEP.z + 2.2, k), k < 1 ? lerp(-2.2, Math.PI, k) : lerp(Math.PI, 0, seg(t, E.cuisine - .4, E.cuisine + .3))); setFace(tom, t > E.poivre - .2 ? 'laugh' : 'stern'); pose(tom, k < 1 ? 'run' : t > E.poivre - .2 ? 'holdUp' : 'reach', t); pepper.visible = t > E.poivre - .2; }
}

// ---------------------------------------------------------------- plans
const FR = { sign: [12, .4, 44], macro: [2.4, 1.2, 38], cu: [4.1, .15, 32], mcu: [5.4, .35, 36], ms: [6.2, .7, 38], fs: [9.5, 1.4, 40], ws: [26, 9, 46], xws: [60, 26, 48], low: [5.2, -1.4, 42],
  feet: [3.4, -.6, 36], high: [9, 9, 42], grp: [13, 1.5, 40], track: [7, 1, 38] };
const SUBJ = { tom: () => tom, mayor: () => mayor, prof: () => prof, chauffeur: () => chauffeur, bride: () => bride, groom: () => groom, mom: () => mom, dad: () => dad, mamie: () => mamie,
  v0: () => VILL[0], v1: () => VILL[1], v2: () => VILL[2], v3: () => VILL[3], v4: () => VILL[4], v5: () => VILL[5], v6: () => VILL[6], v8: () => VILL[8], v9: () => VILL[9] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move });
  A(0, 'v0', 'mcu', 10, null, 'static'); A(5, 'v0', 'cu', 0); A(9, '@-4.5,2,5.8,3.14', 'fs', 0); A(13, 'v2', 'mcu', -15); A(16, '@1,2,5.6,3.14', 'grp', 20);
  A(21, 'v3', 'mcu', 10); A(24, '@2,2,5,3.14', 'ws', 10, null, 'up'); A(28, '@-4,2,5.6,3.14', 'grp', -15); A(32, 'v8', 'mcu', 10); A(35, 'v8', 'cu', 0, null, 'static'); A(37, '@-6,2,5.6,3.14', 'grp', 10);
  A(41, `@${CLS.x + 3.5},2.8,${CLS.z - 4.3}`, 'ms', 0); A(44, 'prof', 'mcu', 10); A(47, `@${CLS.x},2,${CLS.z + 2}`, 'grp', 180, null, 'up'); A(50, `@${CLS.x - 1.5},2,${CLS.z + 1},3.14`, 'grp', 0); A(53, `@${CLS.x - 1.5},2,${CLS.z + 1},3.14`, 'high', 10, null, 'static'); A(57, 'prof', 'cu', 0);
  A(60, '@-28,2.5,-1.8,1.57', 'fs', 40); A(62, 'chauffeur', 'mcu', 20); A(65, 'chauffeur', 'cu', 0); A(69, '@-20.5,6.5,-4.6,-1.57', 'ms', 20, null, 'static'); A(72, '@-24,3,-2', 'ws', 120); A(75, '@-20.5,6.5,-4.6,-1.57', 'ms', -10, null, 'static'); A(78, '@-28,2.5,-1.8,1.57', 'grp', 30, null, 'pan');
  A(83, '@-3,3.2,-45,3.14', 'grp', 180); A(86, 'bride', 'mcu', 0); A(88, 'mayor', 'mcu', 10); A(91, 'mayor', 'cu', 0); A(94, 'groom', 'mcu', -10); A(96, '@-3,3,-45', 'fs', 0, null, 'up'); A(100, 'bride', 'cu', 10);
  A(106, '@8,3.4,-7.9', 'ms', 0); A(110, '@8,3.6,-7.9', 'mcu', 10, null, 'static'); A(114, '@8,3.6,-7.9', 'mcu', -15); A(118, 'v4', 'mcu', 10); A(120, 'v6', 'cu', 0); A(122, 'v9', 'mcu', -15);
  A(124, 'tom', 'mcu', 0, null, 'static'); A(127, 'tom', 'cu', 0); A(132, 'tom', 'cu', 0, null, 'static');
  A(136, 'tom', 'mcu', 10); A(139, 'tom', 'ms', -15, 'body'); A(143, `@${LIV.x},2.2,${LIV.z - 3}`, 'grp', 15); A(147, 'tom', 'mcu', 20); A(150, 'dad', 'mcu', 0); A(153, `@${LIV.x - 4.5},4.6,${LIV.z - 7.9}`, 'ms', 10, null, 'static');
  A(155, '@0,5,-40', 'ws', 0); A(160, 'mayor', 'mcu', 35); A(163, '@14,6.5,-20,-.6', 'ms', 20); A(167, 'mayor', 'cu', 32); A(170, 'mayor', 'ms', 30, 'body'); A(173, `@${BTN.x},3.3,${BTN.z}`, 'macro', 10, null, 'static');
  A(177, '@-14,6.5,-20,.6', 'mcu', 0, null, 'static'); A(179, '@0,6,-30', 'xws', 0, null, 'static'); A(184, '@0,1.2,-33,3.14', 'grp', 0); A(189, 'mayor', 'mcu', -32); A(191, 'tom', 'mcu', 0);
  A(193, `@${URNE.x + 2},2,${URNE.z + 2}`, 'grp', 30); A(197, `@${URNE.x},2,${URNE.z}`, 'ms', 30); A(200, '@-15,4.2,-36,.6', 'sign', 0, null, 'static');
  A(204, `@${KIT.x - 3},2.2,${KIT.z + 1}`, 'grp', 25); A(207, `@${PEP.x},2.8,${PEP.z + 2}`, 'ms', 0); A(210, 'tom', 'cu', -10); A(212, 'tom', 'mcu', 35); A(216, 'tom', 'cu', 35, null, 'static');
  A(220, 'tom', 'ms', 25, 'body', 'static'); A(221, '@0,6,-34', 'xws', 0, null, 'static'); A(224, '@0,2,-33,3.14', 'grp', -20); A(228, `@${URNE.x},2,${URNE.z}`, 'grp', 40);
  A(234, 'mayor', 'mcu', 10); A(237, 'mayor', 'cu', 0); A(241, 'mayor', 'cu', 5, null, 'static'); A(243, `@-3.2,2,-44.2`, 'ms', 30); A(245, '@0,5,-44', 'ws', 0, null, 'up');
  A(249, 'tom', 'mcu', 0, null, 'static'); A(252, 'tom', 'cu', 0, null, 'static');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
const sizeOf = ch => Math.max(.06, ch.scale.x * ch.userData.root.scale.y / .5);
function subjectPoint(name, part) {
  if (name === 'cat') return { p: cat.position.clone().add(V(0, .9, 0)), face: cat.rotation.y, k: .45 };
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
function overlays(t) {
  for (const ch of SLEEP) { if (!ch.visible) continue; const hp = ch.userData.hd.getWorldPosition(V(0, 0, 0)), sz = sizeOf(ch); const a = project(hp.clone().add(V(0, .6 * sz, 0))), b = project(hp.clone().add(V(0, 1.6 * sz, 0)));
    if (a[2] > 1 || a[0] < 40 || a[0] > W - 40 || a[1] < 150 || a[1] > H - 320) continue; const px = Math.abs(a[1] - b[1]); if (px < 30) continue; const s = clamp(px / 110, .4, 1.4);
    for (let j = 0; j < 3; j++) { const ph = ((t * .7 + j / 3 + (ch.id % 7) * .13) % 1); g.save(); g.globalAlpha = Math.sin(ph * Math.PI); g.translate(b[0] + (ph * 70 + j * 10) * s, b[1] - ph * 140 * s); g.rotate(-.2);
      g.font = `900 ${Math.round((36 + j * 12) * s)}px 'Inter Display'`; g.textAlign = 'center'; g.lineWidth = 8 * s; g.strokeStyle = '#1c1c22'; g.strokeText('Z', 0, 0); g.fillStyle = '#bfe8ff'; g.fillText('Z', 0, 0); g.restore(); } }
  const pop = (txt, ch, a, b, o = {}) => { if (t < a || t > b || !ch.visible) return; const q = project(ch.userData.hd.getWorldPosition(V(0, 0, 0)).add(V(0, 1.1 * sizeOf(ch), 0))); if (q[2] < 1) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1] - 150, 280, 1050), win(t, a, b, .12), o); };
  const popAt = (txt, pt, a, b, o = {}) => { if (t < a || t > b) return; const q = project(pt); if (q[2] < 1 && q[0] > -100 && q[0] < W + 100) onoma(txt, clamp(q[0], 230, W - 230), clamp(q[1], 280, 1050), win(t, a, b, .12), o); };
  pop('HAAAA…', VILL[0], E.baille - .2, E.baille + 1, { size: 100, fill: '#c8a8ff' }); pop('HAAAA…', VILL[2], E.petit + .4, E.petit + 1.5, { size: 90, fill: '#c8a8ff' }); pop('HAAAAAAA…', VILL[3], E.gros + .3, E.gros + 1.6, { size: 110, fill: '#c8a8ff' });
  pop('ATCHOUM !', VILL[8], E.atchoum - .05, E.atchoum + 1, { size: 120 }); pop('HAAAA…', prof, E.baille2 - .1, E.baille2 + 1, { size: 100, fill: '#c8a8ff' }); pop('HAAAA…', chauffeur, E.baille3 - .1, E.baille3 + 1, { size: 100, fill: '#c8a8ff' });
  popAt('PIN PON ?', V(-20.5, 8.4, -4.6), 0, 0); pop('HAAAA…', mayor, E.baille4 - .1, E.baille4 + 1, { size: 100, fill: '#c8a8ff' });
  if (catFace.map === CATF.yawn) popAt('MIAAAOU…', cat.position.clone().add(V(0, 2.6, 0)), E.chat, E.toi - .1, { size: 90, fill: '#ffb060' });
  pop('« VOTEZ POUR MOI ! »', mayor, E.votez - .05, E.appuye - .3, { size: 70, fill: '#ffffff' }); popAt('CLIC', V(BTN.x, BTN.y + 2.6, BTN.z), E.appuye, E.appuye + .8, { size: 100 });
  if (t > E.geant - .1 && t < E.ville + .6) { let n = 0; for (const s of SPK) { const q = project(s.position); if (n < 2 && q[2] < 1 && q[0] > 100 && q[0] < W - 100 && q[1] > 200 && q[1] < H - 400) { popAt('HAAAAAAAA…', s.position.clone().add(V(0, 1.6, 0)), E.geant - .1, E.ville + .6, { size: 90, fill: '#c8a8ff' }); n++; } } }
  pop('ATCHOUM !!!', tom, E.atchoum2 - .05, E.atchoum2 + 1.2, { size: 140 }); pop('HAAAA…', mayor, E.baille5 - .1, E.baille5 + 1, { size: 100, fill: '#c8a8ff' });
  const fl = t > E.atchoum2 - .05 ? .5 * Math.exp(-(t - E.atchoum2 + .05) * 5) : 0; if (fl > .01) { g.fillStyle = `rgba(255,248,200,${fl})`; g.fillRect(0, 0, W, H); }
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
