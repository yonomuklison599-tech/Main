// Studio : planche de personnage (validation avant vidéo)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
await Promise.all([document.fonts.load("900 64px 'Inter Display'")]);
const P = new URLSearchParams(location.search); const W = +(P.get('w') || 900), H = +(P.get('h') || 1200);
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
{ const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#20283a'); g.addColorStop(.65, '#4a5874'); g.addColorStop(1, '#2a3246'); x.fillStyle = g; x.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const camera = new THREE.PerspectiveCamera(30, W / H, .01, 200);
const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(3, 6, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -1 }); key.shadow.bias = -.0005; scene.add(key);
const rimL = new THREE.DirectionalLight(0x9ec8ff, 2.0); rimL.position.set(-4, 4, -4); scene.add(rimL); scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a4038, .7));
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: '#46506a', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)); const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, metalness: 0, ...o });
const box = (w, h, d, m, r = 0) => { const geo = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// ================================================================ « LE COMPTEUR » — personnages v2 (coudes, visages HD animés, objets en main)
const FACES2 = {};
function faceTex2(expr, iris = '#5a3a22', talk = 0, lashes = false, fh = null) {
  const key = expr + iris + talk + lashes + (fh || ''); if (FACES2[key]) return FACES2[key];
  return FACES2[key] = canvasTex(512, 512, (c) => {
    c.clearRect(0, 0, 512, 512); const L = 176, R = 336, EY = 224, K = '#1a1410';
    const eye = (x, y, open = 1, look = 0) => { const ry = 50 * open; c.save(); c.beginPath(); c.ellipse(x, y, 40, ry, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.clip();
      const ix = x + look * 10, iy = y + 6; const gr = c.createRadialGradient(ix, iy - 8, 4, ix, iy, 30); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, iris); gr.addColorStop(1, '#120c0a');
      c.fillStyle = gr; c.beginPath(); c.arc(ix, iy, 30, 0, 7); c.fill(); c.fillStyle = '#0a0606'; c.beginPath(); c.arc(ix, iy, 14, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ix + 10, iy - 12, 9, 0, 7); c.fill(); c.beginPath(); c.arc(ix - 9, iy + 10, 4, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x - 44, y - ry, 88, ry * .5); c.restore();
      c.strokeStyle = K; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.ellipse(x, y, 40, ry, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      if (lashes) { c.lineWidth = 7; c.beginPath(); c.moveTo(x + (x > 256 ? 34 : -34), y - ry * .7); c.lineTo(x + (x > 256 ? 52 : -52), y - ry * .95); c.stroke(); } };
    const closed = (x, y, up = true) => { c.strokeStyle = K; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); if (up) c.arc(x, y + 12, 32, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(x, y - 8, 32, .15 * Math.PI, .85 * Math.PI); c.stroke();
      if (lashes && !up) { c.lineWidth = 6; for (const a of [.3, .5, .7]) { c.beginPath(); c.moveTo(x + Math.cos(Math.PI * a) * 32, y - 8 + Math.sin(Math.PI * a) * 32); c.lineTo(x + Math.cos(Math.PI * a) * 44, y + Math.sin(Math.PI * a) * 44); c.stroke(); } } };
    const brow = (x, y, a, lift = 0) => { c.strokeStyle = '#2a1a10'; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 34, y + a + lift); c.quadraticCurveTo(x, y - 12 + lift, x + 34, y - a + lift); c.stroke(); };
    const blush = (a = .35) => { c.fillStyle = `rgba(255,110,130,${a})`; for (const x of [110, 402]) { c.beginPath(); c.ellipse(x, 300, 40, 22, 0, 0, 7); c.fill(); } };
    const tears = () => { for (const x of [L - 10, R + 10]) { const gr = c.createLinearGradient(0, EY + 40, 0, EY + 220); gr.addColorStop(0, 'rgba(140,210,255,.95)'); gr.addColorStop(1, 'rgba(140,210,255,.2)'); c.fillStyle = gr; c.beginPath(); c.moveTo(x - 9, EY + 44); c.quadraticCurveTo(x - 14, EY + 150, x, EY + 200); c.quadraticCurveTo(x + 14, EY + 150, x + 9, EY + 44); c.fill(); } };
    const nose = () => { c.strokeStyle = 'rgba(120,60,40,.45)'; c.lineWidth = 7; c.beginPath(); c.moveTo(250, 268); c.quadraticCurveTo(266, 290, 248, 296); c.stroke(); };
    const mouthOpen = (wdt, h, teeth = true, tongue = true) => { c.fillStyle = '#5a1420'; c.beginPath(); c.moveTo(256 - wdt, 340); c.quadraticCurveTo(256, 334, 256 + wdt, 340); c.quadraticCurveTo(256, 340 + h * 1.5, 256 - wdt, 340); c.fill();
      c.save(); c.clip(); if (teeth) { c.fillStyle = '#fff'; c.fillRect(256 - wdt, 330, wdt * 2, 16); } if (tongue) { c.fillStyle = '#e06a7a'; c.beginPath(); c.ellipse(256, 340 + h, wdt * .6, h * .45, 0, 0, 7); c.fill(); } c.restore(); };
    const line = (pts, w_ = 12) => { c.strokeStyle = K; c.lineWidth = w_; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); c.stroke(); };
    nose();
    if (fh) { const hairFill = (pathFn, n, a0 = .8) => { c.save(); pathFn(); c.clip(); c.globalAlpha = a0 * .55; c.fillStyle = fh; c.fillRect(0, 0, 512, 512); c.globalAlpha = a0;
        const r = (k) => { const x = Math.sin(k * 12.9898) * 43758.5453; return x - Math.floor(x); }; c.strokeStyle = fh; c.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = 150 + r(i) * 212, y = 290 + r(i + 99) * 200; c.lineWidth = 2 + r(i + 7) * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x - 256) * .04, y + 7 + r(i + 3) * 6); c.stroke(); } c.restore(); };
      // barbe de 3 jours très légère (joues + mâchoire)
      c.save(); c.globalAlpha = .1; c.fillStyle = fh; c.beginPath(); c.moveTo(140, 330); c.quadraticCurveTo(150, 470, 256, 486); c.quadraticCurveTo(362, 470, 372, 330); c.quadraticCurveTo(330, 400, 256, 404); c.quadraticCurveTo(182, 400, 140, 330); c.fill(); c.restore();
      // moustache
      hairFill(() => { c.beginPath(); c.moveTo(194, 350); c.quadraticCurveTo(206, 318, 256, 318); c.quadraticCurveTo(306, 318, 318, 350); c.quadraticCurveTo(300, 340, 256, 340); c.quadraticCurveTo(212, 340, 194, 350); c.closePath(); }, 260, .95);
      // bouc : mouche + menton, raccordé aux coins de la bouche
      hairFill(() => { c.beginPath(); c.moveTo(246, 378); c.quadraticCurveTo(256, 372, 266, 378); c.lineTo(264, 392); c.quadraticCurveTo(256, 396, 248, 392); c.closePath(); c.moveTo(222, 404); c.quadraticCurveTo(256, 396, 290, 404); c.quadraticCurveTo(300, 444, 284, 470); c.quadraticCurveTo(256, 486, 228, 470); c.quadraticCurveTo(212, 444, 222, 404); c.closePath(); }, 420, .85);
      c.save(); c.globalAlpha = .35; c.strokeStyle = fh; c.lineWidth = 7; c.lineCap = 'round'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(256 + sx * 60, 352); c.quadraticCurveTo(256 + sx * 52, 392, 256 + sx * 34, 412); c.stroke(); } c.restore(); }
    const M = () => { if (talk) { mouthOpen(36, 18 + talk * 16); return true; } return false; };
    switch (expr) {
      case 'smile': eye(L, EY); eye(R, EY); brow(L, 150, 4); brow(R, 150, -4); blush(); if (!M()) line(fh ? [212, 350, 256, 374, 300, 350] : [206, 336, 256, 380, 306, 336]); break;
      case 'happy': closed(L, EY); closed(R, EY); brow(L, 146, 4); brow(R, 146, -4); blush(.5); if (!M()) mouthOpen(52, 34); break;
      case 'tender': eye(L, EY + 6, .7); eye(R, EY + 6, .7); brow(L, 152, -6); brow(R, 152, 6); blush(.45); if (!M()) line([216, 340, 256, 366, 296, 340]); break;
      case 'sad': eye(L, EY + 4, .85, -.3); eye(R, EY + 4, .85, -.3); brow(L, 150, -12, 4); brow(R, 150, 12, 4); if (!M()) line([216, 372, 256, 344, 296, 372]); break;
      case 'cry': eye(L, EY + 4, .7); eye(R, EY + 4, .7); brow(L, 150, -14, 4); brow(R, 150, 14, 4); tears(); blush(.5); if (!M()) mouthOpen(30, 22, false, false); break;
      case 'shock': eye(L, EY, 1.25); eye(R, EY, 1.25); brow(L, 120, 0); brow(R, 120, 0); if (!M()) { c.fillStyle = '#4a1020'; c.beginPath(); c.ellipse(256, 364, 26, 36, 0, 0, 7); c.fill(); } break;
      case 'worried': eye(L, EY, 1); eye(R, EY, 1); brow(L, 140, -14); brow(R, 140, 14); if (!M()) line([220, 368, 256, 352, 292, 368]); break;
      case 'focus': eye(L, EY + 6, .65, .5); eye(R, EY + 6, .65, .5); brow(L, 158, 10); brow(R, 158, -10); if (!M()) line([226, 356, 256, 356, 286, 352], 10); break;
      case 'smug': eye(L, EY + 6, .6); eye(R, EY + 6, .6); brow(L, 150, 8); brow(R, 146, -2); if (!M()) line([210, 350, 250, 368, 300, 334]); break;
      case 'laugh': closed(L, EY); closed(R, EY); brow(L, 140, 4); brow(R, 140, -4); blush(.55); mouthOpen(60, 44); break;
      case 'sleep': closed(L, EY, false); closed(R, EY, false); brow(L, 158, 0); brow(R, 158, 0); if (!M()) line([236, 350, 256, 356, 276, 350], 8); break;
      case 'love': eye(L, EY, .8); eye(R, EY, .8); brow(L, 146, -4); brow(R, 146, 4); blush(.65); if (!M()) line([206, 336, 256, 380, 306, 336]); break;
      case 'neutral': default: eye(L, EY); eye(R, EY); brow(L, 150, 0); brow(R, 150, 0); if (!M()) line([226, 352, 256, 354, 286, 352], 10);
    }
  });
}
const ALL2 = [];
function makeChar2({ fh = null, skin = '#f2c79c', shirt = '#e8743b', pants = '#2f4f8f', hair = '#5a3a22', scale = 1, hairStyle = 'short', iris = '#5a3a22', lashes = false, shoe = '#f2f2f2', extras = null }) {
  const c = new THREE.Group(); const root = new THREE.Group(); c.add(root); root.scale.setScalar(scale * .5);
  const S = mat(skin, { roughness: .55 }), SH = mat(shirt, { roughness: .75 }), P = mat(pants), HM = mat(hair, { roughness: .6 }), SHO = mat(shoe, { roughness: .5 });
  const legs = [], arms = [], elbows = [], hands = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .5, 2, 0); root.add(hip); const l = box(.95, 2, 1, P, .16); l.position.y = -1; hip.add(l); const sn = box(1.02, .4, 1.3, SHO, .14); sn.position.set(0, -1.82, .14); hip.add(sn); legs.push(hip); }
  const torso = box(2, 2, 1.05, SH, .26); torso.position.y = 3; root.add(torso);
  const collar = box(1.1, .2, 1.08, mat(shade3(shirt, -.2)), .08); collar.position.y = 3.98; root.add(collar);
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 1.5, 3.85, 0); root.add(sh); const up = box(.92, 1.15, .98, SH, .18); up.position.y = -.5; sh.add(up);
    const el = new THREE.Group(); el.position.y = -1.05; sh.add(el); const fo = box(.88, 1.05, .94, SH, .18); fo.position.y = -.45; el.add(fo);
    const hn = new THREE.Group(); hn.position.y = -1.05; el.add(hn); const palm = box(.84, .5, .9, S, .14); palm.position.y = -.1; hn.add(palm); const th = box(.26, .38, .3, S, .08); th.position.set(-s * .42, -.02, .28); hn.add(th);
    arms.push(sh); elbows.push(el); hands.push(hn); }
  const head = new THREE.Group(); head.position.y = 4.08; root.add(head);
  const hd = box(1.5, 1.42, 1.42, S, .42); hd.position.y = .7; head.add(hd);
  for (const s of [-1, 1]) { const ear = box(.16, .34, .26, S, .06); ear.position.set(s * .78, .66, 0); head.add(ear); }
  const faceM = new THREE.MeshBasicMaterial({ map: faceTex2('smile', iris, 0, lashes, fh), transparent: true }); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.36), faceM); face.position.set(0, .68, .716); head.add(face);
  const hairG = new THREE.Group(); head.add(hairG);
  const H = (w_, h, d, x, y, z, r = .14) => { const b = box(w_, h, d, HM, r); b.position.set(x, y, z); hairG.add(b); return b; };
  if (hairStyle === 'curly') { H(1.6, .45, 1.55, 0, 1.42, 0); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), HM); b.position.set(Math.cos(a) * .62, 1.6 + (i % 2) * .08, Math.sin(a) * .6); b.castShadow = true; hairG.add(b); } H(1.56, .7, .4, 0, 1.12, -.6); const f = H(1.3, .28, .3, 0, 1.28, .66, .1); f.rotation.x = .3; }
  if (hairStyle === 'short') { H(1.6, .5, 1.55, 0, 1.42, 0); H(1.58, .8, .4, 0, 1.06, -.6); const f = H(1.2, .25, .3, .1, 1.3, .66, .1); f.rotation.z = -.15; }
  if (hairStyle === 'long') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.62, 1.9, .45, 0, .6, -.62); for (const s of [-1, 1]) H(.3, 1.6, .9, s * .82, .55, -.1, .12); const f = H(1.3, .28, .3, -.12, 1.3, .66, .1); f.rotation.z = .2; }
  if (hairStyle === 'pony') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.6, .8, .42, 0, 1.06, -.62); const p = H(.5, 1.3, .5, 0, .8, -1.0, .2); p.rotation.x = .35; const tie = box(.56, .16, .56, mat('#ff5d8a'), .06); tie.position.set(0, 1.4, -.9); hairG.add(tie); }
  if (hairStyle === 'bun') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.6, .8, .42, 0, 1.06, -.62); const b = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), HM); b.position.set(0, 1.85, -.3); b.castShadow = true; hairG.add(b); }
  if (hairStyle === 'fringe') {
    HM.color.set('#ffffff'); HM.roughness = .7; HM.map = canvasTex(256, 256, (c) => { c.fillStyle = hair; c.fillRect(0, 0, 256, 256); const base = new THREE.Color(hair); for (let i = 0; i < 1400; i++) { const x = Math.random() * 256, y = Math.random() * 256, l = 8 + Math.random() * 18, k = Math.random();
      c.strokeStyle = k > .55 ? '#' + base.clone().multiplyScalar(1.45).getHexString() : '#' + base.clone().multiplyScalar(.6).getHexString(); c.globalAlpha = .55; c.lineWidth = 1 + Math.random() * 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y + l * .5, x + 2, y + l); c.stroke(); } });
    const fadeM = new THREE.MeshStandardMaterial({ roughness: .9, transparent: true, map: canvasTex(64, 256, (c) => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, hair); g.addColorStop(.35, hair); g.addColorStop(.75, hair + '66'); g.addColorStop(1, hair + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 256); }) });
    const F = (w_, h, d, x, y, z) => { const b = box(w_, h, d, fadeM, .08); b.position.set(x, y, z); hairG.add(b); return b; };
    for (const sx of [-1, 1]) F(.06, .95, 1.3, sx * .77, .98, -.05); F(1.5, .95, .06, 0, .98, -.73);
    H(1.56, .34, 1.5, 0, 1.47, -.02, .12); // dessus
    const front = H(1.4, .3, .5, .04, 1.56, .5, .12); front.rotation.x = -.35; // volume de devant relevé
    const swoop = H(.9, .2, .45, -.25, 1.66, .38, .08); swoop.rotation.set(-.4, 0, .12);
    for (let i = 0; i < 4; i++) { const t_ = H(.32, .14, .28, -.5 + i * .33, 1.7 + (i % 2) * .03, .1 - (i % 2) * .2, .05); t_.rotation.set(-.2, i * .4, (i - 1.5) * .1); } }
  if (hairStyle === 'bald') { for (const s of [-1, 1]) { H(.22, .55, 1.1, s * .78, .95, -.1, .1); } H(1.4, .45, .3, 0, .95, -.68, .1); }
  if (extras) extras(root, head, hairG, S, hands);
  // compteur au-dessus de la tête (sprite toujours face caméra)
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(1), depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); badge.scale.set(2.2, 1.1, 1); badge.position.set(0, 6.7, 0); badge.renderOrder = 10; badge.layers.set(1); root.add(badge);
  c.userData = { root, legs, arms, elbows, hands, head, faceM, hairG, hd, torso, badge, iris, lashes, fh, n: null }; c.visible = false; scene.add(c); ALL2.push(c); return c;
}
function shade3(hex, k) { const col = new THREE.Color(hex); const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, hsl.s, clamp(hsl.l + k * .5)); return '#' + col.getHexString(); }
const BADGES = {};
function badgeTex(n) { if (BADGES[n]) return BADGES[n]; const col = n >= 100 ? '#ffd23f' : n >= 10 ? '#5fe39a' : n === 0 ? '#8c8c9c' : '#6ec8ff';
  return BADGES[n] = canvasTex(512, 256, c => { c.save(); c.translate(256, 128); c.scale(2, 1); const gr = c.createRadialGradient(0, 0, 10, 0, 0, 124); gr.addColorStop(0, col + '77'); gr.addColorStop(1, col + '00'); c.fillStyle = gr; c.fillRect(-128, -128, 256, 256); c.restore();
    c.font = "900 120px 'Inter Display'"; const label = String(n), tw = c.measureText(label).width + 170; c.fillStyle = 'rgba(10,12,22,.88)'; c.beginPath(); c.roundRect(256 - tw / 2, 64, tw, 128, 64); c.fill(); c.lineWidth = 9; c.strokeStyle = col; c.stroke();
    const ex = 256 - tw / 2 + 64; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(ex - 34, 128); c.quadraticCurveTo(ex, 96, ex + 34, 128); c.quadraticCurveTo(ex, 160, ex - 34, 128); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(ex, 128, 13, 0, 7); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = col; c.shadowBlur = 24; c.fillStyle = col; c.fillText(label, 256 + 38, 134); }); }
function setBadge(ch, n, sc = 1) { const b = ch.userData.badge; if (n === null) { b.visible = false; return; } b.visible = true; if (ch.userData.n !== n) { b.material.map = badgeTex(n); b.material.needsUpdate = true; ch.userData.n = n; } b.scale.set(2.2 * sc, 1.1 * sc, 1); }
let TALK = new Set();
function setFace2(ch, e, talking = false, t = 0) { const u = ch.userData; const tk = talking ? [0, 1, 2, 1][Math.floor(t * 9) % 4] * .5 : 0; u.faceM.map = faceTex2(e, u.iris, tk, u.lashes, u.fh); }
function pose2(ch, kind, t) {
  const { legs, arms, elbows, hands, head, root } = ch.userData; const SC = root.scale.y;
  legs.forEach(l => l.rotation.set(0, 0, 0)); arms.forEach(a => a.rotation.set(0, 0, 0)); elbows.forEach(e => e.rotation.set(0, 0, 0)); hands.forEach(h => h.rotation.set(0, 0, 0)); head.rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0);
  const br = Math.sin(t * 2.3) * .02; root.position.y = br * SC * .5; arms[0].rotation.z = -.06 - br; arms[1].rotation.z = .06 + br; head.rotation.y = Math.sin(t * .8) * .06;
  const s = Math.sin(t * 7);
  switch (kind) {
    case 'walk': legs[0].rotation.x = s * .55; legs[1].rotation.x = -s * .55; arms[0].rotation.x = -s * .5; arms[1].rotation.x = s * .5; elbows[0].rotation.x = -.3; elbows[1].rotation.x = -.3; root.position.y = Math.abs(Math.cos(t * 7)) * .12 * SC; break;
    case 'sadWalk': { const q = Math.sin(t * 4.5); legs[0].rotation.x = q * .35; legs[1].rotation.x = -q * .35; arms[0].rotation.x = -q * .2; arms[1].rotation.x = q * .2; head.rotation.x = .3; root.rotation.x = .05; break; }
    case 'phone': arms[1].rotation.set(-.55, 0, -.15); elbows[1].rotation.x = -1.6; hands[1].rotation.x = .2; head.rotation.x = .3; break;
    case 'phone2': arms[1].rotation.set(-.55, 0, -.15); elbows[1].rotation.x = -1.6; arms[0].rotation.set(-.45, 0, .2); elbows[0].rotation.x = -1.4; head.rotation.x = .35; break;
    case 'tray': arms[0].rotation.set(-.4, 0, 0); elbows[0].rotation.x = -1.2; arms[1].rotation.set(-.4, 0, 0); elbows[1].rotation.x = -1.2; break;
    case 'whistle': arms[1].rotation.set(-1.2, 0, -.5); elbows[1].rotation.x = -1.6; head.rotation.x = -.05; break;
    case 'pointArm': arms[1].rotation.set(-1.45, 0, .1); elbows[1].rotation.x = -.1; break;
    case 'think': arms[1].rotation.set(-.8, 0, -.3); elbows[1].rotation.x = -2.2; arms[0].rotation.set(-.3, 0, .5); elbows[0].rotation.x = -1.6; head.rotation.set(-.1, 0, .12); break;
    case 'headInHands': legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[0].rotation.set(-1.1, 0, .45); elbows[0].rotation.x = -1.9; arms[1].rotation.set(-1.1, 0, -.45); elbows[1].rotation.x = -1.9; head.rotation.x = .35; root.rotation.x = .15; break;
    case 'sit': legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[0].rotation.x = -.4; elbows[0].rotation.x = -.6; arms[1].rotation.x = -.4; elbows[1].rotation.x = -.6; break;
    case 'sitReach': legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[1].rotation.set(-1.15, 0, -.2); elbows[1].rotation.x = -.25; arms[0].rotation.set(-1.05, 0, .25); elbows[0].rotation.x = -.35; root.rotation.x = .12; head.rotation.x = .2; break;
    case 'bills': legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[1].rotation.set(-.8, 0, -.2); elbows[1].rotation.x = -.9; arms[0].rotation.set(-.6, 0, .5); elbows[0].rotation.x = -1.7; head.rotation.x = .35; break;
    case 'kick': legs[1].rotation.x = -1.2 + Math.sin(t * 3) * .1; legs[0].rotation.x = .2; arms[0].rotation.z = -1.1; arms[1].rotation.z = 1.1; root.rotation.x = -.12; break;
    case 'cheer': { const q = Math.abs(Math.sin(t * 6)); root.position.y = q * 1.1 * SC; arms[0].rotation.z = -2.7; arms[1].rotation.z = 2.7; elbows[0].rotation.z = -.3; elbows[1].rotation.z = .3; legs[0].rotation.x = -q * .3; break; }
    case 'castSit': legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.5; root.position.y = -1.45 * SC; arms[1].rotation.set(-.55, 0, -.25); elbows[1].rotation.x = -1.5; arms[0].rotation.set(-.4, 0, .35); elbows[0].rotation.x = -1.3; head.rotation.x = .25; break;
    case 'castStand': arms[1].rotation.set(-.5, 0, -.25); elbows[1].rotation.x = -1.5; break;
    case 'lookUp': head.rotation.x = -.45; arms[0].rotation.z = -.1; arms[1].rotation.z = .1; break;
    case 'crossed': arms[0].rotation.set(-.9, 0, .55); elbows[0].rotation.x = -1.7; arms[1].rotation.set(-.9, 0, -.55); elbows[1].rotation.x = -1.7; break;
    case 'whisper': arms[1].rotation.set(-1.2, 0, -.6); elbows[1].rotation.x = -1.9; head.rotation.set(.05, .3, .1); arms[0].rotation.set(-.2, 0, .3); break;
    case 'lie': root.rotation.x = -Math.PI / 2; root.position.y = .52 * SC; root.position.z = 2.45 * SC; arms[0].rotation.z = -.25; arms[1].rotation.z = .25; head.rotation.y = 0; break;
    case 'cradle': arms[0].rotation.set(-.9, 0, .45); elbows[0].rotation.x = -1.4; arms[1].rotation.set(-.9, 0, -.45); elbows[1].rotation.x = -1.4; head.rotation.x = .4; break;
    case 'holdPhoto': arms[0].rotation.set(-1.05, 0, .25); elbows[0].rotation.x = -.7; arms[1].rotation.set(-1.05, 0, -.25); elbows[1].rotation.x = -.7; head.rotation.x = .3; break;
    case 'dance': { const q = Math.sin(t * 8); arms[0].rotation.set(0, 0, -1.8 - q * .7); arms[1].rotation.set(0, 0, 1.8 - q * .7); elbows[0].rotation.z = -.6; elbows[1].rotation.z = .6; legs[0].rotation.x = q * .4; legs[1].rotation.x = -q * .4; root.rotation.z = q * .12; head.rotation.z = -q * .15; break; }
    case 'mock': { const q = Math.sin(t * 14); arms[1].rotation.set(-1.45, 0, .1); arms[0].rotation.set(-.3, 0, .4); elbows[0].rotation.x = -1.6; root.rotation.x = .12 + q * .04; head.rotation.x = -.15 + q * .05; break; }
    case 'idle': default: break;
  }
}
function place2(ch, x, y, z, ry = 0) { ch.position.set(x, y, z); ch.rotation.y = ry; ch.visible = true; }
// objets
const PROPS = [];
function prop(obj) { obj.visible = false; PROPS.push(obj); return obj; }
function attach(ch, side, obj, y = -.35, z = .35, rx = 0) { ch.userData.hands[side].add(obj); obj.position.set(0, y, z); obj.rotation.x = rx; return prop(obj); }
function phoneMesh() { const g_ = new THREE.Group(); g_.add(box(.62, 1.15, .1, mat('#1b1b22', { roughness: .3, metalness: .4 }), .05)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(.52, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(128, 256, c => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7ac8ff'); gr.addColorStop(1, '#6a5ad6'); c.fillStyle = gr; c.fillRect(0, 0, 128, 256); c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 5; i++) c.fillRect(12, 30 + i * 44, 104, 26); }), toneMapped: false })); scr.position.z = .056; g_.add(scr);
  const gl_ = new THREE.PointLight(0x8ab8ff, 2.2, 3, 2); gl_.position.set(0, 0, .5); g_.add(gl_); return g_; }
function croissantMesh(s = 1) { const g_ = new THREE.Group(); const m = mat('#e3a447', { roughness: .5 }); for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.26 - Math.abs(i) * .04, 10, 8), m); b.scale.set(1, .75, .8); b.position.set(i * .3, -Math.abs(i) * .1, 0); b.castShadow = true; g_.add(b); } g_.scale.setScalar(s); return g_; }
function trayMesh() { const g_ = new THREE.Group(); g_.add(box(2.6, .12, 1.3, mat('#8a5a2a'), .04)); for (let i = 0; i < 4; i++) { const c_ = croissantMesh(.75); c_.position.set(-.9 + i * .6, .22, (i % 2) * .3 - .15); g_.add(c_); } return g_; }
function billsMesh() { const g_ = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.05), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, map: canvasTex(160, 210, c => { c.fillStyle = '#fdfdf6'; c.fillRect(0, 0, 160, 210); c.fillStyle = '#e8333a'; c.font = "900 34px 'Inter Display'"; c.fillText('FACTURE', 12, 40); c.fillStyle = '#999'; for (let j = 0; j < 6; j++) c.fillRect(12, 64 + j * 22, 136, 8); c.fillStyle = '#e8333a'; c.font = "900 30px 'Inter Display'"; c.fillText('-284 €', 40, 196); }) })); p.position.set(i * .12, i * .05, i * .01); p.rotation.z = (i - 1) * .15; g_.add(p); } return g_; }
function castMesh() { const c_ = box(1.0, 1.0, 1.06, mat('#f6f6f2', { roughness: .95 }), .2); return c_; }
function cakeMesh() { const g_ = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .7, 24), mat('#ffb3c8')); b.position.y = .35; b.castShadow = true; g_.add(b); const top = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, .14, 24), mat('#fff')); top.position.y = .72; g_.add(top);
  const cd = box(.08, .5, .08, mat('#7ac8ff')); cd.position.y = 1.05; g_.add(cd); const fl = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffcc55' })); fl.position.y = 1.38; g_.add(fl); const pl = new THREE.PointLight(0xffb050, 3, 4, 2); pl.position.y = 1.5; g_.add(pl); return g_; }

// ================================================================ MOI
const silver = mat('#d8dce2', { metalness: .9, roughness: .22 });
function makeMoi(withCap = false) { return makeChar2({ shirt: '#17171c', pants: '#22283a', hair: '#5e4028', hairStyle: 'fringe', iris: '#3f9a4e', skin: '#f0c9a8', fh: '#7a5236', shoe: '#f4f4f4', scale: 1, extras: (root, head, hairG, S, hands) => {
  // t-shirt marine + imprimé doré entre les pans de la veste
  const tee = box(1.02, 1.95, .1, mat('#1d2840', { roughness: .9 }), .04); tee.position.set(0, 3, .5); root.add(tee);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(.85, .55), new THREE.MeshStandardMaterial({ transparent: true, map: canvasTex(340, 220, (c) => { c.fillStyle = '#ffd21a'; c.textAlign = 'center'; c.font = "900 62px 'Inter Display'"; c.fillText('GALLERY', 170, 78); c.fillText('DEPT.', 170, 146); c.font = "900 34px 'Inter Display'"; c.fillText('TOKYO', 170, 196); }) })); print.position.set(0, 3.1, .556); root.add(print);
  // pans de veste zippée + fermeture éclair argent
  for (const s of [-1, 1]) { const flap = box(.5, 1.98, .14, mat('#141418', { roughness: .75 }), .05); flap.position.set(s * .76, 3, .5); root.add(flap); const zip = box(.05, 1.9, .05, silver); zip.position.set(s * .5, 3, .58); root.add(zip); }
  const col = box(1.9, .3, 1.1, mat('#141418'), .1); col.position.set(0, 4.0, -.02); root.add(col);
  // chaîne + pendentif
  const chainPts = [V(-.46, 4.02, .2), V(-.4, 3.8, .5), V(-.22, 3.58, .6), V(0, 3.5, .62), V(.22, 3.58, .6), V(.4, 3.8, .5), V(.46, 4.02, .2)]; const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 80, .013, 6), silver); chain.castShadow = true; root.add(chain);
  // (pas de pendentif)
  // montre (poignet gauche)
  const watch = new THREE.Group(); hands[0].add(watch); watch.position.set(0, .22, 0); const band = box(.92, .16, .98, mat('#141414', { roughness: .55 }), .05); watch.add(band); const dial = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .06, 32), [mat('#0c0c0e'), new THREE.MeshStandardMaterial({ roughness: .2, metalness: .2, map: canvasTex(128, 128, (c) => { c.fillStyle = '#0b0b0d'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#eaeaea'; for (let i = 0; i < 12; i++) { c.save(); c.translate(64, 64); c.rotate(i * Math.PI / 6); c.fillRect(-3, -56, 6, i % 3 ? 10 : 16); c.restore(); } c.strokeStyle = '#eaeaea'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 28); c.moveTo(64, 64); c.lineTo(92, 74); c.stroke(); }) }), mat('#0c0c0e')]); dial.geometry.rotateY(Math.PI); dial.rotation.x = Math.PI / 2; dial.position.z = .5; watch.add(dial);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(.18, .035, 10, 32), new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: .95, roughness: .2 })); bezel.position.z = .52; watch.add(bezel);
  // AirPod
  const pod = box(.12, .2, .12, mat('#ffffff', { roughness: .2 }), .05); pod.position.set(.84, .62, .08); head.add(pod);
  // casquette noire à l'envers (option)
  if (withCap) { const capG = new THREE.Group(); head.add(capG); const crown = box(1.66, .62, 1.6, mat('#18181c', { roughness: .85 }), .3); crown.position.y = 1.55; capG.add(crown); const vis = box(1.3, .1, .85, mat('#121216'), .05); vis.position.set(0, 1.32, -1.05); capG.add(vis);
    const strap = box(.6, .16, .05, mat('#0c0c0e')); strap.position.set(0, 1.42, -.82); capG.add(strap); const buckle = box(.16, .12, .05, silver); buckle.position.set(0, 1.42, -.85); capG.add(buckle); hairG.children.forEach(h => { if (h.position.y > 1.3 && h.position.z < .6) h.visible = false; }); }
} }); }
const moi = makeMoi(false), moiCap = makeMoi(true);
[moi, moiCap].forEach(c => { c.visible = false; c.userData.badge.visible = false; });
window.shot = (view, expr = 'smile', cap = false) => { const ch = cap ? moiCap : moi; [moi, moiCap].forEach(c => c.visible = c === ch); ch.position.set(0, 0, 0); ch.rotation.y = 0;
  setFace2(ch, expr, false, 0); pose2(ch, 'idle', 1.3); if (view === 'wave') { pose2(ch, 'idle', 1); ch.userData.arms[1].rotation.set(0, 0, 2.6); ch.userData.elbows[1].rotation.z = .5; }
  const v = { full: [V(0, 1.7, 9), V(0, 1.55, 0), 30], tq: [V(5, 2.2, 7.2), V(0, 1.5, 0), 30], face: [V(.9, 2.45, 3.2), V(0, 2.3, 0), 30], watch: [V(-1.4, 1.0, 2.2), V(-.75, .95, .1), 26], wave: [V(-2.4, 1.9, 8.4), V(0, 1.55, 0), 30] }[view];
  camera.position.copy(v[0]); camera.lookAt(v[1]); camera.fov = v[2]; camera.updateProjectionMatrix(); renderer.render(scene, camera); return cv.toDataURL('image/jpeg', .93); };
window.__ready = true;
