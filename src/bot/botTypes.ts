export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED';
export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface StrategyResult {
    strategy: string;
    signal: Signal;
    confidence: number; // 0-100
}

export interface Position {
    id: string;
    symbol: string;
    type: 'BUY'; // We only track long positions for now
    amount: number;
    entryPrice: number;
    entryTime: Date;
    stopLoss: number;
    takeProfit: number;
    status: 'OPEN' | 'CLOSED';
    exitPrice?: number;
    exitTime?: Date;
    profit?: number;
    profitPercent?: number;
}

export interface RiskConfig {
    stopLossPercent: number;
    takeProfitPercent: number;
    maxDrawdownPercent: number;
    maxTradeBalancePercent: number;
}

export interface BotConfig {
    tradeAmount: number;
    symbol: string;
    enabled: boolean;
    risk: RiskConfig;
    strategyName: string;
}

export interface BotState {
    status: BotStatus;
    lastAnalysis: StrategyResult[];
    lastSignal: Signal;
    tradesCount: number;
    profitLoss: number;
    lastTradeTime: Date | null;
    currentPosition: Position | null;
}
