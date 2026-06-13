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

export class ReplayController {
  private _store: BarStore;
  private _playing = false;
  private _speed = 1;
  private _playTimer: ReturnType<typeof setTimeout> | null = null;
  private _listeners = new Set<ReplayListener>();

  constructor(store: BarStore) {
    this._store = store;
  }

  // ---- State subscription ----

  onStateChange(listener: ReplayListener): () => void {
    this._listeners.add(listener);
    listener(this.state);
    return () => {
      this._listeners.delete(listener);
    };
  }

  get state(): ReplayState {
    const cursor = this._store.replayCursor;
    const time = this._store.actualLength > 0 && cursor > 0
      ? this._store.time[cursor - 1] ?? null
      : null;
    return {
      enabled: this._store.isReplaying,
      playing: this._playing,
      cursor,
      totalBars: this._store.actualLength,
      speed: this._speed,
      cursorTime: time,
    };
  }

  // ---- Control ----

  /**
   * Enter replay mode. Defaults the cursor to 70% of the data so the user
   * has both visible history and visible "future" to step through.
   */
  enter(cursor?: number): void {
    if (this._store.isReplaying) return;
    if (this._store.actualLength === 0) return;
    const target = cursor ?? Math.max(1, Math.floor(this._store.actualLength * 0.7));
    this._store.enterReplay(target);
    this._notify();
  }

  exit(): void {
    if (!this._store.isReplaying) return;
    this.pause();
    this._store.exitReplay();
    this._notify();
  }

  setCursor(cursor: number): void {
    if (!this._store.isReplaying) return;
    this._store.setReplayCursor(cursor);
    this._notify();
  }

  stepForward(): void {
    if (!this._store.isReplaying) return;
    const moved = this._store.advanceReplay();
    if (!moved) this.pause();
    this._notify();
  }

  stepBackward(): void {
    if (!this._store.isReplaying) return;
    const next = Math.max(1, this._store.replayCursor - 1);
    this._store.setReplayCursor(next);
    this._notify();
  }

  // ---- Playback ----

  play(): void {
    if (!this._store.isReplaying) return;
    if (this._playing) return;
    if (this._store.replayCursor >= this._store.actualLength) return;
    this._playing = true;
    this._notify();
    this._scheduleNext();
  }

  pause(): void {
    if (!this._playing) return;
    this._playing = false;
    if (this._playTimer !== null) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    this._notify();
  }

  toggle(): void {
    if (this._playing) this.pause();
    else this.play();
  }

  /** Bars-per-second multiplier. Common values: 1, 2, 5, 10. */
  setSpeed(speed: number): void {
    this._speed = Math.max(0.1, speed);
    this._notify();
  }

  destroy(): void {
    this.pause();
    this._listeners.clear();
    if (this._store.isReplaying) this._store.exitReplay();
  }

  // ---- Internal ----

  private _scheduleNext(): void {
    if (!this._playing) return;
    const intervalMs = 1000 / this._speed;
    this._playTimer = setTimeout(() => {
      this._playTimer = null;
      if (!this._playing) return;
      const moved = this._store.advanceReplay();
      if (!moved) {
        this._playing = false;
        this._notify();
        return;
      }
      this._notify();
      this._scheduleNext();
    }, intervalMs);
  }

  private _notify(): void {
    const s = this.state;
    for (const l of this._listeners) l(s);
  }
}
