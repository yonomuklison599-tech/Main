// VW Polo VI GTI (AW, 2020) noire — modèle 3D procédural
// cotes réelles : L 4,07 m, l 1,75 m, h 1,44 m, empattement 2,55 m, porte-à-faux AR .71 / AV .81
// x = longueur (avant vers +x), y = hauteur, z = largeur (+z = côté droit). Origine : centre au sol.
// Carrosserie = un seul maillage lissé (sections de même topologie) ; vitres, joints, feux, calandre
// sont dessinés au pixel près dans le shader (pas d'escalier, pas de z-fighting).
export function buildPolo(THREE, opts = {}) {
  const { RoundedBoxGeometry } = opts;
  const car = new THREE.Group();
  const L = 4.07, X0 = -L / 2;
  const M = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  // interpolation monotone (pas d'oscillation entre les points clés)
  function pchip(P) { const n = P.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]);
    return (x) => { if (x <= P[0][0]) return P[0][1]; if (x >= P[n - 1][0]) return P[n - 1][1]; let i = 0; while (x > P[i + 1][0]) i++;
      const h = P[i + 1][0] - P[i][0], t = (x - P[i][0]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * P[i + 1][1] + (t3 - t2) * h * m[i + 1]; }; }

  // ---- profils (x local : 0 = pare-chocs AR … L = pare-chocs AV)
  const AX = [.71, .71 + 2.55], RW = .315, RA = .372;
  const top = pchip([[0, .95], [.03, .995], [.08, 1.05], [.14, 1.12], [.26, 1.25], [.40, 1.355], [.55, 1.405], [.9, 1.43], [1.6, 1.44], [2.0, 1.438], [2.2, 1.418], [2.36, 1.36], [2.62, 1.235], [2.9, 1.08], [3.1, .99], [3.25, .955], [3.55, .905], [3.8, .862], [3.92, .83], [3.98, .80], [4.02, .76], [4.05, .70], [4.065, .62], [4.07, .55]]);
  const shoulder = pchip([[0, .935], [.3, .925], [2, .895], [3.3, .875], [3.9, .845], [4.07, .80]]);
  const belt = pchip([[0, .99], [.5, 1.03], [.85, 1.03], [1.1, 1.004], [2.0, .987], [3.1, .965], [3.5, .96]]);
  const halfW = pchip([[0, .55], [.02, .70], [.06, .79], [.12, .84], [.25, .868], [.4, .875], [3.4, .876], [3.6, .868], [3.75, .845], [3.88, .80], [3.97, .73], [4.03, .63], [4.06, .5], [4.07, .36]]);
  const roofW = pchip([[0, .5], [.4, .585], [1.0, .615], [2.0, .615], [2.4, .595], [3.1, .54]]);
  const frontB = pchip([[3.85, 0], [3.95, .03], [4.02, .08], [4.055, .16], [4.07, .25]]);
  function bottom(x) { let b = .2 + .11 * (1 - sstep(0, .42, x)) + (x > 3.85 ? frontB(x) : 0);
    for (const ax of AX) { const d = Math.abs(x - ax); if (d < RA) b = Math.max(b, RW + Math.sqrt(RA * RA - d * d)); } return b; }
  function half(x) { // demi-section : du bas (axe) jusqu'au toit (axe), 10 points de contrôle
    const w = halfW(x), b = bottom(x), T = top(x), be = belt(x), sh = Math.min(shoulder(x), T - .05);
    const g = sstep(.03, .2, T - be), Wt = lerp(w * .6, roofW(x), g);
    const Yb = lerp(Math.min(sh + .05, T - .02), be + .01, g), Yt = T - lerp(.015, .065, g);
    return [[0, b], [w - .1, b], [w - .05, b + .05], [w - .022, lerp(b, sh, .4)], [w, sh - .02], [w - .02, sh + .012],
      [lerp(w - .11, w - .10, g), Yb], [Wt, Yt], [lerp(w * .3, Wt * .78, g), T - lerp(.004, .014, g)], [0, T]]; }
  const NSEG = 9;
  function cat(P, t) { const i = Math.min(NSEG - 1, Math.floor(t)), f = t - i; const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(NSEG, i + 2)];
    const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]; }

  // ---- matériau carrosserie : peinture noire métallisée + vitres/joints/feux/calandre dans le shader
  const body = new THREE.MeshPhysicalMaterial({ color: '#08090c', metalness: .6, roughness: .34, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.25, side: THREE.DoubleSide });
  body.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aT; varying float vT; varying vec3 vLoc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvT = aT; vLoc = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vT; varying vec3 vLoc;
float aaw(float v){ return fwidth(v) * .75 + 1e-5; }
float over(float v, float a){ float w = aaw(v); return smoothstep(a - w, a + w, v); }
float band(float v, float a, float b){ return over(v, a) * (1. - over(v, b)); }
float lineA(float v, float hw){ float w = aaw(v); return 1. - smoothstep(hw - w, hw + w, abs(v)); }
float hexd(vec2 p){ vec2 r = vec2(1., 1.732), h = r * .5; vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b; vec2 q = abs(g); return max(dot(q, vec2(.5, .866)), q.x); }
`).replace('#include <color_fragment>', `#include <color_fragment>
float x = vLoc.x - (${X0.toFixed(4)}), y = vLoc.y, az = abs(vLoc.z), t = vT;
vec3 C = diffuseColor.rgb; float Rg = roughness, Mt = metalness, CC = 1.; vec3 E = vec3(0.);
// vitres latérales (entre ceinture et toit), montant B noir laqué
float sideG = band(t, 6.05, 6.95);
float xA = 3.06 - (y - .97) * 1.95;
float dlo = sideG * over(x, .80 + (y - 1.03) * 1.0) * (1. - over(x, xA - .055));
float bpil = dlo * band(x, 1.965, 2.05);
float ws = over(t, 7.32) * band(x, 2.255, 3.075);
float rg = over(t, 7.3) * band(x, .115, .43);
float glassM = max(dlo, max(ws, rg));
C = mix(C, vec3(.004, .005, .007), glassM); Rg = mix(Rg, .025, glassM); Mt = mix(Mt, 0., glassM); CC = mix(CC, .3, glassM);
C = mix(C, vec3(.002), bpil); Rg = mix(Rg, .1, bpil);
// sérigraphie noire mate autour du pare-brise / lunette
float frit = ws * (1. - band(x, 2.29, 3.0)) + rg * (1. - band(x, .14, .41));
C = mix(C, vec3(.003), frit); Rg = mix(Rg, .6, frit);
float cowl = over(t, 7.) * band(x, 3.075, 3.12); C = mix(C, vec3(.01), cowl); Rg = mix(Rg, .7, cowl);
// joints de portes / capot
float side = band(t, 1.3, 6.02);
float gap = side * max(max(lineA(x - (2.88 + (y - .2) * .28), .0028), lineA(x - (1.995 - (y - .6) * .02), .0028) * over(y, .26)),
  lineA(x - (1.09 - (y - .65) * .3), .0028) * over(y, .62));
gap = max(gap, side * lineA(y - .262, .0025) * band(x, 1.1, 2.88));
gap = max(gap, band(t, 5.6, 6.6) * over(x, 3.13) * lineA(t - 6.08, .025));
gap = max(gap, over(t, 3.5) * over(x, 3.86) * lineA(y - .832, .0028));
C = mix(C, vec3(0.), gap); Rg = mix(Rg, 1., gap); CC = mix(CC, 0., gap);
// --- face avant (zone du nez au-dessus du bouclier)
float nose = over(x, 3.86) * (t < 0. ? 1. : 1.);
float hlIn = .335, hlOut = .80;
float hl = nose * band(az, hlIn, hlOut) * band(y, .708 + (az - hlIn) * .07, .826 - (az - hlIn) * .015);
float grl = nose * (1. - over(az, hlIn - .008)) * band(y, .712, .80);
float strip = nose * band(y, .698, .709) * (1. - over(az, .62));
vec2 hp = vec2(vLoc.z, y) / .016; float hx = hexd(hp); float honey = smoothstep(.36, .41, hx);
C = mix(C, mix(vec3(.0), vec3(.03), honey), grl); Rg = mix(Rg, mix(.9, .25, honey), grl); Mt = mix(Mt, 0., grl);
// phare : verre fumé, réflecteur chromé, projecteur, LED de jour en bas
float proj = 1. - smoothstep(.028, .031, length(vec2(az - .47, y - .765)));
float drl = hl * lineA(y - (.722 + (az - hlIn) * .07), .0035) * over(az, .38);
float hlFrame = hl * (1. - band(az, hlIn + .015, hlOut - .02) * band(y, .714 + (az - hlIn) * .07, .818 - (az - hlIn) * .015));
C = mix(C, vec3(.14, .145, .155), hl); Rg = mix(Rg, .18, hl); Mt = mix(Mt, 1., hl); C = mix(C, vec3(.01), hlFrame); Mt = mix(Mt, 0., hlFrame);
C = mix(C, vec3(.55, .57, .6), hl * proj); Mt = mix(Mt, 1., hl * proj); Rg = mix(Rg, .12, hl * proj);
E += vec3(1., .97, .92) * drl * 2.2;
C = mix(C, vec3(.52, .02, .03), strip); Rg = mix(Rg, .3, strip); E += vec3(.25, 0., .01) * strip;
// --- bouclier avant (face plane x = L)
float fr = over(x, 3.9) * (1. - over(y, .62));
float intake = fr * band(y, .27, .5) * (1. - over(az, .47 - (y - .27) * .2));
float vent = fr * band(y, .28, .52) * band(az, .56 + (y - .28) * .05, .77);
float lipM = fr * (1. - over(y, .262));
float hz = max(intake, vent);
C = mix(C, mix(vec3(0.), vec3(.03), honey), hz); Rg = mix(Rg, mix(.9, .25, honey), hz); Mt = mix(Mt, 0., hz);
C = mix(C, vec3(.004), lipM); Rg = mix(Rg, .12, lipM);
// --- arrière : feux (enveloppants), catadioptres, diffuseur
float rearF = 1. - over(x, .075);
float tlS = band(t, 2.8, 6.04) * (1. - over(x, .19 - (y - .845) * .45)) * band(y, .845, .995);
float tlR = rearF * band(y, .845, .995) * over(az, .38 + (.995 - y) * .45);
float tl = max(tlS, tlR);
float led = tl * max(lineA(y - .972, .004), lineA(y - .872 - max(0., .6 - az) * .1, .003));
C = mix(C, vec3(.28, .01, .02), tl); Rg = mix(Rg, .04, tl); Mt = mix(Mt, 0., tl);
E += vec3(.9, .02, .03) * led * 1.6 + vec3(.05, 0., 0.) * tl;
float diff = rearF * (1. - over(y, .36));
C = mix(C, mix(vec3(.0), vec3(.025), honey), diff); Rg = mix(Rg, .3, diff);
float refR = rearF * band(y, .43, .45) * band(az, .6, .74); C = mix(C, vec3(.25, 0., .01), refR); Rg = mix(Rg, .2, refR);
diffuseColor.rgb = C;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = Rg;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = Mt;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += E;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= CC;');
  };

  // ---- loft : sections espacées finement aux extrémités
  const xs = []; { let x = 0; while (x < L) { xs.push(x); x += (x < .2 || x > 3.8) ? .004 : .01; } xs.push(L); }
  const NS = 72; const tv = []; for (let k = 0; k < NS; k++) tv.push(k / (NS - 1) * NSEG);
  const ringT = tv.slice().reverse().concat(tv.slice(1)); const RING = ringT.length;
  const pos = [], aT = [], idx = [];
  for (const x of xs) { const P = half(x); const hs = tv.map((t) => cat(P, t));
    const ring = hs.slice().reverse().map(([z, y]) => [-z, y]).concat(hs.slice(1));
    ring.forEach(([z, y], j) => { pos.push(x + X0, y, z); aT.push(ringT[j]); }); }
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < RING - 1; j++) { const a = i * RING + j, b = a + RING; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // bouchons AR / AV (faces planes) triangulés à partir du contour
  for (const [x, flip] of [[0, false], [L, true]]) { const P = half(x); const hs = tv.map((t) => cat(P, t)); const ring = hs.slice().reverse().map(([z, y]) => [-z, y]).concat(hs.slice(1, -1));
    const shp = new THREE.Shape(ring.map(([z, y]) => new THREE.Vector2(z, y))); const sg = new THREE.ShapeGeometry(shp, 1);
    const p = sg.attributes.position, base = pos.length / 3; for (let k = 0; k < p.count; k++) { pos.push(x + X0, p.getY(k), p.getX(k)); aT.push(-1); }
    const ix = sg.index.array; for (let k = 0; k < ix.length; k += 3) flip ? idx.push(base + ix[k], base + ix[k + 1], base + ix[k + 2]) : idx.push(base + ix[k], base + ix[k + 2], base + ix[k + 1]); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1)); bg.setIndex(idx); bg.computeVertexNormals();
  car.add(M(new THREE.Mesh(bg, body)));
  // point de surface (pour poser les pièces) : x local, paramètre de section t
  const surf = (x, t) => cat(half(x), t);

  // ---- matériaux des pièces
  const gloss = new THREE.MeshPhysicalMaterial({ color: '#050608', roughness: .12, metalness: .2, clearcoat: 1, clearcoatRoughness: .03 });
  const paintP = new THREE.MeshPhysicalMaterial({ color: '#08090c', metalness: .6, roughness: .34, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: .1 });
  const black = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: .75 });
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---- roues 18" (5 doubles branches gris foncé diamantées) + étriers rouges + passages
  const tireM = new THREE.MeshStandardMaterial({ color: '#121214', roughness: .9 });
  const rimM = new THREE.MeshPhysicalMaterial({ color: '#2e3136', metalness: .8, roughness: .3, clearcoat: .7 });
  const machM = new THREE.MeshStandardMaterial({ color: '#c9cdd3', metalness: 1, roughness: .18 });
  function wheel() { const g = new THREE.Group(); const R = RW, Wd = .225, RR = .232;
    const prof = [[RR - .01, -Wd / 2], [RR + .01, -Wd / 2 - .005], [R - .03, -Wd / 2 - .008], [R - .005, -Wd / 2 + .02], [R, 0], [R - .005, Wd / 2 - .02], [R - .03, Wd / 2 + .008], [RR + .012, Wd / 2 + .006], [RR, Wd / 2]];
    const tire = M(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 64), tireM)); tire.rotation.x = Math.PI / 2; g.add(tire);
    const barrel = M(new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, Wd * .95, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#1a1b1e', metalness: .6, roughness: .5, side: THREE.DoubleSide }))); barrel.rotation.x = Math.PI / 2; g.add(barrel);
    const lip = M(new THREE.Mesh(new THREE.TorusGeometry(RR - .004, .009, 8, 64), machM)); lip.position.z = Wd * .47; g.add(lip);
    for (let i = 0; i < 5; i++) for (const sgn of [-1, 1]) { const a = i / 5 * Math.PI * 2 + sgn * .17;
      const sp = new THREE.Group(); sp.rotation.z = -a; sp.position.z = Wd * .42; g.add(sp);
      const arm = M(new THREE.Mesh(new THREE.BoxGeometry(.032, .17, .03), rimM)); arm.position.y = .135; arm.rotation.z = sgn * .16; arm.rotation.y = sgn * .25; sp.add(arm);
      const face = M(new THREE.Mesh(new THREE.BoxGeometry(.014, .165, .004), machM)); face.position.set(-sgn * .004, .135, .017); face.rotation.z = sgn * .16; sp.add(face); }
    const hub = M(new THREE.Mesh(new THREE.CylinderGeometry(.062, .075, .05, 32), rimM)); hub.rotation.x = Math.PI / 2; hub.position.z = Wd * .43; g.add(hub);
    const cap = M(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .012, 32), new THREE.MeshStandardMaterial({ color: '#0d0e10', metalness: .5, roughness: .3 }))); cap.rotation.x = Math.PI / 2; cap.position.z = Wd * .49; g.add(cap);
    const logo = M(new THREE.Mesh(new THREE.TorusGeometry(.03, .0035, 6, 32), chrome)); logo.position.z = Wd * .5; g.add(logo);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 5; const nut = M(new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .02, 6), chrome)); nut.rotation.x = Math.PI / 2; nut.position.set(Math.sin(a) * .05, Math.cos(a) * .05, Wd * .46); g.add(nut); }
    const disc = M(new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, .022, 48), new THREE.MeshStandardMaterial({ color: '#80848a', metalness: .9, roughness: .45 }))); disc.rotation.x = Math.PI / 2; disc.position.z = Wd * .15; g.add(disc);
    return g; }
  const calM = new THREE.MeshPhysicalMaterial({ color: '#c8101c', roughness: .35, clearcoat: .8 });
  const WHEELS = [];
  for (const [ai, ax] of AX.entries()) for (const s of [-1, 1]) { const x = ax + X0;
    const wh = wheel(); wh.position.set(x, RW, s * .748); if (s < 0) wh.rotation.y = Math.PI; car.add(wh); WHEELS.push(wh);
    // étrier fixe (ne tourne pas avec la roue)
    const cal = M(new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(.09, .15, .065, 2, .015) : new THREE.BoxGeometry(.09, .15, .065), calM));
    cal.position.set(x + (ai ? -.11 : .11), RW + .07, s * .685); cal.rotation.z = ai ? .55 : -.55; car.add(cal);
    const liner = M(new THREE.Mesh(new THREE.CylinderGeometry(RA - .004, RA - .004, .34, 48, 1, true, -Math.PI / 2 - 1.45, 2.9), new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1, side: THREE.DoubleSide })));
    liner.rotation.x = Math.PI / 2; liner.position.set(x, RW, s * .72); car.add(liner); }

  // ---- logos
  function vwLogo(r) { const g = new THREE.Group(); const ring = M(new THREE.Mesh(new THREE.TorusGeometry(r, r * .085, 10, 48), chrome)); g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * .95, 48), new THREE.MeshPhysicalMaterial({ color: '#050608', roughness: .1, clearcoat: 1 })); g.add(disc);
    const vw = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.9, r * 1.9), new THREE.MeshStandardMaterial({ transparent: true, metalness: 1, roughness: .12, color: '#e8ecf0', map: tex(256, 256, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 15; c.lineJoin = 'miter'; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(58, 62); c.lineTo(104, 168); c.lineTo(128, 112); c.lineTo(152, 168); c.lineTo(198, 62); c.stroke();
      c.beginPath(); c.moveTo(84, 154); c.lineTo(108, 212); c.lineTo(128, 168); c.lineTo(148, 212); c.lineTo(172, 154); c.stroke(); }) }));
    vw.position.z = .002; g.add(vw); return g; }
  const gtiTex = tex(256, 72, (c) => { c.font = "italic 900 54px Arial Black, Arial, sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = '#e2e6ea'; c.strokeText('GTI', 128, 38); c.fillStyle = '#d1101c'; c.fillText('GTI', 128, 38); });
  const badge = (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: gtiTex, transparent: true, metalness: .4, roughness: .25 }));
  // logo VW avant : posé sur le nez incliné
  { let a = 3.9, b = L; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; top(m) > .758 ? a = m : b = m; } const xn = a, sl = (top(xn + .002) - top(xn - .002)) / .004;
    const hold = new THREE.Group(); hold.position.set(xn + X0 + .012, .758, 0); car.add(hold);
    const n = new THREE.Vector2(-sl, 1).normalize(); hold.rotation.z = Math.atan2(n.y, n.x);
    const lg = vwLogo(.068); lg.rotation.y = Math.PI / 2; hold.add(lg);
    const gb = badge(.12, .034); gb.rotation.y = Math.PI / 2; gb.position.set(.003, -.008, .2); hold.add(gb); }
  // logo VW arrière + GTI sous le feu gauche
  const vwR = vwLogo(.072); vwR.position.set(X0 - .004, .9, 0); vwR.rotation.y = -Math.PI / 2; car.add(vwR);
  const gR = badge(.13, .036); gR.position.set(X0 - .003, .815, -.5); gR.rotation.y = -Math.PI / 2; car.add(gR);

  // ---- becquet de toit + 3e feu stop, essuie-glace, antenne requin
  { const sp = new THREE.Shape(); sp.moveTo(.50, 1.428); sp.lineTo(.36, 1.418); sp.lineTo(.17, 1.37); sp.lineTo(.155, 1.345); sp.lineTo(.2, 1.343); sp.lineTo(.40, 1.392); sp.closePath();
    const g = new THREE.ExtrudeGeometry(sp, { depth: 1.12, bevelEnabled: true, bevelSize: .012, bevelThickness: .03, bevelSegments: 3, curveSegments: 4 }); g.translate(X0, 0, -.56);
    car.add(M(new THREE.Mesh(g, paintP)));
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(.006, .012, .34), new THREE.MeshBasicMaterial({ color: '#ff1a28' })); b3.position.set(X0 + .155, 1.352, 0); b3.rotation.z = -.4; car.add(b3);
    const wa = M(new THREE.Mesh(new THREE.BoxGeometry(.016, .014, .5), black)); wa.position.set(X0 + .2, top(.2) + .012, .08); wa.rotation.set(-.1, 0, .72); car.add(wa);
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(.16, 0); fin.quadraticCurveTo(.05, .02, .02, .06); fin.closePath();
    const fg = new THREE.ExtrudeGeometry(fin, { depth: .04, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2 }); fg.translate(0, 0, -.02);
    const fm = M(new THREE.Mesh(fg, paintP)); fm.position.set(X0 + .55, top(.6) - .003, 0); car.add(fm); }

  // ---- rétroviseurs (sur la porte), poignées
  for (const s of [-1, 1]) { const xm = 2.97, [zb] = surf(xm, 6.1); const m = new THREE.Group(); m.position.set(xm + X0, 1.02, s * zb); car.add(m);
    const arm = M(new THREE.Mesh(new THREE.BoxGeometry(.09, .035, .1), gloss)); arm.position.set(0, -.01, s * .045); m.add(arm);
    const capG = RoundedBoxGeometry ? new RoundedBoxGeometry(.12, .115, .225, 4, .045) : new THREE.BoxGeometry(.12, .115, .225);
    const cap = M(new THREE.Mesh(capG, paintP)); cap.position.set(-.01, .035, s * .15); cap.rotation.y = s * .1; m.add(cap);
    const mg = new THREE.Mesh(new THREE.PlaneGeometry(.19, .09), new THREE.MeshStandardMaterial({ color: '#30343a', metalness: 1, roughness: .05 })); mg.position.set(-.072, .035, s * .15); mg.rotation.y = -Math.PI / 2 + s * .1; m.add(mg);
    for (const xd of [2.28, 1.27]) { const [zh] = surf(xd, 4.6); const h = M(new THREE.Mesh(RoundedBoxGeometry ? new RoundedBoxGeometry(.17, .03, .03, 2, .012) : new THREE.BoxGeometry(.17, .03, .03), paintP)); h.position.set(xd + X0, .905, s * (zh + .004)); car.add(h); } }

  // ---- échappements doubles à gauche (z < 0)
  const exM = new THREE.MeshStandardMaterial({ color: '#c3c7cc', metalness: 1, roughness: .16, side: THREE.DoubleSide });
  for (const dz of [-.47, -.585]) { const ex = M(new THREE.Mesh(new THREE.CylinderGeometry(.043, .043, .12, 32, 1, true), exM)); ex.rotation.z = Math.PI / 2; ex.position.set(X0 + .02, .285, dz); car.add(ex);
    const rim = M(new THREE.Mesh(new THREE.TorusGeometry(.043, .004, 8, 32), exM)); rim.rotation.y = Math.PI / 2; rim.position.set(X0 - .04, .285, dz); car.add(rim);
    const inn = new THREE.Mesh(new THREE.CircleGeometry(.04, 24), new THREE.MeshBasicMaterial({ color: '#020202' })); inn.position.set(X0 - .01, .285, dz); inn.rotation.y = -Math.PI / 2; car.add(inn); }

  car.userData = { WHEELS, length: L, X0 };
  return car;
}
