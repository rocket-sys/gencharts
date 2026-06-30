import { BarStore } from './data/BarStore';
import { Surface } from './render/Surface';
import { TimeScale } from './scales/TimeScale';
import { xToTime } from './scales/timeMap';
import { PaneManager } from './panes/PaneManager';
import { BackgroundRenderer } from './render/BackgroundRenderer';
import { CandlestickRenderer } from './render/CandlestickRenderer';
import { LineRenderer } from './render/LineRenderer';
import { AreaRenderer } from './render/AreaRenderer';
import { CrosshairRenderer } from './render/CrosshairRenderer';
import { InputController } from './input/InputController';
import { DrawingLayer } from './drawings/DrawingLayer';
import { DrawingToolbar } from './drawings/DrawingToolbar';
import { IndicatorEngine } from './indicators/IndicatorEngine';
import { ReplayController } from './replay/ReplayController';
import { ReplayToolbar } from './replay/ReplayToolbar';
import { getTheme, applyTheme } from './render/Theme';
import { SymbolBar } from './ui/SymbolBar';
import { IndicatorPanel } from './ui/IndicatorPanel';
import { AlertLayer } from './alerts/AlertLayer';
const RIGHT_GUTTER = 70;
const BOTTOM_GUTTER = 26;
const INITIAL_BARS_TO_LOAD = 500;
const INITIAL_VISIBLE_BARS = 120;
const HISTORY_FETCH_COUNT = 500;
const LAZY_LOAD_THRESHOLD = 100;
function resolutionToMs(r) {
    switch (r) {
        case '1': return 60000;
        case '3': return 180000;
        case '5': return 300000;
        case '15': return 900000;
        case '30': return 1800000;
        case '60': return 3600000;
        case '240': return 14400000;
        case '1D': return 86400000;
        case '1W': return 604800000;
        case '1M': return 30 * 86400000;
    }
}
/**
 * ChartEngine — the main entry point for gencharts.
 *
 * Mounts a full-featured financial chart into a container element. Drives data
 * entirely through the DatafeedAdapter contract — supply any live or historical
 * source (WebSocket, REST, CSV) by implementing three methods.
 *
 * Features: candlestick / line / area chart, 11 built-in indicators,
 * drawing tools (trendlines, Fibonacci, rectangles, horizontal/vertical lines),
 * historical replay mode, price alerts, and infinite lazy-load of history.
 */
export class ChartEngine {
    constructor(options) {
        this._symbol = null;
        this._subscription = null;
        this._surfaceUnsubscribe = null;
        this._storeUnsubscribe = null;
        this._rightLocked = true;
        this._priceDecimals = 2;
        this._isFetchingHistory = false;
        this._noMoreHistory = false;
        this._lastClose = null;
        this._options = options;
        this._datafeed = options.datafeed;
        this._resolution = options.resolution;
        this._theme = getTheme(options.theme ?? 'dark');
        this._surface = new Surface(options.container);
        this._store = new BarStore();
        this._timeScale = new TimeScale();
        this._paneManager = new PaneManager();
        this._indicators = new IndicatorEngine();
        this._background = new BackgroundRenderer(this._timeScale, this._paneManager);
        this._chartType = options.chartType ?? 'candlestick';
        this._candles = new CandlestickRenderer(this._store, this._timeScale, this._paneManager.main.priceScale);
        this._lineRenderer = new LineRenderer(this._store, this._timeScale, this._paneManager.main.priceScale);
        this._areaRenderer = new AreaRenderer(this._store, this._timeScale, this._paneManager.main.priceScale);
        this._crosshair = new CrosshairRenderer();
        this._drawings = new DrawingLayer();
        this._drawings.setChangeListener(() => {
            this._toolbar.setActiveTool(this._drawings.getActiveTool());
            this._surface.getLayer('drawings').invalidate();
        });
        this._toolbar = new DrawingToolbar(options.container, (event) => {
            if (event.type === 'tool') {
                this._drawings.setActiveTool(event.tool);
            }
            else if (event.type === 'delete-all') {
                this._drawings.clear();
            }
        });
        this._replay = new ReplayController(this._store);
        this._replayToolbar = new ReplayToolbar(options.container, this._replay);
        this._indicatorPanel = new IndicatorPanel({
            container: options.container,
            onAdd: (ind) => this.addIndicator(ind),
            onRemove: (id) => this.removeIndicator(id),
            listIndicators: () => this.listIndicators(),
        });
        this._alertLayer = new AlertLayer(options.container);
        this._symbolBar = new SymbolBar({
            container: options.container,
            symbol: options.symbol,
            resolution: options.resolution,
            chartType: this._chartType,
            symbols: options.symbols,
            onSymbolChange: (sym) => { void this.setSymbol(sym); },
            onResolutionChange: (res) => { void this.setResolution(res); },
            onChartTypeChange: (type) => { this.setChartType(type); },
            onOpenIndicators: () => this._indicatorPanel.open(),
        });
        this._timeScale.setSize(this._surface.width - RIGHT_GUTTER);
        this._paneManager.setTotalHeight(this._surface.height - BOTTOM_GUTTER);
        this._surfaceUnsubscribe = this._surface.subscribe({
            onResize: (w, h) => this._handleResize(w, h),
            onRender: (layer, ctx, w, h) => this._handleRender(layer, ctx, w, h),
        });
        this._storeUnsubscribe = this._store.onChange((event) => this._handleDataChange(event));
        this._input = new InputController(options.container, {
            hitTest: (x, y) => this._hitTest(x, y),
            onPan: (dx, _dy) => this._handlePan(dx),
            onZoom: (factor, anchorX) => this._handleZoom(factor, anchorX),
            onHover: (x, y) => this._handleHover(x, y),
            onPriceAxisDrag: (dy, anchorY) => this._handlePriceAxisDrag(dy, anchorY),
            onTimeAxisDrag: (dx) => this._handleTimeAxisDrag(dx),
            onTargetDragStart: (_target, _x, _y) => { },
            onTargetDrag: (_target, _x, _y) => { },
            onTargetDragEnd: (target, _x, _y, moved) => { void this._handleTargetDragEnd(target, moved); },
            onContextMenu: (x, y) => this._handleContextMenu(x, y),
            isDrawingToolActive: () => this._drawings.getActiveTool() !== null,
            onDrawingClick: (x, y) => this._handleDrawingClick(x, y),
            onDrawingHover: (x, y) => this._handleDrawingHover(x, y),
        }, RIGHT_GUTTER, BOTTOM_GUTTER);
        void this._bootstrap();
    }
    // ---- Public API ----
    async setSymbol(symbolName) {
        this._symbol = await this._datafeed.resolveSymbol(symbolName);
        this._priceDecimals = priceDecimalsFor(this._symbol.pricescale);
        this._symbolBar.setSymbol(this._symbol.symbol);
        await this._restartFeed();
    }
    async setResolution(resolution) {
        this._resolution = resolution;
        this._symbolBar.setResolution(resolution);
        await this._restartFeed();
    }
    setChartType(type) {
        this._chartType = type;
        this._symbolBar.setChartType(type);
        this._surface.getLayer('main').invalidate();
    }
    /** Hot-swap the datafeed. Restarts the data pipeline for the current symbol + resolution. */
    setDatafeed(datafeed) {
        this._datafeed = datafeed;
        void this._restartFeed();
    }
    setTheme(theme) {
        this._theme = getTheme(theme);
        this._surface.invalidateAll();
    }
    /** Merge partial overrides onto the current theme. */
    setCustomTheme(overrides) {
        this._theme = applyTheme(this._theme, overrides);
        this._surface.invalidateAll();
    }
    /** Set the visible bar index range directly (used by sync receiver). */
    setViewport(fromIndex, toIndex) {
        this._timeScale.setVisibleRange(fromIndex, toIndex);
        this._rightLocked = false;
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    /** Return a serializable snapshot of current chart state (used by ChartSync). */
    getSnapshot() {
        return {
            symbol: this._symbol?.symbol ?? '',
            resolution: this._resolution,
            chartType: this._chartType,
            viewport: { from: this._timeScale.from, to: this._timeScale.to },
            drawings: this.listDrawings(),
            alerts: [...this.listAlerts()],
        };
    }
    /** List all current drawings (for sync). */
    listDrawings() {
        return this._drawings.list();
    }
    scrollToRealtime() {
        this._timeScale.scrollToLatest(this._store.length);
        this._rightLocked = true;
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    // ---- Drawing API ----
    setDrawingTool(tool) {
        this._drawings.setActiveTool(tool);
    }
    addDrawing(drawing) {
        this._drawings.add(drawing);
    }
    removeDrawing(id) {
        this._drawings.remove(id);
    }
    clearDrawings() {
        this._drawings.clear();
    }
    // ---- Indicator API ----
    addIndicator(indicator) {
        this._indicators.add(indicator, this._store);
        this._paneManager.syncSubPanes(this._indicators.uniqueSubPaneIds());
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    removeIndicator(id) {
        this._indicators.remove(id);
        this._paneManager.syncSubPanes(this._indicators.uniqueSubPaneIds());
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    clearIndicators() {
        this._indicators.clear();
        this._paneManager.syncSubPanes([]);
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    listIndicators() {
        return this._indicators.list();
    }
    // ---- Replay API ----
    enterReplay(cursor) {
        this._replay.enter(cursor);
        if (this._rightLocked) {
            this._timeScale.scrollToLatest(this._store.length);
        }
        this._surface.invalidateAll();
    }
    exitReplay() {
        this._replay.exit();
        this._surface.invalidateAll();
    }
    setReplayCursor(cursor) {
        this._replay.setCursor(cursor);
    }
    stepReplay(delta) {
        if (delta > 0)
            this._replay.stepForward();
        else
            this._replay.stepBackward();
    }
    playReplay(speed) {
        if (speed !== undefined)
            this._replay.setSpeed(speed);
        this._replay.play();
    }
    pauseReplay() {
        this._replay.pause();
    }
    onReplayStateChange(listener) {
        return this._replay.onStateChange(listener);
    }
    get isReplaying() {
        return this._store.isReplaying;
    }
    // ---- Alert API ----
    addAlert(price, condition, label) {
        const alert = this._alertLayer.add(price, condition, label);
        this._surface.getLayer('trading').invalidate();
        return alert;
    }
    removeAlert(id) {
        this._alertLayer.remove(id);
        this._surface.getLayer('trading').invalidate();
    }
    clearAlerts() {
        this._alertLayer.clear();
        this._surface.getLayer('trading').invalidate();
    }
    listAlerts() {
        return this._alertLayer.list();
    }
    onAlertFired(cb) {
        this._alertLayer.onAlertFired(cb);
    }
    destroy() {
        this._subscription?.unsubscribe();
        this._surfaceUnsubscribe?.();
        this._storeUnsubscribe?.();
        this._input.destroy();
        this._toolbar.destroy();
        this._replayToolbar.destroy();
        this._symbolBar.destroy();
        this._indicatorPanel.destroy();
        this._replay.destroy();
        this._surface.destroy();
    }
    // ---- Bootstrap / feed lifecycle ----
    async _bootstrap() {
        this._symbol = await this._datafeed.resolveSymbol(this._options.symbol);
        this._priceDecimals = priceDecimalsFor(this._symbol.pricescale);
        await this._fetchAndSubscribe();
    }
    async _restartFeed() {
        if (!this._symbol)
            return;
        this._subscription?.unsubscribe();
        this._subscription = null;
        this._replay.exit();
        this._store.reset();
        this._indicators.recomputeAll(this._store);
        this._rightLocked = true;
        this._isFetchingHistory = false;
        this._noMoreHistory = false;
        this._lastClose = null;
        await this._fetchAndSubscribe();
    }
    async _fetchAndSubscribe() {
        if (!this._symbol)
            return;
        const symbol = this._symbol;
        const now = Date.now();
        const periodMs = resolutionToMs(this._resolution);
        const bars = await this._datafeed.getBars(symbol, this._resolution, {
            from: now - INITIAL_BARS_TO_LOAD * periodMs,
            to: now,
            countBack: INITIAL_BARS_TO_LOAD,
            firstDataRequest: true,
        });
        this._store.load(bars);
        this._timeScale.fitToBars(this._store.length, INITIAL_VISIBLE_BARS);
        this._indicators.recomputeAll(this._store);
        this._autoFitPanes();
        this._surface.invalidateAll();
        this._subscription = this._datafeed.subscribeBars(symbol, this._resolution, (bar) => this._store.tick(bar));
    }
    // ---- Interaction handlers ----
    _hitTest(x, y) {
        if (this._store.isReplaying)
            return null;
        return this._alertLayer.hitTest(x, y);
    }
    _handlePan(deltaX) {
        this._timeScale.pan(deltaX);
        this._rightLocked = this._timeScale.isAnchoredRight(this._store.length);
        this._autoFitPanes();
        this._surface.invalidateAll();
        this._checkLazyLoad();
    }
    _handleZoom(factor, anchorX) {
        this._timeScale.zoom(factor, anchorX);
        this._rightLocked = this._timeScale.isAnchoredRight(this._store.length);
        this._autoFitPanes();
        this._surface.invalidateAll();
        this._checkLazyLoad();
    }
    _handlePriceAxisDrag(dy, anchorY) {
        // Dragging down (dy > 0) expands the price range (zoom out), dragging up zooms in.
        const factor = dy > 0 ? 1 / (1 + Math.abs(dy) * 0.01) : 1 + Math.abs(dy) * 0.01;
        this._paneManager.main.priceScale.manualZoom(factor, anchorY);
        this._surface.getLayer('background').invalidate();
        this._surface.getLayer('main').invalidate();
        this._surface.getLayer('studies').invalidate();
        this._surface.getLayer('drawings').invalidate();
        this._surface.getLayer('crosshair').invalidate();
    }
    _handleTimeAxisDrag(dx) {
        // Dragging left (dx < 0) zooms in (fewer bars), right zooms out.
        const factor = dx > 0 ? 1 / (1 + Math.abs(dx) * 0.005) : 1 + Math.abs(dx) * 0.005;
        this._timeScale.zoom(factor, this._surface.width / 2);
        this._rightLocked = false;
        this._autoFitPanes();
        this._surface.invalidateAll();
    }
    _handleHover(x, y) {
        this._crosshair.setPosition(x, y);
        this._surface.getLayer('crosshair').invalidate();
    }
    async _handleTargetDragEnd(target, moved) {
        if (target.kind === 'alert-dismiss' && !moved) {
            this._alertLayer.remove(target.alertId);
            this._surface.getLayer('trading').invalidate();
        }
    }
    _handleContextMenu(x, y) {
        if (this._drawings.getActiveTool() !== null) {
            this._drawings.setActiveTool(null);
            return;
        }
        if (this._store.isReplaying)
            return;
        const mainPane = this._paneManager.main;
        if (y > mainPane.height)
            return;
        const price = mainPane.priceScale.yToPrice(y);
        // Right-click on chart adds a price alert at that level.
        this._alertLayer.add(price, price > (this._lastClose ?? price) ? 'cross-above' : 'cross-below');
        this._surface.getLayer('trading').invalidate();
    }
    // ---- Drawing handlers ----
    _handleDrawingClick(x, y) {
        const anchor = this._pixelToAnchor(x, y);
        if (!anchor)
            return;
        this._drawings.onPlacementClick(anchor);
        this._surface.getLayer('drawings').invalidate();
    }
    _handleDrawingHover(x, y) {
        const anchor = this._pixelToAnchor(x, y);
        if (!anchor)
            return;
        this._drawings.onPlacementHover(anchor);
        this._surface.getLayer('drawings').invalidate();
    }
    _pixelToAnchor(x, y) {
        const mainPane = this._paneManager.main;
        if (y > mainPane.height)
            return null;
        const clampedX = Math.max(0, Math.min(this._surface.width - RIGHT_GUTTER, x));
        const clampedY = Math.max(0, Math.min(mainPane.height, y));
        return {
            time: xToTime(clampedX, this._store, this._timeScale),
            price: mainPane.priceScale.yToPrice(clampedY),
        };
    }
    // ---- Surface callbacks ----
    _handleResize(width, height) {
        this._timeScale.setSize(width - RIGHT_GUTTER);
        this._paneManager.setTotalHeight(height - BOTTOM_GUTTER);
        this._autoFitPanes();
    }
    _handleDataChange(event) {
        if (event === 'append' && this._rightLocked) {
            this._timeScale.scrollToLatest(this._store.length);
        }
        const n = this._store.length;
        if (n > 0) {
            const currentClose = this._store.close[n - 1];
            if (currentClose !== undefined) {
                this._symbolBar.updatePrice(currentClose, this._priceDecimals);
                if (this._alertLayer.hasContent()) {
                    this._alertLayer.checkAndFire(currentClose, this._lastClose);
                }
                this._lastClose = currentClose;
            }
        }
        if (event === 'tick') {
            this._indicators.updateLast(this._store);
        }
        else {
            this._indicators.recomputeAll(this._store);
        }
        this._autoFitPanes();
        this._surface.getLayer('background').invalidate();
        this._surface.getLayer('main').invalidate();
        this._surface.getLayer('studies').invalidate();
        if (this._drawings.hasContent()) {
            this._surface.getLayer('drawings').invalidate();
        }
        if (this._alertLayer.hasContent()) {
            this._surface.getLayer('trading').invalidate();
        }
        this._surface.getLayer('crosshair').invalidate();
    }
    _handleRender(layer, ctx, width, height) {
        const chartW = width - RIGHT_GUTTER;
        const mainPane = this._paneManager.main;
        if (layer === 'background') {
            this._background.draw(ctx, width, height, RIGHT_GUTTER, BOTTOM_GUTTER, this._store, this._theme, this._resolution);
        }
        else if (layer === 'main') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, chartW, mainPane.height);
            ctx.clip();
            if (this._chartType === 'line') {
                this._lineRenderer.draw(ctx, this._theme);
            }
            else if (this._chartType === 'area') {
                this._areaRenderer.draw(ctx, this._theme, mainPane.height);
            }
            else {
                this._candles.draw(ctx, this._theme);
            }
            ctx.restore();
        }
        else if (layer === 'studies') {
            const range = this._timeScale.visibleIndices(this._store.length);
            if (!range)
                return;
            for (const pane of this._paneManager.panes) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, pane.top, chartW, pane.height);
                ctx.clip();
                ctx.translate(0, pane.top);
                this._indicators.drawPane(ctx, pane.id, range.from, range.to, chartW, pane.height, this._timeScale, pane.priceScale, this._theme);
                this._drawPaneLegend(ctx, pane.id);
                ctx.restore();
            }
        }
        else if (layer === 'drawings') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, chartW, mainPane.height);
            ctx.clip();
            this._drawings.draw(ctx, width, height, RIGHT_GUTTER, BOTTOM_GUTTER, this._store, this._timeScale, mainPane.priceScale, this._theme, this._priceDecimals);
            ctx.restore();
        }
        else if (layer === 'trading') {
            if (this._alertLayer.hasContent()) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, chartW, mainPane.height);
                ctx.clip();
                this._alertLayer.draw(ctx, chartW, mainPane.height, mainPane.priceScale, this._priceDecimals);
                ctx.restore();
            }
        }
        else if (layer === 'crosshair') {
            this._crosshair.draw(ctx, width, height, RIGHT_GUTTER, BOTTOM_GUTTER, this._store, this._timeScale, this._paneManager, this._theme, this._resolution, this._priceDecimals);
        }
    }
    _drawPaneLegend(ctx, paneId) {
        const indicators = this._indicators.indicatorsForPane(paneId);
        if (indicators.length === 0)
            return;
        ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const x0 = 8;
        let y = paneId === 'main' ? 42 : 14;
        for (const ind of indicators) {
            const label = ind.legendText?.() ?? ind.name;
            const color = ind.legendColor?.() ?? this._theme.drawing;
            ctx.fillStyle = color;
            ctx.fillRect(x0, y - 4, 8, 8);
            ctx.fillStyle = this._theme.axisText;
            ctx.fillText(label, x0 + 14, y);
            y += 14;
        }
    }
    _autoFitPanes() {
        const range = this._timeScale.visibleIndices(this._store.length);
        if (!range)
            return;
        this._paneManager.main.priceScale.autoFit(this._store.high, this._store.low, range.from, range.to);
        for (const pane of this._paneManager.panes) {
            if (pane.id === 'main')
                continue;
            const r = this._indicators.getPaneRange(pane.id, range.from, range.to);
            if (r)
                pane.priceScale.setRange(r.min, r.max);
        }
    }
    _checkLazyLoad() {
        if (this._isFetchingHistory)
            return;
        if (this._noMoreHistory)
            return;
        if (this._store.isReplaying)
            return;
        if (this._store.length === 0)
            return;
        if (this._timeScale.from >= LAZY_LOAD_THRESHOLD)
            return;
        this._isFetchingHistory = true;
        void this._fetchOlderBars();
    }
    async _fetchOlderBars() {
        if (!this._symbol) {
            this._isFetchingHistory = false;
            return;
        }
        const firstBar = this._store.at(0);
        if (!firstBar) {
            this._isFetchingHistory = false;
            return;
        }
        const periodMs = resolutionToMs(this._resolution);
        const to = firstBar.time - 1;
        const from = to - HISTORY_FETCH_COUNT * periodMs;
        try {
            const bars = await this._datafeed.getBars(this._symbol, this._resolution, {
                from,
                to,
                countBack: HISTORY_FETCH_COUNT,
                firstDataRequest: false,
            });
            const newBars = bars.filter((b) => b.time < firstBar.time);
            if (newBars.length === 0) {
                this._noMoreHistory = true;
                return;
            }
            newBars.sort((a, b) => a.time - b.time);
            const count = newBars.length;
            this._store.prepend(newBars);
            this._timeScale.shiftBy(count);
            this._indicators.recomputeAll(this._store);
            this._autoFitPanes();
            this._surface.invalidateAll();
        }
        catch (err) {
            console.warn('[GenCharts] history fetch failed', err);
        }
        finally {
            this._isFetchingHistory = false;
        }
    }
}
function priceDecimalsFor(pricescale) {
    if (pricescale <= 1)
        return 0;
    return Math.min(8, Math.round(Math.log10(pricescale)));
}
//# sourceMappingURL=ChartEngine.js.map