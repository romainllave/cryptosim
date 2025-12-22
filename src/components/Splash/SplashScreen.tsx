import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface SplashScreenProps {
    onFinished: () => void;
}

type AnimStage = 'loading' | 'exploding' | 'connecting' | 'finished';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
    const [status, setStatus] = useState<{
        status: 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error' | 'finishing';
        message: string;
        percent?: number;
        version?: string;
    }>({ status: 'checking', message: 'Vérification...' });

    const [dots, setDots] = useState('');
    const [animStage, setAnimStage] = useState<AnimStage>('loading');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const triggerAdvancedAnimation = async () => {
        // Stage 1: Explode (Bars move to corners)
        setAnimStage('exploding');

        // Wait for scatter animation
        await new Promise(r => setTimeout(r, 600));

        // Stage 2: Connect (Bars draw the rectangle)
        setAnimStage('connecting');

        // Wait for connection animation
        await new Promise(r => setTimeout(r, 800));

        // Final expansion
        if (window.electron && window.electron.expandWindow) {
            window.electron.expandWindow();
        }

        setAnimStage('finished');
        setTimeout(onFinished, 100);
    };

    useEffect(() => {
        if (window.electron && window.electron.onUpdateStatus) {
            // Trigger check immediately
            window.electron.checkUpdates();

            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus(prev => ({ ...prev, status: 'finishing', message: 'Prêt' }));
                        triggerAdvancedAnimation();
                    }, 1500);
                }

                // If ready (downloaded), the main process will call quitAndInstall.
                // We should just keep showing the "Ready" status.
                if (data.status === 'ready') {
                    setStatus({ status: 'ready', message: 'Mise à jour prête. Redémarrage...' });
                }
            });

            const safetyTimeout = setTimeout(() => {
                setStatus(prev => {
                    if (prev.status === 'checking') {
                        triggerAdvancedAnimation();
                        return { status: 'finishing', message: 'Prêt' };
                    }
                    return prev;
                });
            }, 6000);

            return () => clearTimeout(safetyTimeout);
        } else {
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Web Version' });
                triggerAdvancedAnimation();
            }, 3000);
        }
    }, [onFinished]);

    // Circular Progress Calculation
    const radius = 180;
    const circumference = 2 * Math.PI * radius;
    const progress = status.percent ?? (status.status === 'checking' ? 30 : 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-transparent">

            {/* The Animated Frame (Connecting Bars) */}
            {animStage === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="relative w-full h-full max-w-[400px] max-h-[400px]">
                        {/* Top Beam */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 origin-left animate-beam-h shadow-[0_0_10px_#3b82f6]" />
                        {/* Bottom Beam */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 origin-right animate-beam-h shadow-[0_0_10px_#3b82f6]" />
                        {/* Left Beam */}
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500 origin-top animate-beam-v shadow-[0_0_10px_#3b82f6]" />
                        {/* Right Beam */}
                        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-blue-500 origin-bottom animate-beam-v shadow-[0_0_10px_#3b82f6]" />
                    </div>
                </div>
            )}

            {/* Main Container */}
            <div className={clsx(
                "relative w-[400px] h-[400px] flex items-center justify-center transition-all duration-500",
                animStage === 'finished' && "opacity-0 scale-110"
            )}>

                {/* Drag region for frameless window */}
                <div className="absolute inset-0 rounded-full" style={{ WebkitAppRegion: 'drag' } as any} />

                {/* 4 Points/Bars Emerging Stage */}
                {animStage === 'exploding' && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* TL */}
                        <div className="absolute w-8 h-1 bg-blue-500 -rotate-45 transition-all duration-500"
                            style={{ top: '0', left: '0', transform: 'translate(100px, 100px) rotate(-45deg)', opacity: 1, boxShadow: '0 0 15px #3b82f6' }} />
                        {/* TR */}
                        <div className="absolute w-8 h-1 bg-blue-500 rotate-45 transition-all duration-500"
                            style={{ top: '0', right: '0', transform: 'translate(-100px, 100px) rotate(45deg)', opacity: 1, boxShadow: '0 0 15px #3b82f6' }} />
                        {/* BL */}
                        <div className="absolute w-8 h-1 bg-blue-500 rotate-45 transition-all duration-500"
                            style={{ bottom: '0', left: '0', transform: 'translate(100px, -100px) rotate(45deg)', opacity: 1, boxShadow: '0 0 15px #3b82f6' }} />
                        {/* BR */}
                        <div className="absolute w-8 h-1 bg-blue-500 -rotate-45 transition-all duration-500"
                            style={{ bottom: '0', right: '0', transform: 'translate(-100px, -100px) rotate(-45deg)', opacity: 1, boxShadow: '0 0 15px #3b82f6' }} />
                    </div>
                )}

                {/* Background Circle */}
                <div className={clsx(
                    "absolute inset-4 rounded-full bg-[#0d1117] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-blue-900/40 transition-all duration-500",
                    animStage !== 'loading' && "opacity-0 scale-75"
                )} />

                {/* SVG Progress Circle */}
                {animStage === 'loading' && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 400 400">
                        <circle
                            cx="200"
                            cy="200"
                            r={radius}
                            fill="none"
                            stroke="rgba(30, 41, 59, 0.4)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="200"
                            cy="200"
                            r={radius}
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            style={{
                                strokeDashoffset,
                                transition: 'stroke-dashoffset 0.8s ease-in-out',
                                strokeLinecap: 'round'
                            }}
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                        </defs>
                    </svg>
                )}

                {/* Center Content */}
                <div className={clsx(
                    "relative flex flex-col items-center justify-center text-center p-8 z-10 pointer-events-none transition-all duration-500",
                    animStage !== 'loading' && "opacity-0 scale-50"
                )}>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-xl">
                            <Activity size={48} className="text-white animate-pulse" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-black tracking-tighter mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-300">
                        CRYPTOSIM <span className="text-blue-500">PRO</span>
                    </h1>

                    <div className="flex flex-col items-center gap-1 mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            <RefreshCw size={12} className="animate-spin" />
                            <span>{status.message}{dots}</span>
                        </div>
                        {status.percent !== undefined && (
                            <span className="text-blue-300 text-xs font-mono">{Math.round(status.percent)}%</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
