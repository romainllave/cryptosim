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
        <div className="p-4 bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot className="text-blue-500" size={20} />
                    <h3 className="font-bold text-sm">Trading Bot 2.0</h3>
                </div>
                <div className={clsx(
                    "w-3 h-3 rounded-full gpu-accel",
                    isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
                )} />
            </div>

            {/* Status Info */}
            <div className="mb-4">
                <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50">
                    <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Mode</p>
                    <p className="text-xs font-semibold mt-1">Stratégie Personnalisée (55/45)</p>
                    {botConfig.randomAmountEnabled && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">🎲 Budget Aléatoire: 0-1000 USDT</p>
                    )}
                </div>
            </div>

            {/* Control Button */}
            <button
                onClick={isRunning ? onStop : onStart}
                className={clsx(
                    "w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-[background-color,transform,box-shadow] duration-200 cubic-bezier(0.23, 1, 0.32, 1) shadow-sm gpu-accel",
                    isRunning
                        ? "bg-red-500 hover:bg-red-600 active:scale-95 text-white"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white"
                )}
            >
                {isRunning ? (
                    <>
                        <Square size={16} />
                        Arrêter le Bot
                    </>
                ) : (
                    <>
                        <Play size={16} />
                        Démarrer le Bot
                    </>
                )}
            </button>

            {/* Trade Amount */}
            <div className="mt-4">
                <label className="text-[10px] uppercase font-bold text-text-secondary dark:text-[#787b86] tracking-wider">Quantité par Trade</label>
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
                <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-2 dark:text-[#787b86] tracking-wider">
                    Analyse en cours
                </h4>
                <div className="space-y-1.5">
                    {botState.lastAnalysis.length > 0 ? (
                        botState.lastAnalysis.map((result, i) => (
                            <StrategyRow key={i} result={result} />
                        ))
                    ) : (
                        <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 dark:bg-[#2a2e39] dark:border-[#363a45]">
                            En attente de démarrage...
                        </div>
                    )}
                </div>
            </div>

            {/* Probability Score */}
            {isRunning && (
                <div className={clsx(
                    "mt-4 p-3 rounded-lg text-center shadow-inner",
                    botState.lastSignal === 'BUY' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    botState.lastSignal === 'SELL' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    botState.lastSignal === 'HOLD' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Confiance</p>
                    <p className="text-xl font-black">
                        {botState.lastAnalysis.find(r => r.strategy === 'Probabilité')?.confidence.toFixed(1) || '0.0'}%
                    </p>
                    <p className="text-[10px] font-bold mt-1">Signal: {botState.lastSignal}</p>
                </div>
            )}

            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-border dark:border-[#2a2e39]">
                <div className="flex justify-between text-xs">
                    <span className="text-text-secondary dark:text-[#787b86]">Total Trades</span>
                    <span className="font-bold">{botState.tradesCount}</span>
                </div>
                {botState.lastTradeTime && (
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-text-secondary dark:text-[#787b86]">Dernier Trade</span>
                        <span className="font-medium">
                            {botState.lastTradeTime.toLocaleTimeString()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

