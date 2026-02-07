'use client';

import { ExchangeClient } from './client';
import { OHLCV, OrderBookData, WebSocketMessageHandler } from './common';

const API_BASE_URL = 'https://www.okx.com/api/v5';
const WS_BASE_URL = 'wss://ws.okx.com:8443/ws/v5/public';

class OkxClient implements ExchangeClient {
    readonly name = 'okx';

    private intervalMap: { [key: string]: string } = {
        '1m': '1m',
        '5m': '5m',
        '30m': '30m',
        '1h': '1H',
        '4h': '4H',
        '1d': '1D',
    };

    formatApiSymbol(pair: string): string {
        return pair.toUpperCase();
    }

    formatPair(apiSymbol: string): string {
        return apiSymbol.toLowerCase();
    }

    async fetchKlines(symbol: string, interval: string): Promise<OHLCV[]> {
        const apiSymbol = this.formatApiSymbol(symbol);
        const okxInterval = this.intervalMap[interval];
        if (!okxInterval) throw new Error(`Interval not supported by OKX: ${interval}`);

        const response = await fetch(`${API_BASE_URL}/market/candles?instId=${apiSymbol}&bar=${okxInterval}&limit=300`);
        const data = await response.json();

        if (data.code !== '0') {
            throw new Error(`OKX API error: ${data.msg}`);
        }

        return data.data.map((d: any[]) => ({
            time: parseInt(d[0]) / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            value: parseFloat(d[7]), // Quote asset volume
            delta: 0,
        })).reverse(); // OKX returns in descending order
    }

    async fetchOrderBook(symbol: string): Promise<OrderBookData> {
        const apiSymbol = this.formatApiSymbol(symbol);
        const response = await fetch(`${API_BASE_URL}/market/books?instId=${apiSymbol}&sz=50`);
        const data = await response.json();
        
        if (data.code !== '0') {
            throw new Error(`OKX API error: ${data.msg}`);
        }

        const book = data.data[0];
        return {
            bids: book.bids.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
            asks: book.asks.map(([price, quantity]: [string, string]) => [parseFloat(price), parseFloat(quantity)]),
        };
    }

    async fetchAllSymbols(): Promise<string[]> {
        const response = await fetch(`${API_BASE_URL}/public/instruments?instType=SPOT`);
        const data = await response.json();

        if (data.code !== '0') {
            throw new Error(`OKX API error: ${data.msg}`);
        }

        return data.data
            .filter((s: any) => 
                s.state === 'live' && 
                (s.quoteCcy === 'USDT' || s.quoteCcy === 'USDC')
            )
            .map((s: any) => this.formatPair(s.instId))
            .sort();
    }

    connect(symbol: string, interval: string, handler: WebSocketMessageHandler): () => void {
        let ws: WebSocket | null = null;
        let pingInterval: NodeJS.Timeout | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let shouldReconnect = true;

        const okxInterval = this.intervalMap[interval];
        const apiSymbol = this.formatApiSymbol(symbol);
        
        const book: OrderBookData = { bids: [], asks: [] };

        const applyUpdate = (side: 'bids' | 'asks', updates: [string, string, string, string][]) => {
            updates.forEach(([price, size]) => {
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

            if (side === 'bids') {
                book.bids.sort((a, b) => b[0] - a[0]);
            } else {
                book.asks.sort((a, b) => a[0] - b[0]);
            }
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
                    op: 'subscribe',
                    args: [
                        { channel: 'books', instId: apiSymbol },
                        { channel: `candle${okxInterval}`, instId: apiSymbol },
                        { channel: 'trades', instId: apiSymbol }
                    ]
                }));

                if (pingInterval) clearInterval(pingInterval);
                pingInterval = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, 25000);
            };

            ws.onmessage = (event) => {
                if (event.data === 'pong') {
                    return;
                }
                const message = JSON.parse(event.data);

                if (message.arg?.channel.startsWith('books') && message.data) {
                    const bookData = message.data[0];
                    const action = message.action; // 'snapshot' or 'update'

                    if (action === 'snapshot') {
                        book.bids = (bookData.bids || []).map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]);
                        book.asks = (bookData.asks || []).map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]);
                    } else if (action === 'update') {
                        if (bookData.bids) applyUpdate('bids', bookData.bids);
                        if (bookData.asks) applyUpdate('asks', bookData.asks);
                    }
                    
                    handler({ stream: message.arg.channel, type: 'depth', data: { bids: [...book.bids], asks: [...book.asks] } }, this.name);
                } else if (message.arg?.channel.startsWith('candle') && message.data) {
                     const candle = message.data[0];
                     const newCandle: Partial<OHLCV> = {
                        time: parseInt(candle[0]) / 1000,
                        open: parseFloat(candle[1]),
                        high: parseFloat(candle[2]),
                        low: parseFloat(candle[3]),
                        close: parseFloat(candle[4]),
                        value: parseFloat(candle[7]),
                    };
                    handler({ stream: message.arg.channel, type: 'kline', data: newCandle }, this.name);
                } else if (message.arg?.channel === 'trades' && message.data) {
                    const trades = message.data;
                    trades.forEach((trade: any) => {
                        handler({
                            stream: message.arg.channel,
                            type: 'trade',
                            data: {
                                price: parseFloat(trade.px),
                                quantity: parseFloat(trade.sz),
                                time: parseInt(trade.ts),
                                isBuyerMaker: trade.side === 'sell', // 'buy' is taker buy, 'sell' is taker sell. isBuyerMaker is true when taker is seller.
                            }
                        }, this.name);
                    });
                }
            };

            ws.onerror = (error) => {
                // WebSocket Error
            };

            ws.onclose = () => {
                ws = null;
                if (pingInterval) clearInterval(pingInterval);
                
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
            if (pingInterval) {
                clearInterval(pingInterval);
                pingInterval = null;
            }
            
            if (ws) {
                 if (ws.readyState === WebSocket.OPEN) {
                     ws.send(JSON.stringify({
                        op: 'unsubscribe',
                        args: [
                            { channel: 'books', instId: apiSymbol },
                            { channel: `candle${okxInterval}`, instId: apiSymbol },
                            { channel: 'trades', instId: apiSymbol }
                        ]
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

export const okxClient = new OkxClient();
