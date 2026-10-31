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
| Alternative reconstruction | Evaluate Depth Anything 3; use VGGT as an accessible fallback if needed | Shared frame selection and comparison convention |
| Entity tracking | Prompt and track table/chair masks using accessible SAM 2.1 weights; separate backpack/person/background | Original images; best geometry only needed for later 3D association |
| Evidence/testing | Validate outputs and assemble comparable review bundles | Candidate artifacts |
| HNA review support | Add durable, project-scoped review and retry handling to the active parallel execution path | Existing HNA source and isolated live test project |

ARCore Raw Depth needs appropriate phone capture data. It cannot be honestly benchmarked by labelling inferred depth from this ordinary video as ARCore output. World Labs Atlas is currently described through early access; availability to this account has not been established. Do not upload private footage to an external service without a separate, understood service choice.

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
- [World Labs Atlas availability](https://www.worldlabs.ai/blog/atlas)
- [Slurm batch jobs](https://slurm.schedmd.com/sbatch.html)
- [Slurm job steps](https://slurm.schedmd.com/srun.html)

The HNA interface was checked against the live PE source in `src/factory/server.js`, `hub.js`, `handoffs.js`, `state-manager.js`, `dispatch.js`, and `roadmap.js`. A queued/delivered handoff does not prove its work has started or passed.
