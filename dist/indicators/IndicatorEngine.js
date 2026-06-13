/**
 * IndicatorEngine — owns the list of attached indicators and the operations
 * the chart needs to drive them: bulk recompute, incremental tick update,
 * pane-range merging for auto-fit, and per-pane drawing.
 *
 * The engine itself is unaware of panes — it stores indicators flat and
 * filters by `paneId` on each query. PaneManager owns layout; this owns
 * computation and rendering of the indicator content.
 */
export class IndicatorEngine {
    constructor() {
        this._indicators = [];
    }
    add(indicator, store) {
        this._indicators.push(indicator);
        indicator.recompute(store);
    }
    remove(id) {
        this._indicators = this._indicators.filter((i) => i.id !== id);
    }
    clear() {
        this._indicators = [];
    }
    list() {
        return this._indicators;
    }
    recomputeAll(store) {
        for (const ind of this._indicators)
            ind.recompute(store);
    }
    updateLast(store) {
        for (const ind of this._indicators)
            ind.updateLast(store);
    }
    /**
     * Distinct pane IDs that need their own sub-pane (i.e., not overlays).
     * Order matches insertion order of indicators — first RSI added gets
     * the top sub-pane slot, first MACD added gets the next, and so on.
     */
    uniqueSubPaneIds() {
        const ids = [];
        const seen = new Set();
        for (const ind of this._indicators) {
            if (ind.overlays)
                continue;
            if (seen.has(ind.paneId))
                continue;
            seen.add(ind.paneId);
            ids.push(ind.paneId);
        }
        return ids;
    }
    /** Merged y-range across all indicators on a given pane. */
    getPaneRange(paneId, fromIdx, toIdx) {
        let min = Infinity;
        let max = -Infinity;
        let found = false;
        for (const ind of this._indicators) {
            if (ind.paneId !== paneId)
                continue;
            const r = ind.getValueRange(fromIdx, toIdx);
            if (!r)
                continue;
            if (r.min < min)
                min = r.min;
            if (r.max > max)
                max = r.max;
            found = true;
        }
        return found ? { min, max } : null;
    }
    /** All indicators on a given pane (for the legend). */
    indicatorsForPane(paneId) {
        return this._indicators.filter((i) => i.paneId === paneId);
    }
    /** Render every indicator that targets `paneId`. */
    drawPane(ctx, paneId, fromIdx, toIdx, chartW, paneHeight, timeScale, priceScale, theme) {
        for (const ind of this._indicators) {
            if (ind.paneId !== paneId)
                continue;
            ind.draw(ctx, fromIdx, toIdx, chartW, paneHeight, timeScale, priceScale, theme);
        }
    }
}
//# sourceMappingURL=IndicatorEngine.js.map