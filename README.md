# Video evidence inspectors

A small, buildless companion to a Google Forms study. The Form owns consent,
questions and submission. Each inspector shows one clip and helps the viewer
prepare an optional copyable inspection summary. There is no submit button,
response backend, analytics or persistent answer storage here.

## Open and run

Serve this folder with `python3 -m http.server 8765` and open
`http://localhost:8765/C01.html?phase=before`.
Use `phase=after` for the assigned AI evidence. `C01.html` through `C06.html`
share the same code. Legacy `?clip=C01&phase=before` links still work.
The root page offers no clip directory. The investigator maintains a separate,
private Google Doc overview. GitHub Pages and this repository are public:
removing the directory and requesting no indexing is not authentication.

No installation, bundler or third-party runtime is needed. Publish the folder
contents at the root of the Pages repository. Keep the Google Form unpublished
until the investigator explicitly approves collecting responses.

## Files

- `app.js`: loads the assigned evidence, renders the views, synchronizes playback,
  shows exact VERA text, and exports a local inspection audit.
- `inspection.js`: hold-to-step controls, draggable control dock, click-only
  frame preview, interval selection and copyable summary.
- `style.css`: shared white, compact interface and responsive layout.
- `C01.html`–`C06.html`: individual clip entry points; `index.html`: legacy route.
- `study.json`: clip metadata and assigned display configuration.
- MP4 and JSON/PNG assets: genuine, previously computed study evidence.

## Interaction

Click the original video or Play to play/pause. Hold either frame-step button
for repeated single-frame steps; release stops it. The slider and arrow keys
advance one frame. Frame numbers are clip-relative, one-based, 1–750, at 30 fps.
The translucent control dock can move sideways using its handle (or arrow keys
when the handle is focused), within its own area below the video.

Click the timeline to reveal the current-frame preview; hovering does not open
it. Set start and end for an inclusive anomalous interval, or choose no anomaly
or cannot determine. In AI review, agreement is attached to the VERA window
shown when chosen; moving the playhead does not rewrite that saved choice.
Copy the summary back into the matching Google Form field. Nothing is sent by
this site. Leaving or reloading the page clears the temporary selection.

## Evidence interpretation

Before-AI pages do not fetch VERA, maps or boxes. After-AI pages use the assigned
displays. VERA text is exact VLM output from overlapping 10-second windows with
eight input frames, not a fresh per-frame prediction or the full VERA scoring
pipeline. Follow frame selects the nearest window center. The selected window
is marked blue for output 0 or red for output 1. Its boundaries are the model's
input window, not ground-truth event boundaries. Model text and errors are not
rewritten.

Estimated importance maps are genuine Grad-CAM++ outputs from a separate X3D-S
fight/non-fight classifier. The nearest of 32 computed samples per window is
held while the underlying video advances. The caption identifies that sample;
map intensity is relative importance, not confidence or VERA attribution.
Grounding DINO boxes are proposed object detections, not verified anomaly
locations. Original, map and box panes share the same decoded video frame.

## Branding

`ai4sec.png` is the AI4SEC logo extracted from the lab's FACE conference slides:
https://neurips.cc/media/neurips-2025/Slides/115653.pdf (first-page image).
It is an existing lab asset, not a generated replacement.

## Study limits

Six clips and a small exploratory participant sample cannot isolate display
format effects from clip difficulty without counterbalancing. Keep analysis
exploratory. Completion time must be checked with a human pilot; this inspector
does not silently log dwell times or collect participant identifiers.
