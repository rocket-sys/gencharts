# GenCharts

A lightweight, zero-dependency financial charting library built on HTML5 Canvas. Drop it into any web app to get a full-featured live chart connected to your own data source.

**Features**
- Candlestick, line, and area chart styles
- 11 built-in technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, VWAP, OBV, Ichimoku, Volume)
- Drawing tools: trendlines, horizontal/vertical lines, rectangles, Fibonacci retracements
- Historical replay / backtesting mode
- Price alerts
- Infinite lazy-loading of historical data as the user pans left
- HiDPI / Retina display support
- Dark and light themes

---

## Installation

```bash
npm install gencharts
# or
yarn add gencharts
# or
pnpm add gencharts
```

---

## Quick Start

```typescript
import { ChartEngine } from 'gencharts';
import type { DatafeedAdapter, SymbolInfo, Resolution, Bar, BarSubscription } from 'gencharts';

// 1. Implement the DatafeedAdapter for your data source
class MyDatafeed implements DatafeedAdapter {
  async resolveSymbol(symbolName: string): Promise<SymbolInfo> {
    return {
      symbol: symbolName,
      description: symbolName,
      type: 'crypto',
      pricescale: 100,   // 2 decimal places
      minmov: 1,
      resolutions: ['1', '5', '15', '60', '1D'],
      session: '24x7',
      timezone: 'UTC',
    };
  }

  async getBars(symbol: SymbolInfo, resolution: Resolution, period: { from: number; to: number; countBack: number }): Promise<Bar[]> {
    // Fetch from your API
    const response = await fetch(`/api/bars?symbol=${symbol.symbol}&resolution=${resolution}&from=${period.from}&to=${period.to}`);
    return response.json();
  }

  subscribeBars(symbol: SymbolInfo, resolution: Resolution, onTick: (bar: Bar) => void): BarSubscription {
    // Connect to your live data stream
    const ws = new WebSocket(`wss://your-data-source.com/stream?symbol=${symbol.symbol}`);
    ws.onmessage = (event) => {
      const bar: Bar = JSON.parse(event.data as string) as Bar;
      onTick(bar);
    };
    return { unsubscribe: () => ws.close() };
  }
}

// 2. Mount the chart
const chart = new ChartEngine({
  container: document.getElementById('chart')!,
  datafeed: new MyDatafeed(),
  symbol: 'BTCUSD',
  resolution: '60',
  theme: 'dark',
});
```

---

## The DatafeedAdapter Contract

This is the only interface you must implement. Three methods, nothing else.

```typescript
interface DatafeedAdapter {
  // Return metadata for a symbol string
  resolveSymbol(symbolName: string): Promise<SymbolInfo>;

  // Fetch historical OHLCV bars for a time range
  getBars(symbol: SymbolInfo, resolution: Resolution, period: PeriodParams): Promise<Bar[]>;

  // Subscribe to live price updates
  subscribeBars(symbol: SymbolInfo, resolution: Resolution, onTick: (bar: Bar) => void): BarSubscription;
}
```

### `resolveSymbol`

Return a `SymbolInfo` describing the instrument. The most important field is `pricescale` — it controls how many decimal places the price axis shows.

```typescript
// pricescale = 1 / minimum_tick
// EURUSD: tick = 0.00001  →  pricescale = 100000
// BTCUSD: tick = 0.01     →  pricescale = 100
// AAPL:   tick = 0.01     →  pricescale = 100
// US30:   tick = 1        →  pricescale = 1
```

### `getBars`

Called on initial load and whenever the user pans left past loaded history. Return bars sorted oldest-first.

```typescript
async getBars(symbol, resolution, period) {
  // period.from / period.to are Unix milliseconds
  // period.countBack is how many bars the chart wants
  // period.firstDataRequest is true on initial load, false on history pages
  const bars = await yourApi.fetchOHLCV({
    symbol: symbol.symbol,
    interval: resolution,        // '1', '5', '60', '1D', etc.
    startTime: period.from,
    endTime: period.to,
    limit: period.countBack,
  });
  return bars.map(b => ({
    time: b.openTime,            // must be Unix ms, UTC
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,            // optional
  }));
}
```

### `subscribeBars`

Called after history loads. The chart expects `onTick` to be called with the current bar's latest state on every price update. The engine merges ticks: if the incoming bar's `time` matches the last loaded bar it updates in place; otherwise it appends a new bar.

```typescript
subscribeBars(symbol, resolution, onTick) {
  const ws = new WebSocket(`wss://stream.exchange.com/${symbol.symbol}`);
  ws.onmessage = (e) => {
    const tick = JSON.parse(e.data);
    onTick({
      time: tick.openTime,       // bar open time, NOT the tick time
      open: tick.open,
      high: tick.high,
      low: tick.low,
      close: tick.close,
      volume: tick.volume,
    });
  };
  // IMPORTANT: always return an unsubscribe function
  return { unsubscribe: () => ws.close() };
}
```

---

## ChartEngine API

### Constructor

```typescript
new ChartEngine(options: ChartOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | required | DOM element to mount into |
| `datafeed` | `DatafeedAdapter` | required | Your data source implementation |
| `symbol` | `string` | required | Initial symbol, e.g. `"EURUSD"` |
| `resolution` | `Resolution` | required | Initial timeframe: `"1"`, `"5"`, `"15"`, `"30"`, `"60"`, `"240"`, `"1D"`, `"1W"`, `"1M"` |
| `theme` | `"dark" \| "light"` | `"dark"` | Color theme |
| `chartType` | `"candlestick" \| "line" \| "area"` | `"candlestick"` | Initial chart style |
| `symbols` | `SymbolListEntry[]` | built-in list | Symbols shown in the search dropdown |

### Symbol & Timeframe

```typescript
await chart.setSymbol('EURUSD');          // switches symbol, reloads data
await chart.setResolution('1D');          // switches timeframe, reloads data
chart.setChartType('line');               // no reload needed
chart.setDatafeed(newDatafeed);           // hot-swap the data source
chart.setTheme('light');
chart.scrollToRealtime();                 // pan to the latest bar
```

### Indicators

```typescript
import { SMA, EMA, RSI, MACD, BollingerBands } from 'gencharts';

// Add to the main price pane (overlay)
chart.addIndicator(new SMA({ period: 20, color: '#2962ff' }));
chart.addIndicator(new EMA({ period: 50, color: '#ff6d00' }));
chart.addIndicator(new BollingerBands({ period: 20, stdDev: 2 }));

// Add to a sub-pane below the chart
chart.addIndicator(new RSI({ period: 14 }));
chart.addIndicator(new MACD({ fast: 12, slow: 26, signal: 9 }));

// List and remove
const indicators = chart.listIndicators();
chart.removeIndicator(indicators[0].id);
chart.clearIndicators();
```

Available indicators: `SMA`, `EMA`, `RSI`, `MACD`, `BollingerBands`, `ATR`, `Stochastic`, `VWAP`, `OBV`, `Ichimoku`, `Volume`

### Drawing Tools

```typescript
import type { DrawingType } from 'gencharts';

// Activate a tool (user then clicks to place anchors)
chart.setDrawingTool('trendline');    // click two points to draw
chart.setDrawingTool('horizontal');   // click once for a horizontal line
chart.setDrawingTool('fibonacci');    // click two points for Fib retracement
chart.setDrawingTool('rectangle');    // click two corners
chart.setDrawingTool(null);           // deactivate

// Programmatic drawing
import type { HorizontalDrawing } from 'gencharts';
const drawing: HorizontalDrawing = {
  id: 'support-1',
  type: 'horizontal',
  price: 1.0850,
  color: '#00e676',
  lineWidth: 1,
  style: 'dashed',
};
chart.addDrawing(drawing);
chart.removeDrawing('support-1');
chart.clearDrawings();
```

Drawing types: `"trendline"`, `"horizontal"`, `"vertical"`, `"fibonacci"`, `"rectangle"`

### Price Alerts

Right-clicking on the chart automatically places an alert at that price level. You can also manage alerts programmatically:

```typescript
import type { AlertCondition } from 'gencharts';

const alert = chart.addAlert(1.0900, 'above', 'Resistance level');
chart.onAlertFired((alert) => {
  console.log(`Alert fired: ${alert.label} at ${alert.price}`);
  // send a push notification, play a sound, etc.
});

chart.removeAlert(alert.id);
chart.listAlerts();     // readonly Alert[]
chart.clearAlerts();
```

### Replay / Backtesting Mode

```typescript
// Enter replay mode — the chart shows historical data at a fixed cursor
chart.enterReplay();                      // defaults to 70% into history
chart.enterReplay(200);                   // start at bar index 200

// Step through history
chart.stepReplay(1);                      // one bar forward
chart.stepReplay(-1);                     // one bar back
chart.setReplayCursor(350);               // jump to bar 350

// Playback
chart.playReplay(2);                      // play at 2× speed
chart.playReplay(0.5);                    // play at 0.5× speed
chart.pauseReplay();

// Listen for state changes
chart.onReplayStateChange((state) => {
  console.log(state.cursor, state.isPlaying, state.speed);
});

chart.exitReplay();

// Check current mode
if (chart.isReplaying) { /* ... */ }
```

### Cleanup

Always call `destroy()` when removing the chart from the DOM:

```typescript
chart.destroy();
```

---

## Connecting a WebSocket Feed

A complete example connecting to Binance's public WebSocket for live candles:

```typescript
import { ChartEngine } from 'gencharts';
import type { DatafeedAdapter, SymbolInfo, Resolution, Bar, BarSubscription } from 'gencharts';

class BinanceDatafeed implements DatafeedAdapter {
  private readonly _symbols: Record<string, SymbolInfo> = {
    BTCUSDT: { symbol: 'BTCUSDT', description: 'Bitcoin / USDT', type: 'crypto', pricescale: 100, minmov: 1, resolutions: ['1','5','15','60','1D'], session: '24x7', timezone: 'UTC' },
    ETHUSDT: { symbol: 'ETHUSDT', description: 'Ethereum / USDT', type: 'crypto', pricescale: 100, minmov: 1, resolutions: ['1','5','15','60','1D'], session: '24x7', timezone: 'UTC' },
  };

  async resolveSymbol(name: string): Promise<SymbolInfo> {
    return this._symbols[name] ?? { symbol: name, description: name, type: 'crypto', pricescale: 100, minmov: 1, resolutions: ['1','5','15','60','1D'], session: '24x7', timezone: 'UTC' };
  }

  async getBars(symbol: SymbolInfo, resolution: Resolution, period: { from: number; to: number; countBack: number }): Promise<Bar[]> {
    const interval = this._toInterval(resolution);
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.symbol}&interval=${interval}&startTime=${period.from}&endTime=${period.to}&limit=${Math.min(period.countBack, 1000)}`;
    const data = await fetch(url).then(r => r.json()) as [number, string, string, string, string, string][];
    return data.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  subscribeBars(symbol: SymbolInfo, resolution: Resolution, onTick: (bar: Bar) => void): BarSubscription {
    const interval = this._toInterval(resolution);
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as { k: { t: number; o: string; h: string; l: string; c: string; v: string } };
      const k = msg.k;
      onTick({ time: k.t, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c), volume: parseFloat(k.v) });
    };
    return { unsubscribe: () => ws.close() };
  }

  private _toInterval(r: Resolution): string {
    const map: Record<string, string> = { '1':'1m','3':'3m','5':'5m','15':'15m','30':'30m','60':'1h','240':'4h','1D':'1d','1W':'1w','1M':'1M' };
    return map[r] ?? '1m';
  }
}

const chart = new ChartEngine({
  container: document.getElementById('chart')!,
  datafeed: new BinanceDatafeed(),
  symbol: 'BTCUSDT',
  resolution: '60',
  theme: 'dark',
});
```

---

## Connecting a REST / Polling Feed

For data sources that don't push updates, poll on an interval:

```typescript
subscribeBars(symbol, resolution, onTick) {
  const pollMs = 5000; // 5 seconds
  const timer = setInterval(async () => {
    const latest = await myApi.getLatestBar(symbol.symbol, resolution);
    onTick(latest);
  }, pollMs);
  return { unsubscribe: () => clearInterval(timer) };
}
```

---

## HTML Setup

The chart fills its container completely. Set an explicit size on the container:

```html
<div id="chart" style="width: 100%; height: 600px;"></div>
<script type="module">
  import { ChartEngine } from '/node_modules/gencharts/dist/index.js';
  // ...
</script>
```

With a bundler (Vite, webpack, esbuild):

```typescript
import { ChartEngine } from 'gencharts';
```

---

## TypeScript

Full TypeScript support is included. All types are exported from the main entry point:

```typescript
import type {
  Bar,
  BarSubscription,
  ChartOptions,
  DatafeedAdapter,
  PeriodParams,
  Resolution,
  SymbolInfo,
  ChartType,
  SymbolListEntry,
  Alert,
  AlertCondition,
  Drawing,
  DrawingType,
  Indicator,
} from 'gencharts';
```

---

## Building from Source

```bash
git clone https://github.com/YOUR_ORG/gencharts.git
cd gencharts
npm install
npm run build      # outputs to dist/
npm run typecheck  # type-check without emitting
```

---

## Design

- **Zero runtime dependencies** — pure TypeScript, no external packages
- **Layered canvas** — 6 independent `<canvas>` elements, each invalidated only when its content changes (crosshair, trading alerts, drawings, indicators, bars, background)
- **Typed arrays for hot data** — `BarStore` keeps OHLCV as `Float64Array` columns; no object allocation in hot render paths
- **Chart coordinates** — drawings and alerts are stored in `(time, price)` space and converted to pixels only at paint time, so they stay anchored through zoom and pan
- **Datafeed is the only API surface** — swap data sources by implementing three methods; the chart never touches the network directly
