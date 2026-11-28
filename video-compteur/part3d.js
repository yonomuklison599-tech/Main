
// ================================================================ « LE COMPTEUR » — personnages v2 (coudes, visages HD animés, objets en main)
const FACES2 = {};
function faceTex2(expr, iris = '#5a3a22', talk = 0, lashes = false) {
  const key = expr + iris + talk + lashes; if (FACES2[key]) return FACES2[key];
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
    const M = () => { if (talk) { mouthOpen(36, 18 + talk * 16); return true; } return false; };
    switch (expr) {
      case 'smile': eye(L, EY); eye(R, EY); brow(L, 150, 4); brow(R, 150, -4); blush(); if (!M()) line([206, 336, 256, 380, 306, 336]); break;
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
function makeChar2({ skin = '#f2c79c', shirt = '#e8743b', pants = '#2f4f8f', hair = '#5a3a22', scale = 1, hairStyle = 'short', iris = '#5a3a22', lashes = false, shoe = '#f2f2f2', extras = null }) {
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
  const faceM = new THREE.MeshBasicMaterial({ map: faceTex2('smile', iris, 0, lashes), transparent: true }); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.36), faceM); face.position.set(0, .68, .716); head.add(face);
  const hairG = new THREE.Group(); head.add(hairG);
  const H = (w_, h, d, x, y, z, r = .14) => { const b = box(w_, h, d, HM, r); b.position.set(x, y, z); hairG.add(b); return b; };
  if (hairStyle === 'curly') { H(1.6, .45, 1.55, 0, 1.42, 0); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), HM); b.position.set(Math.cos(a) * .62, 1.6 + (i % 2) * .08, Math.sin(a) * .6); b.castShadow = true; hairG.add(b); } H(1.56, .7, .4, 0, 1.12, -.6); const f = H(1.3, .28, .3, 0, 1.28, .66, .1); f.rotation.x = .3; }
  if (hairStyle === 'short') { H(1.6, .5, 1.55, 0, 1.42, 0); H(1.58, .8, .4, 0, 1.06, -.6); const f = H(1.2, .25, .3, .1, 1.3, .66, .1); f.rotation.z = -.15; }
  if (hairStyle === 'long') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.62, 1.9, .45, 0, .6, -.62); for (const s of [-1, 1]) H(.3, 1.6, .9, s * .82, .55, -.1, .12); const f = H(1.3, .28, .3, -.12, 1.3, .66, .1); f.rotation.z = .2; }
  if (hairStyle === 'pony') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.6, .8, .42, 0, 1.06, -.62); const p = H(.5, 1.3, .5, 0, .8, -1.0, .2); p.rotation.x = .35; const tie = box(.56, .16, .56, mat('#ff5d8a'), .06); tie.position.set(0, 1.4, -.9); hairG.add(tie); }
  if (hairStyle === 'bun') { H(1.62, .5, 1.58, 0, 1.42, 0); H(1.6, .8, .42, 0, 1.06, -.62); const b = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), HM); b.position.set(0, 1.85, -.3); b.castShadow = true; hairG.add(b); }
  if (hairStyle === 'bald') { for (const s of [-1, 1]) { H(.22, .55, 1.1, s * .78, .95, -.1, .1); } H(1.4, .45, .3, 0, .95, -.68, .1); }
  if (extras) extras(root, head, hairG, S, hands);
  // compteur au-dessus de la tête (sprite toujours face caméra)
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(1), depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); badge.scale.set(2.2, 1.1, 1); badge.position.set(0, 6.7, 0); badge.renderOrder = 10; badge.layers.set(1); root.add(badge);
  c.userData = { root, legs, arms, elbows, hands, head, faceM, hairG, hd, torso, badge, iris, lashes, n: null }; c.visible = false; scene.add(c); ALL2.push(c); return c;
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
function setFace2(ch, e, talking = false, t = 0) { const u = ch.userData; const tk = talking ? [0, 1, 2, 1][Math.floor(t * 9) % 4] * .5 : 0; u.faceM.map = faceTex2(e, u.iris, tk, u.lashes); }
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

// ---------------------------------------------------------------- casting
const malo = makeChar2({ shirt: '#2f4f8f', pants: '#2a2f3d', hair: '#2b1a14', hairStyle: 'curly', iris: '#6a4022', scale: .9, extras: (root) => { for (const s of [-1, 1]) { const st = box(.08, .7, .08, mat('#eeeeee')); st.position.set(s * .25, 3.45, .56); root.add(st); } const pk = box(1.2, .55, .08, mat('#24406f'), .05); pk.position.set(0, 2.45, .54); root.add(pk); } });
const star = makeChar2({ shirt: '#ff6fa8', pants: '#f4f1f6', hair: '#f2c94c', hairStyle: 'long', iris: '#3d8fd6', lashes: true, skin: '#ffe0c4', scale: .9 });
const prof = makeChar2({ shirt: '#2f8a5a', pants: '#2f8a5a', hair: '#3a2a20', hairStyle: 'short', iris: '#4a3020', skin: '#e2a878', extras: (root, head) => { const cap = box(1.65, .5, 1.6, mat('#e8333a'), .2); cap.position.y = 1.55; head.add(cap); const vis = box(1.3, .1, .8, mat('#c22a30'), .04); vis.position.set(0, 1.35, .95); head.add(vis);
  const mu = box(.62, .09, .05, mat('#3a2a20')); mu.position.set(0, .5, .73); head.add(mu); const zip = box(.06, 1.9, .06, mat('#ddd')); zip.position.set(0, 3, .56); root.add(zip); const lan = box(.05, .7, .05, mat('#e8333a')); lan.position.set(0, 3.5, .56); root.add(lan); const wh = box(.3, .2, .3, mat('#c0c4cc', { metalness: .7, roughness: .3 })); wh.position.set(0, 3.1, .62); root.add(wh); } });
const boul = makeChar2({ shirt: '#f4efe6', pants: '#3a3040', hair: '#8a4a2a', hairStyle: 'bun', iris: '#6a4a2a', lashes: true, skin: '#f8d4b4', extras: (root) => { const ap = box(1.7, 2.4, .08, mat('#c96b3a'), .06); ap.position.set(0, 2.5, .55); root.add(ap); const pk = box(.8, .4, .06, mat('#a85a2a'), .04); pk.position.set(0, 2.1, .6); root.add(pk); } });
const mere = makeChar2({ shirt: '#8a6ad6', pants: '#3a3060', hair: '#5a3220', hairStyle: 'bun', iris: '#5a3a22', lashes: true });
const pote = makeChar2({ shirt: '#f0b429', pants: '#2d3a5a', hair: '#151515', hairStyle: 'short', iris: '#2a1a10', skin: '#9a6440', scale: .9 });
const crush = makeChar2({ shirt: '#3aa889', pants: '#3a3a4a', hair: '#6b3a2a', hairStyle: 'pony', iris: '#2e7d4f', lashes: true, skin: '#ffe2c8', scale: .88 });
const amie = makeChar2({ shirt: '#7a5bd6', pants: '#2a2a3a', hair: '#1a1a1a', hairStyle: 'long', iris: '#2a1a10', lashes: true, skin: '#c9906a', scale: .88 });
const pere = makeChar2({ shirt: '#cfe3ee', pants: '#cfe3ee', hair: '#cfcfcf', hairStyle: 'bald', iris: '#6a4022', skin: '#f0c8a2', extras: (root, head) => { const bd = box(1.3, .32, .14, mat('#9a9a9e', { roughness: .9 }), .1); bd.position.set(0, .12, .72); head.add(bd); const bd2 = box(.8, .2, .12, mat('#9a9a9e', { roughness: .9 }), .06); bd2.position.set(0, -.04, .7); head.add(bd2); } });
// doigts du père (main droite) pour le mouvement final
const FINGERS = []; for (let i = 0; i < 4; i++) { const f = box(.17, .42, .2, mat('#f0c8a2', { roughness: .55 }), .06); f.position.set(-.3 + i * .2, -.48, .18); pere.userData.hands[0].add(f); FINGERS.push(f); }
const EXTRAS = [['#d9534f', '#3a4a6a', '#7a5a3a', 'short', '#f0c49c'], ['#4aa3df', '#2a2a3a', '#222', 'pony', '#b87a52'], ['#c96b8a', '#4a3a4a', '#bbb', 'bun', '#ffe0c4'], ['#e0c050', '#4a3a2a', '#8a6a3a', 'curly', '#e2a878'], ['#7bc77b', '#3a4a3a', '#1a1a1a', 'short', '#9a6440'], ['#ff8a5a', '#3a2a5a', '#3a2010', 'long', '#ffe0c4']]
  .map(([s, p, h, st, sk], i) => makeChar2({ shirt: s, pants: p, hair: h, hairStyle: st, skin: sk, lashes: i % 2 === 1, scale: .85 + (i % 3) * .05 }));
const bebe = new THREE.Group(); scene.add(bebe); { const S = mat('#f6cfa8', { roughness: .5 }); const b = box(1.1, .8, 1.6, mat('#bfe3ff'), .35); b.position.y = .4; bebe.add(b); const h = box(.9, .85, .85, S, .38); h.position.set(0, .7, 1.05); bebe.add(h);
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({ map: faceTex2('sleep', '#5a3a22'), transparent: true })); fm.rotation.x = -Math.PI / 2; fm.position.set(0, 1.13, 1.05); bebe.add(fm); bebe.visible = false; }

// props attachés
const starPhone = attach(star, 1, phonePropFix(phoneMesh()), -.45, .5, -1.2);
const potePhone = attach(pote, 1, phonePropFix(phoneMesh()), -.45, .5, -1.2);
function phonePropFix(o) { o.rotation.y = 0; return o; }
const boulTray = attach(boul, 1, trayMesh(), -.3, .9, 1.25); boulTray.position.x = -1.5;
const mereBills = attach(mere, 1, billsMesh(), -.4, .4, -.9);
const maloCast = prop(castMesh()); malo.userData.elbows[1].add(maloCast); maloCast.position.set(0, -.5, 0);
const ballMesh = prop(new THREE.Mesh(new THREE.IcosahedronGeometry(.5, 2), new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#1a1a1a'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(10 + i * 22, 16 + (i % 2) * 30, 9, 0, 7); c.fill(); } }) }))); ballMesh.castShadow = true; scene.add(ballMesh);
const cake = prop(cakeMesh()); scene.add(cake);

// ---------------------------------------------------------------- décors intérieurs (chacun isolé dans le monde)
const SETS = {};
function room(name, ox, oz, { w_ = 24, d = 18, h = 9, wall = '#e9e4da', floor = '#b8a48a', ceil = '#f4f2ee', floorTex = null } = {}) {
  const grp = new THREE.Group(); grp.position.set(ox, 0, oz); scene.add(grp); SETS[name] = grp;
  const fl = box(w_, .2, d, mat(floor, { roughness: .35, map: floorTex })); fl.position.y = -.1; grp.add(fl);
  const back = box(w_, h, .3, mat(wall)); back.position.set(0, h / 2, -d / 2); grp.add(back); BLOCKERS.push(back);
  for (const s of [-1, 1]) { const sw = box(.3, h, d, mat(wall)); sw.position.set(s * w_ / 2, h / 2, 0); grp.add(sw); BLOCKERS.push(sw); }
  const front = box(w_, h, .3, mat(wall)); front.position.set(0, h / 2, d / 2); grp.add(front); front.userData.front = true; BLOCKERS.push(front);
  const ce = box(w_, .3, d, mat(ceil)); ce.position.y = h; grp.add(ce);
  const base = box(w_, .4, .1, mat(shade3(wall, -.3))); base.position.set(0, .2, -d / 2 + .2); grp.add(base);
  return grp;
}
function ceilingLamp(grp, x, z, h, col = 0xfff4e0, power = 18, dist = 22) { const p = box(2.4, .12, .8, new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color(col), emissiveIntensity: 2.2 })); p.position.set(x, h - .2, z); grp.add(p); const l = new THREE.PointLight(col, power, dist, 1.6); l.position.set(x, h - 1, z); grp.add(l); return l; }
function beam(grp, x, y, z, rx, rz, len = 10, w_ = 2.2, col = '#fff2c8', a = .16) { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { col: { value: new THREE.Color(col) }, a: { value: a } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 col; uniform float a; varying vec2 vUv; void main(){ float e = smoothstep(0.,.3,vUv.x)*smoothstep(1.,.7,vUv.x); gl_FragColor = vec4(col, a * e * vUv.y); }' });
  const b = new THREE.Mesh(new THREE.PlaneGeometry(w_, len), m); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); grp.add(b); const b2 = b.clone(); b2.rotation.y = Math.PI / 2; b2.rotation.x = rx; b2.rotation.z = rz; b.add(b2); b2.position.set(0, 0, 0); return b; }
function poster(grp, x, y, z, ry, lines, bg, fg, w_ = 2, h = 2.6) { const p = box(w_, h, .05, new THREE.MeshStandardMaterial({ map: textTex(lines, { w: 400, h: 520, size: 70, bg, fg, border: fg }) })); p.position.set(x, y, z); p.rotation.y = ry; grp.add(p); return p; }
function windowPane(grp, x, y, z, w_, h, sky = '#bfe6ff', night = false) { const fr = box(w_ + .3, h + .3, .2, mat('#f4f4f0')); fr.position.set(x, y, z); grp.add(fr);
  const gl_ = new THREE.Mesh(new THREE.PlaneGeometry(w_, h), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, c => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, night ? '#0b1030' : '#6fb8ff'); gr.addColorStop(1, night ? '#2a3a7a' : sky); c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    if (night) { c.fillStyle = '#f4f1de'; c.beginPath(); c.arc(180, 70, 26, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * 256, Math.random() * 160, 2, 2); } else { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(80, 90, 50, 18, 0, 0, 7); c.fill(); c.fillStyle = '#5aa04a'; c.fillRect(0, 200, 256, 56); } }), toneMapped: false })); gl_.position.set(x, y, z + .12); grp.add(gl_);
  const mul = box(.12, h, .12, mat('#f4f4f0')); mul.position.set(x, y, z + .15); grp.add(mul); const mul2 = box(w_, .12, .12, mat('#f4f4f0')); mul2.position.set(x, y, z + .15); grp.add(mul2); }

// 1) COULOIR DU LYCÉE (lumière du jour, casiers, rayons)
const HALL = V(300, 0, 0); { const r = room('hall', HALL.x, HALL.z, { w_: 30, d: 14, h: 10, wall: '#e8e2d6', floor: '#c8c2b4' });
  for (let i = 0; i < 13; i++) { const x = -14 + i * 1.6; const lk = box(1.5, 5.4, .9, mat(i % 2 ? '#3f6fb8' : '#4a7cc8', { roughness: .4, metalness: .3 }), .06); lk.position.set(x + .8, 2.7, -6.5); r.add(lk);
    for (let j = 0; j < 4; j++) { const v = box(.9, .06, .05, mat('#2a4a7a')); v.position.set(x + .8, 4.6 + j * .22, -6.03); r.add(v); } const hd_ = box(.1, .45, .1, mat('#d8d8d8', { metalness: .8, roughness: .2 })); hd_.position.set(x + 1.3, 2.9, -6.0); r.add(hd_); }
  for (const x of [-9, 0, 9]) { windowPane(r, x, 7.8, -6.9, 5, 2.4); }
  poster(r, 13, 3.4, -6.8, 0, ['BAL', 'DU', 'LYCÉE'], '#ff6fa8', '#fff'); poster(r, -14.6, 4, -2, Math.PI / 2, ['CLUB', 'FOOT'], '#2ecc71', '#fff');
  for (const x of [-9, 0, 9]) ceilingLamp(r, x, 0, 10, 0xfff6e6, 14, 20); for (const x of [-9, 0, 9]) beam(r, x + 1.5, 4.5, -3.5, -.55, .2, 9, 3, '#fff6d8', .13);
  const refl = box(30, .01, 6, mat('#ffffff', { roughness: .05, metalness: .2, transparent: true, opacity: .25 })); refl.position.set(0, .02, -2); r.add(refl); }
// 2) TERRAIN DE FOOT (extérieur près de la ville)
const FIELD = V(-120, 0, 60); { const gr = new THREE.Group(); gr.position.copy(FIELD); scene.add(gr); const gtex = canvasTex(512, 512, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#4fa84a' : '#5cb855'; c.fillRect(0, i * 64, 512, 64); } }); gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(2, 2);
  const f = box(60, .2, 50, mat('#ffffff', { map: gtex })); f.position.y = .1; gr.add(f); for (const z of [-20, 0]) { const ln = box(50, .03, .25, mat('#fff')); ln.position.set(0, .22, z); gr.add(ln); }
  const goal = new THREE.Group(); goal.position.set(0, 0, -22); gr.add(goal); const P = mat('#ffffff', { roughness: .3 }); for (const x of [-4, 4]) { const p = box(.3, 3, .3, P); p.position.set(x, 1.5, 0); goal.add(p); } const cb = box(8.3, .3, .3, P); cb.position.set(0, 3, 0); goal.add(cb);
  const net = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 2.5, 16, 6, 5), mat('#ffffff', { wireframe: true, transparent: true, opacity: .6 })); net.position.set(0, 1.5, -1.3); goal.add(net);
  for (const x of [-25, 25]) { const pole = box(.5, 18, .5, mat('#9aa0a8', { metalness: .5 })); pole.position.set(x, 9, -26); gr.add(pole); const lp = box(4, 2, .6, new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.2 })); lp.position.set(x, 18, -25.6); gr.add(lp); }
  const bench = box(10, 1, 1.4, mat('#3a6ab8')); bench.position.set(-18, .6, 6); gr.add(bench); }
// 3) BOULANGERIE (chaude)
const BAKE = V(600, 0, 0); { const r = room('bake', BAKE.x, BAKE.z, { w_: 22, d: 16, h: 9, wall: '#f3d9b0', floor: '#8a5a3a' });
  const cnt = box(14, 2.4, 2.2, mat('#c98a52', { roughness: .5 }), .1); cnt.position.set(0, 1.2, -3); r.add(cnt); const glass = box(13.6, 1.2, 1.8, new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: .25, roughness: .05 }), .05); glass.position.set(0, 3, -3); r.add(glass);
  for (let i = 0; i < 9; i++) { const c_ = croissantMesh(1.1); c_.position.set(-5.5 + i * 1.4, 2.65, -3); r.add(c_); }
  for (let s = 0; s < 3; s++) { const sh = box(14, .2, 1.4, mat('#8a5a3a')); sh.position.set(0, 4.2 + s * 1.5, -7.2); r.add(sh); for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 2.6, 10), mat('#d79a4a', { roughness: .6 })); b.rotation.z = Math.PI / 2 + (i % 2 ? .25 : -.25); b.position.set(-6 + i * 1.1, 4.55 + s * 1.5, -7.2); b.castShadow = true; r.add(b); } }
  const sign = box(9, 1.4, .15, new THREE.MeshStandardMaterial({ map: textTex(['BOULANGERIE'], { w: 1024, h: 160, size: 120, bg: '#5a2e14', fg: '#ffd27a', border: '#ffd27a' }) })); sign.position.set(0, 8, -7.8); r.add(sign);
  for (const x of [-6, 0, 6]) { const lp = new THREE.Mesh(new THREE.SphereGeometry(.5, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffc46a'), emissiveIntensity: 2.5 })); lp.position.set(x, 7, 0); r.add(lp); const l = new THREE.PointLight(0xffb860, 16, 18, 1.6); l.position.set(x, 6.4, 0); r.add(l); } }
// 4) CHAMBRE DE MALO (nuit, lampe de bureau)
const BED = V(900, 0, 0); { const r = room('bed', BED.x, BED.z, { w_: 18, d: 14, h: 8.5, wall: '#3a4a7a', floor: '#6a4a3a', ceil: '#2a3456' }); windowPane(r, 4, 5, -6.8, 4, 3, '#2a3a7a', true);
  const desk = box(6, .25, 2.4, mat('#8a6a4a')); desk.position.set(-3, 2.6, -5.4); r.add(desk); for (const x of [-5.7, -.3]) { const lg_ = box(.25, 2.6, 2.2, mat('#6a4a2a')); lg_.position.set(x, 1.3, -5.4); r.add(lg_); }
  const lampB = box(.6, .2, .6, mat('#222')); lampB.position.set(-5, 2.8, -5.8); r.add(lampB); const arm_ = box(.12, 1.6, .12, mat('#222')); arm_.position.set(-5, 3.6, -5.8); r.add(arm_); const shade_ = new THREE.Mesh(new THREE.ConeGeometry(.6, .7, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 1.6, side: THREE.DoubleSide })); shade_.position.set(-4.6, 4.3, -5.6); shade_.rotation.z = -.6; r.add(shade_);
  const dl = new THREE.SpotLight(0xffc46a, 60, 14, .9, .6, 1.4); dl.position.set(-4.5, 4.2, -5.5); dl.target.position.set(-2.5, 2.6, -4.5); r.add(dl, dl.target); dl.castShadow = true;
  const bedM = box(4.5, 1, 8, mat('#2f5f9f'), .2); bedM.position.set(6, .5, -2.5); r.add(bedM); const pil = box(3, .5, 1.4, mat('#f4f4f4'), .2); pil.position.set(6, 1.2, -5.8); r.add(pil);
  poster(r, -1, 6, -6.8, 0, ['FC', 'VILLE'], '#e8333a', '#fff', 2.2, 2.8); const moon = new THREE.DirectionalLight(0x6a8aff, .9); moon.position.set(BED.x + 8, 9, 6); moon.target.position.set(BED.x, 0, 0); scene.add(moon, moon.target);
  const chair = box(1.8, 1.8, 1.6, mat('#2a2a3a'), .1); chair.position.set(-2.6, 1, -3.4); r.add(chair); }
// 5) CUISINE (soirée, suspension)
const KIT = V(1200, 0, 0); { const r = room('kit', KIT.x, KIT.z, { w_: 20, d: 16, h: 8.5, wall: '#e8c69a', floor: '#a8784a' }); const tb = box(7, .3, 4, mat('#c98a52')); tb.position.set(0, 2.6, -2); r.add(tb); for (const [x, z] of [[-3, -3.6], [3, -3.6], [-3, -.4], [3, -.4]]) { const lg_ = box(.3, 2.5, .3, mat('#8a5a3a')); lg_.position.set(x, 1.25, z); r.add(lg_); }
  for (let i = 0; i < 5; i++) { const cb = box(2.4, 2.4, 1.2, mat('#f4efe6'), .06); cb.position.set(-7 + i * 3.2, 6.4, -7.3); r.add(cb); } const fr = box(2.6, 6, 2, mat('#e8eef2', { metalness: .3, roughness: .3 }), .2); fr.position.set(8, 3, -6.5); r.add(fr); windowPane(r, -6, 4.5, -7.8, 3.4, 2.6, '#ff9a5a');
  const pend = new THREE.Mesh(new THREE.ConeGeometry(1, .8, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2a2a', side: THREE.DoubleSide })); pend.position.set(0, 6.4, -2); r.add(pend); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe0a0' })); bulb.position.set(0, 6, -2); r.add(bulb); const pl = new THREE.PointLight(0xffc070, 30, 16, 1.5); pl.position.set(0, 5.8, -2); r.add(pl); pl.castShadow = true;
  const cord = box(.05, 2, .05, mat('#111')); cord.position.set(0, 7.5, -2); r.add(cord); }
// 6) HÔPITAL : couloir + chambre 7
const HOSP = V(1500, 0, 0); const ECG = canvasTex(512, 256, () => {}); let ecgCtx = null;
{ const r = room('hosp', HOSP.x, HOSP.z, { w_: 12, d: 60, h: 8, wall: '#dfe8ec', floor: '#b8c8cc' });
  for (let z = -26; z <= 26; z += 7) { ceilingLamp(r, 0, z, 8, 0xe6f4ff, 9, 14); for (const s of [-1, 1]) { const dr = box(.2, 5, 3, mat(z === -12 && s > 0 ? '#7ac0d8' : '#a8c8d8')); dr.position.set(s * 5.85, 2.5, z + 2); r.add(dr);
    const num = box(.1, .8, 1.2, new THREE.MeshBasicMaterial({ map: textTex([String(((z + 26) / 7) * 2 + (s > 0 ? 1 : 2))], { w: 160, h: 120, size: 90, bg: '#2a64d8', fg: '#fff', border: '#2a64d8' }) })); num.position.set(s * 5.7, 5.6, z + 2); num.rotation.y = -s * Math.PI / 2; r.add(num); } }
  const ex = box(2, .7, .1, new THREE.MeshBasicMaterial({ map: textTex(['SORTIE'], { w: 256, h: 90, size: 60, bg: '#2ecc71', fg: '#fff', border: '#2ecc71' }), toneMapped: false })); ex.position.set(0, 7, -29.7); r.add(ex);
  for (let z = -20; z <= 20; z += 10) { const ch = box(1.2, 1.4, 1.2, mat('#3a7ab8'), .1); ch.position.set(-5, .7, z); r.add(ch); } }
const CH7 = V(1530, 0, -10); { const r = room('ch7', CH7.x, CH7.z, { w_: 18, d: 16, h: 8.5, wall: '#eaf0f2', floor: '#c8d4d8' });
  const blindsTex = canvasTex(256, 256, c => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ffe9b8'); gr.addColorStop(1, '#ffd08a'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(120,90,60,.35)'; for (let y = 0; y < 256; y += 20) c.fillRect(0, y, 256, 7); });
  const win_ = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: blindsTex, toneMapped: false })); win_.position.set(-4, 5, -7.8); r.add(win_); beam(r, -2.5, 3.5, -4.5, -.7, -.35, 10, 4, '#ffe2a8', .18);
  const sunL = new THREE.SpotLight(0xffd59a, 55, 30, .5, .5, 1.2); sunL.position.set(-6, 7, -7); sunL.target.position.set(1, 1, 0); r.add(sunL, sunL.target); sunL.castShadow = true;
  const bedF = box(5, 1.4, 8.5, mat('#e8eef2', { metalness: .2 }), .2); bedF.position.set(1.5, 1.4, -2); r.add(bedF); const sheet = box(4.8, .4, 4.5, mat('#bfe0f0', { roughness: .9 }), .2); sheet.position.set(1.5, 2.25, .05); const chair7 = box(1.2, 1.0, 1.2, mat('#3a7ab8'), .12); chair7.position.set(-1.85, .5, -2.65); r.add(chair7); r.add(sheet); const pil = box(3.4, .6, 1.6, mat('#ffffff'), .25); pil.position.set(1.5, 2.4, -5.3); r.add(pil);
  for (const z of [-6, 2]) { const rail = box(5.2, .15, .15, mat('#aab4bc', { metalness: .6 })); rail.position.set(1.5, 2.9, z); r.add(rail); }
  const mon = box(2.4, 1.8, .4, mat('#1b1b22'), .1); mon.position.set(5.6, 5, -5.5); mon.rotation.y = -.5; r.add(mon); const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.5), new THREE.MeshBasicMaterial({ map: ECG, toneMapped: false })); scr.position.set(5.5, 5, -5.28); scr.rotation.y = -.5; r.add(scr); const pole = box(.15, 5, .15, mat('#aab4bc', { metalness: .6 })); pole.position.set(5.8, 2.5, -5.7); r.add(pole);
  const tbl = box(2, .2, 2, mat('#d8dee2')); tbl.position.set(-2.6, 2.6, -4.6); r.add(tbl); const tl = box(.2, 2.6, .2, mat('#aab4bc')); tl.position.set(-2.6, 1.3, -4.6); r.add(tl);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(.28, .22, .7, 12), new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: .6 })); vase.position.set(-3.1, 3.05, -5); r.add(vase); for (let i = 0; i < 4; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), mat(['#ff8fb4', '#ffd23f', '#ff9f5a', '#c38bff'][i])); fl.position.set(-3.1 + (i - 1.5) * .18, 3.7 + (i % 2) * .15, -5); r.add(fl); }
  const lowL = new THREE.PointLight(0xdfefff, 4, 16, 1.6); lowL.position.set(2, 7, 2); r.add(lowL); }
// cadre photo (recto : homme + bébé ; verso : écriture)
const photoFront = canvasTex(512, 640, c => { c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, 512, 640); const gr = c.createLinearGradient(0, 40, 0, 520); gr.addColorStop(0, '#9fd0ff'); gr.addColorStop(1, '#ffe0b0'); c.fillStyle = gr; c.fillRect(32, 32, 448, 470);
  c.fillStyle = '#5a7a4a'; c.fillRect(150, 300, 220, 210); c.fillStyle = '#f0c8a2'; c.beginPath(); c.roundRect(176, 150, 170, 160, 50); c.fill(); c.fillStyle = '#2b1a14'; c.beginPath(); c.roundRect(170, 130, 182, 60, 30); c.fill(); c.fillStyle = '#3a2418'; c.beginPath(); c.roundRect(186, 250, 150, 70, 30); c.fill();
  c.fillStyle = '#1a1410'; for (const x of [226, 296]) { c.beginPath(); c.arc(x, 215, 9, 0, 7); c.fill(); } c.strokeStyle = '#1a1410'; c.lineWidth = 6; c.beginPath(); c.arc(261, 245, 26, .2 * Math.PI, .8 * Math.PI); c.stroke();
  c.fillStyle = '#bfe3ff'; c.beginPath(); c.ellipse(262, 400, 90, 60, 0, 0, 7); c.fill(); c.fillStyle = '#f6cfa8'; c.beginPath(); c.arc(300, 372, 44, 0, 7); c.fill(); c.strokeStyle = '#1a1410'; c.lineWidth = 5; for (const x of [286, 314]) { c.beginPath(); c.arc(x, 368, 8, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke(); }
  c.fillStyle = 'rgba(255,240,200,.25)'; c.fillRect(32, 32, 448, 470); });
const photoBack = canvasTex(512, 640, c => { c.fillStyle = '#f1ead8'; c.fillRect(0, 0, 512, 640); c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * 512, Math.random() * 640, 3, 3); c.fillStyle = '#2a3a8a'; c.font = "italic 700 92px Georgia, serif"; c.textAlign = 'center'; c.fillText('Malo,', 256, 290); c.fillText('6 mois', 256, 400); c.font = "italic 700 46px Georgia, serif"; c.fillText('mon fils ♥', 300, 500); });
const photo = new THREE.Group(); { const fr = box(2.1, 2.6, .12, mat('#8a5a2a', { roughness: .4 }), .05); photo.add(fr); const pf = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.25), new THREE.MeshStandardMaterial({ map: photoFront, roughness: .3 })); pf.position.z = .07; photo.add(pf); const pb = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.25), new THREE.MeshStandardMaterial({ map: photoBack })); pb.position.z = -.07; pb.rotation.y = Math.PI; photo.add(pb); }
scene.add(photo);
// fil doré entre le père et le compteur de Malo
const threadMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .9, toneMapped: false }); let thread = null;
function setThread(a, b, k) { if (thread) { scene.remove(thread); thread.geometry.dispose(); thread = null; } if (k <= 0) return; const mid = a.clone().lerp(b, .5).add(V(0, 2.5, 0)); const curve = new THREE.QuadraticBezierCurve3(a, mid, b); const pts = curve.getPoints(40).slice(0, Math.max(2, Math.floor(41 * k)));
  thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .05, 6), threadMat); scene.add(thread); }
// pépinière (flash-back bébé, sépia)
const NURS = V(1800, 0, 0); { const r = room('nurs', NURS.x, NURS.z, { w_: 14, d: 12, h: 8, wall: '#f4e2c8', floor: '#c8a882' }); const crib = box(4.6, .3, 3, mat('#f4f4f0')); crib.position.set(0, 2.2, -2); r.add(crib); for (let i = 0; i < 12; i++) { const b = box(.12, 1.6, .12, mat('#f4f4f0')); b.position.set(-2.2 + (i % 6) * .88, 2.9, i < 6 ? -3.4 : -.6); r.add(b); }
  const ml = new THREE.PointLight(0xffd8a0, 14, 14, 1.6); ml.position.set(0, 6.5, 0); r.add(ml); windowPane(r, 4, 4.5, -5.8, 2.6, 2.2, '#ffd08a'); }
