"""Objective checks against a real fitted Gaussian model and GPU renderer.

References:
https://docs.gsplat.studio/main/apis/rasterization.html
https://docs.pytorch.org/docs/2.8/generated/torch.load.html
"""
import json
from pathlib import Path
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from gsplat import rasterization

torch.set_num_threads(4)
out=Path('outputs/gaussian-experiment')
saved=torch.load(out/'gaussians.pt',map_location='cpu',weights_only=True)
expected={'means','log_scales','quats','opacity_logits','color_logits'}
assert set(saved)==expected
count=len(saved['means'])
assert count>0
for name,tensor in saved.items():
    assert tensor.shape[0]==count and tensor.numel()>0,name
    assert torch.isfinite(tensor).all().item(),name
assert (saved['log_scales'].exp()>0).all().item()
assert (saved['quats'].norm(dim=-1)>0).all().item()
blob=(out/'brennan-gaussians.ply').read_bytes()
header,body=blob.split(b'end_header\n',1)
lines=header.decode().splitlines()
assert 'format binary_little_endian 1.0' in lines
assert f'element vertex {count}' in lines
fields=[line.split()[-1] for line in lines if line.startswith('property ')]
standard=['x','y','z','nx','ny','nz','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']
assert fields==standard,fields
assert len(body)==count*len(fields)*4
vertices=np.frombuffer(body,dtype='<f4').reshape(count,len(fields))
assert np.isfinite(vertices).all()
assert np.allclose(vertices[:,:3],saved['means'].numpy())
assert np.allclose(vertices[:,9],saved['opacity_logits'].numpy())
assert np.allclose(vertices[:,10:13],saved['log_scales'].numpy())
assert np.allclose(np.linalg.norm(vertices[:,13:17],axis=1),1,atol=1e-5)
assert np.allclose(vertices[:,6:9],(saved['color_logits'].sigmoid().numpy()-.5)/.28209479177387814,atol=1e-5)
report=json.loads((out/'report.json').read_text())
assert report['gaussians']==count and report['optimization_steps']==1200
assert report['training_frames']+report['evaluation_frames']==104
for phase in ['before','after']:
    assert np.isfinite(list(report[phase].values())).all()
assert Image.open(out/'gaussian-comparison.png').size==(780,850)
data=torch.load('outputs/brennan-video.pt',map_location='cpu',weights_only=True)
p=data['predictions'];rgb=data['images'].float()
params={k:v.cuda().detach().requires_grad_() for k,v in saved.items()}
size=260
intrinsics=p['intrinsic'][0:1].float().cuda().clone()
intrinsics[:,0,:]*=size/rgb.shape[-1];intrinsics[:,1,:]*=size/rgb.shape[-2]
view=torch.eye(4,device='cuda')[None];view[:,:3,:]=p['extrinsic'][0:1].cuda()
image,alpha,_=rasterization(means=params['means'],quats=F.normalize(params['quats'],dim=-1),scales=params['log_scales'].exp(),opacities=params['opacity_logits'].sigmoid(),colors=params['color_logits'].sigmoid(),viewmats=view,Ks=intrinsics,width=size,height=size,packed=False,backgrounds=torch.ones((1,3),device='cuda'))
assert image.shape==(1,size,size,3) and alpha.shape==(1,size,size,1)
assert torch.isfinite(image).all().item() and torch.isfinite(alpha).all().item()
target=F.interpolate(rgb[0:1],size=(size,size),mode='area').permute(0,2,3,1).cuda()
loss=(image-target).abs().mean();loss.backward()
gradients={}
for name,value in params.items():
    assert value.grad is not None and torch.isfinite(value.grad).all().item(),name
    nonzero=int(torch.count_nonzero(value.grad))
    assert nonzero>0,name
    gradients[name]={'finite':True,'nonzero_elements':nonzero}
result={'status':'PASS','gpu':torch.cuda.get_device_name(),'gaussians':count,'standard_ply_fields':fields,'forward_shape':list(image.shape),'alpha_nonzero_pixels':int(torch.count_nonzero(alpha)),'backward_gradients':gradients,'photometric_report':report,'evaluation_limit':'Held-out image colors were excluded from fitting, but all camera/depth geometry came from the original whole-video reconstruction.'}
(out/'verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2),flush=True)
