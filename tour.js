// Practice-only, action-led onboarding. No persistence or participant tracking.
export function setupTour({ video, seek }) {
  const $ = (s) => document.querySelector(s);
  const steps = [
    {
      target: "#originalPane",
      title: "1 · Review the real footage",
      text: "You are reviewing a security-camera scene. Click the video or the Play button to begin. Only mark activity supported by what you can see.",
      event: "play",
    },
    {
      target: ".filmstrip",
      title: "2 · Inspect a frame",
      text: "Drag this lower slider. It moves one frame at a time; the number above identifies the displayed frame. You can also hold −1 / +1.",
      event: "frame",
    },
    {
      target: ".aiOutput",
      title: "3 · Read the AI alert",
      text: "The bell identifies AI information, not a confirmed threat. 1 means a window was flagged; 0 means it was not. Scroll the explanation and expand its sampled evidence if useful. Later clips add importance maps from another classifier and object boxes; neither proves an anomaly. AI can be wrong.",
      next: "Understood",
    },
    {
      target: ".windowStrip",
      title: "4 · Review a 10-second window",
      text: "Move the upper slider to another window. Both pointers share the same video timeline. The outlined span is the window being assessed; a window label is not an exact event boundary.",
      event: "window",
    },
    {
      target: "#mark",
      title: "5 · Start a practice interval",
      text: "Click Start on the left of the footage. This records the current frame as your start. This exercise teaches the controls, not a correct anomaly answer.",
      event: "inspection:start",
    },
    {
      target: "#finish",
      title: "6 · Choose the end",
      text: "Move the lower frame slider forward, then click Finish on the right. Finish becomes available only after Start. You can repeat for separate intervals or edit their numbers below.",
      event: "inspection:finish",
    },
    {
      target: "#answer",
      title: "7 · Copy your frame ranges",
      text: "Click the red answer. It copies only frame ranges, separated by semicolons. Paste these into the frame-number question in Google Forms; write comments separately.",
      event: "inspection:copy",
    },
    {
      target: ".choices",
      title: "Ready to review",
      text: "If appropriate, choose No anomaly, Cannot determine, or Skip clip instead of a range. Practice is not scored. Return to your existing Google Form tab when ready; your six study clips come next.",
      next: "Finish practice guide",
    },
  ];
  let index = -1,
    card,
    spotlight,
    advanceTimer;
  function close() {
    clearTimeout(advanceTimer);
    index = -1;
    card?.remove();
    spotlight?.remove();
    $("#tourStart").focus();
  }
  function position() {
    if (index < 0) return;
    const r = $(steps[index].target).getBoundingClientRect(),
      pad = 6;
    Object.assign(spotlight.style, {
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });
    const width = Math.min(330, innerWidth - 32),
      height = card.offsetHeight;
    let x, y;
    if (innerWidth - r.right > width + 32) {
      x = r.right + 20;
      y = r.top;
    } else if (r.left > width + 32) {
      x = r.left - width - 20;
      y = r.top;
    } else {
      x = Math.max(16, Math.min(r.left, innerWidth - width - 16));
      y = r.bottom + 20;
      if (y + height > innerHeight - 16) y = r.top - height - 20;
    }
    Object.assign(card.style, {
      width: `${width}px`,
      left: `${Math.max(16, Math.min(x, innerWidth - width - 16))}px`,
      top: `${Math.max(16, Math.min(y, innerHeight - height - 16))}px`,
    });
  }
  function show(i) {
    clearTimeout(advanceTimer);
    if (i >= steps.length) {
      close();
      return;
    }
    video.pause();
    index = i;
    const step = steps[i];
    card.innerHTML = `<small>GUIDED PRACTICE · ${i + 1} / ${steps.length}</small><h2>${step.title}</h2><p>${step.text}</p><div><button id="tourSkip">Skip guide</button>${step.next ? `<button id="tourNext" class="primary">${step.next}</button>` : '<span class="tourPrompt">Try it to continue →</span>'}</div>`;
    $("#tourSkip").onclick = close;
    if (step.next) $("#tourNext").onclick = () => show(i + 1);
    $(step.target).scrollIntoView({ block: "nearest", behavior: "auto" });
    requestAnimationFrame(position);
  }
  function signal(name) {
    if (index >= 0 && steps[index].event === name) {
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(
        () => show(index + 1),
        name === "play" ? 900 : 200,
      );
    }
  }
  function start() {
    video.pause();
    $("#clear").click();
    seek(1);
    card?.remove();
    spotlight?.remove();
    spotlight = document.createElement("div");
    spotlight.className = "tourSpotlight";
    spotlight.setAttribute("aria-hidden", "true");
    card = document.createElement("section");
    card.className = "tourCard";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", "Guided practice");
    card.setAttribute("aria-live", "polite");
    document.body.append(spotlight, card);
    show(0);
  }
  $("#tourStart").onclick = start;
  video.addEventListener("play", () => signal("play"));
  $("#slider").addEventListener("input", () => signal("frame"));
  $("#window").addEventListener("input", () => signal("window"));
  $("#window").addEventListener("keydown", (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key)
    )
      signal("window");
  });
  for (const event of [
    "inspection:start",
    "inspection:finish",
    "inspection:copy",
  ])
    document.addEventListener(event, () => signal(event));
  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && index >= 0) close();
  });
  if (video.readyState >= 2) start();
  else video.addEventListener("loadeddata", start, { once: true });
}
