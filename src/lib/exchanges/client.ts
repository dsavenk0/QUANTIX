import { OHLCV, OrderBookData, WebSocketMessageHandler } from './common';

export interface ExchangeClient {
  readonly name: string;
  
  fetchKlines(symbol: string, interval: string): Promise<OHLCV[]>;
  fetchOrderBook(symbol: string): Promise<OrderBookData>;
  fetchAllSymbols(): Promise<string[]>;

  connect(
    symbol: string, 
    interval: string, 
    handler: WebSocketMessageHandler
  ): () => void;

  formatApiSymbol(pair: string): string;
  formatPair(apiSymbol: string): string;
}
