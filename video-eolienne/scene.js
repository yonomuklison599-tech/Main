// Scène 3D « construis une éolienne » — rendu déterministe : window.render(t)
import * as THREE from 'three';

const W = 1080, H = 1920;
const glc = document.getElementById('gl'), out = document.getElementById('out'), g = out.getContext('2d');
let EV, CUTS, VO, WORDS = [];

// ---------------------------------------------------------------- utilitaires
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const easeBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const win = (t, a, b, f = .25) => seg(t, a, a + f) * (1 - seg(t, b - f, b));
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function noise2(x, z) { // bruit de valeur lissé
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .75, metalness: 0, flatShading: true, ...o });

// ---------------------------------------------------------------- moteur
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe6f5, 250, 1800);
const camera = new THREE.PerspectiveCamera(40, W / H, .05, 6000);
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6d8f4a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
scene.add(sun, sun.target);
const SUN_DIR = V(.55, .75, .38).normalize();

// ciel
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#5fb4ef') }, mid: { value: new THREE.Color('#bfe3f7') }, bot: { value: new THREE.Color('#e8f3f6') } },
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .12 ? mix(mid, top, smoothstep(.12,.7,h)) : mix(bot, mid, smoothstep(-.05,.12,h)); gl_FragColor = vec4(c,1.); }' });
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); scene.add(sky);

// nuages
const clouds = new THREE.Group(); scene.add(clouds);
const cloudMat = std('#ffffff', { roughness: 1, transparent: true, opacity: .95 });
{ const r = rng(9); for (let i = 0; i < 26; i++) { const c = new THREE.Group(); const a = r() * Math.PI * 2, d = 500 + r() * 1300;
  c.position.set(Math.cos(a) * d, 220 + r() * 260, Math.sin(a) * d);
  for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + r() * 30, 1), cloudMat); m.position.set((j - 2) * 40 + r() * 20, r() * 15, r() * 30); m.scale.y = .6; c.add(m); }
  clouds.add(c); } }

// sol
function heightAt(x, z) { const d = Math.hypot(x, z); const k = clamp((d - 120) / 500); return (noise2(x * .004, z * .004) * 90 + noise2(x * .012, z * .012) * 20 - 30) * k * k; }
const groundGeo = new THREE.PlaneGeometry(4000, 4000, 160, 160); groundGeo.rotateX(-Math.PI / 2);
{ const p = groundGeo.attributes.position, col = []; const c1 = new THREE.Color('#7cc04f'), c2 = new THREE.Color('#5ea33f'), c3 = new THREE.Color('#a9c95a');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z)); const n = noise2(x * .05, z * .05);
    const c = c1.clone().lerp(n > .5 ? c2 : c3, Math.abs(n - .5) * 1.4); col.push(c.r, c.g, c.b); }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); groundGeo.computeVertexNormals(); }
const groundMat = std('#ffffff', { vertexColors: true, roughness: .95, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeo, groundMat); ground.receiveShadow = true; scene.add(ground);

// arbres
{ const r = rng(5), N = 260;
  const fol = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), std('#3f8a3a'), N), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .3, 1, 6), std('#7a5230'), N);
  const fol2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), std('#4f9e3e'), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) { let x, z; do { x = (r() - .5) * 1600; z = (r() - .5) * 1600; } while (Math.hypot(x, z) < 60 || (x < -5 && x > -45 && z < 5 && z > -40));
    const s = 4 + r() * 6, y = heightAt(x, z), round = r() > .5;
    m.compose(V(x, y + s * .5, z), q, V(s * .25, s, s * .25)); tr.setMatrixAt(i, m);
    m.compose(V(x, y + s * (round ? 1.25 : 1.4), z), q, round ? V(s * .6, s * .6, s * .6) : V(s * .55, s * 1.4, s * .55));
    (round ? fol2 : fol).setMatrixAt(i, m); (round ? fol : fol2).setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); }
  for (const o of [fol, tr, fol2]) { o.castShadow = true; o.receiveShadow = true; scene.add(o); } }

// herbe haute + haies autour du jardin
{ const r = rng(12), N = 900; const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(.025, .28, 3), std('#6bb544'), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) { const a = r() * 6.283, d = 1 + r() * 16; e.set((r() - .5) * .5, r() * 3, (r() - .5) * .5); q.setFromEuler(e);
    const s = .6 + r() * .7; m.compose(V(Math.cos(a) * d, .13 * s, Math.sin(a) * d), q, V(s, s, s)); tuft.setMatrixAt(i, m); }
  tuft.receiveShadow = true; scene.add(tuft);
  const hedgeMat = std('#3f8f3c');
  for (const [x, z, w, d] of [[-6, -4, 1.6, 9], [-12, 4, 10, 1.6], [6, -6, 1.6, 7], [9, 3, 1.4, 5]]) {
    const hgeo = new THREE.BoxGeometry(w, 1.6, d, 3, 2, 6); const p = hgeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (noise2(p.getX(i) * 3 + x, p.getZ(i) * 3 + z) - .5) * .35);
    hgeo.computeVertexNormals(); const h = new THREE.Mesh(hgeo, hedgeMat); h.position.set(x, .8, z); h.castShadow = h.receiveShadow = true; scene.add(h); }
}

// maison
const house = new THREE.Group(); house.position.set(-22, 0, -16); house.rotation.y = .5; scene.add(house);
const windowMat = std('#2b3a4a', { emissive: new THREE.Color('#ffcf6b'), emissiveIntensity: 0 });
{ const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 7), std('#f1e4cf')); walls.position.y = 2.5; walls.castShadow = walls.receiveShadow = true; house.add(walls);
  const sh = new THREE.Shape(); sh.moveTo(-5, 0); sh.lineTo(0, 3.2); sh.lineTo(5, 0); sh.lineTo(-5, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 7.8, bevelEnabled: false }), std('#c4553c')); roof.position.set(0, 5, -3.9); roof.castShadow = true; house.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, .15), std('#7a4a2b')); door.position.set(1.8, 1.2, 3.55); house.add(door);
  for (const x of [-2.4, 3.8]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, .12), windowMat); w.position.set(x === 3.8 ? -.2 : x, 3, 3.56); house.add(w); }
  const chim = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.2, .9), std('#a8a29a')); chim.position.set(2.5, 7, -1); chim.castShadow = true; house.add(chim); }
const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0, roughness: .3 });
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), bulbMat); bulb.position.set(2.9, 2.9, 3.78); house.add(bulb);
const bulbBase = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .2, 10), std('#888')); bulbBase.position.set(2.9, 3.13, 3.78); house.add(bulbBase);
const bulbLight = new THREE.PointLight(0xffc56a, 0, 14, 1.6); bulbLight.position.set(2.9, 2.8, 4.3); house.add(bulbLight);
// fil électrique du balai à la maison
{ const pts = [V(0, .1, 0), V(-6, .05, -4), V(-14, .05, -10), V(-19, .3, -12.5)]; const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .03, 5), std('#222'));
  scene.add(tube); }

// panneau « abonne-toi »
const signGroup = new THREE.Group(); signGroup.position.set(-11, 0, -2); signGroup.rotation.y = .35; scene.add(signGroup);
{ const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const c = cv.getContext('2d');
  c.fillStyle = '#1f8a4c'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = '#fff'; c.lineWidth = 26; c.strokeRect(30, 30, 964, 452);
  c.fillStyle = '#fff'; c.font = "900 150px 'Inter Display'"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ABONNE-TOI', 512, 210);
  c.font = "900 140px 'Inter Display'"; c.fillText('✓', 512, 370);
  window.__signCanvas = cv;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; window.__signTex = tex;
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, .12), [std('#1f8a4c'), std('#1f8a4c'), std('#1f8a4c'), std('#1f8a4c'), new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), std('#1f8a4c')]);
  board.position.y = 2.6; board.castShadow = true; signGroup.add(board);
  for (const x of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.2, 6), std('#6b4a2e')); p.position.set(x, 1.1, -.08); signGroup.add(p); } }

// ---------------------------------------------------------------- fermier
function makeFarmer() {
  const f = new THREE.Group(), skin = std('#f0c39a'), blue = std('#3d6fb6'), red = std('#d64a3a'), shirt = std('#f2efe6');
  const leg = s => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.11, .1, .85, 8), blue); l.position.set(s * .13, .43, 0); l.castShadow = true; return l; };
  f.add(leg(-1), leg(1));
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .12, .32), std('#4a3424')); b.position.set(s * .13, .06, .05); f.add(b); }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .45, 4, 10), shirt); torso.position.y = 1.2; torso.castShadow = true; f.add(torso);
  const bib = new THREE.Mesh(new THREE.CapsuleGeometry(.275, .25, 4, 10), blue); bib.position.y = 1.05; bib.scale.set(1.02, 1, 1.02); f.add(bib);
  const head = new THREE.Group(); head.position.y = 1.78; f.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.23, 14, 10), skin); hd.castShadow = true; head.add(hd);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.245, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red); cap.position.y = .04; head.add(cap);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, .22), red); visor.position.set(0, .06, .24); head.add(visor);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), std('#222')); e.position.set(s * .08, -.01, .21); head.add(e); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), skin); nose.position.set(0, -.06, .23); head.add(nose);
  const arms = [];
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .34, 1.45, 0); f.add(sh);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(.075, .07, .62, 8), shirt); a.position.y = -.31; a.castShadow = true; sh.add(a);
    const hnd = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), skin); hnd.position.y = -.64; sh.add(hnd); arms.push(sh); }
  f.userData = { head, arms }; return f;
}
const farmer = makeFarmer(); farmer.position.set(-1.7, 0, 1.4); farmer.rotation.y = .5; scene.add(farmer);

// ---------------------------------------------------------------- éolienne
const MAST_H = 98;
const broom = new THREE.Group(); scene.add(broom);
{ const stick = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, 1.7, 8), std('#c9a070')); stick.position.y = .85; stick.castShadow = true; broom.add(stick);
  const brush = new THREE.Mesh(new THREE.BoxGeometry(.32, .12, .12), std('#d8b45a')); brush.position.y = .06; broom.add(brush); }
// petite hélice de ventilateur (moteur + 4 pales)
const fan = new THREE.Group(); scene.add(fan);
const fanRotor = new THREE.Group(); fanRotor.position.z = .09; fan.add(fanRotor);
{ const motor = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .16, 12), std('#e8e8e8')); motor.rotation.x = Math.PI / 2; motor.castShadow = true; fan.add(motor);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), std('#4a90e2')); fanRotor.add(hub);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.11, .3, .015), std('#4a90e2', { roughness: .4 })); b.position.y = .17;
    const p = new THREE.Group(); p.rotation.z = i * Math.PI / 2; b.rotation.y = .4; b.castShadow = true; p.add(b); fanRotor.add(p); } }

const tower = new THREE.Group(); scene.add(tower);        // mât + nacelle (peut trembler)
const mastMat = std('#eef0f2', { roughness: .55, transparent: true });
const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.6, MAST_H, 28, 1), mastMat); mast.castShadow = mast.receiveShadow = true; tower.add(mast);
const yawRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, .22, 8, 32), std('#9aa3ad', { metalness: .4 })); yawRing.rotation.x = Math.PI / 2; yawRing.position.y = MAST_H + .3; tower.add(yawRing);
const yawMotors = new THREE.Group(); tower.add(yawMotors);
for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 1, 10), std('#ffb02e')); const a = i * Math.PI / 2 + .4;
  m.position.set(Math.cos(a) * 1.4, MAST_H + 1.1, Math.sin(a) * 1.4); yawMotors.add(m); }
const yaw = new THREE.Group(); yaw.position.y = MAST_H + 2; tower.add(yaw);
const shellMat = std('#f4f5f6', { roughness: .5, transparent: true, opacity: 1 });
const nacelle = new THREE.Group(); yaw.add(nacelle);
{ const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 9, 6, 20), shellMat); body.rotation.x = Math.PI / 2; body.position.z = -3.2; body.scale.set(1, 1, 1);
  body.castShadow = true; nacelle.add(body); nacelle.userData.body = body; }
const rotor = new THREE.Group(); rotor.position.z = 3.4; yaw.add(rotor);
const hubMat = std('#f4f5f6', { roughness: .45, transparent: true });
{ const hub = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 14), hubMat); hub.scale.z = 1.1; rotor.add(hub);
  const spin = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.2, 20), hubMat); spin.rotation.x = Math.PI / 2; spin.position.z = 2.4; rotor.add(spin); }
// géométrie de pale (sections elliptiques effilées)
function bladeGeometry(L = 60) {
  const N = 28, M = 12, pos = [], idx = [];
  const chord = r => r < 4 ? lerp(2.6, 4.2, r / 4) : lerp(4.2, .7, Math.pow((r - 4) / (L - 4), .8));
  for (let i = 0; i <= N; i++) { const y = 1.2 + (L - 1.2) * i / N, c = chord(y), th = i < 3 ? c * .55 : c * .22;
    for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2; pos.push(Math.cos(a) * c / 2 + c * .12, y, Math.sin(a) * th / 2); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  const tip = pos.length / 3; pos.push(.1, L + .3, 0); for (let j = 0; j < M; j++) idx.push(N * M + j, tip, N * M + (j + 1) % M);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
const BL = bladeGeometry(); const bladeMat = std('#f6f7f8', { roughness: .45, transparent: true, flatShading: false });
const blades = [];
for (let i = 0; i < 3; i++) {
  const arm = new THREE.Group(); rotor.add(arm);                  // angle autour du moyeu
  const len = new THREE.Group(); arm.add(len);                    // longueur (scale y)
  const pitchG = new THREE.Group(); len.add(pitchG);              // calage (rotation y)
  const m = new THREE.Mesh(BL, bladeMat); m.castShadow = true; pitchG.add(m);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, 3, 10), std('#e3463a')); stripe.position.y = 55.5; pitchG.add(stripe);
  const tipMark = new THREE.Object3D(); tipMark.position.y = 59.5; pitchG.add(tipMark);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 58, 6), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0, fog: false })); cable.position.y = 30.5; pitchG.add(cable);
  blades.push({ arm, len, pitchG, mesh: m, tipMark, cable });
}
// intérieur : arbre lent, multiplicateur, génératrice
const inside = new THREE.Group(); yaw.add(inside);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 5.2, 16), std('#8d96a0', { metalness: .5, roughness: .4 })); shaft.rotation.x = Math.PI / 2; shaft.position.z = 1; inside.add(shaft);
function gearGeo(r, teeth, w) { const g0 = new THREE.CylinderGeometry(r, r, w, teeth * 2, 1); const p = g0.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr < .01) continue; const a = Math.atan2(z, x);
    const k = Math.round(a / (Math.PI / teeth)); if (Math.abs(k) % 2 === 1) { p.setX(i, x * .82); p.setZ(i, z * .82); } }
  g0.computeVertexNormals(); return g0; }
const gearBox = new THREE.Group(); gearBox.position.z = -2.2; inside.add(gearBox);
const gearMat = std('#f0b429', { metalness: .55, roughness: .35 }), gearMat2 = std('#c9ced6', { metalness: .6, roughness: .3 });
const bigGear = new THREE.Mesh(gearGeo(1.65, 24, .5), gearMat); bigGear.rotation.x = Math.PI / 2; gearBox.add(bigGear);
const smallGear = new THREE.Mesh(gearGeo(.55, 8, .5), gearMat2); smallGear.rotation.x = Math.PI / 2; smallGear.position.set(0, 2.05, -.55); gearBox.add(smallGear);
const midGear = new THREE.Mesh(gearGeo(1.15, 18, .45), gearMat); midGear.rotation.x = Math.PI / 2; midGear.position.set(0, 2.05, -1.1); gearBox.add(midGear);
const tinyGear = new THREE.Mesh(gearGeo(.4, 7, .45), gearMat2); tinyGear.rotation.x = Math.PI / 2; tinyGear.position.set(0, .5, -1.6); gearBox.add(tinyGear);
const genGroup = new THREE.Group(); genGroup.position.set(0, .5, -6.8); inside.add(genGroup);
const generator = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.4, 20), std('#3c6fb5', { metalness: .3 })); generator.rotation.x = Math.PI / 2; genGroup.add(generator);
const genSpin = new THREE.Group(); genGroup.add(genSpin);
for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(.15, 2.68, .3), std('#c87533', { emissive: new THREE.Color('#ff7a1a'), emissiveIntensity: 0 })); r.rotation.z = i * Math.PI / 6; r.position.z = 1.75; genSpin.add(r); }
const genShaft = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 4.4, 10), std('#8d96a0', { metalness: .5 })); genShaft.rotation.x = Math.PI / 2; genShaft.position.set(0, .5, -4); inside.add(genShaft);
// girouette + anémomètre sur le toit
const vaneG = new THREE.Group(); vaneG.position.set(0, 2.1, -7.5); yaw.add(vaneG);
const vaneTurn = new THREE.Group(); vaneG.add(vaneTurn); const anemo = new THREE.Group(); vaneG.add(anemo);
{ const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 6), std('#666')); pole.position.y = .8; vaneG.add(pole);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, 1.1), std('#e3463a')); fin.position.set(0, 1.6, -.6); vaneTurn.add(fin);
  const arr = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 8), std('#333')); arr.rotation.x = Math.PI / 2; arr.position.set(0, 1.6, .5); vaneTurn.add(arr);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.6, 5), std('#333')); rod.rotation.x = Math.PI / 2; rod.position.set(0, 1.6, 0); vaneTurn.add(rod);
  anemo.position.set(1.2, 0, 0); const p2 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.4, 6), std('#666')); p2.position.y = .7; anemo.add(p2);
  const cups = new THREE.Group(); cups.position.y = 1.45; anemo.add(cups); anemo.userData.cups = cups;
  for (let i = 0; i < 3; i++) { const a = new THREE.Group(); a.rotation.y = i * 2.094; cups.add(a); const r = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .6, 4), std('#333')); r.rotation.z = Math.PI / 2; r.position.x = .3; a.add(r);
    const c = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 6, 0, Math.PI), std('#e8e8e8')); c.position.x = .62; c.rotation.y = Math.PI / 2; a.add(c); } }
// feux rouges
const redMat = new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: new THREE.Color('#ff1a1a'), emissiveIntensity: 0 });
const redLights = []; for (const x of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), redMat); l.position.set(x * 1, 2.3, -9); yaw.add(l); redLights.push(l); }
// câble de cuivre dans le mât (rayons X)
const mastCable = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, MAST_H + 6, 6), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0, fog: false })); mastCable.position.y = (MAST_H - 6) / 2; tower.add(mastCable);
const pulses = []; for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0, fog: false })); scene.add(s); pulses.push(s); }

// socle béton + coupe du sol
const baseG = new THREE.Group(); scene.add(baseG);
const concrete = std('#c8c4bb'); const baseSlab = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 3.5, 8), concrete); baseSlab.position.y = -2.4; baseG.add(baseSlab);
const basePed = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 1.4, 16), concrete); basePed.position.y = -.4; baseG.add(basePed);
for (const m of [baseSlab, basePed]) { m.castShadow = m.receiveShadow = true; }
const section = new THREE.Group(); scene.add(section); section.visible = false;
{ const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const c = cv.getContext('2d');
  const grd = c.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#6a8f3a'); grd.addColorStop(.05, '#8a5a35'); grd.addColorStop(.5, '#7a4e2e'); grd.addColorStop(1, '#5a3a22');
  c.fillStyle = grd; c.fillRect(0, 0, 256, 256); const r = rng(3); c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 160; i++) { c.beginPath(); c.ellipse(r() * 256, 20 + r() * 236, 3 + r() * 6, 2 + r() * 3, 0, 0, 7); c.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide });
  const a = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat); a.rotation.y = Math.PI / 2; a.position.set(0, -7, 20); section.add(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat); b.position.set(20, -7, 0); section.add(b);
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), std('#4a3020')); bot.rotation.x = -Math.PI / 2; bot.position.set(20, -14, 20); section.add(bot); }
const CLIP = [new THREE.Plane(V(-1, 0, 0), 0), new THREE.Plane(V(0, 0, -1), 0)];

// ---------------------------------------------------------------- effets
// contours lumineux (coque inversée)
const outlines = [];
function outline(obj, color = '#ffffff', grow = .06, name) {
  const grp = []; obj.updateMatrixWorld(true);
  obj.traverse(o => { if (!o.isMesh || o.userData.isOutline) return;
    const m = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.userData.isOutline = true; m.userData.grow = grow; m.renderOrder = 2; o.add(m); grp.push(m); });
  outlines.push({ name, grp }); return grp;
}
function setOutline(grp, a) { for (const m of grp) { m.material.opacity = a; m.visible = a > .01; const s = 1 + m.userData.grow; m.scale.set(s, s, s); } }
const OL = {
  fan: outline(fan, '#ffffff', .08), mast: outline(mast, '#ffffff', .035), blades: outline(rotor, '#ffffff', .04),
  gear: outline(gearBox, '#ffffff', .08), gen: outline(genGroup, '#ffffff', .06), vane: outline(vaneG, '#ffffff', .15),
  motors: outline(yawMotors, '#ffffff', .15), base: outline(baseG, '#ffffff', .03), sign: outline(signGroup, '#ffffff', .05)
};

// vent : traits instanciés
const NW = 220; const windMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .6, depthWrite: false }), NW);
windMesh.frustumCulled = false; scene.add(windMesh);
const windSeeds = []; { const r = rng(17); for (let i = 0; i < NW; i++) windSeeds.push([r(), r() * 2 - 1, r() * 2 - 1, .5 + r(), r()]); }
// éclair
let boltMesh = null;
function makeBolt(from, to, seed) { const r = rng(seed), pts = [], n = 14; for (let i = 0; i <= n; i++) { const k = i / n; const p = from.clone().lerp(to, k); if (i > 0 && i < n) p.add(V((r() - .5) * 18, (r() - .5) * 6, (r() - .5) * 18)); pts.push(p); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 80, .7, 6), new THREE.MeshBasicMaterial({ color: '#f4f7ff', fog: false })); }
const boltLight = new THREE.PointLight(0xbcd4ff, 0, 600, 1.2); scene.add(boltLight);
// nuages d'orage
const stormClouds = new THREE.Group(); scene.add(stormClouds);
const stormMat = std('#4a5260', { roughness: 1, transparent: true, opacity: 0 });
{ const r = rng(31); for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(40 + r() * 50, 1), stormMat); const a = r() * 6.283, d = 60 + r() * 600;
  m.position.set(Math.cos(a) * d, 200 + r() * 80, Math.sin(a) * d); m.scale.y = .45; stormClouds.add(m); } }

// ---------------------------------------------------------------- dynamique (vitesses intégrées)
function fanOmega(t) { if (t < EV.mastUp) return t > EV.slow ? lerp(22, 7, seg(t, EV.slow, EV.slow + .8)) : 22; return lerp(7, 45, seg(t, EV.top, EV.top + 1)); }
function rotorOmega(t) {
  if (t < EV.blades) return 0; let w = 1.6 * seg(t, EV.blades, EV.blades + 1.5);
  if (t > EV.windTurn) w *= 1 - ease(seg(t, EV.windTurn, EV.profil + .4));
  if (t > EV.yaw) w = 1.6 * ease(seg(t, EV.yaw + .6, EV.yawEnd + 1));
  if (t > EV.storm) w = lerp(1.6, 5.5, ease(seg(t, EV.storm, EV.race + .5)));
  if (t > EV.pitch) w = lerp(5.5, .08, ease(seg(t, EV.pitch, EV.feather + .3)));
  if (t > EV.stormEnd) w = lerp(.08, 1.6, ease(seg(t, EV.stormEnd, EV.stormEnd + 2)));
  return w;
}
const DT = 1 / 240; let INT = null;
function integrate() { INT = { fan: [0], rot: [0] }; let a = 0, b = 0; for (let t = 0; t < EV.end + 1; t += DT) { a += fanOmega(t) * DT; b += rotorOmega(t) * DT; INT.fan.push(a); INT.rot.push(b); } }
const angleAt = (arr, t) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(t / DT)))];
function yawAngle(t) { return Math.PI / 2 * ease(seg(t, EV.yaw, EV.yawEnd)); }
function windState(t) { // centre, taille, direction, vitesse, opacité
  const front = t < EV.windTurn ? V(0, 0, -1) : V(-1, 0, 0);
  if (t < EV.mastUp) { const slow = seg(t, EV.slow, EV.slow + .6); return { c: V(0, 1.2, .5), s: 3, d: V(0, 0, -1), v: lerp(4, 1.4, slow), a: lerp(.45, .25, slow), len: .6, w: .012, n: 40 }; }
  if (t < EV.top) return { a: 0 };
  if (t < EV.blades) return { c: V(0, 98.3, t > EV.tiny ? 2.2 : -10), s: t > EV.tiny ? 1.2 : 26, d: V(0, 0, -1), v: t > EV.tiny ? 3 : 34, a: .5, len: t > EV.tiny ? .3 : 6, w: t > EV.tiny ? .008 : .05, n: t > EV.tiny ? 30 : 120 };
  if (t < EV.cta) return { c: V(0, 100, 30), s: 75, d: front, v: 26, a: .45, len: 9, w: .18 };
  if (t < EV.windTurn) return { a: 0 };
  if (t < EV.storm) return { c: V(30, 100, 0), s: 80, d: front, v: 26, a: .5, len: 10, w: .2 };
  if (t < EV.stormEnd) return { c: V(30, 95, 0), s: 110, d: front, v: lerp(26, 75, seg(t, EV.storm, EV.storm + 1)), a: .55, len: 22, w: .25 };
  return { c: V(30, 100, 0), s: 80, d: front, v: 22, a: .35 * (1 - seg(t, EV.base - .5, EV.base)), len: 9, w: .18 };
}

// ---------------------------------------------------------------- plans caméra (coupes franches)
// [début, [pos départ], [cible départ], fov, [pos fin], [cible fin], fov fin, échelle d'ombre]
let SHOTS;
function buildShots() {
  const E = EV, S = [];
  const add = (t, p0, c0, f0, p1, c1, f1, sh = 30) => S.push({ t, p0: V(...p0), c0: V(...c0), f0, p1: V(...(p1 || p0)), c1: V(...(c1 || c0)), f1: f1 || f0, sh });
  add(0, [5.5, 1.9, 7.5], [-1, 1.4, 0], 42, [4.2, 1.7, 5.6], [-.8, 1.4, 0], 40, 25);
  add(E.eolLabel - .25, [1.3, 1.75, 1.9], [0, 1.62, 0], 34, [1.0, 1.7, 1.5], [0, 1.62, 0], 32, 6);
  add(E.ground - .2, [2.2, .32, 4.5], [0, .6, -1], 46, [1.6, .3, 3.6], [0, .6, -1], 46, 12);
  { const b = bulb.getWorldPosition(new THREE.Vector3()), n = V(Math.sin(.5), 0, Math.cos(.5)), sd = V(Math.cos(.5), 0, -Math.sin(.5));
    const c0 = b.clone().addScaledVector(n, 3.2).addScaledVector(sd, 1.4).add(V(0, .2, 0)), c1 = b.clone().addScaledVector(n, 2.4).addScaledVector(sd, 1).add(V(0, .15, 0));
    add(E.bulb - .1, c0.toArray(), b.toArray(), 34, c1.toArray(), b.toArray(), 32, 10); }
  add(E.mastUp - .05, [26, 2.2, 52], [0, 4, 0], 52, [32, 6, 64], [0, 90, 0], 52, 120);
  add(E.hundred - .1, [95, 30, 150], [0, 52, 0], 46, [85, 34, 138], [0, 54, 0], 46, 160);
  add(E.top - .05, [9, 101, 18], [0, 98.2, 0], 42, [7, 100.4, 14], [0, 98.2, 0], 40, 20);
  add(E.tiny - .1, [1.3, 98.7, 3.6], [0, 98.3, 1.75], 34, [1.0, 98.6, 3.2], [0, 98.3, 1.75], 32, 6);
  add(E.blades - .1, [70, 78, 165], [0, 92, 0], 50, [62, 80, 150], [0, 94, 0], 50, 160);
  add(E.double - .1, [0, 100, 205], [0, 100, 0], 46, [0, 100, 190], [0, 100, 0], 46, 160);
  add(E.shake - .15, [40, 55, 75], [0, 75, 0], 50, [36, 52, 70], [0, 76, 0], 50, 140);
  add(E.three - .1, [0, 100, 190], [0, 100, 0], 46, [0, 100, 182], [0, 100, 0], 46, 160);
  add(E.round - .1, [110, 30, 130], [0, 75, 0], 48, [100, 34, 122], [0, 78, 0], 48, 170);
  add(E.slowRpm - .1, [16, 104, 8], [0, 100.3, -2], 40, [14, 103.5, 6], [0, 100.3, -2.5], 40, 25);
  add(E.gen - .1, [7, 102.5, -3], [0, 100.5, -6.8], 40, [6, 102.2, -4], [0, 100.5, -6.8], 38, 15);
  add(E.gear - .1, [11, 103.5, 3], [0, 101, -2.5], 42, [9, 103, 2], [0, 101, -2.4], 40, 18);
  add(E.multi - .2, [5, 102.3, .5], [0, 101.3, -2.8], 40, [4.2, 102, 0], [0, 101.3, -2.8], 38, 10);
  add(E.cta - .1, [-6.2, 2.5, 6.2], [-11, 2.2, -2], 44, [-6.8, 2.5, 5.2], [-11, 2.3, -2], 42, 15);
  add(E.windTurn - .1, [20, 330, 45], [0, 100, 0], 34, [18, 320, 40], [0, 100, 0], 34, 120);
  add(E.profil - .1, [160, 95, 6], [0, 100, 0], 40, [150, 96, 6], [0, 100, 0], 40, 160);
  add(E.vane - .1, [5, 105.5, -14], [0, 103.6, -7.5], 36, [4.5, 105, -12.5], [0, 103.6, -7.5], 34, 12);
  add(E.motors - .1, [-8.5, 97.4, 6.5], [0, 99.1, 0], 32, [-7.8, 97.5, 6], [0, 99.1, 0], 30, 12);
  add(E.yaw - .05, [20, 330, 45], [0, 100, 0], 34, [18, 320, 40], [0, 100, 0], 34, 120);
  add(E.storm - .1, [150, 30, 110], [0, 85, 0], 50, [140, 34, 100], [0, 88, 0], 50, 170);
  add(E.race - .1, [190, 100, 25], [0, 100, 0], 42, [180, 100, 22], [0, 100, 0], 42, 160);
  add(E.pitch - .1, [62, 112, 34], [0, 100, 0], 40, [56, 110, 30], [0, 100, 0], 38, 90);
  add(E.feather - .15, [190, 70, 80], [0, 92, 0], 44, [182, 72, 76], [0, 94, 0], 44, 170);
  add(E.bolt - 1.6, [210, 15, 160], [0, 95, 0], 50, [200, 18, 150], [0, 98, 0], 50, 180);
  add(E.xray - .1, [80, 80, 70], [0, 95, 0], 46, [74, 82, 64], [0, 95, 0], 46, 150);
  add(E.earth - .2, [14, 6, 18], [0, 4, 0], 44, [12, 5, 15], [0, 3, 0], 44, 30);
  add(E.base - .1, [34, 12, 40], [0, -3, 0], 46, [30, 11, 35], [0, -2, 0], 46, 50);
  add(E.lights - .1, [9, 103.5, -18], [0, 102, -8], 36, [8, 103, -16], [0, 102, -8], 34, 15);
  add(E.bravo - .1, [120, 25, 160], [0, 60, 0], 50, [150, 40, 200], [-10, 62, 0], 52, 200);
  return S;
}
function cameraAt(t) {
  let s = SHOTS[0], next = null; for (let i = 0; i < SHOTS.length; i++) { if (SHOTS[i].t <= t) { s = SHOTS[i]; next = SHOTS[i + 1]; } }
  const t1 = next ? next.t : EV.end, k = ease(seg(t, s.t, t1)) * .7 + seg(t, s.t, t1) * .3;
  const p = s.p0.clone().lerp(s.p1, k), c = s.c0.clone().lerp(s.c1, k), f = lerp(s.f0, s.f1, k);
  let shake = 0; if (t > EV.shake && t < EV.three) shake = .35 * seg(t, EV.shake, EV.shake + .3);
  if (t > EV.bolt && t < EV.bolt + .8) shake += 2.5 * Math.exp(-(t - EV.bolt) * 6);
  if (t > EV.race && t < EV.pitch) shake += .25;
  p.x += Math.sin(t * 47) * shake; p.y += Math.cos(t * 39) * shake;
  return { p, c, f, sh: s.sh, cutAge: t - s.t };
}

// ---------------------------------------------------------------- mise à jour de la scène
const tmpV = new THREE.Vector3();
function update(t) {
  const E = EV;
  // ciel / ambiance
  const storm = ease(seg(t, E.storm - .3, E.storm + .6)) * (1 - ease(seg(t, E.stormEnd, E.stormEnd + 1.2)));
  const sunset = ease(seg(t, E.bravo - .5, E.bravo + 1.5));
  const top = new THREE.Color('#5fb4ef').lerp(new THREE.Color('#2d3440'), storm).lerp(new THREE.Color('#f07a4a'), sunset);
  const mid = new THREE.Color('#bfe3f7').lerp(new THREE.Color('#58606b'), storm).lerp(new THREE.Color('#ffb877'), sunset);
  const bot = new THREE.Color('#e8f3f6').lerp(new THREE.Color('#6f7680'), storm).lerp(new THREE.Color('#ffe1b0'), sunset);
  skyMat.uniforms.top.value.copy(top); skyMat.uniforms.mid.value.copy(mid); skyMat.uniforms.bot.value.copy(bot);
  scene.fog.color.copy(bot); scene.fog.near = lerp(250, 120, storm); scene.fog.far = lerp(1800, 900, storm);
  sun.intensity = lerp(2.6, .35, storm) * lerp(1, .8, sunset); sun.color.set('#fff1d6').lerp(new THREE.Color('#ffb070'), sunset);
  hemi.intensity = lerp(1.25, .55, storm); stormMat.opacity = storm * .95; cloudMat.opacity = .95 * (1 - storm);
  clouds.rotation.y = t * .004;
  // ampoule
  let power = 0;
  if (t < E.mastUp) power = t < E.flicker ? .45 + .05 * Math.sin(t * 9) : (Math.sin(t * 37) > .3 ? .15 : .02) * (noise2(t * 8, 1) > .4 ? 1 : .2);
  else if (t < E.round) power = .1; else power = 1;
  if (t > E.windTurn && t < E.yawEnd + .5) power *= 1 - seg(t, E.windTurn, E.profil + .3);
  if (t > E.pitch && t < E.stormEnd + .5) power *= .3;
  bulbMat.emissiveIntensity = power * 4; bulbLight.intensity = power * 6; windowMat.emissiveIntensity = (power > .9 ? .8 : 0) + sunset * 1.4;
  // balai / hélice / mât
  const mk = ease(seg(t, E.mastUp, E.mastEnd + .5)), mh = lerp(1.6, MAST_H, mk);
  broom.visible = t < E.mastUp + .05;
  mast.visible = t >= E.mastUp; mast.scale.y = mh / MAST_H; mast.position.y = mh / 2;
  fan.visible = t < E.blades + .05; fan.position.set(0, t < E.mastUp ? 1.62 : mh + .3, t < E.mastUp ? .02 : 1.75);
  fanRotor.rotation.z = -angleAt(INT.fan, t);
  const nac = easeBack(seg(t, E.blades - .05, E.blades + .35));
  yaw.visible = t >= E.blades - .05; yaw.scale.setScalar(Math.max(.001, nac));
  yawRing.visible = yawMotors.visible = t >= E.blades;
  yaw.rotation.y = yawAngle(t);
  // tremblement du mât (2 pales)
  const sh = t > E.two - .3 && t < E.three + .4 ? seg(t, E.two - .3, E.shake) * (1 - seg(t, E.three, E.three + .4)) : 0;
  tower.rotation.z = Math.sin(t * 13) * .006 * sh; tower.rotation.x = Math.cos(t * 11) * .004 * sh;
  // pales
  const lenK = ease(seg(t, E.blades + .1, E.bladesEnd + .3));
  const threeK = ease(seg(t, E.three, E.three + .6));
  const ang = [0, lerp(Math.PI, Math.PI * 2 / 3, threeK), Math.PI * 4 / 3];
  const pitch = Math.PI / 2 * .85 * ease(seg(t, E.pitch, E.feather)) * (1 - ease(seg(t, E.stormEnd, E.stormEnd + 1.5)));
  rotor.rotation.z = -angleAt(INT.rot, t);
  blades.forEach((b, i) => { b.arm.rotation.z = ang[i]; b.len.scale.set(1, Math.max(.02, lenK), 1);
    b.arm.visible = i < 2 ? true : t >= E.three; if (i === 2) b.len.scale.setScalar(Math.max(.01, easeBack(seg(t, E.three, E.three + .5)))); b.pitchG.rotation.y = pitch; });
  // coupe de la nacelle (intérieur visible)
  const cut = win(t, E.slowRpm - .2, E.cta, .3);
  shellMat.opacity = lerp(1, .12, cut); shellMat.depthWrite = cut < .5; hubMat.opacity = lerp(1, .25, cut);
  inside.visible = cut > .01;
  const gk = easeOut(seg(t, E.gear, E.gear + .6)); gearBox.visible = t >= E.gear; gearBox.position.y = lerp(7, 0, gk);
  genGroup.position.z = lerp(-5.2, -6.8, gk);
  const rA = angleAt(INT.rot, t); shaft.rotation.y = rA; bigGear.rotation.y = rA; midGear.rotation.y = -rA * 1.65 / .55 * .1; smallGear.rotation.y = -rA * 1.65 / .55;
  tinyGear.rotation.y = rA * 8; genSpin.rotation.z = t >= E.gear ? rA * 100 * .02 + t * 40 : rA; genShaft.rotation.y = genSpin.rotation.z;
  genSpin.children.forEach(c => c.material.emissiveIntensity = t > E.multi ? 1.5 : 0);
  // girouette / moteurs d'orientation
  const vk = easeBack(seg(t, E.vane, E.vane + .4)); vaneG.visible = t >= E.vane; vaneG.scale.setScalar(Math.max(.01, vk));
  vaneTurn.rotation.y = t < E.yawEnd ? Math.PI / 2 * (1 - ease(seg(t, E.yaw, E.yawEnd))) + Math.sin(t * 3) * .05 : Math.sin(t * 3) * .05;
  anemo.userData.cups.rotation.y = t * (t > E.storm && t < E.stormEnd ? 18 : 6);
  // rayons X : pales et mât transparents, cuivre visible
  const xr = win(t, E.xray - .1, E.base, .3); bladeMat.opacity = lerp(1, .28, xr); bladeMat.depthWrite = xr < .5;
  mastMat.opacity = lerp(1, .3, xr); mastMat.depthWrite = xr < .5;
  const cop = seg(t, E.copper - .3, E.copper + .2) * xr;
  blades.forEach(b => b.cable.material.opacity = cop); mastCable.material.opacity = cop;
  // impulsions électriques : de la pointe d'une pale jusqu'au sol
  const tipW = blades[0].tipMark.getWorldPosition(new THREE.Vector3()); scene.updateMatrixWorld();
  const hubW = rotor.getWorldPosition(new THREE.Vector3());
  pulses.forEach((p, i) => { const k = ((t - E.flow) * .9 + i / pulses.length) % 1; const on = t > E.flow && t < E.base ? 1 : 0;
    const path = k < .45 ? tipW.clone().lerp(hubW, k / .45) : V(0, lerp(hubW.y, -1, (k - .45) / .55), 0);
    p.position.copy(path); p.material.opacity = on * xr; p.visible = on * xr > .01; });
  // éclair
  if (boltMesh) { scene.remove(boltMesh); boltMesh.geometry.dispose(); boltMesh = null; }
  if (t > E.bolt - .05 && t < E.bolt + .45 && Math.sin((t - E.bolt) * 60) > -.3) {
    const tip = blades[0].tipMark.getWorldPosition(new THREE.Vector3()); boltMesh = makeBolt(V(tip.x + 40, 420, tip.z - 30), tip, 7); scene.add(boltMesh);
    boltLight.position.copy(tip); boltLight.intensity = 4000; } else boltLight.intensity = 0;
  // socle + coupe
  const bk = easeOut(seg(t, E.base, E.base + .7)); baseG.visible = t >= E.base - .1; baseG.scale.set(1, Math.max(.01, bk), 1); baseG.position.y = 0;
  const sec = t >= E.base - .1 && t < E.lights - .1; section.visible = sec;
  groundMat.clippingPlanes = sec ? CLIP : null; groundMat.clipIntersection = true; groundMat.needsUpdate = true;
  // feux rouges clignotants
  redLights.forEach(l => l.visible = t > E.lights - .05); const blink = t > E.lights && (Math.floor((t - E.lights) * 1.6) % 2 === 0); redMat.emissiveIntensity = blink ? 6 : (t > E.lights ? .3 : 0);
  // contours lumineux (impulsion à l'apparition)
  const pulse = (a, b) => win(t, a, b, .15) * (.55 + .45 * Math.sin(t * 10));
  setOutline(OL.fan, pulse(E.fan + .1, E.ground - .2) * .9);
  setOutline(OL.mast, pulse(E.mastUp, E.top - .3));
  setOutline(OL.blades, pulse(E.blades + .2, E.two) * .8 + pulse(E.three, E.round) * .8);
  setOutline(OL.gear, pulse(E.gear, E.cta - .1)); setOutline(OL.gen, pulse(E.gen, E.gear));
  setOutline(OL.vane, pulse(E.vane, E.motors)); setOutline(OL.motors, pulse(E.motors, E.storm - .2));
  setOutline(OL.base, pulse(E.base, E.lights)); setOutline(OL.sign, pulse(E.cta + .3, E.windTurn - .2));
  // panneau
  const sk = easeBack(seg(t, E.cta, E.cta + .45)); signGroup.scale.setScalar(Math.max(.01, sk)); signGroup.visible = t > E.cta - .05 && t < E.windTurn;
  // fermier
  const fd = farmer.userData; fd.arms[0].rotation.set(0, 0, -.15); fd.arms[1].rotation.set(0, 0, .15); fd.head.rotation.set(0, 0, 0);
  farmer.position.y = 0;
  if (t > E.mastUp && t < E.top) fd.head.rotation.x = -.7 * ease(seg(t, E.mastUp, E.mastUp + .6));
  if (t > E.cta && t < E.windTurn) { farmer.position.set(-8.6, 0, -.4); farmer.rotation.y = .3; fd.arms[1].rotation.set(-1.2, 0, 1.3); }
  else { farmer.position.set(-1.7, 0, 1.4); farmer.rotation.y = .5; }
  if (t > E.flicker && t < E.mastUp) { fd.arms[0].rotation.z = -.4; fd.arms[1].rotation.z = .4; fd.head.rotation.z = Math.sin(t * 4) * .15; }
  if (t > E.bravo) { const j = Math.abs(Math.sin((t - E.bravo) * 7)); farmer.position.y = j * .3; fd.arms[0].rotation.z = -2.6; fd.arms[1].rotation.z = 2.6; }
  // vent
  const ws = windState(t); windMesh.visible = (ws.a || 0) > 0; windMesh.count = ws.n || NW;
  if (windMesh.visible) { const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), ws.d);
    const side = new THREE.Vector3().crossVectors(ws.d, V(0, 1, 0)).normalize();
    windSeeds.forEach((sd, i) => { const ph = ((sd[0] + t * ws.v / (2 * ws.s)) % 1) * 2 - 1;
      const p = ws.c.clone().addScaledVector(ws.d, ph * ws.s).addScaledVector(side, sd[1] * ws.s * .8).add(V(0, sd[2] * ws.s * .5, 0));
      m.compose(p, q, V(ws.len * sd[3], ws.w, ws.w)); windMesh.setMatrixAt(i, m); });
    windMesh.instanceMatrix.needsUpdate = true; windMesh.material.opacity = ws.a; }
}

// ---------------------------------------------------------------- habillage 2D
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function tag(text, x, y, a, ax, ay) {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a);
  if (ax !== undefined) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(ax, ay); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ax, ay, 7, 0, 7); g.fill(); }
  const s = easeBack(clamp(a * 1.5)); g.translate(x, y); g.scale(s, s);
  g.font = "800 34px 'Inter Display'"; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + 40; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 14; g.fillStyle = 'rgba(12,14,18,.9)';
  g.beginPath(); g.roundRect(-w / 2, -28, w, 56, 12); g.fill(); g.shadowColor = 'transparent'; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#fff'; g.fillText(text, 0, 2); g.restore();
}
function stat(text, x, y, a, size = 150, color = '#ffffff') {
  if (a <= 0) return; g.save(); g.globalAlpha = clamp(a * 2); g.translate(x, y); const s = easeBack(clamp(a * 1.6)); g.scale(s, s);
  g.font = `900 ${size}px 'Inter Display'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 30; g.lineWidth = size * .12; g.strokeStyle = 'rgba(10,12,16,.95)'; g.strokeText(text, 0, 0);
  g.shadowColor = 'transparent'; g.fillStyle = color; g.fillText(text, 0, 0); g.restore();
}
function warn(t, t0) { const k = t - t0; if (k < 0 || k > 1.2) return; const a = 1 - seg(k, .9, 1.2), s = easeBack(seg(k, 0, .2));
  g.save(); g.globalAlpha = a; g.translate(540, 560); g.scale(s, s); g.fillStyle = '#ff3b30'; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 24;
  g.beginPath(); g.moveTo(0, -95); g.lineTo(105, 85); g.lineTo(-105, 85); g.closePath(); g.lineJoin = 'round'; g.lineWidth = 26; g.strokeStyle = '#ff3b30'; g.stroke(); g.fill();
  g.shadowColor = 'transparent'; g.fillStyle = '#fff'; g.font = "900 130px 'Inter Display'"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 20); g.restore(); }
function overlays(t, cam) {
  const E = EV;
  const P = v => project(v);
  { const [x, y] = P(V(0, 1.62, 0)); tag('ÉOLIENNE ?', x, y - 520, win(t, E.eolLabel, E.ground - .25)); }
  { const [x, y] = P(bulb.getWorldPosition(new THREE.Vector3())); tag('AMPOULE', x - 10, y - 260, win(t, E.bulb + .1, E.mastUp - .1), x, y - 20); }
  if (t > E.hundred && t < E.top) { const [x0, y0] = P(V(-12, 0, 0)), [x1, y1] = P(V(-12, MAST_H, 0)); const a = win(t, E.hundred, E.top - .05, .2);
    g.save(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, lerp(y0, y1, easeOut(seg(t, E.hundred, E.hundred + .5)))); g.stroke(); g.restore();
    tag('100 M', x1 - 40, (y0 + y1) / 2, a); }
  stat('VENT ×2', 540, 470, win(t, E.x2, E.x8 + .1, .15), 110);
  stat('ÉNERGIE ×8', 540, 470, win(t, E.x8, E.tiny - .1, .15), 120, '#ffd23f');
  { const [x, y] = P(V(0, 98.3, 2.2)); tag("FILET D'AIR", x, y - 300, win(t, E.filet, E.blades - .1), x, y - 40); }
  { const a = win(t, E.blades + .3, E.double - .1); tag('60 M', 540, 420, a); }
  if (t > E.double && t < E.shake - .15) { const [cx, cy] = P(V(0, 100, 3.6)); const [, ty] = P(V(0, 160, 3.6)); const r = Math.abs(cy - ty) * easeOut(seg(t, E.double, E.double + .6));
    g.save(); g.globalAlpha = win(t, E.double, E.shake - .15, .2); g.fillStyle = 'rgba(255,255,255,.18)'; g.strokeStyle = '#fff'; g.lineWidth = 6; g.setLineDash([22, 14]);
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.stroke(); g.restore(); stat('×4', 540, cy, win(t, E.x4, E.shake - .15, .15), 190, '#ffd23f'); }
  warn(t, E.shake);
  if (t > E.deg - .1 && t < E.round - .05) { const [cx, cy] = P(V(0, 100, 3.6)); const a = win(t, E.deg - .1, E.round - .05, .2);
    g.save(); g.globalAlpha = a; g.strokeStyle = '#ffd23f'; g.lineWidth = 8; for (const b of blades) { const [x, y] = P(b.tipMark.getWorldPosition(new THREE.Vector3())); g.beginPath(); g.moveTo(cx, cy); g.lineTo(lerp(cx, x, .55), lerp(cy, y, .55)); g.stroke(); }
    g.restore(); stat('120°', 540, 470, a, 140, '#ffd23f'); }
  { const [x, y] = P(V(0, 100.5, 1)); tag('15 TR/MIN', x, y - 260, win(t, E.slowRpm, E.gen - .15), x, y); }
  { const [x, y] = P(V(0, 100.5, -6.8)); tag('GÉNÉRATRICE', x, y - 280, win(t, E.gen, E.gear - .15), x, y - 30); tag('1 500 TR/MIN', x, y + 280, win(t, E.fastRpm, E.gear - .15), x, y + 40); }
  stat('×100', 540, 470, win(t, E.x100, E.multi - .25, .15), 170, '#ffd23f');
  { const [x, y] = P(V(0, 101.5, -2.5)); tag('MULTIPLICATEUR', x, y - 330, win(t, E.multi, E.cta - .12), x, y - 40); }
  if (t > E.windTurn - .1 && t < E.profil - .1) { const a = win(t, E.windTurn, E.profil - .1, .2); const [cx, cy] = P(V(0, 100, 0));
    g.save(); g.globalAlpha = a; g.strokeStyle = '#7fd0ff'; g.lineWidth = 20; g.lineCap = 'round'; const k = easeOut(seg(t, E.windTurn, E.windTurn + .5));
    for (const dy of [-120, 0, 120]) { g.beginPath(); g.moveTo(cx + 480, cy + dy); g.lineTo(cx + lerp(480, 140, k), cy + dy); g.stroke(); g.beginPath(); g.moveTo(cx + lerp(480, 140, k) + 40, cy + dy - 30); g.lineTo(cx + lerp(480, 140, k), cy + dy); g.lineTo(cx + lerp(480, 140, k) + 40, cy + dy + 30); g.stroke(); }
    g.restore(); tag('VENT', cx + 330, cy - 220, a); }
  { const [x, y] = P(V(0, 101.5, 0)); tag('DE PROFIL', x, y - 300, win(t, E.profil, E.vane - .12), x, y - 30); }
  { const [x, y] = P(V(0, 103.7, -7.5)); tag('GIROUETTE', x, y - 300, win(t, E.vane + .2, E.motors - .12), x, y - 40); }
  { const [x, y] = P(V(1.4, 99.4, 1.4)); tag("MOTEURS D'ORIENTATION", 540, y + 330, win(t, E.motors + .1, E.yaw - .1), x, y + 20); }
  stat('90 KM/H', 540, 470, win(t, E.kmh, E.pitch - .1, .15), 140, '#ff4b3a');
  { const tag2 = win(t, E.feather, E.bolt - 1.65); tag('MISE EN DRAPEAU', 540, 420, tag2); }
  { const [x, y] = P(blades[0].tipMark.getWorldPosition(new THREE.Vector3())); tag('CÂBLE EN CUIVRE', 540, 420, win(t, E.copper, E.earth - .25)); }
  { tag('TERRE', 540, 420, win(t, E.earth, E.base - .12)); }
  { tag('1 000 T DE BÉTON', 540, 400, win(t, E.tons, E.lights - .12)); }
  warn(t, E.profil); warn(t, E.race); warn(t, E.flicker);
  // pluie
  const storm = seg(t, E.storm - .3, E.storm + .6) * (1 - seg(t, E.stormEnd, E.stormEnd + 1.2));
  if (storm > 0) { const r = rng(5); g.strokeStyle = `rgba(210,225,240,${.4 * storm})`; g.lineWidth = 2.5;
    for (let i = 0; i < 220; i++) { const x = (r() * W + t * 300) % W, y = (r() * H + t * 2200 * (.8 + r() * .4)) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 16, y + 54); g.stroke(); } }
  // halos des feux rouges
  if (t > E.lights && redMat.emissiveIntensity > 1) for (const l of redLights) { const [x, y, z] = P(l.getWorldPosition(new THREE.Vector3())); if (z > 1) continue;
    const rg = g.createRadialGradient(x, y, 2, x, y, 90); rg.addColorStop(0, 'rgba(255,60,50,.8)'); rg.addColorStop(1, 'rgba(255,60,50,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 90, 0, 7); g.fill(); }
  // flash de l'éclair / félicitations
  const fl = (t > E.bolt ? .9 * Math.exp(-(t - E.bolt) * 7) : 0) + (t > E.bravo ? .5 * Math.exp(-(t - E.bravo) * 6) : 0);
  if (fl > .01) { g.fillStyle = `rgba(255,255,255,${Math.min(.9, fl)})`; g.fillRect(0, 0, W, H); }
  confetti(t);
}
function confetti(t) { const k = t - EV.bravo; if (k < 0) return; const r = rng(77), cols = ['#ffd23f', '#ff4b3a', '#22c55e', '#3b82f6', '#ffffff'];
  for (let i = 0; i < 160; i++) { const x0 = r() * W, vx = (r() - .5) * 300, vy = 220 + r() * 500, sp = (r() - .5) * 12, d = r() * .6; const tt = k - d; if (tt < 0) continue;
    const x = x0 + vx * tt + Math.sin(tt * 3 + i) * 30, y = -40 + vy * tt + 120 * tt * tt; if (y > H + 40) continue;
    g.save(); g.translate(x, y); g.rotate(sp * tt); g.fillStyle = cols[i % 5]; g.fillRect(-10, -6, 20, 12); g.restore(); } }
function caption(t) { // un mot à la fois, minuscules, blanc (style des références)
  let cur = -1; for (let i = 0; i < WORDS.length; i++) if (WORDS[i].t + VO <= t) cur = i;
  if (cur < 0) return; const w = WORDS[cur], nx = WORDS[cur + 1]; const endT = nx && nx.t - (w.t + w.d) < .6 ? nx.t + VO : w.t + w.d + VO + .25; if (t > endT) return;
  const txt = w.w.replace(/[.,:;!?…]/g, '').toLowerCase(); const k = easeBack(seg(t, w.t + VO, w.t + VO + .12));
  g.save(); g.translate(540, 1190); g.scale(lerp(.85, 1, k), lerp(.85, 1, k)); g.font = "900 76px 'Inter Display'"; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = 22; g.shadowOffsetY = 4; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.55)'; g.strokeText(txt, 0, 0);
  g.shadowColor = 'transparent'; g.fillStyle = '#fff'; g.fillText(txt, 0, 0); g.restore(); }

// ---------------------------------------------------------------- rendu
window.setTiming = d => { const b = buildEvents(d); EV = b.EV; CUTS = b.CUTS; VO = b.VO; WORDS = d.words; integrate(); SHOTS = buildShots(); window.DURATION = EV.end; return EV.end; };
window.render = function (t) {
  update(t);
  const cam = cameraAt(t); camera.position.copy(cam.p); camera.lookAt(cam.c); camera.fov = cam.f; camera.updateProjectionMatrix();
  // l'ombre suit le plan
  const s = cam.sh; sun.target.position.copy(cam.c); sun.position.copy(cam.c).addScaledVector(SUN_DIR, s * 3);
  const sc = sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .1; sc.far = s * 8; sc.updateProjectionMatrix();
  renderer.render(scene, camera);
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(glc, 0, 0);
  overlays(t, cam);
  // vignette légère
  const v = g.createRadialGradient(540, 900, 600, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  caption(t);
};
window.ready = document.fonts.load("900 76px 'Inter Display'").then(() => document.fonts.load("800 34px 'Inter Display'")).then(() => {
  // retracer le panneau une fois la police chargée
  const cv = window.__signCanvas, c = cv.getContext('2d'); c.fillStyle = '#1f8a4c'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = '#fff'; c.lineWidth = 26; c.strokeRect(30, 30, 964, 452);
  c.fillStyle = '#fff'; c.font = "900 150px 'Inter Display'"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ABONNE-TOI', 512, 210); c.font = "900 140px 'Inter Display'"; c.fillText('✓', 512, 370);
  window.__signTex.needsUpdate = true; window.__ready = true;
});
window.__loaded = true;
