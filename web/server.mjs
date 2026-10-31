// Local-only front end and proxy. https://nodejs.org/api/http.html
import http from 'node:http';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
const root=path.join(import.meta.dirname,'public');
const port=Number(process.env.PORT||8787);
const resolver='http://127.0.0.1:17790/open/363a4757851a7441dbf56c58/T007';
let upstream=process.env.LINGBOT_SERVICE_URL||null, checked=0;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function backend(){
  if(upstream&&Date.now()-checked<30000)return upstream;
  if(process.env.LINGBOT_SERVICE_URL){checked=Date.now();return upstream;}
  const r=await fetch(resolver,{redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(r.status!==302)throw new Error('The NUS room service is not connected. Open the existing PE preview connection and try again.');
  const u=new URL(r.headers.get('location'));
  if(u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw new Error('Unexpected preview address.');
  const health=await fetch(new URL('/api/health',u),{signal:AbortSignal.timeout(6000)}).then(r=>r.json());
  if(health.identity!=='lingbot-studio-v1')throw new Error('The preview connection points to a different app.');
  upstream=u.origin;checked=Date.now();return upstream;
}
const server=http.createServer(async(req,res)=>{
  try{
    const host=(req.headers.host||'').split(':')[0];
    if(!['127.0.0.1','localhost'].includes(host)){json(res,403,{error:'This app runs on this computer only.'});return;}
    if(req.method!=='GET'&&req.headers.origin&&![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)){json(res,403,{error:'Invalid request origin.'});return;}
    const u=new URL(req.url,'http://localhost');
    if(u.pathname.startsWith('/api/')){
      const base=await backend();
      const target=new URL(req.url,base);
      const headers={...req.headers,host:target.host,connection:'close'};delete headers.origin;
      const p=http.request(target,{method:req.method,headers},r=>{
        res.writeHead(r.statusCode,{...r.headers,'Cache-Control':'no-store'});r.pipe(res);
      });
      p.setTimeout(180000,()=>p.destroy(new Error('Transfer timed out. Please retry.')));
      p.on('error',()=>{checked=0;if(!res.headersSent)json(res,503,{error:'The compute connection was interrupted. Your submitted job may still be running; reconnect to check its status.'});else res.destroy();});
      req.on('aborted',()=>p.destroy());req.pipe(p);return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'Method not allowed'});return;}
    const relative=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);
    const file=path.resolve(root,'.'+relative);
    if(!file.startsWith(root+path.sep)){json(res,404,{error:'Not found'});return;}
    const s=await stat(file);if(!s.isFile())throw new Error('Not found');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':s.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)json(res,req.url.startsWith('/api/')?503:404,{error:e.message});else res.destroy();}
});
server.requestTimeout=200000;
server.listen(port,'127.0.0.1',()=>console.log(`LingBot Studio: http://127.0.0.1:${port}`));
