import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
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
    }>({ status: 'checking', message: 'Démarrage de CryptoSim Pro...' });

    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (window.electron && window.electron.onUpdateStatus) {
            window.electron.onUpdateStatus((data: any) => {
                setStatus(data);

                // If no update or error, wait a bit and then finish
                if (data.status === 'not-available' || data.status === 'error') {
                    setTimeout(() => {
                        setStatus(prev => ({ ...prev, status: 'finishing', message: 'Initialisation des modules...' }));

                        // Expand window before transitioning
                        if (window.electron && window.electron.expandWindow) {
                            window.electron.expandWindow();
                        }

                        setTimeout(onFinished, 1500);
                    }, 2000);
                }
            });

            // Timeout safety for web/dev/errors
            const safetyTimeout = setTimeout(() => {
                setStatus(prev => {
                    if (prev.status === 'checking') {
                        // Expand window for safety timeout too
                        if (window.electron && window.electron.expandWindow) {
                            window.electron.expandWindow();
                        }
                        return { status: 'finishing', message: 'Accès au terminal de trading...' };
                    }
                    return prev;
                });
                setTimeout(onFinished, 2000);
            }, 5000);

            return () => clearTimeout(safetyTimeout);
        } else {
            // For Web version, just show a quick splash
            setTimeout(() => {
                setStatus({ status: 'finishing', message: 'Lancement de la version Web...' });
                setTimeout(onFinished, 2000);
            }, 3000);
        }
    }, [onFinished]);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0d1117] flex flex-col items-center justify-center text-white overflow-hidden">
            {/* Drag region for frameless window */}
            <div className="absolute top-0 left-0 right-0 h-16" style={{ WebkitAppRegion: 'drag' } as any} />

            {/* Background Animated Gradients */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="relative flex flex-col items-center max-w-md w-full px-8">
                {/* Animated Logo Container */}
                <div className="relative mb-12 group">
                    <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                    <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-500">
                        <Activity size={64} className="text-white animate-[bounce_3s_infinite]" />
                    </div>

                    {/* Decorative Rings */}
                    <div className="absolute -inset-4 border border-blue-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute -inset-8 border border-indigo-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                </div>

                {/* Branding */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300">
                        CRYPTOSIM <span className="text-blue-500">PRO</span>
                    </h1>
                    <p className="text-blue-400/60 text-sm font-medium tracking-[0.2em] uppercase">
                        Professional Trading Terminal
                    </p>
                </div>

                {/* Status Area */}
                <div className="w-full space-y-6">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                        <div className="flex items-center gap-2 text-blue-400">
                            {status.status === 'error' ? (
                                <AlertCircle size={14} className="text-red-500" />
                            ) : status.status === 'ready' || status.status === 'not-available' ? (
                                <ShieldCheck size={14} className="text-green-500" />
                            ) : (
                                <RefreshCw size={14} className="animate-spin" />
                            )}
                            <span>{status.message}{status.status === 'checking' && dots}</span>
                        </div>
                        {status.percent !== undefined && (
                            <span className="text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]">{Math.round(status.percent)}%</span>
                        )}
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-1.5 w-full bg-blue-950/40 rounded-full border border-blue-900/20 overflow-hidden backdrop-blur-sm">
                        <div
                            className={clsx(
                                "h-full transition-all duration-500 ease-out relative",
                                status.status === 'error' ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" :
                                    status.status === 'ready' || status.status === 'finishing' ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" :
                                        "bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            )}
                            style={{
                                width: status.status === 'finishing' || status.status === 'ready' || status.status === 'not-available' ? '100%' :
                                    status.percent ? `${status.percent}%` :
                                        status.status === 'checking' ? '30%' : '10%'
                            }}
                        >
                            {/* Glossy overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex justify-between items-center text-[10px] text-white/30 font-medium">
                        <span>SECURE SYSTEM ACTIVE</span>
                        <span>V{status.version || '0.0.13'}</span>
                    </div>
                </div>
            </div>

            {/* Aesthetic micro-particles (Optional: can add more if needed) */}
            <div className="absolute bottom-8 text-[10px] text-white/10 tracking-widest font-mono uppercase">
                © 2025 Cryptosim Ecosystem. All rights reserved.
            </div>
        </div>
    );
};
