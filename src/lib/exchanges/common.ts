export type OHLCV = { time: number; open: number; high: number; low: number; close: number; value: number; delta: number; };
export type OrderBookData = { bids: [number, number][]; asks: [number, number][] };
export type Indicator = { id: string; name: string; period: number };
export type IndicatorData = { [key: string]: (number | null)[] };

export type Trade = {
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
};

export type WebSocketMessage = 
    | { stream: string; type: 'kline'; data: Partial<OHLCV> }
    | { stream: string; type: 'depth'; data: OrderBookData }
    | { stream: string; type: 'trade'; data: Trade };

export type WebSocketMessageHandler = (message: WebSocketMessage, exchangeName: string) => void;
