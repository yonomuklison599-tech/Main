// ================================================================ MOTEUR PERSONNAGES V2 — détaillés, éclairés
// Lumière de scène : direction (vers la source), couleur de contre-jour, couleur d'ombre
let LIGHT = { dir: [-.7, -.7], rim: 'rgba(255,236,200,.95)', amb: 'rgba(30,30,70,.42)', rimW: 9, key: 'rgba(255,240,220,0)' };
const OFF = [document.createElement('canvas'), document.createElement('canvas')];
function withCtx(ctx, fn) { const old = g; g = ctx; try { fn(); } finally { g = old; } }

const C2 = {
  malo: { skin: '#f6cfa8', hair: '#2b1a14', style: 'curly', top: '#2f4f8f', top2: '#24406f', hood: 1, pants: '#2a2f3d', shoe: '#e9e9e9', sole: '#bdbdbd', iris: '#5a3a22' },
  star: { skin: '#ffe0c4', hair: '#f2c94c', style: 'long', top: '#ff6fa8', top2: '#e5528d', pants: '#f4f1f6', shoe: '#fff', sole: '#ddd', iris: '#3d8fd6', lashes: 1 },
  prof: { skin: '#e2a878', hair: '#3a2a20', style: 'cap', cap: '#e8333a', top: '#2f8a5a', top2: '#256f48', zip: 1, pants: '#2f8a5a', shoe: '#fff', sole: '#ccc', iris: '#4a3020', whistle: 1, mustache: '#3a2a20' },
  boulangere: { skin: '#f8d4b4', hair: '#8a4a2a', style: 'bun', top: '#f4efe6', top2: '#ddd6c8', apron: '#c96b3a', pants: '#3a3040', shoe: '#5a4a5a', sole: '#333', iris: '#6a4a2a', lashes: 1 },
  mere: { skin: '#f6cfa8', hair: '#5a3220', style: 'bun', top: '#8a6ad6', top2: '#7356c0', pants: '#3a3060', shoe: '#4a3a6a', sole: '#222', iris: '#5a3a22', lashes: 1 },
  pote: { skin: '#9a6440', hair: '#151515', style: 'short', top: '#f0b429', top2: '#d69a18', pants: '#2d3a5a', shoe: '#fff', sole: '#ccc', iris: '#2a1a10' },
  crush: { skin: '#ffe2c8', hair: '#6b3a2a', style: 'pony', top: '#3aa889', top2: '#2e8c72', pants: '#3a3a4a', shoe: '#fff', sole: '#ccc', iris: '#2e7d4f', lashes: 1 },
  amie: { skin: '#c9906a', hair: '#1a1a1a', style: 'long', top: '#7a5bd6', top2: '#6648c0', pants: '#2a2a3a', shoe: '#fff', sole: '#ccc', iris: '#2a1a10', lashes: 1 },
  passant1: { skin: '#f0c49c', hair: '#7a5a3a', style: 'short', top: '#d9534f', top2: '#b8433f', pants: '#3a4a6a', shoe: '#222', sole: '#111', iris: '#3a2a20' },
  passant2: { skin: '#b87a52', hair: '#222', style: 'pony', top: '#4aa3df', top2: '#3a88c0', pants: '#2a2a3a', shoe: '#fff', sole: '#ccc', iris: '#2a1a10', lashes: 1 },
  passant3: { skin: '#ffe0c4', hair: '#bbb', style: 'bun', top: '#c96b8a', top2: '#a85672', pants: '#4a3a4a', shoe: '#5a4a5a', sole: '#222', iris: '#4a6a8a', lashes: 1, glasses: 1 },
  pere: { skin: '#f0c8a2', hair: '#cfcfcf', style: 'oldman', beard: '#d8d8d8', top: '#cfe3ee', top2: '#b4cfdc', gown: 1, pants: '#cfe3ee', shoe: '#fff', sole: '#ccc', iris: '#5a3a22' },
  pereJeune: { skin: '#f0c8a2', hair: '#2b1a14', style: 'short', beard: '#3a2418', top: '#5a7a4a', top2: '#4a663c', pants: '#2a2f3d', shoe: '#222', sole: '#111', iris: '#5a3a22' },
};
// poses : [épaule G, coude G, épaule D, coude D] (radians, 0 = bras le long du corps)
const POSE = { down: [.12, .08, .12, .08], hips: [.6, -1.7, .6, -1.7], wave: [.15, .1, 2.7, .6], up: [2.6, .3, 2.6, .3], point: [.15, .1, 1.5, .05], phone: [.15, .1, .45, 2.2], hold: [.4, 1.3, .4, 1.3],
  cross: [.55, 2.25, .55, 2.25], think: [.15, .1, .35, 2.6], shrug: [.9, 2.1, .9, 2.1], hug: [1.25, 1.2, 1.25, 1.2], tray: [.5, 1.55, .5, 1.55], reach: [.15, .1, 1.1, .2], fist: [.15, .1, 2.85, .15], sit: [.5, 1.2, .5, 1.2], cast: [.15, .1, .5, 1.75] };
function poseOf(p, t) { if (Array.isArray(p)) return p; if (typeof p === 'object' && p.a) { const A = poseOf(p.a, t), B = poseOf(p.b, t), k = ease(p.k); return A.map((v, i) => lerp(v, B[i], k)); } const P = POSE[p || 'down'].slice(); if (p === 'wave') P[3] += Math.sin(t * 11) * .4; return P; }

function shapePath(pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function limb(x0, y0, a1, l1, a2, l2, w_, col, outW = 7) { const ex = x0 + Math.sin(a1) * l1, ey = y0 + Math.cos(a1) * l1, hx = ex + Math.sin(a2) * l2, hy = ey + Math.cos(a2) * l2;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, ey); g.lineTo(hx, hy); g.lineWidth = w_ + outW * 2; g.strokeStyle = OUT; g.stroke(); g.lineWidth = w_; g.strokeStyle = col; g.stroke(); return [ex, ey, hx, hy]; }
function hand(x, y, ang, skin, sc = 1) { g.save(); g.translate(x, y); g.rotate(-ang); g.scale(sc, sc); g.beginPath(); g.ellipse(0, 6, 24, 27, 0, 0, Math.PI * 2); fillStroke(skin, 6); g.beginPath(); g.ellipse(-20, -2, 9, 15, -.6, 0, Math.PI * 2); fillStroke(skin, 5);
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 8, 22); g.lineTo(i * 8, 30); g.stroke(); } g.restore(); }

// objets tenus (dessinés dans le repère de la main)
function heldItem(kind, t, o) {
  switch (kind) {
    case 'phone': rr(-26, -70, 52, 100, 10); fillStroke('#1b1b22', 5); rr(-21, -64, 42, 86, 6); fillStroke(lg(0, -64, 0, 22, ['#7ac8ff', '#5a6ad6']), 0); for (let i = 0; i < 3; i++) { rr(-16, -56 + i * 22, 32, 14, 4); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); } break;
    case 'photo': g.rotate(.15); rr(-60, -90, 120, 150, 4); fillStroke('#fbfbf7', 5); rr(-50, -80, 100, 100, 3); fillStroke('#c8b48a', 0); circ(-12, -40, 16); g.fillStyle = '#e9c8a0'; g.fill(); circ(20, -30, 11); g.fill(); break;
    case 'croissant': g.rotate(-.3); g.beginPath(); g.moveTo(-60, 10); g.quadraticCurveTo(-40, -45, 0, -48); g.quadraticCurveTo(40, -45, 60, 10); g.quadraticCurveTo(30, -10, 0, -12); g.quadraticCurveTo(-30, -10, -60, 10); fillStroke('#e3a447', 5); for (const x of [-30, 0, 30]) { g.beginPath(); g.moveTo(x, -40); g.lineTo(x * .8, -12); g.strokeStyle = '#a86a20'; g.lineWidth = 4; g.stroke(); } break;
    case 'tray': rr(-120, -16, 240, 22, 8); fillStroke('#8a5a2a', 5); for (let i = 0; i < 4; i++) { g.save(); g.translate(-80 + i * 54, -24); g.scale(.55, .55); heldItem('croissant', t, o); g.restore(); } break;
    case 'bills': for (let i = 0; i < 3; i++) { g.save(); g.rotate(-.15 + i * .12); rr(-45, -70, 90, 110, 3); fillStroke('#fdfdf8', 4); g.fillStyle = 'rgba(0,0,0,.25)'; for (let j = 0; j < 4; j++) g.fillRect(-35, -55 + j * 18, 60, 5); txt('€', 24, 22, 26, '#e8333a'); g.restore(); } break;
    case 'whistle': rr(-14, -10, 34, 20, 8); fillStroke('#c0c8d0', 4); break;
    case 'ball': circ(0, -40, 46); fillStroke('#fff', 6); g.fillStyle = OUT; shapePath([-12, -56, 12, -56, 18, -36, 0, -24, -18, -36]); g.fill(); break;
    case 'cake': rr(-70, -60, 140, 60, 10); fillStroke('#ffb3c8', 5); rr(-70, -72, 140, 18, 8); fillStroke('#fff', 4); rr(-4, -110, 8, 40, 3); fillStroke('#7ac8ff', 3); glow(0, -118, 30, 'rgba(255,200,80,1)'); break;
    case 'flower': g.strokeStyle = '#2e7d4f'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -80); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; circ(Math.cos(a) * 16, -90 + Math.sin(a) * 16, 12); fillStroke('#ff8fb4', 3); } circ(0, -90, 9); fillStroke('#ffd23f', 3); break;
  }
}

function hairBack2(C) { if (C.style === 'long') { g.beginPath(); g.moveTo(-118, -40); g.quadraticCurveTo(-150, 120, -110, 230); g.lineTo(110, 230); g.quadraticCurveTo(150, 120, 118, -40); g.closePath(); fillStroke(C.hair, 7); } if (C.style === 'pony') { g.save(); g.translate(110, -20); g.rotate(.4); rr(-30, -10, 60, 190, 30); fillStroke(C.hair, 7); g.restore(); } if (C.style === 'bun') { circ(0, -128, 46); fillStroke(C.hair, 7); } }
function hairFront2(C, t) {
  g.lineJoin = 'round'; const H = C.hair, hl = shade(H, .35);
  const strand = (pts) => { shapePath(pts); fillStroke(H, 7); };
  switch (C.style) {
    case 'curly': for (let i = 0; i < 11; i++) { const a = Math.PI * (1.02 + i * .087), r = 104 + (i % 2) * 8; circ(Math.cos(a) * r * .95, -14 + Math.sin(a) * r * .9, 34); fillStroke(H, 6); }
      g.beginPath(); g.arc(0, -16, 100, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = H; g.fill(); for (let i = 0; i < 4; i++) { circ(-55 + i * 36, -48 - (i % 2) * 8, 26); fillStroke(H, 5); }
      g.strokeStyle = hl; g.lineWidth = 4; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-70 + i * 34, -78, 12, Math.PI * 1.1, Math.PI * 1.7); g.stroke(); } break;
    case 'long': g.beginPath(); g.arc(0, -14, 116, Math.PI * 1.0, Math.PI * 2.0); g.lineTo(110, -20); g.quadraticCurveTo(70, -64, 10, -58); g.quadraticCurveTo(-40, -30, -60, -60); g.quadraticCurveTo(-90, -50, -112, -10); g.closePath(); fillStroke(H, 7); g.strokeStyle = hl; g.lineWidth = 5; g.beginPath(); g.moveTo(-60, -100); g.quadraticCurveTo(-20, -120, 30, -110); g.stroke(); break;
    case 'pony': g.beginPath(); g.arc(0, -14, 116, Math.PI * 1.0, Math.PI * 2.0); g.quadraticCurveTo(40, -70, -10, -58); g.quadraticCurveTo(-70, -50, -116, -14); g.closePath(); fillStroke(H, 7); circ(100, -50, 14); fillStroke('#ff6fa8', 4); g.strokeStyle = hl; g.lineWidth = 5; g.beginPath(); g.moveTo(-50, -100); g.quadraticCurveTo(0, -118, 50, -100); g.stroke(); break;
    case 'bun': g.beginPath(); g.arc(0, -12, 116, Math.PI * 1.0, Math.PI * 2.0); g.quadraticCurveTo(60, -40, 6, -70); g.quadraticCurveTo(-60, -40, -116, -12); g.closePath(); fillStroke(H, 7); g.strokeStyle = hl; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, -100); g.quadraticCurveTo(10, -114, 60, -96); g.stroke(); break;
    case 'short': g.beginPath(); g.arc(0, -12, 115, Math.PI * 1.0, Math.PI * 2.0); g.lineTo(108, -30); g.quadraticCurveTo(30, -70, -40, -52); g.lineTo(-108, -30); g.closePath(); fillStroke(H, 7); break;
    case 'cap': g.beginPath(); g.arc(0, -18, 116, Math.PI, Math.PI * 2); g.closePath(); fillStroke(C.cap, 7); rr(-20, -36, 170, 30, 14); fillStroke(shade(C.cap, -.25), 7); circ(0, -128, 10); fillStroke(shade(C.cap, -.25), 4); break;
    case 'oldman': for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(sx * (92 - i * 6), -30 + i * 22, 16, 14, 0, 0, Math.PI * 2); g.fillStyle = H; g.fill(); } g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, -40 + i * 14, 50 - i * 8, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); } break;
  }
}
// visage détaillé
function face2(C, t, o) {
  const e = o.expr || 'neutral', lk = o.look || [0, 0];
  const autoBlink = ((t + (C.skin.charCodeAt(3) % 7) * .37) % 3.6) < .11;
  let open = { neutral: 1, smile: .85, happy: .15, laugh: .1, sad: .8, shock: 1.25, angry: .75, smug: .55, love: .7, sleep: 0, worried: 1, tender: .6, focus: .7 }[e] ?? 1;
  if (o.open !== undefined) open = o.open; if (autoBlink && e !== 'sleep' && o.open === undefined) open = .05;
  // joues
  g.save(); g.globalAlpha = (e === 'love' || o.blush) ? .55 : .2; g.fillStyle = '#ff7a8a'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 64, 38, 22, 13, 0, 0, Math.PI * 2); g.fill(); } g.restore();
  for (const sx of [-1, 1]) {
    g.save(); g.translate(sx * 40, -8);
    if ((e === 'happy' || e === 'laugh') && o.open === undefined) { g.beginPath(); g.arc(0, 10, 22, Math.PI * 1.12, Math.PI * 1.88); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
    else if (open < .12) { g.beginPath(); g.arc(0, -2, 22, Math.PI * .15, Math.PI * .85); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); if (C.lashes) { for (const a of [.3, .5, .7]) { g.beginPath(); g.moveTo(Math.cos(Math.PI * a) * 22, -2 + Math.sin(Math.PI * a) * 22); g.lineTo(Math.cos(Math.PI * a) * 30, 2 + Math.sin(Math.PI * a) * 28); g.lineWidth = 3; g.stroke(); } } }
    else {
      const ry = 30 * Math.min(1.3, open); g.save(); g.beginPath(); g.ellipse(0, 0, 25, ry, 0, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.clip();
      const ix = lk[0] * 9, iy = lk[1] * 8 + 3, ir = e === 'shock' ? 13 : 17; circ(ix, iy, ir); g.fillStyle = lg(0, iy - ir, 0, iy + ir, [shade(C.iris, .25), C.iris]); g.fill(); circ(ix, iy, ir * .5); g.fillStyle = '#120c0a'; g.fill();
      circ(ix + 6, iy - 7, 5.5); g.fillStyle = '#fff'; g.fill(); circ(ix - 5, iy + 6, 2.5); g.fill(); if (o.eyeGlow) { glow(ix, iy, 30, o.eyeGlow); }
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-30, -ry, 60, ry * .45); g.restore();
      g.beginPath(); g.ellipse(0, 0, 25, ry, 0, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.beginPath(); g.ellipse(0, 0, 25, ry, 0, Math.PI * .2, Math.PI * .8); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
      if (C.lashes) { g.beginPath(); g.moveTo(sx * 22, -ry * .7); g.lineTo(sx * 34, -ry * .95); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); }
    }
    // sourcils
    const lift = { shock: -16, worried: -8, sad: -6, angry: 6, focus: 4 }[e] || 0, tilt = { angry: .4, sad: -.35, worried: -.4, smug: sx > 0 ? -.3 : .1, focus: .2 }[e] || 0;
    g.beginPath(); g.moveTo(-20, -44 + lift + tilt * sx * 14); g.quadraticCurveTo(0, -54 + lift, 20, -46 + lift - tilt * sx * 14); g.lineWidth = 10; g.strokeStyle = shade(C.hair === '#cfcfcf' ? '#9a9a9a' : C.hair, -.15); g.stroke();
    g.restore();
  }
  if (C.glasses) { for (const sx of [-1, 1]) { circ(sx * 40, -6, 36); g.lineWidth = 5; g.strokeStyle = '#3a3a3a'; g.stroke(); } }
  // nez
  g.beginPath(); g.moveTo(-6, 18); g.quadraticCurveTo(4, 30, -4, 34); g.lineWidth = 4; g.strokeStyle = 'rgba(120,60,40,.45)'; g.stroke();
  if (C.mustache) { g.beginPath(); g.ellipse(-18, 48, 22, 10, -.2, 0, Math.PI * 2); g.ellipse(18, 48, 22, 10, .2, 0, Math.PI * 2); g.fillStyle = C.mustache; g.fill(); }
  // bouche
  const my = 62, talk = o.talk ? Math.max(0, Math.sin(t * 17) * .6 + Math.sin(t * 7.3) * .4) * o.talk : 0;
  const mouthOpen = (w_, h) => { g.beginPath(); g.moveTo(-w_, 0); g.quadraticCurveTo(0, -h * .25, w_, 0); g.quadraticCurveTo(0, h * 1.3, -w_, 0); g.closePath(); };
  g.save(); g.translate(0, my);
  if (talk > .12) { mouthOpen(20, 10 + talk * 26); fillStroke('#6a1e2a', 6); g.save(); mouthOpen(20, 10 + talk * 26); g.clip(); rr(-18, -4, 36, 9, 3); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.ellipse(0, 10 + talk * 20, 14, 9, 0, 0, Math.PI * 2); g.fillStyle = '#e06a7a'; g.fill(); g.restore(); }
  else if (e === 'laugh' || e === 'happy') { mouthOpen(32, 30); fillStroke('#6a1e2a', 6); g.save(); mouthOpen(32, 30); g.clip(); rr(-30, -5, 60, 11, 4); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.ellipse(0, 26, 20, 12, 0, 0, Math.PI * 2); g.fillStyle = '#e06a7a'; g.fill(); g.restore(); }
  else if (e === 'smile' || e === 'love' || e === 'tender') { g.beginPath(); g.moveTo(-26, -4); g.quadraticCurveTo(0, 18, 26, -4); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); }
  else if (e === 'smug') { g.beginPath(); g.moveTo(-22, 2); g.quadraticCurveTo(8, 12, 28, -10); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); }
  else if (e === 'sad' || e === 'worried') { g.beginPath(); g.moveTo(-20, 10); g.quadraticCurveTo(0, -6, 20, 10); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); }
  else if (e === 'shock') { g.beginPath(); g.ellipse(0, 8, 15, 21, 0, 0, Math.PI * 2); fillStroke('#5a1525', 6); }
  else if (e === 'angry') { g.beginPath(); g.moveTo(-22, 8); g.quadraticCurveTo(0, 0, 22, 8); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); }
  else if (e === 'sleep') { g.beginPath(); g.moveTo(-12, 4); g.quadraticCurveTo(0, 9, 12, 4); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); }
  else { g.beginPath(); g.moveTo(-15, 4); g.lineTo(15, 4); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); }
  g.restore();
  if (C.beard) { g.beginPath(); g.moveTo(-98, 0); g.quadraticCurveTo(-92, 118, 0, 128); g.quadraticCurveTo(92, 118, 98, 0); g.quadraticCurveTo(64, 74, 26, 50); g.quadraticCurveTo(0, 46, -26, 50); g.quadraticCurveTo(-64, 74, -98, 0); fillStroke(C.beard, 5); }
  if (o.tear) { const k = (t * .7) % 1; for (const sx of [-1, 1]) { g.save(); g.translate(sx * 46, 22); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sx * 4, 40 * k + 10, 0, 60 * k + 12); g.lineWidth = 7; g.strokeStyle = 'rgba(140,210,255,.85)'; g.stroke(); circ(0, 60 * k + 14, 7); g.fillStyle = 'rgba(160,220,255,.95)'; g.fill(); g.restore(); } }
  if (o.sweat) { g.save(); g.translate(96, -64 + (t * 30) % 24); g.beginPath(); g.moveTo(0, -22); g.quadraticCurveTo(14, 4, 0, 10); g.quadraticCurveTo(-14, 4, 0, -22); fillStroke('#a8e0ff', 4); g.restore(); }
}

// personnage complet (sans éclairage)
function body2(id, t, o) {
  const C = C2[id]; const P = poseOf(o.arms, t); const breath = Math.sin(t * 2.4 + (o.seed || 0)) * .012;
  const walk = o.walk ? Math.sin(t * 9 * o.walk) : 0, bob = o.walk ? Math.abs(Math.cos(t * 9 * o.walk)) * 10 : (o.bob ? Math.sin(t * o.bob * 6) * 7 : 0);
  if (!o.noLegs) for (const sx of [-1, 1]) { const a = (o.sit ? 1.45 : walk * .45 * sx), kb = o.sit ? -1.45 : (o.walk ? Math.max(0, -walk * sx) * .7 : 0);
    const [kx, ky, fx, fy] = limb(sx * 44, -250 - bob * 0, -a, 125, -a - kb, 120, 66, C.pants); g.save(); g.translate(fx, fy); g.rotate(o.sit ? 0 : -a * .3); rr(-42 + sx * 6, -8, 92, 34, 16); fillStroke(C.shoe, 7); g.fillStyle = C.sole; g.fillRect(-40 + sx * 6, 18, 88, 6); g.restore(); }
  g.save(); g.translate(0, -bob);
  // bras arrière
  const SH = -395, arm = (sx, a1, a2) => limb(sx * 104, SH, a1 * sx, 112, (a1 + a2) * sx, 104, 46, sx < 0 ? C.top2 : C.top);
  const armL = arm(-1, P[0] + (o.walk ? walk * .35 : 0), P[1]);
  // torse
  g.save(); g.scale(1, 1 + breath); g.beginPath(); g.moveTo(-104, SH - 8); g.quadraticCurveTo(-118, SH + 60, -92, -240); g.quadraticCurveTo(0, -226, 92, -240); g.quadraticCurveTo(118, SH + 60, 104, SH - 8); g.quadraticCurveTo(0, SH - 30, -104, SH - 8); g.closePath();
  fillStroke(lg(-100, 0, 100, 0, [C.top2, C.top, C.top]), 7);
  if (C.hood) { g.beginPath(); g.ellipse(0, SH - 4, 86, 28, 0, 0, Math.PI * 2); fillStroke(C.top2, 6); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 18, SH + 10); g.lineTo(sx * 22, SH + 92); g.lineWidth = 5; g.strokeStyle = '#eee'; g.stroke(); circ(sx * 22, SH + 96, 6); g.fillStyle = '#ddd'; g.fill(); } rr(-62, -320, 124, 64, 18); fillStroke(C.top2, 5); }
  if (C.zip) { g.beginPath(); g.moveTo(0, SH - 10); g.lineTo(0, -236); g.lineWidth = 5; g.strokeStyle = '#ddd'; g.stroke(); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 40, SH - 6); g.lineTo(sx * 30, SH + 40); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); } }
  if (C.apron) { rr(-72, -350, 144, 160, 26); fillStroke(C.apron, 5); rr(-36, -300, 72, 40, 10); fillStroke(shade(C.apron, -.15), 4); }
  if (C.gown) { g.fillStyle = 'rgba(90,140,180,.35)'; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { circ(-70 + i * 28, -370 + j * 34, 4); g.fill(); } }
  if (C.whistle) { g.beginPath(); g.moveTo(-50, SH - 4); g.quadraticCurveTo(0, SH + 70, 50, SH - 4); g.lineWidth = 4; g.strokeStyle = '#e8333a'; g.stroke(); g.save(); g.translate(0, SH + 66); heldItem('whistle', t, o); g.restore(); }
  g.restore();
  // cou + tête
  rr(-26, SH - 46, 52, 50, 14); fillStroke(shade(C.skin, -.1), 6);
  g.save(); g.translate(0, -505 + (o.headDy || 0)); g.rotate(o.tilt || 0);
  hairBack2(C);
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 100, 8, 18, 24, 0, 0, Math.PI * 2); fillStroke(shade(C.skin, -.05), 6); }
  g.beginPath(); g.ellipse(0, 0, 104, 112, 0, 0, Math.PI * 2); fillStroke(lg(0, -112, 0, 112, [shade(C.skin, .08), C.skin, shade(C.skin, -.06)]), 7);
  face2(C, t, o); hairFront2(C, t);
  g.restore();
  // bras avant + mains + objets
  const armR = arm(1, P[2] - (o.walk ? walk * .35 : 0), P[3]);
  if (o.cast) { g.save(); const [ex, ey, hx, hy] = armR; g.lineCap = 'round'; g.beginPath(); g.moveTo(lerp(ex, hx, .1), lerp(ey, hy, .1)); g.lineTo(lerp(ex, hx, .85), lerp(ey, hy, .85)); g.lineWidth = 62; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 50; g.strokeStyle = '#f4f4f0'; g.stroke();
    g.beginPath(); g.moveTo(104, SH + 20); g.lineTo(lerp(ex, hx, .5), lerp(ey, hy, .5)); g.lineWidth = 10; g.strokeStyle = '#4a7ab8'; g.stroke(); g.restore(); }
  const handAt = (seg_, item) => { const [ex, ey, hx, hy] = seg_; const ang = Math.atan2(hx - ex, hy - ey); hand(hx, hy, ang, C.skin); if (item) { g.save(); g.translate(hx, hy); g.rotate(-ang + Math.PI); g.rotate(Math.PI); heldItem(item, t, o); g.restore(); } };
  handAt(armL, o.holdL); handAt(armR, o.holdR);
  g.restore();
}
// rendu éclairé : contre-jour + ombre propre, dans une toile hors écran
function perso2(id, x, y, s, t, o = {}) {
  const bw = Math.ceil(760 * s), bh = Math.ceil(1000 * s), A = OFF[0], B = OFF[1];
  if (A.width < bw || A.height < bh) { A.width = B.width = Math.max(A.width, bw); A.height = B.height = Math.max(A.height, bh); }
  const ax = A.getContext('2d'), bx = B.getContext('2d'); ax.setTransform(1, 0, 0, 1, 0, 0); ax.clearRect(0, 0, A.width, A.height); bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, B.width, B.height);
  withCtx(ax, () => { g.save(); g.translate(bw / 2, bh - 60 * s); g.scale(s * (o.flip ? -1 : 1), s); body2(id, t, o); g.restore(); });
  const d = LIGHT.dir, L = Math.hypot(d[0], d[1]) || 1, dx = d[0] / L, dy = d[1] / L;
  ax.globalCompositeOperation = 'source-atop'; const gr = ax.createLinearGradient(bw / 2 + dx * bw * .5, bh / 2 + dy * bh * .5, bw / 2 - dx * bw * .5, bh / 2 - dy * bh * .5); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, LIGHT.amb); ax.fillStyle = gr; ax.fillRect(0, 0, bw, bh);
  if (o.tint) { ax.fillStyle = o.tint; ax.fillRect(0, 0, bw, bh); }
  bx.globalCompositeOperation = 'source-over'; bx.drawImage(A, 0, 0); bx.globalCompositeOperation = 'source-in'; bx.fillStyle = LIGHT.rim; bx.fillRect(0, 0, bw, bh); bx.globalCompositeOperation = 'destination-out'; const rw = LIGHT.rimW * s; bx.drawImage(A, -dx * rw, -dy * rw);
  bx.globalCompositeOperation = 'destination-in'; const mg = bx.createLinearGradient(bw / 2 + dx * bw * .45, bh / 2 + dy * bh * .45, bw / 2, bh / 2); mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = mg; bx.fillRect(0, 0, bw, bh);
  ax.globalCompositeOperation = 'lighter'; ax.globalAlpha = .75; ax.drawImage(B, 0, 0); ax.globalAlpha = 1; ax.globalCompositeOperation = 'source-over';
  // ombre de contact puis personnage
  g.save(); g.globalAlpha = .35 * (o.alpha ?? 1); g.fillStyle = '#000'; g.filter = 'blur(10px)'; g.beginPath(); g.ellipse(x - dx * 40 * s, y + 4, 140 * s, 26 * s, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); if (o.alpha !== undefined) g.globalAlpha = o.alpha; if (o.blur) g.filter = `blur(${o.blur}px)`; g.drawImage(A, 0, 0, bw, bh, x - bw / 2, y - bh + 60 * s, bw, bh); g.restore();
  return { head: [x, y - 505 * s], top: [x, y - 640 * s] };
}
// compteur au-dessus de la tête
function counter(x, y, n, s = 1, o = {}) { const col = o.col || (n >= 100 ? '#ffd23f' : n >= 10 ? '#7ae0a0' : n === 0 ? '#8a8a9a' : '#7ac8ff'); const pop = o.pop ?? 1;
  g.save(); g.translate(x, y + Math.sin((o.t || 0) * 2.2 + x) * 4); g.scale(s * pop, s * pop); glow(0, 0, 130, col.replace('#', '') ? hexA(col, .45) : col);
  g.font = F(54); const label = String(n), tw = g.measureText(label).width + 100; rr(-tw / 2, -38, tw, 76, 38); g.fillStyle = 'rgba(12,14,24,.82)'; g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
  g.save(); g.translate(-tw / 2 + 36, 0); g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(0, -16, 18, 0); g.quadraticCurveTo(0, 16, -18, 0); g.fillStyle = '#fff'; g.fill(); circ(0, 0, 7); g.fillStyle = col; g.fill(); g.restore();
  txt(label, 16, 3, 54, col, { glow: col, blur: 18 }); g.restore(); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
// rayons de lumière volumétriques
function rays(x, y, ang, spread, len, col, a = .25, n = 5) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const aa = ang + (i / (n - 1) - .5) * spread, w_ = 40 + hash(i) * 70; g.globalAlpha = a * (.5 + hash(i + 3) * .5);
  const gr = g.createLinearGradient(x, y, x + Math.cos(aa) * len, y + Math.sin(aa) * len); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(aa - .04) * len - w_, y + Math.sin(aa - .04) * len); g.lineTo(x + Math.cos(aa + .04) * len + w_, y + Math.sin(aa + .04) * len); g.closePath(); g.fill(); } g.restore(); }
function blurred(px, fn) { g.save(); g.filter = `blur(${px}px)`; fn(); g.restore(); }
