import type { Indicator } from '../indicators/types';
import { SMA } from '../indicators/SMA';
import { EMA } from '../indicators/EMA';
import { RSI } from '../indicators/RSI';
import { MACD } from '../indicators/MACD';
import { BollingerBands } from '../indicators/BollingerBands';
import { VWAP } from '../indicators/VWAP';
import { ATR } from '../indicators/ATR';
import { Stochastic } from '../indicators/Stochastic';
import { OBV } from '../indicators/OBV';
import { Ichimoku } from '../indicators/Ichimoku';
import { Volume } from '../indicators/Volume';

export interface IndicatorPanelOptions {
  container: HTMLElement;
  onAdd: (indicator: Indicator) => void;
  onRemove: (id: string) => void;
  listIndicators: () => readonly Indicator[];
}

// ---- Descriptor types ----

type FieldType = 'number' | 'color' | 'boolean';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
}

interface IndicatorDef {
  key: string;
  label: string;
  fields: FieldDef[];
  create(cfg: Record<string, unknown>): Indicator;
}

// ---- Indicator catalogue ----

const DEFS: IndicatorDef[] = [
  {
    key: 'sma', label: 'SMA',
    fields: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'color',  label: 'Color',  type: 'color',  default: '#42a5f5' },
    ],
    create: (c) => new SMA({ period: n(c.period, 20), color: s(c.color, '#42a5f5') }),
  },
  {
    key: 'ema', label: 'EMA',
    fields: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'color',  label: 'Color',  type: 'color',  default: '#ff9800' },
    ],
    create: (c) => new EMA({ period: n(c.period, 20), color: s(c.color, '#ff9800') }),
  },
  {
    key: 'rsi', label: 'RSI',
    fields: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 2, max: 200 },
      { key: 'color',  label: 'Color',  type: 'color',  default: '#9c27b0' },
    ],
    create: (c) => new RSI({ period: n(c.period, 14), color: s(c.color, '#9c27b0') }),
  },
  {
    key: 'macd', label: 'MACD',
    fields: [
      { key: 'fast',   label: 'Fast',   type: 'number', default: 12, min: 1, max: 200 },
      { key: 'slow',   label: 'Slow',   type: 'number', default: 26, min: 1, max: 500 },
      { key: 'signal', label: 'Signal', type: 'number', default: 9,  min: 1, max: 100 },
    ],
    create: (c) => new MACD({ fast: n(c.fast, 12), slow: n(c.slow, 26), signal: n(c.signal, 9) }),
  },
  {
    key: 'bb', label: 'Bollinger',
    fields: [
      { key: 'period', label: 'Period',   type: 'number', default: 20,  min: 1, max: 500 },
      { key: 'stddev', label: 'Std Dev',  type: 'number', default: 2,   min: 0.1, max: 10, step: 0.1 },
      { key: 'color',  label: 'Color',    type: 'color',  default: '#26a69a' },
    ],
    create: (c) => new BollingerBands({ period: n(c.period, 20), stddev: n(c.stddev, 2), color: s(c.color, '#26a69a') }),
  },
  {
    key: 'vwap', label: 'VWAP',
    fields: [
      { key: 'color',      label: 'Color',        type: 'color',   default: '#e91e63' },
      { key: 'resetDaily', label: 'Session VWAP', type: 'boolean', default: true },
    ],
    create: (c) => new VWAP({ color: s(c.color, '#e91e63'), resetDaily: b(c.resetDaily, true) }),
  },
  {
    key: 'atr', label: 'ATR',
    fields: [
      { key: 'period', label: 'Period', type: 'number', default: 14, min: 1, max: 200 },
      { key: 'color',  label: 'Color',  type: 'color',  default: '#f44336' },
    ],
    create: (c) => new ATR({ period: n(c.period, 14), color: s(c.color, '#f44336') }),
  },
  {
    key: 'stoch', label: 'Stochastic',
    fields: [
      { key: 'k',      label: '%K Period', type: 'number', default: 14, min: 1, max: 200 },
      { key: 'd',      label: '%D Period', type: 'number', default: 3,  min: 1, max: 50  },
      { key: 'smooth', label: 'Smooth',    type: 'number', default: 3,  min: 1, max: 50  },
    ],
    create: (c) => new Stochastic({ k: n(c.k, 14), d: n(c.d, 3), smooth: n(c.smooth, 3) }),
  },
  {
    key: 'obv', label: 'OBV',
    fields: [
      { key: 'color', label: 'Color', type: 'color', default: '#00bcd4' },
    ],
    create: (c) => new OBV({ color: s(c.color, '#00bcd4') }),
  },
  {
    key: 'ichimoku', label: 'Ichimoku',
    fields: [
      { key: 'tenkan', label: 'Tenkan', type: 'number', default: 9,  min: 1, max: 200 },
      { key: 'kijun',  label: 'Kijun',  type: 'number', default: 26, min: 1, max: 200 },
    ],
    create: (c) => new Ichimoku({ tenkan: n(c.tenkan, 9), kijun: n(c.kijun, 26) }),
  },
  {
    key: 'volume', label: 'Volume',
    fields: [
      { key: 'bullColor', label: 'Bull Color', type: 'color', default: '#26a69a' },
      { key: 'bearColor', label: 'Bear Color', type: 'color', default: '#ef5350' },
    ],
    create: (c) => new Volume({ bullColor: s(c.bullColor, '#26a69a'), bearColor: s(c.bearColor, '#ef5350') }),
  },
];

// ---- Component ----

export class IndicatorPanel {
  private _root: HTMLDivElement;
  private _body: HTMLDivElement;
  private _abort = new AbortController();
  private _opts: IndicatorPanelOptions;
  private _selectedDef: IndicatorDef | null = null;

  constructor(opts: IndicatorPanelOptions) {
    this._opts = opts;
    const { signal } = this._abort;

    // Backdrop — click outside the panel to close.
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '90',
      display: 'none',
    });
    backdrop.setAttribute('data-rokcat', 'indicator-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    }, { signal });
    opts.container.appendChild(backdrop);

    // Panel.
    this._root = document.createElement('div');
    this._root.setAttribute('data-rokcat', 'indicator-panel');
    Object.assign(this._root.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '340px',
      background: '#1e222d',
      border: '1px solid #363a45',
      borderRadius: '8px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: '13px',
      color: '#d1d4dc',
      zIndex: '91',
      display: 'none',
      flexDirection: 'column',
      maxHeight: '80vh',
      overflow: 'hidden',
    });

    // Store backdrop ref on root so open/close can show/hide both.
    (this._root as HTMLDivElement & { _backdrop: HTMLDivElement })._backdrop = backdrop;

    // Header.
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px 10px',
      borderBottom: '1px solid #2a2e39',
    });
    const title = document.createElement('span');
    title.textContent = 'Indicators';
    Object.assign(title.style, { fontWeight: '600', fontSize: '14px', color: '#fff' });
    const closeBtn = this._iconBtn('✕', 'Close');
    closeBtn.addEventListener('click', () => this.close(), { signal });
    header.appendChild(title);
    header.appendChild(closeBtn);
    this._root.appendChild(header);

    // Scrollable body.
    this._body = document.createElement('div');
    Object.assign(this._body.style, {
      overflowY: 'auto',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });
    this._root.appendChild(this._body);

    opts.container.appendChild(this._root);
  }

  open(): void {
    const el = this._root as HTMLDivElement & { _backdrop: HTMLDivElement };
    el._backdrop.style.display = 'block';
    this._root.style.display = 'flex';
    this._selectedDef = null;
    this._rebuild();
  }

  close(): void {
    const el = this._root as HTMLDivElement & { _backdrop: HTMLDivElement };
    el._backdrop.style.display = 'none';
    this._root.style.display = 'none';
  }

  destroy(): void {
    this._abort.abort();
    const el = this._root as HTMLDivElement & { _backdrop: HTMLDivElement };
    el._backdrop.remove();
    this._root.remove();
  }

  // ---- Private ----

  private _rebuild(): void {
    this._body.innerHTML = '';

    // Indicator grid.
    const gridSection = this._section('Add indicator');
    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    });
    for (const def of DEFS) {
      const btn = document.createElement('button');
      btn.textContent = def.label;
      const active = this._selectedDef?.key === def.key;
      Object.assign(btn.style, this._chipStyle(active));
      btn.addEventListener('click', () => {
        this._selectedDef = active ? null : def;
        this._rebuild();
      }, { signal: this._abort.signal });
      grid.appendChild(btn);
    }
    gridSection.appendChild(grid);
    this._body.appendChild(gridSection);

    // Config form for selected indicator.
    if (this._selectedDef) {
      this._body.appendChild(this._buildConfigForm(this._selectedDef));
    }

    // Active indicators.
    const active = this._opts.listIndicators();
    if (active.length > 0) {
      const activeSection = this._section('Active');
      for (const ind of active) {
        activeSection.appendChild(this._buildActiveRow(ind));
      }
      this._body.appendChild(activeSection);
    }
  }

  private _buildConfigForm(def: IndicatorDef): HTMLElement {
    const { signal } = this._abort;
    const section = this._section(def.label + ' settings');
    const values: Record<string, unknown> = {};

    // Seed defaults.
    for (const f of def.fields) values[f.key] = f.default;

    // Field rows.
    for (const field of def.fields) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '6px',
      });

      const label = document.createElement('label');
      label.textContent = field.label;
      Object.assign(label.style, { color: '#9598a1', flexShrink: '0' });
      row.appendChild(label);

      let input: HTMLInputElement;
      if (field.type === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = String(field.default);
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);
        if (field.step !== undefined) input.step = String(field.step);
        Object.assign(input.style, { ...this._inputStyle(), width: '70px', textAlign: 'right' });
        input.addEventListener('input', () => { values[field.key] = parseFloat(input.value) || field.default; }, { signal });
      } else if (field.type === 'color') {
        input = document.createElement('input');
        input.type = 'color';
        input.value = String(field.default);
        Object.assign(input.style, {
          width: '36px',
          height: '24px',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          padding: '0',
          background: 'none',
        });
        input.addEventListener('input', () => { values[field.key] = input.value; }, { signal });
      } else {
        // boolean → checkbox
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(field.default);
        Object.assign(input.style, { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2962ff' });
        input.addEventListener('change', () => { values[field.key] = input.checked; }, { signal });
      }

      row.appendChild(input);
      section.appendChild(row);
    }

    // Add button.
    const addBtn = document.createElement('button');
    addBtn.textContent = `Add ${def.label}`;
    Object.assign(addBtn.style, {
      marginTop: '4px',
      padding: '7px 14px',
      background: '#2962ff',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'inherit',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%',
    });
    addBtn.addEventListener('mouseover', () => { addBtn.style.background = '#3a70ff'; });
    addBtn.addEventListener('mouseout',  () => { addBtn.style.background = '#2962ff'; });
    addBtn.addEventListener('click', () => {
      const indicator = def.create(values);
      this._opts.onAdd(indicator);
      this._selectedDef = null;
      this._rebuild();
    }, { signal });
    section.appendChild(addBtn);

    return section;
  }

  private _buildActiveRow(ind: Indicator): HTMLElement {
    const { signal } = this._abort;
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 8px',
      borderRadius: '4px',
      background: 'rgba(255,255,255,0.04)',
      marginBottom: '4px',
    });

    // Color swatch + name.
    const left = document.createElement('div');
    Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '8px' });

    const swatch = document.createElement('div');
    const color = ind.legendColor?.() ?? '#787b86';
    Object.assign(swatch.style, {
      width: '10px', height: '10px',
      borderRadius: '50%',
      background: color,
      flexShrink: '0',
    });

    const name = document.createElement('span');
    name.textContent = ind.legendText?.() ?? ind.name;
    Object.assign(name.style, { color: '#d1d4dc' });

    left.appendChild(swatch);
    left.appendChild(name);

    // Remove button.
    const removeBtn = this._iconBtn('✕', 'Remove');
    removeBtn.style.color = '#ef5350';
    removeBtn.addEventListener('click', () => {
      this._opts.onRemove(ind.id);
      this._rebuild();
    }, { signal });

    row.appendChild(left);
    row.appendChild(removeBtn);
    return row;
  }

  private _section(title: string): HTMLDivElement {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.textContent = title;
    Object.assign(label.style, {
      fontSize: '11px',
      fontWeight: '600',
      color: '#787b86',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginBottom: '8px',
    });
    wrap.appendChild(label);
    return wrap;
  }

  private _iconBtn(icon: string, title: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.title = title;
    b.textContent = icon;
    Object.assign(b.style, {
      width: '26px', height: '26px',
      background: 'transparent',
      color: '#9598a1',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
    });
    b.addEventListener('mouseover', () => { b.style.background = 'rgba(255,255,255,0.08)'; });
    b.addEventListener('mouseout',  () => { b.style.background = 'transparent'; });
    return b;
  }

  private _chipStyle(active: boolean): Partial<CSSStyleDeclaration> {
    return {
      padding: '4px 10px',
      fontSize: '12px',
      fontFamily: 'inherit',
      fontWeight: '500',
      background: active ? '#2962ff' : 'rgba(255,255,255,0.06)',
      color: active ? '#fff' : '#d1d4dc',
      border: '1px solid ' + (active ? '#2962ff' : '#363a45'),
      borderRadius: '4px',
      cursor: 'pointer',
    };
  }

  private _inputStyle(): Partial<CSSStyleDeclaration> {
    return {
      background: '#131722',
      color: '#d1d4dc',
      border: '1px solid #363a45',
      borderRadius: '3px',
      fontSize: '12px',
      fontFamily: 'inherit',
      padding: '3px 6px',
      outline: 'none',
    };
  }
}

// ---- Helpers ----

function n(v: unknown, fallback: number): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}
function s(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
function b(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
