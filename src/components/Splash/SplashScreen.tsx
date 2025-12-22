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
        // Stage 1: Burst (Bars shoot from center to corners)
        setAnimStage('exploding');

        // Wait for burst motion
        await new Promise(r => setTimeout(r, 800));

        // Stage 2: Connect (Bars draw the full frame)
        setAnimStage('connecting');

        // Wait for connection to complete
        await new Promise(r => setTimeout(r, 1000));

        // Switch to main app
        if (window.electron && window.electron.expandWindow) {
            window.electron.expandWindow();
        }

        setAnimStage('finished');
        setTimeout(onFinished, 100);
    };

    useEffect(() => {
        if (window.electron && window.electron.onUpdateStatus) {
            window.electron.checkUpdates();

            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus(prev => ({ ...prev, status: 'finishing', message: 'Lancement...' }));
                        triggerAdvancedAnimation();
                    }, 1500);
                }

                if (data.status === 'ready') {
                    setStatus({ status: 'ready', message: 'Installation...' });
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
            }, 8000);

            return () => clearTimeout(safetyTimeout);
        } else {
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Version Web' });
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-transparent select-none">

            {/* The Frame Layer (Drawing the 1280x800 rectangle) */}
            {animStage === 'connecting' && (
                <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center neon-border-thick">
                    <div className="relative w-[1280px] h-[800px]">
                        {/* Top Beam */}
                        <div className="absolute top-0 left-0 right-0 h-[6px] bg-blue-500 origin-left animate-beam-h rounded-full shadow-[0_0_40px_rgba(59,130,246,0.8)]" />
                        {/* Bottom Beam */}
                        <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-blue-500 origin-right animate-beam-h rounded-full shadow-[0_0_40px_rgba(59,130,246,0.8)]" />
                        {/* Left Beam */}
                        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-blue-500 origin-top animate-beam-v rounded-full shadow-[0_0_40px_rgba(59,130,246,0.8)]" />
                        {/* Right Beam */}
                        <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-blue-500 origin-bottom animate-beam-v rounded-full shadow-[0_0_40px_rgba(59,130,246,0.8)]" />
                    </div>
                </div>
            )}

            {/* Burst Layer (Bars shooting from center) */}
            {animStage === 'exploding' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* TL */}
                    <div className="absolute w-20 h-4 bg-blue-500 origin-center animate-burst-tl neon-glow-thick rounded-full" />
                    {/* TR */}
                    <div className="absolute w-20 h-4 bg-blue-500 origin-center animate-burst-tr neon-glow-thick rounded-full" />
                    {/* BL */}
                    <div className="absolute w-20 h-4 bg-blue-500 origin-center animate-burst-bl neon-glow-thick rounded-full" />
                    {/* BR */}
                    <div className="absolute w-20 h-4 bg-blue-500 origin-center animate-burst-br neon-glow-thick rounded-full" />
                </div>
            )}

            {/* Central Circle & Logo (Shrinks and fades during burst) */}
            <div className={clsx(
                "relative w-[450px] h-[450px] flex items-center justify-center transition-all",
                animStage === 'exploding' && "animate-shrink-fade",
                animStage === 'connecting' && "opacity-0",
                animStage === 'finished' && "opacity-0"
            )}>

                {/* Drag region for frameless window */}
                <div className="absolute inset-0 rounded-full" style={{ WebkitAppRegion: 'drag' } as any} />

                {/* Background Circle */}
                <div className="absolute inset-4 rounded-full bg-[#0d1117] shadow-[0_0_70px_rgba(0,0,0,1)] border-2 border-blue-500/30" />

                {/* SVG Progress Circle */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 450 450">
                    <circle
                        cx="225"
                        cy="225"
                        r={radius}
                        fill="none"
                        stroke="rgba(30, 41, 59, 0.6)"
                        strokeWidth="10"
                    />
                    <circle
                        cx="225"
                        cy="225"
                        r={radius}
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="12"
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
                            <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center Content */}
                <div className="relative flex flex-col items-center justify-center text-center p-8 z-10 pointer-events-none">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-3xl opacity-30 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-2xl border border-white/10">
                            <Activity size={56} className="text-white animate-pulse" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-400">
                        CRYPTOSIM <span className="text-blue-500">PRO</span>
                    </h1>

                    <div className="flex flex-col items-center gap-2 mt-4">
                        <div className="flex items-center gap-3 text-[11px] font-bold text-blue-400 uppercase tracking-[0.3em] overflow-hidden">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>{status.message}{dots}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
