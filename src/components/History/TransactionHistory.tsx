import React from 'react';
import type { Transaction } from '../../types';
import { clsx } from 'clsx';

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="p-3 border-b border-white/10 bg-transparent">
                <h2 className="text-sm font-semibold text-text-secondary dark:text-[#787b86] uppercase tracking-wider">Recent Transactions</h2>
            </div>
            <div className="flex-1 overflow-y-auto w-full">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-transparent backdrop-blur-md border-b border-white/10">
                        <tr>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86]">Time</th>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86]">Type</th>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86]">Symbol</th>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86]">Price</th>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86]">Amount</th>
                            <th className="p-2 text-xs font-medium text-text-secondary dark:text-[#787b86] text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center p-4 text-sm text-text-secondary dark:text-[#787b86]">No transactions yet</td>
                            </tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-gray-50 hover:bg-hover dark:border-[#2a2e39] dark:hover:bg-[#2a2e39]">
                                    <td className="p-2 text-xs text-text-primary dark:text-[#d1d4dc]">
                                        {tx.timestamp.toLocaleTimeString()}
                                    </td>
                                    <td className={clsx(
                                        "p-2 text-xs font-medium",
                                        tx.type === 'BUY' ? 'text-up' : 'text-down'
                                    )}>
                                        {tx.type}
                                    </td>
                                    <td className="p-2 text-xs text-text-primary dark:text-[#d1d4dc]">{tx.symbol}</td>
                                    <td className="p-2 text-xs text-text-primary dark:text-[#d1d4dc]">{tx.price.toFixed(2)}</td>
                                    <td className="p-2 text-xs text-text-primary dark:text-[#d1d4dc]">{tx.amount.toFixed(4)}</td>
                                    <td className="p-2 text-xs text-text-primary dark:text-[#d1d4dc] text-right">{tx.total.toFixed(2)} USDT</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
