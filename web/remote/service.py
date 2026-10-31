"""Loopback-only LingBot job service, launched inside HNA's viewer worktree.
References: https://docs.python.org/3/library/http.server.html
https://slurm.schedmd.com/sbatch.html and https://slurm.schedmd.com/squeue.html
"""
import argparse
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import queue
import re
import shlex
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse
import uuid
from state_io import update

ROOT = Path(__file__).resolve().parent
REPO = Path(os.environ.get('LINGBOT_REPO', '/home/b/brenowy/brennan_work/lingbot-map'))
JOBS = Path(os.environ.get('LINGBOT_JOBS', str(ROOT / 'jobs')))
PYTHON = os.environ.get('LINGBOT_PYTHON', sys.executable)
MAX_BYTES = 150 * 1024 * 1024
LOCK = threading.RLock()
QUEUE = queue.Queue()
os.environ['SLURM_CONF'] = os.path.expanduser('~/.hna/factory-hub/slurm-client.conf')

def read_state(folder):
    return json.loads((folder / 'state.json').read_text())

def command(args, timeout=30):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True).stdout.strip()

def processing_ready():
    return all(p.is_file() for p in [Path(PYTHON),ROOT/'runner.py',ROOT/'state_io.py',REPO/'models/lingbot-map.pt'])

def public_state(folder):
    d = read_state(folder)
    public = {k:d[k] for k in ['id','state','name','message','frames','point_count','source_sha256','scheduler_id','detection_note','created_at','updated_at'] if k in d}
    if d['state'] == 'complete':
        public['model_url'] = f"/api/jobs/{d['id']}/model"
        result = json.loads((folder / 'result.json').read_text())
        public['representation'] = result.get('representation','3D reconstruction')
        public['method'] = result.get('method','LingBot-Map')
        public['objects'] = result.get('objects', [])
        for obj in public['objects']:
            obj['evidence']['url'] = f"/api/jobs/{d['id']}/evidence/{obj['evidence']['file']}"
    return public

def watch(folder, scheduler_id):
    empty_count = 0
    while True:
        state = read_state(folder)
        if state['state'] in ['complete','failed']: return
        try:
            active = command(['squeue','-h','-j',scheduler_id,'-o','%T'],15)
            if not active:
                empty_count += 1
                if empty_count >= 5:
                    update(folder,only_if_active=True,state='failed',message='The compute job stopped before producing a model. You can retry the upload.')
                    return
            else: empty_count=0
        except Exception:
            pass
        time.sleep(3)

def worker():
    while True:
        folder=QUEUE.get()
        try:
            state=read_state(folder)
            if state.get('scheduler_id'):
                watch(folder,str(state['scheduler_id']));continue
            # Leave one of the user's two shared GPU slots for other reconstruction work.
            while True:
                if (ROOT/'PAUSED').exists():
                    update(folder,message='Waiting for the current room experiment to finish. Your video is safely uploaded.')
                    time.sleep(5)
                    continue
                ids=command(['squeue','-h','-u',os.environ.get('USER','brenowy'),'-p','gpu','-o','%i'],15).splitlines()
                if len(ids)<2:break
                update(folder,message='Waiting for an available compute slot. Your video is safely uploaded.')
                time.sleep(5)
            invocation=shlex.join([PYTHON,str(ROOT/'runner.py'),'--job',str(folder),'--repo',str(REPO)])
            scheduler_id=command(['sbatch','--parsable','--partition=gpu','--gpus=h100-47:1','--mem=32G','--cpus-per-task=4','--time=00:15:00',
                '--job-name=lb-'+state['id'],'--output='+str(folder/'processing.log'),'--wrap='+invocation],30).split(';')[0]
            if not scheduler_id.isdigit():raise RuntimeError('Unexpected scheduler response')
            update(folder,scheduler_id=scheduler_id)
            watch(folder,scheduler_id)
        except Exception as e:
            (folder/'service-error.txt').write_text(str(e))
            update(folder,only_if_active=True,state='failed',message='The compute service could not start this job. Reconnect and try the upload again.')
        finally:QUEUE.task_done()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def json(self,status,value):
        raw=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def file(self,path,download=False):
        if not path.is_file():self.json(404,{'error':'File is not ready.'});return
        self.send_response(200);self.send_header('Content-Type','model/gltf-binary' if path.suffix=='.glb' else mimetypes.guess_type(path.name)[0] or 'application/octet-stream');self.send_header('Content-Length',str(path.stat().st_size));self.send_header('X-Content-Type-Options','nosniff')
        if download:self.send_header('Content-Disposition','attachment; filename="lingbot-room.glb"')
        self.end_headers()
        try:
            with path.open('rb') as f:
                while chunk:=f.read(256*1024):self.wfile.write(chunk)
        except (BrokenPipeError,ConnectionResetError):pass
    def do_GET(self):
        u=urlparse(self.path)
        if u.path=='/api/health':
            ready=processing_ready()
            self.json(200 if ready else 503,{'identity':'lingbot-studio-v1','status':'ready' if ready else 'unavailable','processing_ready':ready,'paused':(ROOT/'PAUSED').exists(),'max_bytes':MAX_BYTES,'max_seconds':60});return
        match=re.fullmatch(r'/api/jobs/([a-f0-9]{16})(?:/(model|evidence)/?([a-zA-Z0-9_.-]*))?',u.path)
        if not match:self.json(404,{'error':'Not found'});return
        folder=JOBS/match[1]
        if not (folder/'state.json').is_file():self.json(404,{'error':'This job was not found. You can start a new upload.'});return
        try:
            if not match[2]:self.json(200,public_state(folder))
            elif match[2]=='model':
                if read_state(folder)['state']!='complete':self.json(409,{'error':'The model is still processing.'})
                else:self.file(folder/'model.glb','download=1' in u.query)
            elif match[2]=='evidence' and re.fullmatch(r'frame-\d+\.jpg',match[3] or ''):self.file(folder/'evidence'/match[3])
            else:self.json(404,{'error':'Not found'})
        except (FileNotFoundError,json.JSONDecodeError):self.json(503,{'error':'The job state is updating. Try again.'})
    def do_POST(self):
        u=urlparse(self.path)
        if u.path!='/api/jobs':self.json(404,{'error':'Not found'});return
        if not processing_ready():self.json(503,{'error':'The processing files are unavailable. Reconnect after the service is repaired.'});return
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:length=0
        if not 1<=length<=MAX_BYTES:self.json(413,{'error':'Choose a video between 1 byte and 150 MB.'});return
        name=Path(unquote(self.headers.get('X-Filename','video.mp4'))).name
        extension=Path(name).suffix.lower()
        if extension not in ['.mp4','.mov','.webm']:self.json(415,{'error':'Choose an MP4, MOV or WebM video.'});return
        # Keep uploads and scheduler work bounded on the shared allocation.
        with LOCK:
            active=sum(1 for p in JOBS.glob('*/state.json') if json.loads(p.read_text()).get('state') not in ['complete','failed'])
            if active>=3:self.json(429,{'error':'Three videos are already queued. Wait for one to finish before uploading another.'});return
            job_id=uuid.uuid4().hex[:16];folder=JOBS/job_id;folder.mkdir(parents=True)
            update(folder,id=job_id,state='uploading',name=name[:120],detect=parse_qs(u.query).get('detect',['1'])[0]=='1',created_at=time.time(),message='Receiving video.')
        digest=hashlib.sha256();target=folder/('video'+extension)
        try:
            self.connection.settimeout(120)
            remaining=length
            with target.open('wb') as f:
                while remaining:
                    data=self.rfile.read(min(1024*1024,remaining))
                    if not data:raise ValueError('Upload was interrupted. Please retry.')
                    f.write(data);digest.update(data);remaining-=len(data)
            probe=json.loads(command(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height,avg_frame_rate:stream_side_data=rotation','-of','json',str(target)],30))
            videos=[s for s in probe.get('streams',[]) if s.get('codec_type')=='video']
            duration=float(probe.get('format',{}).get('duration',0))
            if not videos or not 0<duration<=60.5:raise ValueError('Choose a readable video of 60 seconds or less.')
            if videos[0]['width']*videos[0]['height']>4096*4096:raise ValueError('Choose a video with resolution no higher than 4K.')
            stream=videos[0];width,height=stream['width'],stream['height']
            rotation=next((float(d['rotation']) for d in stream.get('side_data_list',[]) if 'rotation' in d),0)
            if round(rotation)%180:width,height=height,width
            update(folder,state='queued',video=str(target),source_sha256=digest.hexdigest(),duration=duration,width=width,height=height,source_rotation=rotation,source_frame_rate=stream.get('avg_frame_rate'),message='Video received. Waiting for compute.')
            QUEUE.put(folder);self.json(202,public_state(folder))
        except Exception as e:
            update(folder,state='failed',message=str(e) if isinstance(e,ValueError) else 'This file could not be read as a video.')
            self.json(422,{'error':read_state(folder)['message']})

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=32880);a=p.parse_args()
    JOBS.mkdir(parents=True,exist_ok=True)
    for state_path in JOBS.glob('*/state.json'):
        s=json.loads(state_path.read_text())
        if s.get('state') not in ['complete','failed']:
            if s.get('scheduler_id'):QUEUE.put(state_path.parent)
            else:update(state_path.parent,state='failed',message='The service restarted before this job was submitted. Please upload it again.')
    threading.Thread(target=worker,daemon=True).start()
    print(f'LingBot Studio service on 127.0.0.1:{a.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
