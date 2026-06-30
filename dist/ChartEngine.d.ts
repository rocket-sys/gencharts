import type { ChartOptions, ChartType, DatafeedAdapter, Resolution } from './types';
import type { DrawingType } from './drawings/types';
import type { Indicator } from './indicators/types';
import { type Theme } from './render/Theme';
import type { Alert, AlertCondition } from './alerts/types';
import type { Position, PositionEvent } from './trading/types';
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
export declare class ChartEngine {
    private readonly _options;
    private _datafeed;
    private readonly _surface;
    private _store;
    private readonly _timeScale;
    private readonly _paneManager;
    private readonly _background;
    private _candles;
    private _lineRenderer;
    private _areaRenderer;
    private _chartType;
    private readonly _crosshair;
    private readonly _drawings;
    private readonly _indicators;
    private readonly _toolbar;
    private readonly _replay;
    private readonly _replayToolbar;
    private readonly _symbolBar;
    private readonly _indicatorPanel;
    private readonly _alertLayer;
    private readonly _positionOverlay;
    private readonly _input;
    private _theme;
    private _symbol;
    private _resolution;
    private _subscription;
    private _surfaceUnsubscribe;
    private _storeUnsubscribe;
    private _rightLocked;
    private _priceDecimals;
    private _isFetchingHistory;
    private _noMoreHistory;
    private _lastClose;
    constructor(options: ChartOptions);
    setSymbol(symbolName: string): Promise<void>;
    setResolution(resolution: Resolution): Promise<void>;
    setChartType(type: ChartType): void;
    /** Hot-swap the datafeed. Restarts the data pipeline for the current symbol + resolution. */
    setDatafeed(datafeed: DatafeedAdapter): void;
    setTheme(theme: 'light' | 'dark' | 'genesis'): void;
    /** Merge partial overrides onto the current theme. */
    setCustomTheme(overrides: Partial<Theme>): void;
    /** Set the visible bar index range directly (used by sync receiver). */
    setViewport(fromIndex: number, toIndex: number): void;
    /** Return a serializable snapshot of current chart state (used by ChartSync). */
    getSnapshot(): {
        symbol: string;
        resolution: Resolution;
        chartType: ChartType;
        viewport: {
            from: number;
            to: number;
        };
        drawings: import('./drawings/types').Drawing[];
        alerts: import('./alerts/types').Alert[];
        positions: import('./trading/types').Position[];
    };
    /** List all current drawings (for sync). */
    listDrawings(): import('./drawings/types').Drawing[];
    scrollToRealtime(): void;
    setDrawingTool(tool: DrawingType | null): void;
    addDrawing(drawing: import('./drawings/types').Drawing): void;
    removeDrawing(id: import('./drawings/types').DrawingId): void;
    clearDrawings(): void;
    addIndicator(indicator: Indicator): void;
    removeIndicator(id: string): void;
    clearIndicators(): void;
    listIndicators(): readonly Indicator[];
    enterReplay(cursor?: number): void;
    exitReplay(): void;
    setReplayCursor(cursor: number): void;
    stepReplay(delta: 1 | -1): void;
    playReplay(speed?: number): void;
    pauseReplay(): void;
    onReplayStateChange(listener: (state: import('./replay/ReplayController').ReplayState) => void): () => void;
    get isReplaying(): boolean;
    addAlert(price: number, condition: AlertCondition, label?: string): Alert;
    removeAlert(id: string): void;
    clearAlerts(): void;
    listAlerts(): readonly Alert[];
    onAlertFired(cb: (alert: Alert) => void): void;
    /** Add a position to the overlay. Same id replaces the existing position. */
    addPosition(pos: Position): void;
    /** Update fields on an existing position. Returns false if id not found. */
    updatePosition(id: string, updates: Partial<Omit<Position, 'id'>>): boolean;
    /** Remove a position. Returns the removed position or null. */
    removePosition(id: string): Position | null;
    clearPositions(): void;
    listPositions(): readonly Position[];
    /**
     * Subscribe to position lifecycle events (opened, closed, updated).
     * Returns an unsubscribe function.
     */
    onPositionEvent(cb: (event: PositionEvent) => void): () => void;
    destroy(): void;
    private _bootstrap;
    private _restartFeed;
    private _fetchAndSubscribe;
    private _hitTest;
    private _handlePan;
    private _handleZoom;
    private _handlePriceAxisDrag;
    private _handleTimeAxisDrag;
    private _handleHover;
    private _handleTargetDragEnd;
    private _handleContextMenu;
    private _handleDrawingClick;
    private _handleDrawingHover;
    private _handleFreehandStart;
    private _handleFreehandPoint;
    private _handleFreehandEnd;
    private _pixelToAnchor;
    private _handleResize;
    private _handleDataChange;
    private _handleRender;
    private _drawPaneLegend;
    private _autoFitPanes;
    private _checkLazyLoad;
    private _fetchOlderBars;
}
//# sourceMappingURL=ChartEngine.d.ts.map