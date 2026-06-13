import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine, growToLength, rangeOf } from './utils';

export interface SMAOptions {
  period?: number;
  color?: string;
  id?: string;
}

/**
 * Simple Moving Average over close. Overlays on the main pane.
 *
 * Computation uses a rolling sum so `recompute` is O(N) regardless of
 * period, and `updateLast` is O(period) (just sum the last `period`
 * closes again). NaN-masked for the first period-1 samples.
 */
export class SMA implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId = 'main';
  readonly overlays = true;

  private readonly _period: number;
  private readonly _color: string;
  private _output: Float64Array = new Float64Array(0);

  constructor(opts: SMAOptions = {}) {
    this._period = opts.period ?? 20;
    this._color = opts.color ?? '#42a5f5';
    this.id = opts.id ?? `sma-${this._period}-${rand()}`;
    this.name = `SMA(${this._period})`;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const out = new Float64Array(n);
    const closes = store.close;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += closes[i]!;
      if (i >= this._period) sum -= closes[i - this._period]!;
      out[i] = i >= this._period - 1 ? sum / this._period : NaN;
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
    let sum = 0;
    for (let k = i - this._period + 1; k <= i; k++) sum += store.close[k]!;
    this._output[i] = sum / this._period;
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
