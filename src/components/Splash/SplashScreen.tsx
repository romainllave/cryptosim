import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface SplashScreenProps {
    onFinished: () => void;
}

type AnimStage = 'loading' | 'connecting-corners' | 'forming-frame' | 'finished';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
    const [status, setStatus] = useState<{
        status: 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error' | 'finishing';
        message: string;
        percent?: number;
    }>({ status: 'checking', message: 'Vérification...' });

    const [dots, setDots] = useState('');
    const [animStage, setAnimStage] = useState<AnimStage>('loading');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const triggerAnimation = async () => {
        // Stage 1: Beams connect center to corners (X shape)
        setAnimStage('connecting-corners');
        await new Promise(r => setTimeout(r, 1000));

        // Stage 2: Rectangle frame forms
        setAnimStage('forming-frame');
        await new Promise(r => setTimeout(r, 1200));

        // Reveal the app
        if (window.electron?.expandWindow) {
            window.electron.expandWindow();
        }

        setAnimStage('finished');
        setTimeout(onFinished, 100);
    };

    useEffect(() => {
        if (window.electron?.onUpdateStatus) {
            window.electron.checkUpdates();

            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus({ status: 'finishing', message: 'Lancement...' });
                        triggerAnimation();
                    }, 1500);
                }

                if (data.status === 'ready') {
                    setStatus({ status: 'ready', message: 'Installation...' });
                }
            });

            const safetyTimeout = setTimeout(() => {
                setStatus(prev => {
                    if (prev.status === 'checking') {
                        triggerAnimation();
                        return { status: 'finishing', message: 'Prêt' };
                    }
                    return prev;
                });
            }, 8000);

            return () => clearTimeout(safetyTimeout);
        } else {
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Version Web' });
                triggerAnimation();
            }, 3000);
        }
    }, [onFinished]);

    const radius = 180;
    const circumference = 2 * Math.PI * radius;
    const progress = status.percent ?? (status.status === 'checking' ? 30 : 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const animStarted = animStage !== 'loading';
    const showFrame = animStage === 'forming-frame' || animStage === 'finished';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent select-none overflow-hidden">

            {/* Diagonal Beams (X shape) - Always mounted, animation triggered once */}
            <div className={clsx(
                "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
                !animStarted && "opacity-0",
                animStage === 'finished' && "opacity-0"
            )}>
                {/* Top-Left beam */}
                <div
                    className={clsx("absolute h-2 bg-blue-500 rounded-full neon-pro-fast", animStarted && "animate-x-beam")}
                    style={{
                        width: '755px',
                        left: '50%',
                        top: '50%',
                        transformOrigin: 'left center',
                        transform: 'translate(0, -50%) rotate(-148deg) scaleX(0)'
                    }}
                />
                {/* Top-Right beam */}
                <div
                    className={clsx("absolute h-2 bg-blue-500 rounded-full neon-pro-fast", animStarted && "animate-x-beam")}
                    style={{
                        width: '755px',
                        right: '50%',
                        top: '50%',
                        transformOrigin: 'right center',
                        transform: 'translate(0, -50%) rotate(148deg) scaleX(0)'
                    }}
                />
                {/* Bottom-Left beam */}
                <div
                    className={clsx("absolute h-2 bg-blue-500 rounded-full neon-pro-fast", animStarted && "animate-x-beam")}
                    style={{
                        width: '755px',
                        left: '50%',
                        bottom: '50%',
                        transformOrigin: 'left center',
                        transform: 'translate(0, 50%) rotate(148deg) scaleX(0)'
                    }}
                />
                {/* Bottom-Right beam */}
                <div
                    className={clsx("absolute h-2 bg-blue-500 rounded-full neon-pro-fast", animStarted && "animate-x-beam")}
                    style={{
                        width: '755px',
                        right: '50%',
                        bottom: '50%',
                        transformOrigin: 'right center',
                        transform: 'translate(0, 50%) rotate(-148deg) scaleX(0)'
                    }}
                />
            </div>

            {/* Rectangle Frame (Perimeter) - Always mounted */}
            <div className={clsx(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                !showFrame && "opacity-0"
            )}>
                <div className="relative w-[1280px] h-[800px]">
                    <div className={clsx("absolute top-0 left-0 right-0 h-2 bg-blue-500 origin-left rounded-full neon-pro-fast", showFrame && "animate-gpu-h")} style={{ transform: 'scaleX(0)' }} />
                    <div className={clsx("absolute bottom-0 left-0 right-0 h-2 bg-blue-500 origin-right rounded-full neon-pro-fast", showFrame && "animate-gpu-h")} style={{ transform: 'scaleX(0)' }} />
                    <div className={clsx("absolute left-0 top-0 bottom-0 w-2 bg-blue-500 origin-top rounded-full neon-pro-fast", showFrame && "animate-gpu-v")} style={{ transform: 'scaleY(0)' }} />
                    <div className={clsx("absolute right-0 top-0 bottom-0 w-2 bg-blue-500 origin-bottom rounded-full neon-pro-fast", showFrame && "animate-gpu-v")} style={{ transform: 'scaleY(0)' }} />
                </div>
            </div>

            {/* Central Circle (Loading) */}
            <div className={clsx(
                "relative w-[450px] h-[450px] flex items-center justify-center transition-all duration-500",
                animStarted && "animate-gpu-shrink pointer-events-none"
            )}>

                <div className="absolute inset-0 rounded-full" style={{ WebkitAppRegion: 'drag' } as any} />
                <div className={clsx(
                    "absolute inset-4 rounded-full bg-[#0b0e14] border-2 border-blue-500/20 shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-opacity duration-300",
                    animStarted && "opacity-0"
                )} />

                {!animStarted && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 450 450">
                        <circle cx="225" cy="225" r={radius} fill="none" stroke="rgba(30,41,59,0.5)" strokeWidth="10" />
                        <circle
                            cx="225" cy="225" r={radius} fill="none"
                            stroke="url(#splash-grad)" strokeWidth="12"
                            strokeDasharray={circumference}
                            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease', strokeLinecap: 'round' }}
                        />
                        <defs>
                            <linearGradient id="splash-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#2563eb" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                )}

                <div className={clsx(
                    "relative flex flex-col items-center text-center z-10 pointer-events-none transition-opacity duration-300",
                    animStarted && "opacity-0"
                )}>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-2xl opacity-20 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-blue-600 to-blue-900 p-5 rounded-2xl shadow-xl border border-white/5">
                            <Activity size={50} className="text-white animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        CRYPTOSIM <span className="text-blue-400">PRO</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>{status.message}{dots}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
