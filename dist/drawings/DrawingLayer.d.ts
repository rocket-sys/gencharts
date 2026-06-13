import type { BarStore } from '../data/BarStore';
import type { TimeScale } from '../scales/TimeScale';
import type { PriceScale } from '../scales/PriceScale';
import { type Theme } from '../render/Theme';
import { type Drawing, type DrawingAnchor, type DrawingId, type DrawingType } from './types';
/**
 * DrawingLayer — state + renderer for user-placed chart objects.
 *
 * Manages two concurrent things:
 *   1. The list of committed drawings (rendered every frame).
 *   2. The placement state machine for the currently active tool — a partial
 *      "preview" drawing that follows the cursor between clicks.
 *
 * Placement protocol (driven by ChartEngine from input callbacks):
 *   - setActiveTool('trendline')   — arms the tool
 *   - onPlacementClick(anchor)     — accepts a new anchor. Returns true if
 *                                    the drawing is complete (and was committed),
 *                                    false if more clicks are needed.
 *   - onPlacementHover(anchor)     — updates the preview's last anchor while
 *                                    the user is between clicks.
 *   - cancelPlacement()            — drops the preview, leaves the tool armed.
 *   - setActiveTool(null)          — exits placement mode entirely.
 *
 * Why anchors-by-value instead of taking pixel coords: the engine converts
 * pixels → chart space once at the call site (using PriceScale + timeMap)
 * so this layer never has to know anything about the surface dimensions
 * outside of draw time.
 */
export declare class DrawingLayer {
    private _drawings;
    private _activeTool;
    /**
     * The partial drawing being placed. For 1-anchor tools this stage is
     * skipped — the click commits immediately. For 2-anchor tools, this
     * holds the anchors filled in so far; the next anchor follows the cursor.
     */
    private _preview;
    private _nextId;
    private _selectedId;
    private _onChange;
    setChangeListener(cb: (() => void) | null): void;
    getActiveTool(): DrawingType | null;
    setActiveTool(tool: DrawingType | null): void;
    cancelPlacement(): void;
    /**
     * Accept a click in chart space during active-tool mode. Returns true if
     * the click completed a drawing (which was committed), false if more
     * clicks are needed for the active tool.
     */
    onPlacementClick(anchor: DrawingAnchor): boolean;
    /** Update the preview's "current" anchor during hover between clicks. */
    onPlacementHover(anchor: DrawingAnchor): void;
    add(drawing: Drawing): void;
    remove(id: DrawingId): void;
    clear(): void;
    hasContent(): boolean;
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, rightGutter: number, bottomGutter: number, store: BarStore, timeScale: TimeScale, priceScale: PriceScale, theme: Theme, priceDecimals: number): void;
    private _commit;
    private _mintId;
    private _notify;
    private _renderDrawing;
    private _renderFibonacci;
    private _drawAnchorDot;
}
//# sourceMappingURL=DrawingLayer.d.ts.map