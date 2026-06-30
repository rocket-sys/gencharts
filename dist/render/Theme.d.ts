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
    /** Top color of bull candle body gradient. Defaults to bullColor. */
    bullGradientTop?: string;
    /** Bottom color of bull candle body gradient. Defaults to bullColor at 70% alpha. */
    bullGradientBottom?: string;
    /** Top color of bear candle body gradient. Defaults to bearColor at 70% alpha. */
    bearGradientTop?: string;
    /** Bottom color of bear candle body gradient. Defaults to bearColor. */
    bearGradientBottom?: string;
    /** Wick color. Defaults to the body color of each candle. */
    wickColor?: string;
    /** Corner radius for candle bodies (px). 0 = square. Default: 2. */
    candleRadius?: number;
    /** 'solid' | 'gradient' | 'hollow'. Default: 'gradient'. */
    candleStyle?: 'solid' | 'gradient' | 'hollow';
    areaLineColor?: string;
    areaGradientTop?: string;
    areaGradientBottom?: string;
}
export declare const DARK_THEME: Theme;
export declare const LIGHT_THEME: Theme;
/** GenesisFX brand theme — matches genesisfxmarkets.com */
export declare const GENESIS_THEME: Theme;
export declare function getTheme(name: 'light' | 'dark' | 'genesis'): Theme;
/** Merge a partial theme override onto a base theme. */
export declare function applyTheme(base: Theme, overrides: Partial<Theme>): Theme;
export declare function withAlpha(hex: string, alpha: number): string;
//# sourceMappingURL=Theme.d.ts.map