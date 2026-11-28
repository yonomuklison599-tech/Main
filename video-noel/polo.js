// VW Polo VI GTI (AW, 2020) noire — modèle 3D procédural (cotes réelles : L 4,07 m, l 1,75 m, h 1,44 m, empattement 2,55 m)
// x = longueur (avant vers +x), y = hauteur, z = largeur. Origine : centre au sol.
export function buildPolo(THREE, opts = {}) {
  const { RoundedBoxGeometry } = opts;
  const car = new THREE.Group();
  const L = 4.07, X0 = -2.035; // arrière à X0, avant à X0 + L
  const paint = new THREE.MeshPhysicalMaterial({ color: '#06070a', metalness: .55, roughness: .28, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0b0e14', metalness: .2, roughness: .03, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 1.6 });
  const black = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: .7 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: .15, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 1, roughness: .12 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#d1101c', roughness: .3, clearcoat: .8, emissive: new THREE.Color('#3a0004') });
  const M = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  // ---- profils le long de la voiture (u = 0 arrière … 1 avant)
  const WB = [X0 + .76, X0 + .76 + 2.55]; // essieux arrière / avant
  const R_ARCH = .37;
  function halfW(x) { const u = (x - X0) / L; let w = .875; w -= .07 * (1 - sstep(0, .06, u)) + .1 * (1 - sstep(.0, .025, u)); w -= .06 * sstep(.9, 1, u) + .12 * sstep(.975, 1, u); return w; }
  function bottomY(x) { let b = .17; for (const ax of WB) { const d = Math.abs(x - ax); if (d < R_ARCH + .04) b = Math.max(b, .33 + Math.sqrt(Math.max(0, (R_ARCH + .04) ** 2 - d * d)) * .95); } const u = (x - X0) / L; b += .1 * (1 - sstep(0, .04, u)) + .14 * sstep(.95, 1, u); return b; }
  function beltY(x) { const u = (x - X0) / L; // ligne de caisse / capot
    if (u > .62) return lerp(.97, .74, sstep(.62, 1, u)) - .03 * sstep(.97, 1, u); return lerp(1.0, .97, sstep(.05, .62, u)) - .14 * (1 - sstep(0, .045, u)); }
  function roofY(x) { const u = (x - X0) / L; // toit (pavillon) ; 0 si pas de vitrage
    const r0 = .045, r1 = .13, r2 = .45, r3 = .64; if (u < r0 || u > r3) return 0; if (u < r1) return lerp(1.0, 1.43, sstep(r0, r1, u)); if (u < r2) return 1.44 - .015 * Math.sin((u - r1) / (r2 - r1) * Math.PI); return lerp(1.43, .99, sstep(r2, r3, u)); }
  // ---- carrosserie : loft de sections
  const NX = 140, NS = 40;
  function section(x) { const w = halfW(x), b = bottomY(x), be = beltY(x), r = roofY(x); const pts = [];
    // bas -> flanc -> épaule (demi-section côté +z), puis symétrie
    const side = []; const cr = .08;
    side.push([0, b - .02]); side.push([w - cr, b]); side.push([w - .015, b + cr * .6]);
    side.push([w, lerp(b, be, .35)]); side.push([w + .012, lerp(b, be, .62)]); side.push([w - .005, be - .05]); side.push([w - .05, be]);
    if (r > be + .05) { const tw = w - .17; side.push([w - .1, be + .02]); side.push([tw, lerp(be, r, .85)]); side.push([tw - .1, r - .01]); side.push([0, r]); }
    else { side.push([w * .6, be + .025]); side.push([0, be + .035]); }
    return side; }
  // rééchantillonne chaque demi-section en NS points (par longueur d'arc) pour un maillage régulier
  function resample(poly, n) { const d = [0]; for (let i = 1; i < poly.length; i++) d.push(d[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])); const T = d[d.length - 1], out = [];
    for (let k = 0; k < n; k++) { const s = k / (n - 1) * T; let i = 1; while (i < d.length - 1 && d[i] < s) i++; const f = (s - d[i - 1]) / (d[i] - d[i - 1] || 1); out.push([lerp(poly[i - 1][0], poly[i][0], f), lerp(poly[i - 1][1], poly[i][1], f)]); } return out; }
  function loft(xa, xb, nx, ns, sectFn, mat) { const pos = [], idx = [];
    for (let i = 0; i <= nx; i++) { const x = lerp(xa, xb, i / nx); const s = resample(sectFn(x), ns); const full = s.map(([z, y]) => [z, y]).reverse().map(([z, y]) => [-z, y]).concat(s.slice(1)); full.forEach(([z, y]) => pos.push(x, y, z)); }
    const ring = ns * 2 - 1; for (let i = 0; i < nx; i++) for (let j = 0; j < ring - 1; j++) { const a = i * ring + j, b2 = a + ring; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return M(new THREE.Mesh(g, mat)); }
  // caisse (sans vitrage) + vitrage séparé
  const bodySect = (x) => { const s = section(x), be = beltY(x); return s.filter(([z, y]) => y <= be + .04).concat(roofY(x) > be + .05 ? [[0, be + .03]] : []); };
  const body = loft(X0 + .005, X0 + L - .005, NX, NS, (x) => { const s = section(x); return s; }, paint); car.add(body);
  // vitrage : surface teintée posée sur la partie haute (léger décalage vers l'extérieur)
  const glassSect = (x) => { const r = roofY(x), be = beltY(x), w = halfW(x); if (r <= be + .05) return [[0, be], [.01, be]]; const tw = w - .17; return [[w - .095, be + .03], [tw + .004, lerp(be, r, .85)], [tw - .095, r - .02], [.5, r - .005]]; };
  const glassMesh = loft(X0 + L * .05, X0 + L * .635, 90, 16, (x) => { const g = glassSect(x); return g.map(([z, y], i) => [z + .006, y + (i === g.length - 1 ? -.004 : 0)]); }, glass);
  car.add(glassMesh);
  // montants (B, C) et pavillon peints par-dessus le vitrage
  const pillar = (x0, x1, w_) => { for (const s of [-1, 1]) { const xm = (x0 + x1) / 2, r = roofY(xm), be = beltY(xm), tw = halfW(xm) - .17; const len = Math.hypot(r - be, .1); const p = M(new THREE.Mesh(new THREE.BoxGeometry(w_, len + .02, .03), gloss)); p.position.set(xm, (r + be) / 2, s * (tw + .02 + .03)); p.rotation.x = s * -Math.atan2(.1, r - be); car.add(p); } };
  pillar(X0 + L * .37, X0 + L * .37, .07); // montant B
  for (const s of [-1, 1]) { const roofPanel = M(new THREE.Mesh(new THREE.BoxGeometry(L * .3, .02, (halfW(X0 + L * .3) - .3) * 2), paint)); roofPanel.position.set(X0 + L * .29, 1.437, 0); if (s > 0) car.add(roofPanel); }
  // custode (C) : panneau noir triangulaire
  for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.42, 0); sh.lineTo(.16, .4); sh.lineTo(0, .38); const c = M(new THREE.Mesh(new THREE.ShapeGeometry(sh), gloss)); c.position.set(X0 + L * .075, 1.01, s * (halfW(X0 + L * .1) - .085)); c.rotation.y = s > 0 ? 0 : Math.PI; c.rotation.x = s * -.18; if (s < 0) { c.scale.x = -1; c.position.x = X0 + L * .075; } car.add(c); }
  // ---- passages de roue (doublures noires) + roues
  const tireM = new THREE.MeshStandardMaterial({ color: '#141416', roughness: .85 });
  const rimM = new THREE.MeshPhysicalMaterial({ color: '#3a3d42', metalness: .85, roughness: .32, clearcoat: .6 });
  const machM = new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: .2 });
  function wheel() { const g = new THREE.Group(); const R = .33, Wd = .23;
    const tire = M(new THREE.Mesh(new THREE.TorusGeometry(R - .065, .07, 20, 48), tireM)); tire.scale.z = 1.55; g.add(tire);
    const tread = M(new THREE.Mesh(new THREE.CylinderGeometry(R, R, Wd * .78, 48, 1, true), tireM)); tread.rotation.x = Math.PI / 2; g.add(tread);
    const barrel = M(new THREE.Mesh(new THREE.CylinderGeometry(.235, .235, Wd * .9, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#1b1c1f', metalness: .6, roughness: .5, side: THREE.DoubleSide }))); barrel.rotation.x = Math.PI / 2; g.add(barrel);
    const lip = M(new THREE.Mesh(new THREE.TorusGeometry(.235, .012, 8, 48), machM)); lip.position.z = Wd * .45; g.add(lip);
    // 5 doubles branches diamantées
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + (i % 2 ? .1 : -.1); const sp = M(new THREE.Mesh(new THREE.BoxGeometry(.03, .2, .03), i % 2 ? machM : rimM)); sp.position.set(Math.sin(a) * .13, Math.cos(a) * .13, Wd * .42); sp.rotation.z = -a; sp.rotation.y = (i % 2 ? .12 : -.12); g.add(sp);
      const sp2 = M(new THREE.Mesh(new THREE.BoxGeometry(.05, .2, .025), rimM)); sp2.position.set(Math.sin(a) * .13, Math.cos(a) * .13, Wd * .4); sp2.rotation.z = -a; g.add(sp2); }
    const hub = M(new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .05, 24), rimM)); hub.rotation.x = Math.PI / 2; hub.position.z = Wd * .43; g.add(hub);
    const cap = M(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .02, 24), new THREE.MeshStandardMaterial({ color: '#111', metalness: .5, roughness: .3 }))); cap.rotation.x = Math.PI / 2; cap.position.z = Wd * .46; g.add(cap);
    const logo = M(new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 6, 24), chrome)); logo.position.z = Wd * .472; g.add(logo);
    // disque + étrier rouge
    const disc = M(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 32), new THREE.MeshStandardMaterial({ color: '#7a7d82', metalness: .9, roughness: .4 }))); disc.rotation.x = Math.PI / 2; disc.position.z = Wd * .2; g.add(disc);
    const cal = M(new THREE.Mesh(new THREE.BoxGeometry(.1, .14, .07), new THREE.MeshPhysicalMaterial({ color: '#c4101a', roughness: .35, clearcoat: .8 }))); cal.position.set(.1, .08, Wd * .26); cal.rotation.z = -.6; g.add(cal);
    return g; }
  const WHEELS = [];
  for (const ax of WB) for (const s of [-1, 1]) { const wh = wheel(); wh.position.set(ax, .33, s * .74); if (s < 0) wh.rotation.y = Math.PI; car.add(wh); WHEELS.push(wh);
    const liner = M(new THREE.Mesh(new THREE.CylinderGeometry(.41, .41, .3, 40, 1, true, -Math.PI / 2 - 1.3, 2.6), new THREE.MeshStandardMaterial({ color: '#060607', roughness: 1, side: THREE.DoubleSide }))); liner.rotation.x = Math.PI / 2; liner.position.set(ax, .33, s * .74); car.add(liner); }
  // ---- face avant
  const XF = X0 + L;
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const honey = tex(256, 128, (c, w, h) => { c.fillStyle = '#050506'; c.fillRect(0, 0, w, h); c.strokeStyle = '#26272b'; c.lineWidth = 3; for (let y = 0; y < h + 16; y += 14) for (let x = (y / 14 % 2) * 10; x < w + 20; x += 20) { c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 7); } c.closePath(); c.stroke(); } });
  honey.wrapS = honey.wrapT = THREE.RepeatWrapping;
  const grilleM = new THREE.MeshStandardMaterial({ map: honey, roughness: .6 });
  // calandre haute + liseré rouge + logo GTI + logo VW
  const upper = M(new THREE.Mesh(new THREE.BoxGeometry(.05, .12, .78), grilleM)); upper.position.set(XF - .03, .69, 0); upper.rotation.z = -.35; car.add(upper);
  const stripe = M(new THREE.Mesh(new THREE.BoxGeometry(.03, .022, 1.42), red)); stripe.position.set(XF - .025, .665, 0); stripe.rotation.z = -.35; car.add(stripe);
  const gtiTex = tex(256, 64, (c) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 256, 64); c.font = "900 52px Georgia, serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#d8dce2'; c.strokeText('GTI', 128, 34); c.fillStyle = '#d1101c'; c.fillText('GTI', 128, 34); });
  const gtiF = new THREE.Mesh(new THREE.PlaneGeometry(.16, .04), new THREE.MeshStandardMaterial({ map: gtiTex, transparent: true, metalness: .3, roughness: .3 })); gtiF.position.set(XF - .002, .695, .22); gtiF.rotation.set(0, Math.PI / 2, 0); gtiF.rotation.x = 0; car.add(gtiF);
  function vwLogo(r) { const g = new THREE.Group(); const ring = M(new THREE.Mesh(new THREE.TorusGeometry(r, r * .1, 10, 40), chrome)); g.add(ring); const disc = new THREE.Mesh(new THREE.CircleGeometry(r * .95, 40), new THREE.MeshStandardMaterial({ color: '#0a1830', metalness: .4, roughness: .3 })); g.add(disc);
    const vw = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.8, r * 1.8), new THREE.MeshStandardMaterial({ transparent: true, metalness: 1, roughness: .15, color: '#e8ecf0', map: tex(256, 256, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 16; c.lineJoin = 'round'; c.beginPath(); c.moveTo(70, 70); c.lineTo(104, 170); c.lineTo(128, 110); c.lineTo(152, 170); c.lineTo(186, 70); c.stroke(); c.beginPath(); c.moveTo(92, 150); c.lineTo(104, 190); c.lineTo(128, 140); c.lineTo(152, 190); c.lineTo(164, 150); c.stroke(); }) })); vw.position.z = .002; g.add(vw); return g; }
  const vwF = vwLogo(.075); vwF.position.set(XF - .018, .74, 0); vwF.rotation.y = Math.PI / 2; vwF.rotation.x = 0; car.add(vwF);
  // phares LED (fumés) avec le liseré rouge qui entre dedans
  for (const s of [-1, 1]) { const hl = new THREE.Group(); hl.position.set(XF - .14, .72, s * .6); hl.rotation.y = s * .55; car.add(hl);
    const lens = M(new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(.06, .13, .36, 3, .02) : new THREE.BoxGeometry(.06, .13, .36), new THREE.MeshPhysicalMaterial({ color: '#15171c', metalness: .3, roughness: .05, clearcoat: 1, transmission: 0 }))); lens.rotation.x = s * -.18; hl.add(lens);
    const proj = M(new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .03, 24), chrome)); proj.rotation.z = Math.PI / 2; proj.position.set(.02, .01, -s * .05); hl.add(proj);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(.012, .012, .2), new THREE.MeshBasicMaterial({ color: '#ffffff' })); drl.position.set(.033, -.045, s * .03); drl.rotation.x = s * -.25; hl.add(drl);
    const rs = M(new THREE.Mesh(new THREE.BoxGeometry(.012, .016, .3), red)); rs.position.set(.032, -.025, -s * .02); rs.rotation.x = s * -.12; hl.add(rs); }
  // bouclier : grande prise d'air nid d'abeille + antibrouillards + lame
  const lower = M(new THREE.Mesh(new THREE.BoxGeometry(.05, .2, 1.2), grilleM)); lower.position.set(XF - .07, .38, 0); car.add(lower);
  for (const s of [-1, 1]) { const fog = M(new THREE.Mesh(new THREE.BoxGeometry(.04, .07, .16), new THREE.MeshPhysicalMaterial({ color: '#2a2c30', metalness: .6, roughness: .1 }))); fog.position.set(XF - .1, .4, s * .62); fog.rotation.y = s * .4; car.add(fog);
    const bez = M(new THREE.Mesh(new THREE.BoxGeometry(.04, .14, .26), grilleM)); bez.position.set(XF - .12, .4, s * .64); bez.rotation.y = s * .4; car.add(bez); }
  const lip = M(new THREE.Mesh(new THREE.BoxGeometry(.18, .025, 1.5), gloss)); lip.position.set(XF - .12, .2, 0); car.add(lip);
  // ---- arrière : feux, becquet, diffuseur, échappements, logos
  const XR = X0;
  for (const s of [-1, 1]) { const tl = new THREE.Group(); tl.position.set(XR + .07, .95, s * .66); tl.rotation.y = -s * .5; car.add(tl);
    const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(.34, .02); shp.lineTo(.3, .12); shp.lineTo(.02, .14); shp.closePath(); const g3 = new THREE.ExtrudeGeometry(shp, { depth: .03, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 2 });
    const lamp = M(new THREE.Mesh(g3, new THREE.MeshPhysicalMaterial({ color: '#8a0b12', roughness: .05, clearcoat: 1, emissive: new THREE.Color('#5a0006'), emissiveIntensity: .8 }))); lamp.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; lamp.position.set(-.02, -.07, s > 0 ? .17 : -.17); if (s < 0) lamp.scale.x = -1; tl.add(lamp); }
  const spoiler = M(new THREE.Mesh(new THREE.BoxGeometry(.32, .05, 1.36), gloss)); spoiler.position.set(XR + .2, 1.42, 0); spoiler.rotation.z = .2; car.add(spoiler);
  const brake3 = new THREE.Mesh(new THREE.BoxGeometry(.01, .015, .3), new THREE.MeshBasicMaterial({ color: '#ff2030' })); brake3.position.set(XR + .05, 1.4, 0); car.add(brake3);
  const diff = M(new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 1.4), grilleM)); diff.position.set(XR + .02, .28, 0); car.add(diff);
  for (const dz of [.5, .62]) { const ex = M(new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .14, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#c0c4c8', metalness: 1, roughness: .18, side: THREE.DoubleSide }))); ex.rotation.z = Math.PI / 2; ex.position.set(XR - .01, .27, dz); car.add(ex); const inn = new THREE.Mesh(new THREE.CircleGeometry(.036, 20), new THREE.MeshBasicMaterial({ color: '#050505' })); inn.position.set(XR - .06, .27, dz); inn.rotation.y = -Math.PI / 2; car.add(inn); }
  const vwR = vwLogo(.07); vwR.position.set(XR - .005, .92, 0); vwR.rotation.y = -Math.PI / 2; car.add(vwR);
  const gtiR = new THREE.Mesh(new THREE.PlaneGeometry(.14, .035), new THREE.MeshStandardMaterial({ map: gtiTex, transparent: true, metalness: .3, roughness: .3 })); gtiR.position.set(XR + .005, .82, .42); gtiR.rotation.y = -Math.PI / 2; car.add(gtiR);
  // essuie-glace arrière
  const wiper = M(new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .45), black)); wiper.position.set(XR + .12, 1.15, .1); wiper.rotation.set(0, 0, .5); car.add(wiper);
  // ---- rétroviseurs, poignées, logos GTI d'aile (bande rouge)
  for (const s of [-1, 1]) { const m = new THREE.Group(); m.position.set(X0 + L * .64, 1.0, s * .92); car.add(m); const arm = M(new THREE.Mesh(new THREE.BoxGeometry(.08, .04, .1), gloss)); arm.position.z = -s * .05; m.add(arm);
    const cap = M(new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(.13, .11, .22, 3, .04) : new THREE.BoxGeometry(.13, .11, .22), gloss)); cap.position.set(-.02, .03, s * .07); m.add(cap);
    for (const xd of [X0 + L * .5, X0 + L * .27]) { const h = M(new THREE.Mesh(new THREE.BoxGeometry(.16, .025, .02), gloss)); h.position.set(xd, .93, s * (halfW(xd) + .008)); car.add(h); }
    const fb = new THREE.Mesh(new THREE.PlaneGeometry(.1, .025), new THREE.MeshStandardMaterial({ map: gtiTex, transparent: true })); fb.position.set(X0 + L * .78, .76, s * (halfW(X0 + L * .78) + .012)); fb.rotation.y = s > 0 ? 0 : Math.PI; car.add(fb); }
  // jupes latérales noires
  for (const s of [-1, 1]) { const sk = M(new THREE.Mesh(new THREE.BoxGeometry(1.75, .07, .04), gloss)); sk.position.set((WB[0] + WB[1]) / 2, .2, s * .875); car.add(sk); }
  car.userData = { WHEELS, length: L, X0 };
  return car;
}
