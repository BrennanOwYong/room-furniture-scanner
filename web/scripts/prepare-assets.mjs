import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const files={
  'build/three.module.js':'three.module.js',
  'build/three.core.js':'three.core.js',
  'examples/jsm/controls/OrbitControls.js':'controls/OrbitControls.js',
  'examples/jsm/loaders/GLTFLoader.js':'loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js':'utils/BufferGeometryUtils.js',
  'LICENSE':'THREE-LICENSE.txt'
};
for(const [src,dst] of Object.entries(files)){
  const target=path.join(root,'public/vendor',dst);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(path.join(root,'node_modules/three',src),target);
}
console.log('Browser libraries prepared locally.');
