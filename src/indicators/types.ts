import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';

/**
 * The contract every indicator (built-in or user-supplied) implements.
 *
 * Two computation hooks:
 *   - `recompute(store)` builds the entire output series from scratch.
 *     Called once on `add`, and again on `'append'` data events (which
 *     includes lazy history loads, symbol changes, and new-bar appends).
 *   - `updateLast(store)` updates only the trailing output value. Called on
 *     every `'tick'` event. Implementations that don't have a cheap
 *     incremental update may simply call `this.recompute(store)`.
 *
 * `getValueRange` returns the y-extents the indicator wants visible inside
 * its pane. For bounded indicators (RSI returns {0,100}) this stays fixed;
 * for unbounded ones (MACD) it adapts to the visible bars with a small pad.
 * The engine merges ranges across indicators sharing a pane and feeds the
 * result to that pane's PriceScale.
 *
 * `draw` runs inside a canvas already translated so y=0 is the pane top and
 * clipped to the pane's bounds. The price scale passed in is the pane's
 * own; values flow through `priceScale.priceToY(value)` and land at the
 * right vertical position automatically.
 */
export interface Indicator {
  /** Unique id within the chart (used for remove/update lookups). */
  readonly id: string;
  /** Human-readable display name, e.g. "SMA(20)". Shown in the legend. */
  readonly name: string;
  /** Which pane this draws into. 'main' for overlays; unique id otherwise. */
  readonly paneId: string;
  /** True when the indicator overlays the price pane (moving averages, BB). */
  readonly overlays: boolean;

  recompute(store: BarStore): void;
  updateLast(store: BarStore): void;

  /** Y-range to fit in the pane. Null when no usable data is available. */
  getValueRange(fromIdx: number, toIdx: number): { min: number; max: number } | null;

  /**
   * Render the indicator. Caller has already saved the context, clipped to
   * the pane bounds, and translated so (0, 0) is the pane's top-left.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    fromIdx: number,
    toIdx: number,
    chartW: number,
    paneHeight: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    theme: Theme,
  ): void;

  /** Text shown in the pane's legend. Defaults to `name`. */
  legendText?(): string;
  /** Marker color for the legend dot. */
  legendColor?(): string;
}
