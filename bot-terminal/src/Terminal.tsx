import React, { useState, useRef, useEffect } from 'react';
import type { LogEntry, BotStats } from './types';
import { LogLine } from './LogLine';

interface TerminalProps {
    logs: LogEntry[];
    stats: BotStats;
    onCommand: (command: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, stats, onCommand }) => {
    const [input, setInput] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onCommand(input.trim());
            setInput('');
        }
    };

    return (
        <div className="terminal-container">
            {/* Header */}
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="bot-icon">🤖</span>
                    <span>TRADING BOT TERMINAL v1.0</span>
                </div>
                <div className="terminal-status">
                    <span>{stats.symbol}/USDT</span>
                    <div className={`status-indicator ${stats.status.toLowerCase()}`} />
                    <span>{stats.status}</span>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-panel">
                <div className="stat-item">
                    <span className="stat-label">Status</span>
                    <span className={`stat-value ${stats.status === 'RUNNING' ? 'positive' : ''}`}>
                        {stats.status}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Symbol</span>
                    <span className="stat-value">{stats.symbol}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Trades</span>
                    <span className="stat-value">{stats.trades}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Signal</span>
                    <span className="stat-value">{stats.lastSignal || 'NONE'}</span>
                </div>
            </div>

            {/* Log Output */}
            <div className="terminal-body">
                {logs.length === 0 ? (
                    <div className="log-line info">
                        <span className="log-content">Waiting for bot activity... Type 'help' for commands.</span>
                    </div>
                ) : (
                    logs.map((entry) => (
                        <LogLine key={entry.id} entry={entry} />
                    ))
                )}
                <div ref={logsEndRef} />
            </div>

            {/* Command Input */}
            <form className="terminal-input-container" onSubmit={handleSubmit}>
                <span className="terminal-prompt">&gt;</span>
                <input
                    type="text"
                    className="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a command..."
                    autoFocus
                />
                <span className="cursor-blink" />
            </form>
        </div>
    );
};
