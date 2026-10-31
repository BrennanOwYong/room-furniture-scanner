# LingBot Studio

A local website for uploading a phone recording, running LingBot-Map on the existing National University of Singapore (NUS) compute connection, exploring the resulting room, and downloading it.

Double-click **Start-LingBot.cmd**, or open **http://127.0.0.1:8787** while the local server is running. The website accepts MP4, MOV and WebM clips up to 60 seconds and 150 MB. Record a slow walk with overlapping views; changing your position helps the model estimate depth.

The compute service must be connected through the existing HNA Factory preview bridge. A disconnected message means uploads cannot start. The recording selector includes all three saved videos and five reconstruction results, available without that compute connection. Saved results are never substituted for a new upload.

The public [GitHub Pages demo](https://brennanowyong.github.io/room-furniture-scanner-demo/) lets visitors select recordings, compare results, and download models. It does not process new uploads. The private source project remains private; the public demo repository contains only the viewer, saved reconstruction assets, and attribution.

## What the output means

New uploads produce a colored point cloud: a collection of estimated 3D points carrying colors from the recording. The downloadable GLB (binary 3D scene) preserves those points. It is not a closed, editable surface mesh, and it has no calibrated real-world scale. Missing views remain missing. A slower recording helps tracking but does not guarantee a clean reconstruction.

With **Find furniture** enabled, Grounding DINO searches sampled source images for chairs, tables, desks, beds, wardrobes, cabinets and sofas. A marker requires detections in at least two sampled views. Its position combines an image box with LingBot's estimated depth; it is approximate, not an exact outline or a measurement. Select a label to see its source image, detection box and confidence. The confidence belongs to the image detector, not to 3D location accuracy.

## Local development

Install Node.js, then run `npm install`, `npm run prepare-assets` and `npm start`. Third-party browser files are copied locally; the interface does not require a content delivery network. Local server port: 8787. Remote loopback service port: 32880. The application resolves its connection through the existing shared Factory preview bridge rather than opening another tunnel.

The remote service, isolated environment and jobs live in `/home/b/brenowy/brennan_work/lingbot-map/outputs/lingbot-studio-runtime`. All remote setup and execution are performed through the existing T007 HNA-managed terminal. Keep runtime files outside disposable ticket worktrees: a native handoff cleaned the earlier deployment from its worktree. Never replace the previous `viewer` folder or shared model environment. The isolated environment uses a bridge to the existing LingBot packages. The `PAUSED` file holds new work while another reconstruction experiment owns the compute lane. The service processes one upload at a time and checks the shared two-job limit before submitting work.

After a compute allocation restart, inspect existing scheduler job identifiers before relaunching the service. It watches an already-submitted job rather than submitting it twice. A queued upload that had not yet been submitted is marked interrupted; the user can upload again. This prototype is local-only and is not a publicly hosted service.

Videos, predictions, evidence images and models stay in the dedicated remote `jobs` directory; they are not automatically deleted. Local sample/model files and runtime folders are excluded from source control. The user authorized publication of the three saved reconstructions on 31 October 2026. Only those reviewed model assets enter the public demo; original videos, source photos, weights, and compute connections are excluded.

## Saved-results publication

`node scripts/prepare-gallery.mjs <original-project-folder>` builds the local catalog from the verified artifacts. `npm run build:pages` packages the viewer, catalog, vendored browser library, and saved models into `dist-pages`, with `site-config.json` set to `showcase`. Local `public/site-config.json` remains `local`, so uploading still works on this computer. The public artifact repository uses its main branch root as the Pages source.

GitHub rejected Pages on the private source repository with status 422 because the current plan does not support it. The separate public repository is `BrennanOwYong/room-furniture-scanner-demo`. Future builds should update that repository without changing source-repository privacy. The builder preserves its existing Git metadata and README.

Official publishing references checked 31 October 2026:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site
- https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user

Official implementation references, feature review breakpoints and the verified source contract are in [PLAN.md](PLAN.md). Objective verification results are written separately by the independent testing agent; implementation alone is not a passing test.

## Reconstruction and measurement limits checked 31 October 2026

The current runner samples five frames per second, uses 64-slot windowed inference with eight overlapping keyframes, and retains two initial scale frames. It converts each predicted depth image into world points, keeps the upper half by per-frame depth confidence, thins the points for browser display, and clips extreme coordinate percentiles. It concatenates the surviving points and exports them directly. There is no additional multi-view consistency filter, surface fusion, or polygon meshing in this upload path. Noise, duplicated surfaces and missing geometry are therefore visible in the exported result. These settings describe the implementation; they do not establish which error dominates a particular room without an isolated comparison.

Furniture detection examines up to 18 sampled views. For each image box it takes the middle 60 percent, uses the median of valid depth-derived points as a centre, and associates nearby centres by category. A label requires two views. It does not use an object segmentation mask or store object extents, and one physical item can receive multiple labels. Detector confidence is not measurement confidence.

Reliable width, depth and height require both an object-specific 3D boundary and calibrated physical scale. One user-measured reference length can establish a global scale if its endpoints are reconstructed correctly; it cannot correct local distortion or reveal hidden dimensions. A future measurement flow should preserve incomplete dimensions, allow boundary correction, and validate against additional measurements before reporting accuracy. Do not reinterpret detection-box spread as furniture dimensions.

References: https://github.com/Robbyant/lingbot-map ; https://github.com/IDEA-Research/GroundingDINO ; https://developers.google.com/ar/develop/depth . Google's depth-from-motion capture can use compatible phones without a dedicated depth sensor, but must be captured with the tracking/depth service rather than inferred to exist in an ordinary uploaded video.
