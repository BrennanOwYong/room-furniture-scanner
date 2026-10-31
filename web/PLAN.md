# LingBot Studio

Local website for a phone recording -> LingBot room reconstruction -> furniture markers -> preview/download. User selected this computer and the existing NUS compute connection, 31 October 2026. No public hosting or paid service is needed.

## Implementation

1. Keep the interface and launcher on this computer. Forward only the dedicated room service through the existing Factory preview bridge. Do not expose the Factory dashboard externally.
2. Install the processing service and runner through the existing HNA-managed viewer session, in the persistent main repository `outputs/lingbot-studio-runtime` folder. Preserve every previous worker, file, and output. Keep the runtime outside disposable ticket worktrees. One studio job at a time; keep the shared maximum of two active GPU jobs.
3. Run the actual LingBot model on the uploaded recording. Preserve the full portrait field of view with the existing rotation option, record the transform, and retain source timestamps. Return observed geometry with gaps; do not invent missing surfaces.
4. Detect furniture on source images with Grounding DINO. Estimate marker locations using matching LingBot camera/depth data. Markers are approximate object locations, not segmented editable objects. Keep source image evidence and detector confidence. Never hardcode detections for the sample.
5. Verify with an independent Playwright-capable agent against real processing and the live local website. Test upload, progress, model loading, markers/evidence, download, invalid input and retry. No mock success or cached sample masquerading as a fresh run.
6. [USER-TEST] Upload, processing and result flow: after objective tests pass, ask the user to judge clarity and perceived wait using a runnable scenario card.
7. [USER-TEST] Furniture markers: after objective association and selection checks pass, ask the user to judge whether the labels and supporting images are useful and understandable. This can share the same scenario card.

## References checked 31 October 2026

- https://github.com/Robbyant/lingbot-map/blob/main/demo.py
- https://github.com/Robbyant/lingbot-map/blob/main/lingbot_map/utils/geometry.py
- https://github.com/Robbyant/lingbot-map/blob/main/lingbot_map/vis/glb_export.py
- https://huggingface.co/docs/transformers/v5.8.0/model_doc/grounding-dino#transformers.GroundingDinoProcessor.post_process_grounded_object_detection
- https://huggingface.co/IDEA-Research/grounding-dino-tiny
- https://threejs.org/docs/pages/GLTFLoader.html
- https://threejs.org/docs/pages/OrbitControls.html
- https://trimesh.org/trimesh.points.html#trimesh.points.PointCloud
- https://slurm.schedmd.com/sbatch.html
- https://slurm.schedmd.com/squeue.html
- https://docs.python.org/3/library/http.server.html
- https://docs.python.org/3/library/fcntl.html#fcntl.flock
- https://nodejs.org/api/http.html
- https://ffmpeg.org/ffprobe.html#Main-options
- https://docs.opencv.org/4.13.0/d4/d15/group__videoio__flags__base.html
- https://qwenlm.github.io/qwen-code-docs/en/users/features/commands/#3-exclamation-commands---shell-command-execution

Factory preview bridge contract was read from `C:/Users/brenn/PELogin/factory-preview.py`. `/open/<project>/<ticket>` resolves a ticket in `needs_ux` with its valid `uxPort` to a laptop-local relay. Current ticket/process state must be verified before using it.
