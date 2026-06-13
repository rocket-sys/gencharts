import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import type { Indicator } from './types';
export interface OBVOptions {
    color?: string;
    id?: string;
}
/**
 * On-Balance Volume. Cumulative signed volume — runs up on up-close bars,
 * down on down-close bars, holds steady on dojis.
 *
 *   OBV[0]      = 0
 *   OBV[i > 0]  = OBV[i-1] + volume[i]   when close[i] > close[i-1]
 *               | OBV[i-1] − volume[i]   when close[i] < close[i-1]
 *               | OBV[i-1]               when close[i] == close[i-1]
 *
 * Own pane. Range is dynamic — auto-fits to the actual visible OBV values
 * (which can be hundreds of thousands or millions depending on instrument).
 *
 * The classic OBV reading is *divergence*: when price makes a new high but
 * OBV doesn't, distribution is showing through and the high is suspect.
 * Conversely if OBV makes a new high but price doesn't, accumulation is
 * underway and a breakout often follows.
 *
 * updateLast is genuinely O(1) here — OBV at i depends only on OBV at i-1
 * and the new bar's close and volume.
 */
export declare class OBV implements Indicator {
    readonly id: string;
    readonly name = "OBV";
    readonly paneId: string;
    readonly overlays = false;
    private readonly _color;
    private _output;
    constructor(opts?: OBVOptions);
    recompute(store: BarStore): void;
    updateLast(store: BarStore): void;
    getValueRange(fromIdx: number, toIdx: number): {
        min: number;
        max: number;
    } | null;
    draw(ctx: CanvasRenderingContext2D, fromIdx: number, toIdx: number, chartW: number, _paneHeight: number, timeScale: TimeScale, priceScale: PriceScale, theme: Theme): void;
    legendText(): string;
    legendColor(): string;
}
//# sourceMappingURL=OBV.d.ts.map