/**
 * Drawing types — chart-space objects placed by the user.
 *
 * Anchors store *timestamps* and *prices*, never pixel coordinates. The
 * renderer converts to pixels at draw time via timeMap helpers. This makes
 * drawings stable across pan, zoom, and (eventually) resolution changes.
 */
export type DrawingId = string;
export type DrawingType = 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'rectangle' | 'freehand';
/** A point in chart space. */
export interface DrawingAnchor {
    /** Epoch ms. */
    time: number;
    price: number;
}
interface DrawingCommon {
    id: DrawingId;
    /** Optional override color; falls back to theme.drawing if absent. */
    color?: string;
    /** Optional override line width; falls back to renderer default. */
    lineWidth?: number;
}
export interface TrendlineDrawing extends DrawingCommon {
    type: 'trendline';
    a: DrawingAnchor;
    b: DrawingAnchor;
}
export interface HorizontalDrawing extends DrawingCommon {
    type: 'horizontal';
    price: number;
}
export interface VerticalDrawing extends DrawingCommon {
    type: 'vertical';
    time: number;
}
export interface FibonacciDrawing extends DrawingCommon {
    type: 'fibonacci';
    /** First anchor — typically the swing high or low. */
    a: DrawingAnchor;
    /** Second anchor — the other extreme of the move. */
    b: DrawingAnchor;
}
export interface RectangleDrawing extends DrawingCommon {
    type: 'rectangle';
    a: DrawingAnchor;
    b: DrawingAnchor;
}
export interface FreehandDrawing extends DrawingCommon {
    type: 'freehand';
    /** Chart-space points collected during the drag stroke. */
    points: DrawingAnchor[];
}
export type Drawing = TrendlineDrawing | HorizontalDrawing | VerticalDrawing | FibonacciDrawing | RectangleDrawing | FreehandDrawing;
/** Standard Fibonacci retracement levels used by FibonacciDrawing. */
export declare const FIB_LEVELS: ReadonlyArray<number>;
/** Per-level colors. Subtle in dark mode; meant to be readable across themes. */
export declare const FIB_COLORS: ReadonlyArray<string>;
export {};
//# sourceMappingURL=types.d.ts.map