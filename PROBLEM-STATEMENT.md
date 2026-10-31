# Phone video to an editable room

Draft for Brennan and Anit, 31 October 2026.

## Problem statement

Interior designers helping clients replace furniture need a usable record of the room: its layout, individual furniture items, available space, and trustworthy measurements. A phone video is easy to provide, but it does not automatically become a complete, editable, correctly scaled room model. Missing views, camera motion, blank or reflective surfaces, and hidden furniture boundaries leave uncertainty that a convincing rendering can conceal.

How might we help a person with no scanning experience turn a short phone capture into an inspectable room where a designer can select furniture, review the evidence for its dimensions, and compare replacements available locally?

The first product should guide capture and expose uncertainty. It should request a useful extra view when evidence is missing, and use confirmed measurements when automatic estimates cannot support a purchasing decision. The baseline must work without a dedicated LiDAR scanner on supported Android phones. Dedicated depth hardware is an optional improvement; broad camera-only device support remains a separate capability to validate.

## Two engineering problems

### 1. World generation

Reconstruct a stable room from overlapping camera observations. Google's ARCore depth-from-motion is the first Android capture alternative to benchmark against the existing video-only LingBot-Map experiment. Moving the camera changes the apparent positions of nearby and distant surfaces by different amounts, called parallax (the change in apparent position between viewpoints). ARCore combines camera tracking with phone motion sensors and can estimate depth without a dedicated depth sensor on supported devices. Translating around the room provides useful viewpoints; rotating in place does not reveal hidden surfaces.

Depth images alone do not constitute a complete room. Combine them using each frame's camera position, orientation, lens calibration, time, and confidence; reject unreliable observations and check alignment when revisiting a location. Preserve unknown areas. Gaussian splatting can then supply a navigable appearance layer, while separate surface geometry supports dimensions and collision checks.

Google's Raw Depth application programming interface (API) supplies depth and confidence, with incomplete pixel coverage. Google identifies reconstruction and measurement as uses for it. The full depth output fills more pixels through smoothing and interpolation, which is useful for display but should not be treated as equally reliable measured geometry. Neither output guarantees furniture purchasing accuracy.

An ordinary uploaded video does not provide the synchronized tracking and depth data needed for this approach. The capture app must deliberately save camera frames, camera transforms, calibration, numeric depth, confidence, and timestamps. Verify export and replay rather than assuming a session recording preserves every required field.

An infrared remote-control transmitter sends signals; it is not a depth camera. Proximity sensors detect nearby obstructions and cannot supply a room-shaped depth image. Software cannot add the missing ranging hardware. Check the exact device's ARCore depth support and any exposed depth sensor before choosing the capture path.

### 2. Entity bounding

Identify individual objects and maintain their identities across views. Image segmentation (assigning image pixels to an object) supplies a tighter boundary than a rectangular detection box. Track the table across frames, associate its visible pixels with reconstructed surfaces, and save one persistent table identifier.

Each entity needs its category, observed geometry, selection boundary, position, orientation, estimated dimensions, uncertainty, and links to its source views. A three-dimensional bounding box is useful for a rough fit estimate; it does not describe the exact outline or separate table legs from nearby chairs. Keep selection geometry and purchasing measurements explicit. Missing backs and undersides may be generated for preview, with inferred surfaces labelled separately.

These workstreams share a common room coordinate system and source observations. Either can fail independently: a stable room can have incorrect object labels, and a correctly identified table can have inaccurate reconstructed dimensions. Evaluate them separately before combining them.

## First Android comparison

Capture the same room on a supported Android phone without dedicated depth hardware, with real reference measurements and repeated scans:

| Route | Input | Question |
|---|---|---|
| Existing baseline | Ordinary video and LingBot-Map | What can an upload alone recover? |
| Tracked capture | Camera images, calibration, and phone camera tracking | Does measured camera motion improve alignment? |
| Depth capture | Tracked capture plus raw depth and confidence | Does confidence-filtered depth improve surfaces and dimensions? |

Compare geometry before adding Gaussian rendering. Measure visible-surface coverage, alignment drift, repeated-scan consistency, dimension errors, capture failures, processing time, and phone heating. Test a blank wall, reflective surface, thin table legs, and incomplete coverage. Then use the best geometry route for one selectable table. Capture guidance and selection retain the [USER-TEST] breakpoints below. This comparison is proposed; no Android capture experiment has yet been run.

## First user and decision

A homeowner records one room. An interior designer reviews it remotely, selects a table the client wants to replace, confirms the usable space, and compares a small set of replacement tables. Singapore is the initial catalogue market. Wider retail coverage and whole-house capture follow only after this workflow works.

The replacement constraint is the available space, including room to walk and move chairs. Matching the old table's dimensions alone does not establish that a replacement is suitable.

## What the user should experience

1. **Guided capture [USER-TEST].** Open the phone camera and follow simple movement guidance. The app detects unsuitable motion or missing coverage and asks for a specific extra view. A conventional video upload remains a fallback, with weaker measurement claims.
2. **Review the room [USER-TEST].** Receive a navigable scene, see areas that remain uncertain, and understand whether another scan or a real measurement is needed.
3. **Select the table [USER-TEST].** Tap the table, see its outline, correct the selection if necessary, and hide or restore it. The same table must remain one object across views.
4. **Confirm dimensions [USER-TEST].** Review width, depth, height, scale source, and uncertainty. Enter or confirm a real measurement before relying on fit where needed.
5. **Compare replacements [USER-TEST].** Filter a small catalogue by confirmed size constraints, budget, and local delivery. Explain why each item fits, might fit, or requires another measurement.
6. **Preview a replacement [USER-TEST].** Place a dimensioned product asset in the room. Label generated background or hidden surfaces so a plausible image is not mistaken for verified evidence.

Every user-test breakpoint pauses for human review of intuitiveness, perceived speed, and visual coherence. Objective correctness, identity consistency, data integrity, and error handling belong to the testing agent. Before each breakpoint, provide setup, a walkthrough, subjective questions, and the checks already completed by the agent.

## Required system capabilities

| Capability | Why it matters | Initial approach |
|---|---|---|
| Capture guidance and quality checks | Prevent unusable scans before processing | Stable orientation, overlapping views, blur and coverage checks, targeted recapture |
| Camera and room geometry | Put observations into one consistent scene | Benchmark LingBot-Map against another reconstruction or phone-scanning baseline; refine camera estimates where needed |
| Appearance | Make the scene understandable | Evaluate Gaussian splatting separately from geometric accuracy |
| Individual object recognition | Make a table selectable and replaceable | Separate each object in images, track it across views, and connect it to scene geometry |
| Scale and measurement | Support furniture purchasing decisions | Phone sensor evidence where supported; confirmed measurements as a fallback |
| Object representation | Keep appearance, selection, and dimensions consistent | A persistent object identifier, category, position, orientation, observed geometry, display asset, dimensions, and confidence |
| Completion | Make incomplete views visually usable | Generate plausible missing object or background surfaces, retaining observed-versus-generated provenance |
| Product data | Recommend actual furniture | Start with a small curated catalogue with verified dimensions, prices, links, delivery region, and update dates |
| Mobile delivery | Make scanning practical | Shared React Native application, platform-specific capture adapters, resumable upload, processing status, and a lightweight viewer |
| Private scan handling | Keep home footage under user control | Explicit upload and collaborator sharing, access boundaries, retention choices, and deletion |

React Native can share the application interface across iPhone and Android. It does not make their sensors or scanning facilities identical. Apple RoomPlan uses a camera and Light Detection and Ranging (LiDAR) scanner and provides room components and furniture information on supported devices. Google's ARCore depth support varies by device. These are capture options to benchmark, not a reason to abandon cross-platform support.

## A room needs several representations

A coloured point cloud stores sampled locations and colours. A Gaussian scene represents appearance using spatial blobs with size, orientation, colour, and opacity. A mesh is a surface made of connected triangles. A selectable furniture entity is application data that associates an object with its visual representation, geometry, identity, and measurement evidence.

One representation need not do every job. Gaussians can provide appearance while a simpler geometric proxy supports selection and overlap checks. Selection does not require every hidden surface to be reconstructed.

For a stationary room, three-dimensional (3D) Gaussian splatting is sufficient. Four-dimensional (4D) splatting adds changes over time; moving the camera does not itself require a time-varying room model.

## What completion can and cannot do

An object-generation model can propose a plausible back or underside for a partly visible table. This is a visual hypothesis, not a measurement of the actual unseen surface. Preserve the observed geometry and record which surfaces were inferred.

Removing a table also reveals floor or wall that the recording may never have seen. Completing that background is a separate task. A complete table asset does not solve the missing room background.

If a dimension affects whether a purchase fits, obtain adequate sensor evidence or ask for a real measurement. Never derive a confident fit claim solely from generated geometry.

## What has been demonstrated

- LingBot-Map processed a 21-second portrait recording into depth and camera estimates across 104 sampled frames. Model inference took 12.7 seconds on a university H100 allocation. This excludes upload, queueing, and viewing time.
- The resulting point cloud was visually poor. Finite-output checks passed, but they did not establish accurate shape or measurement.
- A separate experiment fitted 120,000 actual Gaussians. Rendering, optimisation, parameter conventions, and export checks passed. Visible blur and distortion remain.
- The scan used square cropping, sparse temporal sampling, fixed estimated cameras in the Gaussian experiment, and a fixed Gaussian count. Their individual effects on quality have not been isolated.
- Automatic furniture recognition, selectable reconstructed furniture, shape completion, and reliable metric dimensions have not been demonstrated.
- Meta's Segment Anything Model 3 (SAM 3) and SAM 3D Objects are candidates for recognition and generation. Download checks on the university machine returned access denied; that does not establish the account's eligibility. They have not been installed or evaluated here.

The current repository is a research prototype and experiment handoff, not a finished mobile application.

## Smallest useful demonstration

One room, one table, one confirmed measurement, and a small curated replacement catalogue. Demonstrate capture, inspection, table selection, correction, hiding/restoring, and comparison against dimensioned alternatives. Allow manual confirmation where automatic recognition or measurement is uncertain.

Exclude whole-house reconstruction, guaranteed centimetre accuracy, automatic completion of every object, unrestricted retailer search, and dynamic scene modelling from the first demonstration.

## Experiments and decision gates

1. **Establish a capture baseline.** Record the same furnished room using a deliberate capture path and an ordinary casual video. Keep real reference measurements and a set of withheld viewpoints. Compare camera stability, visible geometry, processing time, and failures.
2. **Separate capture from processing effects.** Compare full-frame preprocessing and the existing crop; compare reference-frame settings; then compare the chosen reconstruction against another baseline. Keep other variables fixed. Reject a method that cannot represent a table and room layout consistently.
3. **Prove selection before completion.** Give one table a persistent identity. Verify selection, correction, highlight, hide, and restore across camera views. Human review judges whether the selected boundary feels right.
4. **Evaluate measurements.** Compare each dimension against tape-measured references. Report absolute errors, failure cases, and uncertainty. Set acceptable error according to the purchasing decision; do not choose a universal fit guarantee from one successful scan.
5. **Evaluate completion separately.** Hide known views of an object and compare generated surfaces with those views. Assess visual plausibility independently of geometric accuracy. Preserve provenance in the saved entity.
6. **Test the shopping decision.** Verify catalogue dimensions and fit filtering objectively; ask designers whether the shortlist and explanations help them make a decision.

Useful measures include first-attempt usable capture rate, recapture rate, processing failure rate, end-to-end waiting time, incorrect object selection rate, dimension error per axis, incorrect fit recommendations, and compute cost per accepted scan. Numerical targets should follow a small, repeatable benchmark; one video is insufficient to set production claims.

## Proposed collaboration

Brennan leads the room-to-furniture workflow and tests it with designers. Proposed first technical review for Anit: assess capture and reconstruction alternatives, define a small benchmark, and review the persistent object representation. Agree ownership before implementation; this is a suggested split, not a commitment on Anit's behalf.

The next milestone is an evidence-based choice of capture and geometry pipeline, followed by one selectable table. A more attractive rendering alone is not the acceptance criterion.

## Official references

Reviewed 31 October 2026. Experiments used upstream LingBot-Map commit `b9dd1b1de535e6d36e777fb42b8433c781bfd783`.

- [LingBot-Map source and setup](https://github.com/robbyant/lingbot-map)
- [Camera, depth, and point prediction heads](https://github.com/robbyant/lingbot-map/blob/b9dd1b1de535e6d36e777fb42b8433c781bfd783/lingbot_map/models/gct_base.py)
- [Depth to world geometry](https://github.com/robbyant/lingbot-map/blob/b9dd1b1de535e6d36e777fb42b8433c781bfd783/lingbot_map/utils/geometry.py)
- [Gaussian rendering](https://docs.gsplat.studio/main/apis/rasterization.html)
- [React Native platform integration](https://reactnative.dev/docs/native-platform)
- [Apple RoomPlan](https://developer.apple.com/augmented-reality/roomplan/)
- [Google ARCore depth](https://developers.google.com/ar/develop/depth)
- [Google Raw Depth and confidence](https://developers.google.com/ar/develop/java/depth/raw-depth)
- [ARCore device and depth support](https://developers.google.com/ar/devices)
- [ARCore recording and playback](https://developers.google.com/ar/develop/recording-and-playback)
- [Android infrared transmitter](https://developer.android.com/reference/android/hardware/ConsumerIrManager)
- [Android position and proximity sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position)
- [SAM 3](https://github.com/facebookresearch/sam3)
- [SAM 3D Objects](https://github.com/facebookresearch/sam-3d-objects)
- [SAM 3D Objects setup and checkpoint access](https://github.com/facebookresearch/sam-3d-objects/blob/main/doc/setup.md)
