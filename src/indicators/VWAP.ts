import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
import { drawLine, rangeOf } from './utils';

export interface VWAPOptions {
  color?: string;
  /**
   * If true (default) the cumulative resets at each UTC midnight, producing
   * the conventional "session VWAP" that most intraday traders watch.
   * Set to false for a fully cumulative VWAP that runs across all loaded
   * history — useful for swing/positional context but rarely day-traded.
   */
  resetDaily?: boolean;
  id?: string;
}

/**
 * Volume Weighted Average Price.
 *
 *   typical[i] = (high + low + close) / 3
 *   VWAP[i]    = Σ(typical × volume) / Σ(volume)        cumulative from session start
 *
 * Overlay on the main pane — same scale as the candles. Session-reset
 * boundaries fall at UTC midnight; intraday traders typically use VWAP as a
 * dynamic mean reversion / fair value reference within each session, so the
 * reset matters.
 *
 * If volume is missing or zero on a bar, the indicator simply doesn't
 * advance the cumulative — VWAP stays at its previous value until real
 * volume comes through. This is the right behavior for FX feeds that
 * sometimes report 0 volume on light bars.
 */
export class VWAP implements Indicator {
  readonly id: string;
  readonly name: string;
  readonly paneId = 'main';
  readonly overlays = true;

  private readonly _color: string;
  private readonly _resetDaily: boolean;
  private _output: Float64Array = new Float64Array(0);

  constructor(opts: VWAPOptions = {}) {
    this._color = opts.color ?? '#ff9800';
    this._resetDaily = opts.resetDaily ?? true;
    this.id = opts.id ?? `vwap-${rand()}`;
    this.name = this._resetDaily ? 'VWAP' : 'VWAP (cum)';
  }

  recompute(store: BarStore): void {
    const n = store.length;
    const out = new Float64Array(n);
    if (n === 0) {
      this._output = out;
      return;
    }

    const DAY_MS = 86_400_000;
    let cumPV = 0;
    let cumV = 0;
    let lastDay = Math.floor(store.time[0]! / DAY_MS);

    for (let i = 0; i < n; i++) {
      if (this._resetDaily) {
        const day = Math.floor(store.time[i]! / DAY_MS);
        if (day !== lastDay) {
          cumPV = 0;
          cumV = 0;
          lastDay = day;
        }
      }
      const typical = (store.high[i]! + store.low[i]! + store.close[i]!) / 3;
      const vol = store.volume[i]!;
      if (vol > 0) {
        cumPV += typical * vol;
        cumV += vol;
      }
      out[i] = cumV > 0 ? cumPV / cumV : NaN;
    }

    this._output = out;
  }

  updateLast(store: BarStore): void {
    // Cumulative state is series-wide, so an incremental update would need
    // to thread the previous session's running totals across calls. Full
    // recompute is correct and cheap.
    this.recompute(store);
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
