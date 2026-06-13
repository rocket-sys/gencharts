import type { ChartType, Resolution, SymbolListEntry } from '../types';
export interface SymbolBarOptions {
    container: HTMLElement;
    symbol: string;
    resolution: Resolution;
    chartType?: ChartType;
    symbols?: SymbolListEntry[];
    onSymbolChange: (symbol: string) => void;
    onResolutionChange: (resolution: Resolution) => void;
    onChartTypeChange?: (type: ChartType) => void;
    onOpenIndicators?: () => void;
}
export declare const BUILT_IN_SYMBOLS: SymbolListEntry[];
/**
 * SymbolBar — top-left overlay: symbol search dropdown, live price, resolution
 * buttons, chart-type switcher, and Indicators shortcut.
 *
 * Clicking the symbol label opens a search panel that filters the symbol list
 * in real-time. Pressing Enter with a custom string submits it directly so
 * users can load any symbol the datafeed supports, even if it isn't in the list.
 * The list defaults to BUILT_IN_SYMBOLS when no symbols option is passed.
 */
export declare class SymbolBar {
    private readonly _root;
    private readonly _container;
    private _symbolLabel;
    private _priceLabel;
    private _resBtns;
    private _chartTypeBtns;
    private _resolution;
    private _chartType;
    private _symbols;
    private _lastPrice;
    private _dropdown;
    private _abort;
    private _onSymbolChange;
    private _onResolutionChange;
    private _onChartTypeChange;
    constructor(opts: SymbolBarOptions);
    updatePrice(price: number, decimals: number): void;
    setSymbol(symbol: string): void;
    setResolution(resolution: Resolution): void;
    setChartType(type: ChartType): void;
    destroy(): void;
    private _openDropdown;
    private _closeDropdown;
    private _selectSymbol;
    private _sep;
    private _updateResButtons;
    private _updateChartTypeButtons;
    private _resStyle;
    private _chartTypeStyle;
}
//# sourceMappingURL=SymbolBar.d.ts.map