export interface Position {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    entryPrice: number;
    qty: number;
    sl?: number;
    tp?: number;
    openTime: number;
    label?: string;
    color?: string;
}
export type PositionEventType = 'opened' | 'closed' | 'updated';
export interface PositionEvent {
    type: PositionEventType;
    position: Position;
}
//# sourceMappingURL=types.d.ts.map