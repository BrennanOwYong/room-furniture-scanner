// GitHub Pages serves static assets: no compute proxy, local paths, video uploads or credentials.
// https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
// https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
import {readFile,writeFile,mkdir,cp,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const target=path.resolve(process.argv[2]||path.join(root,'dist-pages'));
const source=path.join(root,'public');
await mkdir(target,{recursive:true});
for(const file of ['index.html','app.js','style.css','studio-polish.css','gallery.json'])await copyFile(path.join(source,file),path.join(target,file));
for(const dir of ['vendor','gallery'])await cp(path.join(source,dir),path.join(target,dir),{recursive:true});
await writeFile(path.join(target,'site-config.json'),JSON.stringify({mode:'showcase'})+'\n');
await writeFile(path.join(target,'.nojekyll'),'');
await writeFile(path.join(target,'CREDITS.txt'),`LingBot Studio saved-results demo\n\nViewer: Three.js 0.180.0, MIT license (vendor/THREE-LICENSE.txt).\nLingBot-MAP: https://github.com/Robbyant/lingbot-map (Apache-2.0).\nDepth Anything 3: https://github.com/ByteDance-Seed/Depth-Anything-3\nDA3 Nested Giant Large 1.1 checkpoint: CC BY-NC 4.0, noncommercial showcase.\nGaussian baseline uses fixed geometry from LingBot; no surface completion.\n\nOutputs are partial, approximate reconstructions. Furniture markers may be wrong or duplicated.\nNo measured dimensions or complete polygon room model are claimed.\nThe public site views saved results. New video processing requires the local application and its compute service.\nSource recordings, weights, credentials and private compute connections are not included.\n`);
const catalog=JSON.parse(await readFile(path.join(target,'gallery.json'),'utf8'));
console.log(JSON.stringify({directory:target,videos:catalog.videos.length,results:catalog.videos.reduce((n,v)=>n+v.results.length,0)}));
