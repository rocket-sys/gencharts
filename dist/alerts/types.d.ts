export type AlertId = string;
/** Fire when price crosses upward through the level, or downward. */
export type AlertCondition = 'cross-above' | 'cross-below';
/** Active = waiting. Triggered = fired (kept visible until dismissed). */
export type AlertStatus = 'active' | 'triggered';
export interface Alert {
    id: AlertId;
    price: number;
    condition: AlertCondition;
    status: AlertStatus;
    /** Optional user label shown in the badge and toast. */
    label?: string;
    createdAt: number;
    triggeredAt?: number;
}
//# sourceMappingURL=types.d.ts.map