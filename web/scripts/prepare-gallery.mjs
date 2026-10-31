// Build the user-authorized saved-results gallery. Never copy source videos or weights.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const sourceRoot=process.argv[2];
if(!sourceRoot)throw new Error('Usage: node scripts/prepare-gallery.mjs <original-project-folder>');
const original=path.resolve(sourceRoot,'outputs');
const tests=path.join(root,'research/testing');
const publicDir=path.join(root,'public');
const galleryDir=path.join(publicDir,'gallery');
await mkdir(galleryDir,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
async function asset(source,relative,expected){
  const data=await readFile(source),digest=sha(data);
  if(expected&&digest!==expected)throw new Error('Artifact mismatch: '+relative);
  const target=path.join(galleryDir,relative);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(source,target);
  return {url:'./gallery/'+relative,sha256:digest,bytes:data.length};
}
async function completed(reportName,modelName,relative,expected){
  const report=JSON.parse(await readFile(path.join(tests,reportName),'utf8'));
  const job=report.job;
  if(report.status!=='PASS'||job.state!=='complete')throw new Error('Only verified completed results may enter gallery');
  if(job.source_sha256!==expected)throw new Error('Wrong source video in '+reportName);
  const file=await asset(path.join(tests,modelName),relative,report.download.sha256);
  return {id:job.id,label:'LingBot · furniture markers',name:job.name,model_url:file.url,
    representation:job.representation||'Coloured point cloud',frames:job.frames,point_count:job.point_count,
    objects:(job.objects||[]).map(({id,name,category,position,confidence,views})=>({id,name,category,position,confidence,views})),
    detection_note:'Approximate markers from repeated image detections. Labels can be wrong or duplicated. Source images stay in the local app.',
    sha256:file.sha256,bytes:file.bytes,job_id:job.id};
}
const first=await asset(path.join(original,'brennan-reconstruction.glb'),'video-1/lingbot.glb');
const firstPly=await asset(path.join(original,'brennan-point-cloud.ply'),'video-1/points.ply');
const gaussians=await asset(path.join(original,'brennan-gaussians.ply'),'video-1/gaussian-baseline.ply');
const early=await asset(path.join(original,'hackathon-ad7a7771/baseline/attempt-1/mesh/mesh.glb'),'video-2/early-surface.glb','17182edcfa424d8df0054770d7405ff566e223065fdaf2cd265927fe3f636fe7');
const da3=await asset(path.join(original,'hackathon-ad7a7771/da3/attempt-1/exports/scene.glb'),'video-2/depth-anything-3.glb','46d5ffb5a6efcc9d745e38d2173ae9516eb2095c4c5c672e2cb2cf3e33e4ca02');
const secondSha='ad7a7771cf339dd78dc19963ab0fc998322a150170a8d0b971d78242502eef14';
const thirdSha='335fb2746fb18fdcca4cf54d6f1ba45f4b75627b2089dd9f69e70593fb2ca093';
const second=await completed('controlled-retry-report.json','controlled-retry-model.glb','video-2/lingbot.glb',secondSha);
const third=await completed('new-video-report.json','new-video-model.glb','video-3/lingbot.glb',thirdSha);
const catalog={schema:1,updated_at:new Date().toISOString(),videos:[
  {id:'video-1',title:'Video 1 · Original scan',filename:'video6278534805638358952.mp4',duration:21.002078,source_sha256:'a6b51a160106a1845fce1262e14aacc2ea89858917ea76ddb5217d5cdaa066c7',description:'The first 21-second recording. Original reconstruction and Gaussian fitting experiment.',results:[
    {id:'video-1-lingbot',label:'LingBot · original point cloud',name:'Original scan · LingBot',model_url:first.url,representation:'Coloured point cloud',frames:104,point_count:200000,objects:[],sha256:first.sha256,bytes:first.bytes,detection_note:'No automatic furniture markers were generated for this early result. Geometry and scale are approximate.',downloads:[
      {label:'Download point cloud (.ply)',url:firstPly.url},
      {label:'Download Gaussian baseline (.ply)',url:gaussians.url}
    ]}
  ]},
  {id:'video-2',title:'Video 2 · Bedroom scan',filename:'video6280786605452042171.mp4',duration:23.8361,source_sha256:secondSha,description:'The 24-second recording, with three saved reconstruction results to compare.',results:[
    {id:'video-2-early',label:'LingBot · early surface attempt',name:'Bedroom scan · early surface attempt',model_url:early.url,representation:'Fragmented triangle mesh experiment',frames:119,objects:[],sha256:early.sha256,bytes:early.bytes,detection_note:'Earlier square-crop experiment. Fragmented surfaces and missing areas remain; no furniture markers.'},
    {id:'video-2-da3',label:'Depth Anything 3 · point cloud',name:'Bedroom scan · Depth Anything 3',model_url:da3.url,representation:'Coloured point cloud',frames:64,point_count:1000000,objects:[],sha256:da3.sha256,bytes:da3.bytes,detection_note:'No furniture detection was run on this comparison. Camera guides are hidden. Noncommercial research checkpoint; scale is not calibrated.'},
    second
  ]},
  {id:'video-3',title:'Video 3 · Latest scan',filename:'video6280786605452042287.mp4',duration:40.004022,source_sha256:thirdSha,description:'The latest 40-second recording. Partial room reconstruction with approximate furniture markers.',results:[third]}
]};
await writeFile(path.join(publicDir,'gallery.json'),JSON.stringify(catalog,null,2)+'\n');
await writeFile(path.join(publicDir,'site-config.json'),JSON.stringify({mode:'local'})+'\n');
console.log(JSON.stringify({videos:catalog.videos.length,results:catalog.videos.reduce((n,v)=>n+v.results.length,0),assets:7,catalog:path.join(publicDir,'gallery.json')}));
