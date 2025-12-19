import type { CandleData } from '../utils/chartData';
import type { BotState, BotConfig, Signal, StrategyResult, Position } from './botTypes';
import { calculateGlobalProbability } from './strategies';

export type TradeCallback = (type: 'BUY' | 'SELL', amount: number, reason: string, position?: Position) => void;

export class TradingBot {
    private state: BotState;
    private config: BotConfig;
    private onTrade: TradeCallback | null = null;
    private cooldownMs: number = 60000; // 1 minute cooldown between trades

    constructor(config: Partial<BotConfig> = {}) {
        this.config = {
            tradeAmount: 0.001,
            symbol: 'BTC',
            enabled: false,
            risk: {
                stopLossPercent: 1.5,
                takeProfitPercent: 2.5,
                maxDrawdownPercent: 10,
                maxTradeBalancePercent: 20,
                ...config.risk
            },
            strategyName: 'Custom Probability',
            randomAmountEnabled: true, // Enabled by default as per request
            maxRandomAmount: 1500,
            ...config
        };

        this.state = {
            status: 'IDLE',
            lastAnalysis: [],
            lastSignal: 'HOLD',
            tradesCount: 0,
            profitLoss: 0,
            lastTradeTime: null,
            currentPosition: null
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

    rehydratePosition(position: Position | null): void {
        this.state.currentPosition = position;
        if (position) {
            this.state.status = 'RUNNING';
            this.config.enabled = true;
        }
    }

    getConfig(): BotConfig {
        return { ...this.config };
    }

    updateConfig(config: Partial<BotConfig>): void {
        this.config = { ...this.config, ...config };
    }

    setTradeAmount(amount: number): void {
        this.config.tradeAmount = amount;
    }

    setSymbol(symbol: string): void {
        this.config.symbol = symbol;
    }


    /**
     * Analyze market data and potentially execute a trade
     */
    analyze(candles: CandleData[]): StrategyResult[] {
        if (!this.config.enabled || candles.length < 25) {
            return this.state.lastAnalysis;
        }

        const currentPrice = candles[candles.length - 1].close;

        // 1. Check existing position for SL/TP
        if (this.state.currentPosition) {
            this.checkRiskManagement(currentPrice);
        }

        // 2. Run the unified probability strategy
        const result = calculateGlobalProbability(candles);
        const results = [result];

        this.state.lastAnalysis = results;

        // 3. Logic based on probability thresholds (55% / 45%)
        const probability = result.confidence;
        let signal: Signal = 'HOLD';

        if (probability >= 55) {
            signal = 'BUY';
        } else if (probability <= 48) {
            signal = 'SELL';
        }

        this.state.lastSignal = signal;

        // 4. Execution logic based on probability thresholds (55% / 45%)
        if (signal === 'BUY' && this.canTrade('BUY')) {
            // Open position if allowed
            this.executeTrade('BUY', results, currentPrice);
        } else if (signal === 'SELL' && this.state.currentPosition) {
            // Close position if it exists (probability <= 48%)
            this.closePosition('SELL', `Probability dropped to ${probability.toFixed(1)}%`, currentPrice);
        }

        return results;
    }

    private checkRiskManagement(currentPrice: number): void {
        const pos = this.state.currentPosition;
        if (!pos) return;

        // Update highest price for trailing stop
        if (!pos.highestPrice || currentPrice > pos.highestPrice) {
            pos.highestPrice = currentPrice;
        }

        const pnl = (currentPrice - pos.entryPrice) / pos.entryPrice * 100;
        const dropFromPeak = ((pos.highestPrice - currentPrice) / pos.highestPrice) * 100;

        // 1. Take Profit
        if (pos.takeProfit !== undefined && pnl >= pos.takeProfit) {
            this.closePosition('SELL', `Take Profit hit: +${pnl.toFixed(2)}%`, currentPrice);
        }
        // 2. Trailing Stop Loss (Protect profits)
        // If we were at least 0.5% in profit and price dropped 0.5% from peak
        else if (pnl >= 0.5 && dropFromPeak >= 0.5) {
            this.closePosition('SELL', `Trailing Stop hit: Gain ${pnl.toFixed(2)}% (Dropped ${dropFromPeak.toFixed(2)}% from peak)`, currentPrice);
        }
        // 3. Hard Stop Loss
        else if (pos.stopLoss !== undefined && pnl <= -pos.stopLoss) {
            this.closePosition('SELL', `Stop Loss hit: ${pnl.toFixed(2)}%`, currentPrice);
        }
    }

    private canTrade(signal: Signal): boolean {
        // If we have an open position, don't open another one (for now 1-pos limit)
        if (this.state.currentPosition && signal === 'BUY') {
            return false;
        }

        // If we want to SELL but have no position, ignore (unless we want to support shorting later)
        if (!this.state.currentPosition && signal === 'SELL') {
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

    private executeTrade(signal: Signal, results: StrategyResult[], currentPrice: number): void {
        if (!this.onTrade) return;

        if (signal === 'BUY') {
            const stopLoss = this.config.risk.stopLossPercent;
            const takeProfit = this.config.risk.takeProfitPercent;

            const position: Position = {
                id: Math.random().toString(36).substring(7),
                symbol: this.config.symbol,
                type: 'BUY',
                amount: this.config.tradeAmount,
                entryPrice: currentPrice,
                entryTime: new Date(),
                stopLoss,
                takeProfit,
                highestPrice: currentPrice, // Initialize with entry price
                status: 'OPEN'
            };

            this.state.currentPosition = position;
            const agreeing = results.filter(r => r.signal === signal).map(r => r.strategy);
            const reason = `Strategy entry: ${agreeing.join(' + ')}`;

            // Calculate actual crypto amount if random budget is enabled
            let finalTradeAmount = this.config.tradeAmount;
            if (this.config.randomAmountEnabled) {
                const randomBudget = Math.random() * (this.config.maxRandomAmount || 1000);
                finalTradeAmount = randomBudget / currentPrice;
            }

            this.onTrade('BUY', finalTradeAmount, reason, position);
        } else if (signal === 'SELL') {
            this.closePosition('SELL', 'Strategy Exit Signal', currentPrice);
        }

        this.state.lastTradeTime = new Date();
        this.state.tradesCount++;
    }

    private closePosition(_type: 'SELL', reason: string, currentPrice: number): void {
        if (!this.state.currentPosition || !this.onTrade) return;

        const pos = this.state.currentPosition;
        pos.status = 'CLOSED';
        pos.exitPrice = currentPrice;
        pos.exitTime = new Date();
        pos.profit = (currentPrice - pos.entryPrice) * pos.amount;
        pos.profitPercent = (currentPrice - pos.entryPrice) / pos.entryPrice * 100;

        this.state.profitLoss += pos.profit;
        this.state.currentPosition = null;

        this.onTrade('SELL', pos.amount, reason, pos);
    }
}
