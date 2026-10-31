# LingBot-Map on PE

Installed in /home/b/brenowy/brennan_work/lingbot-map.
Isolated Python environment: .venv. Model: models/lingbot-map.pt.
Video uploads: incoming/. Results: outputs/. Logs: logs/.
Use separate Slurm GPU allocations with 32G host memory, four processors, and one h100-47 device. Maximum session three hours.
Local additions to demo.py save CPU predictions and allow running without a viewer.

## Plan
1. Install dependencies and official model.
2. Testing agent verifies actual GPU reconstruction and video input.
3. Accept user video and process it.
4. [USER-TEST] Open the reconstructed scene and judge visual completeness and navigation. Human review follows automated correctness checks.

## References (checked 2026-10-30)
- https://github.com/robbyant/lingbot-map/blob/main/README.md
- https://github.com/robbyant/lingbot-map/blob/main/demo.py
- https://huggingface.co/robbyant/lingbot-map/tree/main
- https://www.comp.nus.edu.sg/~cs3210/student-guide/soc-gpus/
- https://slurm.schedmd.com/sbatch.html



## Verified deployment (2026-10-30)



The testing agent exercised real model inference on the allocated H100 GPU using

12 frames encoded from example/courthouse into incoming/smoke.mp4 at 6 frames per second.

The checker decoded all 12 frames before inference and checked saved depth,

confidence, camera calibration, camera rotations, and reconstructed world points.

Both streaming and production windowed outputs passed, with 1,827,504 finite,

nondegenerate world points each. Saved results retain images for later viewing.



- Production command: sbatch --output=logs/video-%j.log scripts/run-video-pe.sh incoming/your-video.mp4 your-output-name

- Production windowed test: job 1045233 completed with exit 0:0; 1.1 seconds inference; 9.26 GB peak GPU allocation.

- Streaming test: job 1045237 is the clean rerun after correcting a checker assumption; see outputs/test-report.md for final state.

- Initial job 1045223 completed inference but failed an overly strict checker expecting optional direct world_points output. The model instead emits depth and camera calibration, from which the upstream viewer reconstructs points. Corrected checker validates this supported path.

- Output reports: outputs/smoke-verification.json and outputs/smoke-windowed-verification.json.

- Viewer/browser access and subjective reconstruction quality have not been tested. No GPU is held idle for upload.



The upstream demo may print a missing empty pretrained_path warning before loading

the supplied full checkpoint successfully. The installed model checkpoint is the

explicit models/lingbot-map.pt file. The native PyTorch attention path is selected

with --use_sdpa; FlashInfer is optional and was not installed.


Clean streaming rerun 1045237: COMPLETED, exit 0:0, inference 4.8s, peak GPU 9.26 GB. See outputs/test-report.md.
