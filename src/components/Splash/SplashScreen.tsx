import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface SplashScreenProps {
    onFinished: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
    const [status, setStatus] = useState<{
        status: 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error' | 'finishing';
        message: string;
        percent?: number;
        version?: string;
    }>({ status: 'checking', message: 'Vérification...' });

    const [dots, setDots] = useState('');
    const [isExpanding, setIsExpanding] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const triggerFinished = () => {
        setIsExpanding(true);
        // Start window expansion slightly after visual expansion starts
        setTimeout(() => {
            if (window.electron && window.electron.expandWindow) {
                window.electron.expandWindow();
            }
        }, 300);

        // Final transition to app
        setTimeout(onFinished, 1000);
    };

    useEffect(() => {
        if (window.electron && window.electron.onUpdateStatus) {
            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus(prev => ({ ...prev, status: 'finishing', message: 'Prêt' }));
                        triggerFinished();
                    }, 1500);
                }
            });

            const safetyTimeout = setTimeout(() => {
                setStatus(prev => {
                    if (prev.status === 'checking') {
                        triggerFinished();
                        return { status: 'finishing', message: 'Prêt' };
                    }
                    return prev;
                });
            }, 6000);

            return () => clearTimeout(safetyTimeout);
        } else {
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Web Version' });
                triggerFinished();
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
            {/* Main Circular Container */}
            <div className={clsx(
                "relative w-[400px] h-[400px] flex items-center justify-center transition-all duration-700",
                isExpanding && "scale-[5] opacity-0"
            )}>

                {/* Drag region for frameless window */}
                <div className="absolute inset-0 rounded-full" style={{ WebkitAppRegion: 'drag' } as any} />

                {/* Background Circle - The white box fix is to NOT have a background on the FULL div but only this circle */}
                <div className="absolute inset-4 rounded-full bg-[#0d1117] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-blue-900/40" />

                {/* SVG Progress Circle */}
                {!isExpanding && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 400 400">
                        {/* Background Track */}
                        <circle
                            cx="200"
                            cy="200"
                            r={radius}
                            fill="none"
                            stroke="rgba(30, 41, 59, 0.4)"
                            strokeWidth="8"
                        />
                        {/* Progress Bar */}
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
                    "relative flex flex-col items-center justify-center text-center p-8 z-10 pointer-events-none transition-opacity duration-300",
                    isExpanding && "opacity-0"
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
                            {status.status === 'error' ? (
                                <AlertCircle size={12} className="text-red-500" />
                            ) : (
                                <RefreshCw size={12} className="animate-spin" />
                            )}
                            <span>{status.message}{dots}</span>
                        </div>
                        {status.percent !== undefined && (
                            <span className="text-blue-300 text-xs font-mono">{Math.round(status.percent)}%</span>
                        )}
                    </div>
                </div>

                {/* Decorative particles/glow */}
                {!isExpanding && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-blue-500/5 pointer-events-none animate-ping opacity-20" />
                )}
            </div>
        </div>
    );
};
