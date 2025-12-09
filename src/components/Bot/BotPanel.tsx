import React from 'react';
import { Bot, Play, Square, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BotState, BotConfig, StrategyResult, Signal } from '../../bot/botTypes';
import { clsx } from 'clsx';

interface BotPanelProps {
    botState: BotState;
    botConfig: BotConfig;
    onStart: () => void;
    onStop: () => void;
    onTradeAmountChange: (amount: number) => void;
}

const SignalIcon: React.FC<{ signal: Signal }> = ({ signal }) => {
    switch (signal) {
        case 'BUY':
            return <TrendingUp className="text-green-500" size={16} />;
        case 'SELL':
            return <TrendingDown className="text-red-500" size={16} />;
        default:
            return <Minus className="text-gray-400" size={16} />;
    }
};

const StrategyRow: React.FC<{ result: StrategyResult }> = ({ result }) => {
    return (
        <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded dark:bg-[#2a2e39]">
            <span className="text-xs font-medium truncate">{result.strategy}</span>
            <div className="flex items-center gap-2">
                <SignalIcon signal={result.signal} />
                <span className={clsx(
                    "text-xs font-bold",
                    result.signal === 'BUY' && "text-green-500",
                    result.signal === 'SELL' && "text-red-500",
                    result.signal === 'HOLD' && "text-gray-400"
                )}>
                    {result.signal}
                </span>
            </div>
        </div>
    );
};

export const BotPanel: React.FC<BotPanelProps> = ({
    botState,
    botConfig,
    onStart,
    onStop,
    onTradeAmountChange
}) => {
    const isRunning = botState.status === 'RUNNING';

    return (
        <div className="p-4 border-t border-border dark:border-[#2a2e39]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot className="text-blue-500" size={20} />
                    <h3 className="font-bold text-sm">Trading Bot</h3>
                </div>
                <div className={clsx(
                    "w-3 h-3 rounded-full",
                    isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
                )} />
            </div>

            {/* Control Button */}
            <button
                onClick={isRunning ? onStop : onStart}
                className={clsx(
                    "w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                    isRunning
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                )}
            >
                {isRunning ? (
                    <>
                        <Square size={16} />
                        Stop Bot
                    </>
                ) : (
                    <>
                        <Play size={16} />
                        Start Bot
                    </>
                )}
            </button>

            {/* Trade Amount */}
            <div className="mt-4">
                <label className="text-xs text-text-secondary dark:text-[#787b86]">Trade Amount</label>
                <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={botConfig.tradeAmount}
                    onChange={(e) => onTradeAmountChange(parseFloat(e.target.value) || 0.001)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white text-sm dark:bg-[#2a2e39] dark:border-[#363a45] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Strategy Signals */}
            <div className="mt-4">
                <h4 className="text-xs font-semibold text-text-secondary mb-2 dark:text-[#787b86]">
                    Strategy Signals
                </h4>
                <div className="space-y-1.5">
                    {botState.lastAnalysis.length > 0 ? (
                        botState.lastAnalysis.map((result, i) => (
                            <StrategyRow key={i} result={result} />
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 text-center py-2">
                            Start bot to see signals
                        </div>
                    )}
                </div>
            </div>

            {/* Aggregated Signal */}
            {botState.lastSignal !== 'HOLD' && (
                <div className={clsx(
                    "mt-3 py-2 px-3 rounded-lg text-center font-bold text-sm",
                    botState.lastSignal === 'BUY' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    botState.lastSignal === 'SELL' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                    Signal: {botState.lastSignal}
                </div>
            )}

            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-border dark:border-[#2a2e39]">
                <div className="flex justify-between text-xs">
                    <span className="text-text-secondary dark:text-[#787b86]">Trades</span>
                    <span className="font-bold">{botState.tradesCount}</span>
                </div>
                {botState.lastTradeTime && (
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-text-secondary dark:text-[#787b86]">Last Trade</span>
                        <span className="font-medium">
                            {botState.lastTradeTime.toLocaleTimeString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
