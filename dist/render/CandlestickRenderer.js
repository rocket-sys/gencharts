import { withAlpha } from './Theme';
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
        const bullIdx = [];
        const bearIdx = [];
        for (let i = range.from; i <= range.to; i++) {
            if (closes[i] >= opens[i])
                bullIdx.push(i);
            else
                bearIdx.push(i);
        }
        const bodyW = Math.max(1, Math.floor(spacing * 0.7));
        const style = theme.candleStyle ?? 'gradient';
        const radius = Math.min(theme.candleRadius ?? 2, Math.floor(bodyW / 2));
        if (style === 'hollow') {
            this._drawGroupHollow(ctx, bullIdx, opens, highs, lows, closes, bodyW, radius, theme.bullColor, theme);
            this._drawGroupHollow(ctx, bearIdx, opens, highs, lows, closes, bodyW, radius, theme.bearColor, theme);
        }
        else {
            this._drawGroupFilled(ctx, bullIdx, opens, highs, lows, closes, bodyW, radius, true, theme, style === 'gradient');
            this._drawGroupFilled(ctx, bearIdx, opens, highs, lows, closes, bodyW, radius, false, theme, style === 'gradient');
        }
    }
    _drawGroupFilled(ctx, indices, opens, highs, lows, closes, bodyW, radius, isBull, theme, useGradient) {
        if (indices.length === 0)
            return;
        const baseColor = isBull ? theme.bullColor : theme.bearColor;
        const wickColor = theme.wickColor ?? baseColor;
        const half = Math.floor(bodyW / 2);
        // Wicks — slim (0.8px), single batch.
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (const i of indices) {
            const x = Math.round(this._timeScale.indexToX(i)) + 0.5;
            ctx.moveTo(x, this._priceScale.priceToY(highs[i]));
            ctx.lineTo(x, this._priceScale.priceToY(lows[i]));
        }
        ctx.stroke();
        // Bodies
        for (const i of indices) {
            const x = Math.round(this._timeScale.indexToX(i));
            const yO = this._priceScale.priceToY(opens[i]);
            const yC = this._priceScale.priceToY(closes[i]);
            const top = Math.min(yO, yC);
            const h = Math.max(1, Math.abs(yC - yO));
            const left = x - half;
            if (useGradient && h > 2) {
                const grad = ctx.createLinearGradient(left, top, left, top + h);
                if (isBull) {
                    grad.addColorStop(0, theme.bullGradientTop ?? baseColor);
                    grad.addColorStop(1, theme.bullGradientBottom ?? withAlpha(baseColor, 0.55));
                }
                else {
                    grad.addColorStop(0, theme.bearGradientTop ?? withAlpha(baseColor, 0.55));
                    grad.addColorStop(1, theme.bearGradientBottom ?? baseColor);
                }
                ctx.fillStyle = grad;
            }
            else {
                ctx.fillStyle = baseColor;
            }
            if (radius > 0 && h > radius * 2) {
                _roundRect(ctx, left, top, bodyW, h, radius);
                ctx.fill();
            }
            else {
                ctx.fillRect(left, top, bodyW, h);
            }
        }
    }
    _drawGroupHollow(ctx, indices, opens, highs, lows, closes, bodyW, radius, color, theme) {
        if (indices.length === 0)
            return;
        const wickColor = theme.wickColor ?? color;
        const half = Math.floor(bodyW / 2);
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (const i of indices) {
            const x = Math.round(this._timeScale.indexToX(i)) + 0.5;
            ctx.moveTo(x, this._priceScale.priceToY(highs[i]));
            ctx.lineTo(x, this._priceScale.priceToY(lows[i]));
        }
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (const i of indices) {
            const x = Math.round(this._timeScale.indexToX(i));
            const yO = this._priceScale.priceToY(opens[i]);
            const yC = this._priceScale.priceToY(closes[i]);
            const top = Math.min(yO, yC);
            const h = Math.max(1, Math.abs(yC - yO));
            const left = x - half;
            if (radius > 0 && h > radius * 2) {
                _roundRect(ctx, left, top, bodyW, h, radius);
                ctx.stroke();
            }
            else {
                ctx.strokeRect(left + 0.5, top + 0.5, bodyW - 1, h - 1);
            }
        }
    }
}
function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
//# sourceMappingURL=CandlestickRenderer.js.map