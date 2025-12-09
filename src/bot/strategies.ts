import type { CandleData } from '../utils/chartData';
import type { Signal, StrategyResult } from './botTypes';

/**
 * SMA Crossover Strategy
 * BUY when price crosses above SMA-20
 * SELL when price crosses below SMA-20
 */
export function smaCrossover(candles: CandleData[], smaPeriod: number = 20): StrategyResult {
    if (candles.length < smaPeriod + 1) {
        return { strategy: 'SMA Crossover', signal: 'HOLD', confidence: 0 };
    }

    // Calculate SMA
    const recentCandles = candles.slice(-smaPeriod);
    const sma = recentCandles.reduce((sum, c) => sum + c.close, 0) / smaPeriod;

    const currentPrice = candles[candles.length - 1].close;
    const previousPrice = candles[candles.length - 2].close;

    // Calculate distance from SMA for confidence
    const distance = Math.abs((currentPrice - sma) / sma) * 100;
    const confidence = Math.min(distance * 20, 100);

    let signal: Signal = 'HOLD';

    // Crossover detection
    if (previousPrice <= sma && currentPrice > sma) {
        signal = 'BUY';
    } else if (previousPrice >= sma && currentPrice < sma) {
        signal = 'SELL';
    } else if (currentPrice > sma * 1.005) {
        signal = 'BUY'; // Still bullish if above SMA
    } else if (currentPrice < sma * 0.995) {
        signal = 'SELL'; // Still bearish if below SMA
    }

    return { strategy: 'SMA Crossover', signal, confidence };
}

/**
 * Mean Reversion Strategy
 * BUY when price is significantly below average (oversold)
 * SELL when price is significantly above average (overbought)
 */
export function meanReversion(candles: CandleData[], period: number = 20, threshold: number = 2): StrategyResult {
    if (candles.length < period) {
        return { strategy: 'Mean Reversion', signal: 'HOLD', confidence: 0 };
    }

    const recentCandles = candles.slice(-period);
    const mean = recentCandles.reduce((sum, c) => sum + c.close, 0) / period;

    // Calculate standard deviation
    const squaredDiffs = recentCandles.map(c => Math.pow(c.close - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / period;
    const stdDev = Math.sqrt(avgSquaredDiff);

    const currentPrice = candles[candles.length - 1].close;
    const zScore = (currentPrice - mean) / stdDev;

    const confidence = Math.min(Math.abs(zScore) * 30, 100);

    let signal: Signal = 'HOLD';

    if (zScore < -threshold) {
        signal = 'BUY'; // Oversold
    } else if (zScore > threshold) {
        signal = 'SELL'; // Overbought
    }

    return { strategy: 'Mean Reversion', signal, confidence };
}

/**
 * Momentum Strategy
 * BUY on strong upward momentum
 * SELL on strong downward momentum
 */
export function momentum(candles: CandleData[], period: number = 5): StrategyResult {
    if (candles.length < period + 1) {
        return { strategy: 'Momentum', signal: 'HOLD', confidence: 0 };
    }

    const recentCandles = candles.slice(-period);

    // Count bullish vs bearish candles
    let bullishCount = 0;
    let bearishCount = 0;
    let totalChange = 0;

    for (let i = 0; i < recentCandles.length; i++) {
        const candle = recentCandles[i];
        if (candle.close > candle.open) {
            bullishCount++;
        } else if (candle.close < candle.open) {
            bearishCount++;
        }

        if (i > 0) {
            totalChange += (candle.close - recentCandles[i - 1].close);
        }
    }

    // Calculate momentum strength
    const priceChangePercent = Math.abs(totalChange / recentCandles[0].close) * 100;
    const confidence = Math.min(priceChangePercent * 10, 100);

    let signal: Signal = 'HOLD';

    // Strong momentum if 4+ out of 5 candles agree
    if (bullishCount >= 4 && totalChange > 0) {
        signal = 'BUY';
    } else if (bearishCount >= 4 && totalChange < 0) {
        signal = 'SELL';
    } else if (bullishCount >= 3 && totalChange > 0) {
        signal = 'BUY'; // Moderate bullish
    } else if (bearishCount >= 3 && totalChange < 0) {
        signal = 'SELL'; // Moderate bearish
    }

    return { strategy: 'Momentum', signal, confidence };
}

/**
 * Aggregate signals from all strategies using majority vote
 */
export function aggregateSignals(results: StrategyResult[]): Signal {
    const buyCount = results.filter(r => r.signal === 'BUY').length;
    const sellCount = results.filter(r => r.signal === 'SELL').length;

    // Majority vote: need 2 or more to agree
    if (buyCount >= 2) return 'BUY';
    if (sellCount >= 2) return 'SELL';

    return 'HOLD';
}
