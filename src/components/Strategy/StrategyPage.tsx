import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Check, Info, Shield, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface StrategyPageProps {
    onBack: () => void;
    currentMode: 'LONG' | 'SHORT';
    onSave: (mode: 'LONG' | 'SHORT') => void;
}

export const StrategyPage: React.FC<StrategyPageProps> = ({ onBack, currentMode, onSave }) => {
    const [selectedMode, setSelectedMode] = useState<'LONG' | 'SHORT'>(currentMode);

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
                        <h1 className="text-2xl font-bold text-text-primary dark:text-[#d1d4dc]">Configuration Stratégie</h1>
                        <p className="text-sm text-text-secondary dark:text-[#787b86]">Définissez la direction privilégiée de votre bot</p>
                    </div>
                </div>
                <button
                    onClick={() => onSave(selectedMode)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                >
                    Enregistrer les modifications
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Long Mode Card */}
                        <div
                            onClick={() => setSelectedMode('LONG')}
                            className={clsx(
                                "relative p-8 rounded-3xl border-2 transition-all cursor-pointer group hover:shadow-xl",
                                selectedMode === 'LONG'
                                    ? "border-up bg-up/5 dark:bg-up/10"
                                    : "border-border dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] hover:border-up/50"
                            )}
                        >
                            <div className={clsx(
                                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                                selectedMode === 'LONG' ? "bg-up text-white" : "bg-gray-100 dark:bg-[#2a2e39] text-up"
                            )}>
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-text-primary dark:text-[#d1d4dc]">Position Long</h3>
                            <p className="text-text-secondary dark:text-[#787b86] leading-relaxed">
                                Le bot se concentrera exclusivement sur les signaux d'achat (Bullish). Idéal quand le marché est en tendance haussière claire.
                            </p>

                            {selectedMode === 'LONG' && (
                                <div className="absolute top-6 right-6 w-8 h-8 bg-up rounded-full flex items-center justify-center text-white">
                                    <Check size={20} className="font-bold" />
                                </div>
                            )}

                            <div className="mt-8 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-up">
                                    <Zap size={16} /> Priorité aux cassures de résistance
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-up">
                                    <Shield size={16} /> Protection sur les supports
                                </div>
                            </div>
                        </div>

                        {/* Short Mode Card */}
                        <div
                            onClick={() => setSelectedMode('SHORT')}
                            className={clsx(
                                "relative p-8 rounded-3xl border-2 transition-all cursor-pointer group hover:shadow-xl",
                                selectedMode === 'SHORT'
                                    ? "border-down bg-down/5 dark:bg-down/10"
                                    : "border-border dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] hover:border-down/50"
                            )}
                        >
                            <div className={clsx(
                                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                                selectedMode === 'SHORT' ? "bg-down text-white" : "bg-gray-100 dark:bg-[#2a2e39] text-down"
                            )}>
                                <TrendingDown size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-text-primary dark:text-[#d1d4dc]">Position Short</h3>
                            <p className="text-text-secondary dark:text-[#787b86] leading-relaxed">
                                Le bot privilégiera les signaux de vente (Bearish). Recommandé lors des phases de correction ou de marché baissier.
                            </p>

                            {selectedMode === 'SHORT' && (
                                <div className="absolute top-6 right-6 w-8 h-8 bg-down rounded-full flex items-center justify-center text-white">
                                    <Check size={20} className="font-bold" />
                                </div>
                            )}

                            <div className="mt-8 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-down">
                                    <Zap size={16} /> Profit sur la capitulation
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-down">
                                    <Shield size={16} /> Stratégie anti-FOMO
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Information Alert */}
                    <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex gap-4">
                        <div className="text-blue-600 dark:text-blue-400 shrink-0">
                            <Info size={24} />
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            <span className="font-bold">Note importante :</span> Changer le mode de position n'affecte pas vos positions manuelles déjà ouvertes. Le bot appliquera cette nouvelle préférence dès le prochain cycle d'analyse (environ 1 minute). Assurez-vous d'avoir assez de marge pour les opérations de Short.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
