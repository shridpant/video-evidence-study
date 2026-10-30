import { setupInspection, updateInspection } from "./inspection.js";
import { setupAppearance } from "./appearance.js";
import { setupTour } from "./tour.js";
import { windowIndexAtFrame, nextWindowFrame } from "./timeline.js";
const $ = (s) => document.querySelector(s),
  app = $("#app"),
  q = new URLSearchParams(location.search),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let c,
  records,
  maps,
  boxes,
  atlas,
  video,
  playingRAF,
  selectedWindow = 0,
  evidenceWindow = null,
  layout = q.get("layout") || "compare",
  cache = new Map(),
  lastTextWindow = -1;
const after = q.get("phase") === "after";
const fromForm =
  document.referrer.startsWith("https://docs.google.com/") &&
  history.length === 1;
async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw Error("Could not load " + path);
  return r.json();
}
function nearest(xs, t, key = "time") {
  return xs.reduce((a, b) =>
    Math.abs(b[key] - t) < Math.abs(a[key] - t) ? b : a,
  );
}
function directory() {
  app.innerHTML = `<main class="directory"><img class="labLogo" src="ai4sec.png" alt="AI4Sec lab"><h1>Camera review</h1><p>Open your assigned clip using the link in the Google Form.</p><p>Keep the Form tab open to record your answers.</p></main>`;
}
function pane(id, title, caption) {
  return `<section class="pane ${id === "original" ? "activePane" : ""}" id="${id}Pane"><h2>${title}</h2><div class="picture">${id === "original" ? `<video id="video" src="${c.id}.mp4" playsinline muted preload="auto" tabindex="0" role="button" aria-label="Play or pause original video"></video>` : `<canvas id="${id}Canvas" tabindex="0" role="button" aria-label="Play or pause ${title.toLowerCase()}"></canvas>`}</div><span class="stamp">Frame 001 / 750</span><div class="caption" id="${id}Caption">${caption}</div></section>`;
}
function render() {
  const number = Number(c.id.slice(1));
  const title = c.practice ? "Practice" : `Clip ${number}`;
  const definition =
    "An anomalous event is visible activity that indicates harm, a dangerous incident, or damage to or taking of property. Unusual appearance, a crowd, or fast movement alone does not count. Judge visible actions, not assumed intent; choose Cannot determine when unclear.";
  app.innerHTML = `<div class="shell ${after ? "" : "before"}" data-layout="${layout}">
    <header><img class="labLogo" src="ai4sec.png" alt="AI4Sec lab"><div><strong>Video Evidence Study</strong></div><div class="headerActions"><button id="theme" title="Switch to dark theme" aria-label="Switch to dark theme">☾</button>${fromForm ? '<button id="return">Return to Google Form</button>' : '<span class="formReminder">Answer in your Google Form tab</span>'}</div></header>
    <section class="answerBar"><div><span class="eyebrow">${after ? "After AI" : "Before AI"} - Your anomalous frames</span><button id="answer" disabled></button><small id="copyStatus" role="status"></small></div><details class="help"><summary title="${esc(definition)}">What counts as an anomaly?</summary><p>${definition}</p></details></section>
    <div class="intro"><h1>${title}</h1><span>${c.practice ? "Try marking, editing and copying a range. Practice is not scored." : "Review the scene. Mark any anomalous intervals, then return to your Form."}</span></div>
    <main class="workspace"><section class="mediaArea"><div class="toolbar">${after && (maps || boxes) ? `<div class="tabs">${["original", ...(maps ? ["map"] : []), ...(boxes ? ["boxes"] : [])].map((k) => `<button data-view="${k}">${{ original: "Original", map: "Importance map", boxes: "Boxes" }[k]}</button>`).join("")}<button data-view="compare" class="active">Side by side</button></div>` : ""}</div>
    <div class="reviewStage"><button id="mark" class="markRail" aria-label="Start marking"><span aria-hidden="true">[</span>Start<br>mark</button><div class="panes">${pane("original", "Original footage", "Click video to play / pause")}${maps ? pane("map", "Estimated importance map", "") : ""}${boxes ? pane("boxes", "Object boxes", "") : ""}</div><button id="finish" class="markRail" aria-label="Finish interval" disabled><span aria-hidden="true">]</span>Finish<br>mark</button></div>
    <section class="marking"><div class="annotationBar"><span id="selectionHint">Mark an interval, or choose:</span><div class="choices" role="group" aria-label="Assessment without a frame interval"><button data-mode="NONE" aria-pressed="false">No anomaly</button><button data-mode="UNSURE" aria-pressed="false">Cannot determine</button><button data-mode="SKIP" aria-pressed="false">Skip clip</button></div><button id="cancelMark" hidden>Cancel mark</button><button id="clear" class="quiet">Reset</button></div><div id="intervals"></div><span id="markStatus" role="status"></span></section></section>
    <aside class="aside">${after ? `<section class="aiOutput" aria-label="AI explanation"><h2>AI explanation</h2><div id="alertStatus"><div id="verdict" class="verdict anomaly">Output: 1</div><small>Anomaly flagged</small></div><div id="windowLabel" class="muted"></div><pre id="raw" class="raw" tabindex="0" aria-label="Exact AI explanation"></pre><details class="sourceDetails"><summary>Evidence used for this output (8 frames)</summary><div class="samples" id="samples"></div></details><details class="sourceDetails"><summary>How to read this output</summary><p>The AI assesses overlapping 10-second windows, using eight sampled frames from each. A 1 flags the whole window; it does not mean every frame is anomalous. A 0 does not rule out a missed event.</p><p>The full research system can refine window scores into frame-level scores through postprocessing. That postprocessing is not shown here: this pane displays the original window judgment and exact explanation. The selected window follows the nearest window center during playback or slider navigation. Clicking an evidence frame keeps its alert selected. Window boundaries come from the saved model output and may not begin at the clip start.</p></details></section>` : '<div class="firstView"><h2>Your first assessment</h2><p>Review the visible activity. AI evidence appears at the next stage of the Form.</p></div>'}</aside></main>
    <section class="timeline"><div class="timelineTop"><strong id="frame">Frame 1 / 750</strong><div class="dockArea"><div class="controls"><button id="dragHandle" aria-label="Move playback controls">⠿</button><button id="play" class="primary">Play</button><button id="previous" title="Hold to step continuously">-1 frame</button><button id="next" title="Hold to step continuously">+1 frame</button><label for="jump">Frame</label><input id="jump" type="number" min="1" max="750" value="1"><button id="go">Go</button></div></div></div>
    ${after ? `<div class="trackLabel"><label for="window"><img class="alertIcon" src="ai-alert.svg" alt="">AI review windows (10 seconds each)</label><span>Green outline: selected window. Red dots: centers of 10-second windows flagged by AI, not event boundaries.</span></div><div class="windowStrip timeTrack" style="background-image:url('${c.id}-filmstrip.jpg')"><div class="windowTiles">${records.map((w, i) => `<span class="windowTile ${w.label === 1 ? "aiAnomaly" : ""}" style="left:${(100 * Math.round(w.time * c.fps)) / (c.frame_count - 1)}%" title="Window ${i + 1}: output ${w.label ?? "unavailable"}"></span>`).join("")}</div><span id="activeWindow"></span><span id="alertPointer" aria-hidden="true">▼</span><input id="window" aria-label="AI review window, 10 seconds" type="range" min="1" max="750" step="1" value="1"></div>` : ""}
    <div class="trackLabel"><label for="slider">Video frames</label><span>Red bands = your marked intervals</span><small id="time"></small></div><div class="filmstrip" style="background-image:url('${c.id}-filmstrip.jpg')"><div id="humanBands"></div><span id="frameCursor"></span><input id="slider" aria-label="Video frame" type="range" min="1" max="750" step="1" value="1"></div>
    </section><footer><div>${c.practice && after ? '<button id="tourStart" class="quiet">Restart guided practice</button>' : '<a class="guideLink" href="P01.html?phase=after" target="_blank" rel="noopener">Open guided practice</a>'}</div><img src="rit.svg" alt="RIT" class="ritLogo"><small>Created with help from Codex</small></footer></div>`;
  video = $("#video");
  video.onloadeddata = () => seekFrame(1);
  video.onseeked = draw;
  video.onplay = () => {
    evidenceWindow = null;
    $("#play").textContent = "Pause";
    tick();
  };
  video.onpause = () => {
    cancelAnimationFrame(playingRAF);
    $("#play").textContent = "Play";
    draw();
  };
  video.onended = () => ($("#play").textContent = "Replay");
  video.onerror = () => {
    app.innerHTML =
      '<p class="error">The video could not load. Please reload or contact the researcher.</p>';
  };
  $("#play").onclick = () =>
    video.paused ? video.play().catch(() => {}) : video.pause();
  $("#slider").oninput = (e) => {
    const target = +e.target.value;
    video.pause();
    seekFrame(target);
  };
  $("#previous").onclick = () => {
    video.pause();
    seekFrame(frameNumber() - 1);
  };
  $("#next").onclick = () => {
    video.pause();
    seekFrame(frameNumber() + 1);
  };
  $("#go").onclick = () => {
    video.pause();
    seekFrame(+$("#jump").value);
  };
  $("#jump").onkeydown = (e) => {
    if (e.key === "Enter") $("#go").click();
  };
  setupAppearance();
  if (fromForm) $("#return").onclick = () => window.close();
  for (const canvas of document.querySelectorAll("canvas")) {
    const toggle = () =>
      video.paused ? video.play().catch(() => {}) : video.pause();
    canvas.onclick = toggle;
    canvas.onkeydown = (event) => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        toggle();
      }
    };
  }
  if (after) {
    $("#window").oninput = (event) => {
      const target = +event.target.value;
      video.pause();
      seekFrame(target);
    };
    $("#window").onkeydown = (event) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      video.pause();
      const target =
        event.key === "Home"
          ? 1
          : event.key === "End"
            ? c.frame_count
            : nextWindowFrame(
                records,
                frameNumber(),
                c.fps,
                ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1,
              );
      seekFrame(target);
    };
    document
      .querySelectorAll("[data-view]")
      .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
  }
  setupInspection({
    clip: c,
    after,
    records,
    video,
    seek: seekFrame,
    frame: frameNumber,
    pause: () => video.pause(),
    getWindow: () =>
      records ? { ...records[selectedWindow], index: selectedWindow } : null,
  });
  draw();
  if (c.practice && after)
    setupTour({ video, seek: seekFrame, frame: frameNumber });
}
function frameNumber() {
  return Math.max(
    1,
    Math.min(750, Math.floor(video.currentTime * 30 + 0.00001) + 1),
  );
}
function seekFrame(n, retainedWindow = null) {
  evidenceWindow = retainedWindow;
  n = Math.max(1, Math.min(750, Math.round(n) || 1));
  video.currentTime = (n - 1) / 30 + 0.0001;
  $("#slider").value = n;
  $("#slider").setAttribute("aria-valuetext", `Frame ${n} of ${c.frame_count}`);
  if (document.activeElement !== $("#jump")) $("#jump").value = n;
}
function tick() {
  cancelAnimationFrame(playingRAF);
  if (!video.paused) {
    draw();
    playingRAF = requestAnimationFrame(tick);
  }
}
function canvas(id) {
  const cv = $(id);
  if (!cv || !video.videoWidth) return null;
  if (cv.width !== video.videoWidth || cv.height !== video.videoHeight) {
    cv.width = video.videoWidth;
    cv.height = video.videoHeight;
  }
  const ctx = cv.getContext("2d");
  ctx.drawImage(video, 0, 0);
  return ctx;
}
function setView(view) {
  layout = view === "compare" ? "compare" : "focus";
  $(".shell").dataset.layout = layout;
  document
    .querySelectorAll(".pane")
    .forEach((p) => p.classList.toggle("activePane", p.id === view + "Pane"));
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  draw();
}
function draw() {
  if (!video || !video.videoWidth) return;
  if (video.seeking) return;
  const t = video.currentTime,
    n = frameNumber(),
    stamp = `Frame ${String(n).padStart(3, "0")} / 750`;
  $("#frame").textContent = stamp;
  $("#slider").value = n;
  $("#slider").setAttribute("aria-valuetext", `Frame ${n} of ${c.frame_count}`);
  if (document.activeElement !== $("#jump")) $("#jump").value = n;
  $("#time").textContent = `${((n - 1) / 30).toFixed(2)} / 25.00 s - 30 fps`;
  document.querySelectorAll(".stamp").forEach((x) => (x.textContent = stamp));
  if (!after) {
    updateInspection(n, null);
    return;
  }
  selectedWindow = evidenceWindow ?? windowIndexAtFrame(records, n, c.fps);
  const w = records[selectedWindow];
  updateInspection(n, { ...w, index: selectedWindow });
  $("#window").value = n;
  $("#window").setAttribute(
    "aria-valuetext",
    `Window ${selectedWindow + 1} of ${records.length}, frame ${n}`,
  );
  const cursor = `calc(6px + (100% - 12px) * ${(n - 1) / (c.frame_count - 1)})`;
  $("#alertPointer").style.left = cursor;
  const band = $("#activeWindow");
  band.style.left = `${(100 * w.start) / c.duration}%`;
  band.style.width = `${(100 * (w.end - w.start)) / c.duration}%`;
  $("#alertStatus").style.visibility = w.label === 1 ? "visible" : "hidden";
  if (lastTextWindow !== selectedWindow) {
    lastTextWindow = selectedWindow;
    $("#raw").textContent = w.raw;
    $("#raw").scrollTop = 0;
  }
  $("#windowLabel").textContent =
    `Frames ${Math.round(w.start * 30) + 1}-${Math.round(w.end * 30)} - 10-second window`;
  document
    .querySelectorAll(".windowTile")
    .forEach((tile, i) =>
      tile.classList.toggle("selected", i === selectedWindow),
    );
  if ($("#samples").dataset.window !== String(selectedWindow)) {
    $("#samples").innerHTML = w.input_frames
      .map(
        (n, j) =>
          `<button data-frame="${n}" title="Inspect frame ${n}"><span class="inputThumb" style="background-image:url('${c.id}-inputs.jpg');background-position:${(100 * j) / 7}% ${records.length === 1 ? 0 : (100 * selectedWindow) / (records.length - 1)}%;background-size:800% ${records.length * 100}%"></span>${n}</button>`,
      )
      .join("");
    $("#samples").dataset.window = selectedWindow;
    $("#samples")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            video.pause();
            seekFrame(+b.dataset.frame, selectedWindow);
          }),
      );
  }
  if (maps) {
    const mw = nearest(maps.windows, t, "center"),
      sample = nearest(mw.samples, t),
      ctx = canvas("#mapCanvas");
    if (ctx) {
      let im = cache.get(sample.tile);
      if (!im) {
        im = document.createElement("canvas");
        im.width = 112;
        im.height = 112;
        const ic = im.getContext("2d");
        ic.drawImage(
          atlas,
          (sample.tile % 16) * 112,
          Math.floor(sample.tile / 16) * 112,
          112,
          112,
          0,
          0,
          112,
          112,
        );
        const px = ic.getImageData(0, 0, 112, 112);
        for (let i = 0; i < px.data.length; i += 4) {
          const v = px.data[i] / 255;
          px.data[i] = 230;
          px.data[i + 1] = 159;
          px.data[i + 2] = 49;
          px.data[i + 3] = Math.round(v * 170);
        }
        ic.putImageData(px, 0, 0);
        cache.set(sample.tile, im);
      }
      ctx.drawImage(im, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    $("#mapCaption").textContent =
      `Separate classifier - ${mw.predicted_class} - map sampled at frame ${sample.frame + 1}`;
  }
  if (boxes) {
    const b = boxes.frames[n - 1],
      ctx = canvas("#boxesCanvas");
    if (ctx) {
      ctx.lineWidth = Math.max(2, ctx.canvas.width / 200);
      ctx.strokeStyle = "#20b8bd";
      ctx.font = `${Math.max(12, ctx.canvas.width / 35)}px Arial`;
      for (const d of b.detections) {
        const [x, y, x2, y2] = d.box;
        ctx.strokeRect(x, y, x2 - x, y2 - y);
        ctx.fillStyle = "#214d5e";
        ctx.fillRect(
          x,
          Math.max(0, y - 22),
          ctx.measureText(d.label).width + 8,
          22,
        );
        ctx.fillStyle = "white";
        ctx.fillText(d.label, x + 4, Math.max(16, y - 6));
      }
    }
    $("#boxesCaption").textContent =
      `${b.detections.length} detected object${b.detections.length === 1 ? "" : "s"} - not verified anomaly locations`;
  }
}
(async () => {
  try {
    const list = await json("study.json");
    c = list.find(
      (x) => x.id === (document.body.dataset.clip || q.get("clip")),
    );
    if (!c) {
      directory(list);
      return;
    }
    if (after) {
      records = await json(`${c.id}-vera.json`);
      if (["map", "all"].includes(c.condition)) {
        maps = await json(`${c.id}-maps.json`);
        atlas = new Image();
        atlas.src = `${c.id}-maps.png`;
        await atlas.decode();
      }
      if (["boxes", "all"].includes(c.condition))
        boxes = await json(`${c.id}-boxes.json`);
    }
    render();
  } catch (e) {
    app.innerHTML = `<p class="error">${esc(e.message)}. Please reload or contact the researcher.</p>`;
  }
})();
