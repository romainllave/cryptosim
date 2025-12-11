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
    markCommandProcessed,
    updateBotStatus
} from '../services/supabase';
import type { BotCommand } from '../services/supabase';
import type { CandleData } from '../utils/chartData';

// Configuration
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
        symbol: 'BTC',
        tradeAmount: 0.001, // Default, can be updated via command if we add that later
        enabled: false // Start disabled, wait for command
    });

    // Ensure status is synced as IDLE on startup
    await updateBotStatus('IDLE', 'BTC');

    console.log('🤖 Bot initialized. Waiting for commands...');

    // Storage for candles
    let candles: CandleData[] = [];
    let currentSymbol = 'BTC';
    let cleanupBinance: (() => void) | null = null;

    // Helper to switch symbol
    const switchSymbol = async (newSymbol: string) => {
        if (currentSymbol === newSymbol && candles.length > 0) return;

        console.log(`🔄 Switching to ${newSymbol}...`);
        currentSymbol = newSymbol;
        bot.setSymbol(newSymbol);

        // Cleanup previous subscription
        if (cleanupBinance) cleanupBinance();

        // 1. Fetch initial history
        console.log(`📊 Fetching historical data for ${newSymbol}...`);
        candles = await fetchKlines(newSymbol, '1m');
        console.log(`✅ Loaded ${candles.length} candles.`);

        // 2. Subscribe to Real-time updates
        cleanupBinance = subscribeToKline(newSymbol, '1m', (candle) => {
            // Update candle history
            if (candles.length > 0) {
                const last = candles[candles.length - 1];
                if (last.time === candle.time) {
                    candles[candles.length - 1] = candle;
                } else {
                    candles.push(candle);
                    // Keep memory usage in check
                    if (candles.length > 1000) candles.shift();
                }
            } else {
                candles.push(candle);
            }

            // Run Analysis if Bot is Running
            if (bot.isRunning()) {
                bot.analyze(candles);
            }
        });
    };

    // Initial setup
    await switchSymbol('BTC');

    // Setup Trade Callback
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

    // Command Listener
    subscribeToCommands(async (cmd: BotCommand) => {
        console.log('📩 Command received:', cmd);

        if (cmd.processed) return;

        if (cmd.command === 'start') {
            if (cmd.symbol) {
                await switchSymbol(cmd.symbol);
            }

            if (cmd.strategies) {
                bot.setStrategies(cmd.strategies);
                console.log('⚙️ Strategies updated:', cmd.strategies);
            }

            bot.start();
            await updateBotStatus('RUNNING', bot.getConfig().symbol);
            console.log(`🟢 Bot STARTED on ${bot.getConfig().symbol}`);

            // Run immediate analysis
            bot.analyze(candles);

        } else if (cmd.command === 'stop') {
            bot.stop();
            await updateBotStatus('IDLE', bot.getConfig().symbol);
            console.log('🔴 Bot STOPPED');
        }

        if (cmd.id) await markCommandProcessed(cmd.id);
    });

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down...');
        if (cleanupBinance) cleanupBinance();
        updateBotStatus('IDLE', currentSymbol).then(() => process.exit(0));
    });
}

main().catch(console.error);
