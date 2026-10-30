// Human annotations remain in memory. Only frame ranges are copied to Forms.
const $ = (s) => document.querySelector(s);
let context,
  intervals = [],
  pending = null,
  mode = "",
  currentFrame = 1;
export function windowFrames(w, fps = 30) {
  return [Math.round(w.start * fps) + 1, Math.round(w.end * fps)];
}
export function mergeRanges(ranges) {
  const merged = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
export function rangeText(ranges) {
  return mergeRanges(ranges).map(([a, b]) => `${a}-${b}`).join("; ");
}
function refresh() {
  intervals = mergeRanges(intervals);
  const displayRanges =
    pending === null
      ? intervals
      : [
          ...intervals,
          [Math.min(pending, currentFrame), Math.max(pending, currentFrame)],
        ];
  const answer = mode || rangeText(displayRanges);
  $("#answer").textContent = answer || "Your marked frames will appear here";
  $("#answer").disabled = !answer || pending !== null;
  $("#copyStatus").textContent =
    pending !== null
      ? `Recording from frame ${pending}: move to the end, then finish`
      : "Click the red answer to copy into Google Forms";
  $("#mark").disabled = pending !== null;
  $("#finish").disabled = pending === null;
  $("#finish").classList.toggle("recording", pending !== null);
  $("#selectionHint").textContent =
    pending !== null
      ? `Marking from ${pending} → choose an end frame`
      : "Mark an interval, or choose:";
  $("#cancelMark").hidden = pending === null;
  $("#intervals").innerHTML = intervals
    .map(
      ([a, b], i) =>
        `<div class="interval"><label>Start <input aria-label="Interval ${i + 1} start" data-index="${i}" data-end="0" type="number" min="1" max="${context.clip.frame_count}" value="${a}"></label><span>-</span><label>End <input aria-label="Interval ${i + 1} end" data-index="${i}" data-end="1" type="number" min="1" max="${context.clip.frame_count}" value="${b}"></label><button data-remove="${i}" aria-label="Remove interval ${i + 1}">×</button></div>`,
    )
    .join("");
  $("#intervals")
    .querySelectorAll("input")
    .forEach(
      (input) =>
        (input.onchange = () => {
          const i = +input.dataset.index,
            end = +input.dataset.end,
            next = [...intervals[i]],
            value = Number(input.value);
          next[end] = value;
          if (
            !Number.isInteger(value) ||
            value < 1 ||
            value > context.clip.frame_count ||
            next[0] > next[1]
          ) {
            input.value = intervals[i][end];
            $("#markStatus").textContent =
              "Use whole frame numbers with start no later than end.";
            return;
          }
          intervals[i] = next;
          $("#markStatus").textContent = "";
          refresh();
        }),
    );
  $("#intervals")
    .querySelectorAll("[data-remove]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          intervals.splice(+b.dataset.remove, 1);
          refresh();
        }),
    );
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  });
  paintBands();
}
function paintBands() {
  const ranges = [...intervals];
  if (pending !== null)
    ranges.push([
      Math.min(pending, currentFrame),
      Math.max(pending, currentFrame),
    ]);
  $("#humanBands").innerHTML = mergeRanges(ranges)
    .map(
      ([a, b]) =>
        `<span style="left:${(100 * (a - 1)) / context.clip.frame_count}%;width:${(100 * (b - a + 1)) / context.clip.frame_count}%"></span>`,
    )
    .join("");
}
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
  const { video, frame, seek, clip } = options;
  const toggle = () =>
    video.paused ? video.play().catch(() => {}) : video.pause();
  video.onclick = toggle;
  video.onkeydown = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      video.pause();
      seek(frame() + (event.key === "ArrowLeft" ? -1 : 1));
    }
  };
  let target = frame();
  const step = (delta) => {
    video.pause();
    if (!video.seeking) target = frame();
    target = Math.max(1, Math.min(clip.frame_count, target + delta));
    seek(target);
  };
  holdStep($("#previous"), () => step(-1));
  holdStep($("#next"), () => step(1));
  movableDock($(".controls"), $("#dragHandle"));
  $("#mark").onclick = () => {
    video.pause();
    if (video.seeking) {
      $("#markStatus").textContent =
        "Wait for the frame to appear, then start.";
      return;
    }
    pending = frame();
    mode = "";
    $("#markStatus").textContent = "";
    refresh();
    document.dispatchEvent(new CustomEvent("inspection:start"));
  };
  $("#finish").onclick = () => {
    video.pause();
    if (video.seeking || pending === null) return;
    if (frame() < pending) {
      $("#markStatus").textContent =
        `Choose an end at or after frame ${pending}.`;
      return;
    }
    intervals.push([pending, frame()]);
    pending = null;
    $("#markStatus").textContent = "";
    refresh();
    document.dispatchEvent(new CustomEvent("inspection:finish"));
  };
  $("#cancelMark").onclick = () => {
    pending = null;
    refresh();
  };
  document.querySelectorAll("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        mode = b.dataset.mode;
        intervals = [];
        pending = null;
        refresh();
      }),
  );
  $("#clear").onclick = () => {
    intervals = [];
    pending = null;
    mode = "";
    refresh();
  };
  $("#answer").onclick = async () => {
    const answer = mode || rangeText(intervals);
    try {
      await navigator.clipboard.writeText(answer);
      $("#copyStatus").textContent =
        "Copied. Paste into the frame-number question in your Form.";
      document.dispatchEvent(new CustomEvent("inspection:copy"));
    } catch {
      $("#copyStatus").textContent =
        "Copy the displayed frame ranges manually.";
    }
  };
  refresh();
}
export function updateInspection(frame, window) {
  currentFrame = frame;
  if (pending !== null) {
    paintBands();
    $("#answer").textContent = rangeText([
      ...intervals,
      [Math.min(pending, currentFrame), Math.max(pending, currentFrame)],
    ]);
  }
  $("#frameCursor").style.left =
    `${(100 * (frame - 1)) / (context.clip.frame_count - 1)}%`;
}
export function inspectionNotes() {
  return { intervals: intervals.map((r) => [...r]), code: mode || null };
}
