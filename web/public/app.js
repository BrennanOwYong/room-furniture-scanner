// References checked 31 October 2026:
// https://threejs.org/docs/pages/GLTFLoader.html
// https://threejs.org/docs/pages/OrbitControls.html
// https://developer.mozilla.org/en-US/docs/Web/API/AbortController
// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id);
let selectedFile=null, busy=false, online=false, currentJob=null, videoUrl=null, pollTimer=null;
let scene,camera,renderer,controls,model,grid,objects=[],markers=[],bounds;
let mode='showcase', videos=[], uploading=false, pollEpoch=0, displayEpoch=0, modelAbort=null, pollAbort=null;
const localApi=path=>new URL(`./api/${path}`,document.baseURI).href;
const stored={set:(key,value)=>{try{localStorage.setItem(key,value);}catch{}}};
const stageOrder=['uploading','queued','reconstructing','detecting','exporting'];
const stageText={queued:'Waiting for compute',reconstructing:'Mapping the room',detecting:'Finding furniture',exporting:'Preparing the model',complete:'Your room is ready',failed:'Processing stopped'};
function error(message){$('upload-error').textContent=message;$('upload-error').hidden=!message;}
function refreshButton(){ $('generate').disabled=mode!=='local'||!selectedFile||busy||!online; $('video-file').disabled=busy||mode!=='local'; $('recording-select').disabled=uploading||!videos.length; $('result-select').disabled=uploading||!selectedVideo()?.results?.length; }
async function health(){
  if(mode!=='local')return;
  try{const r=await fetch(localApi('health'));const d=await r.json();online=r.ok&&d.identity==='lingbot-studio-v1';}
  catch{online=false;}
  $('connection').className='connection '+(online?'online':'offline');
  $('connection').lastChild.textContent=online?'NUS compute connected':'Compute disconnected';refreshButton();
}
function setFile(file){
  if(mode!=='local'||busy||!file)return;error('');
  if(!/\.(mp4|mov|webm)$/i.test(file.name)){error('Choose an MP4, MOV or WebM video.');return;}
  if(file.size>150*1024*1024){error('This video is too large. Choose a clip under 150 MB.');return;}
  if(!file.size){error('This file is empty. Choose another video.');return;}
  selectedFile=file;$('file-label').textContent=file.name;$('file-meta').textContent=`${(file.size/1048576).toFixed(1)} MB · Ready to upload`;
  if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(file);
  $('video-preview').src=videoUrl;$('video-preview').hidden=false;refreshButton();
}
$('video-file').addEventListener('change',e=>setFile(e.target.files[0]));
for(const event of ['dragover','dragenter'])$('dropzone').addEventListener(event,e=>{e.preventDefault();if(!busy)$('dropzone').classList.add('dragging');});
for(const event of ['dragleave','drop'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('dropzone').classList.remove('dragging');if(event==='drop')setFile(e.dataTransfer.files[0]);});
$('video-preview').addEventListener('loadedmetadata',()=>{const d=$('video-preview').duration;if(Number.isFinite(d)&&d>60.5){selectedFile=null;error('Choose a recording of 60 seconds or less.');refreshButton();}else if(selectedFile)$('file-meta').textContent=`${(selectedFile.size/1048576).toFixed(1)} MB · ${Math.round(d)||'—'} seconds`;});
function progress(stage,message=''){
  $('progress-panel').hidden=false;$('progress-title').textContent=stageText[stage]||'Uploading your video';
  const index=stageOrder.indexOf(stage);
  document.querySelectorAll('#stages li').forEach((li,i)=>{li.classList.toggle('active',i===index);li.classList.toggle('done',stage==='complete'||(index>=0&&i<index));});
  $('job-message').textContent=message;
}
function upload(file){return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();xhr.open('POST',localApi(`jobs?detect=${$('detect').checked?'1':'0'}`));
  xhr.setRequestHeader('Content-Type','application/octet-stream');xhr.setRequestHeader('X-Filename',encodeURIComponent(file.name));
  xhr.upload.onprogress=e=>{if(e.lengthComputable){$('upload-progress').value=e.loaded/e.total*100;progress('uploading',`${Math.round(e.loaded/e.total*100)}% uploaded`);}};
  xhr.onload=()=>{let d;try{d=JSON.parse(xhr.responseText);}catch{return reject(new Error('The compute connection returned an unreadable response.'));}xhr.status<300?resolve(d):reject(new Error(d.error||'Upload failed.'));};
  xhr.onerror=()=>reject(new Error('Upload interrupted. Check the compute connection and try again.'));xhr.timeout=180000;xhr.ontimeout=()=>reject(new Error('Upload timed out. Try a shorter clip.'));xhr.send(file);
});}
$('generate').addEventListener('click',async()=>{
  if(mode!=='local'||!selectedFile||busy)return;error('');stopJobWatching();clearView();busy=true;uploading=true;refreshButton();$('check-status').hidden=true;
  setLiveSelection(selectedFile.name);$('selection-status').textContent='Showing your new conversion.';
  $('upload-progress').hidden=false;$('upload-progress').value=0;progress('uploading');
  try{const job=await upload(selectedFile);currentJob=job.id;stored.set('lingbot-last-job',currentJob);const url=new URL(location.href);url.searchParams.set('job',currentJob);history.replaceState(null,'',url);uploading=false;refreshButton();$('upload-progress').hidden=true;await poll();}
  catch(e){error(e.message);progress('failed',e.message);busy=false;uploading=false;refreshButton();$('upload-progress').hidden=true;}
});
async function poll(){
  if(mode!=='local'||!currentJob)return;clearTimeout(pollTimer);
  const epoch=pollEpoch, jobId=currentJob;
  pollAbort?.abort();const request=new AbortController();pollAbort=request;
  try{
    const r=await fetch(localApi(`jobs/${encodeURIComponent(jobId)}`),{signal:request.signal});const job=await r.json();
    if(epoch!==pollEpoch||jobId!==currentJob)return;
    if(!r.ok){
      if(r.status===404&&videos.length){stopJobWatching();showNewestRecording();error('That local job is unavailable. Showing the newest saved recording.');return;}
      throw new Error(job.error||'Could not read job status.');
    }
    progress(job.state,job.message||'');$('check-status').hidden=true;
    if(job.state==='complete'){
      busy=false;refreshButton();setLiveSelection(job.name||'Your uploaded recording');await showResult(job);return;
    }
    if(job.state==='failed'){busy=false;refreshButton();error(job.message||'Processing failed. You can upload another clip.');return;}
    busy=true;refreshButton();pollTimer=setTimeout(poll,3000);
  }catch(e){if(epoch!==pollEpoch||e.name==='AbortError')return;error(e.message);$('check-status').hidden=false;pollTimer=setTimeout(poll,10000);}
}
$('check-status').addEventListener('click',async()=>{if(mode==='local'){await health();poll();}});
function initScene(){
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.001,1000);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  $('scene').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive reconstructed room. Drag to rotate and scroll to zoom.');
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;
  new ResizeObserver(()=>{const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe($('scene'));
  renderer.setAnimationLoop(()=>{controls.update();updateLabels();renderer.render(scene,camera);});
}
function disposeTree(root){
  if(!root)return;
  root.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){if(!material)continue;for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});
}
function disposeModel(){
  if(model){scene.remove(model);disposeTree(model);model=null;}
  if(grid){scene.remove(grid);grid.geometry.dispose();grid.material.dispose();grid=null;}
  markers.forEach(m=>m.element.remove());markers=[];objects=[];bounds=null;
}
function clearView(){
  displayEpoch++;modelAbort?.abort();modelAbort=null;disposeModel();
  $('download').hidden=true;$('download').removeAttribute('href');$('companion-downloads').hidden=true;$('companion-downloads').replaceChildren();
  $('objects-panel').hidden=true;$('object-detail').hidden=true;$('navigation-hint').hidden=true;$('viewer-loading').hidden=true;$('empty-state').hidden=false;
  $('home-view').disabled=true;$('top-view').disabled=true;$('model-title').textContent='Your room model';
  $('model-summary').textContent='Observed surfaces only. Unseen areas may remain open.';
}
function fitView(top=false){
  if(!bounds)return;const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const radius=Math.max(size.x,size.y,size.z)||1;
  camera.near=radius/1000;camera.far=radius*100;camera.updateProjectionMatrix();controls.minDistance=radius*.08;controls.maxDistance=radius*8;
  controls.target.copy(center);camera.up.set(0,1,0);
  camera.position.copy(center).add(top?new THREE.Vector3(0,radius*1.7,.001*radius):new THREE.Vector3(radius*.85,radius*.65,radius*1.45));controls.update();
}
$('home-view').addEventListener('click',()=>{fitView();selectObject(null);});$('top-view').addEventListener('click',()=>fitView(true));
async function loadModel(url,epoch){
  if(!renderer)initScene();$('viewer-loading').hidden=false;
  const controller=new AbortController();modelAbort=controller;
  try{
    const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`The model could not be loaded (${response.status}).`);
    const data=await response.arrayBuffer();if(epoch!==displayEpoch)return false;
    const gltf=await new GLTFLoader().parseAsync(data,new URL('.',url).href);
    if(epoch!==displayEpoch){disposeTree(gltf.scene);return false;}
    disposeModel();model=gltf.scene;
    const guides=[];model.traverse(o=>{if(o.isLine)guides.push(o);});guides.forEach(o=>{o.removeFromParent();o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});
    bounds=new THREE.Box3().setFromObject(model);
    const diagonal=bounds.getSize(new THREE.Vector3()).length();
    if(!Number.isFinite(diagonal)||diagonal<=0){disposeModel();throw new Error('This result does not contain viewable geometry.');}
    model.traverse(o=>{
      if(!o.isPoints&&!o.isMesh)return;
      const previous=Array.isArray(o.material)?o.material:[o.material];
      if(o.isPoints){o.material=new THREE.PointsMaterial({vertexColors:!!o.geometry.attributes.color,size:diagonal*.0018,sizeAttenuation:true});}
      if(o.isMesh){o.material=new THREE.MeshBasicMaterial({vertexColors:!!o.geometry.attributes.color,side:THREE.DoubleSide,color:o.geometry.attributes.color?0xffffff:0xc3c6b8});}
      for(const material of previous)material?.dispose();
    });scene.add(model);fitView();
    const center=bounds.getCenter(new THREE.Vector3());grid=new THREE.GridHelper(diagonal*1.3,18,0x536350,0x35443b);grid.position.set(center.x,bounds.min.y-diagonal*.015,center.z);grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
    $('empty-state').hidden=true;$('navigation-hint').hidden=false;$('home-view').disabled=false;$('top-view').disabled=false;
    return true;
  }finally{if(epoch===displayEpoch){$('viewer-loading').hidden=true;modelAbort=null;}}
}
async function showResult(job){
  clearView();const epoch=displayEpoch;error('');
  const url=assetUrl(job.model_url);
  let loaded=false;
  try{loaded=await loadModel(url.href,epoch);}catch(e){if(epoch!==displayEpoch||e.name==='AbortError')return false;throw e;}
  if(!loaded||epoch!==displayEpoch)return false;
  $('model-title').textContent=job.name||job.label||'Your reconstructed room';
  const downloadUrl=new URL(url);if(mode==='local'&&url.pathname.includes('/api/'))downloadUrl.searchParams.set('download','1');
  $('download').href=downloadUrl.href;$('download').hidden=false;
  $('download').download=url.pathname.split('/').pop()||'room-model.glb';
  $('model-summary').textContent=`${job.representation?job.representation+' · ':''}${job.frames||'—'} frames processed · ${job.point_count?Number(job.point_count).toLocaleString()+' points · ':''}Unseen areas remain open.`;
  objects=(job.objects||[]).filter(obj=>Array.isArray(obj.position)&&obj.position.length===3&&obj.position.every(Number.isFinite));renderObjects(job.detection_note||'');
  renderCompanionDownloads(job.downloads||[]);
  return true;
}
function renderObjects(note){
  $('objects-panel').hidden=false;$('object-count').textContent=String(objects.length);$('object-list').replaceChildren();markers.forEach(m=>m.element.remove());markers=[];
  $('detection-note').textContent=(note||'Markers show approximate locations, not exact object outlines.')+(objects.length?' The same item may have more than one marker.':'');
  for(const obj of objects){
    const button=document.createElement('button');button.className='object-card';button.type='button';button.dataset.objectId=obj.id;
    const name=document.createElement('span');name.textContent=obj.name||'Object';const confidence=document.createElement('small');confidence.textContent=Number.isFinite(obj.confidence)?`${Math.round(obj.confidence*100)}%`:'';
    button.append(name,confidence);button.addEventListener('click',()=>selectObject(obj.id));$('object-list').append(button);
    const marker=document.createElement('button');marker.className='object-marker';marker.type='button';marker.textContent=obj.name;marker.setAttribute('aria-label',`Inspect ${obj.name}`);marker.addEventListener('click',()=>selectObject(obj.id));$('labels').append(marker);
    markers.push({element:marker,point:new THREE.Vector3(...obj.position),id:obj.id});
  }
  $('object-detail').hidden=true;
}
function updateLabels(){
  if(!camera)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;
  for(const m of markers){const p=m.point.clone().project(camera);const visible=$('show-markers').checked&&p.z>-1&&p.z<1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.98;m.element.hidden=!visible;if(visible){m.element.style.left=`${(p.x+1)*w/2}px`;m.element.style.top=`${(1-p.y)*h/2}px`;}}
}
function selectObject(id){
  document.querySelectorAll('.object-card').forEach(e=>e.classList.toggle('selected',e.dataset.objectId===id));markers.forEach(m=>m.element.classList.toggle('selected',m.id===id));
  const obj=objects.find(o=>o.id===id);$('object-detail').hidden=!obj;if(!obj)return;
  $('detail-title').textContent=obj.name||'Object';
  const views=Number.isFinite(obj.views)?`Detected in ${obj.views} sampled ${obj.views===1?'view':'views'}. `:'';
  const confidence=Number.isFinite(obj.confidence)?` Detection confidence: ${Math.round(obj.confidence*100)}%.`:'';
  const evidence=mode==='local'&&obj.evidence&&typeof obj.evidence.url==='string'&&Array.isArray(obj.evidence.box)&&obj.evidence.box.length===4;
  $('detail-copy').textContent=views+'The marker is an approximate position estimated from the visible part of the object.'+confidence+(evidence?'':' Source images are not included in this result.');
  $('evidence-image').closest('.evidence-wrap').hidden=!evidence;$('object-detail').classList.toggle('without-evidence',!evidence);
  if(evidence){
    $('evidence-image').src=obj.evidence.url;$('evidence-image').alt=`Source image showing detected ${obj.name}`;
    const [x1,y1,x2,y2]=obj.evidence.box;$('evidence-box').style.cssText=`left:${x1*100}%;top:${y1*100}%;width:${(x2-x1)*100}%;height:${(y2-y1)*100}%`;
  }else{$('evidence-image').removeAttribute('src');$('evidence-box').removeAttribute('style');}
  const target=new THREE.Vector3(...obj.position);const delta=target.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(target);controls.update();
}
$('clear-selection').addEventListener('click',()=>{fitView();selectObject(null);});

function assetUrl(value){
  if(typeof value!=='string'||!value.trim())throw new Error('This result does not have a model file.');
  const url=new URL(value,document.baseURI);
  if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol))throw new Error('This result uses an unsupported file address.');
  if(mode==='showcase'&&(value.startsWith('/')||url.pathname.includes('/api/')))throw new Error('This file is not available in the published showcase.');
  return url;
}
function renderCompanionDownloads(downloads){
  const container=$('companion-downloads');container.replaceChildren();
  for(const item of downloads){
    if(!item||typeof item.url!=='string')continue;
    let url;try{url=assetUrl(item.url);}catch{continue;}
    const link=document.createElement('a');link.className='companion-link';link.href=url.href;link.textContent=item.label||'Download artifact';
    if(/\.(png|jpe?g|webp)$/i.test(url.pathname)||/^view\b/i.test(item.label||'')){link.target='_blank';link.rel='noopener';}
    else link.download=url.pathname.split('/').pop()||'';
    container.append(link);
  }
  container.hidden=!container.childElementCount;
}
function selectedVideo(){return videos.find(video=>video.id===$('recording-select').value);}
function stopJobWatching(){
  pollEpoch++;clearTimeout(pollTimer);pollTimer=null;pollAbort?.abort();pollAbort=null;currentJob=null;busy=false;
  $('progress-panel').hidden=true;$('check-status').hidden=true;
}
function option(value,text){const node=document.createElement('option');node.value=value;node.textContent=text;return node;}
function setLiveSelection(name){
  const select=$('recording-select');let live=select.querySelector('option[value="__live__"]');
  if(!live){live=option('__live__','New upload');select.append(live);}
  live.textContent='New upload';select.value='__live__';
  $('result-select').replaceChildren(option('__live__','Local conversion'));$('result-select').disabled=true;
  $('recording-filename').textContent=name;$('recording-description').textContent='A new recording processed in the local app.';$('capture-details').hidden=true;
}
function updateRecordingDetails(video){
  const duration=Number.isFinite(video.duration)?`${Number(video.duration.toFixed(1))} seconds`:'';
  $('recording-description').textContent=[video.description,duration].filter(Boolean).join(' · ');
  $('recording-filename').textContent=video.filename||'';
  $('source-sha').textContent=video.source_sha256||'Not provided';
}
function chooseRecording(){
  const video=selectedVideo();if(!video)return;
  const results=Array.isArray(video.results)?video.results:[];
  updateRecordingDetails(video);$('result-select').replaceChildren(...results.map(result=>option(result.id,result.label||result.name||result.id)));
  $('result-select').disabled=!results.length;$('capture-details').hidden=!results.length;
  if(results.length){$('result-select').value=results.at(-1).id;chooseResult();}
  else{stopJobWatching();clearView();$('selection-status').textContent='No reconstruction is available for this recording yet.';refreshButton();}
}
async function chooseResult(){
  if(uploading)return;
  const video=selectedVideo(), result=video?.results?.find(item=>item.id===$('result-select').value);if(!result)return;
  stopJobWatching();refreshButton();
  const url=new URL(location.href);url.searchParams.delete('job');history.replaceState(null,'',url);
  $('result-sha').textContent=result.sha256||'Not provided';$('capture-details').hidden=false;
  $('selection-status').textContent=`Loading ${result.label||result.name||'saved result'}…`;
  try{
    const loaded=await showResult(result);
    if(loaded)$('selection-status').textContent=`${video.title} · ${result.label||result.name||'Saved reconstruction'}`;
  }catch(e){error(e.message);$('selection-status').textContent='This result could not be loaded. Choose another result or retry.';}
}
function showNewestRecording(){
  if(!videos.length)return;
  $('recording-select').value=videos.at(-1).id;chooseRecording();
}
$('recording-select').addEventListener('change',chooseRecording);
$('result-select').addEventListener('change',chooseResult);

async function initialise(){
  let configurationError='';
  try{
    const response=await fetch('./site-config.json',{cache:'no-store'});if(!response.ok)throw new Error('Site configuration is unavailable.');
    const config=await response.json();if(!['local','showcase'].includes(config.mode))throw new Error('Site configuration is invalid.');mode=config.mode;
  }catch(e){configurationError=e.message;}
  document.body.dataset.mode=mode;
  $('upload-section').hidden=mode!=='local';$('showcase-note').hidden=mode!=='showcase';$('capture-tips').hidden=mode!=='local';
  if(mode==='showcase'){
    $('connection').className='connection showcase';$('connection').lastChild.textContent='Recorded results';
    $('intro-copy').textContent='Explore saved phone recordings, compare their 3D reconstructions, and download a model.';
  }else{
    $('intro-copy').textContent='Explore saved recordings or upload a slow walk through your room. Rotate the model, inspect furniture markers, and take it with you.';
  }
  try{
    const response=await fetch('./gallery.json',{cache:'no-store'});if(!response.ok)throw new Error('The recording gallery is unavailable.');
    const gallery=await response.json();videos=Array.isArray(gallery.videos)?gallery.videos.filter(video=>video&&typeof video.id==='string'&&Array.isArray(video.results)):[];
    $('recording-select').replaceChildren(...videos.map(video=>option(video.id,video.title||video.filename||video.id)));
    $('recording-count').textContent=String(videos.length);
    if(mode==='showcase'&&videos.length)$('intro-copy').textContent=`${videos.length} phone recordings. Explore their 3D reconstructions, compare the results, and download a model.`;
    if(!videos.length){$('recording-select').append(option('','No recordings yet'));$('selection-status').textContent='Saved results will appear here when available.';}
  }catch(e){error(e.message);$('recording-select').replaceChildren(option('','Gallery unavailable'));$('selection-status').textContent='The saved recording list could not be loaded.';}
  refreshButton();
  const requested=new URLSearchParams(location.search).get('job');
  if(mode==='local'){
    health();setInterval(health,20000);
    if(requested&&/^[a-f0-9]{16}$/.test(requested)){currentJob=requested;setLiveSelection('Requested local recording');poll();}
    else showNewestRecording();
  }else showNewestRecording();
  if(configurationError)error(configurationError+' Recorded results remain available; processing is disabled.');
}
initialise().catch(e=>error(e.message));
