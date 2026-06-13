/**
 * Renders the chart's static frame across all panes: background fill,
 * per-pane horizontal gridlines + price labels, shared vertical gridlines
 * + time labels, axis separators, and pane dividers.
 *
 * Multi-pane behavior:
 *   - Each pane gets its own set of horizontal gridlines and right-gutter
 *     price labels, computed against that pane's PriceScale. So the main
 *     pane shows prices around 1.07xxx while an RSI sub-pane below it
 *     shows 30 / 50 / 70 with the same Heckbert "nice number" scheme.
 *   - Vertical gridlines and time labels are global — they only render once
 *     across the bottom of the full chart area.
 *   - A 1-px divider line draws between adjacent panes so the boundary is
 *     visually unambiguous even when adjacent panes have similar tones.
 *
 * Heckbert's nice-number algorithm is unchanged — it picks step sizes that
 * are 1, 2, or 5 times a power of 10 so every label is a round value.
 */
export class BackgroundRenderer {
    constructor(_timeScale, _paneManager) {
        this._timeScale = _timeScale;
        this._paneManager = _paneManager;
    }
    draw(ctx, width, height, rightGutter, bottomGutter, store, theme, resolution) {
        const chartW = width - rightGutter;
        const chartH = height - bottomGutter;
        // 1. Background fill across everything.
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        // 2. Per-pane horizontal gridlines + price labels.
        for (const pane of this._paneManager.panes) {
            this._drawPaneGrid(ctx, pane.priceScale, pane.top, pane.height, chartW, theme);
        }
        // 3. Pane dividers between adjacent panes.
        if (this._paneManager.panes.length > 1) {
            ctx.strokeStyle = theme.axisLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < this._paneManager.panes.length - 1; i++) {
                const pane = this._paneManager.panes[i];
                const y = Math.round(pane.top + pane.height) + 0.5;
                ctx.moveTo(0, y);
                ctx.lineTo(chartW, y);
            }
            ctx.stroke();
        }
        // 4. Vertical gridlines + time labels (shared across panes).
        const range = this._timeScale.visibleIndices(store.length);
        if (range) {
            const visibleBars = range.to - range.from + 1;
            const tStep = this._timeStep(visibleBars);
            ctx.strokeStyle = theme.grid;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const firstTick = Math.ceil(range.from / tStep) * tStep;
            for (let i = firstTick; i <= range.to; i += tStep) {
                const x = Math.round(this._timeScale.indexToX(i)) + 0.5;
                if (x < 0 || x > chartW)
                    continue;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, chartH);
            }
            ctx.stroke();
            ctx.fillStyle = theme.axisText;
            ctx.textAlign = 'center';
            for (let i = firstTick; i <= range.to; i += tStep) {
                const x = this._timeScale.indexToX(i);
                if (x < 0 || x > chartW)
                    continue;
                const t = store.time[i];
                if (t === undefined)
                    continue;
                ctx.fillText(this._formatTime(t, resolution), x, chartH + 12);
            }
        }
        // 5. Axis separator lines (right and bottom edges of the chart area).
        ctx.strokeStyle = theme.axisLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartW + 0.5, 0);
        ctx.lineTo(chartW + 0.5, chartH);
        ctx.moveTo(0, chartH + 0.5);
        ctx.lineTo(chartW, chartH + 0.5);
        ctx.stroke();
        // 6. Replay cursor accent. When replay is active, draw a subtle vertical
        // line at the cursor (the last visible bar) so the user has an explicit
        // visual anchor for "where now is" in their replay session.
        if (store.isReplaying && store.length > 0) {
            const cursorX = Math.round(this._timeScale.indexToX(store.length - 1)) + 0.5;
            if (cursorX >= 0 && cursorX <= chartW) {
                ctx.save();
                ctx.strokeStyle = '#2962ff';
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(cursorX, 0);
                ctx.lineTo(cursorX, chartH);
                ctx.stroke();
                ctx.restore();
                // "REPLAY" label on the right at the top.
                ctx.fillStyle = '#2962ff';
                ctx.font = 'bold 10px system-ui, -apple-system, "Segoe UI", sans-serif';
                ctx.textBaseline = 'top';
                ctx.textAlign = 'left';
                ctx.fillText('REPLAY', cursorX + 4, 4);
            }
        }
    }
    _drawPaneGrid(ctx, priceScale, paneTop, paneHeight, chartW, theme) {
        const min = priceScale.min;
        const max = priceScale.max;
        if (!isFinite(min) || !isFinite(max) || min >= max)
            return;
        const step = this._niceStep(min, max, Math.max(2, Math.floor(paneHeight / 60)));
        const decimals = this._priceDecimals(step);
        const first = Math.ceil(min / step) * step;
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let p = first; p <= max; p += step) {
            // priceToY is pane-local; offset by paneTop for absolute y.
            const y = Math.round(paneTop + priceScale.priceToY(p)) + 0.5;
            if (y < paneTop || y > paneTop + paneHeight)
                continue;
            ctx.moveTo(0, y);
            ctx.lineTo(chartW, y);
        }
        ctx.stroke();
        ctx.fillStyle = theme.axisText;
        ctx.textAlign = 'left';
        for (let p = first; p <= max; p += step) {
            const y = paneTop + priceScale.priceToY(p);
            if (y < paneTop || y > paneTop + paneHeight)
                continue;
            ctx.fillText(p.toFixed(decimals), chartW + 6, y);
        }
    }
    /** Heckbert's nice-number algorithm; round step to 1, 2, or 5 × 10ⁿ. */
    _niceStep(min, max, targetCount) {
        const range = max - min;
        if (range <= 0)
            return 1;
        const rough = range / Math.max(1, targetCount);
        const exp = Math.floor(Math.log10(rough));
        const frac = rough / Math.pow(10, exp);
        let nice;
        if (frac < 1.5)
            nice = 1;
        else if (frac < 3)
            nice = 2;
        else if (frac < 7)
            nice = 5;
        else
            nice = 10;
        return nice * Math.pow(10, exp);
    }
    _priceDecimals(step) {
        if (step >= 1)
            return 0;
        return Math.min(8, Math.max(0, Math.ceil(-Math.log10(step))));
    }
    _timeStep(visibleBars) {
        if (visibleBars < 20)
            return 2;
        if (visibleBars < 50)
            return 5;
        if (visibleBars < 120)
            return 10;
        if (visibleBars < 300)
            return 25;
        if (visibleBars < 700)
            return 50;
        return 100;
    }
    _formatTime(epochMs, resolution) {
        const d = new Date(epochMs);
        const isDailyOrHigher = resolution === '1D' || resolution === '1W' || resolution === '1M';
        if (isDailyOrHigher) {
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
}
//# sourceMappingURL=BackgroundRenderer.js.map