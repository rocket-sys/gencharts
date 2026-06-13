import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme, withAlpha } from '../render/Theme';
import type { Indicator } from './types';

export interface VolumeOptions {
  /** Color override for bullish (up-close) volume bars. */
  bullColor?: string;
  /** Color override for bearish (down-close) volume bars. */
  bearColor?: string;
  id?: string;
}

/**
 * Volume — vertical bars in a sub-pane, one per bar, colored by candle
 * direction (close ≥ open → bull color, close < open → bear color).
 *
 * Unlike the other indicators, Volume has no precomputed output of its own —
 * the data is already in `BarStore.volume`. It just caches the store
 * reference at recompute time and reads through to it on draw and on
 * getValueRange. This keeps the indicator stateless from a memory standpoint
 * and means the bars stay aligned with the candles even after ticks (no
 * intermediate buffer to keep in sync).
 *
 * Pane y-range adapts to the visible window's max volume with a 5% headroom
 * so the tallest bar doesn't kiss the top edge of the pane.
 */
export class Volume implements Indicator {
  readonly id: string;
  readonly name = 'Volume';
  readonly paneId: string;
  readonly overlays = false;

  private readonly _bullColor: string;
  private readonly _bearColor: string;
  private _store: BarStore | null = null;

  constructor(opts: VolumeOptions = {}) {
    this._bullColor = opts.bullColor ?? '#26a69a';
    this._bearColor = opts.bearColor ?? '#ef5350';
    this.id = opts.id ?? `volume-${rand()}`;
    this.paneId = this.id;
  }

  recompute(store: BarStore): void {
    this._store = store;
  }

  updateLast(store: BarStore): void {
    this._store = store;
  }

  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null {
    if (!this._store) return null;
    const vols = this._store.volume;
    let max = 0;
    const end = Math.min(toIdx, vols.length - 1);
    for (let i = Math.max(0, fromIdx); i <= end; i++) {
      const v = vols[i]!;
      if (v > max) max = v;
    }
    return max > 0 ? { min: 0, max: max * 1.05 } : null;
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
    if (!this._store) return;
    const vols = this._store.volume;
    const opens = this._store.open;
    const closes = this._store.close;
    const barW = Math.max(1, Math.floor(timeScale.barSpacing() * 0.7));
    const halfBar = Math.floor(barW / 2);
    const yZero = priceScale.priceToY(0);
    const end = Math.min(toIdx, vols.length - 1);

    for (let i = Math.max(0, fromIdx); i <= end; i++) {
      const v = vols[i]!;
      if (v === 0) continue;
      const x = Math.round(timeScale.indexToX(i));
      const yTop = priceScale.priceToY(v);
      const h = Math.max(1, Math.abs(yZero - yTop));
      const top = Math.min(yZero, yTop);
      const isUp = closes[i]! >= opens[i]!;
      ctx.fillStyle = withAlpha(isUp ? this._bullColor : this._bearColor, 0.65);
      ctx.fillRect(x - halfBar, top, barW, h);
    }
  }

  legendText(): string {
    return this.name;
  }

  legendColor(): string {
    return this._bullColor;
  }
}

function rand(): string {
  return Math.random().toString(36).slice(2, 7);
}
