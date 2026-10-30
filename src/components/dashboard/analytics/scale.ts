/** Rounds a raw step up to 1, 2, 2.5 or 5 × 10^n. */
const niceStep = (raw: number) => {
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

/** Clean integer ticks from 0 to just past max, about four intervals. */
export const integerTicks = (max: number, intervals = 4) => {
  if (max <= 0) return [0, 1];
  const step = Math.max(1, Math.ceil(niceStep(max / intervals)));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
};

/** Indices to label along an x axis so labels don't collide. */
export const labelIndices = (count: number, width: number, minGap = 72) => {
  if (count <= 1) return [0];
  const slots = Math.max(2, Math.floor(width / minGap));
  if (count <= slots) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (slots - 1);
  return Array.from({ length: slots }, (_, i) => Math.round(i * step));
};

/** Column path: 4px rounded data-end, square at the baseline. */
export const columnPath = (
  x: number,
  y: number,
  width: number,
  baseline: number,
) => {
  const height = baseline - y;
  if (height <= 0) return '';
  const r = Math.min(4, width / 2, height);
  return [
    `M${x},${baseline}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${baseline}`,
    'Z',
  ].join(' ');
};
