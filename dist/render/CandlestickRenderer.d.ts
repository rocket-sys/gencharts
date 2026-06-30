import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import type { Theme } from './Theme';
/**
 * CandlestickRenderer — draws OHLC candles into the 'main' canvas layer.
 *
 * Three visual modes driven by theme.candleStyle:
 *   'solid'    — flat fill, square corners (classic TradingView look)
 *   'gradient' — vertical linear gradient body + rounded corners
 *   'hollow'   — outline-only bodies (popular for low-noise reading)
 *
 * Performance notes:
 *   - Reads typed-array views directly from BarStore. No object allocation
 *     per bar; the hot loop is plain numeric math.
 *   - In solid/gradient mode bars are batched by direction so fillStyle is
 *     set twice per frame. Gradients are cached once per frame per color group.
 *   - Wicks are drawn in a single beginPath/stroke pass per color.
 *   - At sub-3px bar spacing the candle body becomes invisible — we fall
 *     back to a 1px vertical line in the bar's color (matches TradingView).
 */
export declare class CandlestickRenderer {
    private _store;
    private _timeScale;
    private _priceScale;
    constructor(_store: BarStore, _timeScale: TimeScale, _priceScale: PriceScale);
    draw(ctx: CanvasRenderingContext2D, theme: Theme): void;
    private _drawGroupFilled;
    private _drawGroupHollow;
}
//# sourceMappingURL=CandlestickRenderer.d.ts.map