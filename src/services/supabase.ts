import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cevuveowgszbtjbsqmgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldnV2ZW93Z3N6YnRqYnNxbWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzgzODEsImV4cCI6MjA4MDcxNDM4MX0.S7s2-6ReVLjKGK0lw_KMq_F2uczHa6ZSSao8J41CnS8';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for Supabase tables
export interface BotCommand {
    id?: number;
    command: 'start' | 'stop';
    symbol: string;
    created_at?: string;
    processed?: boolean;
}

export interface BotTrade {
    id?: number;
    type: 'BUY' | 'SELL';
    symbol: string;
    amount: number;
    price: number;
    total: number;
    reason?: string;
    created_at?: string;
}

export interface Portfolio {
    id?: number;
    balance: number;
    updated_at?: string;
}

// Bot Commands
export async function sendBotCommand(
    command: 'start' | 'stop',
    symbol: string
): Promise<void> {
    const { error } = await supabase
        .from('bot_commands')
        .insert({
            command,
            symbol,
            processed: false
        });

    if (error) {
        console.error('Error sending bot command:', error.message, error.details, error.hint);
        throw error;
    }
}

export async function getLatestCommand(): Promise<BotCommand | null> {
    const { data, error } = await supabase
        .from('bot_commands')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting command:', error);
    }
    return data;
}

export async function markCommandProcessed(id: number): Promise<void> {
    const { error } = await supabase
        .from('bot_commands')
        .update({ processed: true })
        .eq('id', id);

    if (error) {
        console.error('Error marking command processed:', error);
    }
}

// Subscribe to new commands in real-time
export function subscribeToCommands(callback: (command: BotCommand) => void) {
    const channel = supabase
        .channel('bot-commands')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bot_commands' },
            (payload) => {
                callback(payload.new as BotCommand);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Bot Trades
export async function saveTrade(trade: Omit<BotTrade, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
        .from('bot_trades')
        .insert(trade);

    if (error) {
        console.error('Error saving trade:', error);
        throw error;
    }
}

export async function getTrades(limit: number = 100): Promise<BotTrade[]> {
    const { data, error } = await supabase
        .from('bot_trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error getting trades:', error);
        return [];
    }
    return data || [];
}

// Subscribe to new trades in real-time
export function subscribeToTrades(callback: (trade: BotTrade) => void) {
    const channel = supabase
        .channel('bot-trades')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bot_trades' },
            (payload) => {
                callback(payload.new as BotTrade);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Portfolio/Balance
export async function getBalance(): Promise<number> {
    const { data, error } = await supabase
        .from('portfolios')
        .select('balance')
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error getting balance:', error);
        return 10000; // Default balance
    }
    return data?.balance ?? 10000;
}

export async function updateBalance(balance: number): Promise<void> {
    // Upsert: update if exists, insert if not
    const { error } = await supabase
        .from('portfolios')
        .upsert({ id: 1, balance, updated_at: new Date().toISOString() });

    if (error) {
        console.error('Error updating balance:', error);
    }
}

// Subscribe to balance changes in real-time
export function subscribeToBalance(callback: (balance: number) => void) {
    const channel = supabase
        .channel('portfolio-balance')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'portfolios' },
            (payload) => {
                const newData = payload.new as Portfolio;
                if (newData?.balance !== undefined) {
                    callback(newData.balance);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Positions
export interface DBPosition {
    id: string;
    symbol: string;
    type: 'BUY';
    amount: number;
    entryPrice: number;
    entryTime: string;
    stopLoss?: number;
    takeProfit?: number;
    status: 'OPEN' | 'CLOSED';
}

export async function savePosition(position: DBPosition): Promise<void> {
    const { error } = await supabase
        .from('positions')
        .upsert({
            id: position.id,
            symbol: position.symbol,
            type: position.type,
            amount: position.amount,
            entry_price: position.entryPrice,
            entry_time: position.entryTime,
            stop_loss: position.stopLoss,
            take_profit: position.takeProfit,
            status: position.status,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error saving position:', error);
        throw error;
    }
}

export async function getOpenPosition(symbol: string): Promise<DBPosition | null> {
    const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'OPEN')
        .eq('symbol', symbol)
        .limit(1)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('Error getting position:', error);
        }
        return null;
    }

    return {
        id: data.id,
        symbol: data.symbol,
        type: data.type as 'BUY',
        amount: data.amount,
        entryPrice: data.entry_price,
        entryTime: data.entry_time,
        stopLoss: data.stop_loss,
        takeProfit: data.take_profit,
        status: data.status as 'OPEN' | 'CLOSED'
    };
}

export async function deletePosition(id: string): Promise<void> {
    const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting position:', error);
    }
}

export function subscribeToPositions(callback: (position: DBPosition | null) => void) {
    const channel = supabase
        .channel('portfolio-positions')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'positions' },
            (payload) => {
                const newData = payload.new as any;

                if (payload.eventType === 'DELETE' || (newData && newData.status === 'CLOSED')) {
                    callback(null);
                } else if (newData && newData.status === 'OPEN') {
                    callback({
                        id: newData.id,
                        symbol: newData.symbol,
                        type: newData.type as 'BUY',
                        amount: newData.amount,
                        entryPrice: newData.entry_price,
                        entryTime: newData.entry_time,
                        stopLoss: newData.stop_loss,
                        takeProfit: newData.take_profit,
                        status: newData.status as 'OPEN' | 'CLOSED'
                    });
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Bot Status
export async function updateBotStatus(status: 'IDLE' | 'RUNNING', symbol: string): Promise<void> {
    const { error } = await supabase
        .from('bot_status')
        .upsert({
            id: 1,
            status,
            symbol,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating bot status:', error);
    }
}

export function subscribeToBotStatus(callback: (status: { status: 'IDLE' | 'RUNNING', symbol: string }) => void) {
    const channel = supabase
        .channel('bot-status')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bot_status' },
            (payload) => {
                const newData = payload.new as { status: 'IDLE' | 'RUNNING', symbol: string };
                if (newData) {
                    callback(newData);
                }
            }
        )
        .subscribe();

    // Also fetch initial state
    supabase
        .from('bot_status')
        .select('*')
        .single()
        .then(({ data }) => {
            if (data) callback(data as any);
        });

    return () => {
        supabase.removeChannel(channel);
    };
}

// User Settings
export interface UserSettings {
    theme: 'light' | 'dark';
    last_symbol: string;
    strategy_mode?: 'LONG' | 'SHORT';
}

export async function getUserSettings(): Promise<UserSettings> {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();

    if (error) {
        // Silent error for new users or missing table, return defaults
        if (error.code !== 'PGRST116') {
            // console.warn('Error loading user settings (using defaults):', error.message);
        }
        return { theme: 'light', last_symbol: 'BTC', strategy_mode: 'LONG' };
    }
    return data as UserSettings;
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const { error } = await supabase
        .from('user_settings')
        .upsert({
            id: 1,
            ...settings,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating user settings:', error);
    }
}

export function subscribeToUserSettings(callback: (settings: UserSettings) => void) {
    const channel = supabase
        .channel('user-settings')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'user_settings' },
            (payload) => {
                if (payload.new) {
                    callback(payload.new as UserSettings);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Bot Logs
export interface LogEntry {
    id: string; // Supabase uses number/string, we cast to string for frontend
    type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'signal';
    message: string;
    created_at?: string;
}

export async function saveLog(type: LogEntry['type'], message: string): Promise<void> {
    const { error } = await supabase
        .from('bot_logs')
        .insert({ type, message });

    if (error) {
        console.error('Error saving log:', error);
    }
}

export async function getLogs(limit: number = 100): Promise<LogEntry[]> {
    const { data, error } = await supabase
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error getting logs:', error);
        return [];
    }
    // Reverse to show oldest first if needed, or keep latest first. 
    // Usually terminals show oldest at top, but we fetch latest. 
    // We will reverse in frontend or here. Let's return as is (descending) and let frontend handle display order.
    return (data || []).map(l => ({ ...l, id: l.id.toString() }));
}

export function subscribeToLogs(callback: (log: LogEntry) => void) {
    const channel = supabase
        .channel('bot-logs')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bot_logs' },
            (payload) => {
                const newLog = payload.new as any;
                callback({ ...newLog, id: newLog.id.toString() });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// Holdings Sync
export interface Holding {
    symbol: string;
    amount: number;
}

export async function saveHoldings(holdings: Record<string, number>): Promise<void> {
    // Convert holdings object to array of rows
    const rows = Object.entries(holdings).map(([symbol, amount]) => ({
        symbol,
        amount,
        updated_at: new Date().toISOString()
    }));

    if (rows.length === 0) return;

    const { error } = await supabase
        .from('holdings')
        .upsert(rows, { onConflict: 'symbol' });

    if (error) {
        console.error('Error saving holdings:', error);
    }
}

export async function getHoldings(): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('holdings')
        .select('symbol, amount');

    if (error) {
        console.error('Error getting holdings:', error);
        return {};
    }

    const result: Record<string, number> = {};
    (data || []).forEach(row => {
        if (row.amount > 0) {
            result[row.symbol] = row.amount;
        }
    });
    return result;
}

export function subscribeToHoldings(callback: (holdings: Record<string, number>) => void) {
    const channel = supabase
        .channel('holdings-sync')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'holdings' },
            async () => {
                // Refetch all holdings on any change
                const holdings = await getHoldings();
                callback(holdings);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
