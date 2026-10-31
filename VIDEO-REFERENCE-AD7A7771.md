# Bedroom video reference, 31 October 2026

This is the hackathon input. Preserve the older office video's VIDEO-REFERENCE.md separately.

- Local file: C:/Users/brenn/Downloads/video6280786605452042171.mp4
- PE file: /home/b/brenowy/brennan_work/lingbot-map/incoming/video6280786605452042171.mp4
- SHA256: ad7a7771cf339dd78dc19963ab0fc998322a150170a8d0b971d78242502eef14
- 10,084,176 bytes; 711 decoded frames; 720 x 1280 portrait; 23.836100 seconds.
- Remote upload and hash matched. Original media, frames and all outputs remain outside Git.
- Reviewed all 711 frames visually on 23 contact sheets at 180 x 320 per frame. Also reviewed frames 189, 284, 473 and 663 at original 720 x 1280. This is visual scene reference, not surveyed geometry or a measurement benchmark.
- Private review evidence: work/frame-review-ad7a7771 under the original Codex workspace. Sheets 00 through 22 cover every frame in order; manifest.json preserves presentation timestamps. Full images 01 through 04 correspond to 189,284,473,663.

## Observed scene

| Frames | Evidence visible |
|---|---|
| 0–63 | Brown wardrobe front, paired vertical silver handles, open lower recess, tiled floor and adjacent white wall. |
| 64–127 | Wardrobe edge and narrow open shelving with blue item; brown desk and first open laptop enter view. |
| 128–191 | Desk with two open laptops, mice, bottle and cables. Broad side support panels; red seat in foreground. Frame189 confirms these at full resolution. |
| 192–255 | Desk front and open knee space, tiled floor; bed with patterned covering and red bedding enters; dark chair becomes visible. |
| 256–319 | Dark moulded chair seat/back and separate metal legs; patterned bed behind it with a bag. Red seat with dark belongings partly visible foreground. Frame284 confirms bag is on bed, separate from dark chair. |
| 320–383 | Dark chair moves out of view; bed end, window, floor and white wall corner. A thin pale upright surface at the right is not fully observed. |
| 384–447 | Bed edge, white corner and wall; dark small cabinet enters foreground. The white wall has little texture. |
| 448–511 | Dark rectangular cabinet with top and two side surfaces visible; tiled floor and white wall. Frame473 confirms it is a box-like cabinet, not an unsupported flat panel. |
| 512–575 | Cabinet leaves view; white wall, brown notice-board-like panel above a horizontal silver wall rail. |
| 576–639 | Brown panel and shiny wall rail dominate. Plain wall and tiled floor; limited distinct features. |
| 640–703 | Same wall rail/panel, with door edge entering at right. Frame663 confirms panel is on wall, not the door itself. |
| 704–710 | Door edge and surrounding wall/floor; no return view of wardrobe or desk. |

## Capture limitations relevant to the model

The sequence is mainly a continuous pan with limited visible sideways movement and no return loop. There are many adjacent, nearly identical frames. It supplies much less evidence about depth than a walk around the furniture would. Do not turn a visually smooth pan into a claim of measured camera translation.

The ceiling, furniture backs and undersides, hidden floor and several wall areas are not recorded. The dark chair's thin legs, desk edges, bag straps and shiny rail are useful checks for distortion. Laptop screen content and reflections should not become free-floating geometry. Preserve gaps where support is missing.

There is no scale reference, measured dimension or calibrated camera/tracking record. Model units are unverified. Do not report centimetre accuracy, room dimensions or furniture fit from this input alone.

## Fixed comparison views

Use zero-based original frames 0,95,142,189,284,331,379,473,568,663 with the actual decoded presentation timestamps. Compare source appearance, surface shape and empty spaces separately. Do not reuse the old room's cameras, depth or frame-specific observations.

A respectable hackathon result should visibly retain the wardrobe/desk/bed/chair arrangement, a useful floor surface and coherent large surfaces in the captured portion. A real mesh must contain polygon faces. A point cloud is a useful fallback but must be named as such. Neither format establishes physical accuracy.

## Active deadline and scope

Deadline: 31 October 2026, 15:55 Singapore (07:55 UTC).
User asks for phone video in, respectable 3D model out, preview and download.
Furniture identification, exact measurements and editing are deferred.
Native HNA revision6 preserves T001/T002/T006 and adds T007 viewer. See HNA-HACKATHON-GRAPH-V6.json. No candidate is visually accepted yet as of this reference review.

