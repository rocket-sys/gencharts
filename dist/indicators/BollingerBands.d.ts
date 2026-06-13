import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface BollingerOptions {
    period?: number;
    stddev?: number;
    color?: string;
    id?: string;
}
/**
 * Bollinger Bands. Overlays on the main pane.
 *
 *   middle[i] = SMA(close, period)
 *   σ[i]      = stddev(close[i-period+1 .. i])
 *   upper[i]  = middle[i] + stddevMultiplier · σ[i]
 *   lower[i]  = middle[i] − stddevMultiplier · σ[i]
 *
 * Render: three lines (upper/middle/lower) plus a low-opacity fill between
 * upper and lower so the band reads as a region rather than three loose
 * lines. The fill path walks the upper line forward then the lower line
 * backward, joining them into a single closed shape; NaN-aware so the
 * warm-up region doesn't draw a stray triangle back to the origin.
 */
export declare class BollingerBands implements Indicator {
    readonly id: string;
    readonly name: string;
    readonly paneId = "main";
    readonly overlays = true;
    private readonly _period;
    private readonly _stddev;
    private readonly _color;
    private _upper;
    private _middle;
    private _lower;
    constructor(opts?: BollingerOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, _chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, _theme: Theme): void;
    private _fillSegment;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=BollingerBands.d.ts.map