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
    getOpenPosition,
    savePosition,
    deletePosition
} from '../services/supabase';
import type { DBPosition } from '../services/supabase';
import type { BotCommand } from '../services/supabase';
import type { CandleData } from '../utils/chartData';
import { sendDiscordReport, sendTradeAlert, sendOpportunityAlert } from '../services/discord';

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
        tradeAmount: 0.001,
        enabled: false,
        risk: {
            stopLossPercent: 2,
            takeProfitPercent: 5,
            maxDrawdownPercent: 10,
            maxTradeBalancePercent: 20
        },
        strategyName: 'Custom Probability',
        randomAmountEnabled: true,
        maxRandomAmount: 1000
    });

    // Helper for logging to DB + Console
    const log = (type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'signal', msg: string) => {
        console.log(`[${type.toUpperCase()}] ${msg}`);
        // Fire and forget log save
        saveLog(type, msg).catch(err => console.error('Failed to save log:', err));
    };

    // Initial cleanup of strategy logic
    console.log('✅ Bot using single custom strategy (55/45)');

    // Ensure status is synced as IDLE on startup
    await updateBotStatus('IDLE', 'BTC');

    // ========== POSITION REHYDRATION ==========
    console.log('🔄 Checking for existing open position...');
    const existingPosition: DBPosition | null = await getOpenPosition('BTC');
    if (existingPosition) {
        console.log(`📌 Found open position: ${existingPosition.type} ${existingPosition.amount} ${existingPosition.symbol}`);
        bot.rehydratePosition({
            ...existingPosition,
            entryTime: new Date(existingPosition.entryTime)
        } as any);
        log('info', `Rehydrated open position: ${existingPosition.type} ${existingPosition.symbol}`);
        await updateBotStatus('RUNNING', 'BTC');
    }

    console.log('🤖 Bot initialized. Waiting for commands...');
    log('info', 'Bot Service initialized. Waiting for commands...');

    // Storage for candles
    let candles: CandleData[] = [];
    let currentSymbol = 'BTC';
    let cleanupBinance: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let lastBuyPrice: number | null = null; // Track entry price for profit calc
    let lastOpportunityAlertTime: number = 0; // Cooldown for opportunity alerts
    const OPPORTUNITY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

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

        // 2. Subscribe to Real-time updates with CONTINUOUS ANALYSIS
        cleanupBinance = subscribeToKline(newSymbol, '1m', async (candle) => {
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

            // ========== CONTINUOUS MARKET ANALYSIS ==========
            // Always analyze the market, even if bot is not running (for opportunity detection)
            if (candles.length >= 25) {
                const analysisResults = bot.analyze(candles);
                const result = analysisResults[0];
                const probability = result.confidence;

                // ========== OPPORTUNITY DETECTION (Seuil: 55% BUY, 45% SELL) ==========
                const now = Date.now();
                const canSendAlert = (now - lastOpportunityAlertTime) > OPPORTUNITY_COOLDOWN_MS;

                if (canSendAlert) {
                    if (probability >= 55) {
                        // BUY Opportunity detected!
                        console.log(`🚀 OPPORTUNITY DETECTED: BUY signal at ${probability.toFixed(1)}%`);
                        log('signal', `🚀 Opportunité BUY détectée! Probabilité: ${probability.toFixed(1)}%`);

                        sendOpportunityAlert({
                            symbol: currentSymbol,
                            probability,
                            action: 'BUY',
                            price: candle.close
                        }).catch(console.error);

                        lastOpportunityAlertTime = now;
                    } else if (probability <= 45) {
                        // SELL Opportunity detected!
                        console.log(`⚠️ OPPORTUNITY DETECTED: SELL signal at ${probability.toFixed(1)}%`);
                        log('signal', `⚠️ Opportunité SELL détectée! Probabilité: ${probability.toFixed(1)}%`);

                        sendOpportunityAlert({
                            symbol: currentSymbol,
                            probability,
                            action: 'SELL',
                            price: candle.close
                        }).catch(console.error);

                        lastOpportunityAlertTime = now;
                    }
                }
            }
        });

        // Periodic Analysis Reporting (Heartbeat & Discord)
        // This runs separately from the real-time tick analysis to give user feedback

        // Helper function to send analysis report
        const sendAnalysisReport = async () => {
            if (!bot.isRunning() || candles.length === 0) {
                console.log('⏭️ Skipping report: Bot not running or no candles');
                return;
            }

            const price = candles[candles.length - 1].close;
            const analysisResults = bot.analyze(candles);
            const result = analysisResults[0];
            const probability = result.confidence;
            const currentBalance = await getBalance();

            log('info', `📊 Analyzing ${currentSymbol} @ $${price.toFixed(2)} | Confidence: ${probability.toFixed(1)}%`);

            // Send Discord Heartbeat report
            console.log('📤 Sending Discord report...');
            try {
                await sendDiscordReport({
                    symbol: currentSymbol,
                    probability,
                    action: result.signal,
                    price,
                    balance: currentBalance
                });
                console.log('✅ Discord report sent successfully');
            } catch (error) {
                console.error('❌ Failed to send Discord report:', error);
            }
        };

        heartbeatInterval = setInterval(sendAnalysisReport, 60000); // Log every 1 minute
    };

    // Initial setup
    await switchSymbol('BTC');

    // Setup Trade Callback
    bot.setTradeCallback(async (type, amount, reason, _position) => {
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
        if (type === 'BUY') {
            lastBuyPrice = price;
            // Send Buy Alert
            sendTradeAlert({
                symbol: bot.getConfig().symbol,
                type: 'BUY',
                price,
                amount: tradeAmount,
                total: totalValue
            });
        } else if (type === 'SELL') {
            let profit = 0;
            let profitPercent = 0;

            if (lastBuyPrice) {
                profit = (price - lastBuyPrice) * tradeAmount;
                profitPercent = ((price - lastBuyPrice) / lastBuyPrice) * 100;
            }

            // Send Sell Alert with Profit
            sendTradeAlert({
                symbol: bot.getConfig().symbol,
                type: 'SELL',
                price,
                amount: tradeAmount,
                total: totalValue,
                profit,
                profitPercent
            });

            lastBuyPrice = null; // Reset tracking
        }

        log('success', `✅ Trade Confirmed: ${type}`);

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

        // 5. Update Position Persistence
        if (type === 'BUY') {
            await savePosition({
                id: Math.random().toString(36).substring(7), // Fallback if position object not passed
                ...(_position || {}),
                symbol: bot.getConfig().symbol,
                type: 'BUY',
                amount: tradeAmount,
                entryPrice: price,
                entryTime: new Date().toISOString(),
                status: 'OPEN'
            } as any);
            log('success', '📌 Position persisted to Supabase');
        } else if (type === 'SELL') {
            const openPos = await getOpenPosition(bot.getConfig().symbol);
            if (openPos) {
                await deletePosition(openPos.id);
                log('success', '📌 Position removed from Supabase');
            }
        }
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


            bot.start();
            await updateBotStatus('RUNNING', bot.getConfig().symbol);
            log('success', `🟢 Bot STARTED on ${bot.getConfig().symbol}`);

            // Run immediate analysis
            bot.analyze(candles);

            // Send immediate Discord report on start
            console.log('🚀 Sending initial Discord report after start...');
            if (candles.length > 0) {
                const analysisResults = bot.analyze(candles);
                const result = analysisResults[0];
                const currentBalance = await getBalance();
                const probability = result.confidence;

                sendDiscordReport({
                    symbol: currentSymbol,
                    probability,
                    action: result.signal,
                    price: candles[candles.length - 1].close,
                    balance: currentBalance
                }).then(() => console.log('✅ Initial Discord report sent'))
                    .catch(err => console.error('❌ Failed to send initial report:', err));
            }

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
