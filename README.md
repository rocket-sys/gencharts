# GenCharts

A lightweight, zero-dependency financial charting library built on HTML5 Canvas. Drop it into any web app to get a full-featured live chart connected to your own data source.

**Features**
- Candlestick, line, and area chart styles — with gradient bodies, rounded corners, and hollow mode
- 11 built-in technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, VWAP, OBV, Ichimoku, Volume)
- Drawing tools: trendlines, horizontal/vertical lines, rectangles, Fibonacci retracements, **freehand pen**
- **Position overlay** — display multiple open trades with entry/SL/TP lines and live P&L, zero execution coupling
- **Real-time chart sync** — broadcaster/receiver pattern over BroadcastChannel (same origin) or WebSocket (cross-client)
- Price alerts
- Independent Y-axis and X-axis zoom via gutter drag
- Historical replay / backtesting mode
- Infinite lazy-loading of historical data as the user pans left
- HiDPI / Retina display support
- Dark, light, and **GenesisFX** color themes + full custom theme API

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
    const response = await fetch(`/api/bars?symbol=${symbol.symbol}&resolution=${resolution}&from=${period.from}&to=${period.to}`);
    return response.json();
  }

  subscribeBars(symbol: SymbolInfo, resolution: Resolution, onTick: (bar: Bar) => void): BarSubscription {
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
| `theme` | `"dark" \| "light" \| "genesis"` | `"dark"` | Color theme |
| `chartType` | `"candlestick" \| "line" \| "area"` | `"candlestick"` | Initial chart style |
| `symbols` | `SymbolListEntry[]` | built-in list | Symbols shown in the search dropdown |

### Symbol & Timeframe

```typescript
await chart.setSymbol('EURUSD');          // switches symbol, reloads data
await chart.setResolution('1D');          // switches timeframe, reloads data
chart.setChartType('line');               // no reload needed
chart.setDatafeed(newDatafeed);           // hot-swap the data source
chart.setTheme('genesis');                // 'dark' | 'light' | 'genesis'
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

// Activate a tool (user then clicks/draws on the chart)
chart.setDrawingTool('trendline');    // click two points
chart.setDrawingTool('horizontal');   // click once for a horizontal line
chart.setDrawingTool('fibonacci');    // click two points for Fib retracement
chart.setDrawingTool('rectangle');    // click two corners
chart.setDrawingTool('freehand');     // click and drag to draw freely
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
chart.listDrawings();
```

Drawing types: `"trendline"`, `"horizontal"`, `"vertical"`, `"fibonacci"`, `"rectangle"`, `"freehand"`

### Price Alerts

Right-clicking on the chart automatically places an alert at that price level. You can also manage alerts programmatically:

```typescript
import type { AlertCondition } from 'gencharts';

const alert = chart.addAlert(1.0900, 'cross-above', 'Resistance level');
chart.onAlertFired((alert) => {
  console.log(`Alert fired: ${alert.label} at ${alert.price}`);
  // send a push notification, play a sound, etc.
});

chart.removeAlert(alert.id);
chart.listAlerts();     // readonly Alert[]
chart.clearAlerts();
```

`AlertCondition`: `"cross-above"` | `"cross-below"`

### Position Overlay

Display open positions from your broker without any execution coupling. Feed positions in from wherever your trade data comes from — WebSocket, REST polling, or a local state store.

```typescript
import type { Position } from 'gencharts';

// Add a position (calling add() with the same id replaces it)
chart.addPosition({
  id: 'trade-1',
  symbol: 'EURUSD',
  side: 'buy',           // 'buy' | 'sell'
  entryPrice: 1.0850,
  qty: 0.10,             // lot size or units — used for P&L display only
  sl: 1.0800,            // stop-loss price (optional)
  tp: 1.0950,            // take-profit price (optional)
  openTime: Date.now(),  // unix ms
  label: 'Breakout',     // optional badge label
});

// Modify SL/TP after entry (e.g. trailing stop)
chart.updatePosition('trade-1', { sl: 1.0825 });

// Display multiple positions simultaneously
chart.addPosition({ id: 'trade-2', symbol: 'EURUSD', side: 'sell', entryPrice: 1.0900, qty: 0.05 });

// Trade lifecycle events
chart.onPositionEvent((event) => {
  // event.type: 'opened' | 'closed' | 'updated'
  // event.position: the Position object
  if (event.type === 'closed') {
    console.log(`Position ${event.position.id} closed`);
    // trigger a notification, update a P&L dashboard, etc.
  }
});

// Remove when your broker confirms the close
chart.removePosition('trade-1');
chart.clearPositions();
chart.listPositions();   // readonly Position[]
```

**What renders on the chart for each position:**
- Solid entry line colored by side (buy = green, sell = red), with a left-side badge showing `"BUY 0.10"` or `"SELL 0.05"`
- Dashed SL line (red) and dashed TP line (green), if set
- Shaded zone fill between entry and SL, and between entry and TP
- Live P&L badge on the right side, updated on every price tick

### Themes & Color Customization

```typescript
// Built-in themes
chart.setTheme('dark');     // TradingView-style dark
chart.setTheme('light');    // Clean white background
chart.setTheme('genesis');  // GenesisFX brand (black, green #00b67a, red #ef4444, blue accent #4FC1FF)

// Merge any overrides onto the current theme
chart.setCustomTheme({
  bullColor: '#00ff88',
  bearColor: '#ff3355',
  background: '#0d0d0d',
});

// Full candle style control
chart.setCustomTheme({
  candleStyle: 'gradient',   // 'solid' | 'gradient' | 'hollow'
  candleRadius: 3,           // body corner radius in px
  bullGradientTop: '#00b67a',
  bullGradientBottom: 'rgba(0, 182, 122, 0.35)',
  bearGradientTop: 'rgba(239, 68, 68, 0.35)',
  bearGradientBottom: '#ef4444',
  wickColor: '#444444',
});

// Or import theme constants directly
import { DARK_THEME, LIGHT_THEME, GENESIS_THEME, applyTheme } from 'gencharts';
const myTheme = applyTheme(GENESIS_THEME, { candleRadius: 5 });
```

**Theme fields:**

| Field | Description |
|-------|-------------|
| `background` | Canvas background color |
| `grid` | Grid line color |
| `axisText` | Price/time axis label color |
| `axisLine` | Axis border color |
| `bullColor` | Rising candle / up color |
| `bearColor` | Falling candle / down color |
| `bullGradientTop` / `bullGradientBottom` | Gradient stops for bull candle body |
| `bearGradientTop` / `bearGradientBottom` | Gradient stops for bear candle body |
| `wickColor` | Candle wick color (defaults to body color) |
| `candleRadius` | Body corner radius in px (default 2) |
| `candleStyle` | `'solid'` \| `'gradient'` \| `'hollow'` (default `'gradient'`) |
| `crosshair` | Crosshair line color |
| `drawing` | Default drawing tool color |
| `areaLineColor` / `areaGradientTop` / `areaGradientBottom` | Area chart colors |

### Axis Zoom

The price axis (right gutter) and time axis (bottom gutter) can be zoomed independently:
- **Drag up/down on the right gutter** → zoom the Y price scale (price axis locks, auto-fit is suspended)
- **Drag left/right on the bottom gutter** → zoom the X time scale
- **Scroll wheel over the right gutter** → zoom price axis only
- **Scroll wheel over the chart** → zoom time axis (standard behavior)

Price axis auto-fit resumes when you pan the time axis or call `scrollToRealtime()`.

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

## Real-Time Chart Sync

Sync chart state between tabs or clients in real time using the broadcaster/receiver pattern. The broadcaster owns the chart and publishes every state change. Receivers mirror it automatically.

**What is synced:** symbol, resolution, chart type, viewport (pan/zoom position), theme, drawings (including freehand), alerts, positions, replay state.

### Same-origin sync (BroadcastChannel)

No server required — works between tabs and windows on the same domain.

```typescript
import { ChartSync, BroadcastChannelTransport } from 'gencharts';

// --- Broadcaster tab ---
const chart = new ChartEngine({ /* ... */ });
const sync = new ChartSync(
  chart,
  new BroadcastChannelTransport('my-room'),
  'broadcaster',
);

// Every mutation is now automatically published:
chart.setSymbol('GBPUSD');        // → receivers switch symbol
chart.addPosition({ /* ... */ }); // → receivers show the position
chart.setDrawingTool('freehand'); // → receiver sees your pen strokes live

// --- Receiver tab ---
const viewerChart = new ChartEngine({ /* ... */ });
const sync = new ChartSync(
  viewerChart,
  new BroadcastChannelTransport('my-room'),
  'receiver',
);
// viewerChart now mirrors everything the broadcaster does.

// Tear down
sync.destroy();
```

### Cross-client sync (WebSocket relay)

For syncing between different users or devices, point both sides at the same WebSocket relay room URL. See [WebSocket Relay Server](#websocket-relay-server) below for how to host the relay.

```typescript
import { ChartSync, WebSocketTransport } from 'gencharts';

// Broadcaster (the trader/analyst)
const sync = new ChartSync(
  chart,
  new WebSocketTransport('wss://relay.yourapp.com/room/live-session-abc'),
  'broadcaster',
);

// Receiver (viewer on another device or browser)
const sync = new ChartSync(
  viewerChart,
  new WebSocketTransport('wss://relay.yourapp.com/room/live-session-abc'),
  'receiver',
);
```

`WebSocketTransport` reconnects automatically with exponential back-off (1 s → 2 s → 4 s → up to 30 s) and queues messages sent while disconnected.

### Publish a snapshot on demand

When a receiver joins late, the broadcaster sends a full snapshot every 5 seconds automatically. You can also trigger it manually:

```typescript
sync.publishSnapshot(); // push full state to all receivers now
```

---

## WebSocket Relay Server

The `WebSocketTransport` connects to a relay URL like `wss://relay.yourapp.com/room/abc`. The relay server has one job: **broadcast every message it receives from one client to all other clients in the same room**. It needs no chart-specific logic — it never parses the JSON.

### Minimal Node.js relay (~35 lines)

```javascript
// relay.js — run with: node relay.js
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

// rooms: Map<roomId, Set<WebSocket>>
const rooms = new Map();

wss.on('connection', (ws, req) => {
  // Room id comes from the URL path: /room/abc → 'abc'
  const roomId = (req.url ?? '/').replace(/^\/room\//, '') || 'default';
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);
  room.add(ws);

  ws.on('message', (data) => {
    // Broadcast to everyone else in the room.
    for (const peer of room) {
      if (peer !== ws && peer.readyState === 1 /* OPEN */) {
        peer.send(data);
      }
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  });
});

server.listen(process.env.PORT ?? 8080, () => {
  console.log(`Relay listening on port ${process.env.PORT ?? 8080}`);
});
```

Install and run:

```bash
npm install ws
node relay.js
```

### Deployment

The relay is a stateless Node.js process. Any hosting platform works:

| Platform | Command |
|----------|---------|
| **Railway** | `railway up` — auto-detects Node, free tier available |
| **Render** | New Web Service → Node → `node relay.js` |
| **Fly.io** | `fly launch` → `fly deploy` |
| **Heroku** | `git push heroku main` |
| **VPS / Docker** | Run behind nginx with `proxy_pass` and `Upgrade` headers set |

Once deployed, set your relay URL:

```typescript
new WebSocketTransport('wss://your-relay.railway.app/room/session-1')
```

### nginx proxy config (if self-hosting)

```nginx
location /room/ {
  proxy_pass http://localhost:8080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 3600s;
}
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
  Theme,
  Alert,
  AlertCondition,
  Drawing,
  DrawingType,
  FreehandDrawing,
  Indicator,
  Position,
  PositionEvent,
  PositionEventType,
  SyncMessage,
  SyncTransport,
} from 'gencharts';

import { SyncRole } from 'gencharts'; // type alias
```

---

## Building from Source

```bash
git clone https://github.com/rocket-sys/gencharts.git
cd gencharts
npm install
npm run build      # outputs to dist/
npm run typecheck  # type-check without emitting
```

---

## Design

- **Zero runtime dependencies** — pure TypeScript, no external packages
- **Layered canvas** — 6 independent `<canvas>` elements, each invalidated only when its content changes (crosshair, trading/positions/alerts, drawings, indicators, bars, background)
- **Typed arrays for hot data** — `BarStore` keeps OHLCV as `Float64Array` columns; no object allocation in hot render paths
- **Chart coordinates** — drawings, alerts, and positions are stored in `(time, price)` space and converted to pixels only at paint time, so they stay anchored through zoom and pan
- **Datafeed is the only API surface** — swap data sources by implementing three methods; the chart never touches the network directly
- **Sync transport is swappable** — `BroadcastChannelTransport` for same-origin, `WebSocketTransport` for cross-client; implement `SyncTransport` for any other channel (SSE, Ably, Pusher, etc.)
