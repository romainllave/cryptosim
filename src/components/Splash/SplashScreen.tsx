import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface SplashScreenProps {
    onFinished: () => void;
}

type AnimStage = 'loading' | 'morphing' | 'finished';

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

    const triggerMorph = async () => {
        // Start morphing animation
        setAnimStage('morphing');

        // Wait for morph to complete
        await new Promise(r => setTimeout(r, 800));

        // Expand window and finish
        if (window.electron?.expandWindow) {
            window.electron.expandWindow();
        }

        setAnimStage('finished');
        onFinished();
    };

    useEffect(() => {
        if (window.electron?.onUpdateStatus) {
            window.electron.checkUpdates();

            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus({ status: 'finishing', message: 'Lancement...' });
                        triggerMorph();
                    }, 1500);
                }

                if (data.status === 'ready') {
                    setStatus({ status: 'ready', message: 'Installation...' });
                }
            });

            const safetyTimeout = setTimeout(() => {
                setStatus(prev => {
                    if (prev.status === 'checking') {
                        triggerMorph();
                        return { status: 'finishing', message: 'Prêt' };
                    }
                    return prev;
                });
            }, 8000);

            return () => clearTimeout(safetyTimeout);
        } else {
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Version Web' });
                triggerMorph();
            }, 3000);
        }
    }, [onFinished]);

    const radius = 180;
    const circumference = 2 * Math.PI * radius;
    const progress = status.percent ?? (status.status === 'checking' ? 30 : 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const isMorphing = animStage === 'morphing';
    const isFinished = animStage === 'finished';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent select-none overflow-hidden">

            {/* The Morphing Container */}
            <div
                className={clsx(
                    "relative flex items-center justify-center bg-[#0b0e14] border-2 border-blue-500/30 shadow-[0_0_80px_rgba(0,0,0,0.9)]",
                    isMorphing && "animate-morph",
                    isFinished && "opacity-0"
                )}
                style={{
                    width: isMorphing || isFinished ? undefined : '450px',
                    height: isMorphing || isFinished ? undefined : '450px',
                    borderRadius: isMorphing || isFinished ? undefined : '50%',
                }}
            >

                {/* Drag region */}
                <div
                    className="absolute inset-0"
                    style={{
                        WebkitAppRegion: 'drag',
                        borderRadius: 'inherit'
                    } as any}
                />

                {/* Loading Content (Fades out during morph) */}
                <div className={clsx(
                    "absolute inset-0 flex items-center justify-center",
                    isMorphing && "animate-fade-out"
                )}>

                    {/* SVG Progress Circle */}
                    {!isMorphing && !isFinished && (
                        <svg className="absolute w-[450px] h-[450px] -rotate-90" viewBox="0 0 450 450">
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

                    {/* Logo & Text */}
                    <div className="relative flex flex-col items-center text-center z-10 pointer-events-none">
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
        </div>
    );
};
