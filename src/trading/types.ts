export interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  qty: number;
  sl?: number;    // stop-loss price (optional)
  tp?: number;    // take-profit price (optional)
  openTime: number;  // unix ms
  label?: string;
  color?: string;    // override, else theme-driven
}

export type PositionEventType = 'opened' | 'closed' | 'updated';
export interface PositionEvent { type: PositionEventType; position: Position }
