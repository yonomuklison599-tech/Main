// ================================================================ SÉRIE « PASSER » — PARTIE 2
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
const TC = ['1 AN', '3 ANS', '5 ANS', '9 ANS', '15 ANS', '?'], NT = 6, TT = 5;
function tCard(i, x, y, s, hl) { const lab = TC[((i % NT) + NT) % NT]; g.save(); g.translate(x, y); g.scale(s, s); if (hl) glow(0, 0, 330, 'rgba(90,224,255,.6)', hl);
  rr(-135, -190, 270, 380, 30); fillStroke(lg(0, -190, 0, 190, ['#1a2a3a', '#0f1820']), 7, hl > .5 ? '#5ae0ff' : '#2a3a55'); rr(-115, -170, 230, 230, 22); fillStroke('#0a1a2a', 0);
  txt('⏭', 0, -95, 60, '#5ae0ff'); txt(lab, 0, -10, lab.length > 3 ? 64 : 110, '#fff', { glow: '#5ae0ff' }); txt('SAUTÉS', 0, 120, 34, 'rgba(255,255,255,.7)', { wt: 800, ls: 4 }); g.restore(); }
function rouT(t) { const TL = we(17) + .75, D = (5 * NT + TT) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
function ecg(y, amp, a, t) { g.beginPath(); for (let x = 0; x <= W; x += 6) { const ph = ((x / W) * 3 + t * .8) % 1; g.lineTo(x, y - (Math.abs(ph - .5) < .02 ? amp : Math.abs(ph - .53) < .02 ? -amp * .4 : 0)); } g.lineWidth = 7; g.strokeStyle = `rgba(80,255,140,${a})`; g.shadowColor = '#50ff8c'; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0; }
function bed(x, y, s, t, who = 1) { g.save(); g.translate(x, y); g.scale(s, s); rr(-360, -60, 720, 120, 20); fillStroke('#dfe6ea', 7); rr(-380, -160, 40, 260, 10); fillStroke('#9aa8b0', 6); rr(340, -100, 40, 200, 10); fillStroke('#9aa8b0', 6);
  if (who) { g.save(); g.translate(-210, -120); g.rotate(-Math.PI / 2 + .05); g.scale(.55, .55); g.translate(0, 470); circ(0, -470, 112); fillStroke(CHAR.toi.skin); face(CHAR.toi, t, { expr: 'neutral', blink: 0 }); hairFront(CHAR.toi); g.restore(); }
  rr(-260, -110, 600, 90, 40); fillStroke('#bfe0f0', 7); g.restore(); }
// 0. ROULETTE DU TEMPS
SC.push({ i: 0, cam: [[0, 1, 540, 960], [14, 1.08, 540, 940], [18, 1.0, 540, 960]], draw(t) {
  sky('#05101a', '#0a1a2a'); const { p, TL } = rouT(t), landed = t >= TL, fiche = seg(t, w(18) - .1, w(18) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 2', W / 2, 170, 40, '#5ae0ff', OUT); txt('COMBIEN DE TEMPS', W / 2, 290, 80, '#fff', { glow: '#5ae0ff', blur: 40 }); txt('AS-TU SAUTÉ ?', W / 2, 385, 70, '#ffd23f', { glow: '#ffd23f', blur: 30 }); g.restore();
  if (t < w(8)) { sky('#cfd9e0', '#9fb0ba'); rr(190, 260, 700, 1000, 40); fillStroke('#d0c8b8', 14, '#6b5a4a'); g.save(); rr(210, 280, 660, 960, 30); g.clip(); g.fillStyle = '#dceaf2'; g.fillRect(210, 280, 660, 960); perso('toi', W / 2, 1700, 1.25, t, { expr: 'shock', beard: true, sweat: true }); g.restore(); pill('PARTIE 2', W / 2, 170, 40, '#5ae0ff', OUT); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % NT) + NT) % NT;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(200,240,255,.9)', 'rgba(200,240,255,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TT; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) tCard(ii, x, 960, .92 + .1 * near, isT ? 1 : 0); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#e8fbff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(90,224,255,.45)', fiche); tCard(TT, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1); txt('INCONNU', W / 2, 220, 110, '#5ae0ff', { stroke: OUT, sw: 16, glow: '#00c8ff' }); }
}});
// 1. L'ENQUÊTE
SC.push({ i: 20, cam: [[20, 1, 540, 960], [26, 1.2, 540, 960]], draw(t) {
  sky('#1a1408', '#2a1e0a'); lampLight(540, 400, 800, 'rgba(255,200,100,.35)'); floor(1350, '#3a2a18');
  perso('toi', W / 2, 1560, 1.0, t, { expr: 'angry', arms: 'point', look: [1, -.3] }); g.save(); g.translate(760, 1040); circ(0, 0, 70); g.lineWidth = 16; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 9; g.strokeStyle = '#ccc'; g.stroke(); g.globalAlpha = .3; g.fillStyle = '#bfe6ff'; g.fill(); g.restore();
  if (t > w(26)) pill('ENQUÊTE', W / 2, 330, 70, '#ffd23f', OUT, { sc: popIn(w(26), t) }); else txt('MÊME LA ROULETTE NE SAIT PAS', W / 2, 330, 48, '#fff', { stroke: OUT, sw: 10 });
}});
// 2. LA FAMILLE A CHANGÉ
SC.push({ i: 29, cam: [[29, 1.3, 540, 900], [35, 1.3, 540, 900], [41, 1.1, 540, 1000]], draw(t) {
  kitchen(t); const ph = t < w(35) ? 0 : t < w(41) ? 1 : 2;
  if (ph === 0) { perso('mereB', W / 2, 1480, 1.0, t, { expr: 'sad', arms: 'hug' }); pill('CHEVEUX BLANCS', W / 2, 330, 56, '#fff', OUT, { sc: popIn(w(33), t) }); }
  if (ph === 1) { perso('frere', W / 2, 1480, .95, t, { expr: 'smug', arms: 'hips' }); txt('?!', 780, 760, 120, '#ffd23f', { stroke: OUT, sw: 14 }); pill('TON PETIT FRÈRE', W / 2, 330, 56, '#e8333a', '#fff', { sc: popIn(w(35), t) }); }
  if (ph === 2) { g.beginPath(); g.ellipse(W / 2, 1380, 160, 50, 0, 0, Math.PI * 2); fillStroke('#e8333a', 8); txt('REX', W / 2, 1385, 50, '#fff'); rr(700, 900, 220, 300, 6); fillStroke('#fbfbf7', 6); rr(720, 920, 180, 200, 4); fillStroke('#7ac8ff', 0); txt('🐾', 810, 1020, 70, OUT); g.save(); g.globalAlpha = .9; g.fillStyle = '#111'; g.fillRect(690, 1130, 240, 30); g.restore();
    perso('toi', 280, 1560, .85, t, { expr: 'sad', tear: true }); }
}});
// 3. LE BOUTON APPUIE TOUT SEUL
SC.push({ i: 46, cam: [[46, 1, 540, 960], [52, 1.2, 540, 820], [55, 1.4, 540, 780]], draw(t) {
  sky('#0a0f1a', '#141c2a'); if (t < w(52)) { perso('toi', W / 2, 1560, 1.0, t, { expr: 'angry', arms: 'fist' }); g.save(); g.translate(W / 2, 560); g.scale(popIn(w(48), t), popIn(w(48), t)); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; g.lineTo(Math.cos(a) * 180, Math.sin(a) * 180); } g.closePath(); fillStroke('#e8333a', 10, '#fff'); txt('STOP', 0, 6, 90, '#fff'); g.restore(); return; }
  const press = t > w(55) && Math.sin(t * 9) > 0; g.save(); g.translate(W / 2, 800); g.scale(press ? .92 : 1, press ? .92 : 1); glow(0, 0, 400, 'rgba(90,224,255,.6)'); circ(0, 0, 230); fillStroke('#1a2a3a', 14, '#5ae0ff'); icon('skip', 1.6, '#5ae0ff'); g.restore();
  if (t > w(55)) { txt('TOUT SEUL', W / 2, 1200, 100, '#ff2a4a', { stroke: OUT, sw: 16 }); } skipFx(w(56), t);
}});
// 4. DES JOURNÉES DISPARAISSENT
SC.push({ i: 58, cam: [[58, 1.1, 540, 960], [64, 1.1, 540, 960], [68, 1.0, 540, 960]], draw(t) {
  const ph = t < w(64) ? 0 : t < w(68) ? 1 : 2;
  if (ph === 0) { sky('#e6f2f8', '#b8ccd8'); perso('toi', W / 2, 1560, 1.0, t, { expr: 'neutral', arms: 'phone' }); rr(640, 980, 20, 140, 6); fillStroke('#2a64d8', 5); pill('BROSSE À DENTS', W / 2, 330, 50, '#2a64d8', '#fff'); }
  if (ph === 1) { kitchen(t); perso('toi', 330, 1500, .92, t, { expr: 'smile', arms: 'wave' }); perso('mereB', 760, 1490, .92, t, { expr: 'smile', flip: true }); bubble('Bonjour !', 330, 760, 54, w(65), t, { tail: -1 }); }
  if (ph === 2) { sky('#0b1020', '#16223f'); for (let i = 0; i < 24; i++) { const k = ((t - w(68)) * 1.5 + i / 24) % 1; g.save(); g.translate(W / 2 + (hash(i) - .5) * 900 * k, 900 - k * 700 + hash(i + 1) * 200); g.rotate(k * 6 + i); g.globalAlpha = 1 - k; rr(-70, -90, 140, 180, 6); fillStroke('#fff', 5); txt(String(1 + (i * 7) % 28), 0, 10, 60, '#e8333a'); g.restore(); } pill('DES JOURNÉES ENTIÈRES', W / 2, 1300, 50, '#e8333a', '#fff', { sc: popIn(w(68), t) }); }
  skipFx(w(63), t); skipFx(w(67), t);
}});
// 5. LE BIP ET « EST-CE QUE TU M'ENTENDS ? »
SC.push({ i: 72, cam: [[72, 1, 540, 960], [77, 1.15, 540, 900], [85, 1.0, 540, 960], [95, 1.2, 540, 960]], draw(t) {
  sky('#04060a', '#0a1018'); const k = seg(t, w(77), w(84));
  ecg(500, 120 + 120 * k, .4 + .6 * k, t * (1 + 2 * k)); perso('toi', W / 2, 1600, 1.0, t, { expr: 'shock', sweat: t > w(80) });
  if (t > w(85)) { g.save(); g.filter = 'blur(10px)'; g.globalAlpha = .6; for (let i = 0; i < 3; i++) perso(['mereB', 'infirmiere', 'pote'][i], 200 + i * 340, 1250, .55, t, { expr: 'sad' }); g.restore(); }
  if (t > w(95)) ["Est-ce que tu\nm'entends ?", "Tu m'entends ?", "Réveille-..."].forEach((s, i) => bubble(s, 220 + i * 320, 700 + (i % 2) * 140, 44, w(95) + i * .3, t, { tail: 0, bg: '#eef4ff' }));
}});
// 6. L'INFIRMIÈRE PARTOUT
SC.push({ i: 99, cam: [[99, 1, 540, 960], [104, 1.1, 540, 1000], [106, 1.1, 540, 1000], [108, 1.1, 540, 1000], [111, 1.0, 540, 960]], draw(t) {
  const ph = t < w(104) ? 0 : t < w(106) ? 1 : t < w(108) ? 2 : t < w(111) ? 3 : 4;
  if (ph === 0) { sky('#f4f8fb', '#d8e6ee'); glow(W / 2, 300, 600, 'rgba(255,255,255,1)'); perso('infirmiere', W / 2, 1560, 1.05, t, { expr: 'smile', look: [0, 0] }); circ(W / 2, 1020, 0); rr(W / 2 - 30, 1050, 60, 60, 8); fillStroke('#e8333a', 0); pill('UNE INFIRMIÈRE', W / 2, 330, 56, '#e8333a', '#fff', { sc: popIn(w(102), t) }); }
  if (ph === 1) { lockers(t); perso('toi', 330, 1500, .92, t, { expr: 'shock' }); perso('infirmiere', 780, 1490, .92, t, { expr: 'smile', flip: true }); pill('LYCÉE', W / 2, 300, 56, '#2a64d8', '#fff'); }
  if (ph === 2) { sky('#ffcf5a', '#ff9f3a'); floor(1300, '#d9c0a0'); perso('toi', 330, 1500, .92, t, { expr: 'shock' }); perso('infirmiere', 780, 1490, .92, t, { expr: 'smile', flip: true }); pill('MCDO', W / 2, 300, 56, '#e8333a', '#fff'); }
  if (ph === 3) { kitchen(t); perso('toi', 330, 1500, .92, t, { expr: 'shock', sweat: true }); perso('infirmiere', 780, 1490, .92, t, { expr: 'smile', flip: true }); pill('TON SALON', W / 2, 300, 56, '#7a5bd6', '#fff'); }
  if (ph === 4) { lockers(t); ['pote', 'fille', 'prof'].forEach((id, i) => perso(id, 200 + i * 220, 1500, .7, t, { expr: 'neutral', look: [-1, 0] })); g.save(); g.globalAlpha = .5 + .3 * Math.sin(t * 6); perso('infirmiere', 900, 1490, .8, t, { expr: 'smile', flip: true }); g.restore(); pill('PERSONNE NE LA VOIT', W / 2, 330, 50, '#111', '#fff', { sc: popIn(w(111), t) }); }
}});
// 7. LA PORTE 214
SC.push({ i: 116, cam: [[116, 1, 540, 1000], [124, 1.25, 540, 880], [130, 1.5, 540, 700]], draw(t) {
  lockers(t); g.save(); g.fillStyle = 'rgba(10,15,30,.35)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); const s = eOut(seg(t, w(123), w(125)));
  g.save(); g.globalAlpha = s; glow(W / 2, 900, 500, 'rgba(255,255,255,.8)'); rr(340, 560, 400, 760, 10); fillStroke('#f4f8fb', 10, '#9aa8b0'); circ(690, 950, 16); fillStroke('#c0c8d0', 5); rr(430, 620, 220, 90, 10); fillStroke('#2a64d8', 6); txt('214', W / 2, 668, 64, '#fff'); g.restore();
  perso('toi', 220, 1600, .95, t, { expr: 'shock', look: [1, -1] }); if (t > w(130)) pill('CHAMBRE 214', W / 2, 420, 56, '#2a64d8', '#fff', { sc: popIn(w(130), t) });
}});
// 8. LA CHAMBRE
SC.push({ i: 134, cam: [[134, 1, 540, 960], [136, 1.1, 540, 1100], [138, 1.2, 760, 800], [140, 1.3, 200, 900], [142, 1.2, 540, 1050]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); windowNight(700, 340, 300, 300, t, 1);
  rr(680, 640, 300, 240, 16); fillStroke('#222', 8); ecg(760, 60, .9, t); txt('♥ 62', 940, 700, 30, '#50ff8c'); rr(820, 880, 20, 560, 6); fillStroke('#888', 5);
  rr(140, 1000, 130, 160, 20); fillStroke('#bfe6ff', 6); for (let i = 0; i < 5; i++) { circ(160 + i * 25, 920 - (i % 2) * 30, 28); fillStroke(['#ff6b8a', '#ffd23f', '#ff9f5a'][i % 3], 4); g.fillStyle = '#2e7d4f'; g.fillRect(170 + i * 22, 940, 6, 70); }
  bed(W / 2 + 40, 1260, 1.0, t, 1);
}});
// 9. IL A TON VISAGE
SC.push({ i: 150, cam: [[150, 1.5, 330, 1120], [152, 1.9, 330, 1120]], draw(t) {
  sky('#f2f5f8', '#d6dee6'); glow(W / 2, 200, 700, 'rgba(255,255,255,1)'); floor(1450, '#c8d0d8'); bed(W / 2 + 40, 1260, 1.0, t, 1);
  if (t > we(153)) { g.save(); g.globalAlpha = clamp((t - we(153)) / .3); g.fillStyle = '#000'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); }
}});
// 10. PARTIE 3 ?
SC.push({ i: 154, cam: [[154, 1, 540, 960]], draw(t) {
  sky('#04060a', '#0a1018'); ecg(1400, 140, .6, t);
  const s = popIn(w(154), t); g.save(); g.translate(W / 2, 760); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#0a1a2a', 10, '#5ae0ff'); txt('PARTIE 3 ?', 0, 10, 130, '#5ae0ff', { glow: '#00c8ff' }); g.restore();
  pill('LA FIN', W / 2, 1000, 56, '#ffd23f', OUT, { sc: popIn(w(156), t) });
  const b = popIn(w(158) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1180); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
}});
