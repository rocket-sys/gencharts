import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from '../render/Theme';
import type { Indicator } from './types';
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
export declare class SMA implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId = "main";
    readonly overlays = true;
    private readonly _period;
    private readonly _color;
    private _output;
    constructor(opts?: SMAOptions);
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
//# sourceMappingURL=SMA.d.ts.map