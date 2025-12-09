import 'dotenv/config';
import WebSocket from 'ws';
import http from 'http';

// Polyfill WebSocket for Node.js environment (required for binance service)
// @ts-ignore
global.WebSocket = WebSocket;

import { TradingBot } from '../bot/botEngine'; // Note: check path relative to this file
import { fetchKlines, subscribeToKline } from '../services/binance';
import {
    saveTrade,
    subscribeToCommands,
    markCommandProcessed
} from '../services/supabase';
import type { BotCommand } from '../services/supabase';
import type { CandleData } from '../utils/chartData';

// Configuration
const SYMBOL = 'BTC';
const INTERVAL = '1m';
const PORT = process.env.PORT || 3000;

// Dummy HTTP Server for Render "Web Service" requirement
const server = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('Bot Server is Running');
});

server.listen(PORT, () => {
    console.log(`🌍 HTTP Server listening on port ${PORT}`);
});

async function main() {
    console.log('🚀 Starting Bot Server...');

    // Initialize Bot
    const bot = new TradingBot({
        symbol: SYMBOL,
        tradeAmount: 0.001,
        enabled: false // Start disabled, wait for command
    });

    console.log('🤖 Bot initialized. Waiting for commands...');

    // Storage for candles
    let candles: CandleData[] = [];

    // 1. Fetch initial history
    console.log(`📊 Fetching historical data for ${SYMBOL}...`);
    candles = await fetchKlines(SYMBOL, INTERVAL);
    console.log(`✅ Loaded ${candles.length} candles.`);

    // 2. Setup Trade Callback
    bot.setTradeCallback((type, amount, reason) => {
        const price = candles[candles.length - 1]?.close || 0;
        const total = amount * price;

        console.log(`⚡ EXECUTING TRADE: ${type} ${amount} @ ${price} (${reason})`);

        saveTrade({
            type,
            symbol: bot.getConfig().symbol,
            amount,
            price,
            total,
            reason
        }).then(() => console.log('💾 Trade saved to Supabase'))
            .catch(err => console.error('❌ Error saving trade:', err));
    });

    // 3. Command Listener
    subscribeToCommands(async (cmd: BotCommand) => {
        console.log('📩 Command received:', cmd);

        // Only process if not already processed (though subscription gives new inserts)
        if (cmd.processed) return;

        if (cmd.command === 'start') {
            if (cmd.symbol) bot.setSymbol(cmd.symbol);
            bot.start();
            console.log(`🟢 Bot STARTED on ${bot.getConfig().symbol}`);
        } else if (cmd.command === 'stop') {
            bot.stop();
            console.log('🔴 Bot STOPPED');
        }

        // Mark as processed if needed, or just rely on real-time event
        if (cmd.id) await markCommandProcessed(cmd.id);
    });

    // 4. Analysis Loop (triggered by new candle data)
    // We subscribe to Binance WebSocket for real-time updates
    const cleanupBinance = subscribeToKline(SYMBOL, INTERVAL, (candle) => {
        // Update candle history
        if (candles.length > 0) {
            const last = candles[candles.length - 1];
            if (last.time === candle.time) {
                candles[candles.length - 1] = candle;
            } else {
                candles.push(candle);
                // Keep memory usage in check, e.g., last 1000 candles
                if (candles.length > 1000) candles.shift();
            }
        } else {
            candles.push(candle);
        }

        // Run Analysis if Bot is Running
        if (bot.isRunning()) {
            // Optional: debouncing could be added here if updates are too frequent,
            // but for 1m candles, running on every update is usually fine or 
            // we can run only on candle close (when new candle arrives)

            // For this implementation, let's analyze on every update to catch signals ASAP
            bot.analyze(candles);
        }
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down...');
        cleanupBinance();
        process.exit(0);
    });
}

main().catch(console.error);
