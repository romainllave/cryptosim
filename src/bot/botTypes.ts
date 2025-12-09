export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED';
export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface StrategyResult {
    strategy: string;
    signal: Signal;
    confidence: number; // 0-100
}

export interface BotConfig {
    tradeAmount: number;
    symbol: string;
    enabled: boolean;
}

export interface BotState {
    status: BotStatus;
    lastAnalysis: StrategyResult[];
    lastSignal: Signal;
    tradesCount: number;
    profitLoss: number;
    lastTradeTime: Date | null;
}
