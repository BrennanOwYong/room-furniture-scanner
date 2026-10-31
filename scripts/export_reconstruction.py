"""Export real reconstruction previews and a portable point cloud.

References checked 2026-10-30:
https://github.com/robbyant/lingbot-map/blob/main/lingbot_map/utils/geometry.py
https://matplotlib.org/stable/api/_as_gen/mpl_toolkits.mplot3d.axes3d.Axes3D.scatter.html
https://trimesh.org/trimesh.points.html#trimesh.points.PointCloud.export
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
import json
import numpy as np
import torch
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from lingbot_map.utils.geometry import unproject_depth_map_to_point_map

torch.set_num_threads(4)
payload = torch.load('outputs/brennan-video.pt', map_location='cpu', weights_only=True)
p = payload['predictions']
images = payload['images'].float().numpy()
depth = p['depth'].float().numpy()
extrinsic = p['extrinsic'].float().numpy()
intrinsic = p['intrinsic'].float().numpy()
confidence = p['depth_conf'].float().numpy()
points = unproject_depth_map_to_point_map(depth, extrinsic, intrinsic)
colors = images.transpose(0, 2, 3, 1)
# Keep the more confident half and use deterministic sampling for export.
mask = (confidence >= np.percentile(confidence, 50)) & np.isfinite(points).all(-1)
points = points[mask]
colors = colors[mask]
sample = np.linspace(0, len(points)-1, min(200000, len(points)), dtype=int)
points, colors = points[sample], colors[sample]
trimesh.PointCloud(points, colors=(colors*255).clip(0,255).astype(np.uint8)).export('outputs/brennan-point-cloud.ply')
trimesh.Scene(trimesh.PointCloud(points, colors=(colors*255).clip(0,255).astype(np.uint8))).export('outputs/brennan-reconstruction.glb')
rotation = extrinsic[:, :3, :3]
translation = extrinsic[:, :3, 3]
cameras = -np.einsum('fji,fj->fi', rotation, translation)
lo, hi = np.percentile(points, [1,99], axis=0)
center = (lo+hi)/2
radius = max(hi-lo)/2
fig = plt.figure(figsize=(14,9), facecolor='#10151c')
fig.suptitle('Your video — LingBot-Map reconstruction', color='white', fontsize=19)
for i, (index, title) in enumerate([(0, 'First processed frame'), (-1, 'Last processed frame')]):
    ax = fig.add_subplot(2,3,1+i*3)
    ax.imshow(images[index].transpose(1,2,0).clip(0,1)); ax.set_title(title,color='white'); ax.axis('off')
for subplot, elev, azim, title in [(2, -65, -90, 'Overhead view'), (3, -20, -65, 'Perspective view')]:
    ax = fig.add_subplot(1,3,subplot,projection='3d',facecolor='#10151c')
    ax.scatter(points[::2,0],points[::2,2],-points[::2,1],c=colors[::2].clip(0,1),s=.5,depthshade=False)
    ax.plot(cameras[:,0],cameras[:,2],-cameras[:,1],color='#51d4ed',lw=1.7)
    ax.view_init(elev=-elev,azim=azim)
    ax.set_xlim(center[0]-radius,center[0]+radius); ax.set_ylim(center[2]-radius,center[2]+radius); ax.set_zlim(-center[1]-radius,-center[1]+radius)
    ax.set_box_aspect((1,1,1)); ax.set_axis_off(); ax.set_title(title,color='white',pad=8)
fig.text(.5,.025,'Colored points show predicted geometry. Cyan line shows estimated camera movement. Scale is not calibrated.',ha='center',color='#b8c5d3',fontsize=10)
fig.subplots_adjust(left=.02,right=.98,bottom=.07,top=.9,wspace=.03)
fig.savefig('outputs/brennan-preview.png',dpi=150,facecolor=fig.get_facecolor())
plt.close(fig)
Path('outputs/brennan-preview-summary.json').write_text(json.dumps({'frames':len(images),'exported_points':len(points),'confidence_percentile':50,'coordinate_scale':'uncalibrated'},indent=2))
print('EXPORT_COMPLETE',flush=True)
