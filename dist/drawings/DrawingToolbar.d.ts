import type { DrawingType } from './types';
/**
 * Drawing toolbar — a vertical strip of icons fixed to the left edge of the
 * chart container. Lets the user pick which drawing tool is active.
 *
 * Each button has data-tool (the DrawingType) or data-action='delete-all'.
 * Clicking a tool button toggles it (re-clicking the active tool returns to
 * select mode). The toolbar maintains its own active-tool state for visual
 * feedback and emits onToolChange when it changes.
 *
 * All styling is inline so the toolbar works without a host stylesheet.
 * Replace freely for white-label theming.
 */
export type DrawingToolEvent = {
    type: 'tool';
    tool: DrawingType | null;
} | {
    type: 'delete-all';
};
export declare class DrawingToolbar {
    private _container;
    private _root;
    private _emit;
    private _activeTool;
    private _abort;
    constructor(container: HTMLElement, emit: (e: DrawingToolEvent) => void);
    setActiveTool(tool: DrawingType | null): void;
    destroy(): void;
    private _render;
    private _button;
    private _actionButton;
    private _buttonStyle;
}
//# sourceMappingURL=DrawingToolbar.d.ts.map