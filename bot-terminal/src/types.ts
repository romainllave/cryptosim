export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'signal';
    message: string;
}

export interface BotStats {
    status: 'RUNNING' | 'IDLE';
    symbol: string;
    trades: number;
    balance: number;
    lastSignal: string;
}

// LocalStorage keys (shared with main trading site)
export const STORAGE_KEYS = {
    BOT_LOGS: 'bot-terminal-logs',
    BOT_STATUS: 'bot-terminal-status',
    BOT_COMMAND: 'bot-terminal-command',
};
