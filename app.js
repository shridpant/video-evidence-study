import { setupInspection, updateInspection } from "./inspection.js";
("use strict");
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
  follow = true,
  active = "original",
  layout = q.get("layout") || "compare",
  cache = new Map(),
  textPage = 0,
  lastTextWindow = -1;
const after = q.get("phase") === "after",
  shown = new Set();
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
  return `<section class="pane ${id === "original" ? "activePane" : ""}" id="${id}Pane"><h2>${title}</h2><div class="picture">${id === "original" ? `<video id="video" src="${c.id}.mp4" playsinline muted preload="auto" tabindex="0" role="button" aria-label="Play or pause original video"></video>` : `<canvas id="${id}Canvas" aria-label="${title} on the current video frame"></canvas>`}</div><span class="stamp">Frame 001 / 750</span><div class="caption" id="${id}Caption">${caption}</div></section>`;
}
function render() {
  const number = Number(c.id.slice(1));
  const title = c.practice
    ? "Practice · camera review"
    : `Clip ${number} · camera review`;
  const definition =
    "An anomalous event is visible activity that indicates harm, a dangerous incident, or damage to or taking of property. Unusual appearance, a crowd, or fast movement alone does not count. Judge visible actions, not assumed intent; choose Cannot determine when unclear.";
  app.innerHTML = `<div class="shell ${after ? "" : "before"}" data-layout="${layout}">
    <header><img class="labLogo" src="ai4sec.png" alt="AI4Sec lab"><div><strong>Rochester Institute of Technology</strong><small>AI4Sec · Video evidence study</small></div><button class="right" id="return">Back to Google Form ↗</button></header>
    <section class="answerBar"><div><span class="eyebrow">${after ? "After AI" : "Before AI"} · Your anomalous frames</span><button id="answer" disabled></button><small id="copyStatus" role="status"></small></div><details class="help"><summary title="${esc(definition)}">What counts as an anomaly?</summary><p>${definition}</p></details></section>
    <div class="intro"><h1>${title}</h1><span>${c.practice ? "Try marking, editing and copying a range. Practice is not scored." : "Review the scene. Mark any anomalous intervals, then return to your Form."}</span></div>
    <main class="workspace"><section class="mediaArea"><div class="toolbar">${after && (maps || boxes) ? `<div class="tabs">${["original", ...(maps ? ["map"] : []), ...(boxes ? ["boxes"] : [])].map((k) => `<button data-view="${k}">${{ original: "Original", map: "Importance map", boxes: "Boxes" }[k]}</button>`).join("")}<button data-view="compare" class="active">Side by side</button></div>` : ""}</div>
    <div class="panes">${pane("original", "Original footage", "Click video to play / pause")}${maps ? pane("map", "Estimated importance map", "") : ""}${boxes ? pane("boxes", "Object boxes", "") : ""}</div></section>
    <aside class="aside"><section class="marking"><button id="mark">+ Start marking</button><button id="cancelMark" hidden>Cancel</button><small>Start → move to an end frame → finish. Repeat for another interval.</small><div id="intervals"></div><span id="markStatus" role="status"></span><div class="choices"><button data-mode="NONE">No anomaly</button><button data-mode="UNSURE">Cannot determine</button><button data-mode="SKIP">Skip</button><button id="clear">Clear</button></div></section>
    ${after ? `<section class="aiOutput"><div id="verdict" class="verdict"></div><div id="windowLabel" class="muted"></div><pre id="raw" class="raw"></pre><div class="textPages"><button id="textPrev" aria-label="Previous explanation page">←</button><span id="textPageLabel"></span><button id="textNext" aria-label="Next explanation page">→</button></div><details><summary>Eight frames VERA saw</summary><div class="samples" id="samples"></div></details></section>` : '<p class="firstView">First, make your own assessment. AI appears only in the next stage of the Form.</p>'}</aside></main>
    <section class="timeline"><div class="timelineTop"><strong id="frame">Frame 1 / 750</strong><div class="dockArea"><div class="controls"><button id="dragHandle" aria-label="Move playback controls">⠿</button><button id="play" class="primary">Play</button><button id="previous" title="Hold to step continuously">−1 frame</button><button id="next" title="Hold to step continuously">+1 frame</button><label for="jump">Frame</label><input id="jump" type="number" min="1" max="750" value="1"><button id="go">Go</button></div></div></div>
    ${after ? `<div class="trackLabel"><label for="window">VERA windows</label><span>Red border = AI predicted anomaly · windows overlap</span><label><input id="follow" type="checkbox" checked> Follow frame</label></div><div class="windowStrip"><div class="windowTiles">${records.map((w, i) => `<span class="windowTile ${w.label === 1 ? "aiAnomaly" : ""}" style="background-position:${records.length === 1 ? 0 : (100 * i) / (records.length - 1)}% 0;background-image:url('${c.id}-windows.jpg');background-size:${records.length * 100}% 100%" title="Window ${i + 1}: VERA ${w.label ?? "unavailable"}"></span>`).join("")}</div><input id="window" aria-label="VERA window" type="range" min="0" max="${records.length - 1}" step="1" value="0"></div>` : ""}
    <div class="trackLabel"><label for="slider">Every frame</label><span>Red bands = your marked intervals</span><small id="time"></small></div><div class="filmstrip" style="background-image:url('${c.id}-filmstrip.jpg')"><div id="humanBands"></div><span id="frameCursor"></span><input id="slider" aria-label="Video frame" type="range" min="1" max="750" step="1" value="1"></div>
    </section></div>`;
  video = $("#video");
  video.onloadeddata = () => seekFrame(1);
  video.onseeked = draw;
  video.onplay = () => {
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
    video.pause();
    if (after) {
      follow = true;
      $("#follow").checked = true;
    }
    seekFrame(+e.target.value);
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
  $("#return").onclick = () => {
    window.close();
    $("#return").textContent = "Switch to your Google Form tab";
    $("#return").title =
      "If this tab stays open, switch to the existing Google Form tab. Do not reopen the form from its beginning.";
  };
  if (after) {
    $("#textPrev").onclick = () => {
      textPage = Math.max(0, textPage - 1);
      showText();
    };
    $("#textNext").onclick = () => {
      textPage++;
      showText();
    };
    $("#window").oninput = (e) => {
      selectedWindow = +e.target.value;
      follow = false;
      $("#follow").checked = false;
      seekFrame(Math.round(records[selectedWindow].time * 30) + 1);
    };
    $("#follow").onchange = (e) => {
      follow = e.target.checked;
      draw();
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
}
function frameNumber() {
  return Math.max(
    1,
    Math.min(750, Math.floor(video.currentTime * 30 + 0.00001) + 1),
  );
}
function seekFrame(n) {
  n = Math.max(1, Math.min(750, Math.round(n) || 1));
  video.currentTime = (n - 1) / 30 + 0.0001;
  $("#slider").value = n;
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
  active = view;
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
  if (document.activeElement !== $("#jump")) $("#jump").value = n;
  $("#time").textContent = `${((n - 1) / 30).toFixed(2)} / 25.00 s · 30 fps`;
  document.querySelectorAll(".stamp").forEach((x) => (x.textContent = stamp));
  if (!after) {
    updateInspection(n, null);
    return;
  }
  if (follow) selectedWindow = records.indexOf(nearest(records, t));
  const w = records[selectedWindow];
  shown.add(selectedWindow);
  updateInspection(n, { ...w, index: selectedWindow });
  $("#window").value = selectedWindow;
  $("#verdict").classList.toggle("anomaly", w.label === 1);
  $("#verdict").textContent =
    `VERA output: ${w.label} · ${w.label === 1 ? "anomaly indicated" : w.label === 0 ? "no anomaly indicated" : "output unavailable"}`;
  if (lastTextWindow !== selectedWindow) {
    lastTextWindow = selectedWindow;
    textPage = 0;
  }
  showText();
  $("#windowLabel").textContent =
    `Frames ${Math.round(w.start * 30) + 1}–${Math.round(w.end * 30)} · 10-second window`;
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
            follow = false;
            $("#follow").checked = false;
            video.pause();
            seekFrame(+b.dataset.frame);
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
      `Separate classifier · ${mw.predicted_class} · map sampled at frame ${sample.frame + 1}`;
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
      `${b.detections.length} detected object${b.detections.length === 1 ? "" : "s"} · not verified anomaly locations`;
  }
}
function textChunks(text, limit = 400) {
  const out = [];
  while (text.length > limit) {
    let cut = text.lastIndexOf(" ", limit);
    if (cut < limit / 2) cut = limit;
    out.push(text.slice(0, cut));
    text = text.slice(cut);
  }
  out.push(text);
  return out;
}
function showText() {
  const pages = textChunks(
    records[selectedWindow].raw,
    window.innerHeight < 760 ? 280 : 400,
  );
  textPage = Math.max(0, Math.min(pages.length - 1, textPage));
  $("#raw").textContent = pages[textPage];
  $("#textPageLabel").textContent =
    `Exact text · ${textPage + 1} / ${pages.length}`;
  $("#textPrev").disabled = textPage === 0;
  $("#textNext").disabled = textPage === pages.length - 1;
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
