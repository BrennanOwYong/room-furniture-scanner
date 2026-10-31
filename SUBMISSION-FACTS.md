# Hackathon submission facts

Prepared 31 October 2026. The rubric was supplied verbally by Brennan; no rubric document was provided.

## Scope for the two-hour build

Input: an ordinary phone video. Output: an actual downloadable 3D reconstruction with a browser preview. Use the supplied bedroom clip. Keep furniture detection, exact measurements and editing out of the demonstrated claims.

The original idea is to make room capture usable for interior design without requiring a depth-sensing phone. This prototype reconstructs visible surfaces. It does not supply missing views or prove furniture dimensions.

## Evidence for reach

Ingka Group reported more than 2.9 million active IKEA Kreativ users across the IKEA app and website in 29 countries in its financial year 2024 report, page16. This is historical evidence of interest in home visualisation; it is not our user count or a measured market size.

Source: https://www.ingka.com/static/ingkagroup_annualsummaryandsustainabilityreport_fy24.pdf#page=16

## Evidence for a cost argument

Polycam currently lists a free plan with limited captures and glTF export. Its Basic plan lists USD30 monthly or USD150 yearly, with unlimited object captures and Gaussian splats, space capture with and without LiDAR, and six mesh export formats. Do not claim competitors universally charge for every model or require LiDAR.

Source, checked31October2026: https://poly.cam/pricing

The defensible project argument is a reusable self-hosted workflow using existing phone footage and exportable assets. This demo uses university GPU access. Report actual inference/export time and hardware allocation separately from installation and queue time. Do not claim production cost is zero or invent a percentage saving.

## Source and attribution

- LingBot-Map project: https://github.com/robbyant/lingbot-map
- LingBot Apache2.0 licence: https://raw.githubusercontent.com/robbyant/lingbot-map/main/LICENSE.txt
- Official2D Gaussian Splatting source: https://github.com/hbb1/2d-gaussian-splatting
- Official2DGS licence: https://raw.githubusercontent.com/hbb1/2d-gaussian-splatting/main/LICENSE.md
- Depth Anything3 model cards: https://github.com/ByteDance-Seed/Depth-Anything-3#-model-cards
- Three.js viewer library: https://github.com/mrdoob/three.js/blob/dev/LICENSE

User confirms the submission is a noncommercial side-project showcase. Retain upstream licence and model attribution. Our additions and upstream tools must remain distinguishable; official2DGS and the selected large DA3 weights have noncommercial terms. Never describe those components as unrestricted open source.

## Claims that need actual output before submission

- Which method produced the model and whether it is a triangle mesh or a point cloud.
- The exact input hash, model filename and output hash.
- Observed reconstruction quality and missing areas.
- Measured processing time, memory and file size.
- Whether a newly selected video runs through the full converter or the displayed result is an explicitly labelled exact-hash cached result.
- Independent test results for video input, generation, preview and download.

This facts sheet is not a report of completed conversion.

## First artifact, 31 October at 14:48 Singapore

The new clip completed LingBot inference in scheduler job 1048149 in 50 seconds. A derived depth-grid mesh was exported from twelve of the 119 sampled frames. Export ran from 06:48:13 to 06:48:22 UTC; its mesh-building stage reported 2.1 seconds. These timings exclude installation, queueing, supervision and viewer packaging.

The first GLB is 7,186,000 bytes, SHA-256 `17182edcfa424d8df0054770d7405ff566e223065fdaf2cd265927fe3f636fe7`. The PLY is 7,540,954 bytes, SHA-256 `c62ce5cff7084b891968dda95519fa412e94bd6e6bd023ac0668953af1e26334`. Files remain outside Git. The mesh has 355,628 triangle faces; the preliminary receipt's vertex count was recorded before unused vertices were removed and must not be presented as the final loaded count.

The actual GLB was opened in the browser. The first result has fragmented surfaces and large gaps. It is a downloadable early output, not an accepted quality result or a verified end-to-end application. Independent testing remains pending. The portable preview supports viewing and downloading; it does not run reconstruction locally.

## Implementation references

- LingBot native point-cloud scene export: `lingbot_map/vis/glb_export.py`, function `predictions_to_glb`; this does not extract a polygon surface.
- Official 2DGS native mesh extraction: https://github.com/hbb1/2d-gaussian-splatting#testing
- Trimesh vertex colours: https://trimesh.org/trimesh.visual.color.html#trimesh.visual.color.ColorVisuals.vertex_colors
- Three.js native PLY loader: https://threejs.org/docs/pages/PLYLoader.html
- Three.js native GLB loader: https://threejs.org/docs/pages/GLTFLoader.html
- Open3D colour/depth integration: https://www.open3d.org/docs/latest/tutorial/pipelines/rgbd_integration.html
- Open3D surface-fusion API: https://www.open3d.org/docs/latest/python_api/open3d.pipelines.integration.ScalableTSDFVolume.html
- Qwen native terminal shell mode and session controls: https://qwenlm.github.io/qwen-code-docs/en/users/features/commands/

References inspected on 31 October 2026. An implementation reference is not evidence that its method has been tested on this video.

