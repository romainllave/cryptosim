-- Supabase SQL Schema for Trading Bot
-- Run this in the Supabase SQL Editor

-- Bot Commands Table
CREATE TABLE IF NOT EXISTS bot_commands (
    id BIGSERIAL PRIMARY KEY,
    command TEXT NOT NULL CHECK (command IN ('start', 'stop')),
    symbol TEXT NOT NULL DEFAULT 'BTC',
    strategies JSONB DEFAULT '{"sma": true, "meanReversion": true, "momentum": true}'::jsonb,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Trades Table
CREATE TABLE IF NOT EXISTS bot_trades (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
    symbol TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    total DECIMAL NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Table
CREATE TABLE IF NOT EXISTS portfolios (
    id BIGSERIAL PRIMARY KEY,
    balance DECIMAL NOT NULL DEFAULT 10000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default portfolio entry
INSERT INTO portfolios (id, balance) VALUES (1, 10000) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for anon users (for this demo)
CREATE POLICY "Allow all for bot_commands" ON bot_commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for bot_trades" ON bot_trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for portfolios" ON portfolios FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE bot_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE bot_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE portfolios;

-- Bot Status Table (Singleton to track running state)
CREATE TABLE IF NOT EXISTS bot_status (
    id INT PRIMARY KEY DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING')),
    symbol TEXT DEFAULT 'BTC',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default status
INSERT INTO bot_status (id, status) VALUES (1, 'IDLE') ON CONFLICT (id) DO NOTHING;

-- Enable RLS for bot_status
ALTER TABLE bot_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for bot_status" ON bot_status FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for bot_status
ALTER PUBLICATION supabase_realtime ADD TABLE bot_status;

-- User Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS user_settings (
    id INT PRIMARY KEY DEFAULT 1,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    last_symbol TEXT DEFAULT 'BTC',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings
INSERT INTO user_settings (id, theme, last_symbol) VALUES (1, 'light', 'BTC') ON CONFLICT (id) DO NOTHING;

-- Enable RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for user_settings
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;

-- Bot Logs Table
CREATE TABLE IF NOT EXISTS bot_logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'trade', 'signal')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for bot_logs
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for bot_logs" ON bot_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for bot_logs
ALTER PUBLICATION supabase_realtime ADD TABLE bot_logs;
