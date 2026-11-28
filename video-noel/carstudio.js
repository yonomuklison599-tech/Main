import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildPolo } from './polo.js';
const W = 1200, H = 800; const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
{ const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#9fb8d0'); g.addColorStop(.6, '#dfe6ee'); g.addColorStop(1, '#8a8e94'); x.fillStyle = g; x.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const camera = new THREE.PerspectiveCamera(30, W / H, .05, 200);
const key = new THREE.DirectionalLight(0xfff1e0, 2.4); key.position.set(4, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); key.shadow.bias = -.0005; scene.add(key); scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6a6058, .6));
const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: '#6a6c70', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const car = buildPolo(THREE, { RoundedBoxGeometry }); scene.add(car);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
window.shot = (v) => { const P = { tqf: [V(6.2, 2.1, 5.6), V(.1, .65, 0), 30], side: [V(0, .9, 10.5), V(0, .72, 0), 28], tqr: [V(-6.2, 2.2, 5.2), V(-.1, .72, 0), 30], front: [V(4.4, 1.15, 1.9), V(1.8, .62, .15), 32], logoF: [V(3.0, .86, .45), V(2.0, .74, .08), 24], logoR: [V(-3.0, .95, -.55), V(-2.03, .85, -.22), 26] }[v]; camera.position.copy(P[0]); camera.lookAt(P[1]); camera.fov = P[2]; camera.updateProjectionMatrix(); renderer.render(scene, camera); return cv.toDataURL('image/jpeg', .93); };
window.__ready = true;
