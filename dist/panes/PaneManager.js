import { PriceScale } from '../scales/PriceScale';
/**
 * A single pane in the chart. The main pane holds candles + overlay
 * indicators; sub-panes hold studies like RSI / MACD that need their own
 * y-axis. Every pane has its own PriceScale (independent y-axis) but they
 * all share the chart's TimeScale (the x-axis is continuous across panes).
 */
export class Pane {
    constructor(id) {
        this.id = id;
        /** Top y of the pane in chart-area-local coordinates (0 = top of chart). */
        this.top = 0;
        /** Height of the pane in CSS pixels. */
        this.height = 1;
        this.priceScale = new PriceScale();
    }
}
/**
 * PaneManager — owns the vertical stack of panes and their layout.
 *
 * The main pane is always present and always sits at top (y=0). Sub-panes
 * stack below it. The split is weighted: main pane gets MAIN_FRACTION of the
 * usable height when sub-panes exist (and 100% when none do); the remainder
 * is split equally between sub-panes. One pixel between each pair of
 * adjacent panes is reserved for the divider line drawn by BackgroundRenderer.
 *
 * Callers don't manipulate the pane list directly. Instead the IndicatorEngine
 * reports its required sub-pane IDs via uniqueSubPaneIds() and the engine
 * calls syncSubPanes() to bring the layout into alignment. This keeps the
 * pane list as a derived view of "which indicators need their own pane".
 */
export class PaneManager {
    constructor() {
        this._panes = [];
        this._totalHeight = 1;
        this._panes.push(new Pane('main'));
    }
    /** Read-only access to the current pane list (main first, sub-panes after). */
    get panes() {
        return this._panes;
    }
    /** Convenience — the always-present main pane. */
    get main() {
        return this._panes[0];
    }
    getPane(id) {
        return this._panes.find((p) => p.id === id);
    }
    /**
     * Reconcile the pane list with a desired set of sub-pane IDs. Adds any
     * missing ones, removes any obsolete ones, preserves ordering and existing
     * pane instances (so price scale state survives across syncs).
     */
    syncSubPanes(subPaneIds) {
        const keep = new Set(subPaneIds);
        this._panes = this._panes.filter((p) => p.id === 'main' || keep.has(p.id));
        for (const id of subPaneIds) {
            if (!this.getPane(id))
                this._panes.push(new Pane(id));
        }
        this._recompute();
    }
    setTotalHeight(h) {
        this._totalHeight = h;
        this._recompute();
    }
    _recompute() {
        const numSubs = this._panes.length - 1;
        const dividerSpace = numSubs * PaneManager.DIVIDER_PX;
        const usable = Math.max(0, this._totalHeight - dividerSpace);
        let mainH;
        let subH;
        if (numSubs === 0) {
            mainH = usable;
            subH = 0;
        }
        else {
            mainH = Math.floor(usable * PaneManager.MAIN_FRACTION);
            subH = Math.floor((usable - mainH) / numSubs);
        }
        let y = 0;
        for (let i = 0; i < this._panes.length; i++) {
            const pane = this._panes[i];
            const h = pane.id === 'main' ? mainH : subH;
            pane.top = y;
            pane.height = Math.max(1, h);
            pane.priceScale.setSize(pane.height);
            y += pane.height + (i < this._panes.length - 1 ? PaneManager.DIVIDER_PX : 0);
        }
    }
}
PaneManager.MAIN_FRACTION = 0.65;
PaneManager.DIVIDER_PX = 1;
//# sourceMappingURL=PaneManager.js.map