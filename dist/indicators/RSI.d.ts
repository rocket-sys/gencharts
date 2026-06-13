import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface RSIOptions {
    period?: number;
    color?: string;
    id?: string;
}
/**
 * Relative Strength Index. Lives in its own pane (overlays=false).
 *
 *   change   = close[i] − close[i−1]
 *   gain     = max(change, 0)
 *   loss     = max(−change, 0)
 *   avgGain  = Wilder smoothed gain (period)
 *   avgLoss  = Wilder smoothed loss (period)
 *   RS       = avgGain / avgLoss
 *   RSI      = 100 − 100 / (1 + RS)
 *
 * Wilder's smoothing is an EMA with α = 1/period (rather than 2/(period+1)),
 * which is the canonical RSI calculation. The pane y-range is locked to
 * 0–100 via getValueRange so the 30/70 reference lines stay visible
 * regardless of where the RSI value is hovering.
 *
 * updateLast falls back to full recompute. The smoothing state is small
 * but persisting it cleanly across ticks adds complexity; the practical
 * cost of recomputing on every tick is small (O(n), n ≈ 500 visible bars).
 */
export declare class RSI implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId: string;
    readonly overlays = false;
    private readonly _period;
    private readonly _color;
    private _output;
    constructor(opts?: RSIOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(_fromIdx: number, _toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=RSI.d.ts.map