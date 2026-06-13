/**
 * Color tokens used by renderers. A theme is a plain object so it's trivially
 * serializable, JSON-friendly, and easy to override per-chart.
 *
 * The defaults below mirror TradingView's classic palette so the chart looks
 * familiar to traders out of the box. Replace freely for white-label branding.
 */
export interface Theme {
    background: string;
    grid: string;
    axisText: string;
    axisLine: string;
    bullColor: string;
    bearColor: string;
    crosshair: string;
    crosshairLabelBg: string;
    crosshairLabelText: string;
    tooltipBg: string;
    tooltipText: string;
    stopLossColor: string;
    takeProfitColor: string;
    onBull: string;
    onBear: string;
    /** Default color for user-placed drawings (trendlines, rectangles, etc.). */
    drawing: string;
}
export declare const DARK_THEME: Theme;
export declare const LIGHT_THEME: Theme;
export declare function getTheme(name: 'light' | 'dark'): Theme;
export declare function withAlpha(hex: string, alpha: number): string;
//# sourceMappingURL=Theme.d.ts.map