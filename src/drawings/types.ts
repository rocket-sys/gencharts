/**
 * Drawing types — chart-space objects placed by the user.
 *
 * Anchors store *timestamps* and *prices*, never pixel coordinates. The
 * renderer converts to pixels at draw time via timeMap helpers. This makes
 * drawings stable across pan, zoom, and (eventually) resolution changes.
 */

export type DrawingId = string;

export type DrawingType =
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'fibonacci'
  | 'rectangle';

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

export type Drawing =
  | TrendlineDrawing
  | HorizontalDrawing
  | VerticalDrawing
  | FibonacciDrawing
  | RectangleDrawing;

/** Standard Fibonacci retracement levels used by FibonacciDrawing. */
export const FIB_LEVELS: ReadonlyArray<number> = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** Per-level colors. Subtle in dark mode; meant to be readable across themes. */
export const FIB_COLORS: ReadonlyArray<string> = [
  '#787b86', // 0%
  '#ef5350', // 23.6%
  '#ef9f27', // 38.2%
  '#26a69a', // 50%
  '#42a5f5', // 61.8%
  '#ab47bc', // 78.6%
  '#787b86', // 100%
];
