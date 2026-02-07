'use client';

import { ExchangeClient } from './client';
import { OHLCV, OrderBookData, WebSocketMessageHandler } from './common';

// Using Coinbase public v2 API for compatibility
const API_BASE_URL = 'https://api.coinbase.com/v2';
// WebSocket is disabled for Coinbase due to auth requirements on Advanced Trade API

class CoinbaseClient implements ExchangeClient {
    readonly name = 'coinbase';

    // Coinbase v2 uses seconds for granularity
    private intervalMap: { [key: string]: number } = {
        '1m': 60,
        '5m': 300,
        '1h': 3600,
        '4h': 21600, // 6h is the closest available
        '1d': 86400,
    };
    
    formatApiSymbol(pair: string): string {
        return pair.toUpperCase();
    }

    formatPair(apiSymbol: string): string {
        return apiSymbol.toLowerCase();
    }

    async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
        const apiSymbol = this.formatApiSymbol(symbol);
        const granularity = this.intervalMap[interval];
        if (!granularity) throw new Error(`Interval not supported by Coinbase: ${interval}`);

        // v2 API doesn't require start/end but we can provide them.
        // It returns up to 300 candles.
        const response = await fetch(`${API_BASE_URL}/products/${apiSymbol}/candles?granularity=${granularity}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Coinbase API error: ${(data as any).message || 'Failed to fetch klines'}`);
        }
        
        if (!Array.isArray(data)) {
            return [];
        }

        return data.map((d: number[]) => ({
            time: d[0],
            low: d[1],
            high: d[2],
            open: d[3],
            close: d[4],
            value: d[5] * d[4], // Volume is in base, value is quote. Approx.
            delta: 0,
        })).reverse(); // API returns descending, we need ascending
    }

    async fetchOrderBook(symbol: string): Promise<OrderBookData> {
        // The v2 public API doesn't provide a L2 order book.
        // The advanced trade API requires auth, which we don't have client-side.
        // Returning empty data is consistent with the changelog notes.
        return Promise.resolve({ bids: [], asks: [] });
    }

    async fetchAllSymbols(): Promise<string[]> {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Coinbase API error: ${(data as any).message || 'Failed to fetch symbols'}`);
        }

        if (!Array.isArray(data)) {
            throw new Error('Coinbase API error: Expected an array of products');
        }

        return data
            .filter((s: any) => 
                !s.trading_disabled &&
                s.status === 'online' &&
                (s.quote_currency === 'USDT' || s.quote_currency === 'USD' || s.quote_currency === 'USDC')
            )
            .map((s: any) => this.formatPair(s.id))
            .sort();
    }

    connect(symbol: string, interval: string, handler: WebSocketMessageHandler, customOnClose: () => void): () => void {
        // Coinbase Advanced Trade WebSocket requires authentication, which is not feasible for a public client-side app.
        // The old public WebSocket is deprecated. We will disable real-time updates for Coinbase.
        
        // Return a no-op disconnect function
        return () => {};
    }
}

export const coinbaseClient = new CoinbaseClient();
