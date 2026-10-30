# Video evidence inspector

Small static study viewer hosted on GitHub Pages. No framework, analytics, response backend, account system or submission button. The Google Form is the study's primary interface and response store; it remains unpublished for investigator testing.

## Files

- `app.js`: loads the assigned clip/evidence, synchronizes views and navigates frames/windows.
- `inspection.js`: temporary multi-interval annotations, endpoint editing, copy, held stepping and movable controls.
- `timeline.js`: shared frame coordinates and window-step navigation.
- `tour.js`: action-led spotlight walkthrough, runs on separate practice only.
- `style.css`: responsive white/warm RIT-accented presentation.
- `C01.html`–`C06.html`: individual study entries. `P01.html`: separate practice.
- `study.json`: clip metadata. MP4/JSON/image files: genuine footage and computed evidence.

Open `C01.html?phase=before` or `C01.html?phase=after`. Before pages do not fetch AI outputs. The root has no clip directory. The site and its assets are public/unadvertised, not access-controlled. The research overview is a private Google Doc.

## Interaction and meaning

All clips contain 750 frames at 30 fps. Frame labels are inclusive, clip-relative and 1-based. The lower full-width filmstrip is a range input with step 1; thumbnails are sparse previews, while seeking addresses every video frame. Hold ±1 for repeated stepping. Click the original video or Play to toggle playback. Controls stay outside the footage.

Start on the left margin → move to an end frame → Finish on the right margin. Finish is disabled until Start is pressed. Repeat for separate intervals; edit endpoints or remove individual intervals. The margins do not toggle video playback. Red bands indicate human markings. The top red answer copies only ranges (`128–175; 240–290`) or NONE/UNSURE/SKIP. No subjective AI agreement is copied or asked. Draft marks stay in memory and disappear on reload/closing; copy before returning to the Form.

Both full-width tracks use the same 1–750 frame coordinates and always follow playback. The upper track drags continuously; arrow keys jump to actual 10-second window centers; its thumb still follows the current frame during playback and frame stepping. Home/End reach clip boundaries. Red dots mark positive window centers; the outline spans the selected window, not an exact anomaly interval. The bell symbol identifies the AI-window track. Clicking a sampled evidence frame retains its alert until playback or ordinary navigation resumes. The green outline marks the selected window independently of its label. Exact raw model text is retained in a fixed scroll box. Sampled evidence and the frame-score caveat are expandable. Clicking an input thumbnail retains the window whose evidence is being inspected until ordinary navigation resumes.

`P01.html?phase=after` starts a practice-only, eight-step spotlight guide. It advances through play, frame scrubbing, understanding the alert, window navigation, Start, Finish, and copying. It can be skipped, replayed or dismissed with Escape. Reduced-motion preferences disable transitions. Practice interactions are temporary and never sent or scored.

Maps are genuine Grad-CAM++ outputs of a separate X3D-S fight/non-fight classifier, sampled 32 times per 10-second window; nearest-sample display does not make them independent per-frame VERA explanations. Amber shows relative importance, not confidence. Boxes are actual Grounding DINO object proposals, not verified anomaly locations. Existing errors are retained. These VERA outputs are the VLM stage, not the full final ImageBind-based scoring pipeline.

## Practice provenance

P01 uses original UCF-Crime `Fighting018_x264.mp4`, source seconds 2–27 (zero-based source frames 60–809). It is separate from all six test clips. Its 28 outputs were generated with the same VERA prompt/checkpoint and eight-frame/10-second window procedure as the study. Source manifests, original model records and run scripts are retained outside this public folder.

## Analysis

The research team can derive human–VERA correspondence after export by comparing before/after human frame annotations with each VERA window. This is annotation–prediction correspondence, not an explicit agreement rating or proof of AI influence. The site sends no hidden responses or telemetry. Blank, UNSURE and SKIP must remain missing/uncertain, never negative. Overlapping windows and multiple frames within a person are not independent participants. This small fixed-order exploratory study confounds clip and display condition; use descriptive paired changes, preference counts and uncertainty, not causal modality superiority claims.

## Local preview

Run `python3 -m http.server 8765 --directory site` from the parent workspace, then open the relevant local clip URL. Check original/text, map, boxes, all-view and practice pages, both phases, all boundary frames, marking/editing/copy, slider steps and held stepping. Do not submit test responses or publish the Form without the investigator's instruction.

## Design rationale

The interface applies progressive disclosure and temporal context recommendations from Rastogi et al., _Too Much to Trust?_ (arXiv:2503.02065v2, sections 7–8). This is design rationale, not evidence that this interface improves trust or decision accuracy. Existing effort/usefulness questions remain distinct from correctness; the effort item is not NASA-TLX.

The RIT footer is the unchanged official RGB asset from the RIT Brand Portal's `rit-only-orange-04302019.zip`. AI4Sec branding is retained. The bell is a simple local SVG identifying AI information.

Display update: light background by default; the top theme icon toggles dark mode and stores only that preference locally. All footage panes toggle synchronized playback on click or keyboard. Alert heading appears only for label 1; full model text is unchanged. Guide links open separate practice tabs. Form-return control appears only for fresh tabs referred from Google Docs; direct visits instruct switching to the existing form tab. Authored UI and copied ranges use ASCII hyphens.

Overlapping human intervals are automatically merged on completion or endpoint edits; genuine gaps remain separate. The top label is Your marked frames. Light surfaces are pure white and dark surfaces pure black, with neutral text and borders. The unpublished Form requires non-comment answers; rating 0 means Skip and must be treated as missing, never as a score. Frame answers use inclusive 1-750 indices and NONE / UNSURE / SKIP.

## Focus view

The Focus view button enlarges the existing footage (including side-by-side evidence) within the browser. Marking, copied answers and timelines remain available; AI text returns when leaving focus. Exit with Escape or Exit focus. No media is reloaded and annotations remain intact. The small `focus.js` module owns this display-only behavior.
