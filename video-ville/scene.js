// « Dans cette ville » — ville en blocs, rendu déterministe : window.render(t)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1080, H = 1920, VO = 0.15;
const glc = document.getElementById('gl'), out = document.getElementById('out'), g = out.getContext('2d');
let CAP = [], E = {}, END = 0;

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
const box = (w, h, d, m, r = 0) => { const geo = r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------------------------------------------------------------- moteur
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8a5a9a, 110, 520);
const camera = new THREE.PerspectiveCamera(45, W / H, .05, 3000);
const composer = new EffectComposer(renderer); composer.setSize(W, H); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .3, .35, .97); composer.addPass(bloom); composer.addPass(new OutputPass());
const hemi = new THREE.HemisphereLight(0x8fa6e8, 0x20283f, 1.2); scene.add(hemi);
const camLight = new THREE.PointLight(0xfff0dc, 16, 22, 1.4); scene.add(camLight);
const key = new THREE.DirectionalLight(0xb8ccff, 1.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; key.shadow.normalBias = .03;
scene.add(key, key.target);
const MOON_DIR = V(-.35, .62, -.7).normalize();

// ciel
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#3a2a7a') }, mid: { value: new THREE.Color('#9a5aa8') }, bot: { value: new THREE.Color('#f29a8a') } },
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .1 ? mix(mid, top, smoothstep(.1,.6,h)) : mix(bot, mid, smoothstep(-.05,.1,h)); gl_FragColor = vec4(c,1.); }' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat));
const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, fog: false }));
{ const r = rng(3), p = []; for (let i = 0; i < 900; i++) { const a = r() * 6.283, y = .08 + r() * .9, rr = Math.sqrt(1 - y * y); p.push(Math.cos(a) * rr * 1800, y * 1800, Math.sin(a) * rr * 1800); }
  stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); scene.add(stars); }
const moon = new THREE.Mesh(new THREE.SphereGeometry(55, 32, 24), new THREE.MeshBasicMaterial({ color: '#fffaf0', fog: false }));
moon.position.copy(MOON_DIR).multiplyScalar(1500); scene.add(moon);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (c, w) => { const gr = c.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(255,245,220,.9)'); gr.addColorStop(.35, 'rgba(200,200,255,.25)'); gr.addColorStop(1, 'rgba(120,120,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
moonGlow.scale.set(520, 520, 1); moonGlow.position.copy(moon.position); scene.add(moonGlow);

// sol et rues
const ground = box(1600, 1, 1600, mat('#5aa84a')); ground.position.y = -.5; scene.add(ground);
const road = box(260, .1, 9, mat('#3b3e46')); road.position.set(0, .05, 0); scene.add(road);
for (let x = -120; x < 130; x += 8) { const l = box(3, .02, .35, mat('#e8e2c8')); l.position.set(x, .12, 0); scene.add(l); }
for (const z of [-6, 6]) { const s = box(260, .3, 3, mat('#9a9aa6')); s.position.set(0, .15, z); scene.add(s); }
const plaza = box(34, .2, 26, mat('#b49a7a')); plaza.position.set(2, .1, -22); scene.add(plaza);
for (let i = 0; i < 40; i++) { const r = rng(i + 7); const t = box(3.2, .02, 3.2, mat(r() > .5 ? '#a68a6c' : '#c2a888')); t.position.set(-13 + (i % 8) * 4, .22, -33 + Math.floor(i / 8) * 4.5); scene.add(t); }

// arbres + collines
{ const r = rng(11); for (let i = 0; i < 140; i++) { const a = r() * 6.283, d = 90 + r() * 400; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(z) < 30 && Math.abs(x) < 110) continue;
  const tr = box(1, 3, 1, mat('#6b4a2e')); tr.position.set(x, 1.5, z); scene.add(tr); const s = 3 + r() * 3;
  const f = box(s, s, s, mat(r() > .5 ? '#2f6b36' : '#3d7d3d'), .4); f.position.set(x, 3 + s / 2, z); scene.add(f); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, d = 650; const h = new THREE.Mesh(new THREE.SphereGeometry(140 + r() * 80, 16, 10), mat('#24452e')); h.position.set(Math.cos(a) * d, -60, Math.sin(a) * d); h.scale.y = .6; scene.add(h); } }

// ---------------------------------------------------------------- textures de façade
const winMat = mat('#2a2a3a', { emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 1.2 });
function makeHouse({ w = 8, h = 6, d = 7, wall = '#e9d8b8', roof = '#b8473a', door = '#6b4423', sign = null, tin = false }) {
  const grp = new THREE.Group(); const mats = [];
  const M = (c, o) => { const m = mat(c, { transparent: true, ...o }); mats.push(m); return m; };
  let wallM;
  if (tin) { const tex = canvasTex(256, 256, (c) => { for (let x = 0; x < 256; x += 16) { const gr = c.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#7f8d99'); gr.addColorStop(.5, '#b9c4cc'); gr.addColorStop(1, '#6f7c88'); c.fillStyle = gr; c.fillRect(x, 0, 16, 256); }
      c.fillStyle = 'rgba(150,80,40,.35)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 10, 0, 7); c.fill(); } });
    wallM = M('#ffffff', { map: tex, metalness: .3, roughness: .5 }); } else wallM = M(wall);
  const body = box(w, h, d, wallM); body.position.y = h / 2; grp.add(body);
  const rm = M(roof); const r1 = box(w + 1, .5, d * .62, rm); r1.position.set(0, h + 1.2, d * .25); r1.rotation.x = -.6; grp.add(r1);
  const r2 = box(w + 1, .5, d * .62, rm); r2.position.set(0, h + 1.2, -d * .25); r2.rotation.x = .6; grp.add(r2);
  const gab = box(w - .2, 2.2, d * .3, wallM); gab.position.set(0, h + .9, 0); grp.add(gab);
  const dr = box(1.6, 2.8, .2, M(door)); dr.position.set(0, 1.4, d / 2 + .05); grp.add(dr);
  const wm = winMat.clone(); wm.transparent = true; mats.push(wm);
  for (const x of [-w / 3, w / 3]) { const wi = box(1.5, 1.4, .2, wm); wi.position.set(x, h * .62, d / 2 + .05); grp.add(wi); }
  if (sign) { const tex = canvasTex(512, 128, (c) => { c.fillStyle = '#3a2a1c'; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#e9c46a'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116); c.fillStyle = '#ffe9b0'; c.font = "900 64px 'Inter Display'"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sign, 256, 68); });
    const sm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: .35 }); mats.push(sm);
    const s = box(w * .8, 1.3, .25, sm); s.position.set(0, h - .9, d / 2 + .2); grp.add(s); }
  grp.userData.mats = mats; grp.userData.size = [w, h, d]; scene.add(grp); return grp;
}
function setFade(grp, k) { for (const m of grp.userData.mats) { m.opacity = k; m.depthWrite = k > .5; } grp.visible = k > .01; }

// la rue : maisons
const houses = [];
{ const cols = ['#e9d8b8', '#cfe0f0', '#f2c9c0', '#d8e8c8', '#f0e2a8', '#d9cdee'], roofs = ['#b8473a', '#3f5f8f', '#5f7f3f', '#8f4f2f'];
  let i = 0; for (const z of [-12, 12]) for (let x = -64; x <= 40; x += 13) { if (z < 0 && x > -30 && x < 16) continue;
    const hgt = 5 + (i * 7 % 4); const hs = makeHouse({ w: 8.5, h: hgt, d: 7, wall: cols[i % 6], roof: roofs[i % 4] }); hs.position.set(x, 0, z); hs.rotation.y = z > 0 ? Math.PI : 0; houses.push(hs); i++; } }
const firstHouse = houses.find(h => h.position.z > 0 && h.position.x === -38) || houses[3];
const bakery = makeHouse({ w: 10, h: 6.5, d: 8, wall: '#f4e1c1', roof: '#c26b3a', sign: 'BOULANGERIE' }); bakery.position.set(-25, 0, -13);
const cabin = makeHouse({ w: 6, h: 4, d: 5.5, roof: '#6d7880', tin: true, door: '#5a4a3a' }); cabin.position.set(58, 0, 10); cabin.rotation.y = Math.PI;
// tour de l'horloge (minuit)
const clockTower = new THREE.Group(); clockTower.position.set(-12, 0, -30); scene.add(clockTower);
{ const b = box(5, 22, 5, mat('#c9b48e')); b.position.y = 11; clockTower.add(b); const r = new THREE.Mesh(new THREE.ConeGeometry(4.2, 5, 4), mat('#7a3a2a')); r.position.y = 24.5; r.rotation.y = Math.PI / 4; clockTower.add(r);
  const faceTex = canvasTex(256, 256, (c) => { c.fillStyle = '#fff8e6'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 10; c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.fillStyle = '#222'; c.fillRect(128 + Math.cos(a) * 100 - 5, 128 + Math.sin(a) * 100 - 5, 10, 10); } });
  const f = new THREE.Mesh(new THREE.CircleGeometry(2, 32), new THREE.MeshStandardMaterial({ map: faceTex, emissive: new THREE.Color('#fff3d0'), emissiveMap: faceTex, emissiveIntensity: .6 })); f.position.set(0, 18, 2.52); clockTower.add(f);
  const hand = (len, w) => { const p = new THREE.Group(); const m = box(w, len, .05, mat('#111')); m.position.y = len / 2; p.add(m); p.position.set(0, 18, 2.58); clockTower.add(p); return p; };
  clockTower.userData.hour = hand(1.1, .16); clockTower.userData.min = hand(1.6, .1); }

// tour du banquier (40 étages) + miroir
const TOWER = V(22, 0, -52), TOWER_H = 72;
const tower = new THREE.Group(); tower.position.copy(TOWER); scene.add(tower); const towerMats = [];
{ const tex = canvasTex(256, 1024, (c) => { c.fillStyle = '#2c3346'; c.fillRect(0, 0, 256, 1024); const r = rng(5);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 5; x++) { c.fillStyle = r() > .55 ? '#ffd88a' : '#1c2233'; c.fillRect(14 + x * 48, 8 + y * 25.4, 34, 15); } });
  const em = tex.clone(); const tm = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: .45, transparent: true, roughness: .5, metalness: .3 }); towerMats.push(tm);
  const b = box(14, TOWER_H, 14, tm); b.position.y = TOWER_H / 2; tower.add(b);
  const gm = mat('#d4af37', { metalness: .8, roughness: .3, transparent: true }); towerMats.push(gm);
  const cap = box(15, 1.5, 15, gm); cap.position.y = TOWER_H + .7; tower.add(cap);
  const door = box(4, 4, .3, gm); door.position.set(0, 2, 7.1); tower.add(door);
  const logo = canvasTex(256, 256, (c) => { c.fillStyle = '#d4af37'; c.beginPath(); c.arc(128, 128, 110, 0, 7); c.fill(); c.fillStyle = '#5a4300'; c.font = "900 170px 'Inter Display'"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 128, 140); });
  const lm = new THREE.MeshStandardMaterial({ map: logo, transparent: true, emissive: new THREE.Color('#ffd76a'), emissiveMap: logo, emissiveIntensity: .5 }); towerMats.push(lm);
  const lg = new THREE.Mesh(new THREE.CircleGeometry(3, 32), lm); lg.position.set(0, TOWER_H - 6, 7.06); tower.add(lg); }
const mirrorG = new THREE.Group(); mirrorG.position.set(0, TOWER_H + 8, 0); tower.add(mirrorG);
const mirrorPivot = new THREE.Group(); mirrorG.add(mirrorPivot);
const mirrorGlass = new THREE.MeshStandardMaterial({ color: '#dfe9ff', metalness: .6, roughness: .1, emissive: new THREE.Color('#b8ccff'), emissiveIntensity: .9, transparent: true });
{ const post = box(1, 6.4, 1, mat('#d4af37', { metalness: .8, roughness: .3 })); post.position.y = -3.2; mirrorG.add(post);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(4.6, .45, 10, 40), mat('#d4af37', { metalness: .85, roughness: .25 })); mirrorPivot.add(frame);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40), mirrorGlass); glass.position.z = .05; mirrorPivot.add(glass);
  const back = new THREE.Mesh(new THREE.CircleGeometry(4.4, 40), mat('#8a6a1a', { side: THREE.BackSide })); mirrorPivot.add(back);
  const cover = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.6, 6), mat('#d4af37', { metalness: .8 })); cover.position.y = 5.4; mirrorPivot.add(cover);
  // manivelle
  const crankBase = box(1.2, 1.2, 1.2, mat('#7a4a2a', { metalness: .4, roughness: .7 })); crankBase.position.set(2.4, -5.4, 0); mirrorG.add(crankBase);
  const crank = new THREE.Group(); crank.position.set(3.1, -5.4, 0); mirrorG.add(crank); mirrorG.userData.crank = crank;
  const arm = box(.25, 1.6, .25, mat('#8a5a3a', { metalness: .4 })); arm.position.y = .7; crank.add(arm); const hdl = box(.8, .3, .3, mat('#5a3a22')); hdl.position.set(.45, 1.4, 0); crank.add(hdl); }
// toit de la tour (plateforme où Noé arrive)
const roofDeck = box(14, .4, 14, mat('#4a4f5c')); roofDeck.position.set(0, TOWER_H + 1.6, 0); tower.add(roofDeck);
// carré d'herbe (après disparition)
function grassPatch(w, d) { const p = box(w, .25, d, mat('#5fbf4a')); p.visible = false; scene.add(p); return p; }
const patchBakery = grassPatch(10, 8); patchBakery.position.set(-25, .12, -13);
const patchTower = grassPatch(14, 14); patchTower.position.set(TOWER.x, .12, TOWER.z);
const patchFirst = grassPatch(8.5, 7); patchFirst.position.set(firstHouse.position.x, .12, firstHouse.position.z);
// réverbères
const lamps = []; for (let x = -60; x <= 60; x += 20) for (const z of [-7.2, 7.2]) { const p = box(.3, 5, .3, mat('#2a2a30')); p.position.set(x, 2.5, z); scene.add(p);
  const l = box(.8, .6, .8, mat('#fff1c4', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 2 })); l.position.set(x, 5.2, z); scene.add(l); lamps.push(l); }
const streetLights = []; for (const x of [-40, 0, 40]) { const pl = new THREE.PointLight(0xffc977, 18, 26, 1.6); pl.position.set(x, 5, 0); scene.add(pl); streetLights.push(pl); }

// ---------------------------------------------------------------- personnages en blocs
const FACES = {};
function faceTex(expr) {
  if (FACES[expr]) return FACES[expr];
  return FACES[expr] = canvasTex(256, 256, (c) => {
    c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 256, 256);
    const eye = (x, y, open = true, look = 0) => { if (!open) { c.strokeStyle = '#1a1a1a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.arc(x, y - 4, 16, .15 * Math.PI, .85 * Math.PI); c.stroke(); return; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y, 20, 24, 0, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.ellipse(x + look, y + 3, 12, 15, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + look - 4, y - 3, 4.5, 0, 7); c.fill(); };
    const brow = (x, y, a) => { c.strokeStyle = '#2a1a10'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 18, y + a); c.lineTo(x + 18, y - a); c.stroke(); };
    const L = 88, R = 168, EY = 112;
    if (expr === 'sleep') { eye(L, EY, false); eye(R, EY, false); c.strokeStyle = '#1a1a1a'; c.lineWidth = 7; c.beginPath(); c.ellipse(128, 176, 12, 8, 0, 0, 7); c.stroke(); return; }
    if (expr === 'happy') { eye(L, EY, false); eye(R, EY, false); } else eye(L, EY, true, expr === 'side' ? 7 : 0), eye(R, EY, true, expr === 'side' ? 7 : 0);
    if (expr === 'worried' || expr === 'sad') { brow(L, 74, -7); brow(R, 74, 7); }
    if (expr === 'angry' || expr === 'smug' || expr === 'shout' || expr === 'effort') { brow(L, 76, 8); brow(R, 76, -8); }
    if (expr === 'surprised') { brow(L, 66, 0); brow(R, 66, 0); }
    c.fillStyle = '#1a1a1a'; c.strokeStyle = '#1a1a1a'; c.lineWidth = 8; c.lineCap = 'round';
    if (expr === 'smile' || expr === 'happy') { c.beginPath(); c.arc(128, 160, 30, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
    else if (expr === 'surprised' || expr === 'shout') { c.beginPath(); c.ellipse(128, 182, expr === 'shout' ? 26 : 16, expr === 'shout' ? 26 : 20, 0, 0, 7); c.fill(); if (expr === 'shout') { c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(128, 194, 14, 9, 0, 0, 7); c.fill(); } }
    else if (expr === 'sad' || expr === 'worried') { c.beginPath(); c.arc(128, 200, 24, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
    else if (expr === 'smug') { c.beginPath(); c.moveTo(100, 176); c.quadraticCurveTo(140, 186, 164, 162); c.stroke(); }
    else if (expr === 'effort') { c.fillStyle = '#fff'; c.fillRect(100, 168, 56, 22); c.strokeRect(100, 168, 56, 22); c.beginPath(); for (let x = 110; x < 156; x += 11) { c.moveTo(x, 168); c.lineTo(x, 190); } c.stroke(); }
    else { c.beginPath(); c.moveTo(108, 172); c.lineTo(148, 172); c.stroke(); }
  });
}
function makeChar({ skin = '#f2c79c', shirt = '#e8743b', pants = '#2f4f8f', hair = '#5a3a22', scale = 1, hairStyle = 'short', hat = null, extras = null }) {
  const c = new THREE.Group(); const root = new THREE.Group(); c.add(root); root.scale.setScalar(scale * .5);
  const S = mat(skin), SH = mat(shirt), P = mat(pants), HM = mat(hair);
  const legs = [], arms = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .5, 2, 0); root.add(hip); const l = box(.95, 2, 1, P, .05); l.position.y = -1; hip.add(l); legs.push(hip); }
  const torso = box(2, 2, 1, SH, .08); torso.position.y = 3; root.add(torso);
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 1.5, 3.85, 0); root.add(sh); const a = box(.95, 2, 1, SH, .05); a.position.y = -.9; sh.add(a);
    const hnd = box(.9, .45, .95, S, .05); hnd.position.y = -1.95; sh.add(hnd); arms.push(sh); }
  const head = new THREE.Group(); head.position.y = 4.6; root.add(head);
  const hd = box(1.25, 1.25, 1.25, S, .25); hd.position.y = .55; head.add(hd);
  const faceM = new THREE.MeshBasicMaterial({ map: faceTex('smile'), transparent: true }); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), faceM); face.position.set(0, .55, .64); head.add(face);
  if (hairStyle === 'short') { const h1 = box(1.35, .45, 1.35, HM, .12); h1.position.y = 1.15; head.add(h1); const h2 = box(1.35, .7, .35, HM, .1); h2.position.set(0, .85, -.5); head.add(h2); }
  if (hairStyle === 'spiky') { const h1 = box(1.35, .45, 1.35, HM, .12); h1.position.y = 1.15; head.add(h1); for (let i = -1; i <= 1; i++) { const sp = box(.4, .5, .4, HM); sp.position.set(i * .4, 1.45, .3 - Math.abs(i) * .2); sp.rotation.z = -i * .3; head.add(sp); } }
  if (hairStyle === 'pigtails') { const h1 = box(1.35, .45, 1.35, HM, .12); h1.position.y = 1.15; head.add(h1); for (const s of [-1, 1]) { const p = box(.45, .8, .45, HM, .15); p.position.set(s * .85, .6, -.2); head.add(p); } }
  if (hairStyle === 'long') { const h1 = box(1.38, .45, 1.38, HM, .12); h1.position.y = 1.15; head.add(h1); const h2 = box(1.38, 1.4, .4, HM, .1); h2.position.set(0, .45, -.55); head.add(h2); }
  if (hairStyle === 'slick') { const h1 = box(1.32, .3, 1.32, HM, .1); h1.position.y = 1.2; head.add(h1); }
  if (hat === 'chef') { const b = box(1.1, 1.1, 1.1, mat('#ffffff'), .3); b.position.y = 1.75; head.add(b); }
  if (hat === 'cap') { const b = box(1.4, .45, 1.4, mat('#1d2b4f')); b.position.y = 1.35; head.add(b); const v = box(1.2, .1, .6, mat('#1d2b4f')); v.position.set(0, 1.15, .85); head.add(v); }
  if (hat === 'night') { const b = new THREE.Mesh(new THREE.ConeGeometry(.75, 1.6, 4), mat('#e88fb0')); b.position.set(0, 1.85, 0); b.rotation.set(-.4, Math.PI / 4, 0); head.add(b); }
  if (extras) extras(root, head);
  c.userData = { root, legs, arms, head, faceM, torso, shirtM: SH, pantsM: P }; scene.add(c); return c;
}
function setFace(ch, e) { ch.userData.faceM.map = faceTex(e); }
function pose(ch, kind, t, k = 1) {
  const { legs, arms, head, root } = ch.userData; legs.forEach(l => l.rotation.set(0, 0, 0)); arms.forEach(a => a.rotation.set(0, 0, 0)); head.rotation.set(0, 0, 0); root.position.y = 0; root.rotation.set(0, 0, 0);
  const s = Math.sin(t * 7);
  if (kind === 'idle') { head.rotation.y = Math.sin(t * .9) * .08; arms[0].rotation.z = -.05; arms[1].rotation.z = .05; root.position.y = Math.sin(t * 2) * .02; }
  if (kind === 'walk') { legs[0].rotation.x = s * .6; legs[1].rotation.x = -s * .6; arms[0].rotation.x = -s * .6; arms[1].rotation.x = s * .6; }
  if (kind === 'run') { const r = Math.sin(t * 13); legs[0].rotation.x = r * 1; legs[1].rotation.x = -r * 1; arms[0].rotation.x = -r * 1.1; arms[1].rotation.x = r * 1.1; root.position.y = Math.abs(r) * .25; root.rotation.x = .18; }
  if (kind === 'pray') { arms[0].rotation.set(-2.2, 0, .5); arms[1].rotation.set(-2.2, 0, -.5); head.rotation.x = -.35; }
  if (kind === 'lookup') { head.rotation.x = -.55; arms[0].rotation.z = -.1; arms[1].rotation.z = .1; }
  if (kind === 'point') { arms[1].rotation.set(-2.6, 0, 0); head.rotation.x = -.4; }
  if (kind === 'pointSide') { arms[1].rotation.set(-1.5, 0, .3); }
  if (kind === 'push') { arms[0].rotation.x = -1.55; arms[1].rotation.x = -1.55; root.rotation.x = .35; legs[0].rotation.x = .5 + s * .1; legs[1].rotation.x = -.4; }
  if (kind === 'crank') { const a = t * 9; arms[1].rotation.set(-1.4 + Math.sin(a) * .5, 0, Math.cos(a) * .3); arms[0].rotation.set(-1.4 + Math.sin(a + .4) * .5, 0, -.2); root.rotation.z = Math.sin(a) * .05; }
  if (kind === 'sit') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.9; arms[0].rotation.x = -.5; arms[1].rotation.x = -.5; }
  if (kind === 'sitConfused') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.4; root.position.y = -1.9; arms[1].rotation.set(-2.4, 0, -.3); head.rotation.z = Math.sin(t * 2) * .15; }
  if (kind === 'count') { arms[0].rotation.x = -1.1; arms[1].rotation.x = -1.1 + Math.abs(Math.sin(t * 16)) * .4; head.rotation.x = .3; }
  if (kind === 'shout') { arms[0].rotation.set(-2.6, 0, .4); arms[1].rotation.set(-2.6, 0, -.4); head.rotation.x = -.5; root.position.y = Math.abs(Math.sin(t * 6)) * .2; }
  if (kind === 'cheer') { arms[0].rotation.z = -2.6; arms[1].rotation.z = 2.6; root.position.y = Math.abs(Math.sin(t * 7)) * .5; }
  if (kind === 'close') { arms[0].rotation.set(-1.6, 0, lerp(.9, 0, k)); arms[1].rotation.set(-1.6, 0, lerp(-.9, 0, k)); }
  if (kind === 'sleep') { legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.9; head.rotation.set(.35, 0, .25 + Math.sin(t * 1.5) * .05); arms[0].rotation.x = -.3; arms[1].rotation.x = -.3; }
  if (kind === 'butt') { root.rotation.x = -.35; arms[0].rotation.z = -.6; arms[1].rotation.z = .6; legs[0].rotation.x = -.5 + s * .1; legs[1].rotation.x = .3; root.position.z = Math.sin(t * 9) * .08; }
  if (kind === 'hold') { arms[1].rotation.set(-1.2, 0, 0); }
  if (kind === 'roll') { head.rotation.x = -.35; head.rotation.y = Math.sin(t * 3) * .2; arms[0].rotation.z = -.4; arms[1].rotation.z = .4; }
}
const noe = makeChar({ shirt: '#e8743b', pants: '#2f4f8f', hair: '#4a2e1a', scale: .82, hairStyle: 'spiky' });
const jade = makeChar({ shirt: '#f28bb8', pants: '#8f4fb0', hair: '#2a1a10', scale: .66, hairStyle: 'pigtails' });
const mom = makeChar({ shirt: '#7a5fb8', pants: '#3a3a52', hair: '#3a2416', hairStyle: 'long' });
const baker = makeChar({ shirt: '#9cc3e8', pants: '#9cc3e8', hair: '#6a5a4a', hairStyle: 'short' }); // pyjama
{ const st = canvasTex(64, 64, c => { c.fillStyle = '#b9d6f2'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#5f8fc8'; for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 7); });
  baker.userData.shirtM.map = st; baker.userData.pantsM.map = st; baker.userData.shirtM.color.set('#ffffff'); baker.userData.pantsM.color.set('#ffffff'); }
const banker = makeChar({ shirt: '#4a4f5c', pants: '#3a3e48', hair: '#1c1c1c', skin: '#e8b88f', hairStyle: 'slick', extras: (root, head) => {
  const tie = box(.3, 1.4, .1, mat('#d4af37')); tie.position.set(0, 3.2, .52); root.add(tie);
  const gl = box(1.3, .12, .1, mat('#d4af37', { metalness: .8 })); gl.position.set(0, .7, .67); head.add(gl);
  const mu = box(.8, .16, .1, mat('#1c1c1c')); mu.position.set(0, .28, .67); head.add(mu); } });
const bankerPJ = makeChar({ shirt: '#f2a7c3', pants: '#f2a7c3', hair: '#1c1c1c', skin: '#e8b88f', hairStyle: 'slick', hat: 'night', extras: (root, head) => {
  const mu = box(.8, .16, .1, mat('#1c1c1c')); mu.position.set(0, .28, .67); head.add(mu); } });
const guards = [0, 1].map(() => makeChar({ shirt: '#1d2b4f', pants: '#16203a', hair: '#2a1a10', hat: 'cap' }));
const villagers = [['#d95b5b', '#3a3a3a', '#6a4a2a'], ['#5bb0d9', '#2a2a5a', '#2a1a10'], ['#e0c050', '#4a3a2a', '#8a6a3a'], ['#7bc77b', '#3a4a3a', '#1a1a1a'], ['#c07bd0', '#2a2a2a', '#d0b070'], ['#f0a050', '#3a2a5a', '#3a2010']]
  .map(([s, p, h], i) => makeChar({ shirt: s, pants: p, hair: h, hairStyle: i % 3 === 1 ? 'long' : 'short' }));
const cat = new THREE.Group(); scene.add(cat);
{ const fur = mat('#f0a040'), dark = mat('#c07020'); const b = box(1.4, .8, .7, fur, .15); b.position.y = .6; cat.add(b);
  const hd = box(.75, .7, .7, fur, .15); hd.position.set(.85, 1.05, 0); cat.add(hd);
  for (const z of [-.2, .2]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.14, .3, 4), dark); e.position.set(.85, 1.5, z); cat.add(e); }
  const tl = box(.18, .9, .18, dark); tl.position.set(-.8, 1, 0); tl.rotation.z = .5; cat.add(tl); cat.userData.tail = tl;
  for (const [x, z] of [[.5, .25], [.5, -.25], [-.5, .25], [-.5, -.25]]) { const l = box(.22, .45, .22, fur); l.position.set(x, .22, z); cat.add(l); }
  const fm = new THREE.MeshBasicMaterial({ map: faceTex('smile'), transparent: true }); const f = new THREE.Mesh(new THREE.PlaneGeometry(.66, .66), fm); f.position.set(1.23, 1.05, 0); f.rotation.y = Math.PI / 2; cat.add(f); cat.userData.faceM = fm; }
cat.position.set(4, .2, -20); cat.rotation.y = -Math.PI / 2;
const baguette = box(.25, .25, 2.2, mat('#d89a4a'), .1); baker.userData.arms[1].add(baguette); baguette.position.set(0, -2, .8);
const oneBill = box(.9, .05, .45, mat('#7fc47a')); bankerPJ.userData.arms[1].add(oneBill); oneBill.position.set(0, -2.1, .35); oneBill.rotation.x = 1.2;
// panneau « Ici, on est honnête » sur la porte de la tour
{ const tex = canvasTex(512, 256, (c) => { c.fillStyle = '#f6efdc'; c.fillRect(0, 0, 512, 256); c.strokeStyle = '#d4af37'; c.lineWidth = 14; c.strokeRect(8, 8, 496, 240);
    c.fillStyle = '#2a1c08'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = "900 64px 'Inter Display'"; c.fillText('ICI, ON EST', 256, 96); c.fillText('HONNÊTE', 256, 172); });
  window.__honestTex = tex; const sgn = box(4, 2, .15, new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: .35 })); sgn.position.set(0, 5.4, 7.15); tower.add(sgn); }
const ALL_CHARS = [noe, jade, mom, baker, banker, bankerPJ, ...guards, ...villagers];

// intérieur de la cabane (lit, volets)
const interior = new THREE.Group(); interior.position.set(200, 0, 200); scene.add(interior);
{ const wallT = canvasTex(256, 256, (c) => { for (let x = 0; x < 256; x += 16) { const gr = c.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#5f6b77'); gr.addColorStop(.5, '#8f9aa3'); gr.addColorStop(1, '#55606b'); c.fillStyle = gr; c.fillRect(x, 0, 16, 256); } });
  const wm = new THREE.MeshStandardMaterial({ map: wallT, side: THREE.BackSide, roughness: .7 }); const room = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 12), wm); room.position.y = 4; room.receiveShadow = true; interior.add(room);
  const fl = box(14, .2, 12, mat('#7a5a3a')); fl.position.y = .1; interior.add(fl);
  const bed = box(5, 1.2, 3.4, mat('#a0522d')); bed.position.set(-3.5, .8, -3.5); interior.add(bed); const bl = box(4.8, .5, 3.2, mat('#5f8fd0')); bl.position.set(-3.5, 1.6, -3.4); interior.add(bl);
  const pil = box(1.4, .5, 2.8, mat('#f0f0f0')); pil.position.set(-5.4, 1.9, -3.5); interior.add(pil);
  const tbl = box(2, 1.4, 1.4, mat('#8a6a4a')); tbl.position.set(3.5, .7, -4); interior.add(tbl);
  const cand = box(.25, .6, .25, mat('#fff3d0', { emissive: new THREE.Color('#ffcf6a'), emissiveIntensity: 2 })); cand.position.set(3.5, 1.7, -4); interior.add(cand);
  const shutters = []; for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 1.6, 4.2, -5.9); interior.add(p); const pan = box(1.6, 2.6, .15, mat('#6b4a2e')); pan.position.x = -s * .8; p.add(pan); shutters.push(p); }
  interior.userData.shutters = shutters;
  const slats = []; for (let i = 0; i < 4; i++) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(3, .14), new THREE.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); sl.position.set(0, 3.3 + i * .6, -5.8); interior.add(sl); slats.push(sl); }
  interior.userData.slats = slats;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 9), new THREE.MeshBasicMaterial({ color: '#9fb8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); shaft.position.set(0, 3, -1.5); shaft.rotation.x = -.35; interior.add(shaft); interior.userData.shaft = shaft;
  const il = new THREE.PointLight(0xffb85a, 16, 16, 1.5); il.position.set(3, 4, -2); interior.add(il); interior.userData.light = il; }
// bureau du banquier (billets)
const office = new THREE.Group(); office.position.set(-200, 0, 200); scene.add(office);
{ const room = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 12), mat('#5a3a2a', { side: THREE.BackSide })); room.position.y = 4; office.add(room);
  const fl = box(14, .2, 12, mat('#8a1c1c')); fl.position.y = .1; office.add(fl);
  const desk = box(6, 1.3, 2.6, mat('#3a2416')); desk.position.set(0, .65, 0); office.add(desk);
  const bills = []; const bm = mat('#7fc47a'); for (let i = 0; i < 9; i++) { const b = box(1.3, .35 + (i % 3) * .2, .7, bm); b.position.set(-2.2 + (i % 3) * .9 + Math.floor(i / 3) * .1, 1.5 + (i % 3) * .1, -.6 + Math.floor(i / 3) * .6); office.add(b); bills.push(b); }
  const fly = []; for (let i = 0; i < 12; i++) { const b = box(.9, .02, .45, bm); b.castShadow = false; office.add(b); fly.push(b); } office.userData.fly = fly;
  const ol = new THREE.PointLight(0xffd27a, 26, 18, 1.4); ol.position.set(0, 6, 3); office.add(ol);
  const lampT = canvasTex(256, 256, c => { c.fillStyle = '#3a2416'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#d4af37'; c.font = "900 180px 'Inter Display'"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 128, 140); });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: lampT })); pic.position.set(0, 5, -5.95); office.add(pic); }
// escalier en colimaçon
const stairs = new THREE.Group(); stairs.position.set(0, 0, 300); scene.add(stairs);
{ const col = box(2, 80, 2, mat('#6a6f7c')); col.position.y = 40; stairs.add(col); const sm = mat('#8f94a0');
  for (let i = 0; i < 260; i++) { const a = i * .35, y = i * .3; const st = box(3.5, .25, 1.4, sm); st.position.set(Math.cos(a) * 2.8, y, Math.sin(a) * 2.8); st.rotation.y = -a; stairs.add(st); }
  const wallS = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 80, 24, 1, true), mat('#3a3f4c', { side: THREE.BackSide })); wallS.position.y = 40; stairs.add(wallS);
  for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffd8a0, 10, 14, 1.5); l.position.set(0, 4 + i * 10, 0); stairs.add(l); } }

// rayon de lune (cône additif) + lueur au sol
const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { col: { value: new THREE.Color('#bcd0ff') }, a: { value: 0 }, t: { value: 0 } },
  vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 col; uniform float a, t; varying vec2 vu; void main(){ float edge = 1. - abs(vu.x*2.-1.); edge = pow(edge, .6); float n = .85 + .15*sin(vu.y*40. - t*6.); gl_FragColor = vec4(col, a * edge * n * (.35 + .65*vu.y)); }' });
function makeBeam(color) { const m = beamMat.clone(); m.uniforms.col.value = new THREE.Color(color); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), m); b.visible = false; scene.add(b); return b; }
const beamA = makeBeam('#bcd0ff'), beamB = makeBeam('#bcd0ff'), beamRed = makeBeam('#ff5a5a');
function setBeam(b, from, to, r0, r1, a, t) { const d = to.clone().sub(from), L = d.length(); b.geometry.dispose(); b.geometry = new THREE.CylinderGeometry(r0, r1, L, 32, 1, true);
  b.position.copy(from).add(to).multiplyScalar(.5); b.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize().negate()); b.material.uniforms.a.value = a; b.material.uniforms.t.value = t; b.visible = a > .01; }
const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
spot.rotation.x = -Math.PI / 2; scene.add(spot);
const beamLight = new THREE.PointLight(0xbcd0ff, 0, 40, 1.2); scene.add(beamLight);
// étincelles de disparition
const sparkMat = new THREE.PointsMaterial({ color: '#dfe8ff', size: 7, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const sparks = new THREE.Points(new THREE.BufferGeometry(), sparkMat); { const p = new Float32Array(300 * 3); sparks.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); } scene.add(sparks);
const sparkSeeds = []; { const r = rng(21); for (let i = 0; i < 300; i++) sparkSeeds.push([r() - .5, r(), r() - .5, .5 + r()]); }
function setSparks(c, size, k, a) { const p = sparks.geometry.attributes.position.array; sparkSeeds.forEach((s, i) => { p[i * 3] = c.x + s[0] * size[0]; p[i * 3 + 1] = c.y + s[1] * size[1] + k * 12 * s[3]; p[i * 3 + 2] = c.z + s[2] * size[2]; });
  sparks.geometry.attributes.position.needsUpdate = true; sparkMat.opacity = a; sparks.visible = a > .01; }

// ---------------------------------------------------------------- chronologie (mots)
const w = i => CAP[i].t + VO, we = i => CAP[i].e + VO;
const nrm = x => x.toLowerCase().replace(/[.,:;!?…«»"]/g, '');
function find(word, occ = 1) { let n = 0; for (const c of CAP) if (nrm(c.w) === nrm(word) && ++n === occ) return c.t + VO; throw new Error('mot introuvable: ' + word + ' #' + occ); }
function buildEvents() {
  const e = { choisit: find('choisit'), disparait: find('disparaît'), canape: find('canapé'), gens: find('gens', 2), boulangerie: find('boulangerie'), boulanger: find('boulanger'),
    baguette: find('baguette'), seule: find('seule'), minuit: find('minuit'), ciel: find('ciel'), prie: find('prie'), voisin: find('voisin'), noe: find('noé'), cabane: find('cabane'),
    jade: find('jade'), six: find('six'), zero: find('zéro'), voit: find('voit'), tour: find('tour'), quarante: find('quarante'), haut: find('haut'), panneau: find('panneau'),
    honnete: find('honnête'), evid: find('évidemment'), nuit: find('nuit', 2), rayon: find('rayon'), maman: find('maman'), volets: find('volets'), lumiere: find('lumière'),
    yeux: find('yeux'), jadeFix: find('jade', 2), noe2: find('noé', 2), rebondit: find('rebondit'), antenne2: find("l'antenne"), miroir: find('miroir'), renvoyait: find('renvoyait'),
    croissants: find('croissants'), couru: find('couru'), quarante2: find('quarante', 2), pied: find('pied'), ascenseur: find("l'ascenseur"), gardes: find('gardes'),
    banquier2: find('banquier', 3), billets: find('billets'), pousse: find('miroir', 2), rien: find('rien'), fesses: find('fesses'), bas: find('bas'), voyais: find('voyais'),
    crier: find('crier'), manivelle: find('manivelle'), clac1: find('clac'), clac2: find('clac', 2), clac3: find('clac', 3), toits: find('toits'), place: find('place'),
    chat: find('chat'), remonte: find('remonté'), matin2: find('matin', 3), plusla: find('là'), bankerPJ: find('banquier', 4), billet: find('billet'), depuis: find('depuis'),
    entre: find('entre'), ronfle: find('ronfle'), regarde: find('regarde', 2), hier: find('hier'), rouge: find('rouge'), pasLune: find('venait') };
  e.pain = e.boulangerie + .2; e.four = e.boulangerie + 1.1; e.pyjama = e.baguette; e.tourne2 = e.clac1 - .35; e.encore = e.clac2; e.encore2 = e.clac3; e.deuxieme = e.rouge - .5;
  e.banquier = find('banquier'); return e;
}

// ---------------------------------------------------------------- plans (coupes franches)
let SHOTS = [];
function buildShots() {
  const S = []; const add = (t, p0, c0, f0, p1, c1, f1, sh = 40) => S.push({ t, p0: V(...p0), c0: V(...c0), f0, p1: V(...(p1 || p0)), c1: V(...(c1 || c0)), f1: f1 || f0, sh });
  const fh = firstHouse.position, cb = cabin.position, F = V(54, 0, 4.6), T = TOWER;
  const near = (t, tgt, off, fov, k = .85, sh = 10) => (off = off.clone().multiplyScalar(1.7), add(t, tgt.clone().add(off).toArray(), tgt.toArray(), fov, tgt.clone().add(off.clone().multiplyScalar(k)).toArray(), tgt.toArray(), fov - 3, sh));
  add(0, [-10, 40, 70], [-20, 8, 0], 50, [-14, 30, 52], [-25, 6, 0], 48, 90);
  add(w(5) - .05, [fh.x + 26, 22, fh.z - 34], [fh.x, 4, fh.z], 44, [fh.x + 20, 16, fh.z - 26], [fh.x, 4, fh.z], 42, 40);
  add(E.disparait - .1, [fh.x + 12, 6, fh.z - 18], [fh.x, 3.5, fh.z], 46, [fh.x + 10, 5, fh.z - 15], [fh.x, 3.5, fh.z], 44, 30);
  add(E.boulangerie - .1, [-25, 4.5, 4], [-25, 4.2, -13], 46, [-25, 4.2, 2], [-25, 4.2, -13], 44, 30);
  near(E.gens - .1, V(fh.x, 1.2, fh.z), V(-2.5, 1.2, -5), 44);
  near(E.boulanger - .1, V(-25, 1.3, -13), V(2.2, .9, 5), 40);
  near(E.seule - .15, V(-24.2, 1.2, -12.2), V(1.4, .5, 2.6), 34);
  add(E.minuit - .1, [-12, 16, -18], [-12, 18, -30], 40, [-12, 17, -22], [-12, 18, -30], 34, 30);
  near(E.prie - .2, V(1, 2.2, -7.5), V(4, .6, 9), 46, .8, 15);
  near(E.voisin - .15, V(-2, 1.9, -7), V(3.5, .8, 8), 44, .8, 15);
  near(E.noe - .1, V(54, 2.1, 4.6), V(-3.6, .3, -1.4), 34);
  add(E.cabane - .1, [34, 7, -4], [58, 2.5, 9], 42, [38, 6, -3], [58, 2.5, 9], 40, 30);
  near(E.jade - .1, V(54.3, 1.7, 6.2), V(-3, .2, -1.6), 34);
  near(E.zero - .1, V(54.3, 1.6, 6.2), V(-1.6, .1, -.9), 30);
  add(E.voit - .1, [48, .8, 3], [54.3, 3.6, 6.2], 52, [49.5, .8, 3.6], [54.3, 3.6, 6.2], 50, 15);
  add(E.tour - .1, [T.x + 8, 2, T.z + 30], [T.x, 40, T.z], 54, [T.x + 6, 2, T.z + 26], [T.x, 55, T.z], 54, 90);
  add(E.haut - .1, [T.x + 13, TOWER_H + 10, T.z + 18], [T.x, TOWER_H + 8, T.z], 40, [T.x + 11, TOWER_H + 10, T.z + 15], [T.x, TOWER_H + 8, T.z], 38, 25);
  near(E.banquier - .1, V(T.x, 2.5, T.z + 8.8), V(2, .3, 4.2), 36);
  near(E.panneau - .1, V(T.x, 5.2, T.z + 7.2), V(1.5, -.4, 5), 40);
  near(E.evid - .05, V(54, 2.1, 4.6), V(-3.2, .2, -1.2), 32);
  add(E.nuit - .1, [28, 16, -14], [58, 3, 9], 46, [34, 13, -10], [58, 3, 9], 44, 40);
  add(E.maman - .1, [200, 4.6, 205.6], [200, 2.2, 195], 54, [200, 4.4, 205], [200, 2.2, 195], 52, 15);
  near(E.yeux - .1, V(200, 2.6, 196.5), V(0, .2, -1.6), 44);
  near(E.jadeFix - .1, V(54.3, 1.8, 6), V(-2.4, .5, -2.6), 38);
  add(E.rebondit - .25, [cb.x + 30, 60, 120], [(T.x + cb.x) / 2, 30, (T.z + cb.z) / 2], 52, [cb.x + 26, 56, 110], [(T.x + cb.x) / 2, 32, (T.z + cb.z) / 2], 52, 120);
  add(E.antenne2 - .1, [T.x + 10, TOWER_H + 10, T.z + 14], [T.x, TOWER_H + 8, T.z], 38, [T.x + 8, TOWER_H + 9.5, T.z + 11], [T.x, TOWER_H + 8, T.z], 36, 25);
  add(E.renvoyait - .1, [-20, 70, 80], [10, 10, -20], 48, [-14, 64, 70], [12, 10, -20], 48, 140);
  near(E.croissants - .25, V(-200, 2.2, 198.8), V(1.6, .5, 3.4), 40);
  add(E.couru - .1, [36, 2, 3.5], [24, 1.6, 0], 48, [22, 2, 3.5], [10, 1.6, 0], 48, 20);
  add(E.quarante2 - .1, [7, 6, 300], [0, 12, 300], 60, [7, 70, 300], [0, 76, 300], 60, 20);
  near(E.ascenseur - .1, V(T.x, 2.4, T.z + 7.2), V(2, .4, 5.5), 44);
  near(E.gardes - .1, V(T.x, 1.2, T.z + 10), V(3, 1.2, 6), 44, .85, 15);
  near(E.banquier2 - .1, V(-200, 2.2, 198.8), V(2.4, .9, 5.5), 42, .8, 15);
  add(E.pousse - .1, [T.x + 9, TOWER_H + 5, T.z + 9], [T.x + .5, TOWER_H + 4.5, T.z], 44, [T.x + 8, TOWER_H + 4.6, T.z + 8], [T.x + .5, TOWER_H + 4.5, T.z], 42, 20);
  add(E.fesses - .15, [T.x + 4, TOWER_H + 3.6, T.z + 6], [T.x + .9, TOWER_H + 2.8, T.z + 1.3], 40, [T.x + 3.5, TOWER_H + 3.4, T.z + 5.3], [T.x + .9, TOWER_H + 2.8, T.z + 1.3], 36, 15);
  add(E.bas - .1, [44, 7, -4], [58, 2.5, 9], 42, [46, 6, -3], [58, 2.5, 9], 40, 25);
  near(E.voyais - .1, V(58, 2.2, 10), V(-4, .6, -6), 42);
  near(E.crier - .1, V(52, 1.8, 3.5), V(-2.6, -.3, -3), 38);
  add(E.manivelle - .1, [T.x + 9, TOWER_H + 4.2, T.z - 3], [T.x + 3, TOWER_H + 2.8, T.z + .6], 40, [T.x + 8, TOWER_H + 4, T.z - 2.5], [T.x + 3, TOWER_H + 2.8, T.z + .6], 36, 15);
  near(E.chat - .2, V(cat.position.x, .9, cat.position.z), V(3.5, 1.6, 4.5), 46);
  add(E.clac2 - .05, [T.x + 13, TOWER_H + 11, T.z + 17], [T.x, TOWER_H + 6, T.z], 44, [T.x + 11, TOWER_H + 10, T.z + 15], [T.x, TOWER_H + 6, T.z], 44, 30);
  add(E.toits - .1, [60, 55, 70], [20, 5, 0], 50, [40, 50, 60], [5, 5, -10], 50, 140);
  add(E.remonte - .1 + 0, [T.x + 30, 4, T.z + 60], [T.x, 30, T.z], 52, [T.x + 26, 4, T.z + 52], [T.x, 55, T.z], 52, 100);
  add(E.matin2 - .1, [T.x + 20, 14, T.z + 34], [T.x, 2, T.z], 46, [T.x + 16, 11, T.z + 28], [T.x, 2, T.z], 44, 40);
  near(E.bankerPJ - .1, V(T.x, 1.3, T.z), V(2.2, .8, 4.6), 40);
  near(E.billet - .1, V(T.x + .5, 1, T.z + .6), V(1.2, .5, 2.2), 34);
  add(E.depuis - .1, [196.5, 4.5, 201.5], [196.5, 1.8, 196.5], 46, [196.5, 4.1, 200.8], [196.5, 1.8, 196.5], 44, 15);
  add(E.ronfle - .2, [196.5, 3.4, 199.8], [196.5, 1.8, 196.5], 44, [196.5, 3.2, 199.3], [196.5, 1.8, 196.5], 40, 15);
  near(E.regarde - .1, V(54, 2.6, 4.6), V(-3, -.6, -2), 40);
  add(E.hier - .1, [51.5, 2.3, 3], [10, 40, -300], 50, [51.5, 2.3, 3.3], [-10, 50, -330], 46, 40);
  add(E.pasLune - .1, [51, 2.2, 2.6], [-40, 60, -340], 34, [51, 2.2, 2.6], [-40, 60, -340], 26, 40);
  S.sort((a, b) => a.t - b.t); return S;
}
function cameraAt(t) {
  let s = SHOTS[0], next = null; for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i].t <= t) { s = SHOTS[i]; next = SHOTS[i + 1]; }
  const t1 = next ? next.t : END, k = ease(seg(t, s.t, t1)) * .6 + seg(t, s.t, t1) * .4;
  const p = s.p0.clone().lerp(s.p1, k), c = s.c0.clone().lerp(s.c1, k);
  let sh = 0; if (t > E.rien && t < E.rien + .5) sh += .15 * (1 - seg(t, E.rien, E.rien + .5)); if (t > E.encore2 && t < E.encore2 + .6) sh += .25; if (t > E.plusla && t < E.plusla + .4) sh += .4 * (1 - seg(t, E.plusla, E.plusla + .4));
  p.x += Math.sin(t * 43) * sh; p.y += Math.cos(t * 37) * sh;
  return { p, c, f: lerp(s.f0, s.f1, k), sh: s.sh, cut: t - s.t };
}

// ---------------------------------------------------------------- état de la scène à t
function place(ch, x, y, z, ry = 0) { ch.position.set(x, y, z); ch.rotation.y = ry; ch.visible = true; }
function update(t) {
  const cb = cabin.position, fh = firstHouse.position;
  // ciel : matin entre « Au matin » et « Depuis »
  const morning = win(t, E.matin2 - .1, E.depuis - .1, .3);
  skyMat.uniforms.top.value.set('#3a2a7a').lerp(new THREE.Color('#5fb0f0'), morning); skyMat.uniforms.mid.value.set('#9a5aa8').lerp(new THREE.Color('#bfe2ff'), morning); skyMat.uniforms.bot.value.set('#f29a8a').lerp(new THREE.Color('#fff1d6'), morning);
  scene.fog.color.set('#8a5a9a').lerp(new THREE.Color('#e8f2ff'), morning); stars.material.opacity = 1 - morning; moon.visible = moonGlow.visible = morning < .5;
  hemi.color.set('#d8b0f0').lerp(new THREE.Color('#fff4e6'), morning); hemi.groundColor.set('#4a3a5a'); hemi.intensity = lerp(1.5, 1.8, morning); key.color.set('#ffc8b0').lerp(new THREE.Color('#fff0d0'), morning); key.intensity = lerp(1.6, 2.8, morning);
  lamps.forEach(l => l.material.emissiveIntensity = 2 * (1 - morning)); streetLights.forEach(l => l.intensity = 18 * (1 - morning)); winMat.emissiveIntensity = 1.2 * (1 - morning);
  // horloge
  clockTower.userData.min.rotation.z = -lerp(-.4, 0, seg(t, E.minuit - .3, E.minuit + .5)) * 6.283; clockTower.userData.hour.rotation.z = 0;
  // disparitions
  const fFirst = 1 - seg(t, E.disparait, E.disparait + 1.2); setFade(firstHouse, t < E.boulangerie ? fFirst : 0); patchFirst.visible = t > E.disparait + .6 && t < E.boulangerie;
  const fBak = t < E.boulangerie ? 1 : 1 - seg(t, E.pain - .1, E.four + .6); setFade(bakery, fBak); patchBakery.visible = fBak < .4 && t < E.minuit;
  const fCab = t < E.bas ? 1 : lerp(1, .3, seg(t, E.bas, E.crier)) + (t > E.toits ? seg(t, E.toits, E.toits + 1) * .7 : 0); setFade(cabin, clamp(fCab));
  const fTow = t < E.remonte + .3 ? 1 : 1 - seg(t, E.remonte + .3, E.matin2 - .2); tower.visible = fTow > .01; for (const m of towerMats) { m.opacity = fTow; m.transparent = true; } patchTower.visible = t > E.matin2 - .2;
  // étincelles
  let sp = 0; if (t > E.disparait && t < E.disparait + 1.6) setSparks(fh, [9, 8, 8], seg(t, E.disparait, E.disparait + 1.6), sp = 1 - seg(t, E.disparait + .8, E.disparait + 1.6));
  else if (t > E.pain && t < E.four + 1.2) setSparks(bakery.position, [11, 8, 9], seg(t, E.pain, E.four + 1.2), sp = 1 - seg(t, E.four + .4, E.four + 1.2));
  else if (t > E.remonte + .3 && t < E.matin2) setSparks(V(TOWER.x, 20, TOWER.z), [16, 70, 16], seg(t, E.remonte + .3, E.matin2), sp = 1 - seg(t, E.matin2 - .5, E.matin2));
  else if (t > E.bas && t < E.manivelle) setSparks(cb, [7, 6, 7], (t * .5) % 1, sp = .5);
  if (!sp) sparks.visible = false;
  // rayons
  const mirrorW = V(TOWER.x, TOWER_H + 8, TOWER.z); const moonP = moon.position;
  let target = null, beamOn = 0, showTrue = false;
  if (t > E.choisit - .3 && t < E.disparait + 1.3) { target = fh.clone(); beamOn = win(t, E.choisit - .3, E.disparait + 1.3, .3); }
  if (t > E.pain - .6 && t < E.four + 1.2) { target = bakery.position.clone(); beamOn = win(t, E.pain - .6, E.four + 1.2, .3); }
  if (t > E.prie && t < E.voisin + 1) { target = V(10, 0, 12); beamOn = win(t, E.prie, E.voisin + 1, .3) * .7; }
  if (t > E.rayon - .2 && t < E.toits) { target = cb.clone(); beamOn = 1; showTrue = t > E.rebondit - .3; }
  if (t > E.toits - .2 && t < E.remonte + 1.6) { showTrue = true; beamOn = 1 - seg(t, E.remonte + 1, E.remonte + 1.6);
    const K = [[E.toits - .2, V(cb.x, 6, cb.z)], [E.place, V(10, 6, -6)], [E.chat, V(cat.position.x, .5, cat.position.z)], [E.remonte - .2, V(TOWER.x, 2, TOWER.z + 7)], [E.remonte + .6, V(TOWER.x, TOWER_H * .95, TOWER.z + 7)]];
    let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; target = K[i][1].clone().lerp(K[i + 1][1], ease(seg(t, K[i][0], K[i + 1][0]))); }
  // le miroir : orientation vers la cible
  if (target) { const dir = target.clone().sub(mirrorW).normalize(), dIn = moonP.clone().sub(mirrorW).normalize(); const n = dir.add(dIn).normalize();
    mirrorPivot.lookAt(mirrorW.clone().add(n)); }
  mirrorG.userData.crank.rotation.x = [E.clac1, E.clac2, E.clac3].reduce((a, c) => a + easeOut(seg(t, c - .1, c + .2)) * 2.1, 0);
  if (target && beamOn > 0) {
    if (showTrue) { setBeam(beamA, moonP.clone().lerp(mirrorW, .93), mirrorW, 2.5, 4.6, beamOn * .55, t); setBeam(beamB, mirrorW, target, 4.4, 5.5, beamOn * .8, t); }
    else { setBeam(beamA, target.clone().add(V(-30, 160, -40)), target, 4, 6.5, beamOn * .85, t); beamB.visible = false; }
    spot.position.set(target.x, (target.y || 0) + .3, target.z); spot.scale.setScalar(6.5); spot.material.opacity = beamOn * .5; beamLight.position.set(target.x, (target.y || 0) + 6, target.z); beamLight.intensity = beamOn * 60;
  } else { beamA.visible = beamB.visible = false; spot.material.opacity = 0; beamLight.intensity = 0; }
  // le second rayon (rouge) au loin
  const red = seg(t, E.rouge - .3, E.rouge + .3); if (red > 0) setBeam(beamRed, V(-40, 20, -340), V(-40, 600, -350), 3, 18, red * .9, t); else beamRed.visible = false;
  // intérieurs
  const sh = interior.userData.shutters; const ck = ease(seg(t, E.volets - .4, E.volets + .3)); sh[0].rotation.y = lerp(1.6, 0, ck); sh[1].rotation.y = lerp(-1.6, 0, ck);
  interior.userData.slats.forEach(s => s.material.opacity = seg(t, E.lumiere - .2, E.lumiere + .3) * .9); interior.userData.shaft.material.opacity = seg(t, E.lumiere - .2, E.lumiere + .3) * .12;
  interior.userData.light.color.set(t > E.depuis ? '#ffb85a' : '#ffb85a');
  office.userData.fly.forEach((b, i) => { const k = ((t * 1.3 + i / 12) % 1); b.position.set(-1 + Math.sin(i * 3) * 2, 1.7 + k * 2.5, Math.cos(i * 5) * 1.2); b.rotation.set(k * 6, i, k * 4); b.visible = t > E.billets - .6 && t < E.pousse; });

  // personnages (positions par plan)
  ALL_CHARS.forEach(c => c.visible = false);
  const S = (a, b) => t >= a && t < b;
  const toTower = Math.atan2(TOWER.x - 54, TOWER.z - 6);
  if (S(E.gens - .2, E.boulangerie - .1)) [villagers[0], villagers[3]].forEach((v, i) => { place(v, fh.x - 1.5 + i * 2.6, .3, fh.z + .5, Math.PI + .3 - i * .5); setFace(v, 'surprised'); pose(v, 'sitConfused', t + i); });
  if (S(E.boulanger - .2, E.minuit)) { place(baker, -25, .3, -13, .2); setFace(baker, t > E.pyjama ? 'surprised' : 'sleep'); pose(baker, t > E.pyjama ? 'sitConfused' : 'sleep', t); }
  if (S(E.prie - .3, E.voisin - .15)) villagers.forEach((v, i) => { place(v, -3 + i * 1.6, .3, -7.5 + (i % 2) * .8, .1); setFace(v, 'worried'); pose(v, 'pray', t + i); });
  if (S(E.voisin - .15, E.noe - .1)) villagers.forEach((v, i) => { const left = i < 3; place(v, -4 + (i % 3) * 1.6 + (left ? 0 : .8), .3, left ? -7.6 : -5.6, left ? .5 : -2.6); setFace(v, 'smug'); pose(v, 'pointSide', t + i); });
  if (S(E.noe - .2, E.jade - .1)) { place(noe, 54, .2, 4.6, -Math.PI / 2 - .3); setFace(noe, 'smile'); pose(noe, 'idle', t); place(jade, 54.4, .2, 6.3, -Math.PI / 2 - .5); setFace(jade, 'smile'); pose(jade, 'idle', t + 1); }
  if (S(E.jade - .1, E.tour - .1)) { place(jade, 54.3, .2, 6.2, -Math.PI / 2 - .4); setFace(jade, t > E.voit - .2 ? 'happy' : 'smile'); pose(jade, t > E.voit - .2 ? 'point' : 'idle', t); place(noe, 54.2, .2, 4.4, -Math.PI / 2 - .2); setFace(noe, 'smile'); pose(noe, 'idle', t); }
  if (S(E.banquier - .2, E.evid - .05)) { place(banker, TOWER.x, .2, TOWER.z + 8.8, 0); setFace(banker, 'smug'); pose(banker, 'idle', t); }
  if (S(E.evid - .1, E.nuit - .1)) { place(noe, 54, .2, 4.6, -Math.PI / 2 - .3); setFace(noe, 'side'); pose(noe, 'roll', t); }
  if (S(E.maman - .2, E.jadeFix - .1)) { place(mom, 200, .2, 196.5, Math.PI); setFace(mom, t > E.yeux ? 'sleep' : 'worried'); pose(mom, 'close', t, ease(seg(t, E.volets - .4, E.volets + .3))); place(noe, 198.2, .2, 198.5, Math.PI - .6); setFace(noe, 'worried'); pose(noe, 'idle', t);
    place(jade, 201.8, .2, 198.5, Math.PI + .6); setFace(jade, 'worried'); pose(jade, 'idle', t); }
  if (S(E.jadeFix - .1, E.rebondit - .25)) { place(jade, 54.3, .2, 6, toTower); setFace(jade, t > E.noe2 ? 'surprised' : 'worried'); pose(jade, t > E.noe2 ? 'point' : 'lookup', t); }
  if (S(E.couru - .1, E.quarante2 - .1)) { const k = seg(t, E.couru - .1, E.quarante2); place(noe, lerp(32, 6, k), .2, 0, -Math.PI / 2); setFace(noe, 'angry'); pose(noe, 'run', t); }
  if (S(E.quarante2 - .1, E.gardes - .1)) { const k = seg(t, E.quarante2 - .1, E.gardes - .1), i = k * 220, a = i * .35; place(noe, Math.cos(a) * 2.8, i * .3 + .2, 300 + Math.sin(a) * 2.8, -a + Math.PI); setFace(noe, 'effort'); pose(noe, 'run', t); }
  if (S(E.gardes - .1, E.banquier2 - .1)) guards.forEach((gd, i) => { place(gd, TOWER.x + (i ? 1.6 : -1.6), 1, TOWER.z + 10, 0); setFace(gd, 'sleep'); pose(gd, 'sleep', t + i); });
  if (S(E.croissants - .3, E.couru - .1)) { place(banker, -200, .2, 198.6, 0); setFace(banker, 'smug'); pose(banker, 'idle', t); }
  if (S(E.banquier2 - .1, E.pousse - .1)) { place(banker, -200, .2, 198.6, 0); setFace(banker, t > E.billets + .6 ? 'sleep' : 'happy'); pose(banker, 'count', t); }
  if (S(E.pousse - .1, E.bas - .1)) { place(noe, TOWER.x + .9, TOWER_H + 1.8, TOWER.z + 1.3, -2.5); const bt = t > E.fesses - .1; if (bt) noe.rotation.y = -2.5 + Math.PI; setFace(noe, t > E.fesses + .9 ? 'sad' : (t > E.rien && !bt ? 'sad' : 'effort')); pose(noe, bt ? 'butt' : (t > E.rien ? 'idle' : 'push'), t); }
  if (S(E.bas - .1, E.crier - .1)) { place(mom, 58, .2, 10, Math.PI + .4); setFace(mom, 'surprised'); pose(mom, 'idle', t); }
  if (S(E.crier - .1, E.manivelle - .1)) { place(jade, 52, .2, 3.5, toTower); setFace(jade, 'shout'); pose(jade, 'shout', t); }
  if (S(E.manivelle - .1, E.toits - .1)) { place(noe, TOWER.x + 3.1, TOWER_H + 1.8, TOWER.z + 1.4, Math.PI); setFace(noe, t > E.tourne2 ? 'effort' : 'surprised'); pose(noe, t > E.tourne2 ? 'crank' : 'idle', t); }
  cat.visible = t > E.toits - .5 && t < E.remonte; { const j = t > E.chat ? Math.max(0, Math.sin(seg(t, E.chat, E.chat + .5) * Math.PI)) : 0; cat.position.y = .2 + j * 1.6; cat.userData.faceM.map = faceTex(t > E.chat - .05 ? 'angry' : 'smile'); cat.userData.tail.rotation.z = .5 + Math.sin(t * 6) * .3 + (t > E.chat ? 1 : 0); }
  if (S(E.bankerPJ - .2, E.depuis - .1)) { place(bankerPJ, TOWER.x, .3, TOWER.z, .4); setFace(bankerPJ, 'surprised'); pose(bankerPJ, 'sitConfused', t); }
  if (S(E.depuis - .1, E.regarde - .1)) { place(bankerPJ, 196.5, 1.3, 196.4, 0); setFace(bankerPJ, 'sad'); pose(bankerPJ, 'sleep', t); place(noe, 195.3, 1.3, 196.4, 0); setFace(noe, 'sleep'); pose(noe, 'sleep', t);
    place(jade, 197.7, 1.3, 196.4, 0); setFace(jade, 'sleep'); pose(jade, 'sleep', t + 1); }
  if (S(E.regarde - .1, E.hier - .1)) { place(bankerPJ, 54, .2, 4.6, -Math.PI / 2 - .2); setFace(bankerPJ, 'worried'); pose(bankerPJ, 'lookup', t); }
  if (S(E.hier - .1, END)) { place(jade, 49.6, .2, -1.2, Math.PI - .25); setFace(jade, 'surprised'); pose(jade, 'point', t); place(noe, 51.2, .2, -.6, Math.PI - .25); setFace(noe, 'surprised'); pose(noe, 'lookup', t); }
}

// ---------------------------------------------------------------- habillage 2D
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function label(text, x, y, a, opt = {}) {
  if (a <= 0) return; const size = opt.size || 64; g.save(); g.globalAlpha = clamp(a); g.translate(x, y); g.rotate(opt.rot || 0); const s = easeBack(clamp(a * 1.6)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(text).width + size * .9, th = size * 1.5;
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 20; g.shadowOffsetY = 6; g.fillStyle = opt.bg || '#1b1f3a'; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, th / 2.4); g.fill();
  g.shadowColor = 'transparent'; g.lineWidth = 6; g.strokeStyle = opt.border || '#ffd84a'; g.stroke(); g.fillStyle = opt.color || '#ffd84a'; g.fillText(text, 0, 3); g.restore();
}
function zzz(x, y, t, txt = 'Z') { g.save(); g.font = "900 54px 'Inter Display'"; g.fillStyle = '#fff'; g.strokeStyle = '#1b1f3a'; g.lineWidth = 8; for (let i = 0; i < 3; i++) { const k = (t * .7 + i / 3) % 1; g.globalAlpha = 1 - k; g.strokeText(txt, x + k * 60 + i * 10, y - k * 120); g.fillText(txt, x + k * 60 + i * 10, y - k * 120); } g.restore(); }
function overlays(t) {
  const cb = cabin.position;
  label('UNE SEULE.', 540, 400, win(t, E.seule, E.minuit - .1), { size: 70, rot: -.05 });
  label('6 ANS', 540, 380, win(t, E.six, E.zero), { size: 72, bg: '#4a1d3a', border: '#ff9bd0', color: '#ff9bd0' });
  label('ZÉRO PEUR', 540, 380, win(t, E.zero, E.voit - .1), { size: 76, bg: '#4a1d3a', border: '#ff9bd0', color: '#ff9bd0', rot: .04 });
  label('CARTE OR REQUISE', 540, 380, win(t, E.ascenseur, E.gardes - .1), { size: 58, bg: '#2a1f05', border: '#d4af37', color: '#ffd76a' });
  label('PAS FAN DES CROISSANTS', 540, 380, win(t, E.croissants - .2, E.couru - .1), { size: 50 });
  [E.clac1, E.clac2, E.clac3].forEach((c, i) => label('CLAC !', 540 + (i - 1) * 180, 420 + i * 70, win(t, c - .05, c + .55, .08), { size: 84 + i * 14, rot: (i - 1) * .12, bg: '#3a0d12', border: '#ffd84a', color: '#ffd84a' }));
  label('1 BILLET', 540, 400, win(t, E.billet, E.depuis - .1), { size: 76, bg: '#0f3a1c', border: '#7fe08a', color: '#9ff0a8' });
  label('NOÉ', 540, 420, win(t, E.noe + .2, E.cabane - .1), { size: 72 });
  label('JADE', 540, 420, win(t, E.jade + .1, E.six - .05), { size: 72, bg: '#4a1d3a', border: '#ff9bd0', color: '#ff9bd0' });
  label('« LA LUNE, ELLE VOIT TOUT »', 540, 380, win(t, E.voit - .2, E.tour - .1), { size: 46 });
  label('40 ÉTAGES', 540, 380, win(t, E.quarante, E.haut - .1), { size: 76 });
  label('HONNÊTE ?', 540, 380, win(t, E.honnete, E.evid - .05), { size: 70, rot: -.06 });
  label('MIROIR', 540, 380, win(t, E.miroir + .3, E.renvoyait - .1), { size: 76, bg: '#0e2a4a', border: '#9fd0ff', color: '#e8f4ff' });
  label('40 ÉTAGES', 540, 380, win(t, E.quarante2, E.gardes - .1), { size: 76 });
  label('RIEN.', 540, 400, win(t, E.rien, E.fesses - .15), { size: 90, bg: '#3a0d12', border: '#ff4b4b', color: '#ff6b6b' });
  label('LE LENDEMAIN', 540, 380, win(t, E.matin2, E.plusla + 1), { size: 64 });
  if (t > E.gardes && t < E.banquier2 - .1) for (const gd of guards) { const [x, y] = project(gd.position.clone().add(V(0, 5.5, 0))); zzz(x, y, t); }
  if (t > E.depuis && t < E.regarde - .1) { const [x, y] = project(V(196.5, 3, 196.6)); zzz(x, y, t, t > E.ronfle - .1 ? 'RONF' : 'Z'); }
  // flash à la disparition de la tour
  const fl = (t > E.remonte + .3 ? .7 * Math.exp(-(t - E.remonte - .3) * 5) : 0) + (t > E.rebondit ? .35 * Math.exp(-(t - E.rebondit) * 7) : 0);
  if (fl > .01) { g.fillStyle = `rgba(220,230,255,${Math.min(.9, fl)})`; g.fillRect(0, 0, W, H); }
}
function caption(t) {
  let cur = -1; for (let i = 0; i < CAP.length; i++) if (CAP[i].t + VO <= t) cur = i;
  if (cur < 0) return; const c = CAP[cur], nx = CAP[cur + 1]; const endT = nx && nx.t - c.e < .7 ? nx.t + VO : c.e + VO + .3; if (t > endT) return;
  const k = easeBack(seg(t, c.t + VO, c.t + VO + .12)); g.save(); g.translate(540, 1200); g.scale(lerp(.8, 1, k), lerp(.8, 1, k));
  let size = 92; g.font = `900 ${size}px 'Inter Display'`; while (g.measureText(c.w).width > 920) { size -= 6; g.font = `900 ${size}px 'Inter Display'`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = '#111'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.strokeText(c.w, 0, 0); g.shadowColor = 'transparent'; g.fillStyle = '#ffe14d'; g.fillText(c.w, 0, 0); g.restore();
}

// ---------------------------------------------------------------- rendu
window.setTiming = d => { CAP = d.captions; E = buildEvents(); END = CAP[CAP.length - 1].e + VO + 1.8; SHOTS = buildShots(); window.DURATION = END; return END; };
window.render = function (t) {
  update(t);
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; camera.updateProjectionMatrix();
  const s = cam.sh; key.target.position.copy(cam.c); key.position.copy(cam.c).addScaledVector(MOON_DIR, s * 3); const sc = key.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .1; sc.far = s * 8; sc.updateProjectionMatrix();
  camLight.position.copy(cam.p).add(V(0, 1.5, 0)).lerp(cam.c, .25);
  composer.render();
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(glc, 0, 0);
  overlays(t);
  const v = g.createRadialGradient(540, 900, 520, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,0,40,.32)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
};
window.ready = document.fonts.load("900 92px 'Inter Display'").then(() => { window.__ready = true; });
window.__loaded = true;
