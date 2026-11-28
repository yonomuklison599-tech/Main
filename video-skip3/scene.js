// « Le Souvenir » — animation 2D canvas, rendu image par image via window.render(t)
'use strict';
const W = 1080, H = 1920, VO = 0.15;
const cv = document.getElementById('out'), g = cv.getContext('2d');
let CAP = [], END = 0;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOut = k => 1 - Math.pow(1 - clamp(k), 3);
const eBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const w = i => CAP[Math.min(i, CAP.length - 1)].t + VO;
const we = i => CAP[Math.min(i, CAP.length - 1)].e + VO;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const OUT = '#1a1726';
const F = (s, wt = 900) => `${wt} ${s}px 'Inter Display', sans-serif`;

// ---------------------------------------------------------------- primitives
function rr(x, y, w_, h, r) { g.beginPath(); g.roundRect(x, y, w_, h, r); }
function fillStroke(fill, lw = 7, stroke = OUT) { g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function circ(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function lg(x0, y0, x1, y1, stops) { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => q.addColorStop(i / (stops.length - 1), c)); return q; }
function glow(x, y, r, col, a = 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
function shadowEl(x, y, rx, a = .28) { g.save(); g.globalAlpha = a; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, rx, rx * .18, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
function txt(s, x, y, size, fill = '#fff', o = {}) {
  g.save(); g.font = F(size, o.wt || 900); g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  if (o.ls) g.letterSpacing = o.ls + 'px';
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 30; }
  if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.sw || size * .2; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y); g.restore();
}
function pill(s, x, y, size, bg, fg = '#fff', o = {}) {
  g.save(); g.font = F(size); const tw = g.measureText(s).width + size * 1.1, th = size * 1.55;
  g.translate(x, y); g.rotate(o.rot || 0); const sc = o.sc ?? 1; g.scale(sc, sc);
  rr(-tw / 2, -th / 2, tw, th, o.r ?? th * .28); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowOffsetY = 8; g.shadowBlur = 0; fillStroke(bg, o.lw ?? 6); g.shadowColor = 'transparent';
  txt(s, 0, 2, size, fg); g.restore();
}
// tampon (REFUSÉ, RÂTEAU…) qui s'écrase avec rebond
function stamp(s, x, y, size, col, t0, t, rot = -.12) {
  const k = t - t0; if (k < 0) return; const a = eOut(k / .18), sc = lerp(2.4, 1, a);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = clamp(k / .08);
  g.font = F(size); const tw = g.measureText(s).width + size * .9, th = size * 1.45;
  rr(-tw / 2, -th / 2, tw, th, 18); g.lineWidth = 12; g.strokeStyle = col; g.stroke(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
  txt(s, 0, 4, size, col); g.restore();
}
function popIn(t0, t, d = .3) { return eBack((t - t0) / d); }
// bulle de dialogue
function bubble(s, x, y, size, t0, t, o = {}) {
  const k = t - t0; if (k < 0 || (o.t1 && t > o.t1 + .25)) return; const sc = eBack(k / .28) * (o.t1 ? 1 - eOut((t - o.t1) / .25) : 1); if (sc <= 0) return;
  g.save(); g.translate(x, y); g.scale(sc, sc); g.font = F(size, 800);
  const lines = s.split('\n'), tw = Math.max(...lines.map(l => g.measureText(l).width)) + size * 1.3, th = lines.length * size * 1.25 + size * .9;
  const tx = o.tail ?? -1;
  g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, size * .6); g.moveTo(tx * tw * .18 - 22, th / 2 - 2); g.lineTo(tx * tw * .3, th / 2 + 46); g.lineTo(tx * tw * .18 + 22, th / 2 - 2);
  g.fillStyle = o.bg || '#fff'; g.fill(); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = o.bg || '#fff'; g.fillRect(tx * tw * .18 - 19, th / 2 - 9, 38, 10);
  lines.forEach((l, i) => txt(l, 0, -((lines.length - 1) * size * 1.25) / 2 + i * size * 1.25 + 3, size, o.fg || OUT, { wt: 800 }));
  g.restore();
}

// ---------------------------------------------------------------- personnage
const SKIN = { a: '#ffd9b8', b: '#e9b48a', c: '#b97a52', d: '#8a5636' };
const CHAR = {
  toi: { skin: SKIN.a, hair: '#4a2c1e', style: 'messy', shirt: '#2f8f7a', pants: '#2b3247', shoe: '#f2f2f2' },
  fille: { skin: SKIN.b, hair: '#3a1f2b', style: 'long', shirt: '#e2475d', pants: '#334', shoe: '#fff' },
  prof: { skin: SKIN.a, hair: '#d8d8d8', style: 'bald', shirt: '#8a6a45', pants: '#3b3226', shoe: '#2a1d14', glasses: 1, mustache: '#9a9a9a' },
  patron: { skin: SKIN.b, hair: '#9aa0a8', style: 'side', shirt: '#2f3446', pants: '#23263a', shoe: '#111', tie: '#c8323c' },
  milli: { skin: SKIN.a, hair: '#e8c46a', style: 'slick', shirt: '#151515', pants: '#111', shoe: '#111', tie: '#d4af37', glasses: 2 },
  mere: { skin: SKIN.a, hair: '#7a4a2a', style: 'bun', shirt: '#7a5bd6', pants: '#3a3060', shoe: '#5a4a8a', apron: '#f4efe6' },
  pote: { skin: SKIN.c, hair: '#1d1d1d', style: 'cap', shirt: '#f0b429', pants: '#2d3a5a', shoe: '#fff', cap: '#2a64d8' },
  joueur1: { skin: SKIN.b, hair: '#2b2b2b', style: 'hat', shirt: '#7a2f2f', pants: '#222', shoe: '#111', hat: '#6b4a2a', mustache: '#2b2b2b' },
  joueur2: { skin: SKIN.d, hair: '#111', style: 'short', shirt: '#2a5a8a', pants: '#222', shoe: '#111', glasses: 2 },
  joueur3: { skin: SKIN.a, hair: '#c0392b', style: 'long', shirt: '#2e7d4f', pants: '#222', shoe: '#111' },
  pres: { skin: SKIN.a, hair: '#ddd', style: 'side', shirt: '#1f2a44', pants: '#1f2a44', shoe: '#111', tie: '#2a64d8' },
  juge: { skin: SKIN.c, hair: '#eee', style: 'bald', shirt: '#111', pants: '#111', shoe: '#111', glasses: 1 },
  flic: { skin: SKIN.b, hair: '#222', style: 'police', shirt: '#2c4a8a', pants: '#1e2a44', shoe: '#111' },
};
// o: {expr, look:[x,y], talk, arms:'down'|'wave'|'up'|'point'|'hips'|'shrug'|'phone'|'hug'|'cross', blink, flip, bob, blush, sweat, tear}
function perso(id, x, y, s, t, o = {}) {
  const C = CHAR[id]; g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  const bob = o.bob ? Math.sin(t * o.bob * 6) * 6 : Math.sin(t * 2.2 + x) * 2.5;
  shadowEl(0, 0, 120, .22);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // jambes
  for (const sx of [-1, 1]) { rr(sx * 48 - 30, -150, 60, 140, 26); fillStroke(C.pants); rr(sx * 48 - 38, -26, 76, 30, 14); fillStroke(C.shoe); }
  g.translate(0, bob);
  // bras arrière (dessinés avant le torse)
  const A = armPose(o.arms || 'down', t);
  const arm = (sx, ang, bend) => { g.save(); g.translate(sx * 92, -340); const a1 = ang * sx, ex = Math.sin(a1) * 95, ey = Math.cos(a1) * 95, a2 = a1 + bend * sx, hx = ex + Math.sin(a2) * 90, hy = ey + Math.cos(a2) * 90;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.lineTo(hx, hy); g.lineWidth = 58; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 44; g.strokeStyle = C.shirt; g.stroke();
    circ(hx, hy, 27); fillStroke(C.skin, 6); g.restore(); return [sx * 92 + hx, -340 + hy]; };
  // torse
  rr(-100, -380, 200, 250, 60); fillStroke(lg(0, -380, 0, -130, [C.shirt, shade(C.shirt, -.18)]));
  if (C.apron) { rr(-70, -300, 140, 170, 30); fillStroke(C.apron, 5); }
  if (C.tie) { g.beginPath(); g.moveTo(-16, -372); g.lineTo(16, -372); g.lineTo(22, -230); g.lineTo(0, -205); g.lineTo(-22, -230); g.closePath(); fillStroke(C.tie, 5); }
  if (id === 'flic') { rr(-34, -330, 68, 46, 8); fillStroke('#f2c14e', 5); }
  const hands = [arm(-1, A[0], A[1]), arm(1, A[2], A[3])];
  // tête
  g.save(); g.translate(0, -470 + (o.headDy || 0)); g.rotate(o.tilt || 0);
  hairBack(C);
  for (const sx of [-1, 1]) { circ(sx * 104, 6, 24); fillStroke(shade(C.skin, -.06), 6); }
  circ(0, 0, 112); fillStroke(C.skin);
  g.save(); circ(0, 0, 108); g.clip(); g.globalAlpha = .12; g.fillStyle = '#7a3b1e'; circ(30, 60, 110); g.fill(); g.restore();
  face(C, t, o);
  hairFront(C);
  g.restore();
  g.restore();
  return hands;
}
function armPose(p, t) {
  const wv = Math.sin(t * 12) * .35;
  return { down: [.12, .05, .12, .05], wave: [.12, .05, 2.6 + wv, .5], up: [2.7, .2, 2.7, .2], point: [.12, .05, 1.65, 0], hips: [.55, -1.6, .55, -1.6], shrug: [.9, 2.0, .9, 2.0],
    phone: [.12, .05, .5, 2.3], hug: [1.3, 1.2, 1.3, 1.2], cross: [.5, 2.2, .5, 2.2], fist: [.12, .05, 2.9, .1], cards: [.9, 1.6, .9, 1.6], write: [.9, 1.7, .6, 1.4] }[p];
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255; const f = v => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255)); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
function hairBack(C) { if (C.style === 'long') { rr(-125, -60, 250, 230, 90); fillStroke(C.hair); } if (C.style === 'bun') { circ(0, -118, 48); fillStroke(C.hair); } }
function hairFront(C) {
  g.fillStyle = C.hair; g.lineWidth = 7; g.strokeStyle = OUT;
  const P = (pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); g.stroke(); };
  switch (C.style) {
    case 'messy': g.beginPath(); g.arc(0, -10, 116, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(96, -40); g.lineTo(70, -58); g.lineTo(52, -30); g.lineTo(20, -62); g.lineTo(-10, -34); g.lineTo(-40, -66); g.lineTo(-70, -36); g.lineTo(-104, -40); g.closePath(); g.fill(); g.stroke();
      P([-30, -118, -6, -150, 10, -112]); P([10, -116, 44, -142, 40, -104]); break;
    case 'long': g.beginPath(); g.arc(0, -10, 118, Math.PI * 1.0, Math.PI * 2.0); g.lineTo(108, 40); g.quadraticCurveTo(70, -40, 0, -60); g.quadraticCurveTo(-70, -40, -108, 40); g.closePath(); g.fill(); g.stroke(); break;
    case 'bald': g.beginPath(); g.arc(-96, 0, 26, Math.PI * .6, Math.PI * 1.5); g.fill(); g.beginPath(); g.arc(96, 0, 26, Math.PI * 1.5, Math.PI * .4); g.fill(); break;
    case 'side': case 'short': case 'slick': g.beginPath(); g.arc(0, -8, 117, Math.PI * 1.0, Math.PI * 2.0); g.lineTo(104, -30); g.quadraticCurveTo(C.style === 'side' ? -10 : 0, C.style === 'slick' ? -80 : -64, -104, -30); g.closePath(); g.fill(); g.stroke(); break;
    case 'bun': g.beginPath(); g.arc(0, -8, 117, Math.PI * 1.0, Math.PI * 2.0); g.quadraticCurveTo(0, -60, -117, -8); g.closePath(); g.fill(); g.stroke(); break;
    case 'cap': g.beginPath(); g.arc(0, -14, 118, Math.PI, Math.PI * 2); g.closePath(); g.fillStyle = C.cap; g.fill(); g.stroke(); rr(-10, -30, 170, 30, 14); fillStroke(shade(C.cap, -.2)); break;
    case 'hat': rr(-160, -70, 320, 34, 16); fillStroke(C.hat); rr(-90, -170, 180, 110, 30); fillStroke(C.hat); rr(-90, -86, 180, 18, 4); fillStroke('#2a1a10', 0); break;
    case 'police': g.beginPath(); g.arc(0, -14, 118, Math.PI, Math.PI * 2); g.closePath(); g.fillStyle = '#1e2a44'; g.fill(); g.stroke(); rr(-130, -40, 260, 30, 12); fillStroke('#111'); circ(0, -70, 20); fillStroke('#f2c14e', 5); break;
  }
}
function face(C, t, o) {
  const e = o.expr || 'neutral', lk = o.look || [0, 0];
  const bl = o.blink !== undefined ? o.blink : ((t * 1.0 + C.shirt.length * .37) % 3.7 < .12 ? .1 : 1);
  const eyeW = e === 'shock' ? 34 : 28, eyeH = (e === 'shock' ? 40 : e === 'smug' ? 18 : e === 'happy' ? 6 : 32) * bl;
  for (const sx of [-1, 1]) {
    g.save(); g.translate(sx * 40, -2);
    if (e === 'happy' && bl > .5) { g.beginPath(); g.arc(0, 8, 20, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
    else { g.beginPath(); g.ellipse(0, 0, eyeW, Math.max(2, eyeH), 0, 0, Math.PI * 2); fillStroke(e === 'blank' ? '#f4f4f4' : '#fff', 6);
      if (eyeH > 6) { const pr = e === 'shock' ? 9 : e === 'blank' ? 0 : 13; if (pr) { circ(lk[0] * 10, lk[1] * 8 + 2, pr); g.fillStyle = o.eyeCol || OUT; g.fill(); circ(lk[0] * 10 + 4, lk[1] * 8 - 3, 4); g.fillStyle = '#fff'; g.fill(); } }
      if (e === 'blank') { g.beginPath(); for (let a = 0; a < 9; a += .3) { const r = a * 2.3; g.lineTo(Math.cos(a * 2) * r, Math.sin(a * 2) * r); } g.lineWidth = 3; g.strokeStyle = '#8a8aa8'; g.stroke(); }
    }
    // sourcils
    g.beginPath(); const by = -46 - (e === 'shock' ? 14 : 0); const tilt = e === 'angry' ? .35 : e === 'sad' ? -.3 : e === 'smug' ? (sx > 0 ? -.25 : .1) : 0;
    g.moveTo(-20, by + tilt * sx * 20); g.lineTo(20, by - tilt * sx * 20); g.lineWidth = 9; g.strokeStyle = shade(C.hair === '#d8d8d8' ? '#888888' : C.hair, -.2); g.stroke();
    g.restore();
  }
  if (C.glasses === 1) { for (const sx of [-1, 1]) { circ(sx * 40, -2, 38); g.lineWidth = 6; g.strokeStyle = '#2a2a2a'; g.stroke(); } g.beginPath(); g.moveTo(-2, -4); g.lineTo(2, -4); g.stroke(); }
  if (C.glasses === 2) { rr(-86, -30, 78, 50, 14); fillStroke('#111', 5); rr(8, -30, 78, 50, 14); fillStroke('#111', 5); g.beginPath(); g.moveTo(-8, -14); g.lineTo(8, -14); g.stroke(); g.save(); g.globalAlpha = .5; rr(-74, -24, 22, 10, 5); g.fillStyle = '#fff'; g.fill(); rr(20, -24, 22, 10, 5); g.fill(); g.restore(); }
  if (o.blush || e === 'love') { g.save(); g.globalAlpha = .5; g.fillStyle = '#ff6b8a'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 66, 36, 20, 12, 0, 0, Math.PI * 2); g.fill(); } g.restore(); }
  if (C.mustache) { g.beginPath(); g.ellipse(-22, 50, 26, 12, -.2, 0, Math.PI * 2); g.ellipse(22, 50, 26, 12, .2, 0, Math.PI * 2); g.fillStyle = C.mustache; g.fill(); }
  // bouche
  g.lineWidth = 8; g.strokeStyle = OUT; g.lineCap = 'round';
  const talk = o.talk ? Math.abs(Math.sin(t * 17)) * o.talk : 0; const my = 62;
  if (talk > .15) { g.beginPath(); g.ellipse(0, my, 22, 6 + talk * 22, 0, 0, Math.PI * 2); fillStroke('#7a2030', 6); }
  else if (e === 'happy' || e === 'love' || e === 'smile') { g.beginPath(); g.arc(0, my - 18, 34, Math.PI * .2, Math.PI * .8); if (e === 'happy') { g.closePath(); fillStroke('#7a2030', 6); } else g.stroke(); }
  else if (e === 'shock') { g.beginPath(); g.ellipse(0, my + 6, 20, 26, 0, 0, Math.PI * 2); fillStroke('#5a1525', 6); }
  else if (e === 'sad') { g.beginPath(); g.arc(0, my + 26, 26, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (e === 'angry') { g.beginPath(); g.moveTo(-26, my + 8); g.lineTo(26, my + 2); g.stroke(); }
  else if (e === 'smug') { g.beginPath(); g.moveTo(-24, my); g.quadraticCurveTo(10, my + 12, 30, my - 12); g.stroke(); }
  else if (e === 'laugh') { g.beginPath(); g.arc(0, my - 14, 36, 0, Math.PI); g.closePath(); fillStroke('#7a2030', 6); }
  else { g.beginPath(); g.moveTo(-18, my); g.lineTo(18, my); g.stroke(); }
  if (o.sweat) { g.save(); g.translate(98, -60 + (t * 40) % 30); g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(16, 4, 0, 10); g.quadraticCurveTo(-16, 4, 0, -24); fillStroke('#8fd3ff', 4); g.restore(); }
  if (o.tear) { g.save(); g.translate(-46, 30 + (t * 60) % 60); g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(12, 4, 0, 10); g.quadraticCurveTo(-12, 4, 0, -14); fillStroke('#8fd3ff', 3); g.restore(); }
  if (o.angryRed) { g.save(); g.globalAlpha = o.angryRed * .55; g.globalCompositeOperation = 'multiply'; circ(0, 0, 110); g.fillStyle = '#ff3b3b'; g.fill(); g.restore(); }
}

// ---------------------------------------------------------------- décors
function sky(c0, c1, c2) { g.fillStyle = lg(0, 0, 0, H, c2 ? [c0, c1, c2] : [c0, c1]); g.fillRect(-W, -H, W * 3, H * 3); }
function stars(t, n = 90, a = 1) { g.save(); for (let i = 0; i < n; i++) { const x = hash(i) * W, y = hash(i + 50) * H * .7, tw = .5 + .5 * Math.sin(t * 2 + i); g.globalAlpha = a * (.25 + .6 * tw); g.fillStyle = '#fff'; g.fillRect(x, y, 3, 3); } g.restore(); }
function dust(t, col = '#fff', n = 40, a = .35) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const x = (hash(i) * W + t * (10 + hash(i + 9) * 30)) % W, y = (hash(i + 3) * H - t * (12 + hash(i + 7) * 25) + H * 10) % H; g.globalAlpha = a * (.3 + .7 * hash(i + 2)); g.fillStyle = col; circ(x, y, 2 + 3 * hash(i + 5)); g.fill(); } g.restore(); }
function planks(x, y, w_, h, col, n = 9) { g.fillStyle = col; g.fillRect(x, y, w_, h); g.save(); g.globalAlpha = .18; g.strokeStyle = '#000'; g.lineWidth = 4; for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(x + i * w_ / n, y); g.lineTo(x + i * w_ / n, y + h); g.stroke(); } g.restore(); }
function floor(y, col) { g.fillStyle = lg(0, y, 0, H, [col, shade(col, -.35)]); g.fillRect(-W, y, W * 3, H * 2); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-W, y, W * 3, 10); }
function windowNight(x, y, w_, h, t, moon = 1, rain = 0) {
  rr(x - 14, y - 14, w_ + 28, h + 28, 10); fillStroke('#3a2a22', 6);
  g.save(); rr(x, y, w_, h, 6); g.clip(); g.fillStyle = lg(0, y, 0, y + h, ['#0b1030', '#26346b']); g.fillRect(x, y, w_, h);
  for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + hash(i + 40) * w_, y + hash(i + 41) * h * .6, 3, 3); }
  if (moon) { glow(x + w_ * .7, y + h * .3, 120, 'rgba(200,220,255,.5)'); circ(x + w_ * .7, y + h * .3, 34); g.fillStyle = '#f4f1de'; g.fill(); }
  if (rain) { g.strokeStyle = 'rgba(180,200,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 60; i++) { const rx = x + hash(i) * w_, ry = y + ((hash(i + 1) * h + t * 900) % h); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 6, ry + 30); g.stroke(); } }
  g.restore(); g.fillStyle = '#3a2a22'; g.fillRect(x + w_ / 2 - 5, y, 10, h); g.fillRect(x, y + h / 2 - 5, w_, 10);
}
function lampLight(x, y, r, col = 'rgba(255,200,120,.55)') { glow(x, y, r, col); }
function vignette(a = .55) { const q = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = q; g.fillRect(0, 0, W, H); }
function grade(col, a, mode = 'soft-light') { g.save(); g.globalCompositeOperation = mode; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); }
// globe terrestre de nuit
function globe(x, y, r, t, o = {}) {
  glow(x, y, r * 1.5, 'rgba(80,160,255,.35)');
  g.save(); circ(x, y, r); g.clip();
  g.fillStyle = lg(x - r, y - r, x + r, y + r, ['#1b4f9a', '#0a1f45']); g.fillRect(x - r, y - r, 2 * r, 2 * r);
  const rot = t * .08; g.fillStyle = '#1f6b4a';
  for (let i = 0; i < 14; i++) { const a = hash(i) * 6.28 + rot, la = (hash(i + 20) - .5) * 1.8, cx = x + Math.sin(a) * r * Math.cos(la), cy = y + Math.sin(la) * r; if (Math.cos(a) < -.1) continue;
    g.beginPath(); g.ellipse(cx, cy, r * (.12 + hash(i + 30) * .2) * Math.max(.2, Math.cos(a)), r * (.08 + hash(i + 31) * .14), hash(i) * 3, 0, Math.PI * 2); g.fill(); }
  // lumières des villes
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 140; i++) { const a = hash(i + 100) * 6.28 + rot, la = (hash(i + 200) - .5) * 1.7, c = Math.cos(a); if (c < 0) continue; const cx = x + Math.sin(a) * r * Math.cos(la), cy = y + Math.sin(la) * r;
    g.globalAlpha = c * (o.lights ?? 1); g.fillStyle = '#ffd27a'; circ(cx, cy, 3 + hash(i) * 3); g.fill(); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const q = g.createRadialGradient(x - r * .35, y - r * .35, r * .2, x, y, r); q.addColorStop(0, 'rgba(255,255,255,0)'); q.addColorStop(1, 'rgba(0,0,30,.55)'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.restore(); circ(x, y, r); g.lineWidth = 4; g.strokeStyle = 'rgba(150,210,255,.6)'; g.stroke();
}
function digital(s, x, y, size, col = '#ff4d4d') { g.save(); g.font = F(size); g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(s).width + size * .8;
  rr(x - tw / 2, y - size * .75, tw, size * 1.5, 26); fillStroke('#0d0d14', 8, '#33334a'); g.shadowColor = col; g.shadowBlur = 40; g.fillStyle = col; g.fillText(s, x, y + 4); g.restore(); }
// onde « remise à zéro »
function resetWave(x, y, t0, t, col = 'rgba(120,220,255,') { const k = t - t0; if (k < 0 || k > 1.2) return; for (let j = 0; j < 3; j++) { const kk = k - j * .12; if (kk < 0) continue; circ(x, y, eOut(kk / 1) * 1400); g.lineWidth = 30 * (1 - kk); g.strokeStyle = col + clamp(1 - kk) * .8 + ')'; g.stroke(); } }
// effet « minuit » plein écran
let OVL = [];
function midnight(t0, t) { OVL.push(() => midnight_(t0, t)); }
function midnight_(t0, t) { const k = t - t0; if (k < -.05 || k > .9) return; g.save(); g.globalAlpha = clamp(1 - k / .9) * .85; g.fillStyle = '#0a1240'; g.fillRect(0, 0, W, H); g.globalAlpha = clamp(1 - k / .9);
  digital('00:00', W / 2, 560, 150, '#6fd3ff'); resetWave(W / 2, 560, t0, t); g.restore(); if (k < .08) { g.save(); g.globalAlpha = 1 - k / .08; g.fillStyle = '#cfefff'; g.fillRect(0, 0, W, H); g.restore(); } }
function coin(x, y, r, rot) { g.save(); g.translate(x, y); g.scale(Math.abs(Math.cos(rot)) * .9 + .1, 1); circ(0, 0, r); fillStroke(lg(0, -r, 0, r, ['#ffe27a', '#e0a21b']), 6, '#7a4d00'); txt('€', 0, 3, r * 1.1, '#9a6200'); g.restore(); }
function moneyRain(t, t0, n = 26, a = 1) { if (t < t0) return; for (let i = 0; i < n; i++) { const k = t - t0 - hash(i) * .8; if (k < 0) continue; const x = hash(i + 7) * W, y = -100 + k * (700 + hash(i + 3) * 500); if (y > H + 100) continue;
  if (i % 3) coin(x, y, 34 + hash(i) * 16, k * 6 + i); else { g.save(); g.translate(x, y); g.rotate(Math.sin(k * 4 + i) * .6); g.globalAlpha = a; rr(-70, -36, 140, 72, 8); fillStroke('#7fd08a', 5, '#245a2c'); txt('500', 0, 2, 30, '#245a2c'); g.restore(); } } }
function hearts(t, t0, x, y, n = 6) { if (t < t0) return; for (let i = 0; i < n; i++) { const k = (t - t0 - i * .15); if (k < 0) continue; const kk = k % 1.6; g.save(); g.translate(x + Math.sin(i * 2 + kk * 3) * 90, y - kk * 260); g.globalAlpha = clamp(1 - kk / 1.6); const s = .8 + hash(i) * .5; g.scale(s, s); heart(0, 0, 30); g.restore(); } }
function heart(x, y, r, col = '#ff4d6d') { g.beginPath(); g.moveTo(x, y + r * .9); g.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .7, y - r * 1.3, x, y - r * .4); g.bezierCurveTo(x + r * .7, y - r * 1.3, x + r * 1.6, y - r * .2, x, y + r * .9); fillStroke(col, 5); }
function dayBadge(n, t, t0) { OVL.push(() => dayBadge_(n, t, t0)); }
function dayBadge_(n, t, t0) { const sc = popIn(t0, t, .25); pill('JOUR ' + n, W / 2, 210, 54, '#ffd23f', OUT, { sc: sc * (1 + .12 * Math.max(0, 1 - (t - t0) / .15)), lw: 7 }); }
function sceneTitle(s, t, t0, col = '#9dff7a') { const a = clamp((t - t0) / .3); g.save(); g.globalAlpha = a; txt(s, W / 2, 230, 64, col, { ls: 14, glow: col, blur: 40, wt: 800 }); g.restore(); }
function check(x, y, s, ok, t0, t) { const sc = popIn(t0, t, .25); if (sc <= 0) return; g.save(); g.translate(x, y); g.scale(sc * s, sc * s); circ(0, 0, 50); fillStroke(ok ? '#2ecc71' : '#ff3b3b', 7); g.lineWidth = 14; g.strokeStyle = '#fff'; g.beginPath();
  if (ok) { g.moveTo(-22, 2); g.lineTo(-6, 20); g.lineTo(24, -16); } else { g.moveTo(-18, -18); g.lineTo(18, 18); g.moveTo(18, -18); g.lineTo(-18, 18); } g.stroke(); g.restore(); }
// petit cerveau
function brain(x, y, r, col = '#ff9ec4', o = {}) { g.save(); g.translate(x, y); if (o.glow) glow(0, 0, r * 3, o.glow, .9);
  g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .45, r * .42, 0, Math.PI * 2); } g.fillStyle = col; g.fill();
  g.beginPath(); g.ellipse(0, 0, r, r * .8, 0, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); g.beginPath(); g.moveTo(0, -r * .7); g.quadraticCurveTo(-r * .2, 0, 0, r * .7); g.lineWidth = 5; g.stroke();
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * r * .3, -r * .35); g.quadraticCurveTo(sx * r * .7, -r * .1, sx * r * .35, r * .2); g.stroke(); } g.restore(); }

// ---------------------------------------------------------------- icônes de la roulette
const POW = [['VOLER', 'wing'], ['LIRE LES PENSÉES', 'eye'], ['INVISIBLE', 'ghost'], ['ARRÊTER LE TEMPS', 'hour'], ['PARLER AUX ANIMAUX', 'paw'], ['IMMORTEL', 'inf'], ['MENTIR', 'nose'], ['SE SOUVENIR', 'brain'], ['SUPER VITESSE', 'bolt'], ['TÉLÉPORTATION', 'tp']];
const POWCOL = ['#7ac8ff', '#c38bff', '#cfd8e6', '#ffd166', '#8fe388', '#ff7a7a', '#ff9f5a', '#ffd23f', '#5ae0ff', '#ff6bd6'];
let icon = function (k, s, col) {
  g.save(); g.scale(s, s); g.lineWidth = 8; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (k) {
    case 'wing': for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(sx * 60, -70, sx * 90, -40); g.quadraticCurveTo(sx * 70, -10, sx * 80, 0); g.quadraticCurveTo(sx * 55, 10, sx * 60, 30); g.quadraticCurveTo(sx * 30, 30, 0, 10); fillStroke(col); } break;
    case 'eye': g.beginPath(); g.moveTo(-80, 0); g.quadraticCurveTo(0, -70, 80, 0); g.quadraticCurveTo(0, 70, -80, 0); fillStroke('#fff'); circ(0, 0, 30); fillStroke(col); circ(0, 0, 12); g.fillStyle = OUT; g.fill(); break;
    case 'ghost': g.beginPath(); g.moveTo(-50, 60); g.lineTo(-50, -10); g.arc(0, -10, 50, Math.PI, 0); g.lineTo(50, 60); g.lineTo(30, 45); g.lineTo(15, 60); g.lineTo(0, 45); g.lineTo(-15, 60); g.lineTo(-30, 45); g.closePath(); g.globalAlpha = .9; fillStroke(col); g.globalAlpha = 1; circ(-18, -12, 9); circ(18, -12, 9); g.fillStyle = OUT; g.fill(); break;
    case 'hour': g.beginPath(); g.moveTo(-45, -70); g.lineTo(45, -70); g.lineTo(0, 0); g.lineTo(45, 70); g.lineTo(-45, 70); g.lineTo(0, 0); g.closePath(); fillStroke('#fff'); g.beginPath(); g.moveTo(-25, 60); g.lineTo(25, 60); g.lineTo(0, 30); g.closePath(); fillStroke(col, 0); rr(-60, -80, 120, 14, 6); fillStroke('#8a5a2a', 5); rr(-60, 66, 120, 14, 6); fillStroke('#8a5a2a', 5); break;
    case 'paw': circ(0, 20, 38); fillStroke(col); for (const [x, y] of [[-48, -28], [-17, -52], [17, -52], [48, -28]]) { circ(x, y, 17); fillStroke(col); } break;
    case 'inf': g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(30, -50, 85, -40, 85, 0); g.bezierCurveTo(85, 40, 30, 50, 0, 0); g.bezierCurveTo(-30, -50, -85, -40, -85, 0); g.bezierCurveTo(-85, 40, -30, 50, 0, 0); g.lineWidth = 26; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 14; g.strokeStyle = col; g.stroke(); break;
    case 'nose': circ(-30, 0, 46); fillStroke('#ffd9b8'); rr(-10, -14, 100, 28, 14); fillStroke('#ffd9b8'); circ(-44, -8, 7); g.fillStyle = OUT; g.fill(); break;
    case 'brain': brain(0, 0, 58, col, {}); break;
    case 'bolt': g.beginPath(); g.moveTo(15, -80); g.lineTo(-40, 10); g.lineTo(0, 10); g.lineTo(-15, 80); g.lineTo(45, -15); g.lineTo(5, -15); g.closePath(); fillStroke(col); break;
    case 'tp': for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0, 40 - i * 4, 70 - i * 18, 18 - i * 4, 0, 0, Math.PI * 2); g.strokeStyle = col; g.lineWidth = 8; g.stroke(); } g.globalAlpha = .6; circ(0, -20, 30); fillStroke(col, 0); g.globalAlpha = 1; break;
  }
  g.restore();
}
function card(i, x, y, s, hl, t) {
  i = ((i % POW.length) + POW.length) % POW.length; const [name, ic] = POW[i], col = POWCOL[i];
  g.save(); g.translate(x, y); g.scale(s, s);
  if (hl > 0) glow(0, 0, 330, col.replace('#', '') && 'rgba(255,210,80,.6)', hl);
  rr(-135, -190, 270, 380, 30); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30; fillStroke(lg(0, -190, 0, 190, ['#25233a', '#15131f']), 7, hl > .5 ? '#ffd23f' : '#3c3a55'); g.shadowBlur = 0;
  rr(-115, -170, 230, 230, 22); fillStroke(lg(0, -170, 0, 60, [shade(col, -.35), shade(col, -.65)]), 0);
  glow(0, -55, 150, 'rgba(255,255,255,.18)');
  g.save(); g.translate(0, -55); icon(ic, 1, col); g.restore();
  txt('SEUL À', 0, 95, 24, 'rgba(255,255,255,.6)', { wt: 800, ls: 4 });
  const words = name.split(' '), l1 = words.length > 2 ? words.slice(0, 2).join(' ') : words[0], l2 = words.length > 2 ? words.slice(2).join(' ') : words.slice(1).join(' ');
  txt(l1, 0, l2 ? 130 : 140, 34, '#fff'); if (l2) txt(l2, 0, 166, 34, '#fff');
  g.restore();
}

// ---------------------------------------------------------------- têtes simplifiées (foule)
function miniHead(x, y, r, i, state, t) {
  const sk = [SKIN.a, SKIN.b, SKIN.c, SKIN.d][i % 4], hc = ['#2b1b12', '#111', '#7a4a2a', '#c8a050', '#c0392b'][i % 5];
  circ(x, y, r); fillStroke(sk, 4);
  g.beginPath(); g.arc(x, y - r * .1, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = hc; g.fill();
  if (state === 'blank') { for (const sx of [-1, 1]) { circ(x + sx * r * .35, y + r * .1, r * .2); fillStroke('#fff', 3); } txt('?', x + r * .9, y - r * .9, r * .9, '#8fe3ff', { stroke: OUT, sw: 5 }); }
  else { for (const sx of [-1, 1]) { circ(x + sx * r * .35, y + r * .1, r * .17); fillStroke('#fff', 3); circ(x + sx * r * .35, y + r * .13, r * .08); g.fillStyle = OUT; g.fill(); } }
  if (state === 'gold') { brain(x, y - r * 1.5, r * .55, '#ffd23f', { glow: 'rgba(255,210,60,.8)' }); }
  else if (state === 'live') brain(x, y - r * 1.4, r * .4, '#ff9ec4');
}

// ---------------------------------------------------------------- scènes
const SPACING = 330, TGT = 7, LOOPS = 3;
function roulettePos(t) { const TL = we(20) + .75, D = (LOOPS * POW.length + TGT) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL, D }; }
window.roulettePos = roulettePos;
const SC = [];
// 0. ROULETTE + fiche
SC.push({ i: 0, cam: [[0, 1, 540, 960], [17, 1.08, 540, 940], [21, 1.0, 540, 960], [23, 1.12, 540, 900]], draw(t) {
  sky('#07060d', '#0e0c1a'); const { p, TL } = roulettePos(t), landed = t >= TL;
  const fiche = seg(t, w(21) - .1, w(21) + .45);
  // projecteurs
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = -3; k <= 3; k++) { const cx = W / 2 + k * SPACING - ((p % SPACING) + SPACING) % SPACING + (p % SPACING > SPACING / 2 ? SPACING : 0) * 0; }
  g.restore();
  g.save(); g.globalAlpha = 1 - fiche; txt('LA ROULETTE', W / 2, 250, 92, '#fff', { glow: '#7ac8ff', blur: 40, ls: 6 }); txt('DES POUVOIRS', W / 2, 345, 64, '#ffd23f', { glow: '#ffd23f', blur: 30, ls: 10, wt: 800 });
  pill('1 SEUL HUMAIN SUR TERRE', W / 2, 450, 34, '#e8333a', '#fff', { sc: popIn(w(6), t) * 1 }); g.restore();
  const ci = p / SPACING; const base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue;
    const near = clamp(1 - Math.abs(x - W / 2) / SPACING);
    // cône de lumière
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(255,240,200,.9)', 'rgba(255,240,200,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    rr(x - 40, 505, 80, 30, 8); fillStroke('#2a2838', 5);
    g.save(); g.globalAlpha = 1 - fiche * (((idx % 10) + 10) % 10 === TGT && landed ? 0 : 1); g.beginPath(); g.ellipse(x, 1210, 150, 30, 0, 0, Math.PI * 2); g.fillStyle = `rgba(120,200,255,${.12 + .3 * near})`; g.fill();
    const isT = landed && ((idx % 10) + 10) % 10 === TGT;
    if (!(isT && fiche > 0)) card(idx, x, 960, .92 + .1 * near, isT ? 1 : 0, t);
    g.restore(); }
  // vitesse : flou
  const sp = (roulettePos(t + .02).p - p) / .02; if (sp > 1500) { g.save(); g.globalAlpha = clamp((sp - 1500) / 6000) * .5; g.fillStyle = '#07060d'; g.fillRect(0, 760, W, 400); g.restore(); }
  // ligne rouge centrale
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.beginPath(); g.moveTo(W / 2 - 26, 540); g.lineTo(W / 2 + 26, 540); g.lineTo(W / 2, 580); g.closePath(); g.fill(); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#fff6d0'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { // grande fiche
    g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore();
    const s = lerp(.92, 1.55, eOut(fiche)), y = lerp(960, 860, eOut(fiche));
    glow(W / 2, y, 600, 'rgba(255,210,60,.45)', fiche);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * .3; g.save(); g.globalAlpha = .12 * fiche; g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(W / 2, y); g.arc(W / 2, y, 900, a, a + .12); g.fill(); g.restore(); }
    card(TGT, W / 2, y, s, 1, t);
    pill('LÉGENDAIRE', W / 2, 1255, 46, '#ffd23f', OUT, { sc: popIn(w(23), t) });
    const st = (lab, n, yy, t0) => { if (t < t0) return; g.save(); g.globalAlpha = clamp((t - t0) / .2); txt(lab, 300, yy, 36, '#fff', { align: 'left', wt: 800 }); for (let j = 0; j < 5; j++) txt('★', 640 + j * 58, yy, 50, j < n ? '#ffd23f' : '#3a3850'); g.restore(); };
    st('RARETÉ', 5, 1350, w(24)); st('PUISSANCE', 5, 1420, w(24) + .15);
    txt('LE SOUVENIR', W / 2, 190, 70, '#9dff7a', { ls: 16, glow: '#9dff7a', blur: 40, wt: 800 });
  }
}});
// 1. MINUIT
SC.push({ i: 26, cam: [[26, 1.05, 540, 960], [29, 1.18, 540, 900], [31, 1.0, 540, 960], [33, 1.25, 540, 820]], draw(t) {
  sky('#02030a', '#0a1030'); stars(t, 140);
  const reset = t > w(29); globe(W / 2, 1050, 400, t, { lights: 1 });
  const sec = Math.min(59, 57 + Math.floor((t - w(26)) / ((w(29) - w(26)) / 3)));
  if (!reset) digital(`23:59:${sec}`, W / 2, 420, 120, '#ff4d4d'); else { digital('00:00:00', W / 2, 420, 120 * (1 + .15 * Math.max(0, 1 - (t - w(29)) / .2)), '#6fd3ff'); }
  resetWave(W / 2, 1050, w(29), t);
  // souvenirs qui s'échappent puis éclatent
  for (let i = 0; i < 16; i++) { const t0 = w(31) + i * .08, k = t - t0; if (k < 0) continue; const a = hash(i) * Math.PI - Math.PI, x = W / 2 + Math.cos(a) * 380 + Math.cos(a) * k * 120, y = 1050 + Math.sin(a) * 380 - k * 220;
    const pop = t > w(34) + i * .03; if (pop) { const pk = t - w(34) - i * .03; if (pk > .5) continue; g.save(); g.globalAlpha = 1 - pk * 2; for (let j = 0; j < 6; j++) { circ(x + Math.cos(j) * pk * 120, y + Math.sin(j) * pk * 120, 6); g.fillStyle = '#bfe9ff'; g.fill(); } g.restore(); continue; }
    g.save(); g.translate(x, y); const s = eBack(k / .3) * .6; g.scale(s, s); circ(0, 0, 60); fillStroke('#fff', 6); g.save(); g.translate(0, 0); [heart, null][0](0, 4, 22, ['#ff4d6d', '#ffd23f', '#7ac8ff'][i % 3]); g.restore(); g.restore(); }
  if (t > w(34)) stamp('EFFACÉ', W / 2, 1400, 90, '#6fd3ff', w(34) + .1, t);
}});
// 2. HUIT MILLIARDS DE CERVEAUX
const GRID = { c: 8, r: 11, x0: 120, y0: 560, dx: 120, dy: 112 }, ME = [3, 6];
SC.push({ i: 36, cam: [[36, 1, 540, 960], [40, 1.05, 540, 960], [43, 2.4, GRID.x0 + ME[0] * GRID.dx, GRID.y0 + ME[1] * GRID.dy - 30]], draw(t) {
  sky('#0b0f2a', '#1b2150');
  const n = Math.floor(8e9 * eOut(seg(t, w(36), w(38) + .3))); txt(n.toLocaleString('fr-FR').replace(/ /g, ' '), W / 2, 330, 96, '#fff', { glow: '#7ac8ff', blur: 30 }); txt('CERVEAUX', W / 2, 430, 46, '#7ac8ff', { ls: 12, wt: 800 });
  const t0 = w(40), cx = W / 2, cy = 1100;
  for (let r = 0; r < GRID.r; r++) for (let c = 0; c < GRID.c; c++) { const x = GRID.x0 + c * GRID.dx + (r % 2) * 30, y = GRID.y0 + r * GRID.dy, i = r * GRID.c + c;
    const d = Math.hypot(x - cx, y - cy), hit = t > t0 + d / 1400, me = c === ME[0] && r === ME[1];
    const pop = popIn(w(36) + hash(i) * .5, t, .25); if (pop <= 0) continue; g.save(); g.translate(x, y); g.scale(pop, pop); g.translate(-x, -y);
    miniHead(x, y, 40, i, me ? (t > w(43) ? 'gold' : 'live') : hit ? 'blank' : 'live', t); g.restore(); }
  resetWave(cx, cy, t0, t);
  if (t > w(40)) pill('REMIS À ZÉRO', W / 2, 1800, 50, '#6fd3ff', OUT, { sc: popIn(w(40) + .2, t) });
  if (t > w(43)) { const x = GRID.x0 + ME[0] * GRID.dx + (ME[1] % 2) * 30, y = GRID.y0 + ME[1] * GRID.dy; pill('TOI', x, y + 70, 24, '#ffd23f', OUT, { sc: popIn(w(43) + .2, t) }); }
}});
// 3. LES ÉCRITS RESTENT
SC.push({ i: 46, cam: [[46, 1, 540, 860], [49, 1.15, 640, 820], [52, 1.0, 540, 1000], [55, 1.25, 540, 760]], draw(t) {
  sky('#5a3b2a', '#2a1a12'); planks(0, 0, W, H, '#6b4a33', 7);
  const mem = t > w(52);
  if (!mem) {
    rr(110, 420, 860, 720, 20); fillStroke('#c9955b', 10, '#4a2f1c'); g.save(); g.globalAlpha = .25; for (let i = 0; i < 200; i++) { g.fillStyle = '#7a5530'; g.fillRect(110 + hash(i) * 860, 420 + hash(i + 1) * 720, 4, 4); } g.restore();
    const notes = [['LISTE\nDE COURSES', '#ffe066', 260, 560, -.08], ['RDV\n14H', '#ff9fb4', 520, 540, .06], ['CODE\n4832', '#9be7ff', 780, 580, -.04]];
    notes.forEach(([s, c, x, y, r], i) => { const sc = popIn(w(46) + i * .18, t); if (sc <= 0) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(sc, sc); rr(-110, -100, 220, 200, 6); fillStroke(c, 5); circ(0, -84, 12); fillStroke('#e8333a', 4); s.split('\n').forEach((l, j) => txt(l, 0, -20 + j * 44, 34, OUT, { wt: 800 })); g.restore(); });
    const ph = [[330, 900, .07, '#7ac8ff'], [700, 920, -.06, '#ffb27a']];
    ph.forEach(([x, y, r, c], i) => { const sc = popIn(w(49) + i * .18, t); if (sc <= 0) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(sc, sc); rr(-150, -170, 300, 340, 6); fillStroke('#fbfbf7', 5); rr(-125, -145, 250, 230, 4); fillStroke(lg(0, -145, 0, 85, [c, shade(c, -.4)]), 0);
      circ(-40, 10, 30); g.fillStyle = SKIN.a; g.fill(); circ(40, 0, 34); g.fillStyle = SKIN.c; g.fill(); circ(70, -90, 26); g.fillStyle = '#ffe27a'; g.fill(); g.restore(); });
    if (t > w(47)) check(880, 1050, 1.2, true, w(48), t); if (t > w(50)) check(200, 1050, 1.2, true, w(51), t);
    pill('LES ÉCRITS RESTENT', W / 2, 1300, 46, '#2ecc71', '#fff', { sc: popIn(w(46) + .3, t) });
  } else {
    lampLight(W / 2, 600, 700, 'rgba(255,190,120,.25)');
    const brk = t > w(55);
    perso('pote', W / 2, 1560, 1.25, t, { expr: brk ? 'blank' : 'smile', look: [0, -1] });
    if (!brk) { const s = popIn(w(52), t); g.save(); g.translate(W / 2, 640); g.scale(s, s); for (const [x, y, r] of [[-10, 260, 18], [10, 200, 28]]) { circ(x, y, r); fillStroke('#fff', 5); } g.beginPath(); g.ellipse(0, 0, 400, 190, 0, 0, Math.PI * 2); fillStroke('#fff', 7);
      [['#7ac8ff', -250], ['#ffb27a', 0], ['#ff9fb4', 250]].forEach(([c, x], i) => { g.save(); g.translate(x, 0); g.rotate((i - 1) * .08); rr(-100, -110, 200, 220, 6); fillStroke('#fbfbf7', 5); rr(-84, -94, 168, 150, 4); fillStroke(c, 0); if (i === 0) heart(0, -20, 34); if (i === 1) { rr(-40, -10, 80, 50, 6); fillStroke('#fff', 4); rr(-4, -40, 8, 30, 3); fillStroke('#ffd23f', 0); } if (i === 2) { circ(0, -20, 30); fillStroke('#ffd23f', 4); } g.restore(); });
      g.restore(); }
    else { for (let i = 0; i < 60; i++) { const k = t - w(55); const a = hash(i) * 6.28, v = 300 + hash(i + 1) * 900; g.save(); g.globalAlpha = clamp(1 - k / 1.2); g.fillStyle = ['#fff', '#7ac8ff', '#ffb27a', '#ff9fb4'][i % 4]; g.fillRect(W / 2 + Math.cos(a) * v * k * .6 - 8, 640 + Math.sin(a) * v * k * .6 - 8 + k * k * 300, 16, 16); g.restore(); }
      stamp('EFFACÉS', W / 2, 640, 110, '#ff3b3b', w(55), t); }
  }
}});
// 4. JOUR 1 — le prof
function classroom(t) { sky('#3f6e6a', '#2c5450'); g.fillStyle = '#35605c'; g.fillRect(0, 1180, W, 30);
  rr(110, 380, 860, 420, 14); fillStroke('#2d4a35', 14, '#6b4a2a'); g.save(); g.globalAlpha = .85; txt('x² + 2x = ?', 420, 520, 70, '#f4f1de', { wt: 800 }); txt('∫ f(x) dx', 760, 680, 56, '#f4f1de', { wt: 800 }); g.restore();
  rr(130, 790, 820, 20, 6); fillStroke('#8a6a45', 5); windowNight(-200, 0, 0, 0, t, 0); floor(1350, '#a07850'); lampLight(540, 300, 900, 'rgba(255,230,180,.18)'); }
SC.push({ i: 56, cam: [[56, 1, 540, 1000], [60, 1.45, 330, 1050], [66, 1.45, 760, 980], [72, 1.25, 760, 1000], [74, 1.0, 540, 1000], [75, 1.45, 760, 980]], draw(t) {
  classroom(t); const after = t > w(74);
  const rage = after ? 0 : seg(t, w(64), w(72));
  perso('prof', 760, 1450, .95, t, { expr: after ? 'smile' : rage > .2 ? 'angry' : 'neutral', angryRed: rage, arms: after ? 'wave' : rage > .5 ? 'fist' : 'down', flip: true, look: [-1, 0], talk: after && t < w(78) + .3 ? .7 : 0 });
  if (rage > .3) for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; g.save(); g.globalAlpha = (1 - k) * .8; circ(760 + (i - 1) * 50, 940 - k * 160, 26 + k * 30); g.fillStyle = '#eee'; g.fill(); g.restore(); }
  perso('toi', 300, 1480, .9, t, { expr: after ? 'smug' : t > w(60) ? 'smug' : 'neutral', talk: t > w(60) && t < w(73) ? .8 : 0, look: [1, 0], arms: t > w(60) && !after ? 'point' : 'down' });
  bubble('Votre cours ?\nUNE SIESTE.', 360, 760, 54, w(61), t, { t1: w(73), tail: -1 });
  if (after) { bubble('Bonjour à tous !', 720, 720, 50, w(75), t, { tail: 1 }); txt('?', 900, 860, 120, '#ffd23f', { stroke: OUT, sw: 14 }); }
  dayBadge(1, t, w(56)); midnight(w(74), t);
}});
// 5. JOUR 2 — la fille
function lockers(t, warm = 0) { sky(warm ? '#ffcf9a' : '#c9d9ea', warm ? '#f3a46b' : '#9fb4cc'); for (let i = 0; i < 9; i++) { const x = i * 125 - 20; rr(x, 560, 118, 700, 6); fillStroke(warm ? '#4a7bc8' : '#3f6fb8', 6, '#1d2a44');
  for (let j = 0; j < 5; j++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 25, 600 + j * 18, 68, 6); } rr(x + 92, 880, 12, 60, 4); fillStroke('#ccc', 3); }
  floor(1260, warm ? '#d9b48a' : '#b8c2cc'); if (warm) glow(900, 300, 900, 'rgba(255,200,120,.35)'); }
const LINES = ['Salut, ça va ?', "T'as un 06 ?", 'Je fais du karaté', 'Tu crois au destin ?', 'Il fait beau hein', 'Tu viens souvent ?'];
SC.push({ i: 79, cam: [[79, 1, 540, 1000], [81, 1.4, 330, 1000], [88, 1.4, 740, 980], [92, 1.6, 740, 940], [94, 1.05, 540, 960], [99, 1.3, 540, 1000], [103, 1.55, 740, 940]], draw(t) {
  lockers(t); const rat = t > w(92) && t < w(93), mont = t > w(94) && t < w(99), win = t > w(99);
  let day = 2; if (t > w(94)) day = Math.min(8, 3 + Math.floor((t - w(94)) / ((w(99) - w(94)) / 6))); if (win) day = 9;
  const ok = win && t > w(103);
  perso('fille', 740, 1470, .95, t, { expr: ok ? 'love' : rat || mont ? 'angry' : 'neutral', flip: !(rat || mont), arms: rat || mont ? 'wave' : 'down', look: [-1, 0], tilt: rat ? .15 : 0 });
  perso('toi', 320, 1480, .92, t, { expr: win ? 'smug' : rat ? 'shock' : mont ? 'sad' : 'smile', talk: (t > w(81) && t < w(91)) || (win && t < w(105)) ? .8 : 0, look: [1, 0], sweat: rat || mont });
  bubble('Je peux avoir\nton numéro ?', 330, 700, 54, w(81), t, { t1: w(92), tail: -1 });
  if (rat) stamp('RÂTEAU', 740, 620, 110, '#ff3b3b', w(92), t);
  if (mont) { const k = Math.floor((t - w(94)) / ((w(99) - w(94)) / 6)); bubble(LINES[k % 6], 330, 720, 54, w(94) + k * (w(99) - w(94)) / 6, t, { tail: -1 }); check(560, 620, 1, false, w(94) + k * (w(99) - w(94)) / 6 + .15, t); }
  if (win) { bubble('★ ★ ★', 330, 720, 70, w(101), t, { tail: -1, bg: '#ffd23f' }); if (ok) { hearts(t, w(103), 740, 900, 8); pill('PHRASE PARFAITE', W / 2, 330, 50, '#2ecc71', '#fff', { sc: popIn(w(103), t) }); } }
  dayBadge(day, t, day === 2 ? w(79) : day === 9 ? w(99) : w(94) + (day - 3) * (w(99) - w(94)) / 6); midnight(w(93), t);
}});
// 6. ET L'ARGENT ?
SC.push({ i: 106, cam: [[106, 1, 540, 960], [108, 1.2, 540, 1000], [110, 1.35, 540, 980]], draw(t) {
  sky('#1a1203', '#3a2606'); g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * .4; g.globalAlpha = .1; g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(W / 2, 760); g.arc(W / 2, 760, 1500, a, a + .1); g.fill(); } g.restore();
  glow(W / 2, 760, 600, 'rgba(255,200,60,.5)'); coin(W / 2, 760, 230 * popIn(w(106), t, .35), t * 3);
  moneyRain(t, w(108), 30);
  perso('toi', W / 2, 1650, 1.0, t, { expr: 'smug', arms: t > w(109) ? 'up' : 'hips', bob: t > w(109) ? 1 : 0 });
  if (t > w(108)) txt('ÇA DEVIENT FOU', W / 2, 300, 80, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' });
}});
// 7. POKER
SC.push({ i: 112, cam: [[112, 1, 540, 980], [114, 1.15, 540, 900], [119, 1.7, 540, 760], [122, 1.0, 540, 960], [128, 1.1, 540, 1000], [133, 1.3, 540, 1050]], draw(t) {
  sky('#08080c', '#141018'); const lampY = 260; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, lampY, 0, 1300, ['rgba(255,220,150,.35)', 'rgba(255,220,150,0)']); g.beginPath(); g.moveTo(440, lampY); g.lineTo(640, lampY); g.lineTo(1080, 1300); g.lineTo(0, 1300); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#222'; g.fillRect(538, 0, 4, lampY - 40); rr(430, lampY - 50, 220, 60, 30); fillStroke('#2e6b3a', 6); glow(540, lampY + 20, 200, 'rgba(255,220,150,.8)');
  const month = t > w(128), lose = t > w(133);
  const tics = [{ id: 'joueur1', x: 230, o: { arms: t % 1.4 < .7 ? 'cross' : 'down', expr: lose ? 'sad' : 'smug' } }, { id: 'joueur2', x: 540, o: { sweat: !lose, expr: lose ? 'sad' : 'neutral' } }, { id: 'joueur3', x: 850, o: { expr: lose ? 'sad' : 'smile', tilt: Math.sin(t * 9) * .06 } }];
  tics.forEach(p => perso(p.id, p.x, 1240, .72, t, { ...p.o, look: [0, .6] }));
  g.beginPath(); g.ellipse(W / 2, 1270, 620, 230, 0, 0, Math.PI * 2); fillStroke('#6b3f22', 10); g.beginPath(); g.ellipse(W / 2, 1255, 560, 190, 0, 0, Math.PI * 2); fillStroke(lg(0, 1080, 0, 1440, ['#2f8a4a', '#1a5a2e']), 0);
  for (let i = 0; i < 5; i++) { rr(330 + i * 90, 1190, 76, 104, 8); fillStroke('#fff', 5); txt(['A', 'K', '7', 'Q', '2'][i], 368 + i * 90, 1230, 40, i % 2 ? '#e8333a' : OUT); }
  const chips = month ? Math.floor(eOut(seg(t, w(128), w(132))) * 14) : 2; for (let i = 0; i < chips; i++) { const c = ['#e8333a', '#2a64d8', '#111', '#ffd23f'][i % 4]; g.beginPath(); g.ellipse(W / 2 + ((i % 4) - 1.5) * 70, 1400 - Math.floor(i / 4) * 16, 34, 12, 0, 0, Math.PI * 2); fillStroke(c, 4); }
  if (t > w(119) && t < w(122)) { txt('TIC !', 540, 600, 70, '#ff3b3b', { stroke: OUT, sw: 14 }); }
  if (t > w(122) && !month) { const s = popIn(w(122), t); g.save(); g.translate(W / 2, 520); g.scale(s, s); g.rotate(-.03); rr(-330, -200, 660, 400, 16); fillStroke('#fdf6e3', 7); for (let j = 0; j < 7; j++) { g.fillStyle = 'rgba(80,120,200,.3)'; g.fillRect(-300, -120 + j * 50, 600, 3); }
    txt('MES NOTES', 0, -160, 40, '#e8333a'); [['Moustache : bras croisés = bluff', w(123)], ['Lunettes : transpire = mauvaise main', w(125)], ['Rousse : penche la tête = carré', w(126)]].forEach(([s_, t0], j) => { if (t > t0) txt(s_, -300, -80 + j * 90, 32, OUT, { align: 'left', wt: 800 }); }); g.restore(); }
  if (month) { pill('1 MOIS PLUS TARD', W / 2, 300, 50, '#2a64d8', '#fff', { sc: popIn(w(128), t) }); const gain = Math.floor(eOut(seg(t, w(128), w(133))) * 48200); txt('+ ' + gain.toLocaleString('fr-FR').replace(/ /g, ' ') + ' €', W / 2, 460, 100, '#2ecc71', { stroke: OUT, sw: 16 }); }
  if (lose) { stamp('0 DÉFAITE', W / 2, 640, 100, '#ffd23f', w(134), t, .08); }
}});
// 8. LE PATRON
function office(t, night = 0) { sky(night ? '#0d1330' : '#dfe9f5', night ? '#1b2450' : '#c7d6e8'); rr(100, 330, 880, 640, 10); fillStroke(night ? '#0a0f26' : '#9fd0ff', 12, '#3a3f55');
  for (let i = 0; i < 9; i++) { const bx = 120 + i * 98, bh = 140 + hash(i + 3) * 380; g.fillStyle = night ? '#141a3a' : '#7d9cc0'; g.fillRect(bx, 960 - bh, 80, bh); if (night) for (let j = 0; j < 12; j++) if (hash(i * 20 + j) > .5) { g.fillStyle = '#ffd27a'; g.fillRect(bx + 10 + (j % 3) * 22, 980 - bh + 20 + Math.floor(j / 3) * 40, 12, 18); } }
  g.fillStyle = '#3a3f55'; g.fillRect(535, 330, 10, 640); floor(1300, night ? '#2a2438' : '#8a8f9e'); }
function desk(y = 1220) { rr(380, y, 620, 260, 12); fillStroke('#6b4a33', 8); rr(360, y - 20, 660, 40, 10); fillStroke('#8a623f', 8); }
const ASK = [[141, '10 000 €', 0, 145], [147, '9 000 €', 0, 149], [151, '8 500 €', 0, 151.5], [151.5, '8 000 €', 0, 152], [152, '7 600 €', 0, 152.6], [153, '7 400 €', 1, 154]];
SC.push({ i: 137, cam: [[137, 1, 540, 1000], [139, 1.3, 330, 1050], [145, 1.3, 690, 980], [147, 1.0, 540, 980], [151, 1.15, 540, 900], [155, 1.7, 690, 860]], draw(t) {
  office(t); const ok = t > w(154);
  const fw = i => { const a = Math.floor(i), f = i - a; return lerp(w(a), w(a + 1), f); };
  perso('patron', 690, 1300, .92, t, { expr: ok ? 'happy' : t > w(145) ? 'angry' : 'neutral', flip: true, arms: ok ? 'wave' : 'cross', look: [-1, 0] });
  desk(); rr(560, 1150, 140, 70, 6); fillStroke('#222', 5);
  perso('toi', 270, 1560, 1.0, t, { expr: ok ? 'happy' : 'smug', talk: t > w(139) && t < w(145) ? .8 : 0, look: [1, -.3], arms: t > w(139) && t < w(145) ? 'point' : 'down' });
  let cur = null; for (const a of ASK) if (t > fw(a[0])) cur = a;
  if (cur) { const s = popIn(fw(cur[0]), t, .22); g.save(); g.translate(W / 2, 470); g.scale(s, s); rr(-260, -90, 520, 180, 26); fillStroke('#fff', 8); txt(cur[1], 0, 4, 96, OUT); g.restore();
    if (t > fw(cur[3])) check(W / 2 + 250, 400, 1.1, !!cur[2], fw(cur[3]), t); if (!cur[2] && t > fw(cur[3]) && cur[0] < 151) stamp('REFUSÉ', W / 2, 640, 84, '#ff3b3b', fw(cur[3]) + .05, t); }
  if (ok) stamp('OUI !', W / 2, 650, 110, '#2ecc71', w(154), t, .1);
  if (t > w(155)) { const k = seg(t, w(155), w(156)); g.save(); g.translate(690, 830); g.rotate(t); g.globalAlpha = k; g.lineWidth = 10; g.strokeStyle = '#ff3b3b'; circ(0, 0, 150 - 30 * k); g.stroke(); for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(110, 0); g.lineTo(190, 0); g.stroke(); } g.restore(); pill('SON MAXIMUM : 7 400 €', 690, 1040, 40, '#ff3b3b', '#fff', { sc: popIn(w(157), t) }); }
  midnight(w(146), t); midnight(w(150), t);
}});
// 9. LE MILLIARDAIRE
SC.push({ i: 160, cam: [[160, 1, 540, 1000], [162, 1.3, 420, 800], [168, 1.0, 540, 1000], [175, 1.4, 760, 980], [177, 1.15, 540, 900]], draw(t) {
  office(t, 1); const d = t > w(166) ? Math.min(20, 1 + Math.floor((t - w(166)) / ((w(175) - w(166)) / 19))) : 1, sign = t > w(177);
  rr(150, 420, 560, 360, 16); fillStroke('#111', 10, '#333'); rr(170, 440, 520, 320, 8); fillStroke(lg(0, 440, 0, 760, ['#2a1b6a', '#5b3bd6']), 0);
  txt('MA START-UP', 430, 500, 46, '#fff'); g.beginPath(); g.moveTo(220, 720); for (let i = 0; i <= 8; i++) g.lineTo(220 + i * 52, 720 - (i * i * 3.5 + Math.sin(i * 2) * 15) * clamp(d / 20 + .3)); g.lineWidth = 10; g.strokeStyle = '#2ecc71'; g.stroke();
  perso('milli', 790, 1450, .95, t, { expr: sign ? 'happy' : d > 12 ? 'smile' : 'smug', flip: true, arms: sign ? 'write' : 'cross', look: [-1, -.3] });
  perso('toi', 300, 1500, .92, t, { expr: sign ? 'happy' : 'smug', talk: t > w(162) && !sign ? .8 : 0, arms: 'point', look: [1, -.5] });
  if (t > w(171) && t < w(175)) { for (let j = 0; j < Math.min(5, d - 1); j++) check(240 + j * 110, 860, .7, false, w(171) + j * .12, t); }
  if (t > w(166)) dayBadge(d, t, w(166) + (d - 1) * (w(175) - w(166)) / 19);
  if (sign) { const s = popIn(w(177), t); g.save(); g.translate(W / 2, 1180); g.scale(s, s); g.rotate(-.05); rr(-260, -170, 520, 340, 8); fillStroke('#fdf6e3', 7); txt('CONTRAT', 0, -110, 46, OUT); for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-200, -50 + j * 30, 400, 6); }
    g.beginPath(); const k = seg(t, w(177) + .1, w(178)); for (let i = 0; i < 40 * k; i++) g.lineTo(-150 + i * 7.5, 110 + Math.sin(i * .9) * 22); g.lineWidth = 6; g.strokeStyle = '#2a3fb8'; g.stroke(); g.restore();
    stamp('SIGNÉ', 760, 1000, 90, '#2ecc71', we(178) - .1, t, -.15); pill('+ 10 000 000 €', W / 2, 330, 60, '#ffd23f', OUT, { sc: popIn(we(178), t) }); moneyRain(t, we(178), 20); }
}});
// 10. LA MÉMOIRE DE LA PLANÈTE
SC.push({ i: 179, cam: [[179, 1, 540, 960], [186, 1.1, 540, 1000], [192, 1.0, 540, 900], [199, 1.0, 540, 960], [203, 1.15, 540, 900], [206, 1.25, 540, 780]], draw(t) {
  sky('#03040e', '#0b1236'); stars(t, 120);
  const mem = t > w(199);
  globe(W / 2, mem ? 1250 : 1200, mem ? 330 : 420, t);
  if (!mem) for (let i = 0; i < 12; i++) { const t0 = w(186) + i * .12; if (t < t0) continue; const a = -Math.PI + (i / 11) * Math.PI, x = W / 2 + Math.cos(a) * 470, y = 1200 + Math.sin(a) * 470, sh = Math.sin(t * 40) * 4;
    g.save(); g.translate(x + sh, y); g.scale(popIn(t0, t), popIn(t0, t)); rr(-34, -56, 68, 112, 14); fillStroke('#222', 5, '#555'); rr(-26, -44, 52, 80, 6); fillStroke('#7ac8ff', 0); txt('DRING', 0, -86, 26, '#ffd23f', { stroke: OUT, sw: 6 }); g.restore(); }
  const who = [['pres', 192, 'PRÉSIDENTS'], ['juge', 195, 'JUGES'], ['flic', 197, 'POLICE']];
  if (!mem) who.forEach(([id, i0, lab], j) => { if (t < w(i0)) return; const s = popIn(w(i0), t, .3); const x = 220 + j * 320; g.save(); g.translate(x, 0); g.scale(s, s); g.translate(-x, 0); perso(id, x, 900, .55, t, { expr: 'shock', arms: id === 'juge' ? 'fist' : 'phone', look: [0, 0] }); pill(lab, x, 960, 32, '#e8333a', '#fff'); g.restore();
    if (id === 'flic') { glow(x - 60, 560, 120, t % .4 < .2 ? 'rgba(255,40,40,.9)' : 'rgba(40,80,255,.9)'); } });
  if (mem) { const k = seg(t, w(199), w(201));
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + t * .2, x = W / 2 + Math.cos(a) * 470, y = 900 + Math.sin(a) * 470 * .8; g.save(); g.globalAlpha = k; g.strokeStyle = 'rgba(255,210,60,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, 760); g.lineTo(x, y); g.stroke(); miniHead(x, y, 30, i, 'live', t); g.restore(); }
    glow(W / 2, 760, 400, 'rgba(255,210,60,.7)', k); brain(W / 2, 560, 70, '#ffd23f', { glow: 'rgba(255,210,60,.8)' });
    perso('toi', W / 2, 1180, .8, t, { expr: 'smug', arms: 'hips' });
    if (t < w(206)) txt('LA MÉMOIRE', W / 2, 260, 84, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' }), txt('DE LA PLANÈTE', W / 2, 350, 60, '#fff', { stroke: OUT, sw: 12 });
    if (t > w(206)) { const s = popIn(w(208), t); g.save(); g.translate(W / 2, 330); g.rotate(Math.sin(t * 3) * .06); g.scale(s, s); rr(-300, -90, 600, 180, 20); fillStroke('#ffd23f', 8); circ(-250, 0, 18); fillStroke('#fff', 5); txt('1 QUESTION =', 20, -30, 42, OUT); txt('1 000 000 €', 20, 32, 62, OUT); g.restore(); moneyRain(t, w(210), 20); } }
}});
// 11. MAMAN, LE POTE, LE BOCAL
function kitchen(t) { sky('#f0b878', '#d88a50'); rr(0, 380, W, 260, 0); fillStroke('#c9764a', 0); for (let i = 0; i < 4; i++) { rr(60 + i * 250, 400, 220, 220, 10); fillStroke('#e9e1cf', 6, '#7a4a2a'); }
  windowNight(700, 720, 280, 280, t); floor(1300, '#b07a4a'); lampLight(300, 300, 800, 'rgba(255,190,110,.45)'); }
SC.push({ i: 213, cam: [[213, 1, 540, 1000], [219, 1.2, 540, 1000], [226, 1.35, 600, 900], [231, 1.0, 540, 1000], [236, 1.3, 540, 980], [240, 1.0, 540, 960], [244, 1.35, 540, 900]], draw(t) {
  const part = t < w(231) ? 0 : t < w(240) ? 1 : 2;
  if (part === 0) { kitchen(t); const gone = t > w(228) + .2;
    perso('mere', 650, 1480, .92, t, { expr: gone ? 'blank' : t > w(227) ? 'love' : 'smile', flip: true, arms: gone ? 'down' : 'hug', look: [-1, 0] });
    perso('toi', 430, 1500, .92, t, { expr: gone ? 'sad' : 'happy', arms: 'hug', talk: t > w(226) && t < w(230) ? .7 : 0, look: [1, 0] });
    if (!gone) { bubble("Je t'aime, maman", 430, 760, 54, w(226), t, { tail: -1 }); hearts(t, w(227), 650, 900, 5); }
    else { const k = t - w(228) - .2; for (let i = 0; i < 40; i++) { g.save(); g.globalAlpha = clamp(1 - k); g.fillStyle = '#ddd'; g.fillRect(430 + (hash(i) - .5) * 500 + k * 200 * (hash(i + 1) - .5), 760 + (hash(i + 2) - .5) * 140 + k * k * 400, 12, 12); g.restore(); } txt('?', 800, 860, 130, '#fff', { stroke: OUT, sw: 14 }); }
    if (t > w(213) && t < w(219)) pill('MAIS...', W / 2, 330, 60, '#e8333a', '#fff', { sc: popIn(w(213), t) });
    midnight(w(228), t);
  } else if (part === 1) { sky('#4a3a6a', '#2a2040'); rr(-50, 820, 1180, 120, 30); fillStroke('#8a4a3a', 0); floor(1300, '#3a3050'); lampLight(540, 500, 900, 'rgba(160,140,255,.25)');
    const gone = t > w(238) + .1; rr(80, 1050, 920, 280, 60); fillStroke('#c0503a', 8); rr(80, 960, 920, 140, 50); fillStroke('#d0644a', 8);
    perso('pote', 680, 1380, .85, t, { expr: gone ? 'blank' : 'laugh', tear: !gone, bob: gone ? 0 : 2.5, arms: gone ? 'down' : 'up', tilt: gone ? 0 : Math.sin(t * 15) * .08 });
    perso('toi', 380, 1390, .85, t, { expr: gone ? 'sad' : 'laugh', bob: gone ? 0 : 2.5, arms: gone ? 'down' : 'up', tear: !gone });
    if (!gone) { txt('HAHAHA', 540 + Math.sin(t * 30) * 8, 620, 110, '#ffd23f', { stroke: OUT, sw: 18 }); pill('FOU RIRE LÉGENDAIRE', W / 2, 330, 44, '#ffd23f', OUT, { sc: popIn(w(236), t) }); }
    else { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(0, 0, W, H); g.restore(); txt('?', 760, 760, 130, '#fff', { stroke: OUT, sw: 14 }); }
    midnight(w(238) + .1, t);
  } else { sky('#05050c', '#120f22'); dust(t, '#ffd27a', 50, .5);
    perso('toi', W / 2, 1520, 1.0, t, { expr: 'sad', arms: 'hug', look: [0, -.6] });
    const jx = W / 2, jy = 1020; glow(jx, jy, 420, 'rgba(255,200,90,.7)'); rr(jx - 120, jy - 150, 240, 300, 50); g.fillStyle = 'rgba(200,230,255,.25)'; g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(230,240,255,.8)'; g.stroke(); rr(jx - 100, jy - 190, 200, 50, 14); fillStroke('#8a5a2a', 6);
    for (let i = 0; i < 9; i++) { const a = t * (1 + hash(i)) + i * 2, x = jx + Math.cos(a) * 70, y = jy + 30 + Math.sin(a * 1.3) * 90; glow(x, y, 60, ['rgba(255,80,120,.9)', 'rgba(255,210,60,.9)', 'rgba(120,200,255,.9)'][i % 3]); circ(x, y, 14); g.fillStyle = '#fff'; g.fill(); }
    if (t > w(245)) txt('TU ES LE SEUL', W / 2, 330, 80, '#fff', { stroke: OUT, sw: 14, glow: '#ffd27a' }), txt('À LES GARDER', W / 2, 420, 64, '#ffd27a', { stroke: OUT, sw: 12 });
  }
}});
// 12. RICHE. PUISSANT. SEUL.
SC.push({ i: 250, cam: [[250, 1.3, 540, 1100], [252, 1.15, 540, 1050], [254, 1.0, 540, 960], [255, .92, 540, 960]], draw(t) {
  sky('#05070f', '#0c1022'); windowNight(90, 300, 900, 1000, t, 1, 1);
  for (let i = 0; i < 6; i++) { rr(80 + i * 34, 1300 - i * 40, 160, 40, 6); fillStroke('#7fd08a', 4, '#245a2c'); rr(780 + (i % 2) * 40, 1300 - i * 40, 180, 40, 6); fillStroke('#ffd23f', 4, '#7a4d00'); }
  floor(1340, '#1a1626'); perso('toi', W / 2, 1420, .6, t, { expr: t > w(255) ? 'sad' : 'smug', flip: false, look: [0, -1] });
  [['RICHE', 252, '#ffd23f', 420], ['PUISSANT', 253, '#e8333a', 540]].forEach(([s, i0, c, y]) => { if (t > w(i0) && t < w(255)) pill(s, W / 2, y, 60, c, s === 'RICHE' ? OUT : '#fff', { sc: popIn(w(i0), t) }); });
  if (t > w(255)) { const k = seg(t, w(255), w(256) + .6); g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = k; g.fillStyle = '#777'; g.fillRect(0, 0, W, H); g.restore(); txt('SEUL.', W / 2, 520, 140 * popIn(w(256), t), '#fff', { glow: '#7ac8ff', blur: 40 }); }
}});
// 13. CE MATIN-LÀ
SC.push({ i: 257, cam: [[257, 1, 540, 1000], [260, 1.2, 640, 980], [266, 1.5, 700, 900]], draw(t) {
  lockers(t, 1); dust(t, '#fff3d0', 40, .4); const k = eOut(seg(t, w(260), w(266)));
  perso('toi', 300, 1500, .92, t, { expr: 'neutral', look: [1, 0] });
  perso('fille', lerp(1100, 720, k), 1480, .95, t, { expr: t > w(266) ? 'smug' : 'neutral', flip: true, bob: k < 1 ? 1.2 : 0, look: [-1, 0] });
}});
// 14. LA PHRASE
const PH = ['Tu', 'sais', 'que', 'tes', '8', 'premières', 'phrases', 'étaient', 'nulles ?'];
SC.push({ i: 271, cam: [[271, 1.1, 600, 1080], [277, 1.0, 540, 1000], [278, 1.5, 300, 1050]], draw(t) {
  lockers(t, 1); const shock = t > w(278);
  perso('toi', 290, 2050, 1.55, t, { expr: shock ? 'shock' : 'neutral', sweat: shock, look: [1, -.3] });
  perso('fille', 760, 2030, 1.55, t, { expr: 'smug', flip: true, talk: t < we(279) ? .6 : 0, look: [-1, 0] });
  const n = PH.filter((_, j) => t > w(271 + j)).length; if (n) { const s = PH.slice(0, n).join(' '); const l1 = PH.slice(0, Math.min(n, 4)).join(' '), l2 = n > 4 ? PH.slice(4, n).join(' ') : '';
    bubble(l2 ? l1 + '\n' + l2 : l1, 560, 600, 54, w(271), t, { tail: 1 }); }
  if (shock) { txt('!!', 200, 760, 140, '#ff3b3b', { stroke: OUT, sw: 16 }); }
}});
// 15. ELLE SE SOUVIENT
SC.push({ i: 280, cam: [[280, 1.25, 540, 900], [283, 1.0, 540, 960], [286, 1.0, 540, 960]], draw(t) {
  sky('#07050d', '#1a1030'); const end = t > w(286);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * .25; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .1; g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(W / 2, 800); g.arc(W / 2, 800, 1500, a, a + .1); g.fill(); g.restore(); }
  glow(W / 2, 800, 500, 'rgba(255,200,60,.6)');
  if (!end) { perso('fille', W / 2, 1700, 1.25, t, { expr: 'smug', eyeCol: '#d49a00', look: [0, 0] }); glow(W / 2 - 50, 1110, 90, 'rgba(255,220,60,1)'); glow(W / 2 + 50, 1110, 90, 'rgba(255,220,60,1)');
    txt('ELLE SE SOUVIENT', W / 2, 300, 78, '#ffd23f', { stroke: OUT, sw: 14, glow: '#ff9f1a' });
    if (t > w(283)) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * .8, x = W / 2 + Math.cos(a) * 400, y = 1000 + Math.sin(a) * 300; g.save(); g.translate(x, y); g.rotate(Math.sin(a) * .2); const s = popIn(w(283) + i * .06, t) * .75; g.scale(s, s); rr(-90, -100, 180, 200, 6); fillStroke('#fbfbf7', 5); txt('J' + (i + 1), 0, -30, 50, OUT); check(0, 45, .6, false, 0, 1); g.restore(); } }
  else { const s = popIn(w(286), t); g.save(); g.translate(W / 2, 760); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#151325', 10, '#ffd23f'); txt('PARTIE 2 ?', 0, 10, 130, '#ffd23f', { glow: '#ff9f1a' }); g.restore();
    const b = popIn(w(288) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1080); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
    perso('fille', 250, 1700, .8, t, { expr: 'smug', eyeCol: '#d49a00' }); perso('toi', 830, 1700, .8, t, { expr: 'shock', sweat: true, flip: true }); }
}});

// ================================================================ SÉRIE « PASSER » — PARTIE 3
SC.length = 0;
CHAR.mamie = { skin: SKIN.a, hair: '#d8d8d8', style: 'bun', shirt: '#c96b8a', pants: '#5a3a4a', shoe: '#5a4a5a', glasses: 1 };
CHAR.caissier = { skin: SKIN.c, hair: '#1d1d1d', style: 'cap', shirt: '#e8333a', pants: '#333', shoe: '#111', cap: '#ffd23f' };
CHAR.dentiste = { skin: SKIN.b, hair: '#333', style: 'short', shirt: '#7ad0c8', pants: '#7ad0c8', shoe: '#fff', glasses: 1 };
POW.push(['PASSER LES MOMENTS ENNUYEUX', 'skip']); POWCOL.push('#5ae0ff');
const _icon = icon; icon = function (k, s, col) { if (k !== 'skip') return _icon(k, s, col); g.save(); g.scale(s, s); for (const dx of [-45, 15]) { g.beginPath(); g.moveTo(dx - 20, -50); g.lineTo(dx + 40, 0); g.lineTo(dx - 20, 50); g.closePath(); fillStroke(col, 7); } rr(60, -50, 18, 100, 4); fillStroke(col, 7); g.restore(); };
const _face = face; face = function (C, t, o) { _face(C, t, o); if (o.beard) { g.save(); g.beginPath(); g.moveTo(-100, 10); g.quadraticCurveTo(-90, 120, 0, 125); g.quadraticCurveTo(90, 120, 100, 10); g.quadraticCurveTo(60, 70, 30, 40); g.lineTo(-30, 40); g.quadraticCurveTo(-60, 70, -100, 10); g.fillStyle = '#4a2c1e'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.restore(); } };
const NS = 11, TS = 10;
function roulS(t) { const TL = we(15) + .75, D = (3 * NS + TS) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
// effet « PASSER » : bandes d'avance rapide, flash blanc, petite ligne de moniteur cardiaque (indice)
function skipFx(t0, t) { OVL.push(() => { const k = t - t0; if (k < -.02 || k > .55) return; g.save(); g.globalAlpha = clamp(1 - k / .55);
  for (let i = 0; i < 18; i++) { const y = hash(i + Math.floor(t * 30)) * H; g.fillStyle = `rgba(255,255,255,${.25 + hash(i) * .4})`; g.fillRect(0, y, W, 4 + hash(i + 3) * 14); }
  pill('PASSER  ⏭', W / 2, 400, 64, '#fff', OUT, { sc: popIn(t0, t, .18) });
  g.beginPath(); for (let x = 0; x <= W; x += 10) { const ph = (x / W) * 6; const y = 1820 - (Math.abs(ph - 3) < .15 ? 80 : Math.abs(ph - 3.2) < .1 ? -40 : 0); g.lineTo(x, y); } g.lineWidth = 5; g.strokeStyle = 'rgba(80,255,140,.6)'; g.stroke();
  if (k < .1) { g.globalAlpha = (1 - k / .1) * .8; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); } g.restore(); }); }
function ytBar(x, y, w_, k) { rr(x, y, w_, 14, 7); fillStroke('rgba(255,255,255,.3)', 0); rr(x, y, w_ * k, 14, 7); fillStroke('#ff2a2a', 0); }

CHAR.mereB = { ...CHAR.mere, hair: '#e8e8e8' };
CHAR.frere = { skin: SKIN.a, hair: '#4a2c1e', style: 'messy', shirt: '#e8333a', pants: '#2b3247', shoe: '#fff', mustache: '#4a2c1e' };
CHAR.infirmiere = { skin: SKIN.b, hair: '#2a1a12', style: 'bun', shirt: '#f4f8fb', pants: '#e0eef4', shoe: '#fff' };
const TC = ['PASSER', 'SE RÉVEILLER', 'PASSER', 'SE RÉVEILLER', 'TON CHOIX'], NT = 5, TT = 4;
function tCard(i, x, y, s, hl) { const lab = TC[((i % NT) + NT) % NT]; g.save(); g.translate(x, y); g.scale(s, s); if (hl) glow(0, 0, 330, 'rgba(90,224,255,.6)', hl);
  rr(-135, -190, 270, 380, 30); fillStroke(lg(0, -190, 0, 190, ['#1a2a3a', '#0f1820']), 7, hl > .5 ? '#5ae0ff' : '#2a3a55'); rr(-115, -170, 230, 230, 22); fillStroke('#0a1a2a', 0);
  txt(lab === 'PASSER' ? '⏭' : lab === 'TON CHOIX' ? '?' : '☀', 0, -60, 110, lab === 'PASSER' ? '#5ae0ff' : '#ffd23f', { glow: '#fff', blur: 20 }); const ws = lab.split(' '); ws.forEach((x, j) => txt(x, 0, 100 + j * 44 - (ws.length - 1) * 22, 40, '#fff')); g.restore(); }
function rouT(t) { const TL = we(17) + .75, D = (5 * NT + TT) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
function ecg(y, amp, a, t) { g.beginPath(); for (let x = 0; x <= W; x += 6) { const ph = ((x / W) * 3 + t * .8) % 1; g.lineTo(x, y - (Math.abs(ph - .5) < .02 ? amp : Math.abs(ph - .53) < .02 ? -amp * .4 : 0)); } g.lineWidth = 7; g.strokeStyle = `rgba(80,255,140,${a})`; g.shadowColor = '#50ff8c'; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0; }
function bed(x, y, s, t, who = 1) { g.save(); g.translate(x, y); g.scale(s, s); rr(-360, -60, 720, 120, 20); fillStroke('#dfe6ea', 7); rr(-380, -160, 40, 260, 10); fillStroke('#9aa8b0', 6); rr(340, -100, 40, 200, 10); fillStroke('#9aa8b0', 6);
  if (who) { g.save(); g.translate(-210, -120); g.rotate(-Math.PI / 2 + .05); g.scale(.55, .55); g.translate(0, 470); circ(0, -470, 112); fillStroke(CHAR.toi.skin); face(CHAR.toi, t, { expr: 'neutral', blink: 0 }); hairFront(CHAR.toi); g.restore(); }
  rr(-260, -110, 600, 90, 40); fillStroke('#bfe0f0', 7); g.restore(); }

function pageBook(x, y, s, t, k) { g.save(); g.translate(x, y); g.scale(s, s); rr(-200, -130, 400, 260, 10); fillStroke('#c96b3a', 7); rr(-185, -118, 180, 236, 4); fillStroke('#fdf6e3', 4); rr(5, -118, 180, 236, 4); fillStroke('#fdf6e3', 4);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-170, -90 + i * 34, 150, 6); g.fillRect(20, -90 + i * 34, 150, 6); } const f = (t * 1.2) % 1; g.save(); g.scale(Math.cos(f * Math.PI), 1); rr(0, -118, 185, 236, 4); fillStroke('#fff6e6', 4); g.restore(); g.restore(); }
// 0. ROULETTE : PASSER OU SE RÉVEILLER
SC.push({ i: 0, cam: [[0, 1, 540, 960], [14, 1.08, 540, 940], [18, 1.0, 540, 960]], draw(t) {
  sky('#05101a', '#0a1a2a'); const { p, TL } = rouT(t), landed = t >= TL, fiche = seg(t, w(18) - .1, w(18) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 3 • FIN', W / 2, 170, 40, '#ffd23f', OUT); txt('PASSER', W / 2, 290, 90, '#5ae0ff', { glow: '#5ae0ff', blur: 40 }); txt('OU SE RÉVEILLER ?', W / 2, 385, 66, '#ffd23f', { glow: '#ffd23f', blur: 30 }); g.restore();
  if (t < w(4)) { sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); bed(W / 2 + 40, 1260, 1.0, t, 1); pill('PARTIE 3 • FIN', W / 2, 170, 40, '#ffd23f', OUT); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % NT) + NT) % NT;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(255,240,200,.9)', 'rgba(255,240,200,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TT; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) tCard(ii, x, 960, .92 + .1 * near, isT ? 1 : 0); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#fffbe8'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(255,210,60,.45)', fiche); tCard(TT, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1); txt('À TOI', W / 2, 220, 120, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' }); }
}});
// 1. C'EST TOI — L'ACCIDENT
SC.push({ i: 22, cam: [[22, 1.2, 400, 1150], [27, 1.0, 540, 1000], [32, 1.0, 540, 960], [35, 1.1, 540, 900]], draw(t) {
  if (t < w(32)) { sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); bed(W / 2 + 40, 1260, 1.0, t, 1); if (t > w(27)) stamp("C'EST TOI", W / 2, 520, 110, '#2a64d8', w(27), t); return; }
  sky('#ffcf9a', '#f3a46b'); floor(1200, '#3a3a48'); for (let i = 0; i < 5; i++) { g.fillStyle = '#fff'; g.fillRect(i * 260 - 40, 1400, 150, 16); }
  const k = seg(t, w(32), w(34)); g.save(); g.translate(lerp(-200, 520, k), 1250); g.rotate(k > .9 ? (k - .9) * 8 : 0); rr(-120, -60, 240, 70, 30); fillStroke('#2ecc71', 7); circ(-90, 30, 40); fillStroke('#222', 6); circ(90, 30, 40); fillStroke('#222', 6); g.restore();
  if (t > w(34)) { stamp('CRASH', W / 2, 800, 140, '#e8333a', w(34), t); if (t > w(35)) { card(10, W / 2, 1100 - 400 * eOut(seg(t, w(35), w(38))), .8 * popIn(w(36), t), 1, t); pill('LE MÊME JOUR', W / 2, 330, 56, '#111', '#fff', { sc: popIn(w(36), t) }); } }
}});
// 2. LE COMA
SC.push({ i: 44, cam: [[44, 1, 540, 960], [51, 1.15, 540, 900], [56, 1.0, 540, 960], [64, 1.3, 540, 800]], draw(t) {
  sky('#04060a', '#0a1018'); const d = t > w(64) ? seg(t, w(64), w(69)) : 0; g.save(); g.globalAlpha = 1 - d * .7; brain(W / 2, 760, 230, '#ff9ec4', { glow: `rgba(255,158,196,${.8 - d * .7})` }); g.restore();
  if (t > w(64)) for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(W / 2 + (i - 2) * 60, 600); for (let j = 1; j < 6; j++) g.lineTo(W / 2 + (i - 2) * 60 + (hash(i * 7 + j) - .5) * 60, 600 + j * 60 * d); g.lineWidth = 6; g.strokeStyle = '#111'; g.stroke(); }
  if (t > w(55)) stamp('COMA', W / 2, 1250, 140, '#e8333a', w(55), t);
  if (t > w(61) && t < w(64)) { g.save(); g.translate(W / 2, 1250); icon('skip', 1.2, '#5ae0ff'); g.restore(); } skipFx(w(63), t);
}});
// 3. LE BIP, LA VOIX
SC.push({ i: 70, cam: [[70, 1.2, 760, 800], [74, 1.0, 540, 1000], [83, 1.2, 540, 1000]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); rr(680, 640, 300, 240, 16); fillStroke('#222', 8); ecg(760, 60, .9, t); txt('♥ 62', 940, 700, 30, '#50ff8c');
  bed(W / 2 + 120, 1300, .9, t, 1); if (t > w(74)) { perso('mereB', 180, 1480, .8, t, { expr: 'sad', arms: 'cards', talk: .3 }); pageBook(180, 1290, .4, t, 0); }
  if (t > w(83)) { const n = Math.floor(eOut(seg(t, w(83), w(87))) * 9); pill('DEPUIS ' + n + ' ANS', W / 2, 330, 60, '#e8333a', '#fff'); }
}});
// 4. L'INFIRMIÈRE
SC.push({ i: 88, cam: [[88, 1.2, 540, 960], [92, 1.0, 540, 960], [100, 1.15, 540, 820]], draw(t) {
  sky('#ffffff', '#e8f0f6'); glow(W / 2, 700, 800, 'rgba(255,255,255,1)'); perso('infirmiere', W / 2, 1600, 1.1, t, { expr: 'smile', talk: t > w(92) ? .5 : 0 });
  if (t > w(92)) bubble('Pour te réveiller,\nfais l’inverse.', W / 2, 560, 56, w(93), t, { tail: 0, t1: w(100) }); if (t > w(100)) bubble('Vis un moment\nennuyeux.\nEN ENTIER.', W / 2, 560, 60, w(100), t, { tail: 0, bg: '#fff6d0' });
}});
// 5. LA TENTATION
SC.push({ i: 108, cam: [[108, 1, 540, 960], [111, 1.3, 540, 800]], draw(t) {
  sky('#04060a', '#0a1018'); const on = Math.sin(t * 8) > 0; g.save(); g.translate(W / 2, 800); glow(0, 0, on ? 500 : 300, 'rgba(90,224,255,.7)'); circ(0, 0, 250); fillStroke('#1a2a3a', 14, on ? '#5ae0ff' : '#2a4a5a'); icon('skip', 1.7, on ? '#5ae0ff' : '#2a5a6a'); g.restore();
  g.save(); g.translate(W / 2 + 80, 1300 - Math.sin(t * 2) * 40); circ(0, 0, 70); fillStroke(SKIN.a, 8); g.restore(); if (t > w(112)) txt('SI FACILE...', W / 2, 1150, 80, '#fff', { stroke: OUT, sw: 14 });
}});
// 6. TU RESTES
SC.push({ i: 116, cam: [[116, 1, 540, 960], [119, 1.2, 400, 1050], [124, 1.35, 400, 1100], [133, 1.0, 540, 960]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); bed(W / 2 + 120, 1300, .9, t, 1); perso('mereB', 220, 1480, .85, t, { expr: 'sad', arms: 'cards', talk: .3 }); pageBook(230, 1300, .45, t, 0);
  g.save(); g.globalAlpha = .35; perso('toi', 820, 1500, .8, t, { expr: 'sad', look: [-1, 0], flip: true }); g.restore();
  const k = seg(t, w(124), w(135)); pill('PAGE ' + (1 + Math.floor(k * 119)) + ' / 120', W / 2, 330, 50, '#fff', OUT); rr(240, 400, 600, 20, 10); fillStroke('#ddd', 3); rr(240, 400, 600 * k, 20, 10); fillStroke('#2ecc71', 0);
  if (t > w(129)) txt('C’EST LONG...', W / 2, 560, 70, '#888', { stroke: '#fff', sw: 10 }); if (t > w(133)) stamp('TU RESTES', W / 2, 700, 100, '#2ecc71', w(133), t);
}});
// 7. TU OUVRES LES YEUX
SC.push({ i: 135, cam: [[135, 1, 540, 960], [140, 1.0, 540, 960]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 300, 900, 'rgba(255,255,255,1)'); const k = clamp((t - w(141)) / .8);
  g.save(); g.translate(W / 2, 1000); g.scale(2.6, 2.6); circ(0, 0, 112); fillStroke(CHAR.toi.skin); face(CHAR.toi, t, { expr: 'neutral', blink: k < .05 ? 0 : Math.min(1, k * 1.2), look: [0, -.4] }); hairFront(CHAR.toi); g.restore();
  if (t > w(141)) { g.save(); g.globalAlpha = clamp(1 - (t - w(141)) / 1.2) * .8; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
}});
// 8. MAMAN
SC.push({ i: 144, cam: [[144, 1.2, 540, 1050], [149, 1.0, 540, 1000], [153, 1.25, 540, 1000]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,240,200,1)'); floor(1450, '#c8d0d8');
  if (t < w(149)) { const k = seg(t, w(146), w(148)); g.save(); g.translate(540, lerp(1000, 1420, k * k)); g.rotate(k * 3); pageBook(0, 0, .5, 0, 0); g.restore(); }
  perso('mereB', 640, 1500, 1.0, t, { expr: t > w(151) ? 'happy' : 'sad', tear: true, arms: t > w(153) ? 'hug' : 'down', flip: true }); perso('toi', 400, 1520, .95, t, { expr: 'smile', arms: t > w(153) ? 'hug' : 'down', blush: true });
  if (t > w(153)) hearts(t, w(153), 520, 900, 7);
}});
// 9. 24 ANS
SC.push({ i: 158, cam: [[158, 1, 540, 960], [162, 1.0, 540, 900], [168, 1.15, 540, 900]], draw(t) {
  sky('#1a1a26', '#2a2a3a'); txt('24 ANS', W / 2, 300, 140 * popIn(w(160), t), '#fff', { stroke: OUT, sw: 18, glow: '#7ac8ff' });
  [['RÉCRÉ', '#2ecc71', 162], ['SOIRÉES', '#ff6bd6', 165], ['VACANCES', '#ff9f5a', 166]].forEach(([s_, c, i0], j) => { if (t < w(i0)) return; const f = seg(t, w(168), w(173)); g.save(); g.translate(250 + j * 290, 820 + j * 40); g.rotate((j - 1) * .1); g.globalAlpha = 1 - f; g.scale(popIn(w(i0), t), popIn(w(i0), t)); rr(-130, -160, 260, 320, 6); fillStroke('#fbfbf7', 6); rr(-110, -140, 220, 200, 4); fillStroke(c, 0); txt(s_, 0, 110, 32, OUT); g.restore(); });
  if (t > w(168)) txt("N'A JAMAIS EXISTÉ", W / 2, 1250, 70, '#e8333a', { stroke: OUT, sw: 12 });
}});
// 10. MAINTENANT TU VIS TOUT
SC.push({ i: 174, cam: [[174, 1, 540, 960], [179, 1.0, 540, 980], [181, 1.0, 540, 980], [185, 1.0, 540, 980], [187, 1.1, 540, 960], [192, 1.0, 540, 960]], draw(t) {
  const ph = t < w(179) ? 0 : t < w(181) ? 1 : t < w(185) ? 2 : t < w(187) ? 3 : t < w(192) ? 4 : 5;
  if (ph === 0) { sky('#ffcf9a', '#ffe7b0'); glow(W / 2, 600, 700, 'rgba(255,230,150,.9)'); perso('toi', W / 2, 1560, 1.05, t, { expr: 'happy', arms: 'up', beard: true }); txt('TU VIS TOUT', W / 2, 330, 90, '#fff', { stroke: OUT, sw: 16 }); }
  if (ph === 1) { sky('#c9d9ea', '#9fb4cc'); rr(60, 700, 960, 520, 40); fillStroke('#ffd23f', 8); for (let i = 0; i < 4; i++) { rr(110 + i * 230, 780, 190, 170, 14); fillStroke('#bfe6ff', 6); } perso('toi', 330, 1150, .55, t, { expr: 'happy', beard: true }); circ(250, 1230, 60); fillStroke('#222', 8); circ(830, 1230, 60); fillStroke('#222', 8); pill('BUS • 45 MIN', W / 2, 300, 56, '#2ecc71', '#fff'); }
  if (ph === 2) { sky('#ffcf5a', '#ff9f3a'); floor(1300, '#d9c0a0'); for (let i = 0; i < 6; i++) perso(['pote', 'mamie', 'joueur1', 'joueur2', 'joueur3', 'toi'][i], 900 - i * 140, 1450, .55, t, { expr: i === 5 ? 'happy' : 'neutral', flip: true, beard: i === 5 }); pill('QUEUE • 30 MIN', W / 2, 300, 56, '#2ecc71', '#fff'); }
  if (ph === 3) { sky('#eaf7f6', '#cfe9e6'); floor(1300, '#bcd'); rr(260, 1050, 560, 120, 40); fillStroke('#5ab0a0', 8); perso('dentiste', 800, 1450, .9, t, { expr: 'shock', flip: true }); perso('toi', 380, 1400, .8, t, { expr: 'happy', tilt: -.3, beard: true }); pill('DENTISTE', W / 2, 300, 56, '#2ecc71', '#fff'); }
  if (ph === 4) { sky('#ffcf9a', '#ffe7b0'); glow(W / 2, 600, 700, 'rgba(255,230,150,.9)'); perso('toi', W / 2, 1560, 1.05, t, { expr: 'happy', arms: 'hug', beard: true }); txt('CHAQUE SECONDE', W / 2, 330, 80, '#fff', { stroke: OUT, sw: 14 }); hearts(t, w(189), W / 2, 1000, 6); }
  if (ph === 5) { sky('#0a0a12', '#141420'); txt('FIN', W / 2, 860, 260 * popIn(w(192), t), '#fff', { glow: '#ffd23f', blur: 50 }); }
}});

// ---------------------------------------------------------------- moteur
const NOISE = []; for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d'), d = x.createImageData(270, 480); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); NOISE.push(c); }
let CH = [];
function buildChunks() { CH = []; let cur = []; CAP.forEach((c, i) => { cur.push(i); const p = /[.,!?:…]$/.test(c.w) || c.w.endsWith('...'); if (p || cur.length >= 3) { CH.push(cur); cur = []; } }); if (cur.length) CH.push(cur); }
function captions(t) {
  let ci = -1; for (let k = 0; k < CH.length; k++) if (w(CH[k][0]) - .05 <= t) ci = k; if (ci < 0) return; const ch = CH[ci]; if (t > we(ch[ch.length - 1]) + .5) return;
  const words = ch.map(i => CAP[i].w.toUpperCase()); const size = 76; g.save(); g.font = F(size); g.letterSpacing = '0px'; const sp = 40; const ws = words.map(s => g.measureText(s).width); let tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const sc = Math.min(1, 980 / tot) * (1 + .12 * (1 - eOut((t - w(ch[0]) + .05) / .15))); g.translate(W / 2, 1620); g.scale(sc, sc); let x = -tot / 2;
  ch.forEach((i, j) => { const act = t >= w(i) - .05; const s = words[j]; g.save(); g.translate(x + ws[j] / 2, 0); const pop = act && t < w(i) + .12 ? 1 + .06 * (1 - (t - w(i)) / .12) : 1; g.scale(pop, pop);
    txt(s, 0, 0, size, act ? '#ffd23f' : '#fff', { stroke: '#000', sw: 18 }); g.restore(); x += ws[j] + sp; });
  g.restore();
}
function camAt(sc, t) { const keys = sc.cam; let k = 0; for (let j = 0; j < keys.length; j++) if (w(keys[j][0]) - .05 <= t || j === 0) k = j; const K = keys[k], P = keys[Math.max(0, k - 1)], tk = k === 0 ? w(sc.i) : w(K[0]) - .05;
  const a = k === 0 ? 1 : eOut((t - tk) / .4); const z = lerp(P[1], K[1], a) * (1 + .018 * (t - tk)) * (1 + .03 * Math.max(0, 1 - (t - tk) / .2)); return { z, x: lerp(P[2], K[2], a), y: lerp(P[3], K[3], a) }; }
function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  let si = 0; for (let k = 0; k < SC.length; k++) if (w(SC[k].i) - .05 <= t) si = k; const sc = SC[si], ts = si ? w(sc.i) - .05 : 0;
  const c = camAt(sc, t), whip = si ? (1 - eOut((t - ts) / .2)) * 160 : 0;
  g.save(); g.translate(W / 2 + whip, H / 2); g.scale(c.z, c.z); g.translate(-c.x, -c.y);
  // les effets plein écran (minuit, flash) sont dessinés hors caméra : on les intercepte
  OVL = []; g.save(); sc.draw(t); g.restore(); g.restore(); OVL.forEach(f => { g.save(); f(); g.restore(); });
  vignette(.5); captions(t);
  if (si && t - ts < .1) { g.fillStyle = `rgba(255,255,255,${.7 * (1 - (t - ts) / .1)})`; g.fillRect(0, 0, W, H); }
  g.save(); g.globalAlpha = .07; g.globalCompositeOperation = 'overlay'; g.drawImage(NOISE[Math.floor(t * 24) % 4], 0, 0, W, H); g.restore();
  if (t > END - .4) { g.fillStyle = `rgba(0,0,0,${clamp((t - END + .4) / .4)})`; g.fillRect(0, 0, W, H); }
}
window.render = render;
window.setTiming = d => { CAP = d.captions; buildChunks(); END = (d.duration || CAP[CAP.length - 1].e) + VO + .9; window.DURATION = END;
  window.SHOTS = SC.map(s => s.cam.map(k => ({ t: w(k[0]), subj: 'sc' + s.i, fr: 'k' + k[0] }))).flat(); return END; };
document.fonts.load(F(80)).then(() => document.fonts.load(F(80, 800))).then(() => { window.__ready = true; });
window.__loaded = true;
