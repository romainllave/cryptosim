import type { CandleData } from '../utils/chartData';
import type { Signal, StrategyResult } from './botTypes';

/**
 * Calcule une probabilité globale (0-100%) basée sur :
 * 1. Tendance (EMA & Slope)
 * 2. Momentum (RSI & ROC)
 * 3. Volatilité (Bollinger Bands)
 */
export function calculateGlobalProbability(candles: CandleData[]): StrategyResult {
    if (candles.length < 25) {
        return { strategy: 'Probabilité', signal: 'HOLD', confidence: 50 };
    }

    const prices = candles.map(c => c.close);
    const lastPrice = prices[prices.length - 1];

    // 1. ANALYSE DE TENDANCE (Poids: 40%)
    const emaShort = calculateEMA(prices, 9);
    const emaLong = calculateEMA(prices, 21);
    let trendScore = 50; // Neutre
    if (emaShort > emaLong) trendScore = 70; // Bullish
    if (emaShort < emaLong) trendScore = 30; // Bearish

    // 2. ANALYSE DE MOMENTUM (Poids: 30%)
    const rsi = calculateRSI(candles, 9);
    let momentumScore = 50;
    if (rsi < 40) momentumScore = 70; // Bullish divergence possible
    if (rsi > 60) momentumScore = 30; // Bearish divergence possible

    // 3. ANALYSE DE VOLATILITÉ (Poids: 30%)
    const { upper, lower } = calculateBollingerBands(prices, 20);
    let volatilityScore = 50;
    if (lastPrice <= lower) volatilityScore = 80; // Achat en bas de bande
    if (lastPrice >= upper) volatilityScore = 20; // Vente en haut de bande

    // CALCUL DU SCORE FINAL (0-100%)
    const finalScore = (trendScore * 0.4) + (momentumScore * 0.3) + (volatilityScore * 0.3);

    // DÉTERMINATION DU SIGNAL
    let signal: Signal = 'HOLD';
    if (finalScore >= 55) signal = 'BUY';
    if (finalScore <= 48) signal = 'SELL';

    return {
        strategy: 'Probabilité',
        signal,
        confidence: finalScore
    };
}

// --- HELPERS ---

function calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }
    return ema;
}

function calculateRSI(candles: CandleData[], period: number): number {
    if (candles.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateBollingerBands(prices: number[], period: number) {
    const slice = prices.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const dev = Math.sqrt(variance);
    return {
        upper: mean + (dev * 2),
        lower: mean - (dev * 2)
    };
}

export function aggregateSignals(results: StrategyResult[]): Signal {
    return results[0]?.signal || 'HOLD';
}
