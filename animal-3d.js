import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Keep the original PBR materials and texture colors, without filmic grading.
// Neutral white lighting retains the model's normal-map detail and volume.
export function preserveModelColors(model) {
  model.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [].concat(object.material)) material.toneMapped = false;
  });
}

// three.js grows a morph-target mesh's box by every target's full
// displacement, which would shrink soft-bodied models (an octopus's arms
// sweep from front to back) inside their render square. Frame those meshes
// by their rest pose; their build scripts add a framing guide for any later
// pose that reaches farther. Skinned and rigid meshes are framed as before.
function frameBounds(root) {
  const box = new THREE.Box3();
  root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    let local;
    if (object.isSkinnedMesh) {
      object.computeBoundingBox();
      local = object.boundingBox.clone();
    } else if (geometry.morphAttributes.position) {
      local = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    } else {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      local = geometry.boundingBox.clone();
    }
    box.union(local.applyMatrix4(object.matrixWorld));
  });
  return box;
}

// Color variants of one shared model (scenes.json):
// - modelColor: recolor the texture's luminance with this color rather than
//   multiplying its hue. Keeps normal/roughness maps, texture detail, and dark
//   markings. Suits single-material or grey models (lizard, pigeon, shark).
// - modelHue: rotate hue by N degrees in YIQ space, which keeps luminance and
//   leaves black/white/grey untouched. Suits multi-material models.
// modelColorMaterials (regex) limits which materials are recolored; eyes are
// always left alone so a variant keeps its natural gaze.
const EYE_MATERIAL = /eye|iris|pupil/i;

function recolorModel(root, color, options) {
  const hue = options.modelHue;
  if (!color && !hue) return;
  const only = options.modelColorMaterials ? new RegExp(options.modelColorMaterials, 'i') : null;
  const tint = color ? new THREE.Color(color) : null;
  const angle = (hue || 0) * Math.PI / 180;
  root.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [].concat(object.material)) {
      if (EYE_MATERIAL.test(material.name) || (only && !only.test(material.name))) continue;
      material.onBeforeCompile = shader => {
        if (tint) {
          shader.uniforms.variantTint = { value: tint };
          shader.fragmentShader = 'uniform vec3 variantTint;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            float luminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float tintLuminance = dot(variantTint, vec3(0.2126, 0.7152, 0.0722));
            diffuseColor.rgb = luminance * variantTint / max(tintLuminance, 0.001);
          `);
        } else {
          shader.uniforms.variantHue = { value: new THREE.Vector2(Math.cos(angle), Math.sin(angle)) };
          shader.fragmentShader = 'uniform vec2 variantHue;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            vec3 yiq = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312) * diffuseColor.rgb;
            yiq.yz = vec2(yiq.y * variantHue.x - yiq.z * variantHue.y, yiq.y * variantHue.y + yiq.z * variantHue.x);
            diffuseColor.rgb = clamp(mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703) * yiq, 0.0, 1.0);
          `);
        }
      };
      material.customProgramCacheKey = () => tint ? 'color-variant-tint-v2' : 'color-variant-hue-v2';
    }
  });
}

// Render the actual GLB into a transparent surface, composited by the shared
// timeline engine. Explicit animation time keeps scrubbing/export deterministic.
export async function loadAnimal3D(url, color = null, options = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  preserveModelColors(gltf.scene);
  recolorModel(gltf.scene, color, options);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(768, 768);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, Math.PI * .8));
  const light = new THREE.DirectionalLight(0xffffff, Math.PI * .2);
  light.position.set(-3, 8, 4);
  scene.add(light);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const clip = gltf.animations.find(a => /walk/i.test(a.name)) || gltf.animations[0];
  if (clip) mixer.clipAction(clip).play();
  mixer.setTime(0);
  const alignment = new THREE.Group();
  alignment.add(gltf.scene);
  scene.add(alignment);
  scene.updateMatrixWorld(true);
  const nose = gltf.scene.getObjectByName('nose');
  const tail = gltf.scene.getObjectByName('tail1');
  if (nose && tail) {
    const forward = nose.getWorldPosition(new THREE.Vector3()).sub(tail.getWorldPosition(new THREE.Vector3()));
    alignment.rotation.y = Math.atan2(forward.z, forward.x);
  }
  alignment.updateMatrixWorld(true);
  const bounds = frameBounds(alignment);
  const center = bounds.getCenter(new THREE.Vector3());
  alignment.position.sub(center);
  const size = bounds.getSize(new THREE.Vector3());
  const half = Math.max(size.x, size.z) * .65;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, .01, 100);
  camera.position.set(...(options.modelView === 'angled' ? [0, 6, 8] : [0, 10, 0]));
  camera.up.set(...(options.modelView === 'angled' ? [0, 1, 0] : [0, 0, -1]));
  camera.lookAt(0, 0, 0);
  function render(phase, seconds = null) {
    mixer.setTime(options.modelAnimation === 'fly' && seconds !== null ? seconds : phase * (clip?.duration || 1));
    renderer.render(scene, camera);
    return renderer.domElement;
  }
  render(0);
  function dispose() {
    mixer.stopAllAction();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      for (const material of [].concat(object.material)) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { render, dispose, canvas: renderer.domElement, mixer, model: alignment, angled: options.modelView === 'angled' };
}
