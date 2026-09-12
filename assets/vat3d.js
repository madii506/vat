// vat — 3D glass vat with 10,000 instanced apes. Shared by the site and the brand renderer.
import * as THREE from './three.module.min.js';

export const N = 10000, LAYERS = 16, PER = 625; // 16 × 625 = 10,000
const GA = Math.PI * (3 - Math.sqrt(5));

export function createVat(canvas, { transparent = true, dpr = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(dpr, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100); camera.position.set(0, 1.6, 12.5); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8e4dc, .9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfffe9, 1.0); rim.position.set(-6, 3, -6); scene.add(rim);
  const root = new THREE.Group(); scene.add(root);

  // glass
  const R = 3.0, H = 6.4;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .06, metalness: 0, transmission: .92, thickness: .4, ior: 1.45, transparent: true, opacity: .5, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: .05 }));
  root.add(glass);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .18, 96), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .4 })); bottom.position.y = -H / 2 - .09; root.add(bottom);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + .35, R + .5, .35, 96), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .35, metalness: .2 })); base.position.y = -H / 2 - .35; root.add(base);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R + .2, R + .05, .5, 96), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .35, metalness: .2 })); lid.position.y = H / 2 + .25; root.add(lid);
  const band = new THREE.Mesh(new THREE.TorusGeometry(R + .04, .06, 12, 96), new THREE.MeshStandardMaterial({ color: 0x1f9d55, roughness: .3 })); band.rotation.x = Math.PI / 2; band.position.y = H / 2 - .02; root.add(band);
  // liquid
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R - .05, R - .05, H - .5, 96), new THREE.MeshStandardMaterial({ color: 0xbfe8cf, transparent: true, opacity: .22, roughness: .2, depthWrite: false })); liquid.position.y = -.2; root.add(liquid);

  // apes: instanced cubes in 16 phyllotaxis discs
  const geo = new THREE.BoxGeometry(.11, .11, .11);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, metalness: 0, emissive: 0x000000 });
  const inst = new THREE.InstancedMesh(geo, mat, N); inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const m4 = new THREE.Matrix4(), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const L = Math.floor(i / PER), k = i % PER; const r = (R - .55) * Math.sqrt((k + .5) / PER), th = k * GA + L * .37; const x = r * Math.cos(th), z = r * Math.sin(th), y = -H / 2 + .55 + L * ((H - 1.3) / (LAYERS - 1)); pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z; m4.makeTranslation(x, y, z); inst.setMatrixAt(i, m4); }
  const colors = new Float32Array(N * 3); inst.instanceColor = new THREE.InstancedBufferAttribute(colors, 3); inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
  root.add(inst);
  // bubbles
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .55, roughness: .1 }), 60);
  const bp = []; for (let i = 0; i < 60; i++) { bp.push({ x: (Math.random() - .5) * 4.6, z: (Math.random() - .5) * 4.6, y: -H / 2 + Math.random() * H, v: .25 + Math.random() * .5, s: .5 + Math.random() }); } root.add(bub);

  const PAL = { no: [1, 1, 1], hold: [.12, .62, .33], hold2: [.48, .83, .61], tp: [.79, .79, .77], so: [.48, .48, .46], dead: [.85, .15, .1] };
  function setColors(state, inProfit, flash) { const c = inst.instanceColor.array; for (let i = 0; i < N; i++) { let p = PAL.no; if (flash && flash[i]) p = PAL.dead; else { const s = state[i]; if (s === 1) p = inProfit[i] ? PAL.hold : PAL.hold2; else if (s === 2) p = PAL.tp; else if (s === 3) p = PAL.so; } c[i*3]=p[0]; c[i*3+1]=p[1]; c[i*3+2]=p[2]; } inst.instanceColor.needsUpdate = true; }
  function highlight(i, on) { if (i == null) return; m4.makeTranslation(pos[i*3], pos[i*3+1], pos[i*3+2]); if (on) m4.scale(new THREE.Vector3(2.6, 2.6, 2.6)); inst.setMatrixAt(i, m4); inst.instanceMatrix.needsUpdate = true; }
  let rot = 0, trot = 0, auto = true, t = 0;
  function resize() { const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); camera.position.z = w < 520 ? 15.5 : 12.5; }
  function render(dt = .016) { t += dt; if (auto) trot += dt * .12; rot += (trot - rot) * .08; root.rotation.y = rot; root.position.y = Math.sin(t * .6) * .04;
    for (let i = 0; i < 60; i++) { const b = bp[i]; b.y += b.v * dt; if (b.y > H / 2 - .5) b.y = -H / 2 + .4; m4.makeTranslation(b.x, b.y, b.z); m4.scale(new THREE.Vector3(b.s, b.s, b.s)); bub.setMatrixAt(i, m4); } bub.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera); }
  // drag
  let dragging = false, lastX = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; auto = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; trot += (e.clientX - lastX) * .008; lastX = e.clientX; });
  canvas.addEventListener('pointerup', () => { dragging = false; setTimeout(() => auto = true, 4000); });
  resize();
  return { renderer, scene, camera, root, inst, setColors, highlight, render, resize, setRotation: r => { trot = r; rot = r; } };
}
