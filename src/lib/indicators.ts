import { SMA, EMA, RSI } from 'technicalindicators';

type OHLCV = { time: number; open: number; high: number; low: number; close: number; value: number };

export function calculateSMA(data: OHLCV[], period: number): (number | null)[] {
    if (data.length < period) {
        return new Array(data.length).fill(null);
    }
    const closePrices = data.map(d => d.close);
    const smaValues = SMA.calculate({ period, values: closePrices });
    const padding = new Array(data.length - smaValues.length).fill(null);
    return [...padding, ...smaValues];
}

export function calculateEMA(data: OHLCV[], period: number): (number | null)[] {
    if (data.length < period) {
        return new Array(data.length).fill(null);
    }
    const closePrices = data.map(d => d.close);
    const emaValues = EMA.calculate({ period, values: closePrices });
    const padding = new Array(data.length - emaValues.length).fill(null);
    return [...padding, ...emaValues];
}

export function calculateRSI(data: OHLCV[], period: number): (number | null)[] {
    if (data.length <= period) {
        return new Array(data.length).fill(null);
    }
    const closePrices = data.map(d => d.close);
    const rsiValues = RSI.calculate({ period, values: closePrices });
    const padding = new Array(data.length - rsiValues.length).fill(null);
    return [...padding, ...rsiValues];
}
