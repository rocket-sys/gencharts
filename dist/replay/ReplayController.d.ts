import type { BarStore } from '../data/BarStore';
/**
 * ReplayController — the playback state machine.
 *
 * Sits on top of BarStore.enterReplay / setReplayCursor / advanceReplay /
 * exitReplay. Adds the bits the store can't own:
 *   - a play/pause loop driven by setTimeout, with adjustable speed
 *   - a single broadcast channel (`onStateChange`) so any UI piece — the
 *     toolbar, an external dashboard, your Kael backtester — can subscribe
 *     to state transitions without reaching into the store directly
 *
 * Lifecycle: instantiate with a BarStore, call enter() to begin replay,
 * exit() to end. Step forward / backward / set the cursor / play / pause /
 * change speed at will. State updates fire onStateChange after each call.
 *
 * Why setTimeout (not setInterval) for the play loop: setTimeout lets us
 * compute the next delay based on the current speed every step, so changing
 * speed mid-playback takes effect on the next bar instead of needing to
 * cancel-and-restart the interval. Also, it self-terminates when we reach
 * the end of data, without needing a manual stop call from inside the loop.
 */
export interface ReplayState {
    enabled: boolean;
    playing: boolean;
    /** Current cursor position (1..totalBars). */
    cursor: number;
    totalBars: number;
    /** Multiplier on bars-per-second. 1 = 1 bar/sec, 5 = 5 bars/sec, etc. */
    speed: number;
    /** Timestamp (epoch ms) of the bar at the cursor, if any. */
    cursorTime: number | null;
}
export type ReplayListener = (state: ReplayState) => void;
export declare class ReplayController {
    private _store;
    private _playing;
    private _speed;
    private _playTimer;
    private _listeners;
    constructor(store: BarStore);
    onStateChange(listener: ReplayListener): () => void;
    get state(): ReplayState;
    /**
     * Enter replay mode. Defaults the cursor to 70% of the data so the user
     * has both visible history and visible "future" to step through.
     */
    enter(cursor?: number): void;
    exit(): void;
    setCursor(cursor: number): void;
    stepForward(): void;
    stepBackward(): void;
    play(): void;
    pause(): void;
    toggle(): void;
    /** Bars-per-second multiplier. Common values: 1, 2, 5, 10. */
    setSpeed(speed: number): void;
    destroy(): void;
    private _scheduleNext;
    private _notify;
}
//# sourceMappingURL=ReplayController.d.ts.map