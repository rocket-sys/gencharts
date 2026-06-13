import type { ReplayController, ReplayState } from './ReplayController';

/**
 * ReplayToolbar — bottom-center playback UI. Visible only while replay is
 * active. Subscribes to ReplayController state changes and renders the
 * matching button states without polling.
 *
 * Layout (left to right):
 *   [◀] step back
 *   [▶/⏸] play / pause
 *   [▶▶] step forward
 *   [─────●─────] slider (HTML range input — drag to scrub)
 *   [1×/2×/5×/10×] speed selector
 *   [📅 timestamp]
 *   [×] exit replay
 *
 * Slider uses a native <input type=range> for the affordances: drag, click-
 * track-to-jump, keyboard arrow keys, and the right cursor on hover all
 * come for free. Position is bound to controller.setCursor on input events.
 *
 * Styling is inline (no host stylesheet required), matching the other
 * built-in UI pieces. Replace freely for white-label theming.
 */
export class ReplayToolbar {
  private _container: HTMLElement;
  private _controller: ReplayController;
  private _root: HTMLDivElement;
  private _slider: HTMLInputElement;
  private _playBtn: HTMLButtonElement;
  private _timeLabel: HTMLSpanElement;
  private _speedButtons: Map<number, HTMLButtonElement> = new Map();
  private _unsubscribe: () => void;
  private _abort = new AbortController();

  constructor(container: HTMLElement, controller: ReplayController) {
    this._container = container;
    this._controller = controller;

    this._root = document.createElement('div');
    this._root.setAttribute('data-rokcat', 'replay-toolbar');
    Object.assign(this._root.style, {
      position: 'absolute',
      left: '50%',
      bottom: '36px',
      transform: 'translateX(-50%)',
      display: 'none',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      background: 'rgba(30, 34, 45, 0.94)',
      border: '1px solid #363a45',
      borderRadius: '8px',
      backdropFilter: 'blur(6px)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: '12px',
      color: '#d1d4dc',
      zIndex: '60',
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
    });
    container.appendChild(this._root);

    const { signal } = this._abort;

    // Step back.
    const stepBack = this._iconButton(ICONS.stepBack, 'Step backward');
    stepBack.addEventListener('click', () => this._controller.stepBackward(), { signal });
    this._root.appendChild(stepBack);

    // Play / pause.
    this._playBtn = this._iconButton(ICONS.play, 'Play / Pause');
    this._playBtn.addEventListener('click', () => this._controller.toggle(), { signal });
    this._root.appendChild(this._playBtn);

    // Step forward.
    const stepFwd = this._iconButton(ICONS.stepForward, 'Step forward');
    stepFwd.addEventListener('click', () => this._controller.stepForward(), { signal });
    this._root.appendChild(stepFwd);

    // Slider.
    this._slider = document.createElement('input');
    this._slider.type = 'range';
    this._slider.min = '1';
    this._slider.max = '500';
    this._slider.value = '1';
    Object.assign(this._slider.style, {
      width: '240px',
      margin: '0 6px',
      accentColor: '#2962ff',
      cursor: 'pointer',
    });
    this._slider.addEventListener('input', () => {
      this._controller.setCursor(Number(this._slider.value));
    }, { signal });
    this._root.appendChild(this._slider);

    // Speed selector.
    const speedWrap = document.createElement('div');
    Object.assign(speedWrap.style, { display: 'flex', gap: '2px' });
    for (const speed of [1, 2, 5, 10]) {
      const b = document.createElement('button');
      b.textContent = `${speed}×`;
      Object.assign(b.style, this._speedButtonStyle(false));
      b.addEventListener('click', () => this._controller.setSpeed(speed), { signal });
      this._speedButtons.set(speed, b);
      speedWrap.appendChild(b);
    }
    this._root.appendChild(speedWrap);

    // Time label.
    this._timeLabel = document.createElement('span');
    Object.assign(this._timeLabel.style, {
      marginLeft: '8px',
      color: '#9598a1',
      fontVariantNumeric: 'tabular-nums',
      minWidth: '110px',
      textAlign: 'right',
    });
    this._root.appendChild(this._timeLabel);

    // Exit button.
    const exit = this._iconButton(ICONS.close, 'Exit replay');
    exit.style.marginLeft = '4px';
    exit.style.color = '#ef5350';
    exit.addEventListener('click', () => this._controller.exit(), { signal });
    this._root.appendChild(exit);

    this._unsubscribe = this._controller.onStateChange((s) => this._render(s));
  }

  destroy(): void {
    this._unsubscribe();
    this._abort.abort();
    this._root.remove();
  }

  private _render(state: ReplayState): void {
    this._root.style.display = state.enabled ? 'flex' : 'none';
    if (!state.enabled) return;

    // Slider — update min/max in case the data length changed.
    this._slider.min = '1';
    this._slider.max = String(Math.max(1, state.totalBars));
    // Avoid clobbering the user's mid-drag value: only update if it doesn't
    // already match. Comparing as strings is safer than parsing.
    if (this._slider.value !== String(state.cursor)) {
      this._slider.value = String(state.cursor);
    }

    // Play button glyph.
    this._playBtn.innerHTML = state.playing ? ICONS.pause : ICONS.play;

    // Speed buttons.
    for (const [speed, btn] of this._speedButtons) {
      const active = state.speed === speed;
      Object.assign(btn.style, this._speedButtonStyle(active));
    }

    // Time label.
    this._timeLabel.textContent = state.cursorTime !== null
      ? formatTime(state.cursorTime)
      : `${state.cursor} / ${state.totalBars}`;
  }

  private _iconButton(icon: string, title: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.title = title;
    b.innerHTML = icon;
    Object.assign(b.style, {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      color: '#d1d4dc',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      padding: '0',
    });
    b.addEventListener('mouseover', () => { b.style.background = 'rgba(255, 255, 255, 0.08)'; });
    b.addEventListener('mouseout',  () => { b.style.background = 'transparent'; });
    return b;
  }

  private _speedButtonStyle(active: boolean): Partial<CSSStyleDeclaration> {
    return {
      padding: '4px 8px',
      fontSize: '11px',
      fontFamily: 'inherit',
      fontWeight: '500',
      background: active ? '#2962ff' : 'transparent',
      color: active ? '#ffffff' : '#9598a1',
      border: '1px solid ' + (active ? '#2962ff' : '#363a45'),
      borderRadius: '3px',
      cursor: 'pointer',
    };
  }
}

const ICONS = {
  stepBack:    '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 3 L4 13 M13 3 L4 8 L13 13 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linejoin="round"/></svg>',
  stepForward: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M12 3 L12 13 M3 3 L12 8 L3 13 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linejoin="round"/></svg>',
  play:        '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 3 L13 8 L4 13 Z" stroke="currentColor" stroke-width="1.2" fill="currentColor" stroke-linejoin="round"/></svg>',
  pause:       '<svg viewBox="0 0 16 16" width="14" height="14"><rect x="4" y="3" width="3" height="10" fill="currentColor"/><rect x="9" y="3" width="3" height="10" fill="currentColor"/></svg>',
  close:       '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
