import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';
/**
 * LineRenderer — draws a continuous line through each bar's close price.
 *
 * Same constructor contract as CandlestickRenderer so ChartEngine can hot-swap
 * them without rebuilding anything.
 */
export declare class LineRenderer {
    private _store;
    private _timeScale;
    private _priceScale;
    constructor(_store: BarStore, _timeScale: TimeScale, _priceScale: PriceScale);
    draw(ctx: CanvasRenderingContext2D, _theme: Theme): void;
}
//# sourceMappingURL=LineRenderer.d.ts.map