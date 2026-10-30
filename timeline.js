// Both tracks use the same 1-based frame coordinate, never window ordinal.
export function windowIndexAtFrame(records, frame, fps) {
  const time = (frame - 1) / fps;
  return records.reduce(
    (best, w, i) =>
      Math.abs(w.time - time) < Math.abs(records[best].time - time) ? i : best,
    0,
  );
}
export function nextWindowFrame(records, frame, fps, direction) {
  const centers = records.map((w) => Math.round(w.time * fps) + 1);
  return direction > 0
    ? (centers.find((n) => n > frame) ?? centers.at(-1))
    : ([...centers].reverse().find((n) => n < frame) ?? centers[0]);
}
