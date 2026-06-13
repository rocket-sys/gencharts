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
export class CandlestickRenderer {
    constructor(_store, _timeScale, _priceScale) {
        this._store = _store;
        this._timeScale = _timeScale;
        this._priceScale = _priceScale;
    }
    draw(ctx, theme) {
        const range = this._timeScale.visibleIndices(this._store.length);
        if (!range)
            return;
        const opens = this._store.open;
        const highs = this._store.high;
        const lows = this._store.low;
        const closes = this._store.close;
        const spacing = this._timeScale.barSpacing();
        // Sub-pixel candles: just verticals colored by direction.
        if (spacing < 3) {
            ctx.lineWidth = 1;
            let lastColor = '';
            ctx.beginPath();
            for (let i = range.from; i <= range.to; i++) {
                const color = closes[i] >= opens[i] ? theme.bullColor : theme.bearColor;
                if (color !== lastColor) {
                    if (lastColor)
                        ctx.stroke();
                    ctx.strokeStyle = color;
                    ctx.beginPath();
                    lastColor = color;
                }
                const x = Math.round(this._timeScale.indexToX(i)) + 0.5;
                ctx.moveTo(x, this._priceScale.priceToY(highs[i]));
                ctx.lineTo(x, this._priceScale.priceToY(lows[i]));
            }
            if (lastColor)
                ctx.stroke();
            return;
        }
        // Normal mode: collect bull and bear indices, render each batch as
        // (wicks, bodies) so we only set strokeStyle/fillStyle twice.
        const bullIdx = [];
        const bearIdx = [];
        for (let i = range.from; i <= range.to; i++) {
            if (closes[i] >= opens[i])
                bullIdx.push(i);
            else
                bearIdx.push(i);
        }
        const bodyW = Math.max(1, Math.floor(spacing * 0.7));
        this._drawGroup(ctx, bullIdx, opens, highs, lows, closes, bodyW, theme.bullColor);
        this._drawGroup(ctx, bearIdx, opens, highs, lows, closes, bodyW, theme.bearColor);
    }
    _drawGroup(ctx, indices, opens, highs, lows, closes, bodyW, color) {
        if (indices.length === 0)
            return;
        // Wicks (one beginPath/stroke for the whole group).
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < indices.length; k++) {
            const i = indices[k];
            const x = Math.round(this._timeScale.indexToX(i)) + 0.5;
            ctx.moveTo(x, this._priceScale.priceToY(highs[i]));
            ctx.lineTo(x, this._priceScale.priceToY(lows[i]));
        }
        ctx.stroke();
        // Bodies — one fillStyle, many fillRects.
        ctx.fillStyle = color;
        const half = Math.floor(bodyW / 2);
        for (let k = 0; k < indices.length; k++) {
            const i = indices[k];
            const x = Math.round(this._timeScale.indexToX(i));
            const yO = this._priceScale.priceToY(opens[i]);
            const yC = this._priceScale.priceToY(closes[i]);
            const top = Math.min(yO, yC);
            const h = Math.max(1, Math.abs(yC - yO));
            ctx.fillRect(x - half, top, bodyW, h);
        }
    }
}
//# sourceMappingURL=CandlestickRenderer.js.map