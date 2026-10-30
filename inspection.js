// Interaction-only helpers. Answers stay in memory until copied into Google Forms.
const $ = (selector) => document.querySelector(selector);
let context;
let start = null;
let end = null;
let agreement = null;
let preview = false;
let lastWindow = -1;

export function windowFrames(window, fps = 30) {
  return [Math.round(window.start * fps) + 1, Math.round(window.end * fps)];
}

export function selectionText(mode, startFrame, endFrame) {
  if (mode === "none") return "No anomaly observed";
  if (mode === "uncertain") return "Cannot determine";
  if (startFrame === null || endFrame === null)
    return "Mark both interval endpoints";
  if (startFrame > endFrame) return "Start must be at or before end";
  return `Anomaly interval: frames ${startFrame}–${endFrame} (inclusive)`;
}

function summary() {
  const mode = $("#judgment").value;
  const valid =
    mode !== "interval" || (start !== null && end !== null && start <= end);
  const parts = [
    context.clip.id,
    context.after ? "After AI" : "Before AI",
    selectionText(mode, start, end),
  ];
  if (agreement) {
    const [first, last] = windowFrames(agreement.window, context.clip.fps);
    parts.push(
      `${agreement.answer} with VERA (${agreement.window.label}), window frames ${first}–${last}`,
    );
  }
  $("#answer").value = parts.join("; ");
  $("#copy").disabled = !valid;
  $("#selectionStatus").textContent =
    mode === "interval"
      ? `Start: ${start ?? "—"} · End: ${end ?? "—"}`
      : selectionText(mode, start, end);
  $("#start").disabled = $("#end").disabled = mode !== "interval";
  $("#agreementNote").textContent = agreement
    ? `Saved for window ${windowFrames(agreement.window).join("–")}. Choose again to replace.`
    : context.after
      ? "Choose for the currently displayed VERA window."
      : "Your initial judgment: no AI is shown.";
}

// One step on press; held presses repeat after a short delay. Stop on all exits.
export function holdStep(button, step) {
  let timer;
  let held = false;
  function stop() {
    held = false;
    clearTimeout(timer);
  }
  function repeat() {
    if (!held) return;
    step();
    timer = setTimeout(repeat, 100);
  }
  button.onclick = (event) => {
    if (event.detail === 0) step();
  };
  button.onpointerdown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.focus();
    stop();
    held = true;
    button.setPointerCapture(event.pointerId);
    step();
    timer = setTimeout(repeat, 350);
  };
  button.onpointerup =
    button.onpointercancel =
    button.onlostpointercapture =
      stop;
  button.onkeydown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!held) {
        held = true;
        step();
        timer = setTimeout(repeat, 350);
      }
    }
  };
  button.onkeyup = (event) => {
    if (event.key === " " || event.key === "Enter") stop();
  };
  button.onblur = stop;
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", stop);
}

function movableDock(dock, handle) {
  let drag;
  let offset = 0;
  function move(x) {
    const available = Math.max(
      0,
      dock.parentElement.clientWidth - dock.offsetWidth,
    );
    offset = Math.max(0, Math.min(available, x));
    dock.style.transform = `translateX(${offset}px)`;
  }
  handle.onpointerdown = (event) => {
    drag = { x: event.clientX, offset };
    handle.setPointerCapture(event.pointerId);
  };
  handle.onpointermove = (event) => {
    if (drag) move(drag.offset + event.clientX - drag.x);
  };
  handle.onpointerup = handle.onpointercancel = () => {
    drag = null;
  };
  handle.onkeydown = (event) => {
    if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) {
      event.preventDefault();
      move(
        event.key === "Home"
          ? 0
          : offset + (event.key === "ArrowLeft" ? -20 : 20),
      );
    }
  };
  window.addEventListener("resize", () => move(offset));
}

export function setupInspection(options) {
  context = options;
  const { video, after, seek, frame, clip } = options;
  const togglePlay = () =>
    video.paused ? video.play().catch(() => {}) : video.pause();
  video.onclick = togglePlay;
  video.onkeydown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePlay();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      video.pause();
      seek(frame() + (event.key === "ArrowLeft" ? -1 : 1));
    }
  };
  let target = frame();
  function step(delta) {
    video.pause();
    if (!video.seeking) target = frame();
    target = Math.max(1, Math.min(clip.frame_count, target + delta));
    seek(target);
  }
  holdStep($("#previous"), () => step(-1));
  holdStep($("#next"), () => step(1));
  $("#previous").title = "Previous frame · hold to step continuously";
  $("#next").title = "Next frame · hold to step continuously";
  const controls = $(".controls");
  controls.insertAdjacentHTML(
    "afterbegin",
    '<button id="dragHandle" aria-label="Move playback controls" title="Drag sideways to move controls; arrow keys also work">⠿</button>',
  );
  const dockArea = document.createElement("div");
  dockArea.className = "dockArea";
  $(".timelineTop").after(dockArea);
  dockArea.append(controls);
  movableDock(controls, $("#dragHandle"));
  $("#frame").insertAdjacentHTML(
    "afterend",
    '<span class="muted">Click the original video to play/pause · hold ±1 to step</span>',
  );

  $("#slider").insertAdjacentHTML(
    "beforebegin",
    after
      ? '<div class="windowTrack"><span id="windowBand"></span></div><div id="windowLabel" class="muted"></div>'
      : "",
  );
  $("#slider").insertAdjacentHTML(
    "afterend",
    '<div id="preview" hidden><canvas id="previewCanvas"></canvas><span id="previewLabel"></span><button id="closePreview" aria-label="Close frame preview">×</button></div>',
  );
  $("#slider").addEventListener("pointerdown", () => {
    preview = true;
    $("#preview").hidden = false;
  });
  $("#closePreview").onclick = () => {
    preview = false;
    $("#preview").hidden = true;
  };
  $(".timeline").insertAdjacentHTML(
    "beforeend",
    `
    <section class="selection" aria-label="Your inspection notes">
      <div class="selectionTools">
        <label for="judgment">Your review</label>
        <select id="judgment"><option value="interval">Mark anomaly interval</option><option value="none">No anomaly observed</option><option value="uncertain">Cannot determine</option></select>
        <button id="start">Set start</button><button id="end">Set end</button>
        <span id="selectionStatus" class="muted"></span>
        ${after ? '<label for="agree">VERA judgment</label><select id="agree"><option value="">Choose…</option><option>Agree</option><option>Disagree</option><option>Cannot determine</option></select>' : ""}
        <button id="reset" title="Clear your interval and agreement">Clear</button>
      </div>
      <div id="agreementNote" class="muted"></div>
      <div class="answerRow"><label class="srOnly" for="answer">Copyable inspection summary</label><input id="answer" readonly><button id="copy">Copy for Form</button><span id="copyStatus" role="status"></span></div>
    </section>`,
  );
  $("#judgment").onchange = summary;
  $("#start").onclick = () => {
    video.pause();
    start = frame();
    summary();
  };
  $("#end").onclick = () => {
    video.pause();
    end = frame();
    summary();
  };
  $("#reset").onclick = () => {
    start = end = agreement = null;
    $("#judgment").value = "interval";
    if (after) $("#agree").value = "";
    summary();
  };
  if (after)
    $("#agree").onchange = (event) => {
      agreement = event.target.value
        ? { answer: event.target.value, window: { ...options.getWindow() } }
        : null;
      summary();
    };
  $("#copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText($("#answer").value);
      $("#copyStatus").textContent = "Copied. Paste into the Form.";
    } catch {
      $("#answer").select();
      $("#copyStatus").textContent =
        "Press ⌘C / Ctrl+C, then paste into the Form.";
    }
  };
  summary();
}

export function updateInspection(frame, window) {
  if (!context) return;
  if (window) {
    if (window.index !== lastWindow) {
      $("#agree").value = "";
      lastWindow = window.index;
    }
    const [first, last] = windowFrames(window, context.clip.fps);
    const band = $("#windowBand");
    band.style.left = `${(100 * (first - 1)) / context.clip.frame_count}%`;
    band.style.width = `${(100 * (last - first + 1)) / context.clip.frame_count}%`;
    band.classList.toggle("anomaly", window.label === 1);
    $("#windowLabel").textContent =
      `Displayed VERA window: frames ${first}–${last} · ${(window.end - window.start).toFixed(0)} s · output ${window.label}. ${window.label === 1 ? "Red = predicted anomaly" : "Blue = predicted no anomaly"}; not event boundaries.`;
  }
  if (preview && !context.video.seeking) {
    const canvas = $("#previewCanvas");
    canvas.width = 128;
    canvas.height = Math.round(
      (128 * context.video.videoHeight) / context.video.videoWidth,
    );
    canvas
      .getContext("2d")
      .drawImage(context.video, 0, 0, canvas.width, canvas.height);
    $("#previewLabel").textContent = `Original · frame ${frame}`;
  }
}

export function inspectionNotes() {
  return {
    mode: $("#judgment").value,
    start_frame: start,
    end_frame: end,
    agreement,
    summary: $("#answer").value,
  };
}
