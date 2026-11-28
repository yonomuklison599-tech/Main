// Personnage 3D « semi-réaliste » — démonstration de style (proportions humaines, peau PBR, yeux détaillés, mains à doigts)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const P = new URLSearchParams(location.search);
const W = +(P.get('w') || 1080), H = +(P.get('h') || 1350);
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
// fond studio en dégradé
{ const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2b3448'); g.addColorStop(.6, '#5a6680'); g.addColorStop(1, '#3a4256'); x.fillStyle = g; x.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const camera = new THREE.PerspectiveCamera(30, W / H, .01, 100);
const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(1.6, 3, 2.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -1.5; key.shadow.camera.right = 1.5; key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -.5; key.shadow.bias = -.0004; key.shadow.radius = 4; scene.add(key);
const rim = new THREE.DirectionalLight(0x9ec8ff, 2.2); rim.position.set(-2, 2.4, -2.2); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe2c8, .6); fill.position.set(-2, 1.2, 2); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a4038, .5));
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: '#4a5266', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
const skin = new THREE.MeshPhysicalMaterial({ color: '#e3b08c', roughness: .5, sheen: .35, sheenColor: new THREE.Color('#ffb8a0'), sheenRoughness: .6, clearcoat: .05 });
const lip = new THREE.MeshPhysicalMaterial({ color: '#b86a62', roughness: .35, clearcoat: .2 });
const hairM = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: .55, metalness: .05 });
const hoodie = new THREE.MeshStandardMaterial({ color: '#2f4a7a', roughness: .92 });
const hoodie2 = new THREE.MeshStandardMaterial({ color: '#263d66', roughness: .95 });
const jeans = new THREE.MeshStandardMaterial({ color: '#2e3a52', roughness: .85 });
const shoeM = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: .45 }), soleM = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: .6 });
const cap = (r, l, m, seg = 16) => M(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, seg), m));
const ell = (rx, ry, rz, m, seg = 32) => { const o = M(new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg * .75), m)); o.scale.set(rx, ry, rz); return o; };

const man = new THREE.Group(); scene.add(man);
// ---- jambes + baskets
const hips = new THREE.Group(); hips.position.y = .93; man.add(hips);
const legs = [];
for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .095, 0, 0); hips.add(hip);
  const th = cap(.072, .34, jeans); th.position.y = -.21; hip.add(th); const knee = new THREE.Group(); knee.position.y = -.43; hip.add(knee);
  const sh = cap(.06, .34, jeans); sh.position.y = -.2; knee.add(sh);
  const shoe = new THREE.Group(); shoe.position.set(0, -.44, .03); knee.add(shoe); const up = M(new THREE.Mesh(new RoundedBoxGeometry(.11, .085, .27, 4, .04), shoeM)); up.position.y = .02; shoe.add(up); const so = M(new THREE.Mesh(new RoundedBoxGeometry(.118, .03, .285, 3, .012), soleM)); so.position.y = -.03; shoe.add(so);
  const lace = M(new THREE.Mesh(new THREE.BoxGeometry(.05, .006, .08), new THREE.MeshStandardMaterial({ color: '#bbb' }))); lace.position.set(0, .064, .05); shoe.add(lace); legs.push({ hip, knee }); }
// ---- buste (sweat à capuche) en profil tourné
const torsoPts = [[.0, -.02], [.17, -.02], [.18, .06], [.17, .2], [.18, .34], [.21, .46], [.2, .52], [.12, .57], [.06, .58], [0, .58]].map(([x, y]) => new THREE.Vector2(x, y));
const torso = M(new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 48), hoodie)); torso.scale.set(1, 1, .62); torso.position.y = .9; man.add(torso);
const band = M(new THREE.Mesh(new THREE.TorusGeometry(.172, .018, 10, 48), hoodie2)); band.rotation.x = Math.PI / 2; band.scale.set(1, .62, 1); band.position.y = .9; man.add(band);
const pocket = M(new THREE.Mesh(new RoundedBoxGeometry(.24, .1, .02, 3, .008), hoodie2)); pocket.position.set(0, 1.02, .108); pocket.rotation.x = -.08; man.add(pocket);
const hood = M(new THREE.Mesh(new THREE.TorusGeometry(.085, .045, 12, 32, Math.PI * 1.25), hoodie)); hood.position.set(0, 1.47, -.025); hood.rotation.set(Math.PI / 2 + .25, 0, Math.PI * .375 + Math.PI); man.add(hood);
for (const s of [-1, 1]) { const st = M(new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .16, 6), new THREE.MeshStandardMaterial({ color: '#f0f0f0' }))); st.position.set(s * .035, 1.36, .115); st.rotation.x = .1; man.add(st); const tip = M(new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .02, 8), new THREE.MeshStandardMaterial({ color: '#cfcfcf', metalness: .6, roughness: .3 }))); tip.position.set(s * .035, 1.275, .12); man.add(tip); }
// ---- bras + mains à doigts
const arms = [];
function makeHand(s) { const h = new THREE.Group(); const palm = M(new THREE.Mesh(new RoundedBoxGeometry(.075, .085, .03, 4, .013), skin)); palm.position.y = -.045; h.add(palm);
  const fingers = []; for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set((i - 1.5) * .019 * s * -1, -.09, 0); h.add(f); const len = [.03, .036, .034, .026][i];
    const p1 = cap(.0085, len * .55, skin, 8); p1.position.y = -len * .4; f.add(p1); const j = new THREE.Group(); j.position.y = -len * .8; f.add(j); const p2 = cap(.008, len * .45, skin, 8); p2.position.y = -len * .32; j.add(p2); f.rotation.x = .25 + i * .05; j.rotation.x = .45; fingers.push(f); }
  const th = new THREE.Group(); th.position.set(.035 * s * -1, -.035, .012); h.add(th); const t1 = cap(.01, .03, skin, 8); t1.position.y = -.022; th.add(t1); th.rotation.set(.5, 0, .7 * s); return { h, fingers, th }; }
for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .2, 1.4, 0); man.add(sh); const up = cap(.058, .2, hoodie); up.position.y = -.14; sh.add(up);
  const el = new THREE.Group(); el.position.y = -.29; sh.add(el); const fo = cap(.05, .19, hoodie); fo.position.y = -.12; el.add(fo); const cuff = M(new THREE.Mesh(new THREE.CylinderGeometry(.047, .05, .04, 20), hoodie2)); cuff.position.y = -.25; el.add(cuff);
  const wr = new THREE.Group(); wr.position.y = -.27; el.add(wr); const hand = makeHand(s); wr.add(hand.h); arms.push({ sh, el, wr, hand }); }
// ---- cou + tête (tête sculptée : sphère déformée par des « muscles » gaussiens)
const neck = cap(.056, .05, skin); neck.position.y = 1.49; man.add(neck);
const head = new THREE.Group(); head.position.y = 1.625; head.scale.setScalar(1.08); man.add(head);
const G = (x, y, z, cx, cy, cz, sx, sy, sz) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2));
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const HS = V(.093, .118, .104);
function sculpt(x, y, z) { // x,y,z sur la sphère unité ; renvoie le rayon
  let r = 1;
  r *= 1 - .13 * sstep(-.15, -.95, y) * (1 - .6 * Math.max(0, z));         // mâchoire
  for (const s of [-1, 1]) r += .05 * G(x, y, z, s * .62, -.62, .35, .2, .14, .3);   // angle de mâchoire
  r += .06 * G(x, y, z, 0, -.9, .45, .35, .18, .4);                         // menton
  for (const s of [-1, 1]) {
    r -= .075 * G(x, y, z, s * .36, .12, .9, .17, .13, .35);                 // orbites
    r += .035 * G(x, y, z, s * .36, .33, .9, .22, .07, .3);                  // arcade
    r += .05 * G(x, y, z, s * .55, -.12, .78, .18, .16, .3);                 // pommettes
    r += .07 * G(x, y, z, s * .13, -.35, .95, .07, .06, .2);                 // ailes du nez
  }
  r += .13 * G(x, y, z, 0, -.1, .99, .07, .24, .25) * sstep(.2, -.3, y);     // arête du nez
  r += .13 * G(x, y, z, 0, -.32, .95, .1, .08, .2);                          // bout du nez
  r += .07 * G(x, y, z, 0, -.52, .9, .25, .05, .3);                          // lèvre sup
  r += .08 * G(x, y, z, 0, -.63, .87, .22, .05, .3);                         // lèvre inf
  r -= .03 * G(x, y, z, 0, -.575, .92, .26, .018, .3);                       // fente de la bouche
  r -= .02 * G(x, y, z, 0, -.46, .95, .03, .05, .2);                         // philtrum
  r -= .06 * G(x, y, z, 0, .0, -.2, 2, .4, .3) * 0;                          // (réserve)
  return r; }
function sculptedGeo(seg = 160, scale = 1, filter = null) { const g = new THREE.SphereGeometry(1, seg, seg * .75); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const r = sculpt(x, y, z) * scale; p.setXYZ(i, x * r * HS.x, y * r * HS.y, z * r * HS.z); }
  if (filter) { const idx = g.index.array, keep = []; for (let k = 0; k < idx.length; k += 3) { const a = idx[k], b = idx[k + 1], c = idx[k + 2]; const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3 / HS.x, cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3 / HS.y, cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3 / HS.z; if (filter(cx, cy, cz)) keep.push(a, b, c); } g.setIndex(keep); }
  g.computeVertexNormals(); return g; }
const faceGeo = sculptedGeo(180); { const p = faceGeo.attributes.position, col = []; const cS = new THREE.Color('#e3b08c'), cL = new THREE.Color('#b86a62'), cB = new THREE.Color('#7a5444'), cC = new THREE.Color('#e89a88');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / HS.x, y = p.getY(i) / HS.y, z = p.getZ(i) / HS.z; const c = cS.clone();
    const lipK = G(x, y, z, 0, -.575, .9, .24, .075, .3); c.lerp(cL, Math.min(1, lipK * 1.3));
    const beard = sstep(-.2, -.45, y) * sstep(-.3, .2, z) * (1 - Math.min(1, lipK * 1.6)) * (1 - G(x, y, z, 0, -.7, .9, .22, .1, .3) * .5); c.lerp(cB, beard * .45);
    for (const sx of [-1, 1]) c.lerp(cC, G(x, y, z, sx * .5, -.2, .8, .18, .14, .3) * .25); col.push(c.r, c.g, c.b); }
  faceGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
const skinV = skin.clone(); skinV.vertexColors = true; skinV.color.set('#ffffff');
const face = M(new THREE.Mesh(faceGeo, skinV)); head.add(face);
for (const s of [-1, 1]) { const ear = ell(.014, .03, .011, skin, 20); ear.position.set(s * .093, -.005, -.01); ear.rotation.y = s * .4; head.add(ear); const ein = ell(.008, .019, .005, new THREE.MeshPhysicalMaterial({ color: '#c58868', roughness: .6 }), 14); ein.position.set(s * .097, -.005, -.005); ein.rotation.y = s * .4; head.add(ein); }
// lèvres teintées (calque fin)

// yeux
function irisTex(col) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f4f0ea'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 60); g.addColorStop(0, '#0a0604'); g.addColorStop(.33, '#0a0604'); g.addColorStop(.37, col); g.addColorStop(.88, new THREE.Color(col).multiplyScalar(.55).getStyle()); g.addColorStop(1, '#140c06');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 60, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,214,150,.3)'; x.lineWidth = 1.5; for (let i = 0; i < 70; i++) { const a = i / 70 * 7; x.beginPath(); x.moveTo(128 + Math.cos(a) * 24, 128 + Math.sin(a) * 24); x.lineTo(128 + Math.cos(a) * 56, 128 + Math.sin(a) * 56); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const eyeM = new THREE.MeshPhysicalMaterial({ map: irisTex('#6b4226'), roughness: .04, clearcoat: 1, clearcoatRoughness: .02 });
const lids = [];
for (const s of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(s * .034, .014, .081); head.add(eg);
  const eye = M(new THREE.Mesh(new THREE.SphereGeometry(.0155, 40, 30), eyeM)); eye.rotation.y = -Math.PI / 2; eg.add(eye);
  const lid = M(new THREE.Mesh(new THREE.SphereGeometry(.0163, 40, 16, 0, Math.PI * 2, 0, Math.PI * .4), skin)); lid.rotation.x = -.42; eg.add(lid); lids.push(lid);
  const lidLine = M(new THREE.Mesh(new THREE.TorusGeometry(.0158, .0012, 6, 32, Math.PI * .85), new THREE.MeshStandardMaterial({ color: '#2a1a14', roughness: .6 }))); lidLine.rotation.set(-Math.PI / 2 + .2 + .55, 0, Math.PI * .075); lidLine.rotation.x = .38; lidLine.position.set(0, .009, .004); eg.add(lidLine);
  const low = M(new THREE.Mesh(new THREE.SphereGeometry(.0161, 40, 10, 0, Math.PI * 2, Math.PI * .74, Math.PI * .26), skin)); eg.add(low);
  const brow = M(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-s * .019, -.003, .002), V(s * .002, .005, .008), V(s * .024, .001, -.002)]), 20, .0038, 8), hairM)); brow.position.set(0, .026, .008); brow.scale.set(1, 1, .6); eg.add(brow); }
// cheveux : coque sculptée au-dessus de la ligne de cheveux + texture de mèches
const hairTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#3a2618'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 2600; i++) { const px = Math.random() * 512, py = Math.random() * 512, l = 10 + Math.random() * 30; x.strokeStyle = Math.random() > .5 ? 'rgba(20,12,8,.5)' : 'rgba(110,80,55,.35)'; x.lineWidth = 1 + Math.random() * 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + l * .3, py + l); x.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hairMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: hairTex, roughness: .6 });
const hairGeo = sculptedGeo(140, 1); { const p = hairGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / HS.x, y = p.getY(i) / HS.y, z = p.getZ(i) / HS.z;
    const front = sstep(.3, .5, y - .1 * Math.cos(x * 3) * Math.max(0, z)), side = sstep(.5, .62, Math.abs(x)) * sstep(-.05, .12, y) * sstep(.45, .25, z), back = sstep(-.05, -.25, z) * sstep(-.55, -.35, y);
    const k = Math.min(1, Math.max(front, side, back)); const top = 1 + .09 * k * (.6 + .4 * sstep(.2, .9, y)) - .05 * (1 - k) + .012 * Math.sin(x * 40) * Math.sin(z * 37) * k; p.setXYZ(i, p.getX(i) * top, p.getY(i) * top, p.getZ(i) * top); }
  hairGeo.computeVertexNormals(); }
const hair = M(new THREE.Mesh(hairGeo, hairMat)); head.add(hair);
// barbe de quelques jours : calque sombre sur le bas du visage

// ---- pose détendue
function pose(t = 0) { arms[0].sh.rotation.set(.05, 0, -.12); arms[0].el.rotation.set(-.25, 0, 0); arms[0].wr.rotation.set(0, .3, 0);
  arms[1].sh.rotation.set(-.15, 0, .95); arms[1].el.rotation.set(-1.9, .2, 0); arms[1].wr.rotation.set(-.2, -.6, .2); arms[1].hand.fingers.forEach(f => f.rotation.x = .05); arms[1].hand.th.rotation.set(.2, 0, -.9);
  legs[0].hip.rotation.set(.02, 0, .02); legs[1].hip.rotation.set(-.04, 0, -.04); legs[1].knee.rotation.x = .08; head.rotation.set(-.04, .12, .03); }
pose();
window.shot = (view) => { const views = { full: [V(.9, 1.15, 3.4), V(0, .95, 0), 30], face: [V(.16, 1.67, .58), V(0, 1.64, 0), 24], face2: [V(.45, 1.67, .4), V(0, 1.64, 0), 24], back: [V(-1.6, 1.3, -2.6), V(0, .95, 0), 30], tq: [V(1.9, 1.3, 2.4), V(0, .92, 0), 30] }; const [p, l, f] = views[view];
  camera.position.copy(p); camera.lookAt(l); camera.fov = f; camera.updateProjectionMatrix(); renderer.render(scene, camera); return cv.toDataURL('image/jpeg', .92); };
window.__ready = true;
