import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';
/**
 * AreaRenderer — line chart with a gradient fill between the line and the
 * bottom of the pane. Hot-swappable with CandlestickRenderer / LineRenderer.
 *
 * draw() takes an extra chartH param (main pane pixel height) so it can
 * anchor the gradient's bottom stop correctly.
 */
export declare class AreaRenderer {
    private _store;
    private _timeScale;
    private _priceScale;
    constructor(_store: BarStore, _timeScale: TimeScale, _priceScale: PriceScale);
    draw(ctx: CanvasRenderingContext2D, _theme: Theme, chartH: number): void;
}
//# sourceMappingURL=AreaRenderer.d.ts.map