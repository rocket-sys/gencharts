import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme, withAlpha } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine } from './utils';

export interface StochasticOptions {
  /** Lookback for %K (default 14). */
  k?: number;
  /** SMA period for %D (default 3). */
  d?: number;
  /** Slowing — SMA period applied to raw %K before %D (default 3). */
  smooth?: number;
  id?: string;
}

/**
 * Stochastic oscillator (slow stochastic by default).
 *
 *   rawK[i] = 100 × (close[i] − lowestLow(k)) / (highestHigh(k) − lowestLow(k))
 *   %K      = SMA(rawK, smooth)        — "slowing"; set smooth=1 for fast stoch
 *   %D      = SMA(%K, d)               — signal line
 *
 * Own pane, bounded 0–100. Reference lines at 80 (overbought) and 20
 * (oversold) plus a midline at 50, same UX as RSI. Two output lines:
 * %K in blue, %D in orange.
 *
 * If the lookback window is flat (highestHigh == lowestLow), rawK is set to
 * 50 rather than NaN — that's the convention TradingView uses for ambiguous
 * windows and it keeps the line continuous.
 */
export class Stochastic implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId: string;
  readonly overlays = false;

  private readonly _kLookback: number;
  private readonly _dPeriod: number;
  private readonly _smooth: number;
  private _k: Float64Array = new Float64Array(0);
  private _d: Float64Array = new Float64Array(0);

  constructor(opts: StochasticOptions = {}) {
    this._kLookback = opts.k ?? 14;
    this._dPeriod = opts.d ?? 3;
    this._smooth = opts.smooth ?? 3;
    this.id = opts.id ?? `stoch-${this._kLookback}-${this._dPeriod}-${rand()}`;
    this.paneId = this.id;
    this.name = `Stoch(${this._kLookback},${this._dPeriod},${this._smooth})`;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const rawK = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (i < this._kLookback - 1) {
        rawK[i] = NaN;
        continue;
      }
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = i - this._kLookback + 1; k <= i; k++) {
        if (store.low[k]! < lo) lo = store.low[k]!;
        if (store.high[k]! > hi) hi = store.high[k]!;
      }
      const denom = hi - lo;
      rawK[i] = denom === 0 ? 50 : ((store.close[i]! - lo) / denom) * 100;
    }
    this._k = sma(rawK, this._smooth);
    this._d = sma(this._k, this._dPeriod);
  }

  updateLast(store: BarStore): void {
    this.recompute(store);
  }

  getValueRange(_fromIdx: number, _toIdx: number): { min: number; max: number } {
    return { min: 0, max: 100 };
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
    // Reference lines: 80 / 50 / 20.
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = withAlpha('#9598a1', 0.35);
    ctx.beginPath();
    const y80 = Math.round(priceScale.priceToY(80)) + 0.5;
    const y20 = Math.round(priceScale.priceToY(20)) + 0.5;
    ctx.moveTo(0, y80); ctx.lineTo(chartW, y80);
    ctx.moveTo(0, y20); ctx.lineTo(chartW, y20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = withAlpha(theme.axisLine, 0.5);
    const y50 = Math.round(priceScale.priceToY(50)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y50); ctx.lineTo(chartW, y50);
    ctx.stroke();
    ctx.restore();

    drawLine(ctx, this._k, fromIdx, toIdx, timeScale, priceScale, '#2196f3', 1.5);
    drawLine(ctx, this._d, fromIdx, toIdx, timeScale, priceScale, '#ff9800', 1.5);
  }

  legendText(): string {
    return this.name;
  }

  legendColor(): string {
    return '#2196f3';
  }
}

/** SMA over a NaN-aware series (NaN inputs don't poison the rolling window). */
function sma(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = new Float64Array(n);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const v = src[i]!;
    if (!Number.isNaN(v)) { sum += v; count++; }
    if (i >= period) {
      const old = src[i - period]!;
      if (!Number.isNaN(old)) { sum -= old; count--; }
    }
    out[i] = count >= period ? sum / period : NaN;
  }
  return out;
}

function rand(): string {
  return Math.random().toString(36).slice(2, 7);
}
