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
 * Linear Regression Prediction Strategy
 * Predicts the next price based on the trend of the last N candles.
 * BUY if predicted price > current price (Uptrend)
 * SELL if predicted price < current price (Downtrend)
 */
export function linearRegressionPrediction(candles: CandleData[], period: number = 400): StrategyResult {
    if (candles.length < period) {
        return { strategy: 'Prediction (LinReg)', signal: 'HOLD', confidence: 0 };
    }

    const recentCandles = candles.slice(-period);
    const n = recentCandles.length;

    // Simple Linear Regression: y = mx + c
    // x = time index (0 to n-1), y = close price
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        const y = recentCandles[i].close;
        sumX += i;
        sumY += y;
        sumXY += (i * y);
        sumX2 += (i * i);
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const c = (sumY - m * sumX) / n;

    // Predict next price (at index n)
    const predictedPrice = m * n + c;
    const currentPrice = recentCandles[n - 1].close;

    // Calculate confidence based on slope strength (percent change predicted)
    // If slope is steep, higher confidence
    const percentChange = ((predictedPrice - currentPrice) / currentPrice) * 100;
    const confidence = Math.min(Math.abs(percentChange) * 500, 100); // Scale factor

    let signal: Signal = 'HOLD';

    // Simple threshold for prediction
    if (predictedPrice > currentPrice * 1.0005) { // Expecting at least 0.05% rise
        signal = 'BUY';
    } else if (predictedPrice < currentPrice * 0.9995) { // Expecting at least 0.05% fall
        signal = 'SELL';
    }

    return { strategy: 'Prediction (LinReg)', signal, confidence };
}

/**
 * EMA (Exponential Moving Average) Strategy
 * Trend Following:
 * BUY if Price > EMA
 * SELL if Price < EMA
 */
export function emaStrategy(candles: CandleData[], period: number = 20): StrategyResult {
    if (candles.length < period) {
        return { strategy: 'EMA Trend', signal: 'HOLD', confidence: 0 };
    }

    // Calculate EMA
    // Multiplier: k = 2 / (N + 1)
    // EMA_today = (Price_today * k) + (EMA_yesterday * (1-k))
    // Initialize with SMA
    const k = 2 / (period + 1);

    // Start with SMA for the first 'period' candles to get initial EMA value
    // But efficiently, we can just calculate EMA for the last N*2 candles to let it stabilize
    let ema = candles[0].close;
    const lookback = Math.min(candles.length, period * 5); // Lookback enough for EMA stability
    const startIdx = candles.length - lookback;

    // Fast forward to start index (approximate prior EMA as SMA or just price)
    // Better: Calculate SMA of first chunk if possible, or just iterate.
    // We will just iterate from startIdx assuming initial EMA ~ Price[startIdx]
    ema = candles[startIdx].close;

    for (let i = startIdx + 1; i < candles.length; i++) {
        ema = (candles[i].close * k) + (ema * (1 - k));
    }

    const currentPrice = candles[candles.length - 1].close;

    // Distance from EMA
    const distance = Math.abs((currentPrice - ema) / ema) * 100;
    const confidence = Math.min(distance * 20, 100);

    let signal: Signal = 'HOLD';

    // Trend following
    if (currentPrice > ema) {
        signal = 'BUY';
    } else if (currentPrice < ema) {
        signal = 'SELL';
    }

    return { strategy: 'EMA Trend', signal, confidence };
}

/**
 * Aggregate signals from all strategies using majority vote
 */
export function aggregateSignals(results: StrategyResult[]): Signal {

    const buyCount = results.filter(r => r.signal === 'BUY').length;
    const sellCount = results.filter(r => r.signal === 'SELL').length;

    // If only 1 strategy is active/provided, follow it
    if (results.length === 1) {
        return results[0].signal;
    }

    // If multiple strategies, require at least 2 for confirmation (or majority if we had more strategies)
    if (buyCount >= 2) return 'BUY';
    if (sellCount >= 2) return 'SELL';

    return 'HOLD';
}
