
// ---------------------------------------------------------------- chronologie
const w = i => CAP[Math.min(i, CAP.length - 1)].t + VO, we = i => CAP[Math.min(i, CAP.length - 1)].e + VO;
const freeBadge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(1), depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); freeBadge.scale.set(1.6, .8, 1); freeBadge.renderOrder = 10; freeBadge.layers.set(1); scene.add(freeBadge);
let SEPIA = 0;
function drawECG(t, fast = 1) { const c = ECG.image.getContext('2d'); c.fillStyle = '#04120a'; c.fillRect(0, 0, 512, 256); c.strokeStyle = 'rgba(80,255,140,.15)'; c.lineWidth = 1; for (let x = 0; x < 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
  c.beginPath(); for (let x = 0; x <= 512; x += 3) { const ph = ((x / 512) * 3 - t * .9 * fast) % 1, p = (ph + 1) % 1; c.lineTo(x, 150 - (Math.abs(p - .5) < .018 ? 100 : Math.abs(p - .53) < .015 ? -40 : 0)); } c.strokeStyle = '#50ff8c'; c.lineWidth = 5; c.shadowColor = '#50ff8c'; c.shadowBlur = 12; c.stroke(); c.shadowBlur = 0;
  c.fillStyle = '#50ff8c'; c.font = "900 40px 'Inter Display'"; c.fillText('♥ 58', 380, 50); ECG.needsUpdate = true; }
function crowd(list, t, pts, opts = {}) { list.forEach((ch, i) => { const p = pts[i]; if (!p) return; place2(ch, p[0], p[1], p[2], p[3] || 0); setFace2(ch, p[5] || 'smile', false, t); pose2(ch, p[4] || 'idle', t + i * .7); setBadge(ch, p[6] ?? null, p[7] || 1); }); }
function update(t) {
  ALL2.forEach(c => { c.visible = false; c.scale.setScalar(1); setBadge(c, null); }); PROPS.forEach(p => p.visible = false); bebe.visible = false; photo.visible = false; freeBadge.visible = false; FINGERS.forEach(f => f.rotation.set(0, 0, 0)); SEPIA = 0; setThread(null, null, 0);
  const S = (a, b) => t >= w(a) - .05 && t < w(b) - .05;
  drawECG(t, t > w(357) ? 1.4 : 1);
  // A. intro : la rue, tout le monde a un compteur
  if (S(0, 24)) { const k = t; crowd(EXTRAS, t, [[-12 + k * 1.2, .3, 5, Math.PI / 2, 'walk', 'smile', 12], [-6 + k * 1.1, .3, 6.2, Math.PI / 2, 'walk', 'neutral', 57], [4 - k * 1.0, .3, 5.3, -Math.PI / 2, 'walk', 'smile', 3], [10 - k * 1.1, .3, 6.3, -Math.PI / 2, 'walk', 'happy', 140], [-2, .3, 4.9, 0, 'phone', 'neutral', 8], [2.5, .3, 5.2, -.3, 'idle', 'smile', 26]]);
    EXTRAS[4].userData.hands[1]; }
  // B. la star (312), le prof (40), la boulangère (80)
  if (S(24, 31)) { const H_ = HALL; place2(star, H_.x, 0, -1, 0); setFace2(star, 'smile', false, t); pose2(star, 'phone', t); starPhone.visible = true; setBadge(star, 312, 1.1);
    crowd(EXTRAS.slice(0, 4), t, [[H_.x - 4, 0, 1, .5, 'idle', 'love', 9], [H_.x + 4, 0, 1.2, -.5, 'idle', 'love', 22], [H_.x - 6.5, 0, -2.5, .8, 'idle', 'smile', 4], [H_.x + 6.5, 0, -2.2, -.8, 'idle', 'love', 15]]); }
  if (S(31, 36)) { const F_ = FIELD; place2(prof, F_.x, .2, F_.z - 6, 0); setFace2(prof, 'focus', false, t); pose2(prof, 'whistle', t); setBadge(prof, 40, 1.1); crowd(EXTRAS.slice(0, 3), t, [[F_.x - 6 + (t * 3) % 12, .2, F_.z - 12, Math.PI / 2, 'walk', 'worried', 7], [F_.x - 2 + (t * 3) % 12, .2, F_.z - 14, Math.PI / 2, 'walk', 'worried', 11], [F_.x + 2 + (t * 3) % 12, .2, F_.z - 13, Math.PI / 2, 'walk', 'worried', 5]]); }
  if (S(36, 43)) { const B_ = BAKE; place2(boul, B_.x, 0, -.6, 0); setFace2(boul, 'happy', false, t); pose2(boul, 'tray', t); boulTray.visible = true; setBadge(boul, 80, 1.1); crowd(EXTRAS.slice(2, 5), t, [[B_.x - 4.5, 0, 2.5, -2.4, 'idle', 'love', 6], [B_.x + 4.5, 0, 2.8, 2.4, 'idle', 'smile', 14], [B_.x + 6.5, 0, .5, 2.0, 'idle', 'love', 3]]); }
  // C. Malo : 1, toujours 1
  if (S(43, 48)) { const H_ = HALL; const k = seg(t, w(43), w(48)); place2(malo, H_.x + lerp(4, -1, k), 0, 0, -.25); setFace2(malo, t > w(46) ? 'sad' : 'neutral', false, t); pose2(malo, t > w(44) && t < w(46) ? 'lookUp' : 'sadWalk', t); setBadge(malo, 1, 1.05);
    crowd(EXTRAS.slice(0, 4), t, [[H_.x - 8 + (t * 4) % 16, 0, 2.5, Math.PI / 2, 'walk', 'happy', 63], [H_.x + 8 - (t * 4) % 16, 0, -3, -Math.PI / 2, 'walk', 'smile', 120], [H_.x - 6, 0, -3.5, .3, 'idle', 'laugh', 48], [H_.x - 4.5, 0, -3.8, -.3, 'idle', 'smile', 35]]); }
  if (S(48, 100)) { SEPIA = .8; bebe.visible = true; bebe.position.set(NURS.x, 2.4, NURS.z - 2.6); bebe.rotation.y = 0; freeBadge.visible = true; freeBadge.position.set(NURS.x, 4.6, NURS.z - 2); freeBadge.material.map = badgeTex(1); }
  if (S(100, 106)) { const K_ = KIT; cake.visible = true; cake.position.set(K_.x, 2.75, -1.6); place2(malo, K_.x, 0, .4, Math.PI); malo.rotation.y = Math.PI; place2(malo, K_.x, 0, 1.3, Math.PI); setFace2(malo, t > w(105) ? 'sad' : 'tender', false, t); pose2(malo, 'sit', t); setBadge(malo, 1, 1.1); malo.rotation.y = Math.PI; }
  if (S(106, 112)) { const F_ = FIELD; place2(malo, F_.x - 1.4, .2, F_.z - 9, Math.PI); setFace2(malo, t > w(109) ? 'happy' : 'focus', false, t); pose2(malo, t < w(109) ? 'kick' : 'cheer', t); setBadge(malo, 1, 1.1); ballMesh.visible = true;
    const k = seg(t, w(108), w(109) + .3); ballMesh.position.set(F_.x - 1 + k * 1, .7 + Math.sin(k * Math.PI) * 2.5, F_.z - 10 - k * 12.5); ballMesh.rotation.set(t * 9, t * 4, 0);
    crowd(EXTRAS.slice(0, 2), t, [[F_.x + 5, .2, F_.z - 6, -2.5, 'idle', 'neutral', 30], [F_.x - 6, .2, F_.z - 5, 2.5, 'phone', 'neutral', 18]]); }
  if (S(112, 120)) { const F_ = FIELD; place2(malo, F_.x - 18, .2, F_.z + 7.4, Math.PI); malo.rotation.y = 0; setFace2(malo, 'cry', false, t); pose2(malo, 'castSit', t); maloCast.visible = true; setBadge(malo, 1, 1.1); }
  // D. qui est ce 1 ?
  if (S(120, 131)) { const B_ = BED; place2(malo, B_.x - 2.6, 0, -3.2, 0); malo.rotation.y = Math.PI; setFace2(malo, t > w(126) ? 'focus' : 'sad', false, t); pose2(malo, t > w(126) ? 'think' : 'headInHands', t); maloCast.visible = true; setBadge(malo, 1, 1.15); malo.rotation.y = Math.PI * 0; place2(malo, B_.x - 2.6, 0, -3.4, 0); }
  if (S(131, 138)) { const K_ = KIT; place2(mere, K_.x, 0, .2, Math.PI); mere.rotation.y = 0; place2(mere, K_.x + 1.5, 0, -.2, -.3); setFace2(mere, 'worried', false, t); pose2(mere, 'bills', t); mereBills.visible = true; setBadge(mere, 4, 1.1); }
  if (S(138, 148)) { const H_ = HALL; place2(pote, H_.x - 1.5, 0, -1, .25); setFace2(pote, 'love', false, t); pose2(pote, 'phone2', t); potePhone.visible = true; setBadge(pote, 31, 1.05); }
  if (S(148, 157)) { const H_ = HALL; place2(crush, H_.x + 1.5, 0, -1.2, -.35); setFace2(crush, t > w(152) ? 'smug' : 'neutral', t > w(150) && t < w(155), t); pose2(crush, 'whisper', t); setBadge(crush, 74, 1.05); place2(amie, H_.x + 3.8, 0, -1.8, -.8); setFace2(amie, 'laugh', false, t); pose2(amie, 'crossed', t); setBadge(amie, 52, 1);
    place2(malo, H_.x - 4.5, 0, 1.2, .6); setFace2(malo, 'sad', false, t); pose2(malo, 'castStand', t); maloCast.visible = true; setBadge(malo, 1, 1); }
  // E. l'hôpital
  if (S(208, 221)) { const H_ = HOSP; const k = seg(t, w(208), w(221)); place2(malo, H_.x + .5, 0, lerp(-16, 4, k), 0); setFace2(malo, t > w(216) ? 'worried' : 'neutral', false, t); pose2(malo, 'walk', t * .8); maloCast.visible = true; setBadge(malo, 1, 1); }
  if (t >= w(221) - .05) { drawECG(t); }
  if (S(221, 265) || S(295, 347) || (t >= w(347) - .05)) { const C_ = CH7; place2(pere, C_.x + 1.5, 2.45, C_.z - 3.0, 0); pose2(pere, 'lie', t); setFace2(pere, 'sleep', false, t); const n = t > w(363) ? 1 : 0; if (t >= w(252) - .05) { pere.updateMatrixWorld(true); freeBadge.visible = true; freeBadge.material.map = badgeTex(n); const sc_ = t > w(363) ? 1 + .35 * Math.max(0, 1 - (t - w(363)) / .3) : 1; freeBadge.scale.set(1.0 * sc_, .5 * sc_, 1); freeBadge.position.copy(pere.userData.hd.getWorldPosition(V(0, 0, 0))).add(V(0, .5, -1.05)); } }
  if (S(221, 265)) { const C_ = CH7; if (t < w(252)) { place2(malo, C_.x - 3, 0, C_.z + 5, Math.PI - .4); malo.rotation.y = Math.PI - .6; setFace2(malo, t > w(225) ? 'shock' : 'worried', false, t); pose2(malo, 'castStand', t); maloCast.visible = true; } }
  if (S(265, 284)) { const C_ = CH7; photo.visible = true; const flip = ease(seg(t, w(276) - .3, w(276) + .3)); photo.position.set(C_.x - 2.6, 3.95, C_.z - 4.5); photo.rotation.set(-.12, flip * Math.PI, 0); }
  if (S(284, 295)) { SEPIA = .85; const K_ = KIT; place2(mere, K_.x + 1.5, 0, -.5, -.4); setFace2(mere, 'sad', t > w(284) && t < we(294), t); pose2(mere, 'crossed', t); const kid = malo; place2(kid, K_.x - 1.6, 0, 1.2, .6); kid.scale.setScalar(.72); setFace2(kid, 'sad', false, t); pose2(kid, 'idle', t); }
  if (S(343, 347) || (t >= w(347) - .05)) { const C_ = CH7; const sitting = t >= w(347) - .05; place2(malo, C_.x - 1.75, .3, C_.z - 2.65, Math.PI / 2); if (!sitting) { place2(malo, C_.x - 3.2, 0, C_.z + 2.6, Math.PI - .6); }
    setFace2(malo, t > w(351) ? 'cry' : sitting ? 'tender' : 'shock', false, t); pose2(malo, sitting ? 'sitReach' : 'castStand', t); maloCast.visible = true; setBadge(malo, 1, 1.15 + (t < w(347) ? .25 * Math.abs(Math.sin(t * 5)) : 0));
    const pb = pere.userData.hd.getWorldPosition(V(0, 0, 0)); malo.updateMatrixWorld(true); const mb = malo.userData.badge.getWorldPosition(V(0, 0, 0)); setThread(pb.add(V(0, .3, 0)), mb, seg(t, w(343) - .1, w(345)) * (t > w(357) ? 0 : 1));
    if (t > w(365) - .05) { const k = Math.sin((t - w(365)) * 9); FINGERS.forEach((f, i) => f.rotation.x = -Math.max(0, Math.sin((t - w(365)) * 7 - i * .5)) * .9); } }
  if (S(295, 343)) { /* père en gros plan, pense à son fils */ }
  // ===== INSERTS (version longue)
  const clearAll = () => { ALL2.forEach(c => { c.visible = false; setBadge(c, null); }); PROPS.forEach(p => p.visible = false); photo.visible = false; freeBadge.visible = false; cake.visible = false; setThread(null, null, 0); };
  // I1. « Monsieur Un » : moqueries, vidéo de danse, 2 pendant 3 secondes
  if (S(52, 100)) { clearAll(); const H_ = HALL;
    if (t < w(68)) { const k = seg(t, w(52), w(68)); place2(malo, H_.x + lerp(3, -1, k), 0, .2, -.3); setFace2(malo, 'sad', false, t); pose2(malo, 'sadWalk', t); setBadge(malo, 1, 1.05);
      crowd(EXTRAS.slice(0, 5), t, [[H_.x - 5, 0, -2.5, .6, t > w(58) ? 'mock' : 'idle', t > w(60) ? 'laugh' : 'smug', 41], [H_.x - 3, 0, -3.4, .3, 'mock', 'laugh', 27], [H_.x + 5, 0, -2.6, -.6, 'mock', 'laugh', 66], [H_.x + 6.8, 0, -1.2, -.9, 'idle', 'smug', 19], [H_.x - 7, 0, -.8, .9, 'idle', 'laugh', 33]]); }
    else if (t < w(86)) { const K_ = BED; place2(malo, K_.x - .5, 0, -3, 0); setFace2(malo, t > w(80) ? 'happy' : 'smile', false, t); pose2(malo, t > w(80) ? 'dance' : 'idle', t); setBadge(malo, 1, 1.05); }
    else { place2(pote, H_.x - 2.5, 0, -1, .4); setFace2(pote, 'laugh', false, t); pose2(pote, 'phone2', t); potePhone.visible = true; setBadge(pote, 31, 1);
      crowd(EXTRAS.slice(0, 3), t, [[H_.x + 1, 0, -1.6, -.2, 'phone', 'laugh', 44], [H_.x + 3.5, 0, -1, -.6, 'mock', 'laugh', 58], [H_.x - 5.5, 0, -2.2, .7, 'mock', 'laugh', 12]]);
      place2(malo, H_.x + 1.2, 0, 2.8, Math.PI + .2); malo.rotation.y = .2; place2(malo, H_.x + 1.5, 0, 2.6, -.3); setFace2(malo, t > w(97) ? 'sad' : t > w(91) ? 'shock' : 'worried', false, t); pose2(malo, t > w(91) && t < w(97) ? 'lookUp' : 'idle', t);
      const two = t > w(94) && t < w(98) + .2; setBadge(malo, two ? 2 : 1, two ? 1.35 : 1.05); } }
  // I2. le miroir, la promesse
  if (S(157, 208)) { clearAll(); const B_ = BED;
    if (t < w(178) || t > w(198)) { place2(malo, B_.x + 4.2, 0, -3.2, -.6); setFace2(malo, t > w(198) ? 'focus' : t > w(166) ? 'sad' : 'neutral', false, t); pose2(malo, t > w(200) ? 'walk' : 'castStand', t); maloCast.visible = true; setBadge(malo, 1, t > w(166) && t < w(167) + .5 ? 1.4 : 1.1);
      if (t > w(200)) { const k = seg(t, w(200), w(208)); malo.position.x = B_.x + lerp(4.2, 0, k); malo.position.z = lerp(-3.2, 3.5, k); malo.rotation.y = -.4; } }
    else { SEPIA = .55; const F_ = FIELD; place2(malo, F_.x - 18, .2, F_.z + 7.4, 0); setFace2(malo, 'cry', false, t); pose2(malo, 'castSit', t); maloCast.visible = true; setBadge(malo, 1, 1.1); } }
  // I3. l'infirmière
  if (S(232, 252)) { const C_ = CH7; place2(infirmiere, C_.x - 2.4, 0, C_.z + 1.2, .5); setFace2(infirmiere, 'sad', t < w(242) + .2, t); pose2(infirmiere, t < w(243) ? 'whisper' : 'crossed', t); setBadge(infirmiere, 9, 1);
    place2(malo, C_.x - 4.6, 0, C_.z + 2.8, Math.PI - .9); malo.rotation.y = 2.3; setFace2(malo, 'worried', false, t); pose2(malo, 'castStand', t); maloCast.visible = true; setBadge(malo, 1, 1); }
  // I4. montage : chaque match, chaque anniversaire, chaque nuit
  if (S(316, 322)) { clearAll(); SEPIA = .35;
    if (t < w(318)) { const F_ = FIELD; place2(malo, F_.x - 1.4, .2, F_.z - 9, Math.PI); setFace2(malo, 'happy', false, t); pose2(malo, 'cheer', t); setBadge(malo, 1, 1.3); }
    else if (t < w(320)) { const K_ = KIT; cake.visible = true; cake.position.set(K_.x, 2.75, -1.6); place2(malo, K_.x, 0, 1.3, Math.PI); setFace2(malo, 'tender', false, t); pose2(malo, 'sit', t); setBadge(malo, 1, 1.3); malo.rotation.y = 0; }
    else { const B_ = BED; place2(malo, B_.x + 6, 1.1, -3.6, 0); malo.rotation.y = 0; setFace2(malo, 'sleep', false, t); pose2(malo, 'lie', t); setBadge(malo, null); freeBadge.visible = true; freeBadge.material.map = badgeTex(1); freeBadge.scale.set(1.2, .6, 1); freeBadge.position.set(B_.x + 6, 3.2, -4.2); } }
  // I5. le lendemain : la mère entre, 2 et 2
  if (t >= w(369) - .05) { clearAll(); const C_ = CH7, P_ = HOSP; drawECG(t, 1.2);
    if (t < w(376)) { const k = seg(t, w(369), w(376)); place2(malo, P_.x - .9, 0, lerp(-14, 2, k), 0); setFace2(malo, 'tender', false, t); pose2(malo, 'walk', t * .8); setBadge(malo, 1, 1); place2(mere, P_.x + 1.1, 0, lerp(-15, 1, k), 0); setFace2(mere, 'worried', false, t); pose2(mere, 'walk', t * .8); setBadge(mere, 4, 1); }
    else { place2(pere, C_.x + 1.5, 2.45, C_.z - 3.0, 0); pose2(pere, 'lie', t); setFace2(pere, 'sleep', false, t); pere.updateMatrixWorld(true);
      const entered = t > w(382); const km = seg(t, w(382), w(385));
      place2(mere, C_.x + lerp(-5.5, -1.7, km), 0, C_.z + lerp(6, -1.4, km), entered ? 2.2 : Math.PI); setFace2(mere, t > w(385) ? 'cry' : 'worried', false, t); pose2(mere, entered && km < 1 ? 'walk' : t > w(386) ? 'sitReach' : 'idle', t); if (t > w(386)) { mere.position.y = .3; mere.rotation.y = Math.PI / 2; mere.position.x = C_.x - 1.75; mere.position.z = C_.z - 2.65; }
      setBadge(mere, 4, 1); place2(malo, C_.x - 3.4, 0, C_.z - .6, Math.PI / 2); setFace2(malo, t > w(394) ? 'happy' : 'tender', false, t); pose2(malo, 'idle', t); malo.rotation.y = Math.PI / 2 - .2;
      const n2 = t > w(393) ? 2 : 1; freeBadge.visible = true; freeBadge.material.map = badgeTex(n2); const sp_ = t > w(393) ? 1 + .35 * Math.max(0, 1 - (t - w(393)) / .3) : 1; freeBadge.scale.set(sp_, .5 * sp_, 1); freeBadge.position.copy(pere.userData.hd.getWorldPosition(V(0, 0, 0))).add(V(0, .5, -1.05));
      const m2 = t > w(405) ? 2 : 1; setBadge(malo, m2, t > w(405) ? 1.3 + .4 * Math.max(0, 1 - (t - w(405)) / .35) : 1.1); } }

}
// ---------------------------------------------------------------- plans
const FR = { macro: [2.2, .2, 34], cu: [3.6, .1, 32], mcu: [5.0, .3, 36], ms: [6.4, .7, 38], fs: [9.5, 1.4, 40], ws: [20, 6, 44], grp: [12, 1.6, 40], high: [8, 7, 42] };
const SUBJ = { pereHead: () => ({ __pt: pere.userData.hd }), pereHand: () => ({ __pt: pere.userData.hands[0] }), malo: () => malo, star: () => star, prof: () => prof, boul: () => boul, mere: () => mere, pote: () => pote, crush: () => crush, pere: () => pere, e0: () => EXTRAS[0], e3: () => EXTRAS[3] };
function buildShots() {
  const S = []; const A = (i, subj, fr, yaw = 0, part, move = 'push') => S.push({ t: w(i) - .06, subj, fr, yaw, part, move, top: move === 'top' || move === 'topPush' });
  const H_ = HALL, F_ = FIELD, B_ = BAKE, K_ = KIT, C_ = CH7, P_ = HOSP, N_ = NURS, BD = BED;
  A(0, '@0,2.6,5.5,1.57', 'ws', 0, null, 'pan'); A(5, 'e3', 'ms', 40, 'body'); A(9, 'e0', 'mcu', 50); A(13, '@-2,2.5,4.9', 'mcu', 25, null, 'static'); A(18, '@2,3.2,5.2', 'grp', 0);
  A(24, 'star', 'ms', 0, 'body'); A(27, 'star', 'mcu', 10); A(31, 'prof', 'ms', 20, 'body'); A(34, 'prof', 'mcu', 0); A(36, 'boul', 'ms', 0, 'body'); A(39, 'boul', 'mcu', -10);
  A(43, 'malo', 'ms', 30, 'body'); A(45, 'malo', 'mcu', 10, null, 'static'); A(48, `@${N_.x},3.2,${N_.z - 2.4}`, 'ms', 0, null, 'push'); A(100, 'malo', 'mcu', 0); A(103, `@${K_.x},3.4,-.2`, 'grp', 0);
  A(106, 'malo', 'ms', 30, 'body'); A(109, `@${F_.x},1.8,${F_.z - 21}`, 'fs', 0, null, 'static'); A(110, 'malo', 'mcu', 20); A(112, 'malo', 'ms', 0, 'body'); A(116, 'malo', 'mcu', 0, null, 'static');
  A(120, 'malo', 'ms', 0, 'body'); A(124, 'malo', 'mcu', 15); A(127, 'malo', 'cu', 0, null, 'static');
  A(131, 'mere', 'ms', 10, 'body'); A(134, 'mere', 'mcu', 0); A(138, 'pote', 'ms', 0, 'body'); A(142, 'pote', 'mcu', 10); A(148, 'crush', 'ms', -10, 'body'); A(152, 'crush', 'mcu', 0); A(155, 'malo', 'mcu', 20);
  A(208, `@${P_.x},2.2,${P_.z + 2}`, 'fs', 0, null, 'push'); A(213, 'malo', 'ms', 0, 'body'); A(218, 'malo', 'mcu', 15);
  A(221, `@${C_.x + 1.5},2.6,${C_.z - 2}`, 'fs', 30, null, 'push'); A(225, 'malo', 'mcu', 0); A(227, 'pereHead', 'mcu', 0, null, 'topPush'); A(252, 'pereHead', 'mcu', 0, null, 'top'); A(260, 'pereHead', 'cu', 0, null, 'top');
  A(265, `@${C_.x - 2.6},3.95,${C_.z - 4.5}`, 'macro', 0, null, 'push'); A(276, `@${C_.x - 2.6},3.95,${C_.z - 4.5}`, 'macro', 0, null, 'static');
  A(284, 'mere', 'mcu', 10); A(289, 'malo', 'mcu', 20); A(295, 'pereHead', 'cu', 0, null, 'top'); A(302, 'pereHead', 'mcu', 20, null, 'topPush'); A(309, 'pereHead', 'cu', -20, null, 'top');
  A(343, 'malo', 'ms', -50, 'body', 'push'); A(347, 'malo', 'ms', 25, 'body'); A(351, 'malo', 'cu', 20, null, 'static'); A(357, 'pereHead', 'mcu', 0, null, 'topPush'); A(361, 'pereHead', 'mcu', 0, null, 'top');
  A(365, 'pereHand', 'cu', -40, null, 'top');
  A(52, 'malo', 'ms', 30, 'body'); A(58, `@${H_.x - 4},2.4,-2.8`, 'grp', 15); A(64, 'malo', 'mcu', -10, null, 'static'); A(68, `@${BD.x - .5},2.6,-3`, 'fs', 0); A(80, 'malo', 'ms', 10, 'body'); A(86, 'pote', 'mcu', 10); A(91, 'malo', 'mcu', 0, null, 'push'); A(97, 'malo', 'cu', 0, null, 'static');
  A(157, 'malo', 'ms', 20, 'body'); A(162, 'malo', 'mcu', 0, null, 'push'); A(167, 'malo', 'cu', 10, null, 'static'); A(178, 'malo', 'ms', 0, 'body'); A(184, 'malo', 'mcu', 0, null, 'static'); A(198, 'malo', 'mcu', 0, null, 'push'); A(203, 'malo', 'cu', -10, null, 'static');
  A(232, `@${C_.x - 3},2.6,${C_.z + 1.8}`, 'grp', 40); A(236, 'malo', 'mcu', 0); A(243, `@${C_.x - 2.6},3.95,${C_.z - 4.5}`, 'ms', 20, null, 'push');
  A(316, 'malo', 'mcu', 10, null, 'static'); A(318, 'malo', 'mcu', 0, null, 'static'); A(320, `@${BD.x + 6},2.4,-4`, 'ms', 0, null, 'top'); A(322, 'pereHead', 'mcu', 0, null, 'topPush');
  A(369, `@${P_.x},2.2,${P_.z + 2}`, 'fs', 0, null, 'push'); A(376, 'mere', 'ms', 0, 'body', 'push'); A(382, 'mere', 'ms', 30, 'body', 'push'); A(385, 'pereHead', 'mcu', 0, null, 'top'); A(394, 'malo', 'mcu', 0, null, 'push'); A(406, `@${C_.x - 1},2.6,${C_.z - 2.2}`, 'grp', 90, null, 'push');
  S.sort((a, b) => a.t - b.t); S[0].t = 0; return S;
}
const sizeOf = ch => Math.max(.06, ch.scale.x * ch.userData.root.scale.y / .5);
function subjectPoint(name, part) {
  if (name.startsWith('@')) { const [x, y, z, f] = name.slice(1).split(',').map(Number); return { p: V(x, y, z), face: f || 0, k: 1 }; }
  const ch = SUBJ[name](); if (ch.__pt) { pere.updateMatrixWorld(true); return { p: ch.__pt.getWorldPosition(V(0, 0, 0)), face: 0, k: .9 }; } ch.updateMatrixWorld(true);
  const p = part === 'body' ? ch.userData.torso.getWorldPosition(V(0, 0, 0)) : ch.userData.hd.getWorldPosition(V(0, 0, 0));
  return { p, face: ch.rotation.y, ch, k: sizeOf(ch) };
}
const RAY = new THREE.Raycaster();
function cameraAt(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].t <= t) i = k;
  const sh = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : END, k = seg(t, sh.t, t1);
  const sp = subjectPoint(sh.subj, sh.part), { p, face } = sp; const [D0, H0, fov] = FR[sh.fr]; const d0 = D0 * sp.k, h = H0 * sp.k;
  let d = d0 * (sh.move === 'push' || sh.move === 'topPush' ? lerp(1.06, .94, ease(k)) : 1), yaw = face + sh.yaw * Math.PI / 180 + (sh.move === 'pan' ? lerp(-.15, .15, k) : 0);
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw)); let cam = p.clone().addScaledVector(dir, d).add(V(0, h, 0)); const look = p.clone();
  if (sh.top) cam = p.clone().addScaledVector(dir, d * .42).add(V(0, d * .9, 0));
  const toCam = cam.clone().sub(look), L = toCam.length(); RAY.set(look, toCam.normalize()); RAY.far = L;
  const hit = RAY.intersectObjects(BLOCKERS, false)[0]; if (hit && hit.distance > .5) cam = look.clone().addScaledVector(toCam, Math.max(1.0, hit.distance - .4));
  cam.y = Math.max(cam.y, .4);
  const sub = sp.ch, seg3 = look.clone().sub(cam), sl = seg3.length(); seg3.normalize();
  for (const c of ALL2) { if (!c.visible || c === sub) continue; const ctr = c.userData.torso.getWorldPosition(V(0, 0, 0)), rel = ctr.clone().sub(cam), along = rel.dot(seg3); const cs = c.scale.x * c.userData.root.scale.y;
    if (along < .2 || along > sl - 1) continue; const perp = rel.addScaledVector(seg3, -along).length(); if (perp < 2.6 * cs) c.visible = false; }
  return { p: cam, c: look, f: fov };
}
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
// ---------------------------------------------------------------- habillage 2D
function pill2(s, x, y, size, bg, fg, sc = 1) { g.save(); g.translate(x, y); g.scale(sc, sc); g.font = `900 ${size}px 'Inter Display'`; const tw = g.measureText(s).width + size * 1.1, th = size * 1.5; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, th * .3); g.fillStyle = bg; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowOffsetY = 8; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 6; g.strokeStyle = '#1c1c22'; g.stroke(); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 3); g.restore(); }
function cross2(x, y, t0, t) { const k = easeBack(seg(t, t0, t0 + .25)); if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fillStyle = '#e8333a'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke(); g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(-26, -26); g.lineTo(26, 26); g.moveTo(26, -26); g.lineTo(-26, 26); g.stroke(); g.restore(); }
function thought(x, y, t0, t, draw, r = 150) { const k = easeBack(seg(t, t0, t0 + .3)); if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = 'rgba(255,255,255,.96)'; g.strokeStyle = '#1c1c22'; g.lineWidth = 7;
  for (const [cx, cy, cr] of [[-r * .7, r * 1.1, 18], [-r * .45, r * .85, 28]]) { g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill(); g.stroke(); } g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.arc(Math.cos(a) * r * .78, Math.sin(a) * r * .55, r * .34, 0, 7); } g.fill(); g.beginPath(); g.ellipse(0, 0, r * 1.05, r * .8, 0, 0, 7); g.fill(); g.stroke(); draw(); g.restore(); }
function speech(text, x, y, t0, t, tail = -1, t1 = 1e9) { if (t < t0 || t > t1) return; const k = easeBack(seg(t, t0, t0 + .25)); g.save(); g.translate(x, y); g.scale(k, k); g.font = "800 54px 'Inter Display'"; const lines = text.split('\n'); const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 80, bh = lines.length * 64 + 50;
  g.fillStyle = '#fff'; g.strokeStyle = '#1c1c22'; g.lineWidth = 7; g.beginPath(); g.moveTo(tail * 30, bh / 2 - 4); g.lineTo(tail * 90, bh / 2 + 60); g.lineTo(tail * -20, bh / 2 - 4); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-bw / 2, -bh / 2, bw, bh, 36); g.fill(); g.stroke();
  g.fillStyle = '#1c1c22'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * 64 + 3)); g.restore(); }
function headPx(ch, dy = 1.3) { ch.updateMatrixWorld(true); const p = ch.userData.hd.getWorldPosition(V(0, 0, 0)); p.y += dy * sizeOf(ch); return project(p); }
function drawBadges() { const list = []; for (const c of ALL2) if (c.visible && c.userData.badge.visible) list.push(c.userData.badge); if (freeBadge.visible) list.push(freeBadge);
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  for (const bd of list) { bd.updateMatrixWorld(true); const wp = bd.getWorldPosition(V(0, 0, 0)), ws = bd.getWorldScale(V(0, 0, 0)); const q = project(wp); if (q[2] > 1) continue; const dist = camera.position.distanceTo(wp); if (dist < .4) continue;
    const hpx = ws.y / (2 * tanH * dist) * H, wpx = hpx * 2; if (hpx > 700) continue; const img = bd.material.map.image; g.drawImage(img, q[0] - wpx / 2, q[1] - hpx / 2, wpx, hpx); } }
function overlays(t) { drawBadges();
  const at = i => w(i);
  if (t > at(13) && t < at(24)) { const k = seg(t, at(13), at(13) + .3); g.save(); g.globalAlpha = k; pill2('= NOMBRE DE GENS', 540, 300, 50, '#ffd23f', '#1c1c22', easeBack(k)); pill2('QUI PENSENT À TOI', 540, 390, 50, '#1c1c22', '#fff', easeBack(seg(t, at(15), at(15) + .3))); g.restore(); }
  if (t > at(131) + .3 && t < at(138)) { const [x, y] = headPx(mere, 1.6); thought(clamp(x + 150, 260, 820), clamp(y - 200, 260, 900), at(133), t, () => { g.font = "900 110px 'Inter Display'"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8333a'; g.fillText('€ € €', 0, 6); }); cross2(860, 1350, at(136), t); }
  if (t > at(138) + .3 && t < at(148)) { const [x, y] = headPx(pote, 1.6); thought(clamp(x + 140, 260, 820), clamp(y - 220, 260, 900), at(141), t, () => { g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(0, 0, 70, Math.PI, 0); g.fill(); g.fillStyle = '#ffe0c4'; g.beginPath(); g.arc(0, 14, 58, 0, 7); g.fill(); g.fillStyle = '#1a1410'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 22, 10, 8, 0, 7); g.fill(); } g.fillStyle = '#ff6fa8'; g.font = "900 48px 'Inter Display'"; g.fillText('♥', 80, -60); g.fillText('♥', -90, -50); });
    cross2(860, 1350, at(145), t); }
  if (t > at(148) && t < at(157)) { const [x, y] = headPx(crush, 1.5); speech("C'est qui lui ?", clamp(x - 40, 300, 780), clamp(y - 140, 260, 900), at(151), t, 1); cross2(860, 1350, at(155), t); }
  if (t > at(221) + .4 && t < at(225)) pill2('CHAMBRE 7', 540, 320, 56, '#2a64d8', '#fff', easeBack(seg(t, at(221), at(221) + .3)));
  if (t > at(249) && t < at(252)) pill2('COMA • 15 ANS', 540, 320, 52, '#1c1c22', '#fff', easeBack(seg(t, at(249), at(249) + .3)));
  if (t > at(284) && t < at(295)) { speech('Ton père ?\nIl est parti.', 640, 560, at(289), t, 1); g.save(); g.globalAlpha = .9; pill2('IL Y A 10 ANS', 540, 230, 44, '#f4e2c0', '#1c1c22'); g.restore(); }
  if (t > at(302) && t < at(343)) { const [x, y] = headPx(pere, 1.2); thought(clamp(x - 60, 300, 780), clamp(y - 260, 300, 820), at(304), t, () => { g.fillStyle = '#bfe3ff'; g.beginPath(); g.ellipse(0, 20, 90, 60, 0, 0, 7); g.fill(); g.fillStyle = '#f6cfa8'; g.beginPath(); g.arc(30, -6, 46, 0, 7); g.fill(); g.strokeStyle = '#1a1410'; g.lineWidth = 6; for (const sx of [14, 46]) { g.beginPath(); g.arc(sx, -10, 8, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); } g.fillStyle = '#ff6fa8'; g.font = "900 46px 'Inter Display'"; g.fillText('♥', -90, -60); }, 170); }
  if (t > at(344) && t < at(347)) { g.save(); g.globalAlpha = seg(t, at(344), at(344) + .3); g.font = "900 120px 'Inter Display'"; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 24; g.strokeStyle = '#1c1c22'; g.strokeText('LE 1…', 540, 360); g.fillStyle = '#ffd23f'; g.shadowColor = '#ffb020'; g.shadowBlur = 40; g.fillText('LE 1…', 540, 360); g.restore(); }
  if (t > at(363)) { const k = seg(t, at(363), at(363) + .5); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25 * (1 - k); g.fillStyle = '#ffd27a'; g.fillRect(0, 0, W, H); g.restore(); }
}
let CH = [];
function buildChunks() { CH = []; let cur = []; CAP.forEach((c, i) => { cur.push(i); if (/[.,!?:…]$/.test(c.w) || cur.length >= 3) { CH.push(cur); cur = []; } }); if (cur.length) CH.push(cur); }
function caption(t) { let ci = -1; for (let k = 0; k < CH.length; k++) if (w(CH[k][0]) - .05 <= t) ci = k; if (ci < 0) return; const ch = CH[ci]; if (t > we(ch[ch.length - 1]) + .5) return;
  const words = ch.map(i => CAP[i].w.toUpperCase()), size = 76; g.save(); g.font = `900 ${size}px 'Inter Display'`; const sp = 40, ws = words.map(s => g.measureText(s).width); const tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const sc = Math.min(1, 980 / tot) * (1 + .1 * (1 - easeOut((t - w(ch[0]) + .05) / .15))); g.translate(540, 1560); g.scale(sc, sc); let x = -tot / 2; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  ch.forEach((i, j) => { const act = t >= w(i) - .05; g.save(); g.translate(x + ws[j] / 2, 0); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14; g.shadowOffsetY = 4; g.lineWidth = 18; g.strokeStyle = '#000'; g.strokeText(words[j], 0, 0); g.shadowColor = 'transparent'; g.fillStyle = act ? '#ffd23f' : '#fff'; g.fillText(words[j], 0, 0); g.restore(); x += ws[j] + sp; }); g.restore(); }
// ---------------------------------------------------------------- rendu
window.setTiming = d => { CAP = d.captions; buildChunks(); END = (d.duration || CAP[CAP.length - 1].e) + VO + .9; SHOTS = buildShots(); window.DURATION = END; window.SHOTS = SHOTS; return END; };
window.render = function (t) {
  update(t); scene.updateMatrixWorld(true);
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; const fd = cam.p.distanceTo(cam.c); camera.near = .03; camera.updateProjectionMatrix();
  bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = fd < 4 ? .006 : fd < 8 ? .004 : .0015; bokeh.uniforms.maxblur.value = .009;
  const s = 30, tex = 2 * s / sun.shadow.mapSize.x; const ctr = V(Math.round(cam.c.x / tex) * tex, Math.round(cam.c.y / tex) * tex, Math.round(cam.c.z / tex) * tex);
  sun.target.position.copy(ctr); sun.position.copy(ctr).addScaledVector(SUN_DIR, s * 3); const sc = sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .1; sc.far = s * 8; sc.updateProjectionMatrix(); }
  const back = cam.c.clone().sub(cam.p).setY(0).normalize(); rim.target.position.copy(cam.c); rim.position.copy(cam.c).addScaledVector(back, 20).add(V(0, 12, 0));
  camLight.position.copy(cam.p).add(V(0, 1, 0)).lerp(cam.c, .3); camLight.intensity = 5 * clamp(fd / 5, .2, 1);
  grade.uniforms.sep.value = SEPIA;
  composer.render();
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(glc, 0, 0, W, H);
  overlays(t);
  const v = g.createRadialGradient(540, 900, 600, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
  if (t > END - .5) { g.fillStyle = `rgba(0,0,0,${clamp((t - END + .5) / .5)})`; g.fillRect(0, 0, W, H); }
};
window.__dbg = () => { const h = pere.userData.hands[0].getWorldPosition(V(0, 0, 0)); const fb = freeBadge.position; return { hand: [h.x, h.y, h.z], cam: [camera.position.x, camera.position.y, camera.position.z], vis: pere.visible, fb: [fb.x, fb.y, fb.z, freeBadge.visible], q: project(fb.clone()) }; };
window.ready = Promise.resolve().then(() => { window.__ready = true; });
window.__loaded = true;
