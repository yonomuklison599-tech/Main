// ================================================================ SÉRIE « MENTIR » — PARTIE 2
SC.length = 0;
CHAR.nouvelle = { skin: SKIN.a, hair: '#7b4bd6', style: 'long', shirt: '#1f1f2a', pants: '#2a2a3a', shoe: '#fff' };
POW.push(['DÉTECTER LES MENSONGES', 'lie']); POWCOL.push('#ff4d6d');
const _icon = icon; icon = function (k, s, col) { if (k !== 'lie') return _icon(k, s, col); g.save(); g.scale(s, s); circ(-15, -15, 50); g.lineWidth = 14; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 8; g.strokeStyle = '#ddd'; g.stroke(); rr(15, 20, 22, 70, 10); g.save(); g.translate(26, 55); g.rotate(-.7); rr(-11, -35, 22, 70, 10); fillStroke('#8a5a2a', 6); g.restore();
  for (let i = 0; i < 3; i++) { circ(-30 + i * 15, -20 - i * 12, 12 - i * 2); g.fillStyle = col; g.fill(); } g.restore(); };
const NM = 11, TM = 10;
function roulM2(t) { const TL = we(16) + .75, D = (3 * NM + TM) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
function smoke(x, y, t, t0, big = 1) { if (t < t0) return; const k = t - t0; for (let i = 0; i < 14 * big; i++) { const kk = (k * .9 + i / (14 * big)) % 1.4; if (k < i * .04) continue; const px = x + Math.sin(i * 1.7 + kk * 4) * 40 * big * kk, py = y - kk * 260 * big;
  g.save(); g.globalAlpha = clamp(1 - kk / 1.4) * .85; circ(px, py, (18 + kk * 50) * big); g.fillStyle = i % 2 ? '#ff2a4a' : '#ff6b7a'; g.fill(); g.restore(); } }
// 0. ROULETTE POUR ELLE
SC.push({ i: 0, cam: [[0, 1, 540, 960], [13, 1.08, 540, 940], [17, 1.0, 540, 960]], draw(t) {
  sky('#0c0614', '#1a0c22'); const { p, TL } = roulM2(t), landed = t >= TL, fiche = seg(t, w(17) - .1, w(17) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 2', W / 2, 170, 40, '#7b4bd6', '#fff'); txt('ET ELLE,', W / 2, 290, 100, '#fff', { glow: '#9b6bff', blur: 40 }); txt('QUEL POUVOIR ?', W / 2, 390, 70, '#ffd23f', { glow: '#ffd23f', blur: 30, wt: 800 }); g.restore();
  if (t < w(7)) { perso('nouvelle', W / 2, 1500, popIn(0, t), t, { expr: 'smug', eyeCol: '#7b4bd6' }); bubble('Je ne te crois pas.', W / 2, 760, 54, 0, t, { tail: 0, bg: '#efe6ff' }); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % NM) + NM) % NM;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(220,200,255,.9)', 'rgba(220,200,255,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TM; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) card(ii, x, 960, .92 + .1 * near, isT ? 1 : 0, t); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#f4e8ff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(255,60,100,.45)', fiche); card(TM, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1, t);
    txt('DÉTECTEUR', W / 2, 200, 100, '#ff4d6d', { stroke: OUT, sw: 16, glow: '#ff0040' }); txt('DE MENSONGES', W / 2, 300, 66, '#fff', { stroke: OUT, sw: 12 }); pill('UNIQUE', W / 2, 1260, 46, '#ffd23f', OUT, { sc: popIn(w(18), t) }); }
}});
// 1. MAYA & LA FUMÉE ROUGE
SC.push({ i: 20, cam: [[20, 1.2, 540, 1000], [23, 1.0, 540, 960], [29, 1.3, 300, 900]], draw(t) {
  sky('#140a22', '#2a1040'); glow(W / 2, 900, 600, 'rgba(155,107,255,.25)');
  if (t < w(23)) { perso('nouvelle', W / 2, 1520, 1.0, t, { expr: 'smug', eyeCol: '#7b4bd6', arms: 'cross' }); pill('MAYA', W / 2, 330, 90, '#7b4bd6', '#fff', { sc: popIn(w(21), t) }); return; }
  perso('pote', 300, 1500, .95, t, { expr: 'neutral', talk: .6 }); perso('nouvelle', 780, 1500, .95, t, { expr: 'neutral', flip: true, eyeCol: '#7b4bd6', look: [-1, 0] });
  smoke(300, 1000, t, w(29), 1.2); if (t > w(31)) pill('FUMÉE ROUGE = MENSONGE', W / 2, 330, 44, '#ff2a4a', '#fff', { sc: popIn(w(31), t) });
}});
// 2. SEIZE ANS SANS FUMÉE
SC.push({ i: 38, cam: [[38, 1, 540, 960], [47, 1.15, 540, 1000], [53, 1.0, 540, 900]], draw(t) {
  sky('#05070f', '#0c1022'); windowNight(160, 340, 760, 900, t, 1, 1); floor(1350, '#1a1626'); perso('nouvelle', 640, 1500, 1.0, t, { expr: 'sad', look: [0, -1], flip: true });
  if (t > w(53)) { const n = Math.floor(eOut(seg(t, w(53), w(57))) * 16); txt(n + ' ANS', W / 2, 260, 110, '#fff', { stroke: OUT, sw: 16 }); pill('0 FUMÉE', W / 2, 400, 60, '#ff2a4a', '#fff', { sc: popIn(w(58), t) }); }
  else if (t > w(47)) pill('POUVOIR INUTILE', W / 2, 260, 60, '#7b4bd6', '#fff', { sc: popIn(w(47), t) });
}});
// 3. ET PUIS TOI
SC.push({ i: 61, cam: [[61, 1, 540, 1000], [64, 1.3, 330, 1050], [68, 1.0, 540, 900], [70, 1.15, 330, 850]], draw(t) {
  lockers(t); perso('toi', 300, 1500, .92, t, { expr: 'smug', talk: t > w(64) && t < w(68) ? .8 : 0, look: [1, 0] }); perso('nouvelle', 760, 1480, .95, t, { expr: t > w(68) ? 'shock' : 'neutral', flip: true, eyeCol: '#7b4bd6', look: [-1, 0] });
  bubble('Je suis un prince.', 340, 760, 54, w(64), t, { t1: w(68), tail: -1 }); smoke(300, 1000, t, w(68), t > w(70) ? 3 : 1.5); if (t > w(70)) stamp('ÉNORME', W / 2, 400, 110, '#ff2a4a', w(70), t);
}});
// 4. FASCINÉE
SC.push({ i: 71, cam: [[71, 1, 540, 1000], [76, 1.3, 760, 980], [79, 1.05, 540, 980], [83, 1.2, 540, 940]], draw(t) {
  sky('#ffcf9a', '#f3a46b'); floor(1300, '#c8a070'); glow(900, 300, 900, 'rgba(255,200,120,.35)');
  perso('toi', 330, 1500, .92, t, { expr: 'happy', talk: t > w(79) && t < w(81) ? .7 : 0, look: [1, 0] }); perso('nouvelle', 760, 1490, .92, t, { expr: t > w(76) ? 'love' : 'smile', flip: true, eyeCol: '#7b4bd6', look: [-1, 0] });
  if (t < w(76)) { txt('ELLE NE TE', W / 2, 330, 70, '#fff', { stroke: OUT, sw: 12 }); txt('DÉNONCE PAS', W / 2, 420, 80, '#2ecc71', { stroke: OUT, sw: 14 }); }
  if (t > w(79) && t < w(83)) { bubble("J'ai 3 chats.", 330, 780, 48, w(79), t, { tail: -1 }); smoke(330, 1000, t, w(80), .8); check(760, 700, 1, false, w(81), t); }
  if (t > w(83)) { pill('LE SEUL HUMAIN', W / 2, 330, 54, '#7b4bd6', '#fff', { sc: popIn(w(84), t) }); pill('INTÉRESSANT', W / 2, 440, 66, '#ffd23f', OUT, { sc: popIn(w(89), t) }); hearts(t, w(89), 760, 1000, 5); }
}});
// 5. L'EXAMEN ANNULÉ
SC.push({ i: 91, cam: [[91, 1, 540, 1000], [95, 1.35, 330, 1050], [103, 1.0, 540, 1000], [109, 1.35, 760, 980]], draw(t) {
  classroom(t); const run = t > w(103);
  perso('prof', 820, 1450, .85, t, { expr: run ? 'neutral' : 'neutral', flip: true, arms: run ? 'shrug' : 'down' });
  if (!run) { perso('toi', 300, 1480, .9, t, { expr: 'smug', talk: t > w(95) ? .8 : 0 }); bubble("L'examen est\nANNULÉ !", 340, 760, 54, w(96), t, { tail: -1 }); if (t > w(100)) smoke(300, 1000, t, w(100), 1.3); }
  else if (t < w(109)) { for (let i = 0; i < 6; i++) { const k = t - w(103) - i * .12; if (k < 0) continue; perso(['pote', 'caissier', 'joueur2', 'joueur3', 'fille', 'pote'][i], 200 - k * 900 + i * 160, 1500, .55, t, { expr: 'happy', bob: 3, arms: 'up', flip: true }); } pill('TOUTE LA CLASSE RENTRE', W / 2, 330, 44, '#2ecc71', '#fff', { sc: popIn(w(103), t) }); }
  else { perso('nouvelle', 600, 1500, .95, t, { expr: 'laugh', tear: true, bob: 2.5, eyeCol: '#7b4bd6' }); txt('HAHAHA', 600 + Math.sin(t * 30) * 8, 700, 110, '#ffd23f', { stroke: OUT, sw: 18 }); pill('1 HEURE', 600, 470, 56, '#7b4bd6', '#fff', { sc: popIn(w(112), t) }); }
}});
// 6. LES SCIENTIFIQUES
SC.push({ i: 114, cam: [[114, 1, 540, 960], [123, 1.0, 540, 960], [127, 1.2, 540, 700], [135, 1.0, 540, 900]], draw(t) {
  sky('#0a1020', '#162040'); floor(1350, '#1e2638');
  if (t < w(123)) { sky('#1a0a04', '#3a1206'); rr(160, 300, 760, 360, 16); fillStroke('#111', 10, '#333'); rr(180, 320, 720, 70, 0); fillStroke('#e8333a', 0); txt('FLASH INFO', 540, 356, 46, '#fff'); txt('LE SOLEIL...', 540, 470, 66, '#ffd23f'); txt('SE LÈVE !', 540, 560, 66, '#fff');
    pill('UNE TRACE', W / 2, 820, 66, '#ff9f5a', OUT, { sc: popIn(w(121), t) }); return; }
  rr(100, 300, 880, 480, 16); fillStroke('#0e1a12', 10, '#2ecc71'); g.beginPath(); for (let i = 0; i <= 40; i++) { const x = 130 + i * 20.5, sp = Math.abs(i - 26) < 2 && t > w(127); g.lineTo(x, 620 - (sp ? 230 : Math.sin(i * 1.3 + t * 3) * 14)); } g.lineWidth = 8; g.strokeStyle = '#2ecc71'; g.stroke();
  txt('MENSONGES DÉTECTÉS :', 540, 360, 40, '#2ecc71', { wt: 800 }); txt(t > w(133) ? '1' : '0', 540, 440, 80, t > w(133) ? '#ff2a4a' : '#2ecc71');
  perso('prof', 300, 1500, .85, t, { expr: t > w(126) ? 'shock' : 'neutral', look: [1, -1] }); perso('juge', 780, 1500, .85, t, { expr: t > w(126) ? 'shock' : 'neutral', flip: true, look: [-1, -1] });
  if (t > w(135)) stamp('1ÈRE FOIS DE L’HISTOIRE', W / 2, 900, 56, '#ff2a4a', w(136), t);
}});
// 7. LA CHASSE AU MENTEUR
SC.push({ i: 141, cam: [[141, 1, 540, 960], [146, 1.2, 540, 900], [153, 1.0, 540, 960], [158, 1.3, 540, 800]], draw(t) {
  sky('#0d0d18', '#1a1a2a'); rr(0, 300, W, 1050, 0); fillStroke('#3a3348', 0); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect((i % 8) * 140, 300 + Math.floor(i / 8) * 210, 136, 206); }
  [[270, 640, -.06], [810, 600, .05], [540, 1050, -.02], [180, 1150, .07], [900, 1120, -.05]].forEach(([x, y, r], i) => { const s = popIn(w(142) + i * .12, t); if (s <= 0) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(s * (i === 0 ? 1 : .7), s * (i === 0 ? 1 : .7)); rr(-190, -250, 380, 500, 6); fillStroke('#f4e2c0', 6);
    txt('RECHERCHÉ', 0, -200, 54, '#e8333a'); rr(-120, -150, 240, 220, 6); fillStroke('#2a2a3a', 0); txt('?', 0, -40, 160, '#fff'); txt('LE MENTEUR', 0, 130, 48, OUT); txt('RÉCOMPENSE', 0, 190, 30, '#8a5a2a'); g.restore(); });
  glow(80, 300, 220, t % .4 < .2 ? 'rgba(255,40,40,.8)' : 'rgba(40,80,255,.8)'); glow(1000, 300, 220, t % .4 >= .2 ? 'rgba(255,40,40,.8)' : 'rgba(40,80,255,.8)');
  floor(1350, '#2a2a3a'); if (t > w(146)) pill('AUCUNE PHOTO', W / 2, 1450, 50, '#ffd23f', OUT, { sc: popIn(w(146), t) });
}});
// 8. LES INTERROGATOIRES
SC.push({ i: 160, cam: [[160, 1, 540, 960], [166, 1.0, 540, 960], [171, 1.25, 540, 900], [178, 1.0, 540, 960]], draw(t) {
  sky('#1a1d26', '#2a2f3a'); floor(1350, '#3a3f4a');
  perso('flic', 840, 1470, .9, t, { expr: 'stern' === 0 ? 'angry' : 'neutral', flip: true, arms: 'cross' });
  const q = ['pote', 'mamie', 'caissier', 'prof']; q.forEach((id, i) => { const x = 540 - i * 170 + Math.max(0, (t - w(166)) * 30) % 170 * 0; perso(id, x, 1490 - i * 10, .7 - i * .05, t, { expr: 'neutral', look: [1, 0] }); });
  if (t > w(171)) bubble('Tu connais\nle Menteur ?', 800, 720, 50, w(171), t, { tail: 1, bg: '#dfe9ff' });
  if (t > w(175)) { ['Non.', 'Non.', 'Non.'].forEach((s, i) => { if (t > w(175) + i * .35) { bubble(s, 540 - i * 170, 1000 - i * 20, 40, w(175) + i * .35, t, { tail: -1 }); check(600 - i * 170, 920, .5, true, w(175) + i * .35 + .1, t); } }); }
  if (t > w(178)) pill('IMPOSSIBLE DE MENTIR', W / 2, 320, 50, '#e8333a', '#fff', { sc: popIn(w(178), t) });
}});
// 9. TOC TOC CHEZ MAYA
SC.push({ i: 188, cam: [[188, 1, 540, 960], [191, 1.15, 760, 960], [194, 1.2, 420, 1000], [200, 1.4, 500, 900]], draw(t) {
  sky('#05070f', '#0c1022'); stars(t, 40); rr(0, 380, W, 980, 0); fillStroke('#4a3a5a', 0); rr(620, 620, 300, 720, 10); fillStroke('#6b4a33', 8); circ(880, 1000, 14); fillStroke('#ffd23f', 4); glow(770, 560, 200, 'rgba(255,220,150,.6)'); floor(1350, '#2a2438');
  if (t > w(191) && t < w(194)) { txt('TOC', 860, 760 + Math.sin(t * 30) * 6, 90, '#fff', { stroke: OUT, sw: 14 }); txt('TOC', 820, 880 + Math.cos(t * 30) * 6, 90, '#fff', { stroke: OUT, sw: 14 }); }
  perso('nouvelle', 480, 1500, .92, t, { expr: t > w(200) ? 'sad' : 'shock', look: [1, 0], sweat: t > w(200) }); perso('toi', 230, 1520, .92, t, { expr: 'shock', sweat: true, look: [1, 0] });
  if (t > w(200)) pill('ELLE NE SAIT PAS MENTIR', W / 2, 300, 46, '#e8333a', '#fff', { sc: popIn(w(200), t) });
  glow(1000, 1100, 260, t % .4 < .2 ? 'rgba(255,40,40,.7)' : 'rgba(40,80,255,.7)');
}});
// 10. « TU LE CONNAIS ? »
SC.push({ i: 209, cam: [[209, 1.1, 760, 1000], [215, 1.35, 520, 1050], [218, 1.6, 480, 1000], [223, 1.0, 540, 960]], draw(t) {
  if (t < w(223)) { lockers(t); g.save(); g.fillStyle = 'rgba(10,10,30,.55)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore();
    perso('toi', 200, 1560, .95, t, { expr: 'shock', sweat: true, look: [1, 0] }); perso('nouvelle', 520, 1540, 1.0, t, { expr: t > w(220) ? 'sad' : 'neutral', look: [-1, 0], talk: t > w(220) ? .5 : 0, eyeCol: '#7b4bd6', sweat: t > w(218) });
    perso('flic', 880, 1500, .95, t, { expr: 'neutral', flip: true, arms: 'point', look: [-1, 0] }); bubble('Tu le connais ?', 820, 720, 56, w(212), t, { tail: 1, bg: '#dfe9ff' });
    if (t > w(220)) txt('...', 520, 760, 160, '#fff', { stroke: OUT, sw: 14 }); return; }
  sky('#0a0612', '#1e1030'); const s = popIn(w(223), t); g.save(); g.translate(W / 2, 760); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#151325', 10, '#9b6bff'); txt('PARTIE 3 ?', 0, 10, 130, '#c9a8ff', { glow: '#9b6bff' }); g.restore();
  const b = popIn(w(225) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1080); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
  perso('nouvelle', 250, 1700, .8, t, { expr: 'sad', eyeCol: '#7b4bd6' }); perso('flic', 830, 1700, .8, t, { expr: 'neutral', flip: true });
}});
