import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { preserveModelColors } from './animal-3d.js';

const supplied = new URLSearchParams(location.search).get('model') !== 'gecko';
const readyText = supplied ? 'Your lizard · Walk animation ready' : 'Ready · 3D gecko with articulated legs and a flexible tail';
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('viewport'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xe9eee7);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9eee7, 18, 38);
const camera = new THREE.PerspectiveCamera(38, 1, .01, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - .04;
controls.minDistance = 3; controls.maxDistance = 20;
function view(top = false) { camera.position.set(...(top ? [0, 9, .001] : [5.5, 6.5, 7])); controls.target.set(0, 0, .35); controls.update(); }
view();
scene.add(new THREE.HemisphereLight(0xffffff, supplied ? 0xffffff : 0x769169, supplied ? Math.PI * .8 : 2.3));
const sun = new THREE.DirectionalLight(supplied ? 0xffffff : 0xfff6e3, supplied ? Math.PI * .2 : 3.2);
sun.position.set(-3, 8, 5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
sun.shadow.normalBias = .025; scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xd7dfce, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(20, 40, 0xb7c5af, 0xc8d2c1); grid.position.y = .003; scene.add(grid);
const marker = new THREE.Mesh(new THREE.RingGeometry(.16, .20, 48), new THREE.MeshBasicMaterial({ color: 0x427850, side: THREE.DoubleSide }));
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
let model, mixer, action, duration = 1, playing = true, phase = 0;
const target = new THREE.Vector3();
function playback(value) { playing = value; $('play').textContent = value ? 'Pause' : 'Play'; $('play').classList.toggle('active', value); }
$('model').value = supplied ? 'lizard' : 'gecko';
$('model').onchange = () => { location.search = `?model=${$('model').value}`; };
$('mode').value = supplied ? 'wander' : 'inplace';
$('modelDownload').href = supplied ? 'model/Lizard.glb' : 'assets/models/green-gecko.glb';
const ready = new GLTFLoader().loadAsync(supplied ? 'model/Lizard.glb' : 'assets/models/green-gecko.glb?v=tapered-head-3').then(gltf => {
  if (supplied) preserveModelColors(gltf.scene);
  if (!gltf.animations.length) throw new Error('Model has no walk animation');
  mixer = new THREE.AnimationMixer(gltf.scene); action = mixer.clipAction(gltf.animations[0]); action.play();
  mixer.setTime(0);
  model = new THREE.Group();
  const alignment = new THREE.Group(); alignment.add(gltf.scene); model.add(alignment); scene.add(model);
  if (supplied) {
    // Align the supplied rig's nose with the movement controller's -Z heading.
    gltf.scene.updateMatrixWorld(true);
    const nose = gltf.scene.getObjectByName('nose'), tail = gltf.scene.getObjectByName('tail1');
    if (nose && tail) {
      const forward = nose.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
      alignment.rotation.y = Math.atan2(forward.x, -forward.z);
    }
    alignment.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(alignment), size = bounds.getSize(new THREE.Vector3());
    const scale = 3.2 / Math.max(size.x, size.z);
    alignment.scale.setScalar(scale);
    const center = bounds.getCenter(new THREE.Vector3());
    alignment.position.set(-center.x * scale, -bounds.min.y * scale + .015, -center.z * scale);
  }
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });

  duration = gltf.animations[0].duration;
  $('status').textContent = readyText;
  return gltf;
}).catch(error => { $('status').textContent = `Could not load the model: ${error.message}. Reload to retry.`; throw error; });
$('play').onclick = () => playback(!playing);
$('speed').oninput = () => $('speedValue').textContent = `${Number($('speed').value).toFixed(1)}×`;
$('pose').oninput = () => { playback(false); if (mixer) mixer.setTime(Number($('pose').value) / 1000 * duration); };
$('top').onclick = () => view(true); $('perspective').onclick = () => view(false);
$('reset').onclick = () => { if (model) { model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); mixer.setTime(0); } phase = 0; target.set(0, 0, 0); marker.visible = false; $('mode').value = supplied ? 'wander' : 'inplace'; $('speed').value = 1; $('speed').oninput(); playback(true); view(); $('status').textContent = readyText; };
$('mode').onchange = () => { marker.visible = false; if (model) target.copy(model.position); $('status').textContent = $('mode').value === 'target' ? 'Click the ground to choose where the gecko walks.' : 'Drag to orbit · scroll to zoom · scrub to inspect the walk'; };
const raycaster = new THREE.Raycaster(); let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!model || $('mode').value !== 'target' || !down || Math.hypot(e.clientX-down[0], e.clientY-down[1]) > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1, -(e.clientY-rect.top)/rect.height*2+1), camera);
  const hit = raycaster.intersectObject(ground)[0];
  if (hit) { target.copy(hit.point); target.y = 0; target.x = THREE.MathUtils.clamp(target.x,-7,7); target.z = THREE.MathUtils.clamp(target.z,-7,7); marker.position.copy(target); marker.position.y = .012; marker.visible = true; playback(true); $('status').textContent = 'Walking to the selected point'; }
});
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05), speed = Number($('speed').value), mode = $('mode').value;
  if (model && playing) {
    let moving = true, animationDelta = dt * speed;
    // Match body travel to the planted foot's backward speed in the baked gait.
    const travelSpeed = supplied ? .85 / duration : .36 / (.625 * duration);
    if (mode === 'wander') { phase += dt * speed * travelSpeed / 2.5; target.set(Math.sin(phase)*2.5,0,Math.cos(phase)*2.5); }
    if (mode !== 'inplace') {
      const delta = target.clone().sub(model.position), distance = delta.length();
      moving = distance > .04;
      if (moving) { const step = Math.min(distance,dt*speed*travelSpeed); model.position.addScaledVector(delta.normalize(),step); model.rotation.y = Math.atan2(-delta.x,-delta.z); animationDelta = step / travelSpeed; }
      else marker.visible = false;
    }
    if (moving) mixer.update(animationDelta);
    $('pose').value = (action.time % duration) / duration * 1000;
  }
  controls.update(); renderer.render(scene, camera);
});
// A small inspection hook for the local render smoke check.
window.geckoPreview = { ready, get model() { return model; }, get mixer() { return mixer; }, renderer, scene, camera, controls };

