# Video evidence inspector

Small static study viewer hosted on GitHub Pages. No framework, analytics, response backend, account system or submission button. The Google Form is the study's primary interface and response store; it remains unpublished for investigator testing.

## Files

- `app.js`: loads the assigned clip/evidence, synchronizes views and navigates frames/windows.
- `inspection.js`: temporary multi-interval annotations, endpoint editing, copy, held stepping and movable controls.
- `style.css`: responsive white/warm RIT-accented presentation.
- `C01.html`–`C06.html`: individual study entries. `P01.html`: separate practice.
- `study.json`: clip metadata. MP4/JSON/image files: genuine footage and computed evidence.

Open `C01.html?phase=before` or `C01.html?phase=after`. Before pages do not fetch AI outputs. The root has no clip directory. The site and its assets are public/unadvertised, not access-controlled. The research overview is a private Google Doc.

## Interaction and meaning

All clips contain 750 frames at 30 fps. Frame labels are inclusive, clip-relative and 1-based. The lower full-width filmstrip is a range input with step 1; thumbnails are sparse previews, while seeking addresses every video frame. Hold ±1 for repeated stepping. Click the original video or Play to toggle playback. Controls stay outside the footage.

Start marking → move to an end frame → Finish interval. Repeat for separate intervals; edit endpoints or remove individual intervals. Red bands indicate human markings. The top red answer copies only ranges (`128–175; 240–290`) or NONE/UNSURE/SKIP. No VERA agreement is copied or explicitly asked. Draft marks stay in memory and disappear on reload/closing; copy before returning to the Form.

The upper filmstrip selects actual VERA windows. Red borders indicate VERA label 1, not per-frame ground truth. Windows overlap. Follow frame selects the nearest window center; manual window selection pins that output until Follow frame is restored or the frame filmstrip is used. Exact raw VLM text is paginated without rewriting. The expandable input strip shows the exact eight source images used by VERA, resized only for preview.

Maps are genuine Grad-CAM++ outputs of a separate X3D-S fight/non-fight classifier, sampled 32 times per 10-second window; nearest-sample display does not make them independent per-frame VERA explanations. Amber shows relative importance, not confidence. Boxes are actual Grounding DINO object proposals, not verified anomaly locations. Existing errors are retained. These VERA outputs are the VLM stage, not the full final ImageBind-based scoring pipeline.

## Practice provenance

P01 uses original UCF-Crime `Fighting018_x264.mp4`, source seconds 2–27 (zero-based source frames 60–809). It is separate from all six test clips. Its 28 outputs were generated with the same VERA prompt/checkpoint and eight-frame/10-second window procedure as the study. Source manifests, original model records and run scripts are retained outside this public folder.

## Analysis

The research team can derive human–VERA correspondence after export by comparing before/after human frame annotations with each VERA window. This is annotation–prediction correspondence, not an explicit agreement rating or proof of AI influence. The site sends no hidden responses or telemetry. Blank, UNSURE and SKIP must remain missing/uncertain, never negative. Overlapping windows and multiple frames within a person are not independent participants. This small fixed-order exploratory study confounds clip and display condition; use descriptive paired changes, preference counts and uncertainty, not causal modality superiority claims.

## Local preview

Run `python3 -m http.server 8765 --directory site` from the parent workspace, then open the relevant local clip URL. Check original/text, map, boxes, all-view and practice pages, both phases, all boundary frames, marking/editing/copy, slider steps and held stepping. Do not submit test responses or publish the Form without the investigator's instruction.
