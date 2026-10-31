"""Fit actual 3D Gaussian appearance to an existing LingBot reconstruction.

This is an appearance experiment, not object recognition or shape completion.
References checked 2026-10-30:
https://docs.gsplat.studio/main/apis/rasterization.html
https://github.com/nerfstudio-project/gsplat/blob/v1.5.3/examples/simple_trainer.py
https://github.com/nerfstudio-project/gsplat/blob/main/gsplat/exporter.py
"""
import json
import math
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageDraw
from gsplat import rasterization

torch.set_num_threads(4)
torch.manual_seed(42)
np.random.seed(42)
out=Path('outputs/gaussian-experiment');out.mkdir(parents=True,exist_ok=True)
data=torch.load('outputs/brennan-video.pt',map_location='cpu',weights_only=True)
p=data['predictions'];rgb=data['images'].float()
depth=p['depth'].float()[...,0];conf=p['depth_conf'].float()
ext=p['extrinsic'].float();K=p['intrinsic'].float()
n,_,h,w=rgb.shape
holdout=list(range(0,n,10));training=[i for i in range(n) if i not in holdout]
yy,xx=torch.meshgrid(torch.arange(0,h,6),torch.arange(0,w,6),indexing='ij')
pixel=torch.stack([xx,yy,torch.ones_like(xx)],dim=-1).float()
all_points=[];all_colors=[];all_scales=[]
cutoff=torch.quantile(conf.flatten()[::31],.35)
for i in training:
 d=depth[i,yy,xx]
 camera=(pixel @ torch.linalg.inv(K[i]).T)*d[...,None]
 world=(camera-ext[i,:,3]) @ ext[i,:,:3]
 good=(conf[i,yy,xx]>=cutoff)&torch.isfinite(world).all(-1)&(d>0)
 all_points.append(world[good]);all_colors.append(rgb[i,:,yy,xx].permute(1,2,0)[good])
 all_scales.append((d/K[i,0,0]*3.0)[good])
points=torch.cat(all_points);colors=torch.cat(all_colors);scales=torch.cat(all_scales)
selection=torch.linspace(0,len(points)-1,min(120000,len(points))).long()
points,colors,scales=points[selection],colors[selection],scales[selection]
device='cuda';count=len(points)
parameters=torch.nn.ParameterDict({
 'means':torch.nn.Parameter(points.to(device)),
 'log_scales':torch.nn.Parameter(scales.clamp(.0005,.04).log()[:,None].repeat(1,3).to(device)),
 'quats':torch.nn.Parameter(torch.tensor([1.,0,0,0],device=device).repeat(count,1)),
 'opacity_logits':torch.nn.Parameter(torch.full((count,),-1.4,device=device)),
 'color_logits':torch.nn.Parameter(torch.logit(colors.clamp(.001,.999)).to(device)),
})
optim=torch.optim.Adam([
 {'params':[parameters['means']],'lr':.00005},
 {'params':[parameters['log_scales']],'lr':.003},
 {'params':[parameters['quats']],'lr':.001},
 {'params':[parameters['opacity_logits']],'lr':.02},
 {'params':[parameters['color_logits']],'lr':.01},
],eps=1e-15)
size=260
targets=F.interpolate(rgb,size=(size,size),mode='area').permute(0,2,3,1).contiguous().to(device)
Ks=K.to(device).clone();Ks[:,0,:]*=size/w;Ks[:,1,:]*=size/h
viewmats=torch.eye(4,device=device).repeat(n,1,1);viewmats[:,:3,:]=ext.to(device)
initial_points=parameters['means'].detach().clone()

def render(index):
 image,alpha,_=rasterization(means=parameters['means'],quats=F.normalize(parameters['quats'],dim=-1),scales=parameters['log_scales'].exp(),opacities=parameters['opacity_logits'].sigmoid(),colors=parameters['color_logits'].sigmoid(),viewmats=viewmats[index:index+1],Ks=Ks[index:index+1],width=size,height=size,packed=False,backgrounds=torch.ones((1,3),device=device))
 return image[0],alpha[0]

@torch.no_grad()
def evaluate(indices):
 errors=[];psnr=[]
 for i in indices:
  image,_=render(i);delta=image-targets[i]
  errors.append(delta.abs().mean().item());psnr.append((-10*torch.log10(delta.square().mean().clamp_min(1e-10))).item())
 return {'mean_absolute_pixel_error':float(np.mean(errors)),'psnr_db':float(np.mean(psnr))}

preview_indices=[holdout[1],holdout[len(holdout)//2],holdout[-2]]
print('GPU',torch.cuda.get_device_name(),'GAUSSIANS',count,flush=True)
t0=time.time()
before=evaluate(holdout)
with torch.no_grad(): initial_images=[render(i)[0].cpu().numpy() for i in preview_indices]
print('INITIAL',before,flush=True)
for step in range(1200):
 index=training[torch.randint(len(training),(1,)).item()]
 image,_=render(index)
 loss=(image-targets[index]).abs().mean()+.005*(parameters['means']-initial_points).square().mean()+.0001*parameters['log_scales'].exp().mean()
 optim.zero_grad(set_to_none=True);loss.backward();optim.step()
 with torch.no_grad():
  parameters['log_scales'].clamp_(math.log(.0002),math.log(.12))
 if step%100==0:print('STEP',step,'LOSS',float(loss.detach()),flush=True)
after=evaluate(holdout)
saved={name:value.detach().cpu() for name,value in parameters.items()}
torch.save(saved,out/'gaussians.pt')
# Standard Gaussian PLY: opacity is a logit; scale is logarithmic; quaternion wxyz.
names=['x','y','z','nx','ny','nz','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']
q=F.normalize(saved['quats'],dim=-1)
dc=(saved['color_logits'].sigmoid()-.5)/.28209479177387814
vertices=torch.cat([saved['means'],torch.zeros_like(saved['means']),dc,saved['opacity_logits'][:,None],saved['log_scales'],q],dim=1).numpy().astype('<f4')
header='ply\nformat binary_little_endian 1.0\nelement vertex '+str(count)+'\n'+''.join('property float '+name+'\n' for name in names)+'end_header\n'
with (out/'brennan-gaussians.ply').open('wb') as file:file.write(header.encode());file.write(vertices.tobytes())
sheet=Image.new('RGB',(size*3,size*3+70),'white');draw=ImageDraw.Draw(sheet)
for column,title in enumerate(['Source video frame','Initial Gaussian rendering','Fitted Gaussian rendering']):draw.text((column*size+8,8),title,fill='black')
for row,index in enumerate(preview_indices):
 with torch.no_grad(): fitted=render(index)[0].cpu().numpy()
 source=targets[index].cpu().numpy()
 for column,array in enumerate([source,initial_images[row],fitted]):sheet.paste(Image.fromarray((array.clip(0,1)*255).astype('uint8')),(column*size,30+row*size))
draw.text((8,size*3+40),'Held-out image colours; camera geometry estimated using the original video. No object completion.',fill='black')
sheet.save(out/'gaussian-comparison.png')
report={'gaussians':count,'optimization_steps':1200,'training_frames':len(training),'evaluation_frames':len(holdout),'before':before,'after':after,'seconds':time.time()-t0,'peak_gpu_gb':torch.cuda.max_memory_allocated()/1e9,'limitations':['Uses previously predicted camera poses and depth; not metric calibrated.','Evaluation image colours excluded from fitting, but geometry estimation used whole video.','No semantic object labels or unseen-surface completion.','Fixed Gaussian count, no densification or camera refinement.']}
(out/'report.json').write_text(json.dumps(report,indent=2));print('COMPLETE',json.dumps(report),flush=True)
