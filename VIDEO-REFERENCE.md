# Fixed video reference and first visual review

Reviewed by Codex on 31 October 2026. Source: `video6278534805638358952.mp4`, SHA-256 `a6b51a160106a1845fce1262e14aacc2ea89858917ea76ddb5217d5cdaa066c7`.

## Review coverage

All 620 decoded frames were inspected in 20 timestamped contact sheets, at 180 by 320 pixels per frame. Frames 230, 350, 400, 530 and 590 were also inspected at their original 720 by 1280 resolution. Frame indices below start at zero. Actual presentation timestamps were extracted; do not derive all timestamps by dividing frame index by the average frame rate. The last frame begins at 20.969 seconds. This is a visual reference, not surveyed three-dimensional ground truth or a set of verified pixel masks.

## Observed contents

- A desk/table with a reddish-brown wooden border, lighter inset work surface, substantial wooden supports/panel, and a rectangular opening below the top. The straight visible edges and opening are useful reconstruction landmarks.
- Multiple partial views of dark wheeled office chairs. Mesh backs, padded seats, armrests, and thin wheel spokes need separate treatment from the desk and floor. Exact identity across every occlusion is not yet annotated.
- A dark backpack resting on a chair near the end. Frame 590 confirms the bag is a distinct object, not part of the chair's back.
- Two open laptops are visible near the start, along with a mouse, cables, a small adapter/hub-like device, and a clear bottle with a light cap. Later, a peach/orange-cased phone is on the desk. Small-device categories are visual interpretations; no screen contents were transcribed.
- Striped carpet, pale wall surfaces, a whiteboard with a metal frame, wall fittings, and wooden-framed glass/panels. Frame 400 shows reflections in glass; those reflected contents must not automatically become physical objects behind the surface.
- Parts of a person, including legs near the beginning and a head/upper body in the middle. Exclude people from the static furniture model unless explicitly modelling them separately.

## Frame review ledger

Each row records the visual content and risks found while inspecting all frames in that inclusive range. Objects can enter or leave within a row; this ledger is not a claim that every listed object is visible in every frame.

| Frames | Time range, seconds | Observations and reconstruction checks |
|---|---|---|
| 0–31 | 0.000–1.098 | Desk edge and inset surface; person/legs; laptop, then a second laptop and mouse. Strong moving highlight on wood. Keep the desk edge straight while excluding the person. |
| 32–63 | 1.131–2.164 | Close laptop/mouse and desk corner. Useful textured surface, limited room context. Do not turn the bright highlight into raised geometry. |
| 64–95 | 2.198–3.298 | Camera moves along desk; bottle and cables enter; chair edge visible. Preserve the depth order between chair, desktop and objects. |
| 96–127 | 3.331–4.365 | Chair mesh back and seat in foreground, bottle leaving view, cables on desk. Desk and chair require distinct masks. |
| 128–159 | 4.398–5.565 | Camera rolls and points down alongside the desk. Carpet and dark wooden underside/support dominate. Compare the full frame with the previous square crop. |
| 160–191 | 5.598–6.655 | Close wooden panel/support and carpet. Low context and repeated carpet pattern can make alignment ambiguous. |
| 192–223 | 6.688–7.733 | Wooden support/panel and opening become more visible; camera remains heavily rolled. Preserve continuous supports and open space. |
| 224–255 | 7.767–8.800 | Rectangular support opening, floor behind it, and partial foot. Frame 230 confirms foreground wood versus visible background. Do not fill the opening. |
| 256–287 | 8.834–9.867 | Camera passes support toward chair base, person/foot and floor. Thin wheel spokes should not merge with carpet. |
| 288–319 | 9.900–10.935 | Chair seat/arm edge, pale wall and wooden trim. The floor-to-wall transition and occlusion order are useful checks. |
| 320–351 | 10.968–11.999 | Close pale wall and whiteboard edge. Large low-texture regions; camera motion alone must not be mistaken for reliable depth. |
| 352–383 | 12.032–13.066 | Whiteboard, wall fittings, part of a person, and wooden-framed panel entering. Keep people out of the static room. |
| 384–415 | 13.099–14.133 | Wooden-framed glass/panel, notices, hardware and reflections. Reflected room details are not direct surface measurements. |
| 416–447 | 14.166–15.199 | Camera tilts down past framed panel to carpet and a chair caster. Check continuity when returning to the floor. |
| 448–479 | 15.233–16.266 | Carpet, chair base, then desk edge and phone. Later views can expose drift against earlier desk/floor observations. |
| 480–511 | 16.299–17.333 | Phone, reflective desk edge, work surface, then descending view of wooden panel. Phone belongs to a distinct entity. |
| 512–543 | 17.366–18.400 | Desk panel and rectangular opening with chair casters visible behind. Frame 530 is a strong test for correct empty space and occlusion. |
| 544–575 | 18.433–19.502 | Opening moves out of view; chair and bag appear. Keep wood, chair, bag and carpet separate. |
| 576–607 | 19.535–20.568 | Clearer chair with backpack, arms, seat, spokes and casters. Frame 590 supports a chair-versus-bag selection test. |
| 608–619 | 20.602–20.969 | Chair exits to the left; floor, pale wall and wooden framing remain. No complete room perimeter is visible. |

## What this clip can establish

It can expose poor desk geometry, incorrect holes, merged objects, drifting camera alignment, false reflected geometry, and inconsistent masks. It cannot establish the complete room layout, true dimensions in centimetres, unseen furniture surfaces, or accuracy on other homes. Retain it as the fixed development reference; report reuse during tuning explicitly.

## Baseline verdict: revise

The existing `gaussian-comparison.png` contains three source/render pairs. Fitting improved rough colour and object placement relative to the initial rendering, but dense stippling and missing/coalesced surfaces remain. The desk/laptop view loses crisp edges and small-object shape. The wall/floor view obscures the actual boundary. The desk-support opening loses its clear rectangular outline and visible chair wheels. These outputs do not yet support useful table selection or reliable dimensions.

This verdict applies only to the displayed baseline evidence. A plausible cause is the combined effect of initialization, camera/depth errors, limited render resolution and a fixed Gaussian population. The comparison does not isolate those causes. Next experiments must test them independently and render the same source views, plus diagnostic off-camera views, before claiming an improvement.

## Evidence handling

The original video, extracted frames, contact sheets, masks and reconstructions remain private local/PE artifacts outside the source repository. The frame ledger and experiment specifications may be committed. Persist manifests with source indices, real timestamps and hashes so HNA attempts can refer to the same observations.
