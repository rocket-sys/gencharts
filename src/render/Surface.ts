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

export type LayerName =
  | 'background'
  | 'main'
  | 'studies'
  | 'drawings'
  | 'trading'
  | 'crosshair';

const LAYER_ORDER: readonly LayerName[] = [
  'background',
  'main',
  'studies',
  'drawings',
  'trading',
  'crosshair',
];

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

export class Surface {
  private _container: HTMLElement;
  private _layers = new Map<LayerName, Layer>();
  private _dirty = new Set<LayerName>();
  private _listeners = new Set<SurfaceListener>();
  private _resizeObserver: ResizeObserver;
  private _rafId: number | null = null;
  private _width = 0;
  private _height = 0;
  private _dpr = 1;

  constructor(container: HTMLElement) {
    this._container = container;
    // Containers must establish a positioning context for the absolute canvases.
    if (!container.style.position) container.style.position = 'relative';
    container.style.overflow = 'hidden';

    for (const name of LAYER_ORDER) {
      this._createLayer(name);
    }

    this._dpr = window.devicePixelRatio || 1;
    this._resizeObserver = new ResizeObserver(() => this._handleResize());
    this._resizeObserver.observe(container);
    this._handleResize();
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get dpr(): number { return this._dpr; }

  /** Returns the named layer, or throws if unknown. */
  getLayer(name: LayerName): Layer {
    const layer = this._layers.get(name);
    if (!layer) throw new Error(`Unknown layer: ${name}`);
    return layer;
  }

  /** Subscribe to render + resize callbacks. Returns an unsubscribe function. */
  subscribe(listener: SurfaceListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** Force every layer to repaint on the next frame. Use after theme changes etc. */
  invalidateAll(): void {
    for (const name of LAYER_ORDER) this._dirty.add(name);
    this._scheduleFrame();
  }

  /** Tear down. Removes all canvases and stops observing the container. */
  destroy(): void {
    this._resizeObserver.disconnect();
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    for (const layer of this._layers.values()) {
      layer.canvas.remove();
    }
    this._layers.clear();
    this._listeners.clear();
  }

  private _createLayer(name: LayerName): void {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    // Input is handled by a separate controller, not via canvas events.
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('data-layer', name);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D context');
    this._container.appendChild(canvas);

    const layer: Layer = {
      name,
      canvas,
      ctx,
      invalidate: () => {
        this._dirty.add(name);
        this._scheduleFrame();
      },
    };
    this._layers.set(name, layer);
  }

  private _handleResize(): void {
    const rect = this._container.getBoundingClientRect();
    this._width = Math.max(1, Math.floor(rect.width));
    this._height = Math.max(1, Math.floor(rect.height));
    this._dpr = window.devicePixelRatio || 1;

    for (const layer of this._layers.values()) {
      // Backing-store size is in physical pixels.
      layer.canvas.width = this._width * this._dpr;
      layer.canvas.height = this._height * this._dpr;
      // Display size stays in CSS pixels.
      layer.canvas.style.width = `${this._width}px`;
      layer.canvas.style.height = `${this._height}px`;
      // Pre-scale the context so callers can draw in CSS pixel coordinates.
      layer.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }

    for (const l of this._listeners) {
      l.onResize?.(this._width, this._height);
    }
    this.invalidateAll();
  }

  private _scheduleFrame(): void {
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._render();
    });
  }

  private _render(): void {
    if (this._dirty.size === 0) return;
    // Repaint in z-order so listeners can read back state from lower layers
    // if they want to (e.g. measuring widths painted by the main layer).
    for (const name of LAYER_ORDER) {
      if (!this._dirty.has(name)) continue;
      const layer = this._layers.get(name)!;
      // clearRect at scaled coordinates — works because setTransform applied DPR.
      layer.ctx.clearRect(0, 0, this._width, this._height);
      for (const l of this._listeners) {
        l.onRender(name, layer.ctx, this._width, this._height);
      }
    }
    this._dirty.clear();
  }
}
