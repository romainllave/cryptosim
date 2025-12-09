import type { CandleData } from '../utils/chartData';

const BASE_URL = 'https://api.binance.com/api/v3';
const WS_URL = 'wss://stream.binance.com:9443/ws';

// Map our simple symbols to Binance pairs (e.g. BTC -> BTCUSDT)
export const symbolToPair = (symbol: string) => `${symbol.toUpperCase()}USDT`;

export const fetchKlines = async (symbol: string, interval: string = '1m', limit: number = 200): Promise<CandleData[]> => {
  const pair = symbolToPair(symbol);
  try {
    const response = await fetch(`${BASE_URL}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();

    // Binance response: [ [mit, open, high, low, close, volume, ...], ... ]
    return data.map((d: any) => ({
      time: d[0] / 1000,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
    }));
  } catch (error) {
    console.error("Failed to fetch klines:", error);
    return [];
  }
};

type TickerCallback = (data: { [symbol: string]: { price: number, change: number } }) => void;

export const subscribeToTickers = (symbols: string[], callback: TickerCallback) => {
  const streams = symbols.map(s => `${symbolToPair(s).toLowerCase()}@ticker`).join('/');
  const ws = new WebSocket(`${WS_URL}/${streams}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const data = msg.data || msg;

      if (!data || !data.s) return;

      // Normalize symbol from BTCUSDT -> BTC
      const symbol = data.s.replace('USDT', '');

      callback({
        [symbol]: {
          price: parseFloat(data.c),
          change: parseFloat(data.P)
        }
      });
    } catch (e) {
      console.error("Ticker WS Error:", e);
    }
  };

  return () => ws.close();
};

type KlineCallback = (candle: CandleData) => void;

export const subscribeToKline = (symbol: string, interval: string, callback: KlineCallback) => {
  const pair = symbolToPair(symbol).toLowerCase();
  const ws = new WebSocket(`${WS_URL}/${pair}@kline_${interval}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const k = msg.k; // kline object

      if (!k) return;

      const candle: CandleData = {
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c)
      };

      callback(candle);
    } catch (e) {
      console.error("Kline WS Error:", e);
    }
  };

  return () => ws.close();
};
