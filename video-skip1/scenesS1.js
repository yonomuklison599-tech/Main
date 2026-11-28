// ================================================================ SÉRIE « PASSER » — PARTIE 1
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
// 0. ROULETTE
SC.push({ i: 0, cam: [[0, 1, 540, 960], [12, 1.08, 540, 940], [16, 1.0, 540, 960]], draw(t) {
  sky('#05101a', '#0a1a2a'); const { p, TL } = roulS(t), landed = t >= TL, fiche = seg(t, w(16) - .1, w(16) + .4);
  g.save(); g.globalAlpha = 1 - fiche; pill('NOUVELLE SÉRIE', W / 2, 170, 40, '#5ae0ff', OUT); txt('LA ROULETTE', W / 2, 290, 92, '#fff', { glow: '#5ae0ff', blur: 40 }); txt('DES POUVOIRS', W / 2, 385, 64, '#ffd23f', { glow: '#ffd23f', blur: 30, wt: 800, ls: 10 }); pill('1 SEUL HUMAIN SUR TERRE', W / 2, 490, 34, '#e8333a', '#fff', { sc: popIn(w(2), t) }); g.restore();
  const ci = p / SPACING, base = Math.floor(ci);
  for (let k = -3; k <= 3; k++) { const idx = base + k, x = W / 2 + (idx - ci) * SPACING; if (x < -300 || x > W + 300) continue; const near = clamp(1 - Math.abs(x - W / 2) / SPACING), ii = ((idx % NS) + NS) % NS;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.08 + .22 * near) * (1 - fiche); g.fillStyle = lg(0, 560, 0, 1250, ['rgba(200,240,255,.9)', 'rgba(200,240,255,0)']); g.beginPath(); g.moveTo(x - 30, 560); g.lineTo(x + 30, 560); g.lineTo(x + 190, 1250); g.lineTo(x - 190, 1250); g.closePath(); g.fill(); g.restore();
    const isT = landed && ii === TS; g.save(); g.globalAlpha = 1 - fiche * (isT ? 0 : 1); if (!(isT && fiche > 0)) card(ii, x, 960, .92 + .1 * near, isT ? 1 : 0, t); g.restore(); }
  g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 25; g.fillStyle = '#ff3b3b'; g.fillRect(W / 2 - 4, 600, 8, 720); g.restore();
  if (landed && t < TL + .5) { g.save(); g.globalAlpha = 1 - (t - TL) / .5; g.fillStyle = '#e8fbff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (fiche > 0) { g.save(); g.globalAlpha = fiche * .75; g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); g.restore(); glow(W / 2, 860, 600, 'rgba(90,224,255,.45)', fiche); card(TS, W / 2, 860, lerp(.92, 1.55, eOut(fiche)), 1, t);
    txt('PASSER', W / 2, 200, 120, '#5ae0ff', { stroke: OUT, sw: 16, glow: '#00c8ff' }); txt('LES MOMENTS ENNUYEUX', W / 2, 300, 50, '#fff', { stroke: OUT, sw: 10 }); pill('LÉGENDAIRE', W / 2, 1260, 46, '#ffd23f', OUT, { sc: popIn(w(17), t) }); }
}});
// 1. COMME UNE PUB YOUTUBE
SC.push({ i: 20, cam: [[20, 1, 540, 960], [25, 1.25, 700, 1000]], draw(t) {
  sky('#111', '#1d1d1d'); rr(60, 520, 960, 560, 16); fillStroke('#000', 8, '#333'); g.save(); rr(60, 520, 960, 560, 16); g.clip(); g.fillStyle = lg(0, 520, 0, 1080, ['#ff9f5a', '#e8333a']); g.fillRect(60, 520, 960, 560); txt('PUB', 540, 760, 160, 'rgba(255,255,255,.8)'); txt('ACHÈTE CE YAOURT', 540, 900, 50, '#fff'); g.restore();
  ytBar(90, 1040, 900, seg(t, w(20), w(27))); const s = popIn(w(25), t); g.save(); g.translate(840, 960); g.scale(s, s); rr(-150, -40, 300, 80, 6); fillStroke('rgba(0,0,0,.75)', 4, '#fff'); txt('Passer  ⏭', 0, 2, 40, '#fff', { wt: 800 }); g.restore();
  if (t > w(26)) { const k = seg(t, w(26), w(27)); g.save(); g.translate(lerp(1100, 860, k), lerp(1400, 990, k)); circ(0, 0, 50); fillStroke(SKIN.a, 7); g.restore(); }
  skipFx(w(27), t);
}});
// 2. LUNDI 8H → RÉCRÉ
SC.push({ i: 28, cam: [[28, 1, 540, 1000], [31, 1.3, 300, 1050], [35, 1.0, 540, 960]], draw(t) {
  const sk = t > w(34);
  if (!sk) { classroom(t); perso('prof', 760, 1450, .95, t, { expr: 'neutral', flip: true, talk: .5 }); perso('toi', 300, 1480, .9, t, { expr: 'sad', blink: (t % 1.5) < .5 ? .3 : 1 }); digital('LUN 08:00', W / 2, 220, 70, '#ff4d4d'); txt('zzz', 400, 880, 70, '#fff', { stroke: OUT, sw: 10 }); }
  else { sky('#9fd8ff', '#dff2ff'); floor(1250, '#c8a070'); rr(700, 700, 30, 560, 8); fillStroke('#888', 5); rr(620, 640, 190, 120, 8); fillStroke('#fff', 6); circ(715, 780, 36); g.lineWidth = 6; g.strokeStyle = '#e8333a'; g.stroke();
    perso('toi', 330, 1500, .95, t, { expr: 'happy', arms: 'up', bob: 1.5 }); perso('pote', 760, 1490, .9, t, { expr: 'laugh', flip: true, arms: 'wave' }); digital('LUN 10:15', W / 2, 220, 70, '#2ecc71'); pill('RÉCRÉ', W / 2, 360, 56, '#2ecc71', '#fff', { sc: popIn(w(39), t) }); }
  skipFx(w(34), t);
}});
// 3. DENTISTE / BUS / MCDO
SC.push({ i: 42, cam: [[42, 1, 540, 980], [45, 1, 540, 980], [48, 1, 540, 980]], draw(t) {
  const ph = t < w(44) ? 0 : t < w(45) ? 9 : t < w(47) ? 1 : t < w(48) ? 9 : t < w(52) ? 2 : 9;
  if (ph === 0 || (ph === 9 && t < w(45))) { sky('#eaf7f6', '#cfe9e6'); floor(1300, '#bcd'); rr(260, 1050, 560, 120, 40); fillStroke('#5ab0a0', 8); perso('dentiste', 800, 1450, .9, t, { expr: 'smile', flip: true, arms: 'point' }); perso('toi', 380, 1400, .8, t, { expr: 'shock', sweat: true, tilt: -.3 }); pill('DENTISTE', W / 2, 300, 56, '#5ab0a0', '#fff'); }
  else if (ph === 1 || (ph === 9 && t < w(48))) { sky('#c9d9ea', '#9fb4cc'); rr(60, 700, 960, 520, 40); fillStroke('#ffd23f', 8); for (let i = 0; i < 4; i++) { rr(110 + i * 230, 780, 190, 170, 14); fillStroke('#bfe6ff', 6); } perso('toi', 330, 1150, .55, t, { expr: 'sad' }); circ(250, 1230, 60); fillStroke('#222', 8); circ(830, 1230, 60); fillStroke('#222', 8); pill('BUS • 45 MIN', W / 2, 300, 56, '#e8333a', '#fff'); }
  else { sky('#ffcf5a', '#ff9f3a'); floor(1300, '#d9c0a0'); for (let i = 0; i < 6; i++) perso(['pote', 'mamie', 'joueur1', 'joueur2', 'joueur3', 'toi'][i], 900 - i * 140, 1450, .55, t, { expr: i === 5 ? 'sad' : 'neutral', flip: true }); pill('QUEUE • 30 MIN', W / 2, 300, 56, '#e8333a', '#fff'); }
  skipFx(w(44), t); skipFx(w(47), t); skipFx(w(52), t);
}});
// 4. LE BEST-OF
SC.push({ i: 53, cam: [[53, 1, 540, 960], [62, 1.1, 540, 960], [64, 1.1, 540, 960], [66, 1.1, 540, 960]], draw(t) {
  const ph = t < w(62) ? 0 : t < w(64) ? 1 : t < w(66) ? 2 : 3;
  if (ph === 0) { sky('#120a20', '#2a1040'); txt('BEST-OF', W / 2, 800, 180 * popIn(w(56), t), '#ffd23f', { stroke: OUT, sw: 20, glow: '#ff9f1a' }); txt('DE TA VIE', W / 2, 960, 80, '#fff', { stroke: OUT, sw: 14 }); for (let i = 0; i < 5; i++) txt('★', 200 + i * 170, 1150 + Math.sin(t * 4 + i) * 20, 70, '#ffd23f'); }
  if (ph === 1) { sky('#1a0a2a', '#3a1050'); for (let i = 0; i < 8; i++) glow(hash(i) * W, 300 + hash(i + 1) * 600, 200, ['rgba(255,60,200,.6)', 'rgba(60,200,255,.6)', 'rgba(255,220,60,.6)'][i % 3]); floor(1300, '#2a1a3a'); ['toi', 'pote', 'fille', 'joueur3'].forEach((id, i) => perso(id, 180 + i * 240, 1480, .7, t, { expr: 'laugh', arms: 'up', bob: 2.5 })); pill('SOIRÉES', W / 2, 300, 60, '#ff6bd6', '#fff'); }
  if (ph === 2) { sky('#6fb8ff', '#bfe6ff'); floor(1200, '#3a9a4a'); for (let i = 0; i < 5; i++) { g.fillStyle = '#fff'; g.fillRect(0, 1200 + i * 140, W, 6); } rr(380, 700, 320, 220, 6); g.lineWidth = 12; g.strokeStyle = '#fff'; g.stroke(); circ(540, 820, 40); fillStroke('#fff', 6); perso('toi', 330, 1520, .9, t, { expr: 'happy', arms: 'up' }); txt('BUUUT !', 700, 500, 100, '#ffd23f', { stroke: OUT, sw: 16 }); pill('MATCHS', W / 2, 300, 60, '#2ecc71', '#fff'); }
  if (ph === 3) { sky('#5ac8ff', '#bfefff'); glow(820, 380, 300, 'rgba(255,240,150,.9)'); circ(820, 380, 100); fillStroke('#ffd23f', 0); rr(-50, 1000, 1200, 300, 0); fillStroke('#2a8ad8', 0); floor(1250, '#f4d9a0'); perso('toi', W / 2, 1520, .95, t, { expr: 'smug', arms: 'hips', glasses: 2 }); pill('VACANCES', W / 2, 300, 60, '#ff9f5a', OUT); }
}});
// 5. LE BAC
SC.push({ i: 68, cam: [[68, 1, 540, 960], [70, 1.2, 540, 900], [75, 1.0, 540, 960], [81, 1.2, 540, 800], [84, 1.0, 540, 960]], draw(t) {
  if (t < w(75)) { sky('#2a2a3a', '#1a1a26'); floor(1300, '#3a3048'); for (let i = 0; i < 14; i++) { rr(330 + (i % 2) * 20, 1250 - i * 60, 420, 56, 6); fillStroke(['#e8333a', '#2a64d8', '#ffd23f', '#2ecc71'][i % 4], 5); } pill('RÉVISIONS • 200 H', W / 2, 300, 56, '#e8333a', '#fff'); skipFx(w(71), t); return; }
  sky('#e9eef7', '#c9d4e8'); floor(1300, '#9aa4b8'); rr(200, 420, 680, 600, 12); fillStroke('#fff', 8); txt('RÉSULTATS DU BAC', 540, 490, 46, OUT);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(260, 560 + i * 60, 560, 26); } if (t > w(80)) { rr(250, 900, 580, 80, 10); fillStroke('#ffd23f', 6); txt('TOI • MENTION TRÈS BIEN', 540, 942, 36, OUT); }
  perso('toi', 330, 1560, .9, t, { expr: t > w(81) ? 'happy' : 'neutral', arms: t > w(81) ? 'up' : 'down' }); if (t > w(84)) { perso('prof', 780, 1540, .85, t, { expr: 'shock', flip: true }); txt('?', 900, 1000, 120, '#fff', { stroke: OUT, sw: 14 }); }
  if (t > w(81)) for (let i = 0; i < 40; i++) { const k = t - w(81); g.fillStyle = ['#ffd23f', '#e8333a', '#2a64d8', '#2ecc71'][i % 4]; g.fillRect(hash(i) * W, -50 + ((k * (300 + hash(i + 1) * 400) + hash(i + 2) * 600) % 1700), 16, 26); }
}});
// 6. LE BIP
SC.push({ i: 88, cam: [[88, 1, 540, 960], [96, 1.2, 540, 900], [104, 1.5, 540, 960], [106, 1.0, 540, 960]], draw(t) {
  sky('#04060a', '#0a1018'); const k = seg(t, w(104), w(110));
  perso('toi', W / 2, 1600, 1.0, t, { expr: t > w(105) ? 'shock' : 'neutral', look: [0, -1] });
  g.beginPath(); for (let x = 0; x <= W; x += 6) { const ph = ((x / W) * 3 + t * .8) % 1; const y = 820 - (Math.abs(ph - .5) < .02 ? 220 * k : Math.abs(ph - .53) < .02 ? -90 * k : 0); g.lineTo(x, y); } g.lineWidth = 8; g.strokeStyle = `rgba(80,255,140,${.2 + .8 * k})`; g.shadowColor = '#50ff8c'; g.shadowBlur = 20; g.stroke(); g.shadowBlur = 0;
  if (t > w(105)) txt('BIP.', W / 2, 560, 160 * popIn(w(105), t), '#50ff8c', { glow: '#50ff8c', blur: 40 });
  if (t < w(104)) txt('DÉTAILS BIZARRES', W / 2, 300, 66, '#fff', { stroke: OUT, sw: 12 });
}});
// 7. LA VOIX DE TA MÈRE
SC.push({ i: 111, cam: [[111, 1, 540, 960], [116, 1.15, 540, 900], [122, 1.3, 540, 760]], draw(t) {
  sky('#f4f6fa', '#d8dee8'); glow(W / 2, 140, 700, 'rgba(255,255,255,1)'); rr(240, 80, 600, 60, 30); fillStroke('#fff', 0);
  g.save(); g.filter = 'blur(14px)'; g.globalAlpha = .85; perso('mere', W / 2, 1650, 1.2, t, { expr: 'sad', arms: 'cards', look: [0, 1] }); rr(390, 1020, 300, 200, 10); fillStroke('#c96b3a', 6); g.restore();
  g.save(); g.globalAlpha = .35; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore();
  if (t > w(122)) { g.save(); g.globalAlpha = clamp((t - w(122)) / .5) * .9; txt('« Il était une fois...', W / 2, 560, 54, '#4a5a7a', { wt: 800 }); txt('un garçon qui dormait... »', W / 2, 640, 54, '#4a5a7a', { wt: 800 }); g.restore(); }
}});
// 8. L'ANNIVERSAIRE OUBLIÉ
SC.push({ i: 131, cam: [[131, 1, 540, 1000], [137, 1.3, 760, 980], [144, 1.3, 330, 1050], [148, 1.0, 540, 960]], draw(t) {
  sky('#4a3a6a', '#2a2040'); floor(1300, '#3a3050'); lampLight(540, 500, 900, 'rgba(160,140,255,.25)');
  perso('toi', 330, 1500, .92, t, { expr: t > w(144) ? 'shock' : 'neutral', look: [1, 0], sweat: t > w(145) }); perso('pote', 760, 1490, .92, t, { expr: t > w(144) ? 'sad' : 'neutral', flip: true, look: [-1, 0], talk: t > w(137) && t < w(144) ? .7 : 0 });
  g.save(); g.translate(760, 990); g.beginPath(); g.moveTo(-40, 0); g.lineTo(0, -110); g.lineTo(40, 0); g.closePath(); fillStroke('#ff6bd6', 5); circ(0, -110, 14); fillStroke('#ffd23f', 4); g.restore();
  bubble('Tu te souviens\nde mon anniv ?', 760, 700, 50, w(138), t, { tail: 1, t1: w(147) });
  if (t > w(148)) { rr(240, 400, 600, 300, 20); fillStroke('#fff', 8); txt('ANNIV DE TON POTE', 540, 470, 40, OUT); txt('⏭ PASSÉ', 540, 560, 70, '#e8333a'); txt('IL Y A 6 MOIS', 540, 640, 46, '#888'); }
}});
// 9. LA DATE
SC.push({ i: 154, cam: [[154, 1, 540, 960], [158, 1.3, 540, 820], [160, 1.0, 540, 960]], draw(t) {
  sky('#0b1020', '#16223f'); g.save(); g.translate(W / 2, 900); rr(-260, -480, 520, 960, 60); fillStroke('#111', 10, '#333'); rr(-235, -455, 470, 910, 40); fillStroke(lg(0, -455, 0, 455, ['#1a3a8a', '#5a2a8a']), 0);
  const k = seg(t, w(158), w(163)); const yr = Math.floor(2026 + k * k * 9); txt(String(yr), 0, -260, 140, '#fff', { glow: '#7ac8ff' }); txt('SAMEDI 14 MARS', 0, -150, 40, '#cfe0ff', { wt: 800 }); txt(`${12 + Math.floor(k * 7)}:${String(Math.floor(t * 60) % 60).padStart(2, '0')}`, 0, -40, 70, '#fff'); g.restore();
  if (t > w(162)) stamp('+ 9 ANS', W / 2, 1500, 110, '#ff2a4a', w(163), t);
}});
// 10. LE MIROIR
SC.push({ i: 169, cam: [[169, 1, 540, 960], [172, 1.25, 540, 900], [175, 1.6, 540, 760]], draw(t) {
  sky('#cfd9e0', '#9fb0ba'); for (let i = 0; i < 10; i++) for (let j = 0; j < 16; j++) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 3; g.strokeRect(i * 108, j * 120, 108, 120); }
  rr(190, 260, 700, 1000, 40); fillStroke('#d0c8b8', 14, '#6b5a4a'); g.save(); rr(210, 280, 660, 960, 30); g.clip(); g.fillStyle = lg(0, 280, 0, 1240, ['#e6f2f8', '#b8ccd8']); g.fillRect(210, 280, 660, 960);
  perso('toi', W / 2, 1700, 1.25, t, { expr: t > w(173) ? 'shock' : 'neutral', beard: t > w(173), sweat: t > w(175) }); g.globalAlpha = .25; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(260, 280); g.lineTo(420, 280); g.lineTo(260, 700); g.closePath(); g.fill(); g.restore();
  if (t > w(175)) stamp('UNE BARBE', W / 2, 1380, 90, '#ff2a4a', w(176), t);
}});
// 11. PARTIE 2 ?
SC.push({ i: 177, cam: [[177, 1.2, 540, 900], [184, 1.0, 540, 960]], draw(t) {
  sky('#04060a', '#0a1018'); g.beginPath(); for (let x = 0; x <= W; x += 6) { const ph = ((x / W) * 3 + t * .8) % 1; g.lineTo(x, 1400 - (Math.abs(ph - .5) < .02 ? 140 : Math.abs(ph - .53) < .02 ? -60 : 0)); } g.lineWidth = 6; g.strokeStyle = 'rgba(80,255,140,.5)'; g.stroke();
  if (t < w(184)) { txt('COMBIEN DE TEMPS', W / 2, 700, 80, '#fff', { stroke: OUT, sw: 14 }); txt('AS-TU SAUTÉ ?', W / 2, 820, 96, '#5ae0ff', { stroke: OUT, sw: 16, glow: '#00c8ff' }); return; }
  const s = popIn(w(184), t); g.save(); g.translate(W / 2, 760); g.scale(s, s); rr(-380, -150, 760, 300, 40); fillStroke('#0a1a2a', 10, '#5ae0ff'); txt('PARTIE 2 ?', 0, 10, 130, '#5ae0ff', { glow: '#00c8ff' }); g.restore();
  const b = popIn(w(186) - .2, t) * (1 + .06 * Math.sin(t * 10)); g.save(); g.translate(W / 2, 1080); g.scale(b, b); rr(-280, -70, 560, 140, 70); fillStroke('#fe2c55', 8, '#fff'); txt('ABONNE-TOI', 0, 4, 64, '#fff'); g.restore();
}});
