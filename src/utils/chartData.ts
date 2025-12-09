export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export function generateInitialData(count: number = 1440, startPrice: number = 50000): CandleData[] {
    // 1440 candles with 15-minute intervals = 15 days of data
    const data: CandleData[] = [];
    let currentPrice = startPrice;
    const now = new Date();
    const intervalSeconds = 15 * 60; // 15 minutes per candle
    const startTime = new Date(now.getTime() - count * intervalSeconds * 1000).getTime() / 1000;

    for (let i = 0; i < count; i++) {
        const time = startTime + i * intervalSeconds;
        const volatility = currentPrice * 0.002;
        const change = (Math.random() - 0.5) * volatility;
        const open = currentPrice;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;

        data.push({
            time: time as any, // lightweight-charts accepts number (seconds)
            open,
            high,
            low,
            close,
        });

        currentPrice = close;
    }
    return data;
}

export function generateNextCandle(lastCandle: CandleData): CandleData {
    const intervalSeconds = 15 * 60; // 15 minutes per candle
    const time = (lastCandle.time as number) + intervalSeconds;
    const currentPrice = lastCandle.close;
    const volatility = currentPrice * 0.002;
    const change = (Math.random() - 0.5) * volatility;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    return {
        time: time as any,
        open,
        high,
        low,
        close,
    };
}
