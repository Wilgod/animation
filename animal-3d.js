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

// Render the actual GLB into a transparent surface, composited by the shared
// timeline engine. Explicit animation time keeps scrubbing/export deterministic.
export async function loadAnimal3D(url, color = null, options = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  preserveModelColors(gltf.scene);
  if (color) {
    // Recolor the texture's luminance rather than multiplying its yellow hue.
    // Keep normal/roughness maps, skinning, texture detail, and dark markings.
    const tint = new THREE.Color(color);
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      for (const material of [].concat(object.material)) {
        material.onBeforeCompile = shader => {
          shader.uniforms.lizardTint = { value: tint };
          shader.fragmentShader = 'uniform vec3 lizardTint;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            float luminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float tintLuminance = dot(lizardTint, vec3(0.2126, 0.7152, 0.0722));
            diffuseColor.rgb = luminance * lizardTint / max(tintLuminance, 0.001);
          `);
        };
        material.customProgramCacheKey = () => 'lizard-color-variant-v1';
      }
    });
  }
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
  const bounds = new THREE.Box3().setFromObject(alignment);
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
  return { render, dispose, canvas: renderer.domElement, mixer, model: alignment };
}
