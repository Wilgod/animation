const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
// electron-builder excludes dependency examples/, including the runtime loaders.
// Copy only the browser modules we use into packaged assets before each build.
for (const file of ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js', 'controls/OrbitControls.js']) {
  const target = path.join(root, 'assets/vendor/three', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'node_modules/three/examples/jsm', file), target);
}
fs.copyFileSync(path.join(root, 'node_modules/three/LICENSE'), path.join(root, 'assets/vendor/three/LICENSE'));
