import type { CandleData } from '../utils/chartData';
import type { BotState, BotConfig, Signal, StrategyResult } from './botTypes';
import { smaCrossover, meanReversion, momentum, linearRegressionPrediction, emaStrategy, aggregateSignals } from './strategies';

export type TradeCallback = (type: 'BUY' | 'SELL', amount: number, reason: string) => void;

export class TradingBot {
    private state: BotState;
    private config: BotConfig;
    private onTrade: TradeCallback | null = null;
    private lastTradeSignal: Signal = 'HOLD';
    private cooldownMs: number = 60000; // 1 minute cooldown between trades

    constructor(config: Partial<BotConfig> = {}) {
        this.config = {
            tradeAmount: 0.001,
            symbol: 'BTC',
            enabled: false,
            strategies: {
                sma: true,
                meanReversion: true,
                momentum: true,
                prediction: true,
                ema: true
            },
            ...config
        };

        this.state = {
            status: 'IDLE',
            lastAnalysis: [],
            lastSignal: 'HOLD',
            tradesCount: 0,
            profitLoss: 0,
            lastTradeTime: null
        };
    }

    setTradeCallback(callback: TradeCallback): void {
        this.onTrade = callback;
    }

    start(): void {
        this.state.status = 'RUNNING';
        this.config.enabled = true;
        console.log('🤖 Bot started');
    }

    stop(): void {
        this.state.status = 'IDLE';
        this.config.enabled = false;
        console.log('🤖 Bot stopped');
    }

    isRunning(): boolean {
        return this.state.status === 'RUNNING';
    }

    getState(): BotState {
        return { ...this.state };
    }

    getConfig(): BotConfig {
        return { ...this.config };
    }

    setTradeAmount(amount: number): void {
        this.config.tradeAmount = amount;
    }

    setSymbol(symbol: string): void {
        this.config.symbol = symbol;
    }

    setStrategies(strategies: BotConfig['strategies']): void {
        this.config.strategies = strategies;
    }

    /**
     * Analyze market data and potentially execute a trade
     */
    analyze(candles: CandleData[]): StrategyResult[] {
        if (!this.config.enabled || candles.length < 25) {
            return this.state.lastAnalysis;
        }

        // Run enabled strategies
        const results: StrategyResult[] = [];

        if (this.config.strategies.sma) {
            results.push(smaCrossover(candles));
        }
        if (this.config.strategies.meanReversion) {
            results.push(meanReversion(candles));
        }
        if (this.config.strategies.momentum) {
            results.push(momentum(candles));
        }
        if (this.config.strategies.prediction) {
            results.push(linearRegressionPrediction(candles));
        }
        if (this.config.strategies.ema) {
            results.push(emaStrategy(candles));
        }

        this.state.lastAnalysis = results;

        // Get aggregated signal
        const signal = aggregateSignals(results);
        this.state.lastSignal = signal;

        // Check if we should trade
        if (signal !== 'HOLD' && this.canTrade(signal)) {
            this.executeTrade(signal, results);
        }

        return results;
    }

    private canTrade(signal: Signal): boolean {
        // Don't trade the same signal twice in a row
        if (signal === this.lastTradeSignal) {
            return false;
        }

        // Cooldown check
        if (this.state.lastTradeTime) {
            const elapsed = Date.now() - this.state.lastTradeTime.getTime();
            if (elapsed < this.cooldownMs) {
                return false;
            }
        }

        return true;
    }

    private executeTrade(signal: Signal, results: StrategyResult[]): void {
        if (!this.onTrade) return;

        const agreeing = results.filter(r => r.signal === signal).map(r => r.strategy);
        const reason = `Bot: ${agreeing.join(' + ')}`;

        this.onTrade(signal as 'BUY' | 'SELL', this.config.tradeAmount, reason);

        this.lastTradeSignal = signal;
        this.state.lastTradeTime = new Date();
        this.state.tradesCount++;

        console.log(`🤖 Trade executed: ${signal} (${reason})`);
    }
}
