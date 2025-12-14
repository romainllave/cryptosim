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
 * ============================================
 * HELPER FUNCTIONS FOR ADVANCED PREDICTION
 * ============================================
 */

/**
 * Calculate RSI (Relative Strength Index)
 * Returns value between 0-100
 */
function calculateRSI(candles: CandleData[], period: number = 14): number {
    if (candles.length < period + 1) return 50; // Neutral if not enough data

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = candles.length - period; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100; // All gains

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }

    return ema;
}

/**
 * Calculate MACD
 * Returns: { macd, signal, histogram }
 */
function calculateMACD(candles: CandleData[]): { macd: number; signal: number; histogram: number } {
    const prices = candles.map(c => c.close);

    if (prices.length < 26) {
        return { macd: 0, signal: 0, histogram: 0 };
    }

    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    // For simplicity, we'll calculate MACD for last 9 periods and get EMA
    const macdValues: number[] = [];
    for (let i = Math.max(0, prices.length - 9); i < prices.length; i++) {
        const slice = prices.slice(0, i + 1);
        const e12 = calculateEMA(slice, 12);
        const e26 = calculateEMA(slice, 26);
        macdValues.push(e12 - e26);
    }

    const signal = calculateEMA(macdValues, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
}

/**
 * Analyze trend over a period
 * Returns score 0-100 (0 = very bearish, 100 = very bullish)
 */
function analyzeTrend(candles: CandleData[]): number {
    if (candles.length < 10) return 50;

    // 1. Count green vs red candles
    let greenCandles = 0;
    for (const candle of candles) {
        if (candle.close > candle.open) greenCandles++;
    }
    const greenRatio = greenCandles / candles.length;

    // 2. Calculate price change over period
    const startPrice = candles[0].close;
    const endPrice = candles[candles.length - 1].close;
    const priceChange = ((endPrice - startPrice) / startPrice) * 100;

    // 3. Calculate EMA slope (is EMA going up or down?)
    const prices = candles.map(c => c.close);
    const emaShort = calculateEMA(prices.slice(-20), 10);
    const emaMid = calculateEMA(prices.slice(-50), 20);

    let emaScore = 50;
    if (emaShort > emaMid) {
        emaScore = 50 + Math.min((emaShort / emaMid - 1) * 1000, 30); // Up to +30
    } else {
        emaScore = 50 - Math.min((1 - emaShort / emaMid) * 1000, 30); // Down to -30
    }

    // Combine scores
    const greenScore = greenRatio * 100; // 0-100 based on green candle ratio
    const priceScore = 50 + Math.max(-25, Math.min(25, priceChange * 5)); // -25 to +25 added to 50

    // Weighted average
    const trendScore = (greenScore * 0.3) + (priceScore * 0.3) + (emaScore * 0.4);

    return Math.max(0, Math.min(100, trendScore));
}

/**
 * ============================================
 * MAIN PREDICTION STRATEGY
 * ============================================
 * 
 * Analyzes up to 2 weeks of data and makes a prediction.
 * 
 * - Pronostic >= 55%: Signal BUY (open position with 0-10% of portfolio)
 * - Pronostic <= 45%: Signal SELL (close positions from this strategy)
 * - 45% < Pronostic < 55%: HOLD (do nothing)
 * 
 * Sizing is based on prediction strength:
 * - 55-60% → ~2% of portfolio
 * - 60-70% → ~5% of portfolio  
 * - 70-80% → ~7% of portfolio
 * - 80%+ → ~10% of portfolio
 */
export function advancedPrediction(candles: CandleData[], period: number = 500): StrategyResult {
    // Need at least some data to make a prediction
    // 500 candles at 1min = ~8 hours. For 2 weeks we'd need 4h candles or aggregate
    if (candles.length < 50) {
        return { strategy: 'Prediction', signal: 'HOLD', confidence: 50 };
    }

    // Use available candles (up to 'period' most recent)
    const analysisCandles = candles.slice(-Math.min(period, candles.length));

    // ========== 1. TREND ANALYSIS (40% weight) ==========
    const trendScore = analyzeTrend(analysisCandles);

    // ========== 2. RSI ANALYSIS (30% weight) ==========
    const rsi = calculateRSI(analysisCandles, 14);
    let rsiScore = 50;

    if (rsi < 30) {
        // Oversold = bullish signal
        rsiScore = 70 + ((30 - rsi) / 30) * 30; // 70-100
    } else if (rsi < 45) {
        // Slightly oversold
        rsiScore = 55 + ((45 - rsi) / 15) * 15; // 55-70
    } else if (rsi > 70) {
        // Overbought = bearish signal
        rsiScore = 30 - ((rsi - 70) / 30) * 30; // 0-30
    } else if (rsi > 55) {
        // Slightly overbought
        rsiScore = 45 - ((rsi - 55) / 15) * 15; // 30-45
    } else {
        // Neutral zone (45-55)
        rsiScore = 50;
    }

    // ========== 3. MACD ANALYSIS (30% weight) ==========
    const { histogram } = calculateMACD(analysisCandles);
    let macdScore = 50;

    // Normalize histogram to a score
    const avgPrice = analysisCandles[analysisCandles.length - 1].close;
    const normalizedHistogram = (histogram / avgPrice) * 10000; // Normalize relative to price

    if (normalizedHistogram > 0) {
        // Bullish momentum
        macdScore = 50 + Math.min(normalizedHistogram * 10, 50); // 50-100
    } else {
        // Bearish momentum
        macdScore = 50 + Math.max(normalizedHistogram * 10, -50); // 0-50
    }

    // ========== COMBINE ALL SCORES ==========
    const pronostic = (trendScore * 0.40) + (rsiScore * 0.30) + (macdScore * 0.30);

    // ========== GENERATE SIGNAL ==========
    let signal: Signal = 'HOLD';

    if (pronostic >= 55) {
        signal = 'BUY';
    } else if (pronostic <= 45) {
        signal = 'SELL';
    }

    console.log(`📊 Prediction Analysis: Trend=${trendScore.toFixed(1)} RSI=${rsiScore.toFixed(1)} MACD=${macdScore.toFixed(1)} → Pronostic=${pronostic.toFixed(1)}%`);

    return {
        strategy: 'Prediction',
        signal,
        confidence: Math.min(100, Math.max(0, pronostic)) // Return pronostic as confidence for sizing
    };
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
