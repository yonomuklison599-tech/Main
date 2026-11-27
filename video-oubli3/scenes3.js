// ================================================================ PARTIE 3 — FINALE
SC.length = 0;
CHAR.lina = CHAR.fille; CHAR.gamin = { skin: SKIN.a, hair: '#e0b040', style: 'messy', shirt: '#7ac8ff', pants: '#7ac8ff', shoe: '#fff' };
POW.push(['EFFACER', 'erase']); POWCOL.push('#ff2a4a');
const _icon = icon; icon = function (k, s, col) { if (k !== 'erase') return _icon(k, s, col); g.save(); g.scale(s, s); g.rotate(-.5); rr(-70, -35, 140, 70, 12); fillStroke('#ff8fa3', 8); rr(10, -35, 60, 70, 10); fillStroke('#7ac8ff', 8); g.restore(); };
const N3 = 11, T3 = 10;
function roul3(t) { const TL = we(17) + .75, D = (3 * N3 + T3) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
function glitch(a) { if (a <= 0) return; const img = g.getImageData(0, 0, W, H); for (let i = 0; i < 10; i++) { const y = Math.floor(hash(i + Math.floor(a * 50)) * H), h = 20 + hash(i * 3) * 80, dx = (hash(i + 7 + a) - .5) * 160 * a; g.putImageData(img, dx, 0, 0, y, W, h); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25 * a; g.fillStyle = '#ff0040'; g.fillRect(0, 0, W, H); g.restore(); }
let GL = 0;
function postit(s, x, y, size, rot, sc = 1, col = '#ffd23f') { g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.font = F(size, 800); const lines = s.split('\n'); const tw = Math.max(...lines.map(l => g.measureText(l).width)) + size * 1.4, th = lines.length * size * 1.3 + size * 1.2;
  rr(-tw / 2, -th / 2, tw, th, 6); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowOffsetY = 10; fillStroke(col, 6); g.shadowColor = 'transparent'; lines.forEach((l, i) => txt(l, 0, -((lines.length - 1) * size * 1.3) / 2 + i * size * 1.3, size, OUT, { wt: 800 })); g.restore(); }
// 0. ROULETTE POUR LE GARÇON
SC.push({ i: 0, cam: [[0, 1, 540, 960], [14, 1.08, 540, 940], [18, 1.0, 540, 960]], draw(t) {
  sky('#0a0306', '#1a060c'); const { p, TL } = roul3(t), landed = t >= TL, fiche = seg(t, w(18) - .1, w(18) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('PARTIE 3 • FINALE', W / 2, 170, 40, '#e8333a', '#fff'); txt('ET LUI,', W / 2, 290, 100, '#fff', { glow: '#ff2a4a', blur: 40 }); txt('QUEL POUVOIR ?', W / 2, 390, 70, '#ffd23f', { glow: '#ffd23f', blur: 30, wt: 800 }); g.restore();
  if (t < w(7)) { const s = popIn(0, t); windowNight(240, 700, 600, 700, t, 0); perso('gamin', W / 2, 1360, .9 * s, t, { expr: 'blank' }); return; }
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % N3) + N3) % N3;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 520, 0, 1250, ['rgba(255,190,190,.9)', 'rgba(255,190,190,0)']); g.beginPath(); g.moveTo(x - 30, 520); g.lineTo(x + 30, 520); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === T3; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) card(ii, x, 960, .92 + .1 * near, isT ? 1 : 0, t); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#ff8080'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .8; g.fillStyle = '#05000a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 650, 'rgba(255,0,60,.55)', fiche); card(T3, W / 2, 860, lerp(.92, 1.6, eOut(fiche)), 1, t);
    txt('EFFACER', W / 2, 220, 110, '#ff2a4a', { stroke: OUT, sw: 16, glow: '#ff0040' }); pill('MAUDIT', W / 2, 1280, 56, '#ff2a4a', '#fff', { sc: popIn(w(18) + .3, t) }); GL = .15 * fiche; }
}});
// 1. C'EST LUI
SC.push({ i: 19, cam: [[19, 1, 540, 960], [28, 1.1, 540, 800], [31, 1.3, 540, 760], [37, 1.0, 540, 960], [48, 1.15, 540, 1000]], draw(t) {
  sky('#02030a', '#0a1030'); stars(t, 120); const him = t > w(28);
  if (him) { const s = eOut(seg(t, w(28), w(29) + .3)); g.save(); g.globalAlpha = s; perso('gamin', W / 2, 1200, 1.5, t, { expr: 'blank', arms: t > w(41) ? 'up' : 'down' }); g.restore(); glow(W / 2 - 60, 490, 80 * s, 'rgba(255,0,60,1)'); glow(W / 2 + 60, 490, 80 * s, 'rgba(255,0,60,1)'); }
  globe(W / 2, him ? 1350 : 1000, him ? 300 : 420, t);
  if (t > w(31) && t < w(37)) pill('NOÉ • 8 ANS', W / 2, 260, 60, '#7ac8ff', OUT, { sc: popIn(w(31), t) });
  if (t > w(41)) { for (let j = 0; j < 3; j++) { const k = ((t - w(41)) * .8 + j / 3) % 1; circ(W / 2, 900, k * 1100); g.lineWidth = 26 * (1 - k); g.strokeStyle = `rgba(255,40,80,${(1 - k) * .8})`; g.stroke(); } }
  if (t > w(48)) txt('8 000 000 000', W / 2, 260, 90, '#fff', { stroke: OUT, sw: 14, glow: '#ff2a4a' });
  if (t < w(28)) { txt('?', W / 2, 400, 200 * popIn(w(19), t), '#ffd23f', { stroke: OUT, sw: 16 }); }
}});
// 2. LE PIRE JOUR — flash-back
SC.push({ i: 52, cam: [[52, 1, 540, 960], [61, 1.2, 540, 980], [69, 1.3, 540, 1150], [79, 1.0, 540, 900]], draw(t) {
  kitchen(t); const wish = t > w(69), oui = t > w(79);
  if (!oui) { perso('patron', 280, 1480, .9, t, { expr: 'angry', arms: 'fist', angryRed: .4, talk: !wish ? .8 : 0 }); perso('mere', 800, 1480, .9, t, { expr: 'angry', flip: true, arms: 'hips', talk: !wish ? .8 : 0 });
    if (t > w(61) && !wish) { bubble('#@%!!', 300, 780, 70, w(62), t, { tail: -1 }); bubble('&$*!!', 790, 700, 70, w(64), t, { tail: 1 }); }
    perso('gamin', 540, 1560, .55, t, { expr: 'sad', tear: true, arms: wish ? 'cross' : 'down' });
    if (wish) bubble('Que tout le monde\noublie...', 540, 1060, 46, w(70), t, { tail: 0, bg: '#e8f4ff' }); }
  else { glow(W / 2, 900, 600, 'rgba(255,0,60,.5)'); card(T3, W / 2, 900, 1.4, 1, t); stamp('OUI', W / 2, 1320, 120, '#ff2a4a', w(83), t); }
  g.save(); g.globalCompositeOperation = 'color'; g.globalAlpha = .55; g.fillStyle = '#a07a50'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); txt('IL Y A 3 ANS', W / 2, 200, 54, '#f4e2c0', { ls: 10, wt: 800 });
}});
// 3. LES POST-IT
SC.push({ i: 85, cam: [[85, 1, 540, 960], [87, 1.3, 540, 1000], [90, 1.0, 540, 900], [100, 1.35, 540, 800]], draw(t) {
  sky('#ffe9b8', '#f0c890'); for (let i = 0; i < 40; i++) postit('SOUVIENS\n-TOI', 60 + (i % 7) * 160 + hash(i) * 30, 120 + Math.floor(i / 7) * 190 + hash(i + 1) * 20, 20, (hash(i + 2) - .5) * .4, 1, ['#ffd23f', '#ffe066', '#fff07a'][i % 3]);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, H); floor(1350, '#8a6a4a');
  perso('gamin', W / 2, 1560, .9, t, { expr: t > w(87) && t < w(90) ? 'blank' : 'sad', arms: t > w(92) ? 'write' : 'down', look: [0, -1] });
  if (t > w(87) && t < w(90)) txt('?', 740, 900, 130, '#fff', { stroke: OUT, sw: 14 });
  if (t > w(100)) postit("C'EST TOI\nQUI FAIS ÇA", W / 2, 780, 70, -.05, popIn(w(100), t), '#ff8fa3');
}});
// 4. LE POUVOIR GRANDIT
SC.push({ i: 106, cam: [[106, 1, 540, 960], [110, 1.15, 540, 900], [119, 1.35, 540, 900], [122, 1.0, 540, 960]], draw(t) {
  sky('#0a0204', '#26040c'); const k = seg(t, w(106), w(121)); for (let j = 0; j < 4; j++) { const kk = (t * .7 + j / 4) % 1; circ(W / 2, 960, kk * 1300 * (1 + k)); g.lineWidth = 40 * (1 - kk); g.strokeStyle = `rgba(255,30,70,${(1 - kk) * .7})`; g.stroke(); }
  perso('gamin', W / 2, 1300, .7 + .3 * k, t, { expr: 'blank', arms: 'up' }); glow(W / 2, 900, 400 * (.5 + k), 'rgba(255,0,60,.6)');
  if (t > w(110) && t < w(119)) { digital('00:00', W / 2, 300, 110, '#ff2a4a'); pill('CE SOIR', W / 2, 450, 50, '#ff2a4a', '#fff', { sc: popIn(w(110), t) }); }
  if (t > w(119) && t < w(122)) txt('TOUT.', W / 2, 400, 200 * popIn(w(121), t), '#ff2a4a', { stroke: OUT, sw: 20, glow: '#ff0040' });
  if (t > w(122)) { [['toi', 320, 122], ['lina', 760, 125]].forEach(([id, x, i0]) => { if (t < w(i0)) return; const fade = seg(t, w(i0) + .3, w(i0) + 1.6); g.save(); g.translate(x, 700); g.rotate(id === 'toi' ? -.06 : .06); rr(-190, -250, 380, 470, 8); fillStroke('#fbfbf7', 7); g.save(); rr(-165, -225, 330, 360, 4); g.clip(); g.fillStyle = '#5a7ab8'; g.fillRect(-165, -225, 330, 360); g.globalAlpha = 1 - fade; perso(id, 0, 380, .6, t, { expr: 'happy' }); g.restore(); txt(id === 'toi' ? 'TOI' : 'LINA', 0, 180, 44, OUT); g.restore(); }); GL = seg(t, w(123), w(127)) * .35; }
}});
// 5. 23H — LA COURSE
SC.push({ i: 128, cam: [[128, 1, 540, 960], [130, 1.2, 420, 1000], [132, 1.0, 540, 960], [137, 1.25, 540, 900]], draw(t) {
  sky('#04060f', '#111a3a'); stars(t, 60); const sc = (t * 900) % 400; for (let i = -1; i < 4; i++) { const x = i * 400 - sc; rr(x, 700, 300, 650, 6); fillStroke('#1a1e33', 0); for (let j = 0; j < 6; j++) if (hash(i * 9 + j + Math.floor((t * 900) / 400) * 13) > .4) { g.fillStyle = '#ffd27a'; g.fillRect(x + 40 + (j % 2) * 130, 760 + Math.floor(j / 2) * 170, 80, 90); } }
  floor(1350, '#2a2a3a'); for (let i = 0; i < 6; i++) { g.fillStyle = '#ffd23f'; g.fillRect(((i * 260 - t * 1400) % 1560 + 1560) % 1560 - 240, 1500, 140, 16); }
  digital('23:00', W / 2, 260, 100, '#ff4d4d');
  if (t < w(132)) perso('toi', 420, 1440, 1.0, t, { expr: 'angry', bob: 3, arms: Math.sin(t * 18) > 0 ? 'point' : 'fist', tilt: .1, sweat: true });
  else { perso('lina', W / 2, 1900, 1.4, t, { expr: 'neutral', look: [0, 1] }); if (t > w(137)) { const s = popIn(w(137), t); g.save(); g.translate(W / 2, 880); g.scale(s, s); g.rotate(-.1); g.beginPath(); g.ellipse(0, 40, 230, 280, 0, 0, Math.PI * 2); fillStroke(SKIN.b, 8); for (let i = 0; i < 4; i++) { rr(-170 + i * 92, -380, 76, 220, 38); fillStroke(SKIN.b, 8); }
      const lines = ['fais', 'confiance', 'au garçon', 'qui court']; lines.forEach((l, i) => { if (t > w(143) + i * .35) txt(l, 0, -60 + i * 70, 50, '#2a3fb8', { wt: 800 }); }); g.restore(); } }
}});
// 6. 23H58 — SA CHAMBRE
SC.push({ i: 150, cam: [[150, 1, 540, 960], [153, 1.15, 540, 1000], [155, 1.45, 640, 1000]], draw(t) {
  sky('#141a3a', '#0a0f26'); for (let i = 0; i < 24; i++) postit('SOUVIENS\n-TOI', 80 + (i % 6) * 180 + hash(i) * 30, 160 + Math.floor(i / 6) * 180, 18, (hash(i + 2) - .5) * .4, 1, '#c9b060');
  windowNight(80, 300, 0, 0, t, 0); floor(1350, '#2a2438'); rr(380, 1180, 640, 200, 30); fillStroke('#5a7ab8', 8); rr(360, 1120, 200, 100, 30); fillStroke('#fff', 6);
  digital('23:58', W / 2, 260, 100, '#ff4d4d');
  perso('gamin', 680, 1330, .65, t, { expr: 'sad', tear: true, flip: true, talk: t > w(156) ? .6 : 0 }); perso('toi', 220, 1540, .95, t, { expr: 'shock', look: [1, 0], sweat: true });
  bubble('Si j’arrête, tout le monde\nva se souvenir\ndes mauvais jours...', 620, 760, 44, w(156), t, { tail: 1, bg: '#e8f4ff' });
}});
// 7. LA PHRASE PARFAITE
SC.push({ i: 168, cam: [[168, 1, 540, 960], [171, 1.2, 540, 900], [181, 1.3, 330, 1000], [187, 1.15, 540, 1000], [198, 1.45, 640, 1000]], draw(t) {
  sky('#141a3a', '#0a0f26'); floor(1350, '#2a2438'); const say = t > w(187);
  if (t < w(181)) { lockers(t); pill('JOUR 9', W / 2, 300, 56, '#ffd23f', OUT, { sc: popIn(w(171), t) }); perso('toi', 320, 1480, .9, t, { expr: 'smug', talk: .6 }); perso('lina', 740, 1470, .9, t, { expr: 'love', flip: true }); hearts(t, w(174), 740, 900, 6); g.save(); g.globalCompositeOperation = 'color'; g.globalAlpha = .5; g.fillStyle = '#a07a50'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); return; }
  digital('23:59', W / 2, 220, 90, '#ff4d4d'); pill('1 SEULE CHANCE', W / 2, 380, 50, '#ff2a4a', '#fff', { sc: popIn(w(184), t) });
  perso('gamin', 700, 1420, .7, t, { expr: t > w(198) ? 'smile' : 'sad', tear: t < w(199), flip: true, look: [-1, 0] }); perso('toi', 330, 1520, .95, t, { expr: 'smile', arms: say ? 'hug' : 'down', talk: say && t < we(200) ? .7 : 0, look: [1, 0] });
  if (say) bubble('Les mauvais jours,\non ne les oublie pas.\nOn les partage.', 470, 760, 50, w(190), t, { tail: -1, bg: '#fff6d0' });
}});
// 8. MINUIT — RIEN NE S'EFFACE
SC.push({ i: 201, cam: [[201, 1, 540, 960]], draw(t) {
  sky('#02030a', '#0a1030'); stars(t, 120); const k = t - w(201); digital('00:00', W / 2, 700, 160 * (1 + .1 * Math.max(0, 1 - k / .2)), '#6fd3ff');
  const r = 900 * eOut(clamp(k / .5)) * (1 - eOut(clamp((k - .4) / .4))); circ(W / 2, 700, r); g.lineWidth = 30; g.strokeStyle = 'rgba(120,220,255,.6)'; g.stroke();
  if (k > .8) txt('...', W / 2, 1000, 140, '#fff');
}});
// 9. LE MATIN — LA PLANÈTE SE SOUVIENT
SC.push({ i: 202, cam: [[202, 1, 540, 960], [213, 1.1, 540, 900], [221, 1.0, 540, 1000], [226, 1.3, 760, 980]], draw(t) {
  if (t < w(221)) { sky('#ffb070', '#ffe0a8', '#8fd0ff'); glow(W / 2, 1400, 900, 'rgba(255,220,120,.7)'); globe(W / 2, 1150, 380, t, { lights: .3 });
    if (t > w(213)) for (let i = 0; i < 14; i++) { const a = -Math.PI + (i / 13) * Math.PI, x = W / 2 + Math.cos(a) * 480, y = 1150 + Math.sin(a) * 480; const s = popIn(w(213) + i * .05, t); if (s <= 0) continue; g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y); miniHead(x, y, 40, i, 'live', t); g.restore(); }
    pill('SOUVENIR ✓', W / 2, 380, 64, '#2ecc71', '#fff', { sc: popIn(w(216), t) }); txt('1ER JOUR EN 3 ANS', W / 2, 250, 54, '#fff', { stroke: OUT, sw: 12, ls: 4 }); }
  else { classroom(t); perso('prof', 760, 1450, .95, t, { expr: 'angry', angryRed: .6, flip: true, arms: 'point', look: [-1, 0] }); perso('toi', 300, 1480, .9, t, { expr: 'shock', sweat: true, look: [1, 0] });
    bubble('Je me souviens\nde la SIESTE.', 740, 720, 50, w(222), t, { tail: 1 }); if (t > w(226)) stamp('2H DE COLLE', W / 2, 520, 90, '#ff3b3b', w(226), t); }
}});
// 10. TU T'APPELLES TOM
SC.push({ i: 230, cam: [[230, 1, 540, 1000], [233, 1.3, 330, 1000], [237, 1.0, 540, 1000], [242, 1.15, 540, 820]], draw(t) {
  lockers(t, 1); dust(t, '#fff3d0', 40, .4);
  perso('toi', 320, 1500, .92, t, { expr: t > w(245) ? 'happy' : 'blank', look: [1, 0], blush: t > w(249) });
  perso('lina', 760, 1480, .92, t, { expr: 'smile', flip: true, arms: t > w(239) ? 'point' : 'down', look: [-1, 0] });
  if (t > w(230) && t < w(237)) txt('?', 420, 860, 120, '#fff', { stroke: OUT, sw: 14 });
  if (t > w(240)) { const s = popIn(w(240), t); postit(t > w(243) ? "Tu t'appelles TOM.\n" + (t > w(246) ? 'Et tu me dois\nun dîner ♥' : '') : '...', W / 2, 720, 56, -.04, s * 1.1); }
  if (t > w(249)) hearts(t, w(249), 760, 1000, 6);
}});
// 11. FIN — LA PROCHAINE ROULETTE
SC.push({ i: 252, cam: [[252, 1, 540, 960], [253, 1.0, 540, 960]], draw(t) {
  sky('#07060d', '#0e0c1a'); if (t < w(253)) { txt('FIN', W / 2, 860, 260 * popIn(w(252), t), '#fff', { glow: '#ffd23f', blur: 50 }); return; }
  const p = (t - w(253)) * 2200, ci = p / SPACING, base = Math.floor(ci); for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; card(((idx % 10) + 10) % 10, x, 960, .95, 0, t); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 560, 8, 760); g.restore();
  txt('LA PROCHAINE', W / 2, 280, 90, '#fff', { glow: '#7ac8ff', blur: 40 }); txt('ROULETTE...', W / 2, 390, 80, '#ffd23f', { glow: '#ffd23f', blur: 30 });
  const b = popIn(w(257), t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1330); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
}});
