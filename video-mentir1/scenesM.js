// ================================================================ SÉRIE « MENTIR » — PARTIE 1
SC.length = 0;
CHAR.mamie = { skin: SKIN.a, hair: '#d8d8d8', style: 'bun', shirt: '#c96b8a', pants: '#5a3a4a', shoe: '#5a4a5a', glasses: 1 };
CHAR.caissier = { skin: SKIN.c, hair: '#1d1d1d', style: 'cap', shirt: '#e8333a', pants: '#333', shoe: '#111', cap: '#ffd23f' };
CHAR.nouvelle = { skin: SKIN.a, hair: '#7b4bd6', style: 'long', shirt: '#1f1f2a', pants: '#2a2a3a', shoe: '#fff' };
const TGM = 6;
function roulM(t) { const TL = we(18) + .75, D = (3 * 10 + TGM) * SPACING; return { p: D * (1 - Math.pow(1 - clamp(t / TL), 4)), TL }; }
function sock(x, y, s, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.beginPath(); g.moveTo(-40, -120); g.lineTo(40, -120); g.lineTo(40, 30); g.quadraticCurveTo(40, 80, 90, 80); g.quadraticCurveTo(130, 80, 130, 115); g.quadraticCurveTo(130, 150, 80, 150); g.lineTo(-10, 150); g.quadraticCurveTo(-40, 150, -40, 110); g.closePath(); fillStroke('#ff6b8a', 7);
  for (let i = 0; i < 3; i++) { g.fillStyle = '#fff'; g.fillRect(-40, -100 + i * 40, 80, 14); } g.restore(); }
// 0. ROULETTE
SC.push({ i: 0, cam: [[0, 1, 540, 960], [15, 1.08, 540, 940], [19, 1.0, 540, 960], [20, 1.12, 540, 900]], draw(t) {
  sky('#08060d', '#120c1a'); const { p, TL } = roulM(t), landed = t >= TL, fiche = seg(t, w(19) - .1, w(19) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('NOUVELLE SÉRIE', W / 2, 170, 40, '#ff9f5a', OUT); txt('LA ROULETTE', W / 2, 290, 92, '#fff', { glow: '#ff9f5a', blur: 40 }); txt('DES POUVOIRS', W / 2, 385, 64, '#ffd23f', { glow: '#ffd23f', blur: 30, wt: 800, ls: 10 }); pill('1 SEUL HUMAIN SUR TERRE', W / 2, 490, 34, '#e8333a', '#fff', { sc: popIn(w(4), t) }); g.restore();
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % 10) + 10) % 10;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 560, 0, 1250, ['rgba(255,230,190,.9)', 'rgba(255,230,190,0)']); g.beginPath(); g.moveTo(x - 30, 560); g.lineTo(x + 30, 560); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TGM; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) card(ii, x, 960, .92 + .1 * near, isT ? 1 : 0, t); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 600, 8, 720); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#fff0d8'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(255,150,60,.5)', fiche); card(TGM, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1, t);
    txt('MENTIR', W / 2, 220, 120, '#ff9f5a', { stroke: OUT, sw: 16, glow: '#ff6a00' }); pill('LÉGENDAIRE', W / 2, 1260, 46, '#ffd23f', OUT, { sc: popIn(w(19) + .3, t) }); }
}});
// 1. PERSONNE NE SAIT MENTIR
SC.push({ i: 20, cam: [[20, 1, 540, 960], [27, 1.05, 540, 960], [36, 2.3, GRID.x0 + ME[0] * GRID.dx, GRID.y0 + ME[1] * GRID.dy - 30], [38, 1.0, 540, 960]], draw(t) {
  sky('#0b1a14', '#123a2a'); const n = Math.floor(8e9 * eOut(seg(t, w(27), w(29) + .3)));
  txt(n.toLocaleString('fr-FR').replace(/ /g, ' '), W / 2, 330, 96, '#fff', { glow: '#2ecc71', blur: 30 }); txt('DISENT LA VÉRITÉ', W / 2, 430, 46, '#2ecc71', { ls: 8, wt: 800 });
  for (let r = 0; r < GRID.r; r++) for (let c = 0; c < GRID.c; c++) { const x = GRID.x0 + c * GRID.dx + (r % 2) * 30, y = GRID.y0 + r * GRID.dy, i = r * GRID.c + c, me = c === ME[0] && r === ME[1]; const pop = popIn(w(20) + hash(i) * .6, t, .25); if (pop <= 0) continue;
    g.save(); g.translate(x, y); g.scale(pop, pop); g.translate(-x, -y); miniHead(x, y, 40, i, 'plain', t);
    if (me && t > w(36)) { glow(x, y, 120, 'rgba(255,150,60,.9)'); g.save(); rr(x + 10, y - 2, 70, 18, 9); fillStroke(SKIN.a, 4); g.restore(); pill('TOI', x, y + 70, 24, '#ff9f5a', OUT); }
    else if (t > w(31) + hash(i) * .5) { circ(x + 32, y - 32, 13); fillStroke('#2ecc71', 3); } g.restore(); }
  if (t > w(38)) { g.save(); g.fillStyle = 'rgba(10,26,20,.75)'; g.fillRect(-W, -H, 3 * W, 3 * H); g.restore(); txt('TOUT LE MONDE', W / 2, 820, 96, '#fff', { stroke: OUT, sw: 14 }); txt('CROIT TOUT', W / 2, 950, 120, '#ffd23f', { stroke: OUT, sw: 16, glow: '#ff9f1a' }); pill('100 % CRÉDULES', W / 2, 1120, 54, '#2ecc71', '#fff', { sc: popIn(w(46), t) }); }
}});
// 2. LUNDI — LE DEVOIR
SC.push({ i: 48, cam: [[48, 1, 540, 1000], [55, 1.4, 330, 1050], [61, 1.4, 760, 980], [66, 1.1, 540, 900]], draw(t) {
  classroom(t); const ok = t > w(61);
  perso('prof', 760, 1450, .95, t, { expr: ok ? 'sad' : 'neutral', flip: true, look: [-1, 0], talk: ok && t < w(66) ? .7 : 0, arms: ok ? 'shrug' : 'down' });
  perso('toi', 300, 1480, .9, t, { expr: 'smug', talk: t > w(55) && t < w(61) ? .8 : 0, look: [1, 0] });
  bubble("Je l'ai déjà rendu.", 340, 780, 52, w(56), t, { t1: w(61), tail: -1 }); if (ok) bubble("Pardon... je l'ai\nperdu !", 740, 740, 50, w(62), t, { t1: w(66), tail: 1 });
  if (t > w(66)) stamp('20/20', W / 2, 640, 140, '#2ecc71', w(69), t, -.1);
  pill('LUNDI', W / 2, 220, 54, '#ffd23f', OUT, { sc: popIn(w(48), t) });
}});
// 3. MARDI — FAST-FOOD
SC.push({ i: 70, cam: [[70, 1, 540, 1000], [73, 1.35, 330, 1050], [81, 1.1, 540, 1000], [83, 1.3, 540, 900]], draw(t) {
  sky('#ffcf5a', '#ff9f3a'); rr(80, 260, 920, 300, 16); fillStroke('#2a1a10', 10); ['BURGER  5€', 'FRITES  3€', 'MENU  9€'].forEach((s, i) => txt(s, 540, 320 + i * 80, 50, '#ffd23f'));
  floor(1300, '#d9c0a0'); perso('caissier', 740, 1250, .85, t, { expr: t > w(81) ? 'happy' : 'neutral', flip: true, arms: t > w(81) ? 'wave' : 'down' });
  rr(440, 1150, 700, 220, 14); fillStroke('#e8333a', 8); rr(420, 1130, 740, 40, 10); fillStroke('#f4efe6', 8);
  perso('toi', 260, 1560, 1.0, t, { expr: 'smug', talk: t > w(73) && t < w(81) ? .8 : 0, look: [1, -.2] });
  bubble('Je suis le fils\ndu patron.', 330, 800, 52, w(74), t, { t1: w(81), tail: -1 });
  if (t > w(81)) { const s = popIn(w(81), t); g.save(); g.translate(720, 1060); g.scale(s, s); rr(-150, -20, 300, 50, 10); fillStroke('#8a5a2a', 6); g.beginPath(); g.arc(-50, -20, 60, Math.PI, 0); fillStroke('#e0a040', 6); rr(-110, -40, 120, 14, 6); fillStroke('#4a2a1a', 4); rr(40, -90, 80, 70, 8); fillStroke('#e8333a', 6); for (let i = 0; i < 5; i++) { rr(46 + i * 14, -120, 10, 50, 3); fillStroke('#ffd23f', 3); } g.restore();
    stamp('GRATUIT À VIE', W / 2, 700, 80, '#2ecc71', w(83), t); }
  pill('MARDI', W / 2, 180, 54, '#ffd23f', OUT, { sc: popIn(w(70), t) });
}});
// 4. LA CHAUSSETTE PORTE-BONHEUR
SC.push({ i: 85, cam: [[85, 1, 540, 960], [88, 1.3, 540, 860], [96, 1.15, 540, 900], [99, 1.0, 540, 960], [103, 1.1, 540, 900]], draw(t) {
  sky('#ffe7b0', '#ffc07a'); floor(1300, '#c8a070'); glow(W / 2, 700, 500, 'rgba(255,230,120,.6)');
  const sold = t > w(99) ? Math.floor(eOut(seg(t, w(99), w(102) + .4)) * 100) : t > w(98) ? 1 : 0;
  if (t < w(99)) { sock(W / 2, 760, 1.6 * popIn(w(88), t), Math.sin(t * 3) * .1); if (t > w(93)) { for (let i = 0; i < 8; i++) { const a = t * 2 + i; txt('✦', W / 2 + Math.cos(a) * 260, 760 + Math.sin(a) * 260, 50, '#ffd23f', { glow: '#fff' }); } }
    if (t > w(96)) pill('1 000 €', W / 2, 1100, 80, '#2ecc71', '#fff', { sc: popIn(w(96), t), rot: -.06 }); if (t > w(98)) stamp('VENDUE', W / 2, 460, 100, '#e8333a', w(98), t); perso('toi', 230, 1600, .8, t, { expr: 'smug', arms: 'point', talk: t > w(91) && t < w(96) ? .8 : 0 }); }
  else { for (let i = 0; i < Math.min(sold, 40); i++) sock(120 + (i % 8) * 120, 520 + Math.floor(i / 8) * 150, .45, (hash(i) - .5) * .5);
    txt(sold + ' / 100', W / 2, 330, 100, '#fff', { stroke: OUT, sw: 16 }); if (t > w(103)) { pill('+ 100 000 €', W / 2, 1250, 80, '#ffd23f', OUT, { sc: popIn(w(105), t) }); moneyRain(t, w(105), 24); } perso('toi', W / 2, 1650, .75, t, { expr: 'happy', arms: 'up', bob: 1.5 }); }
}});
// 5. MERCREDI — LA BANQUE
SC.push({ i: 108, cam: [[108, 1, 540, 960], [109, 1.3, 330, 1050], [116, 1.15, 540, 700], [124, 1.3, 700, 950], [127, 1.4, 330, 1050]], draw(t) {
  sky('#e9eef7', '#c9d4e8'); for (let i = 0; i < 5; i++) { rr(60 + i * 210, 300, 120, 950, 10); fillStroke('#f4f1e8', 6, '#9aa4b8'); }
  floor(1300, '#7a8094'); perso('patron', 720, 1260, .85, t, { expr: t > w(124) ? 'smile' : 'neutral', flip: true, arms: t > w(124) ? 'wave' : 'down', look: [-1, 0] });
  rr(440, 1150, 700, 220, 14); fillStroke('#3a3f55', 8); txt('BANQUE', 790, 1260, 54, '#ffd23f');
  rr(220, 470, 640, 330, 16); fillStroke('#111', 10, '#333'); txt('COMPTE : M. LE VOISIN', 540, 540, 36, '#7ac8ff', { wt: 800 }); txt('4 200 000 000 €', 540, 630, 70, '#2ecc71');
  if (t > w(121)) { txt('PROPRIÉTAIRE :', 400, 720, 36, '#fff', { wt: 800 }); txt('TOI ?', 640, 720, 50, '#ff9f5a'); }
  perso('toi', 260, 1560, 1.0, t, { expr: t > w(127) ? 'smug' : 'smile', talk: t > w(109) && t < w(124) ? .8 : 0, look: [1, -.2], arms: t > w(127) && t < w(131) ? 'cross' : 'down' });
  if (t > w(124) && t < w(127)) check(860, 680, 1, true, w(125), t);
  if (t > w(127)) { stamp('PAS ENCORE.', W / 2, 960, 90, '#ff9f5a', w(132), t); }
  pill('MERCREDI', W / 2, 200, 54, '#ffd23f', OUT, { sc: popIn(w(108), t) });
}});
// 6. LE PIÈGE : LA VÉRITÉ BRUTALE
SC.push({ i: 134, cam: [[134, 1, 540, 960], [140, 1.1, 540, 960], [152, 1.3, 700, 980], [161, 1.3, 700, 980], [170, 1.3, 700, 980], [176, 1.0, 540, 960]], draw(t) {
  const who = t < w(152) ? 0 : t < w(161) ? 1 : t < w(170) ? 2 : t < w(176) ? 3 : 4;
  if (who === 0) { sky('#1a0f08', '#2a1a0a'); txt('PIÈGE', W / 2, 760, 220 * popIn(w(138), t), '#e8333a', { stroke: OUT, sw: 20, glow: '#ff2a2a' }); if (t > w(140)) { txt('ILS NE PEUVENT', W / 2, 1020, 66, '#fff', { stroke: OUT, sw: 12 }); txt('PAS MENTIR', W / 2, 1110, 80, '#2ecc71', { stroke: OUT, sw: 14 }); }
    if (t > w(147)) pill('MÊME POUR ÊTRE GENTILS', W / 2, 1260, 40, '#ffd23f', OUT, { sc: popIn(w(148), t) }); return; }
  if (who < 4) { lockers(t, 1); const id = ['pote', 'mamie', 'fille'][who - 1], txtB = ['Ta coupe ?\nHorrible.', 'Ton cadeau ?\nÇa sert à rien.', 'Honnêtement...\nT’es moyen.'][who - 1], t0 = w([152, 161, 170][who - 1]);
    perso('toi', 300, 1500, .92, t, { expr: t > t0 + .8 ? 'sad' : 'smile', look: [1, 0], sweat: t > t0 + .8 }); perso(id, 760, 1490, .92, t, { expr: 'neutral', flip: true, talk: .6, look: [-1, 0] });
    bubble(txtB, 760, 760, 54, t0 + .1, t, { tail: 1 }); pill('VÉRITÉ', 760, 470, 40, '#2ecc71', '#fff', { sc: popIn(t0 + .2, t) }); return; }
  sky('#2a2f3a', '#1a1d26'); perso('toi', W / 2, 1520, 1.0, t, { expr: 'sad', tear: true });
  ['Horrible.', 'Sert à rien.', 'Moyen.', 'Bof.', 'Nul.'].forEach((s, i) => bubble(s, 200 + (i % 3) * 340, 450 + Math.floor(i / 2) * 230 + Math.sin(t * 2 + i) * 20, 44, w(176) + i * .15, t, { tail: i % 2 ? 1 : -1 }));
}});
// 7. LA BLAGUE DU SOLEIL
SC.push({ i: 182, cam: [[182, 1, 540, 960], [187, 1.35, 330, 1050], [198, 1.0, 540, 960], [202, 1.2, 540, 900], [208, 1.4, 330, 1100]], draw(t) {
  const next = t > w(198);
  if (!next) { sky('#ffcf9a', '#f3a46b'); glow(800, 400, 300, 'rgba(255,230,120,.9)'); circ(800, 400, 110); fillStroke('#ffd23f', 6); floor(1300, '#c8a070');
    perso('toi', 330, 1520, 1.0, t, { expr: t > w(189) ? 'laugh' : 'smug', talk: t > w(189) && t < w(197) ? .8 : 0 }); perso('pote', 780, 1500, .9, t, { expr: t > w(195) ? 'shock' : 'neutral', flip: true });
    bubble('Demain, le soleil\nne se lève pas. MDR', 380, 760, 50, w(190), t, { tail: -1 }); if (t > w(184)) pill('DANGEREUX', W / 2, 260, 56, '#e8333a', '#fff', { sc: popIn(w(185), t) }); }
  else { sky('#0d0d18', '#1a1a2a'); stars(t, 60); for (let i = 0; i < 6; i++) { rr(i * 190 - 30, 700, 170, 650, 6); fillStroke('#20202e', 0); }
    rr(160, 260, 760, 330, 16); fillStroke('#111', 10, '#333'); rr(180, 280, 720, 70, 0); fillStroke('#e8333a', 0); txt('FLASH INFO', 540, 316, 46, '#fff'); txt('LE SOLEIL NE SE', 540, 420, 56, '#fff'); txt('LÈVERA PAS', 540, 500, 70, '#ffd23f');
    floor(1300, '#2a2a3a'); [[150, 'pote'], [380, 'mamie'], [640, 'prof'], [900, 'caissier']].forEach(([x, id], i) => perso(id, x, 1330, .55, t, { expr: 'shock', tear: i % 2 === 0, arms: i % 2 ? 'up' : 'cross', bob: 2 }));
    if (t > w(200)) pill('PANIQUE MONDIALE', W / 2, 680, 50, '#e8333a', '#fff', { sc: popIn(w(200), t) }); if (t > w(208)) { perso('toi', 330, 1720, 1.0, t, { expr: 'shock', sweat: true }); pill('À CAUSE D’UNE BLAGUE', W / 2, 820, 44, '#ffd23f', OUT, { sc: popIn(w(209), t) }); } }
}});
// 8. JEUDI — LA NOUVELLE
SC.push({ i: 212, cam: [[212, 1, 540, 1000], [217, 1.0, 540, 1000], [219, 1.3, 760, 980], [223, 1.35, 330, 1050]], draw(t) {
  lockers(t); const k = eOut(seg(t, w(219), w(222)));
  perso('toi', 300, 1500, .92, t, { expr: t > w(223) ? 'smug' : 'neutral', talk: t > w(223) ? .8 : 0, look: [1, 0] });
  perso('nouvelle', lerp(1150, 760, k), 1480, .95, t, { expr: 'neutral', flip: true, bob: k < 1 ? 1.2 : 0, look: [-1, 0] });
  if (t > w(219)) pill('NOUVELLE ÉLÈVE', 760, 480, 40, '#7b4bd6', '#fff', { sc: popIn(w(220), t) });
  bubble('Je suis un prince.', 340, 780, 54, w(224), t, { tail: -1 });
  pill('JEUDI', W / 2, 200, 54, '#ffd23f', OUT, { sc: popIn(w(217), t) });
}});
// 9. « JE NE TE CROIS PAS »
const NB = ['Je', 'ne', 'te', 'crois', 'pas.'];
SC.push({ i: 230, cam: [[230, 1.1, 640, 1100], [233, 1.25, 720, 1050], [238, 1.1, 600, 1080], [242, 1.4, 300, 1050]], draw(t) {
  lockers(t); perso('toi', 290, 2050, 1.55, t, { expr: t > w(242) ? 'shock' : 'smug', sweat: t > w(242) });
  perso('nouvelle', 760, 2030, 1.55, t, { expr: t > w(233) ? 'smug' : 'neutral', flip: true, talk: t > w(238) && t < we(242) ? .6 : 0, look: [-1, 0], eyeCol: t > w(238) ? '#7b4bd6' : OUT });
  const n = NB.filter((_, j) => t > w(238 + j)).length; if (n) bubble(NB.slice(0, n).join(' '), 600, 640, 64, w(238), t, { tail: 1, bg: '#efe6ff' });
}});
// 10. LA PREMIÈRE
SC.push({ i: 243, cam: [[243, 1.2, 540, 900], [247, 1.0, 540, 960], [253, 1.0, 540, 960]], draw(t) {
  sky('#0a0612', '#1e1030'); const end = t > w(253);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * .25; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .1; g.fillStyle = '#9b6bff'; g.beginPath(); g.moveTo(W / 2, 800); g.arc(W / 2, 800, 1500, a, a + .1); g.fill(); g.restore(); }
  glow(W / 2, 800, 500, 'rgba(155,107,255,.6)');
  if (!end) { perso('nouvelle', W / 2, 1700, 1.25, t, { expr: 'smug', eyeCol: '#7b4bd6' }); glow(W / 2 - 50, 1110, 90, 'rgba(170,120,255,1)'); glow(W / 2 + 50, 1110, 90, 'rgba(170,120,255,1)');
    txt('LA PREMIÈRE', W / 2, 260, 90, '#fff', { stroke: OUT, sw: 14, glow: '#9b6bff' }); txt('QUI NE TE CROIT PAS', W / 2, 360, 58, '#c9a8ff', { stroke: OUT, sw: 12 }); }
  else { const s = popIn(w(253), t); g.save(); g.translate(W / 2, 760); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#151325', 10, '#9b6bff'); txt('PARTIE 2 ?', 0, 10, 130, '#c9a8ff', { glow: '#9b6bff' }); g.restore();
    const b = popIn(w(255) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1080); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
    perso('nouvelle', 250, 1700, .8, t, { expr: 'smug', eyeCol: '#7b4bd6' }); perso('toi', 830, 1700, .8, t, { expr: 'shock', sweat: true, flip: true }); }
}});
