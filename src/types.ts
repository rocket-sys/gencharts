/**
 * Canonical OHLCV bar shape used at API boundaries.
 *
 * Inside the engine, bars are stored densely in typed arrays (see BarStore);
 * this object shape is only used when crossing the datafeed contract or
 * when callers ask for a single bar.
 */
export interface Bar {
  /** Unix epoch in milliseconds. Always UTC. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Volume is optional — FX and some CFDs don't report it. */
  volume?: number;
}

/**
 * Supported chart resolutions. Strings rather than numbers because
 * '1D' / '1W' / '1M' have no single millisecond value (months vary).
 * Format matches TradingView UDF so backends are swappable.
 */
export type Resolution =
  | '1' | '3' | '5' | '15' | '30' | '60' | '240'  // minutes
  | '1D' | '1W' | '1M';                            // daily, weekly, monthly

/** Symbol metadata returned from a datafeed's resolveSymbol call. */
export interface SymbolInfo {
  symbol: string;
  description: string;
  type: 'forex' | 'crypto' | 'stock' | 'index' | 'commodity' | 'cfd';
  exchange?: string;
  /** Inverse of the smallest price increment. EURUSD 0.00001 pip → 100000. */
  pricescale: number;
  /** Minimum movement multiplier. 1 for most instruments, 5 for fractional bonds. */
  minmov: number;
  resolutions: Resolution[];
  session: string;
  timezone: string;
}

export interface PeriodParams {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
}

export interface BarSubscription {
  unsubscribe(): void;
}

/**
 * The single contract every datafeed implements.
 *
 * Required: resolveSymbol, getBars, subscribeBars.
 *
 * The chart engine calls these three methods — nothing else. Implement them
 * for any data source: REST APIs, WebSockets, CSV files, exchange feeds, etc.
 */
export interface DatafeedAdapter {
  /** Return metadata for a symbol string (e.g. "EURUSD"). */
  resolveSymbol(symbolName: string): Promise<SymbolInfo>;

  /**
   * Fetch historical OHLCV bars. Called on initial load and when the user
   * pans left past the currently loaded history (lazy-load).
   */
  getBars(
    symbol: SymbolInfo,
    resolution: Resolution,
    period: PeriodParams,
  ): Promise<Bar[]>;

  /**
   * Subscribe to live bar updates. The engine calls onTick whenever a new
   * price arrives — the datafeed should call it on each price update and the
   * engine merges it into the current bar or appends a new bar.
   *
   * Returns an object with unsubscribe() that the engine calls on cleanup.
   */
  subscribeBars(
    symbol: SymbolInfo,
    resolution: Resolution,
    onTick: (bar: Bar) => void,
  ): BarSubscription;
}

/** Selects how price data is drawn on the main pane. */
export type ChartType = 'candlestick' | 'line' | 'area';

/** One entry in the symbol search dropdown. */
export interface SymbolListEntry {
  symbol: string;
  description: string;
  type: 'forex' | 'crypto' | 'stock' | 'index' | 'commodity' | 'cfd';
  exchange?: string;
}

/**
 * Hit-testable target on the chart. Currently only price alerts can be
 * dismissed via click/drag — no trading targets exist in this library.
 */
export type DragTarget = { kind: 'alert-dismiss'; alertId: string };

export interface ChartOptions {
  /** DOM element to mount the chart into. The chart fills it entirely. */
  container: HTMLElement;
  /** Data source implementing the three required datafeed methods. */
  datafeed: DatafeedAdapter;
  /** Initial symbol, e.g. "EURUSD" or "BTCUSD". */
  symbol: string;
  /** Initial resolution, e.g. "1" (1 minute), "60" (1 hour), "1D" (daily). */
  resolution: Resolution;
  /** Color theme. Defaults to "dark". */
  theme?: 'light' | 'dark';
  /** Initial chart style. Defaults to "candlestick". */
  chartType?: ChartType;
  /** Symbols shown in the search dropdown. */
  symbols?: SymbolListEntry[];
}
