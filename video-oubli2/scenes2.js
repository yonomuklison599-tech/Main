// ================================================================ PARTIE 2
SC.length = 0;
CHAR.lina = CHAR.fille; CHAR.gamin = { skin: SKIN.a, hair: '#e0b040', style: 'messy', shirt: '#7ac8ff', pants: '#7ac8ff', shoe: '#fff' };
function roul2(t) { const TL = we(22) + .75, D = (3 * POW.length + TGT) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
window.roulettePos = roul2;
function glitch(a) { if (a <= 0) return; const img = g.getImageData(0, 0, W, H); for (let i = 0; i < 10; i++) { const y = Math.floor(hash(i + Math.floor(a * 50)) * H), h = 20 + hash(i * 3) * 80, dx = (hash(i + 7 + a) - .5) * 160 * a; g.putImageData(img, dx, 0, 0, y, W, h); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25 * a; g.fillStyle = '#ff0040'; g.fillRect(0, 0, W, H); g.restore(); }
let GL = 0;
// 0. ROULETTE POUR ELLE
SC.push({ i: 0, cam: [[0, 1, 540, 960], [19, 1.08, 540, 940], [23, 1.0, 540, 960], [25, 1.12, 540, 900]], draw(t) {
  sky('#0d0508', '#1a0c14'); const { p, TL } = roul2(t), landed = t >= TL, fiche = seg(t, w(23) - .1, w(23) + .45);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 2', W / 2, 170, 40, '#e8333a', '#fff'); txt('ET ELLE,', W / 2, 290, 96, '#fff', { glow: '#ff6b8a', blur: 40 }); txt('QUEL POUVOIR ?', W / 2, 390, 70, '#ffd23f', { glow: '#ffd23f', blur: 30, wt: 800 }); g.restore();
  if (t < w(7)) { const s = popIn(0, t); perso('lina', W / 2, 1500, 1.0 * s, t, { expr: 'smug', eyeCol: '#d49a00' }); glow(W / 2 - 50, 1030, 70 * s, 'rgba(255,220,60,1)'); glow(W / 2 + 50, 1030, 70 * s, 'rgba(255,220,60,1)'); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(255,200,220,.9)', 'rgba(255,200,220,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ((idx % 10) + 10) % 10 === TGT; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) card(idx, x, 960, .92 + .1 * near, isT ? 1 : 0, t); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#fff6d0'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); const s = lerp(.92, 1.45, eOut(fiche));
    glow(W / 2, 860, 600, 'rgba(255,210,60,.45)', fiche); card(TGT, W / 2 - 150 * eOut(fiche), 860, s, 1, t); if (fiche > .5) card(TGT, W / 2 + 150, 860, s * popIn(w(25), t), 1, t);
    txt('LE MÊME', W / 2, 220, 100, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' }); pill('× 2', W / 2, 1250, 70, '#e8333a', '#fff', { sc: popIn(w(25), t) }); }
}});
// 1. LINA, 1000 NUITS
SC.push({ i: 30, cam: [[30, 1.2, 540, 1000], [33, 1.0, 540, 960], [40, 1.05, 540, 900], [47, 1.4, 540, 1050]], draw(t) {
  sky('#0a0a1e', '#1d1240'); stars(t, 100); glow(W / 2, 1000, 600, 'rgba(255,110,160,.25)');
  perso('lina', W / 2, 1520, 1.0, t, { expr: 'smug', eyeCol: t > w(47) ? '#d49a00' : OUT, arms: 'cross' });
  if (t > w(47)) { glow(W / 2, 1000, 500, 'rgba(255,210,60,.6)'); glow(W / 2 - 40, 1050, 60, 'rgba(255,220,60,1)'); glow(W / 2 + 40, 1050, 60, 'rgba(255,220,60,1)'); }
  pill('LINA', W / 2, 330, 90, '#ff6b8a', '#fff', { sc: popIn(w(31), t) });
  if (t > w(37) && t < w(40)) pill('DEPUIS 3 ANS', W / 2, 470, 54, '#ffd23f', OUT, { sc: popIn(w(37), t) });
  if (t > w(40)) { const n = Math.floor(eOut(seg(t, w(40), w(46))) * 1000); txt(n + ' NUITS', W / 2, 480, 100, '#fff', { stroke: OUT, sw: 16, glow: '#7ac8ff' });
    for (let i = 0; i < Math.min(40, n / 25); i++) { const x = 80 + (i % 10) * 102, y = 620 + Math.floor(i / 10) * 70; circ(x, y, 22); g.fillStyle = '#f4f1de'; g.fill(); circ(x + 9, y - 6, 18); g.fillStyle = '#1d1240'; g.fill(); } }
}});
// 2. ELLE AVANT TOI : poker / patron / milliardaire
SC.push({ i: 49, cam: [[49, 1, 540, 980], [51, 1.25, 540, 900], [56, 1.0, 540, 1000], [58, 1.2, 600, 950], [63, 1.0, 540, 1000], [70, 1.35, 700, 900]], draw(t) {
  const ph = t < w(56) ? 0 : t < w(63) ? 1 : 2;
  if (ph === 0) { sky('#08080c', '#141018'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, 260, 0, 1300, ['rgba(255,220,150,.35)', 'rgba(255,220,150,0)']); g.beginPath(); g.moveTo(440, 260); g.lineTo(640, 260); g.lineTo(1080, 1300); g.lineTo(0, 1300); g.closePath(); g.fill(); g.restore();
    perso('joueur1', 230, 1240, .72, t, { expr: 'sad' }); perso('lina', 540, 1240, .72, t, { expr: 'smug', arms: 'up' }); perso('joueur2', 850, 1240, .72, t, { expr: 'sad', sweat: true });
    g.beginPath(); g.ellipse(W / 2, 1270, 620, 230, 0, 0, Math.PI * 2); fillStroke('#6b3f22', 10); g.beginPath(); g.ellipse(W / 2, 1255, 560, 190, 0, 0, Math.PI * 2); fillStroke('#2f8a4a', 0);
    for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(W / 2 + ((i % 4) - 1.5) * 70, 1300 - Math.floor(i / 4) * 16, 34, 12, 0, 0, Math.PI * 2); fillStroke(['#e8333a', '#2a64d8', '#111', '#ffd23f'][i % 4], 4); }
    stamp('AVANT TOI', W / 2, 520, 96, '#ff6b8a', w(53), t); }
  else if (ph === 1) { office(t); perso('patron', 690, 1300, .92, t, { expr: 'shock', flip: true, arms: 'shrug' }); desk(); perso('lina', 280, 1560, 1.0, t, { expr: 'smug', arms: 'hips', look: [1, -.3] });
    g.save(); g.translate(W / 2, 470); rr(-260, -90, 520, 180, 26); fillStroke('#fff', 8); txt('12 000 €', 0, 4, 96, OUT); g.restore(); check(W / 2 + 250, 400, 1.1, true, w(59), t); stamp('AVANT TOI', W / 2, 680, 96, '#ff6b8a', w(60), t); }
  else { office(t, 1); perso('milli', 640, 1450, .95, t, { expr: t > w(75) ? 'happy' : 'neutral', flip: true, arms: 'write' });
    perso('lina', 900, 1430, .8, t, { expr: 'smug', flip: true, look: [-1, 0], talk: t > w(70) ? .5 : 0 }); if (t > w(70)) bubble('signe...', 860, 760, 50, w(70), t, { tail: -1, bg: '#ffe0ea' });
    perso('toi', 260, 1500, .92, t, { expr: 'happy', arms: 'point' }); if (t > w(77)) stamp('C’ÉTAIT ELLE', W / 2, 520, 90, '#ff6b8a', w(77), t); }
}});
// 3. LA MARIONNETTE
SC.push({ i: 78, cam: [[78, 1, 540, 1000], [84, 1.0, 540, 800], [87, 1.25, 540, 1100]], draw(t) {
  sky('#140a1a', '#2a0f2a'); glow(W / 2, 400, 700, 'rgba(255,90,140,.3)');
  g.save(); g.translate(W / 2, 330); g.scale(1.6, 1.6); circ(0, 0, 112); fillStroke(CHAR.lina.skin); hairBack(CHAR.lina); face(CHAR.lina, t, { expr: 'smug', look: [0, 1] }); hairFront(CHAR.lina); g.restore();
  const sw = Math.sin(t * 2.5) * .15, hy = 620; const hands = [[W / 2 - 300, hy + Math.sin(t * 3) * 20], [W / 2 + 300, hy - Math.sin(t * 3) * 20]];
  hands.forEach(([x, y]) => { circ(x, y, 46); fillStroke(CHAR.lina.skin); rr(x - 110, y - 8, 220, 16, 8); fillStroke('#8a5a2a', 5); });
  const tx = W / 2, ty = 1500; perso('toi', tx, ty, .95, t, { expr: t > w(84) ? 'shock' : 'happy', arms: t % 1 < .5 ? 'up' : 'wave', tilt: sw, bob: 1 });
  g.strokeStyle = 'rgba(240,240,255,.8)'; g.lineWidth = 3; [[-300, -160, 1040], [-300, -90, 1240], [300, 160, 1040], [300, 90, 1240]].forEach(([hx, bx, by]) => { g.beginPath(); g.moveTo(W / 2 + hx + (hx < 0 ? -90 : 90), hands[hx < 0 ? 0 : 1][1]); g.lineTo(tx + bx, by); g.stroke(); });
  if (t > w(87)) txt('SON JEU', W / 2, 860, 110, '#ff6b8a', { stroke: OUT, sw: 16 });
}});
// 4. ELLE SAIT TOUT DE TOI
SC.push({ i: 91, cam: [[91, 1, 540, 960], [97, 1.2, 540, 820], [101, 1.0, 540, 960], [108, 1.1, 540, 960], [112, 1.0, 540, 960]], draw(t) {
  sky('#0b1020', '#16223f'); dust(t, '#7ac8ff', 30, .3);
  if (t < w(112)) { perso('lina', 860, 1700, .75, t, { expr: 'smug', flip: true, arms: 'cross' });
    if (t < w(101)) { g.save(); g.translate(W / 2 - 60, 900); rr(-230, -440, 460, 880, 60); fillStroke('#111', 10, '#333'); rr(-205, -410, 410, 820, 40); fillStroke(lg(0, -410, 0, 410, ['#3a2a7a', '#7a3a8a']), 0); txt('CODE', 0, -300, 44, '#fff');
      const code = '4832'; for (let i = 0; i < 4; i++) { circ(-105 + i * 70, -200, 18); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); if (t > w(98) + i * .15) { g.fillStyle = '#fff'; g.fill(); txt(code[i], -105 + i * 70, -130, 56, '#ffd23f'); } } if (t > w(99) + .4) txt('DÉVERROUILLÉ', 0, 60, 46, '#2ecc71'); g.restore(); }
    else if (t < w(108)) { g.save(); g.translate(W / 2 - 60, 880); rr(-330, -330, 660, 660, 30); fillStroke('#fff', 8); txt('HISTORIQUE  •  2:07', 0, -270, 38, '#888', { wt: 800 }); rr(-300, -230, 600, 60, 30); fillStroke('#eee', 3, '#ccc');
      ['comment parler aux filles', 'est-ce normal de transpirer', 'phrase de drague qui marche', 'pourquoi je suis seul'].forEach((s, i) => { if (t > w(102) + i * .25) txt('🔍 ' + s, -290, -100 + i * 100, 36, OUT, { align: 'left', wt: 800 }); }); g.restore(); }
    else { g.save(); g.translate(W / 2 - 60, 880); rr(-330, -360, 660, 720, 16); fillStroke('#fdf6e3', 8); txt('TES 8 PHRASES', 0, -300, 46, '#e8333a'); LINES.concat(['Tu viens souvent ?', 'Salut bébé']).slice(0, 8).forEach((s, i) => { if (t > w(108) + i * .1) { txt(s, -280, -220 + i * 72, 36, OUT, { align: 'left', wt: 800 }); g.fillStyle = '#e8333a'; g.fillRect(-290, -224 + i * 72, 520, 6); } }); g.restore(); } }
  else { g.save(); g.translate(W / 2, 900); g.rotate(-.04); rr(-340, -300, 680, 560, 20); fillStroke('#e0b76a', 8, '#7a5a2a'); rr(-340, -360, 260, 80, 16); fillStroke('#e0b76a', 8, '#7a5a2a'); txt('DOSSIER : LINA', 0, -200, 54, OUT); txt('???', 0, 20, 200, '#7a5a2a'); g.restore(); stamp('VIDE', W / 2, 1200, 110, '#e8333a', w(115), t); }
}});
// 5. LE DEAL
SC.push({ i: 118, cam: [[118, 1, 540, 1000], [121, 1.3, 540, 980], [124, 1.0, 540, 960], [131, 1.15, 540, 900], [139, 1.0, 540, 960], [143, 1.1, 540, 900]], draw(t) {
  sky('#140b24', '#2a1640'); glow(W / 2, 700, 700, 'rgba(255,210,60,.2)');
  if (t < w(139)) { perso('toi', 330, 1500, .95, t, { expr: 'smug', arms: t > w(122) ? 'point' : 'down', look: [1, 0] }); perso('lina', 750, 1490, .95, t, { expr: 'smug', flip: true, arms: t > w(122) ? 'point' : 'cross', look: [-1, 0], talk: t > w(119) && t < w(130) ? .6 : 0 });
    if (t > w(122)) { const s = popIn(w(122), t); g.save(); g.translate(540, 1080); g.scale(s, s); glow(0, 0, 200, 'rgba(255,210,60,.9)'); txt('DEAL', 0, -170, 90, '#ffd23f', { stroke: OUT, sw: 14 }); g.restore(); }
    if (t > w(131)) pill('ELLE : LES GENS', 750, 520, 44, '#ff6b8a', '#fff', { sc: popIn(w(131), t) }); if (t > w(135)) pill("TOI : L'ARGENT", 330, 640, 44, '#ffd23f', OUT, { sc: popIn(w(135), t) }); }
  else if (t < w(143)) { const a = t < w(141); g.save(); g.translate(W / 2, 900); const s = popIn(a ? w(139) : w(141), t); g.scale(s, s);
    if (a) { rr(-380, -260, 760, 520, 20); fillStroke('#0e1a12', 8, '#2ecc71'); g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(-340 + i * 57, 180 - i * i * 2.6 + Math.sin(i * 3) * 30); g.lineWidth = 12; g.strokeStyle = '#2ecc71'; g.stroke(); txt('BOURSE', 0, -200, 54, '#2ecc71'); }
    else { rr(-220, -120, 440, 380, 20); fillStroke('#e9eef7', 8); rr(-120, -150, 240, 30, 10); fillStroke('#333', 0); txt('ÉLECTIONS', 0, -260, 60, '#fff', { stroke: OUT, sw: 12 }); g.save(); g.translate(0, -180 - (t * 300 % 120)); rr(-90, -60, 180, 120, 6); fillStroke('#fff', 5); txt('✔', 0, 4, 60, '#2a64d8'); g.restore(); } g.restore(); }
  else { globe(W / 2, 1000, 400, t); const k = seg(t, w(146), w(148)); g.save(); g.translate(W / 2 + 300 - k * 600, 820 + Math.sin(k * 30) * 30); g.rotate(.7); rr(-20, -160, 40, 260, 10); fillStroke('#ffd23f', 6); g.beginPath(); g.moveTo(-20, 100); g.lineTo(20, 100); g.lineTo(0, 150); g.closePath(); fillStroke('#333', 5); g.restore();
    txt('RÉÉCRIT', W / 2, 360, 100, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' }); txt('CHAQUE NUIT', W / 2, 460, 60, '#fff', { stroke: OUT, sw: 12 }); }
}});
// 6. UN MOIS INCROYABLE
SC.push({ i: 149, cam: [[149, 1, 540, 960], [151, 1.1, 540, 900], [157, 1.0, 540, 960], [163, 1.3, 540, 1000], [170, 1.0, 540, 960]], draw(t) {
  sky('#0a0f2e', '#3a2a6a', '#ff8a5a'); stars(t, 80, .7);
  g.save(); g.translate(W / 2, 1150); g.fillStyle = '#1a1424'; g.beginPath(); g.moveTo(-260, 0); g.quadraticCurveTo(-60, -300, -20, -900); g.lineTo(20, -900); g.quadraticCurveTo(60, -300, 260, 0); g.closePath(); g.fill(); g.fillStyle = '#ffd27a'; for (let i = 0; i < 40; i++) { const y = -hash(i) * 860, x = (hash(i + 1) - .5) * (260 - (-y) / 3.6) * 1.6; circ(x, y, 4 + (t * 5 + i) % 3); g.fill(); } g.restore();
  rr(240, 1260, 600, 30, 10); fillStroke('#f4efe6', 6); for (const x of [420, 660]) { rr(x - 8, 1180, 16, 80, 4); fillStroke('#fff', 4); glow(x, 1170, 60, 'rgba(255,200,90,1)'); }
  perso('toi', 330, 1560, .9, t, { expr: 'happy', arms: t > w(163) ? 'wave' : 'down', talk: t > w(163) && t < w(169) ? .8 : 0 }); perso('lina', 760, 1560, .9, t, { expr: 'happy', flip: true, talk: t > w(165) && t < w(169) ? .8 : 0 });
  pill('1 MOIS', W / 2, 300, 70, '#ffd23f', OUT, { sc: popIn(w(152), t) });
  if (t > w(163) && t < w(170)) { bubble('Ta coupe ? Horrible.', 330, 900, 44, w(164), t, { tail: -1 }); bubble('Ton parfum ? Pire.', 760, 760, 44, w(166), t, { tail: 1 }); }
  if (t > w(170)) { moneyRain(t, w(170), 12); } midnight(w(171), t);
}});
// 7. LA FENÊTRE
SC.push({ i: 174, cam: [[174, 1, 540, 960], [179, 1.15, 540, 900], [185, 1.4, 640, 900], [190, 1.0, 540, 960]], draw(t) {
  sky('#05070f', '#0c1022'); windowNight(160, 340, 760, 900, t, 1, 0); floor(1350, '#1a1626');
  perso('lina', 640, 1500, 1.0, t, { expr: 'sad', look: [0, -1], flip: true });
  const n = t > w(190) ? 1 + Math.floor((t - w(190)) / .35) : 1; digital('23:59', W / 2, 220, 90, '#ff4d4d'); if (t > w(190)) pill('NUIT ' + Math.min(n, 9), W / 2, 360, 44, '#7ac8ff', OUT, { sc: popIn(w(190) + (n - 1) * .35, t) });
  if (t > w(176)) { const s = popIn(w(176), t); g.save(); g.translate(560, 700); g.scale(s, s); circ(0, 0, 120); g.lineWidth = 12; g.strokeStyle = '#ffd23f'; g.stroke(); g.rotate(.8); rr(80, -16, 120, 32, 14); fillStroke('#ffd23f', 0); g.restore(); }
}});
// 8. LE PETIT GARÇON ET LES POST-IT
SC.push({ i: 193, cam: [[193, 1, 540, 960], [198, 1.0, 540, 900], [200, 1.35, 600, 800], [204, 1.6, 600, 760], [209, 1.0, 540, 900], [216, 1.5, 540, 880]], draw(t) {
  sky('#04050c', '#0d1228'); stars(t, 60);
  if (t < w(209)) { rr(160, 300, 760, 1000, 0); fillStroke('#2a2438', 0); rr(330, 450, 520, 560, 10); fillStroke('#3a2a22', 10); g.save(); rr(345, 465, 490, 530, 6); g.clip(); g.fillStyle = '#ffe9b8'; g.fillRect(345, 465, 490, 530);
      for (let i = 0; i < Math.floor(seg(t, w(198), w(208)) * 30); i++) { g.save(); g.translate(360 + hash(i) * 460, 480 + hash(i + 3) * 500); g.rotate((hash(i + 5) - .5) * .5); rr(-30, -30, 60, 60, 3); fillStroke('#ffd23f', 3); g.restore(); }
      perso('gamin', 600, 1060, .55, t, { expr: 'blank', arms: 'up' }); g.restore();
    perso('toi', 200, 1600, .9, t, { expr: 'shock', look: [1, -1], sweat: true }); perso('lina', 900, 1600, .85, t, { expr: 'sad', flip: true, look: [-1, -1] }); }
  else { g.fillStyle = '#ffe9b8'; g.fillRect(-W, -H, 3 * W, 3 * H);
    for (let i = 0; i < 90; i++) { const sc = popIn(w(209) + hash(i) * 1.2, t, .2); if (sc <= 0) continue; g.save(); g.translate(40 + (i % 9) * 125 + hash(i) * 30, 120 + Math.floor(i / 9) * 175 + hash(i + 2) * 30); g.rotate((hash(i + 5) - .5) * .4); g.scale(sc, sc); rr(-62, -62, 124, 124, 4); fillStroke(['#ffd23f', '#ffe066', '#fff07a'][i % 3], 4); txt('SOUVIENS', 0, -12, 18, OUT); txt('-TOI', 0, 14, 18, OUT); g.restore(); }
    if (t > w(216)) { g.save(); g.translate(W / 2, 880); g.rotate(-.05); g.scale(popIn(w(216), t), popIn(w(216), t)); rr(-330, -200, 660, 400, 8); fillStroke('#ffd23f', 10); txt('SOUVIENS-', 0, -50, 100, OUT); txt('TOI', 0, 70, 120, '#e8333a'); g.restore(); } }
}});
// 9. TROIS
SC.push({ i: 217, cam: [[217, 1.3, 540, 1050], [224, 1.0, 540, 960], [231, 1.1, 540, 900], [235, 1.3, 760, 900]], draw(t) {
  sky('#0b0606', '#1e0a0a');
  if (t < w(224)) { perso('lina', W / 2, 1650, 1.2, t, { expr: 'shock', sweat: true }); g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = seg(t, w(218), w(220)) * .8; g.fillStyle = '#888'; g.fillRect(0, 0, W, H); g.restore(); return; }
  const three = t > w(231); [[-1, 300, 'SE SOUVENIR'], [0, 540, 'SE SOUVENIR']].forEach(([_, x]) => card(TGT, three ? x : x + 120, 900, 1.0, 1, t));
  if (three) { const s = popIn(w(233), t); g.save(); g.translate(800, 900); g.scale(s, s); glow(0, 0, 350, 'rgba(255,0,60,.8)'); rr(-135, -190, 270, 380, 30); fillStroke('#1a0508', 8, '#ff2a4a'); txt('?', 0, -50, 180, '#ff2a4a', { glow: '#ff0040', blur: 40 }); txt('EFFACER', 0, 130, 40, '#ff2a4a'); g.restore(); }
  pill(three ? 'TROIS' : 'JAMAIS DEUX', W / 2, 400, 70, three ? '#ff2a4a' : '#ffd23f', three ? '#fff' : OUT, { sc: popIn(three ? w(233) : w(227), t) });
  if (t > w(238)) { stamp('EFFACE LES 2 AUTRES', W / 2, 1300, 64, '#ff2a4a', w(238), t); GL = seg(t, w(238), w(241)) * .5; }
}});
// 10. MINUIT — L'OUBLI
SC.push({ i: 242, cam: [[242, 1, 540, 960], [243, 1.3, 400, 1000], [250, 1.3, 700, 980], [256, 1.6, 360, 960]], draw(t) {
  sky('#05030a', '#140818'); const sp = t - w(243);
  perso('lina', 720, 1550, 1.05, t, { expr: 'neutral', flip: true, look: [-1, 0] }); if (t > w(253)) txt('?', 900, 860, 140, '#fff', { stroke: OUT, sw: 14 });
  perso('toi', 330, 1560, 1.05, t, { expr: 'blank', tilt: Math.sin(t * 4) * .12 * clamp(sp), sweat: true });
  if (t > w(258)) { const s = popIn(w(258), t); g.save(); g.translate(330, 520); g.scale(s, s); rr(-260, -80, 520, 160, 20); fillStroke('#fff', 8); txt('PRÉNOM : ', -60, 4, 54, OUT); const k = 1 - seg(t, w(259), w(262)); const nm = 'T _ _ _'.slice(0, Math.ceil(7 * k)); txt(nm, 150, 4, 54, '#e8333a'); g.restore(); }
  GL = sp > 0 ? (.15 + .25 * Math.abs(Math.sin(t * 7))) * clamp(sp) : 0; midnight(w(242), t);
}});
// 11. PARTIE 3 ?
SC.push({ i: 263, cam: [[263, 1, 540, 960]], draw(t) {
  sky('#0b0406', '#1e0a0e'); windowNight(340, 1150, 400, 400, t, 0); perso('gamin', 540, 1520, .45, t, { expr: 'blank' }); glow(540, 1300, 300, 'rgba(255,0,60,.5)');
  const s = popIn(w(263), t); g.save(); g.translate(W / 2, 560); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#151325', 10, '#ff2a4a'); txt('PARTIE 3 ?', 0, 10, 130, '#ff2a4a', { glow: '#ff0040' }); g.restore();
  const b = popIn(w(265) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 880); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
  GL = .12;
}});
