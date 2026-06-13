/**
 * Color tokens used by renderers. A theme is a plain object so it's trivially
 * serializable, JSON-friendly, and easy to override per-chart.
 *
 * The defaults below mirror TradingView's classic palette so the chart looks
 * familiar to traders out of the box. Replace freely for white-label branding.
 */
export const DARK_THEME = {
    background: '#131722',
    grid: '#1e222d',
    axisText: '#787b86',
    axisLine: '#363a45',
    bullColor: '#26a69a',
    bearColor: '#ef5350',
    crosshair: '#9598a1',
    crosshairLabelBg: '#363a45',
    crosshairLabelText: '#d1d4dc',
    tooltipBg: 'rgba(30, 34, 45, 0.92)',
    tooltipText: '#d1d4dc',
    stopLossColor: '#ef5350',
    takeProfitColor: '#26a69a',
    onBull: '#ffffff',
    onBear: '#ffffff',
    drawing: '#d1d4dc',
};
export const LIGHT_THEME = {
    background: '#ffffff',
    grid: '#e1ecf2',
    axisText: '#6a6d78',
    axisLine: '#c8ccd4',
    bullColor: '#26a69a',
    bearColor: '#ef5350',
    crosshair: '#787b86',
    crosshairLabelBg: '#363a45',
    crosshairLabelText: '#ffffff',
    tooltipBg: 'rgba(255, 255, 255, 0.95)',
    tooltipText: '#131722',
    stopLossColor: '#ef5350',
    takeProfitColor: '#26a69a',
    onBull: '#ffffff',
    onBear: '#ffffff',
    drawing: '#131722',
};
export function getTheme(name) {
    return name === 'light' ? LIGHT_THEME : DARK_THEME;
}
export function withAlpha(hex, alpha) {
    if (hex.startsWith('rgba'))
        return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
//# sourceMappingURL=Theme.js.map