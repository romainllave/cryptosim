import React from 'react';
import type { Crypto } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface CryptoListProps {
    cryptos: Crypto[];
    selectedSymbol: string;
    onSelect: (symbol: string) => void;
}

export const CryptoList: React.FC<CryptoListProps> = ({ cryptos, selectedSymbol, onSelect }) => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1e222d]">
            <div className="p-3 border-b border-border dark:border-[#2a2e39]">
                <h2 className="text-sm font-semibold text-text-secondary dark:text-[#787b86] uppercase tracking-wider">Watchlist</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {cryptos.map((crypto) => (
                    <div
                        key={crypto.symbol}
                        onClick={() => onSelect(crypto.symbol)}
                        className={clsx(
                            "flex items-center justify-between p-3 cursor-pointer transition-[background-color,transform] duration-200 cubic-bezier(0.23, 1, 0.32, 1) border-b border-gray-100 last:border-0 dark:border-[#2a2e39] gpu-accel active:scale-[0.99]",
                            selectedSymbol === crypto.symbol ? "bg-blue-50 dark:bg-[#2a2e39]" : "hover:bg-gray-50 dark:hover:bg-[#2a2e39]"
                        )}
                    >
                        <div>
                            <div className="font-bold text-sm text-text-primary dark:text-[#d1d4dc] flex items-center gap-2">
                                {crypto.symbol}
                                <span className="text-xs font-normal text-text-secondary dark:text-[#787b86] bg-gray-100 dark:bg-[#2a2e39] px-1 rounded">USDT</span>
                            </div>
                            <div className="text-xs text-text-secondary dark:text-[#787b86]">{crypto.name}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-medium text-sm text-text-primary dark:text-[#d1d4dc]">{crypto.price.toFixed(crypto.price < 1 ? 4 : 2)}</div>
                            <div className={clsx(
                                "text-xs flex items-center justify-end gap-1",
                                crypto.change24h >= 0 ? "text-up" : "text-down"
                            )}>
                                {crypto.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(crypto.change24h)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
