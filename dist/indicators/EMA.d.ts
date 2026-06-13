import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
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
export declare class EMA implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId = "main";
    readonly overlays = true;
    private readonly _period;
    private readonly _color;
    private readonly _alpha;
    private _output;
    constructor(opts?: EMAOptions);
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
//# sourceMappingURL=EMA.d.ts.map