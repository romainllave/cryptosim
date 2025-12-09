import React from 'react';
import { Bot, Play, Square, TrendingUp, TrendingDown, Minus, Check } from 'lucide-react';
import type { BotState, BotConfig, StrategyResult, Signal } from '../../bot/botTypes';
import { clsx } from 'clsx';

export interface StrategySelection {
    sma: boolean;
    meanReversion: boolean;
    momentum: boolean;
}

interface BotPanelProps {
    botState: BotState;
    botConfig: BotConfig;
    strategies: StrategySelection;
    onStart: () => void;
    onStop: () => void;
    onTradeAmountChange: (amount: number) => void;
    onStrategyChange: (strategies: StrategySelection) => void;
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

interface StrategyToggleProps {
    name: string;
    emoji: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

const StrategyToggle: React.FC<StrategyToggleProps> = ({ name, emoji, enabled, onToggle, disabled }) => {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium",
                enabled
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500"
                    : "border-gray-200 bg-gray-50 text-gray-500 dark:bg-[#2a2e39] dark:border-[#363a45] dark:text-gray-400",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span>{emoji}</span>
            <span>{name}</span>
            {enabled && <Check size={14} className="text-blue-500" />}
        </button>
    );
};

export const BotPanel: React.FC<BotPanelProps> = ({
    botState,
    botConfig,
    strategies,
    onStart,
    onStop,
    onTradeAmountChange,
    onStrategyChange
}) => {
    const isRunning = botState.status === 'RUNNING';
    const enabledCount = Object.values(strategies).filter(Boolean).length;

    const toggleStrategy = (key: keyof StrategySelection) => {
        // Don't allow disabling if it's the last enabled strategy
        if (strategies[key] && enabledCount <= 1) return;

        onStrategyChange({
            ...strategies,
            [key]: !strategies[key]
        });
    };

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

            {/* Strategy Selection */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-secondary mb-2 dark:text-[#787b86]">
                    Stratégies actives ({enabledCount}/3)
                </h4>
                <div className="flex flex-wrap gap-2">
                    <StrategyToggle
                        name="SMA"
                        emoji="📈"
                        enabled={strategies.sma}
                        onToggle={() => toggleStrategy('sma')}
                        disabled={isRunning}
                    />
                    <StrategyToggle
                        name="Mean Rev"
                        emoji="📉"
                        enabled={strategies.meanReversion}
                        onToggle={() => toggleStrategy('meanReversion')}
                        disabled={isRunning}
                    />
                    <StrategyToggle
                        name="Momentum"
                        emoji="🚀"
                        enabled={strategies.momentum}
                        onToggle={() => toggleStrategy('momentum')}
                        disabled={isRunning}
                    />
                </div>
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

