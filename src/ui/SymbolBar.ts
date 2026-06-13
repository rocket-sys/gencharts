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

// Default watchlist shown when the caller doesn't supply a symbol list.
export const BUILT_IN_SYMBOLS: SymbolListEntry[] = [
  { symbol: 'EURUSD', description: 'Euro / US Dollar',         type: 'forex' },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', type: 'forex' },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen',  type: 'forex' },
  { symbol: 'AUDUSD', description: 'Australian Dollar / USD',   type: 'forex' },
  { symbol: 'USDCHF', description: 'US Dollar / Swiss Franc',   type: 'forex' },
  { symbol: 'USDCAD', description: 'US Dollar / Canadian Dollar', type: 'forex' },
  { symbol: 'NZDUSD', description: 'New Zealand Dollar / USD',  type: 'forex' },
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar',       type: 'crypto' },
  { symbol: 'ETHUSD', description: 'Ethereum / US Dollar',      type: 'crypto' },
  { symbol: 'SOLUSD', description: 'Solana / US Dollar',        type: 'crypto' },
  { symbol: 'SPX500', description: 'S&P 500 Index',             type: 'index' },
  { symbol: 'NAS100', description: 'Nasdaq 100',                type: 'index' },
  { symbol: 'GER40',  description: 'DAX 40 Index',              type: 'index' },
  { symbol: 'XAUUSD', description: 'Gold / US Dollar',          type: 'commodity' },
  { symbol: 'XAGUSD', description: 'Silver / US Dollar',        type: 'commodity' },
  { symbol: 'USOIL',  description: 'Crude Oil (WTI)',            type: 'commodity' },
];

const TYPE_COLORS: Record<string, string> = {
  forex: '#2962ff', crypto: '#9c27b0', stock: '#26a69a',
  index: '#ff9800', commodity: '#f57c00', cfd: '#787b86',
};

/**
 * SymbolBar — top-left overlay: symbol search dropdown, live price, resolution
 * buttons, chart-type switcher, and Indicators shortcut.
 *
 * Clicking the symbol label opens a search panel that filters the symbol list
 * in real-time. Pressing Enter with a custom string submits it directly so
 * users can load any symbol the datafeed supports, even if it isn't in the list.
 * The list defaults to BUILT_IN_SYMBOLS when no symbols option is passed.
 */
export class SymbolBar {
  private readonly _root: HTMLDivElement;
  private readonly _container: HTMLElement;
  private _symbolLabel: HTMLSpanElement;
  private _priceLabel: HTMLSpanElement;
  private _resBtns: Map<string, HTMLButtonElement> = new Map();
  private _chartTypeBtns: Map<ChartType, HTMLButtonElement> = new Map();
  private _resolution: Resolution;
  private _chartType: ChartType;
  private _symbols: SymbolListEntry[];
  private _lastPrice: number | null = null;
  private _dropdown: HTMLDivElement | null = null;
  private _abort = new AbortController();
  private _onSymbolChange: (s: string) => void;
  private _onResolutionChange: (r: Resolution) => void;
  private _onChartTypeChange: ((t: ChartType) => void) | null;

  constructor(opts: SymbolBarOptions) {
    this._container   = opts.container;
    this._resolution  = opts.resolution;
    this._chartType   = opts.chartType ?? 'candlestick';
    this._symbols     = opts.symbols ?? BUILT_IN_SYMBOLS;
    this._onSymbolChange      = opts.onSymbolChange;
    this._onResolutionChange  = opts.onResolutionChange;
    this._onChartTypeChange   = opts.onChartTypeChange ?? null;

    const { signal } = this._abort;

    this._root = document.createElement('div');
    this._root.setAttribute('data-rokcat', 'symbol-bar');
    Object.assign(this._root.style, {
      position: 'absolute',
      top: '8px', left: '48px',
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px',
      background: 'rgba(30, 34, 45, 0.88)',
      border: '1px solid #363a45', borderRadius: '6px',
      backdropFilter: 'blur(5px)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: '12px', color: '#d1d4dc',
      zIndex: '55',
      userSelect: 'none',
    });

    // ---- Symbol section ----
    const symbolWrap = document.createElement('div');
    Object.assign(symbolWrap.style, {
      display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer',
    });

    this._symbolLabel = document.createElement('span');
    this._symbolLabel.textContent = opts.symbol;
    Object.assign(this._symbolLabel.style, {
      fontWeight: '600', color: '#fff', letterSpacing: '0.3px',
    });

    const caret = document.createElement('span');
    caret.textContent = '▾';
    Object.assign(caret.style, { color: '#787b86', fontSize: '10px' });

    symbolWrap.append(this._symbolLabel, caret);
    symbolWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._dropdown) this._closeDropdown();
      else this._openDropdown();
    }, { signal });
    this._root.appendChild(symbolWrap);

    // ---- Price label ----
    this._priceLabel = document.createElement('span');
    Object.assign(this._priceLabel.style, {
      fontVariantNumeric: 'tabular-nums',
      minWidth: '70px', color: '#9598a1', fontSize: '11px', marginLeft: '2px',
    });
    this._root.appendChild(this._priceLabel);

    // ---- Separator ----
    this._root.appendChild(this._sep());

    // ---- Resolution buttons ----
    const resolutions: Resolution[] = ['1', '5', '15', '30', '60', '240', '1D'];
    for (const r of resolutions) {
      const btn = document.createElement('button');
      btn.textContent = formatRes(r);
      Object.assign(btn.style, this._resStyle(r === opts.resolution));
      btn.addEventListener('click', () => {
        this._resolution = r;
        this._updateResButtons();
        this._onResolutionChange(r);
      }, { signal });
      this._resBtns.set(r, btn);
      this._root.appendChild(btn);
    }

    // ---- Chart type buttons ----
    if (opts.onChartTypeChange) {
      this._root.appendChild(this._sep());
      for (const ct of ['candlestick', 'line', 'area'] as ChartType[]) {
        const btn = document.createElement('button');
        btn.title = ct.charAt(0).toUpperCase() + ct.slice(1);
        btn.innerHTML = chartTypeIcon(ct);
        Object.assign(btn.style, this._chartTypeStyle(ct === this._chartType));
        btn.addEventListener('click', () => {
          this._chartType = ct;
          this._updateChartTypeButtons();
          this._onChartTypeChange!(ct);
        }, { signal });
        this._chartTypeBtns.set(ct, btn);
        this._root.appendChild(btn);
      }
    }

    // ---- Indicators button ----
    if (opts.onOpenIndicators) {
      this._root.appendChild(this._sep());
      const indBtn = document.createElement('button');
      indBtn.textContent = 'Indicators';
      Object.assign(indBtn.style, {
        padding: '3px 9px', fontSize: '11px', fontFamily: 'inherit', fontWeight: '500',
        background: 'transparent', color: '#9598a1',
        border: '1px solid transparent', borderRadius: '3px', cursor: 'pointer',
      });
      indBtn.addEventListener('mouseover', () => { indBtn.style.color = '#d1d4dc'; indBtn.style.borderColor = '#363a45'; });
      indBtn.addEventListener('mouseout',  () => { indBtn.style.color = '#9598a1'; indBtn.style.borderColor = 'transparent'; });
      indBtn.addEventListener('click', opts.onOpenIndicators, { signal });
      this._root.appendChild(indBtn);
    }

    // Close dropdown on outside click.
    document.addEventListener('mousedown', (e) => {
      if (this._dropdown && !this._root.contains(e.target as Node)) {
        this._closeDropdown();
      }
    }, { signal, capture: true });

    opts.container.appendChild(this._root);
  }

  // ---- Public API ----

  updatePrice(price: number, decimals: number): void {
    const dir = this._lastPrice === null ? 0 : price > this._lastPrice ? 1 : price < this._lastPrice ? -1 : 0;
    this._lastPrice = price;
    this._priceLabel.textContent = price.toFixed(decimals);
    this._priceLabel.style.color = dir > 0 ? '#26a69a' : dir < 0 ? '#ef5350' : '#9598a1';
  }

  setSymbol(symbol: string): void {
    this._symbolLabel.textContent = symbol;
    this._closeDropdown();
  }

  setResolution(resolution: Resolution): void {
    this._resolution = resolution;
    this._updateResButtons();
  }

  setChartType(type: ChartType): void {
    this._chartType = type;
    this._updateChartTypeButtons();
  }

  destroy(): void {
    this._abort.abort();
    this._closeDropdown();
    this._root.remove();
  }

  // ---- Dropdown ----

  private _openDropdown(): void {
    const { signal } = this._abort;

    const panel = document.createElement('div');
    panel.setAttribute('data-rokcat', 'symbol-dropdown');
    Object.assign(panel.style, {
      position: 'absolute',
      top: 'calc(100% + 6px)', left: '0',
      width: '280px', maxHeight: '320px',
      background: '#1e222d',
      border: '1px solid #363a45', borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      zIndex: '200',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    });

    // Search input row
    const searchWrap = document.createElement('div');
    Object.assign(searchWrap.style, {
      padding: '8px 10px',
      borderBottom: '1px solid #363a45',
      flexShrink: '0',
    });
    const searchInp = document.createElement('input');
    searchInp.type = 'text';
    searchInp.placeholder = 'Search symbol…';
    Object.assign(searchInp.style, {
      width: '100%', boxSizing: 'border-box',
      background: '#131722', color: '#d1d4dc',
      border: '1px solid #363a45', borderRadius: '4px',
      fontSize: '12px', fontFamily: 'inherit',
      padding: '6px 8px', outline: 'none',
    });
    searchInp.addEventListener('focus',  () => { searchInp.style.borderColor = '#2962ff'; }, { signal });
    searchInp.addEventListener('blur',   () => { searchInp.style.borderColor = '#363a45'; }, { signal });
    searchWrap.appendChild(searchInp);
    panel.appendChild(searchWrap);

    // Scrollable list
    const list = document.createElement('div');
    Object.assign(list.style, { overflowY: 'auto', flex: '1' });
    panel.appendChild(list);

    const render = (query: string) => {
      list.innerHTML = '';
      const q = query.trim().toUpperCase();
      const filtered = q
        ? this._symbols.filter((s) =>
            s.symbol.includes(q) || s.description.toUpperCase().includes(q))
        : this._symbols;

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = q
          ? `Press Enter to load "${q}"`
          : 'No symbols';
        Object.assign(empty.style, {
          padding: '16px 12px', color: '#787b86', fontSize: '11px', textAlign: 'center',
        });
        list.appendChild(empty);
        return;
      }

      // Group by type for readability
      const groups = new Map<string, SymbolListEntry[]>();
      for (const sym of filtered) {
        const key = sym.type;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(sym);
      }

      for (const [type, items] of groups) {
        // Section header
        const header = document.createElement('div');
        header.textContent = type.toUpperCase();
        Object.assign(header.style, {
          padding: '6px 12px 3px',
          fontSize: '10px', fontWeight: '600', letterSpacing: '0.8px',
          color: TYPE_COLORS[type] ?? '#787b86',
        });
        list.appendChild(header);

        for (const sym of items) {
          const row = document.createElement('div');
          Object.assign(row.style, {
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 12px', cursor: 'pointer',
          });
          row.addEventListener('mouseover', () => { row.style.background = '#2a2e39'; });
          row.addEventListener('mouseout',  () => { row.style.background = 'transparent'; });
          row.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent blur on search input
            this._selectSymbol(sym.symbol);
          });

          const nameEl = document.createElement('span');
          nameEl.textContent = sym.symbol;
          Object.assign(nameEl.style, {
            fontWeight: '600', color: '#d1d4dc', minWidth: '70px', fontSize: '12px',
          });

          const descEl = document.createElement('span');
          descEl.textContent = sym.description;
          Object.assign(descEl.style, {
            flex: '1', color: '#787b86', fontSize: '11px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          });

          if (sym.exchange) {
            const exEl = document.createElement('span');
            exEl.textContent = sym.exchange;
            Object.assign(exEl.style, {
              fontSize: '10px', color: '#9598a1',
              background: '#363a45', padding: '1px 4px', borderRadius: '2px',
            });
            row.append(nameEl, descEl, exEl);
          } else {
            row.append(nameEl, descEl);
          }

          list.appendChild(row);
        }
      }
    };

    // Initial render
    render('');

    // Live filter
    searchInp.addEventListener('input', () => render(searchInp.value), { signal });

    // Keyboard: Enter submits, Escape closes
    searchInp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this._closeDropdown();
        return;
      }
      if (e.key === 'Enter') {
        e.stopPropagation();
        const q = searchInp.value.trim().toUpperCase();
        if (!q) return;
        // Pick first filtered match, or the typed value if no match
        const match = this._symbols.find(
          (s) => s.symbol.includes(q) || s.description.toUpperCase().includes(q),
        );
        this._selectSymbol(match?.symbol ?? q);
      }
    }, { signal });

    this._root.appendChild(panel);
    this._dropdown = panel;

    // Focus the search input on next tick (after DOM paint)
    requestAnimationFrame(() => searchInp.focus());
  }

  private _closeDropdown(): void {
    this._dropdown?.remove();
    this._dropdown = null;
  }

  private _selectSymbol(symbol: string): void {
    const upper = symbol.toUpperCase();
    this._symbolLabel.textContent = upper;
    this._closeDropdown();
    this._onSymbolChange(upper);
  }

  // ---- Style helpers ----

  private _sep(): HTMLDivElement {
    const d = document.createElement('div');
    Object.assign(d.style, {
      width: '1px', height: '16px', background: '#363a45', margin: '0 6px',
    });
    return d;
  }

  private _updateResButtons(): void {
    for (const [r, btn] of this._resBtns) {
      Object.assign(btn.style, this._resStyle(r === this._resolution));
    }
  }

  private _updateChartTypeButtons(): void {
    for (const [ct, btn] of this._chartTypeBtns) {
      Object.assign(btn.style, this._chartTypeStyle(ct === this._chartType));
    }
  }

  private _resStyle(active: boolean): Partial<CSSStyleDeclaration> {
    return {
      padding: '3px 7px', fontSize: '11px', fontFamily: 'inherit', fontWeight: '500',
      background: active ? '#2962ff' : 'transparent',
      color:      active ? '#ffffff' : '#9598a1',
      border: '1px solid ' + (active ? '#2962ff' : 'transparent'),
      borderRadius: '3px', cursor: 'pointer',
    };
  }

  private _chartTypeStyle(active: boolean): Partial<CSSStyleDeclaration> {
    return {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '24px', height: '22px', padding: '0',
      background: active ? '#2962ff' : 'transparent',
      color:      active ? '#ffffff' : '#9598a1',
      border: '1px solid ' + (active ? '#2962ff' : 'transparent'),
      borderRadius: '3px', cursor: 'pointer',
    };
  }
}

function chartTypeIcon(type: ChartType): string {
  switch (type) {
    case 'candlestick':
      return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line x1="2.5" y1="1" x2="2.5" y2="13" stroke="currentColor" stroke-width="1"/>
        <rect x="1" y="4" width="3" height="5" fill="currentColor"/>
        <line x1="7.5" y1="2" x2="7.5" y2="12" stroke="currentColor" stroke-width="1"/>
        <rect x="6" y="5" width="3" height="4" fill="currentColor"/>
        <line x1="11.5" y1="3" x2="11.5" y2="13" stroke="currentColor" stroke-width="1"/>
        <rect x="10" y="6" width="3" height="5" fill="currentColor"/>
      </svg>`;
    case 'line':
      return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <polyline points="1,11 4,7 7,9 10,4 13,6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'area':
      return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1,11 4,7 7,9 10,4 13,6 13,13 1,13 Z" fill="currentColor" opacity="0.35"/>
        <polyline points="1,11 4,7 7,9 10,4 13,6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }
}

function formatRes(r: Resolution): string {
  switch (r) {
    case '1':   return '1m';
    case '3':   return '3m';
    case '5':   return '5m';
    case '15':  return '15m';
    case '30':  return '30m';
    case '60':  return '1H';
    case '240': return '4H';
    case '1D':  return '1D';
    case '1W':  return '1W';
    case '1M':  return '1M';
  }
}
