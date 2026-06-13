import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
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
export declare class ATR implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId: string;
    readonly overlays = false;
    private readonly _period;
    private readonly _color;
    private _output;
    constructor(opts?: ATROptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, _chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, _theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=ATR.d.ts.map