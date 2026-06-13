import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';

/**
 * Stroke a polyline through a value series. NaN values create gaps (pen
 * lifts and re-plants on the next valid sample), which is how warm-up
 * regions at the start of a series render correctly.
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  values: Float64Array,
  fromIdx: number,
  toIdx: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  color: string,
  lineWidth: number = 1.5,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  let pen = false;
  const end = Math.min(toIdx, values.length - 1);
  for (let i = Math.max(0, fromIdx); i <= end; i++) {
    const v = values[i]!;
    if (Number.isNaN(v)) {
      pen = false;
      continue;
    }
    const x = timeScale.indexToX(i);
    const y = priceScale.priceToY(v);
    if (!pen) {
      ctx.moveTo(x, y);
      pen = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/**
 * Standalone EMA over a source series. Used by MACD (which EMAs over the
 * MACD line for its signal, not over raw close), and as the foundation for
 * the public EMA indicator. NaN-aware: leading NaNs in the source seed the
 * first valid output to `src[firstReal]`; subsequent NaNs in the middle
 * produce NaN outputs at the same indices.
 */
export function computeEMA(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  if (n === 0) return out;
  const alpha = 2 / (period + 1);

  let firstReal = -1;
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(src[i]!)) {
      firstReal = i;
      break;
    }
  }
  if (firstReal < 0) {
    out.fill(NaN);
    return out;
  }

  for (let i = 0; i < firstReal; i++) out[i] = NaN;
  out[firstReal] = src[firstReal]!;
  for (let i = firstReal + 1; i < n; i++) {
    const v = src[i]!;
    if (Number.isNaN(v)) {
      out[i] = NaN;
      continue;
    }
    const prev = out[i - 1]!;
    out[i] = Number.isNaN(prev) ? v : alpha * v + (1 - alpha) * prev;
  }
  return out;
}

/** Min/max across a slice of a value series, ignoring NaN. */
export function rangeOf(
  values: Float64Array,
  fromIdx: number,
  toIdx: number,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  const end = Math.min(toIdx, values.length - 1);
  for (let i = Math.max(0, fromIdx); i <= end; i++) {
    const v = values[i]!;
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    found = true;
  }
  return found ? { min, max } : null;
}

/** Ensure a Float64Array has at least `n` slots; reallocates if needed. */
export function growToLength(arr: Float64Array, n: number): Float64Array {
  if (arr.length >= n) return arr;
  const next = new Float64Array(n);
  next.set(arr);
  return next;
}
