import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
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
export declare class Stochastic implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId: string;
    readonly overlays = false;
    private readonly _kLookback;
    private readonly _dPeriod;
    private readonly _smooth;
    private _k;
    private _d;
    constructor(opts?: StochasticOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(_fromIdx: number, _toIdx: number): {
        min: number;
        max: number;
    };
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=Stochastic.d.ts.map