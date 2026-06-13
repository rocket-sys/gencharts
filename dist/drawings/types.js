/**
 * Drawing types — chart-space objects placed by the user.
 *
 * Anchors store *timestamps* and *prices*, never pixel coordinates. The
 * renderer converts to pixels at draw time via timeMap helpers. This makes
 * drawings stable across pan, zoom, and (eventually) resolution changes.
 */
/** Standard Fibonacci retracement levels used by FibonacciDrawing. */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
/** Per-level colors. Subtle in dark mode; meant to be readable across themes. */
export const FIB_COLORS = [
    '#787b86', // 0%
    '#ef5350', // 23.6%
    '#ef9f27', // 38.2%
    '#26a69a', // 50%
    '#42a5f5', // 61.8%
    '#ab47bc', // 78.6%
    '#787b86', // 100%
];
//# sourceMappingURL=types.js.map