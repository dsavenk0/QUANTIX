
import type { ExchangeClient } from './client';

export const getExchangeClient = async (exchange: string): Promise<ExchangeClient | null> => {
  switch (exchange) {
    case 'binance':
      return (await import('./binance')).binanceClient;
    case 'kraken':
      return (await import('./kraken')).krakenClient;
    case 'bybit':
      return (await import('./bybit')).bybitClient;
    case 'okx':
      return (await import('./okx')).okxClient;
    default:
      return null;
  }
};

export const availableExchanges = ['binance', 'kraken', 'bybit', 'okx'];
