'use client';

import { ExchangeClient } from './client';
import { OHLCV, OrderBookData, WebSocketMessageHandler, WebSocketMessage } from './common';

const API_BASE_URL = 'https://api.binance.com/api/v3';
const WS_BASE_URL = 'wss://stream.binance.com:9443/stream?streams=';

class BinanceClient implements ExchangeClient {
    readonly name = 'binance';

    formatApiSymbol(pair: string): string {
        return pair.replace('-', '').toUpperCase();
    }
    
    formatPair(apiSymbol: string): string {
        const quoteAssets = ['USDT', 'BUSD', 'USDC', 'TUSD'];
        const quoteAsset = quoteAssets.find(qa => apiSymbol.endsWith(qa));
        
        if (quoteAsset) {
            const baseAsset = apiSymbol.substring(0, apiSymbol.length - quoteAsset.length);
            return `${baseAsset.toLowerCase()}-${quoteAsset.toLowerCase()}`;
        }
        // Fallback for other pairs, might not be accurate
        return apiSymbol.toLowerCase();
    }

    async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
        const apiSymbol = this.formatApiSymbol(symbol);
        const response = await fetch(`${API_BASE_URL}/klines?symbol=${apiSymbol}&interval=${interval}&limit=300`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            if (data.msg) throw new Error(`Binance API error: ${data.msg}`);
            return [];
        }
        return data.map((d: any) => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            value: parseFloat(d[7]), // Quote asset volume
            delta: 0,
        }));
    }

    async fetchOrderBook(symbol: string): Promise<OrderBookData> {
        const apiSymbol = this.formatApiSymbol(symbol);
        const response = await fetch(`${API_BASE_URL}/depth?symbol=${apiSymbol}&limit=20`);
        const data = await response.json();
        if (data.code) { // Error handling
            throw new Error(`Binance API error: ${data.msg}`);
        }
        return {
            bids: data.bids.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
            asks: data.asks.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
        };
    }

    async fetchAllSymbols(): Promise<string[]> {
        const response = await fetch(`${API_BASE_URL}/exchangeInfo`);
        const data = await response.json();
        return data.symbols
            .filter((s: any) => 
                s.status === 'TRADING' && 
                (s.quoteAsset === 'USDT' || s.quoteAsset === 'USDC') &&
                !s.symbol.includes('_')
            )
            .map((s: any) => this.formatPair(s.symbol))
            .sort();
    }

    connect(symbol: string, interval: string, handler: WebSocketMessageHandler): () => void {
        let ws: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let shouldReconnect = true;

        const apiSymbol = this.formatApiSymbol(symbol).toLowerCase();
        const streams = [
            `${apiSymbol}@kline_${interval}`,
            `${apiSymbol}@depth20@100ms`,
            `${apiSymbol}@aggTrade`
        ].join('/');
        const url = `${WS_BASE_URL}${streams}`;

        const handleReconnect = () => {
            if (!shouldReconnect) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(performConnect, 5000);
        };
        
        const performConnect = () => {
            if (!shouldReconnect) return;
            
            try {
                ws = new WebSocket(url);
            } catch (error) {
                handleReconnect();
                return;
            }

            ws.onopen = () => {};

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (!message.data) return;

                    if (message.stream.includes('@depth')) {
                        const { bids, asks } = message.data;
                        if (!bids || !asks) return;
                        const newOrderBook: OrderBookData = {
                            bids: bids.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]),
                            asks: asks.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]),
                        };
                        handler({ stream: message.stream, type: 'depth', data: newOrderBook }, this.name);
                    } else if (message.stream.includes('@kline')) {
                        const { k: kline } = message.data;
                        if (!kline) return;
                        const newCandle: Partial<OHLCV> = {
                            time: kline.t / 1000,
                            open: parseFloat(kline.o),
                            high: parseFloat(kline.h),
                            low: parseFloat(kline.l),
                            close: parseFloat(kline.c),
                            value: parseFloat(kline.q),
                        };
                        handler({ stream: message.stream, type: 'kline', data: newCandle }, this.name);
                    } else if (message.stream.includes('@aggTrade')) {
                        const trade = message.data;
                        if (!trade.p) return;
                        handler({
                            stream: message.stream,
                            type: 'trade',
                            data: {
                                price: parseFloat(trade.p),
                                quantity: parseFloat(trade.q),
                                time: trade.T,
                                isBuyerMaker: trade.m,
                            }
                        }, this.name);
                    }
                } catch (e) {
                    // Error processing message
                }
            };

            ws.onerror = (error) => {
                // onclose will be called automatically after an error.
            };

            ws.onclose = () => {
                ws = null;
                if (!shouldReconnect) {
                    return;
                }
                handleReconnect();
            };
        };

        performConnect();

        return () => { // The disconnect function
            shouldReconnect = false;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                ws.close();
                ws = null;
            }
        };
    }
}

export const binanceClient = new BinanceClient();
