import React from 'react';
import type { Crypto } from '../../types';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface HoldingsPageProps {
    holdings: Record<string, number>;
    cryptos: Crypto[];
    onBack: () => void;
}

export const HoldingsPage: React.FC<HoldingsPageProps> = ({ holdings, cryptos, onBack }) => {
    const ownedAssets = Object.entries(holdings)
        .filter(([_, amount]) => amount > 0.00000001) // Filter out dust
        .map(([symbol, amount]) => {
            const crypto = cryptos.find(c => c.symbol === symbol);
            return {
                symbol,
                name: crypto?.name || symbol,
                amount,
                price: crypto?.price || 0,
                change24h: crypto?.change24h || 0,
                totalValue: amount * (crypto?.price || 0)
            };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

    const portfolioValue = ownedAssets.reduce((sum, asset) => sum + asset.totalValue, 0);

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#131722] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2e39] rounded-full transition-colors"
                    >
                        <ArrowLeft className="text-text-primary dark:text-[#d1d4dc]" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary dark:text-[#d1d4dc]">Saison Portefeuille</h1>
                        <p className="text-sm text-text-secondary dark:text-[#787b86]">Gérez et suivez vos actifs en temps réel</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-text-secondary dark:text-[#787b86] uppercase tracking-wider font-semibold">Valeur Totale Estimmée</div>
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {portfolioValue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-2xl border border-border dark:border-[#2a2e39] shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-sm font-medium text-text-secondary dark:text-[#787b86]">Actifs Détenus</span>
                            </div>
                            <div className="text-2xl font-bold dark:text-[#d1d4dc]">{ownedAssets.length} Cryptos</div>
                        </div>
                        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-2xl border border-border dark:border-[#2a2e39] shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                                    <TrendingUp size={24} />
                                </div>
                                <span className="text-sm font-medium text-text-secondary dark:text-[#787b86]">Top Performance</span>
                            </div>
                            <div className="text-2xl font-bold text-up">
                                {ownedAssets.length > 0 ? ownedAssets[0].symbol : '-'}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-2xl border border-border dark:border-[#2a2e39] shadow-sm">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                                    <Activity size={24} />
                                </div>
                                <span className="text-sm font-medium text-text-secondary dark:text-[#787b86]">Activité</span>
                            </div>
                            <div className="text-2xl font-bold dark:text-[#d1d4dc]">Temps Réel</div>
                        </div>
                    </div>

                    {/* Assets Table */}
                    <div className="bg-white dark:bg-[#1e222d] rounded-2xl border border-border dark:border-[#2a2e39] shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border dark:border-[#2a2e39] bg-gray-50/50 dark:bg-[#1e222d] text-xs font-semibold text-text-secondary dark:text-[#787b86] uppercase tracking-wider">
                                    <th className="px-6 py-4">Nom</th>
                                    <th className="px-6 py-4">Quantité</th>
                                    <th className="px-6 py-4 text-right">Prix</th>
                                    <th className="px-6 py-4 text-right">Variation 24h</th>
                                    <th className="px-6 py-4 text-right">Valeur Totale</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-[#2a2e39]">
                                {ownedAssets.map((asset) => (
                                    <tr key={asset.symbol} className="hover:bg-gray-50 dark:hover:bg-[#2a2e39] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold leading-none">
                                                    {asset.symbol[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-text-primary dark:text-[#d1d4dc]">{asset.symbol}</div>
                                                    <div className="text-xs text-text-secondary dark:text-[#787b86]">{asset.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium dark:text-[#d1d4dc]">
                                            {asset.amount.toFixed(8)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium dark:text-[#d1d4dc]">
                                            {asset.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1 font-semibold",
                                                asset.change24h >= 0 ? "text-up" : "text-down"
                                            )}>
                                                {asset.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                {Math.abs(asset.change24h).toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-text-primary dark:text-[#d1d4dc]">
                                            {asset.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                                        </td>
                                    </tr>
                                ))}
                                {ownedAssets.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-text-secondary dark:text-[#787b86]">
                                            <div className="flex flex-col items-center gap-2">
                                                <Wallet size={48} className="opacity-20 mb-2" />
                                                <p>Vous ne possédez pas encore d'actifs.</p>
                                                <button
                                                    onClick={onBack}
                                                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                                >
                                                    Commencer à trader
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
