export class DrawingToolbar {
    constructor(container, emit) {
        this._activeTool = null;
        this._abort = new AbortController();
        this._container = container;
        this._emit = emit;
        this._root = document.createElement('div');
        this._root.setAttribute('data-rokcat', 'drawing-toolbar');
        Object.assign(this._root.style, {
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px',
            background: 'rgba(30, 34, 45, 0.85)',
            border: '1px solid #363a45',
            borderRadius: '6px',
            backdropFilter: 'blur(4px)',
            zIndex: '50',
        });
        container.appendChild(this._root);
        this._render();
    }
    setActiveTool(tool) {
        if (this._activeTool === tool)
            return;
        this._activeTool = tool;
        this._render();
    }
    destroy() {
        this._abort.abort();
        this._root.remove();
    }
    // ---- Internals ----
    _render() {
        this._root.innerHTML = '';
        for (const def of TOOL_DEFS) {
            this._root.appendChild(this._button({
                tool: def.tool,
                title: def.label,
                icon: def.icon,
                active: this._activeTool === def.tool,
            }));
        }
        // Spacer.
        const sep = document.createElement('div');
        Object.assign(sep.style, { height: '1px', background: '#363a45', margin: '4px 2px' });
        this._root.appendChild(sep);
        // Delete-all action.
        this._root.appendChild(this._actionButton('delete-all', 'Remove all drawings', ICONS.trash));
    }
    _button(opts) {
        const b = document.createElement('button');
        b.title = opts.title;
        b.dataset.tool = opts.tool ?? 'select';
        b.innerHTML = opts.icon;
        Object.assign(b.style, this._buttonStyle(opts.active));
        b.addEventListener('click', () => {
            // Re-clicking the active tool returns to select mode.
            const newTool = this._activeTool === opts.tool ? null : opts.tool;
            this._activeTool = newTool;
            this._emit({ type: 'tool', tool: newTool });
            this._render();
        }, { signal: this._abort.signal });
        return b;
    }
    _actionButton(action, title, icon) {
        const b = document.createElement('button');
        b.title = title;
        b.dataset.action = action;
        b.innerHTML = icon;
        Object.assign(b.style, this._buttonStyle(false));
        b.addEventListener('click', () => {
            if (action === 'delete-all')
                this._emit({ type: 'delete-all' });
        }, { signal: this._abort.signal });
        return b;
    }
    _buttonStyle(active) {
        return {
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: active ? '#2962ff' : 'transparent',
            color: active ? '#ffffff' : '#9598a1',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            padding: '0',
            transition: 'background 0.1s, color 0.1s',
        };
    }
}
const ICONS = {
    trendline: '<svg viewBox="0 0 20 20" width="16" height="16"><line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" stroke-width="1.5"/><circle cx="3"  cy="16" r="1.5" fill="currentColor"/><circle cx="17" cy="4"  r="1.5" fill="currentColor"/></svg>',
    horizontal: '<svg viewBox="0 0 20 20" width="16" height="16"><line x1="2"  y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>',
    vertical: '<svg viewBox="0 0 20 20" width="16" height="16"><line x1="10" y1="2"  x2="10" y2="18" stroke="currentColor" stroke-width="1.5"/></svg>',
    fibonacci: '<svg viewBox="0 0 20 20" width="16" height="16"><line x1="2" y1="4"  x2="18" y2="4"  stroke="currentColor" stroke-width="1"/><line x1="2" y1="8"  x2="18" y2="8"  stroke="currentColor" stroke-width="1"/><line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1"/><line x1="2" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="1"/></svg>',
    rectangle: '<svg viewBox="0 0 20 20" width="16" height="16"><rect x="3" y="5" width="14" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    freehand: '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 15 Q5 8 8 10 Q11 12 13 7 Q15 3 17 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 20 20" width="14" height="14"><path d="M5 6 L5 16 Q5 17 6 17 L14 17 Q15 17 15 16 L15 6" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 4 L12 4 L12 6 L8 6 Z" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="8" y1="9" x2="8" y2="14" stroke="currentColor" stroke-width="1"/><line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" stroke-width="1"/></svg>',
};
const TOOL_DEFS = [
    { tool: 'trendline', label: 'Trendline', icon: ICONS.trendline },
    { tool: 'horizontal', label: 'Horizontal line', icon: ICONS.horizontal },
    { tool: 'vertical', label: 'Vertical line', icon: ICONS.vertical },
    { tool: 'fibonacci', label: 'Fibonacci retracement', icon: ICONS.fibonacci },
    { tool: 'rectangle', label: 'Rectangle', icon: ICONS.rectangle },
    { tool: 'freehand', label: 'Freehand pen', icon: ICONS.freehand },
];
//# sourceMappingURL=DrawingToolbar.js.map