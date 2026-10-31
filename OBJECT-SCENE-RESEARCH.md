# Selectable object scene research - 2026-10-30

Current LingBot output is a depth/camera reconstruction rendered as coloured points, not Gaussian splats.

## Architecture
1. Estimate and refine camera geometry from guided capture.
2. Fit a static 3D Gaussian room representation for appearance (gsplat).
3. Detect, segment, and track furniture instances (SAM 3 candidate).
4. Fuse multi-view masks into stable object IDs attached to Gaussian memberships.
5. Maintain per-object pose, observed geometry, collision/measurement proxy, scale source and uncertainty.
6. Optionally generate fuller object meshes/splats for unseen surfaces (SAM 3D Objects candidate).
7. Keep observed versus generated regions separate. Generated hidden geometry must not establish purchasing measurements.
8. Removal of an object can reveal unobserved room surfaces. Background completion is separate from object completion.

Static furniture needs 3D Gaussian splatting. 4D models add time-dependent scene changes; walking a camera through a static room does not require 4D.
Selection does not require a complete mesh: observed geometry plus a stable instance ID is sufficient.

## Prototype stages
- Fit and evaluate true Gaussians against the saved video reconstruction.
- [USER-TEST] Compare source frames and splat rendering for visible blur, holes and distortion, after objective renderer/gradient/file checks.
- Obtain model access for SAM 3 and SAM 3D Objects. Both metadata checks on PE returned GatedRepoError / HTTP401; normal cached authentication was used. No credentials were read or printed.
- Segment the desk, track it and attach a stable object ID to scene geometry.
- [USER-TEST] Click the desk, confirm highlighting selects the intended object, then hide/restore it after objective selection tests.
- Generate a plausible complete desk asset while preserving visible evidence and marking inferred surfaces.
- [USER-TEST] Inspect generated hidden surfaces for plausibility. Compare physically measured dimensions separately.

## gsplat experiment limits
scripts/fit_gaussians.py uses gsplat1.5.3, fixed Gaussian count, no densification and no camera-pose refinement. It is an appearance proof, not a production reconstruction. Evaluation colours are withheld from fitting, but geometry comes from the original full-video LingBot result. Improvements cannot establish independent measurement accuracy.

## Official sources
- https://github.com/robbyant/lingbot-map/blob/main/demo.py
- https://docs.gsplat.studio/main/apis/rasterization.html
- https://github.com/nerfstudio-project/gsplat/blob/v1.5.3/examples/simple_trainer.py
- https://github.com/nerfstudio-project/gsplat/blob/main/gsplat/exporter.py
- https://docs.nerf.studio/nerfology/methods/splat.html
- https://github.com/facebookresearch/sam3/blob/main/README.md
- https://github.com/facebookresearch/sam-3d-objects/blob/main/README.md
- https://github.com/facebookresearch/sam-3d-objects/blob/main/doc/setup.md
- https://huggingface.co/facebook/sam3
- https://huggingface.co/facebook/sam-3d-objects
- https://github.com/hustvl/4DGaussians
- https://huggingface.co/docs/huggingface_hub/package_reference/file_download#get_hf_file_metadata
