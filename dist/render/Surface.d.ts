/**
 * Layered canvas manager.
 *
 * The chart is composed of six stacked <canvas> elements, each in its own
 * z-layer. A layer only redraws when its data is invalidated, so the crosshair
 * (which moves on every mousemove, ~60Hz) doesn't force the candles to repaint.
 *
 * Layer order (back to front):
 *   - background: grid lines, axes labels, watermark
 *   - main:       primary price series (candles, line, area)
 *   - studies:    indicators drawn on the main pane (MAs, Bollinger, VWAP)
 *   - drawings:   user-placed trend lines, Fib, shapes
 *   - trading:    open orders, positions, fills (the TradeLocker overlay)
 *   - crosshair:  cursor crosshair + price/time tooltips (top, redraws constantly)
 *
 * The render loop is coalesced via requestAnimationFrame: multiple invalidations
 * inside one tick result in exactly one paint pass.
 */
export type LayerName = 'background' | 'main' | 'studies' | 'drawings' | 'trading' | 'crosshair';
export interface Layer {
    name: LayerName;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    /** Schedule this layer to repaint on the next animation frame. */
    invalidate(): void;
}
export interface SurfaceListener {
    /** Called whenever the container resizes. Re-fit your scales here. */
    onResize?(width: number, height: number): void;
    /**
     * Called for each invalidated layer on each frame. Implementations should
     * inspect `layer` and only paint to that layer's context. Coordinates are
     * in CSS pixels — the Surface has already applied DPR scaling.
     */
    onRender(layer: LayerName, ctx: CanvasRenderingContext2D, width: number, height: number): void;
}
export declare class Surface {
    private _container;
    private _layers;
    private _dirty;
    private _listeners;
    private _resizeObserver;
    private _rafId;
    private _width;
    private _height;
    private _dpr;
    constructor(container: HTMLElement);
    get width(): number;
    get height(): number;
    get dpr(): number;
    /** Returns the named layer, or throws if unknown. */
    getLayer(name: LayerName): Layer;
    /** Subscribe to render + resize callbacks. Returns an unsubscribe function. */
    subscribe(listener: SurfaceListener): () => void;
    /** Force every layer to repaint on the next frame. Use after theme changes etc. */
    invalidateAll(): void;
    /** Tear down. Removes all canvases and stops observing the container. */
    destroy(): void;
    private _createLayer;
    private _handleResize;
    private _scheduleFrame;
    private _render;
}
//# sourceMappingURL=Surface.d.ts.map