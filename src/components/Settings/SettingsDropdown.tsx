import React from 'react';
import {
    User,
    Settings,
    Download,
    Moon,
    Sun,
    Shield,
    Zap,
    FileText,
    LogOut,
    ChevronRight,
    Wallet,
    RefreshCw
} from 'lucide-react';


interface SettingsDropdownProps {
    isOpen: boolean;
    isDarkMode: boolean;
    setIsDarkMode: (val: boolean) => void;
    balance: number;
    onNavigate: (view: 'trading' | 'holdings' | 'strategy') => void;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
    isOpen,
    isDarkMode,
    setIsDarkMode,
    balance,
    onNavigate
}) => {
    const [version, setVersion] = React.useState<string>('0.0.1');

    React.useEffect(() => {
        if (window.electron && window.electron.getVersion) {
            window.electron.getVersion().then(setVersion);
        }
    }, [isOpen]);

    const handleCheckUpdates = () => {
        if (window.electron && window.electron.checkUpdates) {
            window.electron.checkUpdates();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-12 right-0 w-72 bg-white dark:bg-[#1e222d] border border-border dark:border-[#2a2e39] rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* User Header */}
            <div className="p-4 border-b border-border dark:border-[#2a2e39] bg-gray-50/50 dark:bg-[#1e222d]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        RL
                    </div>
                    <div>
                        <div className="font-bold text-text-primary dark:text-[#d1d4dc]">Romain Llave</div>
                        <div className="text-xs text-text-secondary dark:text-[#787b86]">ID: 847294729</div>
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            <div className="py-2">
                {/* Account Section */}
                <div className="px-4 py-2 text-[10px] uppercase font-bold text-text-secondary dark:text-[#787b86] tracking-wider">
                    Compte
                </div>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <Wallet size={16} className="text-blue-500" />
                        <span>Solde: {balance.toFixed(2)} USDT</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                </button>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <User size={16} className="opacity-60" />
                        <span>Profil & Sécurité</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                </button>

                <div className="my-2 border-t border-border dark:border-[#2a2e39]" />

                {/* Bot Section */}
                <div className="px-4 py-2 text-[10px] uppercase font-bold text-text-secondary dark:text-[#787b86] tracking-wider">
                    Bot de Trading
                </div>
                <button
                    onClick={() => {
                        onNavigate('strategy');
                    }}
                    className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]"
                >
                    <div className="flex items-center gap-3">
                        <Zap size={16} className="text-yellow-500" />
                        <span>Paramètres Stratégie</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                </button>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <Shield size={16} className="text-green-500" />
                        <span>Mode Paper Trading</span>
                    </div>
                    <div className="w-8 h-4 bg-blue-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                    </div>
                </button>

                <div className="my-2 border-t border-border dark:border-[#2a2e39]" />

                {/* Reports Section */}
                <div className="px-4 py-2 text-[10px] uppercase font-bold text-text-secondary dark:text-[#787b86] tracking-wider">
                    Rapports
                </div>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <FileText size={16} className="opacity-60" />
                        <span>Journal d'Analyse</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                </button>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <Download size={16} className="opacity-60" />
                        <span>Exporter CSV</span>
                    </div>
                </button>

                <div className="my-2 border-t border-border dark:border-[#2a2e39]" />

                {/* Settings Section */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]"
                >
                    <div className="flex items-center gap-3">
                        {isDarkMode ? <Sun size={16} className="opacity-60" /> : <Moon size={16} className="opacity-60" />}
                        <span>Thème {isDarkMode ? 'Clair' : 'Sombre'}</span>
                    </div>
                </button>
                <button className="w-full px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors text-text-primary dark:text-[#d1d4dc]">
                    <div className="flex items-center gap-3">
                        <Settings size={16} className="opacity-60" />
                        <span>Paramètres Généraux</span>
                    </div>
                </button>

                <div className="my-2 border-t border-border dark:border-[#2a2e39]" />

                {/* Logout */}
                <button className="w-full px-4 py-3 text-sm flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 transition-colors">
                    <LogOut size={16} />
                    <span className="font-bold">Déconnexion</span>
                </button>

                <div className="p-4 bg-gray-50/50 dark:bg-[#131722]/50 border-t border-border dark:border-[#2a2e39]">
                    <div className="flex justify-between items-center text-[10px] text-text-secondary dark:text-[#787b86]">
                        <span className="font-medium">
                            {window.electron ? `Version ${version}` : "Version Web"}
                        </span>
                        {window.electron && (
                            <button
                                onClick={handleCheckUpdates}
                                className="flex items-center gap-1 hover:text-blue-500 transition-colors bg-white dark:bg-[#1e222d] px-2 py-1 rounded border border-border dark:border-[#2a2e39]"
                            >
                                <RefreshCw size={10} />
                                <span>Chercher une MAJ</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
