import 'dotenv/config';
import WebSocket from 'ws';
import http from 'http';

// Polyfill WebSocket for Node.js environment (required for binance service)
// @ts-ignore
global.WebSocket = WebSocket;

import { TradingBot } from '../bot/botEngine';
import { fetchKlines, subscribeToKline } from '../services/binance';
import {
    saveTrade,
    subscribeToCommands,
    markCommandProcessed,
    updateBotStatus,
    getBalance,
    updateBalance,
    saveLog,
    fetchStrategies,
    subscribeToStrategies
} from '../services/supabase';
import type { BotCommand } from '../services/supabase';
import type { CandleData } from '../utils/chartData';
import { sendDiscordReport } from '../services/discord';

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

    // Helper for logging to DB + Console
    const log = (type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'signal', msg: string) => {
        console.log(`[${type.toUpperCase()}] ${msg}`);
        // Fire and forget log save
        saveLog(type, msg).catch(err => console.error('Failed to save log:', err));
    };

    // Load Strategies from DB
    try {
        const strategies = await fetchStrategies();
        bot.setStrategies(strategies);
        console.log('✅ Strategies loaded from DB:', strategies);
    } catch (err) {
        console.error('❌ Failed to load strategies:', err);
    }

    // Subscribe to Strategy Updates
    subscribeToStrategies((update) => {
        const currentStrategies = bot.getConfig().strategies;
        // @ts-ignore - Dynamic key access
        if (currentStrategies[update.name] !== undefined) {
            const newStrategies = {
                ...currentStrategies,
                [update.name]: update.isActive
            };
            bot.setStrategies(newStrategies);
            const statusMsg = update.isActive ? 'ACTIVE' : 'INACTIVE';
            console.log(`⚙️ Strategy updated: ${update.name} is now ${statusMsg}`);
            saveLog('info', `⚙️ Strategy updated: ${update.name} is now ${statusMsg}`).catch(console.error);
        }
    });

    // Ensure status is synced as IDLE on startup
    await updateBotStatus('IDLE', 'BTC');

    console.log('🤖 Bot initialized. Waiting for commands...');
    log('info', 'Bot Service initialized. Waiting for commands...');

    // Storage for candles
    let candles: CandleData[] = [];
    let currentSymbol = 'BTC';
    let cleanupBinance: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    // Helper to switch symbol
    const switchSymbol = async (newSymbol: string) => {
        if (currentSymbol === newSymbol && candles.length > 0) return;

        console.log(`🔄 Switching to ${newSymbol}...`);
        currentSymbol = newSymbol;
        bot.setSymbol(newSymbol);

        // Cleanup previous subscription and interval
        if (cleanupBinance) cleanupBinance();
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        // 1. Fetch initial history
        console.log(`📊 Fetching historical data for ${newSymbol}...`);
        candles = await fetchKlines(newSymbol, '1m');
        console.log(`✅ Loaded ${candles.length} candles.`);
        log('info', `Switched to ${newSymbol}. Loaded ${candles.length} candles.`);

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

                // We could log analysis here but we rely on heartbeat for summary
            }
        });

        // Periodic Analysis Reporting (Heartbeat & Discord)
        // This runs separately from the real-time tick analysis to give user feedback
        heartbeatInterval = setInterval(async () => {
            if (!bot.isRunning() || candles.length === 0) return;

            const price = candles[candles.length - 1].close;
            bot.analyze(candles); // Re-run analysis for reporting
            const currentBalance = await getBalance();

            // For now, let's log to DB so user sees "Analyzing"
            log('info', `📊 Analyzing ${currentSymbol} @ $${price.toFixed(2)}...`);

            // Send Discord Heartbeat (HOLD) report
            sendDiscordReport({
                symbol: currentSymbol,
                smaScore: 50, // Placeholder
                meanRevScore: 50, // Placeholder
                momentumScore: 50, // Placeholder
                probability: 50,
                action: 'HOLD',
                balance: currentBalance
            }).catch(console.error);

        }, 60000); // Log every 1 minute
    };

    // Initial setup
    await switchSymbol('BTC');

    // Setup Trade Callback
    bot.setTradeCallback(async (type, amount, reason) => {
        const price = candles[candles.length - 1]?.close || 0;
        let tradeAmount = amount;

        // 1. Get Current Balance
        const currentBalance = await getBalance();
        const maxTradeValue = currentBalance * 0.2; // Max 20% of balance per trade (Safety Rule)

        // 2. Risk Check & Position Sizing
        let totalValue = tradeAmount * price;

        if (type === 'BUY') {
            // Check if we have enough funds
            if (totalValue > currentBalance) {
                log('warning', `⚠️ Insufficient funds: ${totalValue.toFixed(2)} > ${currentBalance.toFixed(2)}`);
                const safeValue = Math.min(currentBalance, maxTradeValue);
                tradeAmount = safeValue / price;
                totalValue = tradeAmount * price;
                log('warning', `📉 Adjusted trade to safe limit: ${tradeAmount.toFixed(4)} ${bot.getConfig().symbol}`);
            } else if (totalValue > maxTradeValue) {
                log('warning', `⚠️ Trade exceeds risk limit (20%)`);
                tradeAmount = maxTradeValue / price;
                totalValue = tradeAmount * price;
                log('warning', `📉 Adjusted trade to risk limit: ${tradeAmount.toFixed(4)} ${bot.getConfig().symbol}`);
            }
        }

        if (tradeAmount <= 0) {
            log('error', '❌ Trade amount too small. Skipping.');
            return;
        }

        log('trade', `⚡ EXECUTING: ${type} ${tradeAmount.toFixed(4)} @ ${price} (${reason})`);

        // 3. Update Balance
        let newBalance = currentBalance;
        if (type === 'BUY') {
            newBalance -= totalValue;
        } else if (type === 'SELL') {
            newBalance += totalValue;
        }

        await updateBalance(newBalance);
        log('success', `💰 Balance updated: ${newBalance.toFixed(2)} USDT`);

        // 4. Save Trade
        saveTrade({
            type,
            symbol: bot.getConfig().symbol,
            amount: tradeAmount,
            price,
            total: totalValue,
            reason
        }).then(() => log('success', '💾 Trade saved to DB'))
            .catch(err => log('error', `❌ Error saving trade: ${err.message}`));
    });

    // Command Listener
    subscribeToCommands(async (cmd: BotCommand) => {
        console.log('📩 Command received:', cmd);

        if (cmd.processed) return;

        if (cmd.command === 'start') {
            log('info', '📩 Command received: START');
            if (cmd.symbol) {
                await switchSymbol(cmd.symbol);
            }

            if (cmd.strategies) {
                bot.setStrategies({
                    sma: cmd.strategies.sma,
                    meanReversion: cmd.strategies.meanReversion,
                    momentum: cmd.strategies.momentum,
                    prediction: cmd.strategies.prediction ?? false,
                    ema: cmd.strategies.ema ?? false
                });
                log('info', '⚙️ Strategies updated via Command');
            }

            bot.start();
            await updateBotStatus('RUNNING', bot.getConfig().symbol);
            log('success', `🟢 Bot STARTED on ${bot.getConfig().symbol}`);

            // Run immediate analysis
            bot.analyze(candles);

        } else if (cmd.command === 'stop') {
            bot.stop();
            await updateBotStatus('IDLE', bot.getConfig().symbol);
            log('warning', '🔴 Bot STOPPED');
        }

        if (cmd.id) await markCommandProcessed(cmd.id);
    });

    // Keep process alive
    process.on('SIGINT', () => {
        log('error', '🛑 Shutting down...');
        if (cleanupBinance) cleanupBinance();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        updateBotStatus('IDLE', currentSymbol).then(() => process.exit(0));
    });
}

main().catch(console.error);
