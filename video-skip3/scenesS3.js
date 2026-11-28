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
  bed(W / 2 + 120, 1300, .9, t, 1); if (t > w(74)) { perso('mereB', 180, 1480, .8, t, { expr: 'sad', arms: 'cards', talk: .3 }); pageBook(180, 1120, .4, t, 0); }
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
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); bed(W / 2 + 120, 1300, .9, t, 1); perso('mereB', 220, 1480, .85, t, { expr: 'sad', arms: 'cards', talk: .3 }); pageBook(230, 1100, .45, t, 0);
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
