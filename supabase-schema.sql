-- Supabase SQL Schema for Trading Bot
-- Run this in the Supabase SQL Editor

-- Bot Commands Table
CREATE TABLE IF NOT EXISTS bot_commands (
    id BIGSERIAL PRIMARY KEY,
    command TEXT NOT NULL CHECK (command IN ('start', 'stop')),
    symbol TEXT NOT NULL DEFAULT 'BTC',
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
