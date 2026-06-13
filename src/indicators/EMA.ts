import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine, growToLength, rangeOf } from './utils';

export interface EMAOptions {
  period?: number;
  color?: string;
  id?: string;
}

/**
 * Exponential Moving Average over close. Overlays on the main pane.
 *
 *   EMA[i] = α · close[i] + (1 − α) · EMA[i−1]      with α = 2 / (period+1)
 *
 * The first (period−1) outputs are NaN-masked so the warm-up region doesn't
 * draw a misleading line. EMA[period−1] is seeded from the simple average
 * of the first `period` closes (TradingView convention); subsequent
 * outputs are pure recursive EMA. updateLast is O(1).
 */
export class EMA implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId = 'main';
  readonly overlays = true;

  private readonly _period: number;
  private readonly _color: string;
  private readonly _alpha: number;
  private _output: Float64Array = new Float64Array(0);

  constructor(opts: EMAOptions = {}) {
    this._period = opts.period ?? 20;
    this._color = opts.color ?? '#ff9800';
    this._alpha = 2 / (this._period + 1);
    this.id = opts.id ?? `ema-${this._period}-${rand()}`;
    this.name = `EMA(${this._period})`;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const out = new Float64Array(n);
    const closes = store.close;
    if (n === 0) {
      this._output = out;
      return;
    }

    // Warm-up: mask first period-1, seed at index period-1 with SMA.
    if (n < this._period) {
      out.fill(NaN);
      this._output = out;
      return;
    }
    for (let i = 0; i < this._period - 1; i++) out[i] = NaN;
    let sum = 0;
    for (let i = 0; i < this._period; i++) sum += closes[i]!;
    out[this._period - 1] = sum / this._period;
    for (let i = this._period; i < n; i++) {
      out[i] = this._alpha * closes[i]! + (1 - this._alpha) * out[i - 1]!;
    }
    this._output = out;
  }

  updateLast(store: BarStore): void {
    const n = store.length;
    if (n === 0) return;
    this._output = growToLength(this._output, n);
    const i = n - 1;
    if (i < this._period - 1) {
      this._output[i] = NaN;
      return;
    }
    if (i === this._period - 1) {
      // Re-seed from SMA at the warm-up boundary.
      let sum = 0;
      for (let k = 0; k < this._period; k++) sum += store.close[k]!;
      this._output[i] = sum / this._period;
      return;
    }
    const prev = this._output[i - 1]!;
    const close = store.close[i]!;
    this._output[i] = Number.isNaN(prev)
      ? close // resilience: if prev is NaN for any reason, anchor here
      : this._alpha * close + (1 - this._alpha) * prev;
  }

  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null {
    return rangeOf(this._output, fromIdx, toIdx);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    fromIdx: number,
    toIdx: number,
    _chartW: number,
    _paneHeight: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    _theme: Theme,
  ): void {
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
