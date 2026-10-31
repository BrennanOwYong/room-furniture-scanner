# HNA reconstruction review loop

Requested by Brennan on 31 October 2026. This document defines the execution contract; implementation and verification status must be reported separately.

## Ownership

HNA owns PE coding, parallel builders, resource submission, tests, artifact production, and deployment. Codex supplies the source-video observations and reviews returned visual evidence. A separate testing agent verifies deterministic behavior against actual outputs. The initial work is registered as HNA project `363a4757851a7441dbf56c58` at `/home/b/brenowy/brennan_work/lingbot-map`. HNA loop implementation is assigned to project `368156e1011303826c31630e` at `/home/b/brenowy/brennan_work/HNA-Code`.

## Attempt lifecycle

1. Record the hypothesis, exact source revision, uncommitted-change digest if needed, model/checkpoint revision, configuration digest and original video hash.
2. Claim an attempt once. Reconcile saved scheduler job identifiers before submission or retry. Use a shared capacity limit across candidate methods.
3. Run reconstruction or segmentation and save the source frame indices, actual timestamps, preprocessing transformations, camera convention, memory use, duration and artifact hashes.
4. A separate testing agent checks real outputs. Numerical validity does not authorize visual acceptance.
5. Build a review bundle with fixed source/render comparisons, the full source camera path, diagnostic extra viewpoints, masks over source images, and an explicit list of missing evidence. Mark surfaces inferred by a generative model.
6. Codex submits an accept, revise or blocked verdict bound to that exact attempt and artifact set. Every finding needs frame/view references and a concrete defect. Missing or stale review stays pending.
7. A revise verdict carries the findings into a new attempt with a testable change. Retain the prior outputs for comparison. An accepted attempt can release dependent work only when its objective checks also passed.

The first cycle allows at most three revisions per candidate. Stop automatic retries on exhausted limits, unchanged repeated failures, missing access, or missing review evidence. Preserve the strongest candidate even if a later attempt regresses. Do not announce a quality pass because a process exited successfully.

## Parallel candidates

| Workstream | Initial responsibility | Dependency |
|---|---|---|
| LingBot | Preserve the baseline; test portrait coverage and scale-reference settings independently | Shared immutable input manifest |
| Learned reconstruction | Evaluate Depth Anything 3 (DA3) and Visual Geometry Grounded Transformer (VGGT); Omega depends on checkpoint access | Shared frame selection and comparison convention |
| Feature-based reconstruction and appearance | Evaluate COLMAP camera recovery and dense geometry, then Nerfstudio Splatfacto appearance | Shared frames; successful camera recovery |
| Surface reconstruction | Evaluate 2D Gaussian Splatting and its exported mesh (a connected surface made of polygons) | Images with camera estimates; shared comparison convention |
| Entity tracking | Prompt and track table/chair masks using accessible SAM 2.1 weights; separate backpack/person/background | Original images; best geometry only needed for later 3D association |
| Evidence/testing | Validate outputs and assemble comparable review bundles | Candidate artifacts |
| HNA review support | Add durable, project-scoped review and retry handling to the active parallel execution path | Existing HNA source and isolated live test project |

ARCore Raw Depth needs appropriate phone capture data. It cannot be honestly benchmarked by labelling inferred depth from this ordinary video as ARCore output. Following Brennan's clarification on 31 October, Marble and generative world completion are excluded from this comparison. The target is faithful reconstruction of observed room contents. Keep unseen regions unknown. No Marble login or private-footage upload is needed.

## Visual review criteria

Use the same evidence set for each candidate. For each criterion record unacceptable, partial, usable for this clip, or insufficient evidence, with cited views. Avoid a weighted total that lets good colour hide unusable geometry.

- Desk edges remain straight and supports remain connected in the visible views.
- The rectangular gap beneath the desk stays open, with correct foreground/background ordering.
- Floor, wall, desk and chairs remain distinct surfaces; do not create reflected objects as direct geometry.
- Returning to a previously seen area does not produce doubled or drifting surfaces.
- The table and target chair remain recognizable when navigating beyond the original view by a modest amount. Report where views leave observed coverage.
- Object masks follow real outlines, retain identity and exclude nearby furniture, backpack and people appropriately.
- Source-view appearance improves without hiding holes or adding unsupported geometry.
- Scale and unseen surfaces retain explicit uncertainty. No dimensions in centimetres are accepted without a justified scale source.

## Evidence limits

The same clip is intentionally reused for development. A final withheld temporal segment can check degradation on unused images, but that is still a check within one scene. If its images were used to estimate geometry or camera poses, label that use. Keep geometry accuracy, source-image reconstruction, visual plausibility and selection consistency separate. No reference depth or surveyed camera path exists for this clip.

## Accuracy comparison and its limits

This is the required evaluation design, not a claim that these measurements have been implemented or collected. The completed evidence currently consists of the original LingBot run, the rough fixed-Gaussian fit, and the source-frame review. The alternatives have no accepted output yet.

- Freeze one source manifest with actual timestamps, frame identities, original image coordinates and invertible resize/crop/padding maps. Use shared evaluation views. Report failed/unregistered frames and lost image coverage, rather than selecting only a method's successful views. Report any differences in input frame count, resolution, pose sources, compute and checkpoint access.
- Compare appearance on buffered contiguous temporal segments withheld from fitting. Disclose separately whether withheld images influenced camera estimation or geometry. The old Gaussian baseline withheld some colour targets but used the complete sampled sequence for geometry; it is not an independent unseen-view test. Codex has already seen the whole clip, so subsequent visual review is not blind.
- Measure geometric consistency through feature reprojection error (pixel displacement when a reconstructed feature is projected back into an image), agreement of depth across views, and drift or doubled surfaces on revisits. These are internal consistency checks, not proof of physical accuracy. Preserve visible openings, edges and foreground/background ordering; report missing coverage independently.
- For object evaluation, prepare independently annotated visible outlines on fixed reference frames. Compare predicted masks (the pixels assigned to an object) using intersection over union, boundary error, identity switches and leakage into other objects. The model's own predictions and existing point prompts are not ground truth. Until independent outlines exist, report qualitative findings only. Frame 530 tests the desk opening; frame 590 tests separation of chair and backpack.
- Physical dimensions require an external scale source and independent check measurements. A known length can establish global scale, but does not validate every shape. Report signed and absolute dimensional error against measurements that were not used for calibration. Without those measurements, keep dimensions unverified and avoid centimetre-accuracy claims.
- A future external benchmark can use ScanNet++ colour imagery as input while withholding laser geometry and object annotations for evaluation. Measure surface distance and completeness over observed coverage, for example at 1, 2 and 5 cm, and object separation against its annotations. Disclose alignment and any scale fitting. This dataset has not been acquired or evaluated here, and does not replace Brennan's clip as the current development reference.

Codex's visual review checks visible contradictions and supplies bounded revision findings. An independent testing agent owns repeatable calculations and live selection checks. Keep image similarity, geometric consistency, object separation and measured physical accuracy as separate results. Do not combine them into a score that hides a failed requirement. One repeatedly tuned video cannot establish performance in other homes.

## Common geometry-to-object interface

Recognize and track objects in the original video alongside geometry reconstruction. Do not depend on recognizing objects from an already degraded rendered world.

Each reconstruction adapter must preserve original frame/timestamp references; camera intrinsics (the camera's projection parameters); camera positions and orientations with explicit coordinate conventions; per-view depth and validity/confidence where available; preprocessing coordinate maps; observed geometry; and scale status. Optional Gaussian appearance remains separate from the geometry used for selection and measurement. Normalize coordinate conventions explicitly rather than assuming every model exports the same camera transform.

The proposed object path is category detection with Grounding DINO, followed by Segment Anything Model 2 (SAM 2) outlines and video tracking. Initial desk/chair point prompts provide an assisted baseline, not proof of automatic category recognition. Project masked depth into the shared room coordinates using the cameras. Merge observations only when visibility, depth and multiple views agree; retain ambiguous assignments as unknown. Keep people, glass reflections, chair and backpack distinct.

Assign each accepted object a stable identifier, category/confidence, supporting source frames, observed geometry, selection bounds and scale/coverage status. Object selection should target the assigned geometry; a rectangular box alone can also enclose neighbouring objects. If using Gaussian appearance, associate visible Gaussian contributions with object identifiers using multi-view evidence. Hidden surfaces and missing object extents cannot be certified by filling holes.

LingBot, DA3 and VGGT provide routes through camera/depth outputs. COLMAP first provides cameras and sparse feature points; dense reconstruction or another validated depth stage is needed for usable object surfaces. Splatfacto supplies Gaussian appearance and needs a separate ownership/geometry layer. 2D Gaussian Splatting supplies surface-oriented reconstruction with mesh export. Future ARCore capture can supply tracked cameras and depth with confidence, but still requires measured checks for drift and scale accuracy.

## Initial resource bounds

At most two concurrent GPU jobs across the reconstruction work, one H100 47 GB slice per job, 32 GB host memory, four processor cores and no more than 45 minutes per job. These are requested caps, not a guarantee of current availability. Use shorter jobs where possible. HNA must check live limits and available resources, store scheduler receipts and avoid duplicate submissions. Avoid holding a GPU while waiting for a visual review.

## Acceptance of HNA loop implementation

An independent testing agent must verify real project-worker flows for accepting a reviewed attempt, revising it, rejecting a stale artifact digest, replaying a repeated request, recovering after restart, exhausting retries, failed job submission, and missing visual review. Existing projects with review disabled must preserve their prior behavior. No shared hub restart or unrelated project mutation is part of this task.

## Official references

Checked 31 October 2026. Builders must pin the exact source/model versions used.

- [LingBot preprocessing](https://github.com/robbyant/lingbot-map/blob/main/lingbot_map/utils/load_fn.py)
- [Depth Anything 3 interface](https://github.com/ByteDance-Seed/Depth-Anything-3/blob/main/docs/API.md)
- [VGGT source and checkpoint terms](https://github.com/facebookresearch/vggt)
- [SAM 2 video workflow](https://github.com/facebookresearch/sam2/blob/main/notebooks/video_predictor_example.ipynb)
- [Gaussian rasterization](https://docs.gsplat.studio/main/apis/rasterization.html)
- [ARCore Raw Depth](https://developers.google.com/ar/develop/java/depth/raw-depth)
- [COLMAP sparse and dense reconstruction](https://colmap.github.io/tutorial.html)
- [COLMAP camera and point formats](https://colmap.github.io/format.html)
- [Nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html)
- [2D Gaussian Splatting training and mesh export](https://github.com/hbb1/2d-gaussian-splatting#testing)
- [VGGT Omega checkpoint access](https://github.com/facebookresearch/vggt-omega#pretrained-models)
- [Grounding DINO category detection](https://github.com/IDEA-Research/GroundingDINO)
- [ScanNet++ data and evaluation](https://scannetpp.mlsg.cit.tum.de/scannetpp/)
- [Slurm batch jobs](https://slurm.schedmd.com/sbatch.html)
- [Slurm job steps](https://slurm.schedmd.com/srun.html)

The HNA interface was checked against the live PE source in `src/factory/server.js`, `hub.js`, `handoffs.js`, `state-manager.js`, `dispatch.js`, and `roadmap.js`. A queued/delivered handoff does not prove its work has started or passed.
