import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cevuveowgszbtjbsqmgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldnV2ZW93Z3N6YnRqYnNxbWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzgzODEsImV4cCI6MjA4MDcxNDM4MX0.S7s2-6ReVLjKGK0lw_KMq_F2uczHa6ZSSao8J41CnS8';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for Supabase tables
export interface BotCommand {
    id?: number;
    command: 'start' | 'stop';
    symbol: string;
    strategies?: {
        sma: boolean;
        meanReversion: boolean;
        momentum: boolean;
    };
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
    symbol: string,
    strategies?: { sma: boolean; meanReversion: boolean; momentum: boolean; }
): Promise<void> {
    const { error } = await supabase
        .from('bot_commands')
        .insert({
            command,
            symbol,
            strategies,
            processed: false
        });

    if (error) {
        console.error('Error sending bot command:', error);
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

export async function getTrades(limit: number = 50): Promise<BotTrade[]> {
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
