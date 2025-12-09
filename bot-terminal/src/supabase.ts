import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cevuveowgszbtjbsqmgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldnV2ZW93Z3N6YnRqYnNxbWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzgzODEsImV4cCI6MjA4MDcxNDM4MX0.S7s2-6ReVLjKGK0lw_KMq_F2uczHa6ZSSao8J41CnS8';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
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

// Subscribe to new commands in real-time
export function subscribeToCommands(callback: (command: BotCommand) => void) {
    const channel = supabase
        .channel('terminal-commands')
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

// Mark command as processed
export async function markCommandProcessed(id: number): Promise<void> {
    await supabase
        .from('bot_commands')
        .update({ processed: true })
        .eq('id', id);
}

// Save a trade to Supabase
export async function saveTrade(trade: Omit<BotTrade, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
        .from('bot_trades')
        .insert(trade);

    if (error) {
        console.error('Error saving trade:', error);
    }
}

// Get portfolio balance
export async function getBalance(): Promise<number> {
    const { data, error } = await supabase
        .from('portfolios')
        .select('balance')
        .limit(1)
        .single();

    if (error) {
        console.error('Error getting balance:', error);
        return 10000;
    }
    return data?.balance ?? 10000;
}

// Update portfolio balance
export async function updateBalance(balance: number): Promise<void> {
    await supabase
        .from('portfolios')
        .upsert({ id: 1, balance, updated_at: new Date().toISOString() });
}
