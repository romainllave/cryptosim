import React, { useState } from 'react';
import type { Crypto } from '../../types';
import { clsx } from 'clsx';
import { Wallet, Activity } from 'lucide-react';

interface TradePanelProps {
    crypto: Crypto;
    balance: number;
    ownedAmount: number;
    onTrade: (type: 'BUY' | 'SELL', amount: number) => void;
}

export const TradePanel: React.FC<TradePanelProps> = ({ crypto, balance, ownedAmount, onTrade }) => {
    const [amount, setAmount] = useState<string>('0');
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');

    const amountVal = parseFloat(amount || '0');
    const total = amountVal * crypto.price;
    const isInsufficientFunds = type === 'BUY' ? total > balance : amountVal > ownedAmount;

    const handleTrade = () => {
        if (amountVal > 0 && !isInsufficientFunds) {
            onTrade(type, amountVal);
            setAmount('0');
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="p-4 border-b border-border dark:border-[#2a2e39]">
                <h2 className="text-lg font-bold text-text-primary dark:text-[#d1d4dc] flex items-center justify-between">
                    Trade {crypto.symbol}
                </h2>
                <div className="text-xs text-text-secondary dark:text-[#787b86] mt-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <Wallet size={12} /> Balance: {balance.toFixed(2)} USDT
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity size={12} /> Owned: {ownedAmount.toFixed(8)} {crypto.symbol}
                    </div>
                </div>
            </div>

            <div className="flex border-b border-border dark:border-[#2a2e39]">
                <button
                    onClick={() => setType('BUY')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-semibold transition-[background-color,border-color] duration-200 cubic-bezier(0.23, 1, 0.32, 1) border-b-2 gpu-accel",
                        type === 'BUY'
                            ? "text-up border-up bg-green-50 dark:bg-opacity-10 dark:bg-green-500"
                            : "text-text-secondary dark:text-[#787b86] border-transparent hover:bg-hover dark:hover:bg-[#2a2e39]"
                    )}
                >
                    Buy
                </button>
                <button
                    onClick={() => setType('SELL')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-semibold transition-[background-color,border-color] duration-200 cubic-bezier(0.23, 1, 0.32, 1) border-b-2 gpu-accel",
                        type === 'SELL'
                            ? "text-down border-down bg-red-50 dark:bg-opacity-10 dark:bg-red-500"
                            : "text-text-secondary dark:text-[#787b86] border-transparent hover:bg-hover dark:hover:bg-[#2a2e39]"
                    )}
                >
                    Sell
                </button>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="bg-gray-100 dark:bg-[#131722] p-3 rounded flex justify-between items-center">
                    <span className="text-sm text-text-secondary dark:text-[#787b86]">Price</span>
                    <span className="font-medium dark:text-[#d1d4dc]">{crypto.price.toFixed(crypto.price < 1 ? 4 : 2)}</span>
                </div>

                <div>
                    <label className="block text-xs font-medium text-text-secondary dark:text-[#787b86] mb-1">Amount ({crypto.symbol})</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={clsx(
                                "w-full p-2 border rounded focus:outline-none font-medium dark:bg-[#2a2e39] dark:text-[#d1d4dc]",
                                isInsufficientFunds
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-border focus:border-blue-500 dark:border-[#2a2e39]"
                            )}
                            min="0"
                            step="0.0001"
                        />
                        {isInsufficientFunds && (
                            <p className="text-[10px] text-red-500 mt-1">
                                {type === 'BUY' ? "Solde USDT insuffisant" : `Quantité de ${crypto.symbol} insuffisante`}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="flex justify-between text-xs text-text-secondary dark:text-[#787b86] mb-2">
                        <span>Total</span>
                        <span className={clsx(
                            "font-medium",
                            type === 'BUY' && isInsufficientFunds ? "text-red-500" : "dark:text-[#d1d4dc]"
                        )}>
                            {total.toFixed(2)} USDT
                        </span>
                    </div>
                    <button
                        onClick={handleTrade}
                        disabled={amountVal <= 0 || isInsufficientFunds}
                        className={clsx(
                            "w-full py-3 rounded font-bold text-white transition-[opacity,transform,background-color] duration-200 cubic-bezier(0.23, 1, 0.32, 1) active:scale-[0.98] gpu-accel",
                            (amountVal <= 0 || isInsufficientFunds) ? "opacity-30 cursor-not-allowed" : "hover:brightness-110",
                            type === 'BUY' ? "bg-up" : "bg-down"
                        )}
                    >
                        {isInsufficientFunds
                            ? (type === 'BUY' ? "Fonds Insuffisants" : "Quantité Insuffisante")
                            : `${type === 'BUY' ? 'Buy' : 'Sell'} ${crypto.symbol}`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};
