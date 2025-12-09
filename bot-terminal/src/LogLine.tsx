import React from 'react';
import type { LogEntry } from './types';

interface LogLineProps {
    entry: LogEntry;
}

export const LogLine: React.FC<LogLineProps> = ({ entry }) => {
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className={`log-line ${entry.type}`}>
            <span className="log-timestamp">[{formatTime(entry.timestamp)}]</span>
            <span className="log-content">{entry.message}</span>
        </div>
    );
};
