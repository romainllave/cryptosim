import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { clsx } from 'clsx';

interface TitleBarProps {
    isDarkMode: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isDarkMode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Show if mouse is in the top 20 pixels
            if (e.clientY <= 20) {
                setIsVisible(true);
            } else if (e.clientY > 50) {
                // Hide if mouse moves below 50 pixels (to give some buffer)
                setIsVisible(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleMinimize = () => {
        if (window.electron) window.electron.minimize();
    };

    const handleMaximize = () => {
        if (window.electron) {
            window.electron.maximize();
            setIsMaximized(!isMaximized);
        }
    };

    const handleClose = () => {
        if (window.electron) window.electron.close();
    };

    return (
        <div
            className={clsx(
                "fixed top-0 left-0 right-0 h-10 z-[10000] flex items-center justify-between px-4 transition-[transform,opacity] duration-300 cubic-bezier(0.23, 1, 0.32, 1) transform will-change-transform gpu-accel",
                isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
                isDarkMode ? "bg-[#1e222d] text-[#d1d4dc] border-b border-[#2a2e39]" : "bg-transparent text-text-primary border-b border-border shadow-sm"
            )}
        >
            {/* App Title & Drag Area */}
            <div className="flex-1 h-full flex items-center select-none" style={{ WebkitAppRegion: 'drag' } as any}>
                <span className="text-xs font-bold tracking-tight">CryptoSim Pro</span>
            </div>

            {/* Controls */}
            <div className="flex items-center h-full no-drag" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Réduire"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title={isMaximized ? "Restaurer" : "Agrandir"}
                >
                    {isMaximized ? <Copy size={12} /> : <Square size={12} />}
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors"
                    title="Fermer"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
