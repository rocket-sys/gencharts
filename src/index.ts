// Core types and contracts
export type {
  Bar,
  Resolution,
  ChartType,
  SymbolInfo,
  PeriodParams,
  BarSubscription,
  DatafeedAdapter,
  ChartOptions,
  DragTarget,
  SymbolListEntry,
} from './types';

// Drawing types
export type {
  Drawing,
  DrawingId,
  DrawingType,
  DrawingAnchor,
  TrendlineDrawing,
  HorizontalDrawing,
  VerticalDrawing,
  FibonacciDrawing,
  RectangleDrawing,
} from './drawings/types';
export { FIB_LEVELS, FIB_COLORS } from './drawings/types';

// Indicator types and implementations
export type { Indicator } from './indicators/types';
export { IndicatorEngine } from './indicators/IndicatorEngine';
export { SMA, type SMAOptions } from './indicators/SMA';
export { EMA, type EMAOptions } from './indicators/EMA';
export { RSI, type RSIOptions } from './indicators/RSI';
export { MACD, type MACDOptions } from './indicators/MACD';
export { BollingerBands, type BollingerOptions } from './indicators/BollingerBands';
export { Volume, type VolumeOptions } from './indicators/Volume';
export { ATR, type ATROptions } from './indicators/ATR';
export { Stochastic, type StochasticOptions } from './indicators/Stochastic';
export { VWAP, type VWAPOptions } from './indicators/VWAP';
export { OBV, type OBVOptions } from './indicators/OBV';
export { Ichimoku, type IchimokuOptions } from './indicators/Ichimoku';
export { computeEMA, drawLine, rangeOf } from './indicators/utils';

// Rendering primitives (for custom integrations)
export { BarStore } from './data/BarStore';
export type { BarStoreEvent } from './data/BarStore';
export { Surface, type Layer, type LayerName, type SurfaceListener } from './render/Surface';
export { TimeScale } from './scales/TimeScale';
export { PriceScale } from './scales/PriceScale';
export { timeToBarIndex, barIndexToTime, timeToX, xToTime } from './scales/timeMap';
export { PaneManager, Pane } from './panes/PaneManager';
export { BackgroundRenderer } from './render/BackgroundRenderer';
export { CandlestickRenderer } from './render/CandlestickRenderer';
export { LineRenderer } from './render/LineRenderer';
export { AreaRenderer } from './render/AreaRenderer';
export { CrosshairRenderer } from './render/CrosshairRenderer';
export { InputController, type InputDelegate } from './input/InputController';
export { type Theme, DARK_THEME, LIGHT_THEME, getTheme, withAlpha } from './render/Theme';

// Drawing tools
export { DrawingLayer } from './drawings/DrawingLayer';
export { DrawingToolbar, type DrawingToolEvent } from './drawings/DrawingToolbar';

// UI components
export { SymbolBar, type SymbolBarOptions, BUILT_IN_SYMBOLS } from './ui/SymbolBar';
export { IndicatorPanel, type IndicatorPanelOptions } from './ui/IndicatorPanel';

// Replay / backtesting
export { ReplayController, type ReplayState, type ReplayListener } from './replay/ReplayController';
export { ReplayToolbar } from './replay/ReplayToolbar';

// Alerts
export { AlertLayer } from './alerts/AlertLayer';
export type { Alert, AlertCondition, AlertStatus, AlertId } from './alerts/types';

// Main entry point
export { ChartEngine } from './ChartEngine';
