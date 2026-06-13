import type { ReplayController } from './ReplayController';
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
export declare class ReplayToolbar {
    private _container;
    private _controller;
    private _root;
    private _slider;
    private _playBtn;
    private _timeLabel;
    private _speedButtons;
    private _unsubscribe;
    private _abort;
    constructor(container: HTMLElement, controller: ReplayController);
    destroy(): void;
    private _render;
    private _iconButton;
    private _speedButtonStyle;
}
//# sourceMappingURL=ReplayToolbar.d.ts.map