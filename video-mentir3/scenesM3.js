// ================================================================ SÉRIE « MENTIR » — PARTIE 3 (FINALE)
SC.length = 0;
CHAR.mamie = { skin: SKIN.a, hair: '#d8d8d8', style: 'bun', shirt: '#c96b8a', pants: '#5a3a4a', shoe: '#5a4a5a', glasses: 1 };
CHAR.caissier = { skin: SKIN.c, hair: '#1d1d1d', style: 'cap', shirt: '#e8333a', pants: '#333', shoe: '#111', cap: '#ffd23f' };
CHAR.nouvelle = { skin: SKIN.a, hair: '#7b4bd6', style: 'long', shirt: '#1f1f2a', pants: '#2a2a3a', shoe: '#fff' };
CHAR.blouse = { ...CHAR.toi, shirt: '#f4f4f4', glasses: 1 };
function smoke(x, y, t, t0, big = 1, heartsTo = 0) { if (t < t0) return; const k = t - t0; for (let i = 0; i < 14 * big; i++) { const kk = (k * .9 + i / (14 * big)) % 1.4; if (k < i * .04) continue; const px = x + Math.sin(i * 1.7 + kk * 4) * 40 * big * kk, py = y - kk * 260 * big;
  g.save(); g.globalAlpha = clamp(1 - kk / 1.4) * .85; if (heartsTo && i % 2) { g.translate(px, py); const s = (.6 + kk) * big * .6; g.scale(s, s); heart(0, 0, 30, '#ff2a4a'); } else { circ(px, py, (18 + kk * 50) * big); g.fillStyle = i % 2 ? '#ff2a4a' : '#ff6b7a'; g.fill(); } g.restore(); } }
const ANS = [['OUI', '#2ecc71'], ['NON', '#e8333a'], ['JE SAIS PAS', '#7ac8ff'], ["C'EST LUI", '#ff9f5a'], ['PEUT-ÊTRE', '#c38bff'], ['...', '#cfd8e6']], NA = 6, TA = 0;
function ansCard(i, x, y, s, hl) { const [lab, col] = ANS[((i % NA) + NA) % NA]; g.save(); g.translate(x, y); g.scale(s, s); if (hl) glow(0, 0, 330, 'rgba(255,210,80,.6)', hl);
  rr(-135, -190, 270, 380, 30); fillStroke(lg(0, -190, 0, 190, ['#25233a', '#15131f']), 7, hl > .5 ? '#ffd23f' : '#3c3a55'); rr(-115, -170, 230, 230, 22); fillStroke(shade(col, -.45), 0);
  g.save(); g.translate(0, -55); bubble(lab.length > 4 ? '?' : lab === '...' ? '...' : '!', 0, 0, 60, -1, 1, { tail: 0, bg: col }); g.restore();
  txt('MAYA DIT', 0, 95, 24, 'rgba(255,255,255,.6)', { wt: 800, ls: 4 }); txt(lab, 0, 145, lab.length > 8 ? 32 : 42, '#fff'); g.restore(); }
function rouA(t) { const TL = we(22) + .75, D = (5 * NA + TA) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
// 0. LA ROULETTE DES RÉPONSES
SC.push({ i: 0, cam: [[0, 1, 540, 960], [19, 1.08, 540, 940], [23, 1.0, 540, 960]], draw(t) {
  sky('#0c0614', '#1a0c22'); const { p, TL } = rouA(t), landed = t >= TL, fiche = seg(t, w(23) - .1, w(23) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 3 • FINALE', W / 2, 170, 40, '#7b4bd6', '#fff'); txt('SA RÉPONSE ?', W / 2, 300, 100, '#fff', { glow: '#9b6bff', blur: 40 }); pill('ELLE NE SAIT PAS MENTIR', W / 2, 420, 36, '#e8333a', '#fff', { sc: popIn(w(4), t) }); g.restore();
  if (t < w(9)) { lockers(t); g.save(); g.fillStyle = 'rgba(10,10,30,.55)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); perso('nouvelle', 400, 1560, 1.0, t, { expr: 'sad', sweat: true, eyeCol: '#7b4bd6' }); perso('flic', 840, 1520, .95, t, { expr: 'neutral', flip: true, arms: 'point' }); bubble('Tu le connais ?', 800, 720, 56, 0, t, { tail: 1, bg: '#dfe9ff' }); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % NA) + NA) % NA;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(220,200,255,.9)', 'rgba(220,200,255,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TA; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) ansCard(ii, x, 960, .92 + .1 * near, isT ? 1 : 0); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#e8fff0'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(46,204,113,.45)', fiche); ansCard(TA, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1);
    txt('OUI.', W / 2, 220, 150, '#2ecc71', { stroke: OUT, sw: 18, glow: '#2ecc71' }); }
}});
// 1. TU PARLES AVANT ELLE
SC.push({ i: 24, cam: [[24, 1.3, 480, 1000], [28, 1.0, 540, 1000], [33, 1.35, 260, 1050], [43, 1.2, 400, 1000]], draw(t) {
  lockers(t); g.save(); g.fillStyle = 'rgba(10,10,30,.55)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore();
  perso('toi', 220, 1560, .95, t, { expr: t > w(28) ? 'smug' : 'shock', talk: t > w(33) && t < we(46) ? .8 : 0, look: [1, 0], arms: t > w(30) ? 'point' : 'down' });
  perso('nouvelle', 520, 1540, 1.0, t, { expr: t > w(28) ? 'shock' : 'sad', look: [-1, 0], eyeCol: '#7b4bd6', talk: t < w(28) ? .3 : 0 }); perso('flic', 880, 1500, .95, t, { expr: 'neutral', flip: true, look: [-1, 0] });
  if (t < w(28)) bubble('Ou...', 540, 900, 60, w(24), t, { tail: 0 });
  bubble("Elle ne connaît pas\nle Menteur.\nEt moi non plus.", 400, 700, 50, w(37), t, { tail: -1 });
}});
// 2. FUMÉE ROUGE — LE POLICIER TE CROIT
SC.push({ i: 47, cam: [[47, 1.3, 300, 1000], [49, 1.4, 520, 980], [52, 1.2, 760, 980], [58, 1.0, 540, 1000]], draw(t) {
  lockers(t); g.save(); g.fillStyle = 'rgba(10,10,30,.4)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); const leave = seg(t, w(60), w(62) + .5);
  perso('toi', 220, 1560, .95, t, { expr: 'smug', look: [1, 0] }); smoke(220, 1000, t, w(47), 1.6);
  perso('nouvelle', 520, 1540, 1.0, t, { expr: t > w(49) ? 'smile' : 'shock', look: [-1, 0], eyeCol: '#7b4bd6' }); if (t > w(49) && t < w(52)) { glow(480, 1080, 60, 'rgba(170,120,255,1)'); glow(560, 1080, 60, 'rgba(170,120,255,1)'); }
  perso('flic', 880 + leave * 500, 1500, .95, t, { expr: t > w(55) ? 'smile' : 'neutral', flip: leave === 0, look: [-1, 0], bob: leave > 0 ? 1.2 : 0 });
  if (t > w(52) && t < w(55)) txt('IL NE VOIT RIEN', 760, 640, 60, '#fff', { stroke: OUT, sw: 12 }); if (t > w(58) && t < w(60)) bubble('Pardon !', 860, 760, 56, w(58), t, { tail: 1, bg: '#dfe9ff' });
}});
// 3. LA CHASSE CONTINUE
SC.push({ i: 63, cam: [[63, 1, 540, 960], [67, 1.1, 540, 900], [72, 1.0, 540, 960], [75, 1.3, 300, 1050]], draw(t) {
  sky('#1a1d26', '#2a2f3a'); floor(1350, '#3a3f4a'); const n = Math.floor(eOut(seg(t, w(67), w(71) + .4)) * 4800000);
  txt(n.toLocaleString('fr-FR').replace(/ /g, ' '), W / 2, 300, 96, '#fff', { stroke: OUT, sw: 14 }); txt('INTERROGATOIRES / JOUR', W / 2, 400, 42, '#7ac8ff', { wt: 800 });
  for (let i = 0; i < 9; i++) perso(['pote', 'mamie', 'caissier', 'prof', 'joueur1', 'joueur2', 'joueur3', 'fille', 'pote'][i], 130 + i * 110 - ((t * 120) % 110), 1430 + (i % 2) * 30, .45, t, { expr: 'neutral', look: [1, 0] });
  perso('flic', 960, 1460, .7, t, { expr: 'neutral', flip: true, arms: 'cross' });
  if (t > w(72)) { pill('TÔT OU TARD...', W / 2, 560, 54, '#e8333a', '#fff', { sc: popIn(w(72), t) }); if (t > w(76)) bubble('Oui...', 300, 1080, 54, w(76), t, { tail: -1, bg: '#ffd6d6' }); }
}});
// 4. LE DERNIER MENSONGE
SC.push({ i: 78, cam: [[78, 1, 540, 1000], [82, 1.25, 540, 1050], [85, 1.0, 540, 900]], draw(t) {
  sky('#06050c', '#120f22'); windowNight(560, 380, 380, 420, t); floor(1350, '#1a1626'); lampLight(300, 1000, 500, 'rgba(255,200,120,.55)');
  rr(100, 1180, 600, 40, 10); fillStroke('#6b4a33', 6); rr(140, 1220, 30, 160, 6); fillStroke('#6b4a33', 5); rr(630, 1220, 30, 160, 6); fillStroke('#6b4a33', 5); rr(220, 1140, 320, 50, 4); fillStroke('#fdf6e3', 4);
  perso('toi', 380, 1180, .7, t, { expr: 'smug', arms: 'write', look: [0, 1] });
  if (t > w(85)) { txt('LE DERNIER', W / 2, 330, 96, '#ff9f5a', { stroke: OUT, sw: 16, glow: '#ff6a00' }); txt('MENSONGE', W / 2, 440, 110, '#fff', { stroke: OUT, sw: 16 }); }
}});
// 5. EN DIRECT À LA TÉLÉ
SC.push({ i: 87, cam: [[87, 1, 540, 960], [93, 1.3, 400, 1000], [101, 1.0, 540, 960], [109, 1.15, 540, 900], [116, 1.35, 400, 1000], [122, 1.1, 540, 960]], draw(t) {
  sky('#0a0a14', '#1a1a2e'); for (let i = 0; i < 6; i++) { glow(100 + i * 180, 200, 220, 'rgba(120,170,255,.35)'); rr(80 + i * 180, 170, 40, 40, 6); fillStroke('#333', 4); }
  rr(80, 300, 920, 500, 20); fillStroke(lg(0, 300, 0, 800, ['#1f3a8a', '#0b1a4a']), 10, '#2a3a6a'); txt('JOURNAL', 540, 420, 90, '#fff', { glow: '#7ac8ff' }); txt('NATIONAL', 540, 520, 60, '#7ac8ff', { ls: 12 });
  floor(1350, '#22223a'); rr(560, 1150, 440, 200, 14); fillStroke('#e9e1cf', 8);
  perso(t > w(95) ? 'blouse' : 'toi', 360, 1500, .95, t, { expr: 'smug', talk: (t > w(93) && t < w(100)) || (t > w(116) && t < w(126)) ? .8 : 0, look: [1, 0] });
  if (t > w(93) && t < w(101)) { bubble('Je suis le chef\ndes scientifiques.', 380, 760, 50, w(94), t, { tail: -1 }); smoke(360, 1000, t, w(97), 1); }
  if (t > w(104)) { rr(520, 1000, 24, 160, 8); fillStroke('#333', 5); circ(532, 990, 30); fillStroke('#555', 5); }
  if (t > w(109)) { g.save(); rr(60, 860, 280, 80, 14); fillStroke('#e8333a', 6); txt('● EN DIRECT', 200, 902, 40, '#fff'); g.restore(); const n = Math.floor(eOut(seg(t, w(111), w(114))) * 8e9); pill(n.toLocaleString('fr-FR').replace(/ /g, ' ') + ' 👁', 700, 900, 34, '#111', '#fff'); }
  if (t > w(116)) { bubble("Le Menteur\nn'existe plus.", 420, 700, 60, w(117), t, { tail: -1, bg: '#fff6d0' }); smoke(360, 1000, t, w(120), 2.2); if (t > w(125)) stamp('POUR TOUJOURS', W / 2, 1180, 76, '#ffd23f', w(125), t); }
}});
// 6. LE MONDE RESPIRE
SC.push({ i: 127, cam: [[127, 1, 540, 960], [133, 1.1, 540, 900], [136, 1.0, 540, 960], [139, 1.15, 540, 1000]], draw(t) {
  if (t < w(136)) { sky('#04060f', '#0e1638'); stars(t, 80); globe(W / 2, 1050, 400, t); for (let i = 0; i < 16; i++) { const a = -Math.PI + (i / 15) * Math.PI; check(W / 2 + Math.cos(a) * 480, 1050 + Math.sin(a) * 480, .6, true, w(129) + i * .05, t); }
    if (t > w(133)) txt('CHASSE TERMINÉE', W / 2, 330, 84, '#2ecc71', { stroke: OUT, sw: 14 }); return; }
  sky('#ffcf9a', '#f3a46b'); rr(0, 300, W, 1050, 0); fillStroke('#c9a07a', 0);
  [[270, 600, -.06], [810, 560, .05], [540, 900, -.02]].forEach(([x, y, r], i) => { const k = seg(t, w(137) + i * .15, w(137) + i * .15 + .9); g.save(); g.translate(x + k * 80 * (i - 1), y + k * k * 1400); g.rotate(r + k * 2 * (i % 2 ? 1 : -1)); g.scale(.7, .7); rr(-190, -250, 380, 500, 6); fillStroke('#f4e2c0', 6); txt('RECHERCHÉ', 0, -200, 54, '#e8333a'); txt('?', 0, -40, 160, OUT); g.restore(); });
  floor(1350, '#c8a070'); ['pote', 'mamie', 'caissier', 'prof'].forEach((id, i) => perso(id, 170 + i * 250, 1500, .6, t, { expr: t > w(139) ? 'happy' : 'smile', arms: t > w(139) ? 'up' : 'down', bob: t > w(139) ? 1.5 : 0 }));
}});
// 7. LA PROMESSE
SC.push({ i: 142, cam: [[142, 1.2, 540, 1000], [145, 1.0, 540, 960]], draw(t) {
  sky('#1a1030', '#2a1a4a'); glow(W / 2, 900, 600, 'rgba(255,230,160,.35)'); perso('toi', W / 2, 1560, 1.05, t, { expr: 'smile', arms: 'hug', look: [0, -.5] });
  if (t > w(145)) { const s = popIn(w(145), t); g.save(); g.translate(W / 2, 520); g.scale(s, s); rr(-400, -150, 800, 300, 30); fillStroke('#fdf6e3', 10); txt('PROMESSE', 0, -80, 56, '#e8333a'); txt('PLUS JAMAIS', 0, 0, 70, OUT); txt('UN SEUL MENSONGE', 0, 80, 54, OUT); g.restore(); }
}});
// 8. ZÉRO — LA MEILLEURE NOTE
SC.push({ i: 153, cam: [[153, 1, 540, 1000], [155, 1.35, 330, 1050], [167, 1.3, 700, 900], [168, 1.0, 540, 960]], draw(t) {
  classroom(t); perso('prof', 760, 1450, .95, t, { expr: t > w(167) ? 'smile' : 'neutral', flip: true, look: [-1, 0], arms: t > w(167) ? 'point' : 'down' });
  perso('toi', 300, 1480, .9, t, { expr: t > w(168) ? 'happy' : 'neutral', talk: t > w(155) && t < w(167) ? .8 : 0, look: [1, 0], arms: t > w(170) ? 'up' : 'down', bob: t > w(170) ? 1.5 : 0 });
  bubble("J'ai pas fait\nmon devoir.", 340, 780, 52, w(156), t, { t1: w(167), tail: -1 }); if (t > w(160)) check(560, 680, 1, true, w(162), t);
  if (t > w(167)) stamp('0/20', 640, 560, 140, '#e8333a', w(167), t, -.1); if (t > w(170)) pill('LA MEILLEURE NOTE DE TA VIE', W / 2, 820, 40, '#2ecc71', '#fff', { sc: popIn(w(170), t) });
}});
// 9. « TU ES AMOUREUX DE MOI ? »
SC.push({ i: 176, cam: [[176, 1, 540, 1000], [180, 1.1, 540, 1000], [182, 1.35, 740, 1000], [190, 1.4, 320, 1050]], draw(t) {
  sky('#ff8a5a', '#ffb070', '#ffd9a0'); glow(W / 2, 1100, 600, 'rgba(255,220,140,.8)'); circ(W / 2, 1150, 140); g.fillStyle = '#ffd23f'; g.fill(); rr(-50, 1150, 1180, 900, 0); fillStroke('#3a2a4a', 0);
  for (let i = 0; i < 8; i++) { rr(i * 140 - 20, 1000 - hash(i) * 300, 120, 400, 4); fillStroke('#4a3050', 0); }
  perso('toi', 330, 1560, .95, t, { expr: t > w(191) ? 'smug' : 'shock', look: [1, 0], talk: t > w(191) && t < we(192) ? .6 : 0, blush: t > w(185) });
  perso('nouvelle', 750, 1550, .95, t, { expr: 'smile', flip: true, look: [-1, 0], talk: t > w(184) && t < we(189) ? .6 : 0, eyeCol: '#7b4bd6' });
  bubble('Tu es amoureux\nde moi ?', 740, 760, 54, w(184), t, { tail: 1, bg: '#efe6ff', t1: w(190) }); if (t > w(191)) bubble('Non.', 340, 820, 70, w(192), t, { tail: -1 });
}});
// 10. FUMÉE ROUGE — FIN
SC.push({ i: 193, cam: [[193, 1.2, 330, 1050], [195, 1.0, 540, 960], [196, 1.4, 750, 1000], [198, 1.0, 540, 960], [204, 1.0, 540, 960]], draw(t) {
  sky('#ff8a5a', '#ffb070', '#ffd9a0'); glow(W / 2, 1100, 600, 'rgba(255,220,140,.8)'); circ(W / 2, 1150, 140); g.fillStyle = '#ffd23f'; g.fill(); rr(-50, 1150, 1180, 900, 0); fillStroke('#3a2a4a', 0);
  perso('toi', 330, 1560, .95, t, { expr: 'smile', look: [1, 0], blush: true }); smoke(330, 1000, t, w(193), t > w(195) ? 3 : 1.6, t > w(198) ? 1 : 0);
  perso('nouvelle', 750, 1550, .95, t, { expr: t > w(196) ? 'love' : 'smile', flip: true, look: [-1, 0], eyeCol: '#7b4bd6' }); if (t > w(196)) hearts(t, w(196), 750, 1000, 8);
  if (t > w(195) && t < w(198)) stamp('ÉNORME', W / 2, 380, 110, '#ff2a4a', w(195), t);
  if (t > w(198) && t < w(204)) { g.save(); g.fillStyle = 'rgba(20,10,30,.45)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); txt('TON DERNIER', W / 2, 300, 80, '#fff', { stroke: OUT, sw: 14 }); txt('MENSONGE', W / 2, 400, 100, '#ff4d6d', { stroke: OUT, sw: 16 }); txt('DISAIT LA VÉRITÉ', W / 2, 510, 70, '#ffd23f', { stroke: OUT, sw: 14 }); }
  if (t > w(204)) { g.save(); g.fillStyle = 'rgba(10,5,20,.6)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); txt('FIN', W / 2, 760, 260 * popIn(w(204), t), '#fff', { glow: '#ff6b8a', blur: 50 }); }
}});
