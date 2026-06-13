import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine, rangeOf } from './utils';

export interface ATROptions {
  period?: number;
  color?: string;
  id?: string;
}

/**
 * Average True Range. Volatility measure popularized by Wilder.
 *
 *   TR[i]  = max(high − low, |high − prevClose|, |low − prevClose|)
 *   ATR[0..period-1] = NaN (warm-up)
 *   ATR[period-1]    = mean(TR[0..period-1])      seed
 *   ATR[i ≥ period]  = (ATR[i-1] × (period-1) + TR[i]) / period   Wilder
 *
 * Own pane (overlays=false). Range is dynamic and unbounded above — auto-fit
 * uses the actual visible ATR values. Stop-loss sizing rules of thumb often
 * reference ATR (e.g. SL distance = 1.5 × ATR), so it's a workhorse for any
 * volatility-aware system.
 *
 * updateLast does a full recompute. Wilder's smoothing carries running state
 * across the series; persisting the last ATR value cleanly across ticks is
 * doable but the perf savings are tiny at chart-relevant N.
 */
export class ATR implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId: string;
  readonly overlays = false;

  private readonly _period: number;
  private readonly _color: string;
  private _output: Float64Array = new Float64Array(0);

  constructor(opts: ATROptions = {}) {
    this._period = opts.period ?? 14;
    this._color = opts.color ?? '#ff9800';
    this.id = opts.id ?? `atr-${this._period}-${rand()}`;
    this.paneId = this.id;
    this.name = `ATR(${this._period})`;
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const out = new Float64Array(n);
    if (n < 2) {
      out.fill(NaN);
      this._output = out;
      return;
    }

    const tr = new Float64Array(n);
    tr[0] = store.high[0]! - store.low[0]!;
    for (let i = 1; i < n; i++) {
      const h = store.high[i]!;
      const l = store.low[i]!;
      const pc = store.close[i - 1]!;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }

    if (n < this._period) {
      out.fill(NaN);
      this._output = out;
      return;
    }

    let sum = 0;
    for (let i = 0; i < this._period; i++) sum += tr[i]!;
    let atr = sum / this._period;
    for (let i = 0; i < this._period - 1; i++) out[i] = NaN;
    out[this._period - 1] = atr;
    for (let i = this._period; i < n; i++) {
      atr = (atr * (this._period - 1) + tr[i]!) / this._period;
      out[i] = atr;
    }

    this._output = out;
  }

  updateLast(store: BarStore): void {
    this.recompute(store);
  }

  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null {
    const r = rangeOf(this._output, fromIdx, toIdx);
    if (!r) return null;
    // Pad upward so the line doesn't kiss the top of the pane.
    const pad = (r.max - r.min) * 0.1 || r.max * 0.05 || 1e-9;
    return { min: Math.max(0, r.min - pad * 0.3), max: r.max + pad };
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
