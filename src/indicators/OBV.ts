import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme, withAlpha } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine, growToLength, rangeOf } from './utils';

export interface OBVOptions {
  color?: string;
  id?: string;
}

/**
 * On-Balance Volume. Cumulative signed volume — runs up on up-close bars,
 * down on down-close bars, holds steady on dojis.
 *
 *   OBV[0]      = 0
 *   OBV[i > 0]  = OBV[i-1] + volume[i]   when close[i] > close[i-1]
 *               | OBV[i-1] − volume[i]   when close[i] < close[i-1]
 *               | OBV[i-1]               when close[i] == close[i-1]
 *
 * Own pane. Range is dynamic — auto-fits to the actual visible OBV values
 * (which can be hundreds of thousands or millions depending on instrument).
 *
 * The classic OBV reading is *divergence*: when price makes a new high but
 * OBV doesn't, distribution is showing through and the high is suspect.
 * Conversely if OBV makes a new high but price doesn't, accumulation is
 * underway and a breakout often follows.
 *
 * updateLast is genuinely O(1) here — OBV at i depends only on OBV at i-1
 * and the new bar's close and volume.
 */
export class OBV implements Indicator {
  readonly id: string;
  readonly name = 'OBV';
  readonly paneId: string;
  readonly overlays = false;

  private readonly _color: string;
  private _output: Float64Array = new Float64Array(0);

  constructor(opts: OBVOptions = {}) {
    this._color = opts.color ?? '#42a5f5';
    this.id = opts.id ?? `obv-${rand()}`;
    this.paneId = this.id;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const out = new Float64Array(n);
    if (n === 0) {
      this._output = out;
      return;
    }
    out[0] = 0;
    for (let i = 1; i < n; i++) {
      const c = store.close[i]!;
      const prev = store.close[i - 1]!;
      const v = store.volume[i]!;
      const last = out[i - 1]!;
      if (c > prev) out[i] = last + v;
      else if (c < prev) out[i] = last - v;
      else out[i] = last;
    }
    this._output = out;
  }

  updateLast(store: BarStore): void {
    const n = store.length;
    if (n === 0) return;
    this._output = growToLength(this._output, n);
    if (n === 1) {
      this._output[0] = 0;
      return;
    }
    const i = n - 1;
    const c = store.close[i]!;
    const prev = store.close[i - 1]!;
    const v = store.volume[i]!;
    const last = this._output[i - 1]!;
    if (c > prev) this._output[i] = last + v;
    else if (c < prev) this._output[i] = last - v;
    else this._output[i] = last;
  }

  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null {
    const r = rangeOf(this._output, fromIdx, toIdx);
    if (!r) return null;
    // Always include zero so trend direction is unambiguous in the pane.
    const min = Math.min(r.min, 0);
    const max = Math.max(r.max, 0);
    const pad = (max - min) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }

  draw(
    ctx: CanvasRenderingContext2D,
    fromIdx: number,
    toIdx: number,
    chartW: number,
    _paneHeight: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    theme: Theme,
  ): void {
    // Zero reference line.
    const yZero = Math.round(priceScale.priceToY(0)) + 0.5;
    ctx.strokeStyle = withAlpha(theme.axisLine, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yZero);
    ctx.lineTo(chartW, yZero);
    ctx.stroke();

    drawLine(ctx, this._output, fromIdx, toIdx, timeScale, priceScale, this._color, 1.5);
  }

  legendText(): string {
    return this.name;
  }

  legendColor(): string {
    return this._color;
  }
}

function rand(): string {
  return Math.random().toString(36).slice(2, 7);
}
