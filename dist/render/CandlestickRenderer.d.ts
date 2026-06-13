import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';
/**
 * CandlestickRenderer — draws OHLC candles into the 'main' canvas layer.
 *
 * Performance notes:
 *   - Reads typed-array views directly from BarStore. No object allocation
 *     per bar; the hot loop is plain numeric math.
 *   - Bars are batched by direction (bull vs bear) so the canvas state
 *     (strokeStyle, fillStyle) is set twice per frame, not per bar.
 *   - Wicks are drawn in a single beginPath/stroke pass per color.
 *   - At sub-3px bar spacing the candle body becomes invisible — we fall
 *     back to a 1px vertical line in the bar's color (matches TradingView).
 *
 * Crisp 1px strokes require x + 0.5 alignment (canvas spec: lines are drawn
 * centered on the coordinate, so a 1px stroke at x=10 covers x=9.5 to x=10.5,
 * which means both pixel column 9 and 10 get 50% coverage — fuzzy). x + 0.5
 * snaps the line onto a single pixel column.
 */
export declare class CandlestickRenderer {
    private _store;
    private _timeScale;
    private _priceScale;
    constructor(_store: BarStore, _timeScale: TimeScale, _priceScale: PriceScale);
    draw(ctx: CanvasRenderingContext2D, theme: Theme): void;
    private _drawGroup;
}
//# sourceMappingURL=CandlestickRenderer.d.ts.map