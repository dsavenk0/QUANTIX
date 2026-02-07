'use client';

import { ExchangeClient } from './client';
import { OHLCV, OrderBookData, WebSocketMessageHandler } from './common';

const API_BASE_URL = 'https://api.kraken.com/0/public';
const WS_BASE_URL = 'wss://ws.kraken.com';

class KrakenClient implements ExchangeClient {
    readonly name = 'kraken';

    private intervalMap: { [key: string]: number } = {
        '1m': 1,
        '5m': 5,
        '30m': 30,
        '1h': 60,
        '4h': 240,
        '1d': 1440,
    };
    
    private symbolMap: { [key: string]: string } = {};
    private reverseSymbolMap: { [key: string]: string } = {};
    
    // We need to map our "btc-usdt" to Kraken's "XBT/USDT"
    formatApiSymbol(pair: string): string {
        const uppercasePair = pair.replace('-', '/').toUpperCase();
        // This is a fallback, the map should be populated by fetchAllSymbols
        return this.symbolMap[uppercasePair] || uppercasePair.replace('BTC', 'XBT');
    }
    
    // and Kraken's "XBT/USDT" back to "btc-usdt"
    formatPair(apiSymbol: string): string {
        const formatted = (this.reverseSymbolMap[apiSymbol] || apiSymbol).toLowerCase();
        return formatted.replace('/', '-');
    }

    async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
        const wsApiSymbol = this.formatApiSymbol(symbol);
        const restApiSymbol = wsApiSymbol.replace('/', ''); // Use altname format for REST
        const krakenInterval = this.intervalMap[interval];
        if (!krakenInterval) throw new Error(`Interval not supported by Kraken: ${interval}`);

        const response = await fetch(`${API_BASE_URL}/OHLC?pair=${restApiSymbol}&interval=${krakenInterval}`);
        const data = await response.json();

        if (data.error && data.error.length > 0) {
            throw new Error(`Kraken API error: ${data.error.join(', ')}`);
        }
        
        if (!data.result) {
            throw new Error('Kraken API error: Invalid response for klines');
        }

        const pairKey = Object.keys(data.result)[0];
        if(!data.result[pairKey]) return [];
        
        return data.result[pairKey].slice(-300).map((d: any[]) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            value: parseFloat(d[6]) * parseFloat(d[4]), // vwap * volume - approx quote volume
            delta: 0,
        }));
    }

    async fetchOrderBook(symbol: string): Promise<OrderBookData> {
        const wsApiSymbol = this.formatApiSymbol(symbol);
        const restApiSymbol = wsApiSymbol.replace('/', ''); // Use altname format for REST
        const response = await fetch(`${API_BASE_URL}/Depth?pair=${restApiSymbol}&count=20`);
        const data = await response.json();
        
        if (data.error && data.error.length > 0) {
            throw new Error(`Kraken API error: ${data.error.join(', ')}`);
        }
        
        if (!data.result) {
            throw new Error('Kraken API error: Invalid response for order book');
        }

        const pairKey = Object.keys(data.result)[0];
        if(!data.result[pairKey]) return {bids: [], asks: []};

        const book = data.result[pairKey];
        return {
            bids: book.bids.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
            asks: book.asks.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
        };
    }

    async fetchAllSymbols(): Promise<string[]> {
        const response = await fetch(`${API_BASE_URL}/AssetPairs`);
        const data = await response.json();

        if (data.error && data.error.length > 0) {
            throw new Error(`Kraken API error: ${data.error.join(', ')}`);
        }

        if (!data.result) {
            return [];
        }
        
        this.symbolMap = {};
        this.reverseSymbolMap = {};

        const symbols = Object.values(data.result)
            .filter((s: any) => 
                s.wsname &&
                (s.wsname.endsWith('/USDT') || s.wsname.endsWith('/USD') || s.wsname.endsWith('/USDC')) &&
                !s.wsname.includes('.d')
            )
            .map((s: any) => {
                let wsname = s.wsname;
                let clientName = wsname.replace('XBT', 'BTC');
                
                this.symbolMap[clientName] = wsname;
                this.reverseSymbolMap[wsname] = clientName;
                
                return this.formatPair(clientName);
            });
            
        return symbols.sort();
    }

    connect(symbol: string, interval: string, handler: WebSocketMessageHandler): () => void {
        let ws: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let shouldReconnect = true;

        const apiSymbol = this.formatApiSymbol(symbol);
        const krakenInterval = this.intervalMap[interval];

        const book: OrderBookData = { bids: [], asks: [] };

        const applyBookUpdate = (side: 'bids' | 'asks', updates: any[]) => {
            updates.forEach(([price, size, _]) => {
                const priceNum = parseFloat(price);
                const sizeNum = parseFloat(size);
                const bookSide = book[side];

                const index = bookSide.findIndex(level => level[0] === priceNum);

                if (sizeNum === 0) {
                    if (index !== -1) bookSide.splice(index, 1);
                } else {
                    if (index !== -1) {
                        bookSide[index][1] = sizeNum;
                    } else {
                        bookSide.push([priceNum, sizeNum]);
                    }
                }
            });
            book.bids.sort((a, b) => b[0] - a[0]);
            book.asks.sort((a, b) => a[0] - b[0]);
        };

        const handleReconnect = () => {
            if (!shouldReconnect) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(performConnect, 5000);
        };
        
        const performConnect = () => {
            if (!shouldReconnect) return;

            ws = new WebSocket(WS_BASE_URL);

            ws.onopen = () => {
                ws?.send(JSON.stringify({
                    event: 'subscribe',
                    pair: [apiSymbol],
                    subscription: { name: 'book', depth: 25 }
                }));
                ws?.send(JSON.stringify({
                    event: 'subscribe',
                    pair: [apiSymbol],
                    subscription: { name: 'ohlc', interval: krakenInterval }
                }));
                 ws?.send(JSON.stringify({
                    event: 'subscribe',
                    pair: [apiSymbol],
                    subscription: { name: 'trade' }
                }));
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (!Array.isArray(message) || typeof message[2] !== 'string') return;

                const [_, payload, channelName, pair] = message;
                if (pair !== apiSymbol) return;

                if (channelName.startsWith('ohlc')) {
                    const [time, etime, open, high, low, close, vwap, volume, count] = payload;
                    const newCandle: Partial<OHLCV> = {
                        time: parseFloat(time),
                        open: parseFloat(open),
                        high: parseFloat(high),
                        low: parseFloat(low),
                        close: parseFloat(close),
                        value: parseFloat(volume) * parseFloat(vwap),
                    };
                    handler({ stream: channelName, type: 'kline', data: newCandle }, this.name);
                }

                if (channelName.startsWith('book')) {
                    // Snapshot
                    if (payload.bs && payload.as) {
                        book.bids = payload.bs.map(([p, q]: string[]) => [parseFloat(p), parseFloat(q)]);
                        book.asks = payload.as.map(([p, q]: string[]) => [parseFloat(p), parseFloat(q)]);
                    } else { // Updates
                        if (payload.b) applyBookUpdate('bids', payload.b);
                        if (payload.a) applyBookUpdate('asks', payload.a);
                    }
                    // Send a copy to avoid mutation issues
                    handler({ stream: channelName, type: 'depth', data: {bids: [...book.bids].slice(0,25), asks: [...book.asks].slice(0,25)} }, this.name);
                }

                if (channelName === 'trade') {
                    payload.forEach((trade: any[]) => {
                         const [price, volume, time, side, orderType, misc] = trade;
                         handler({
                            stream: channelName,
                            type: 'trade',
                            data: {
                                price: parseFloat(price),
                                quantity: parseFloat(volume),
                                time: parseFloat(time) * 1000,
                                isBuyerMaker: side === 's', // s = sell, b = buy. Taker side.
                            }
                        }, this.name);
                    });
                }
            };

            ws.onerror = (error) => {};

            ws.onclose = () => {
                ws = null;
                if (!shouldReconnect) {
                    return;
                }
                handleReconnect();
            };
        };
        
        performConnect();

        return () => {
            shouldReconnect = false;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            if (ws) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        event: 'unsubscribe',
                        pair: [apiSymbol],
                        subscription: { name: 'book' }
                    }));
                    ws.send(JSON.stringify({
                        event: 'unsubscribe',
                        pair: [apiSymbol],
                        subscription: { name: 'ohlc' }
                    }));
                    ws.send(JSON.stringify({
                        event: 'unsubscribe',
                        pair: [apiSymbol],
                        subscription: { name: 'trade' }
                    }));
                }
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

export const krakenClient = new KrakenClient();
