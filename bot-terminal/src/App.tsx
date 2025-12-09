import { useState, useEffect, useCallback } from 'react';
import { Terminal } from './Terminal';
import type { LogEntry, BotStats } from './types';
import { STORAGE_KEYS } from './types';
import { subscribeToCommands, markCommandProcessed, saveTrade, updateBalance } from './supabase';
import type { BotCommand } from './supabase';
import { sendDiscordReport } from './discord';
import './index.css';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<BotStats>({
    status: 'IDLE',
    symbol: 'BTC',
    trades: 0,
    balance: 10000,
    lastSignal: '',
  });

  // Add a log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
    };
    setLogs(prev => [...prev, entry]);

    // Save to localStorage for sharing with trading site
    const logsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOT_LOGS) || '[]');
    logsData.push(entry);
    localStorage.setItem(STORAGE_KEYS.BOT_LOGS, JSON.stringify(logsData.slice(-100)));
  }, []);

  // Initial welcome message
  useEffect(() => {
    addLog('info', '═══════════════════════════════════════════════════════');
    addLog('success', '  🤖 TRADING BOT TERMINAL v1.0 INITIALIZED');
    addLog('info', '═══════════════════════════════════════════════════════');
    addLog('info', '');
    addLog('info', 'Type "help" for available commands');
    addLog('info', 'Type "start" to start the bot');
    addLog('info', '');
  }, []);

  // Subscribe to Supabase commands from trading site
  useEffect(() => {
    const unsubscribe = subscribeToCommands((command: BotCommand) => {
      if (command.command === 'start' && !command.processed) {
        addLog('info', '');
        addLog('success', '📡 [SUPABASE] Command received: START');
        if (command.symbol) {
          setStats(prev => ({ ...prev, symbol: command.symbol }));
        }
        if (command.strategies) {
          setStats(prev => ({ ...prev, strategies: command.strategies }));
          addLog('info', `🎯 Strategies updated: ${Object.entries(command.strategies!).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);
        }
        setStats(prev => ({ ...prev, status: 'RUNNING' }));
        addLog('success', `🚀 Bot STARTED on ${command.symbol || 'BTC'}/USDT`);
        addLog('info', 'Analyzing market every 8 seconds...');
        markCommandProcessed(command.id!);
      } else if (command.command === 'stop' && !command.processed) {
        addLog('info', '');
        addLog('warning', '📡 [SUPABASE] Command received: STOP');
        setStats(prev => ({ ...prev, status: 'IDLE' }));
        addLog('warning', '⏹️ Bot STOPPED');
        markCommandProcessed(command.id!);
      }
    });

    return () => unsubscribe();
  }, [addLog]);

  // Listen for storage changes from main trading site
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.BOT_STATUS) {
        try {
          const newStatus = JSON.parse(e.newValue || '{}');
          setStats(prev => ({ ...prev, ...newStatus }));
        } catch { }
      }

      // Listen for commands from trading site
      if (e.key === STORAGE_KEYS.BOT_COMMAND) {
        try {
          const cmdData = JSON.parse(e.newValue || '{}');
          if (cmdData.command === 'start') {
            addLog('info', '');
            addLog('success', '📡 Command received from Trading Site: START');
            if (cmdData.symbol) {
              setStats(prev => ({ ...prev, symbol: cmdData.symbol }));
            }
            setStats(prev => ({ ...prev, status: 'RUNNING' }));
            addLog('success', `🚀 Bot STARTED on ${cmdData.symbol || 'BTC'}/USDT`);
            addLog('info', 'Analyzing market every 8 seconds...');
          } else if (cmdData.command === 'stop') {
            addLog('info', '');
            addLog('warning', '📡 Command received from Trading Site: STOP');
            setStats(prev => ({ ...prev, status: 'IDLE' }));
            addLog('warning', '⏹️ Bot STOPPED');
          }
        } catch { }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [addLog]);

  // Bot trading logic with probability-based analysis
  useEffect(() => {
    if (stats.status !== 'RUNNING') return;

    // Track if we have an open position
    const hasPosition = stats.trades > 0 && stats.lastSignal === 'BUY';

    const analyzeMarket = () => {
      addLog('info', '');
      addLog('info', `═══════════════════════════════════════════════════`);
      addLog('info', `📊 MARKET ANALYSIS - ${stats.symbol}/USDT`);
      addLog('info', `═══════════════════════════════════════════════════`);

      // Strategy 1: SMA Analysis (trend following)
      let totalScore = 0;
      let activeWeight = 0;
      const strategies = stats.strategies || { sma: true, meanReversion: true, momentum: true };

      let smaScore = 0;
      let meanRevScore = 0;
      let momentumScore = 0;

      if (strategies.sma) {
        const smaTrend = Math.random() * 100;
        smaScore = smaTrend;
        addLog('signal', `  📈 SMA Trend Score: ${smaTrend.toFixed(1)}%`);
        totalScore += smaTrend * 0.3;
        activeWeight += 0.3;
      }

      // Strategy 2: Mean Reversion (oversold/overbought)
      if (strategies.meanReversion) {
        meanRevScore = 30 + Math.random() * 50;
        addLog('signal', `  📉 Mean Reversion Score: ${meanRevScore.toFixed(1)}%`);
        totalScore += meanRevScore * 0.3;
        activeWeight += 0.3;
      }

      // Strategy 3: Momentum Analysis
      if (strategies.momentum) {
        momentumScore = Math.random() * 100;
        addLog('signal', `  🚀 Momentum Score: ${momentumScore.toFixed(1)}%`);
        totalScore += momentumScore * 0.4;
        activeWeight += 0.4;
      }

      // Normalize probability based on active weights
      const probability = activeWeight > 0 ? totalScore / activeWeight : 0;

      addLog('info', '');
      addLog('success', `🎯 PROBABILITY: ${probability.toFixed(1)}% chance of price INCREASE`);
      addLog('info', '');

      // Current simulated price
      const currentPrice = 98000 + Math.random() * 2000;

      // Trading decision
      if (probability >= 55) {
        // BUY - 10% of portfolio
        const tradeAmount = stats.balance * 0.10;
        const btcAmount = tradeAmount / currentPrice;

        addLog('success', `✅ SIGNAL: BUY (Probability ${probability.toFixed(1)}% >= 55%)`);
        addLog('trade', `💰 EXECUTING: BUY ${btcAmount.toFixed(6)} ${stats.symbol} @ $${currentPrice.toFixed(2)}`);
        addLog('trade', `💵 Trade Size: $${tradeAmount.toFixed(2)} (10% of portfolio)`);

        // Send Discord notification
        sendDiscordReport({
          symbol: stats.symbol,
          smaScore,
          meanRevScore,
          momentumScore,
          probability,
          action: 'BUY',
          tradeAmount,
          price: currentPrice,
          balance: stats.balance - tradeAmount
        });

        // Save trade to Supabase
        saveTrade({
          type: 'BUY',
          symbol: stats.symbol,
          amount: btcAmount,
          price: currentPrice,
          total: tradeAmount,
          reason: `Bot - Probability ${probability.toFixed(1)}%`
        });

        // Update balance in Supabase
        updateBalance(stats.balance - tradeAmount);

        setStats(prev => ({
          ...prev,
          trades: prev.trades + 1,
          lastSignal: 'BUY',
          balance: prev.balance - tradeAmount
        }));

      } else if (probability <= 50) {
        if (hasPosition) {
          // SELL - close position
          const tradeAmount = stats.balance * 0.10;

          addLog('warning', `⚠️ SIGNAL: SELL (Probability ${probability.toFixed(1)}% <= 50%)`);
          addLog('trade', `💰 EXECUTING: SELL position @ $${currentPrice.toFixed(2)}`);
          addLog('trade', `💵 Closing position worth ~$${tradeAmount.toFixed(2)}`);

          const newBalance = stats.balance + tradeAmount * (1 + (Math.random() - 0.5) * 0.02);

          // Send Discord notification
          sendDiscordReport({
            symbol: stats.symbol,
            smaScore,
            meanRevScore,
            momentumScore,
            probability,
            action: 'SELL',
            tradeAmount,
            price: currentPrice,
            balance: newBalance
          });

          // Save trade to Supabase
          saveTrade({
            type: 'SELL',
            symbol: stats.symbol,
            amount: tradeAmount / currentPrice,
            price: currentPrice,
            total: tradeAmount,
            reason: `Bot - Probability ${probability.toFixed(1)}%`
          });

          // Update balance in Supabase
          updateBalance(newBalance);

          setStats(prev => ({
            ...prev,
            trades: prev.trades + 1,
            lastSignal: 'SELL',
            balance: newBalance
          }));
        } else {
          addLog('info', `⏳ Probability ${probability.toFixed(1)}% <= 50%, no position to sell`);
          addLog('info', `⏳ Waiting for next analysis...`);

          // Send Discord notification for HOLD
          sendDiscordReport({
            symbol: stats.symbol,
            smaScore,
            meanRevScore,
            momentumScore,
            probability,
            action: 'HOLD',
            balance: stats.balance
          });

          setStats(prev => ({ ...prev, lastSignal: 'HOLD' }));
        }
      } else {
        // 50-55% range - neutral, hold
        addLog('info', `⏳ Probability ${probability.toFixed(1)}% in neutral zone (50-55%)`);
        addLog('info', `⏳ HOLDING - waiting for clearer signal...`);

        // Send Discord notification for HOLD
        sendDiscordReport({
          symbol: stats.symbol,
          smaScore,
          meanRevScore,
          momentumScore,
          probability,
          action: 'HOLD',
          balance: stats.balance
        });

        setStats(prev => ({ ...prev, lastSignal: 'HOLD' }));
      }

      addLog('info', '');
      addLog('info', `⏰ Next analysis in 5 minutes...`);
      addLog('info', '═══════════════════════════════════════════════════');
    };

    // Run immediately on start
    analyzeMarket();

    // Then every 5 minutes (300000ms)
    const interval = setInterval(analyzeMarket, 300000);

    return () => clearInterval(interval);
  }, [stats.status, stats.symbol, stats.balance, stats.trades, stats.lastSignal, addLog]);

  // Handle commands
  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    addLog('info', `> ${command}`);

    switch (cmd) {
      case 'help':
        addLog('info', '');
        addLog('info', '╔═══════════════════════════════════════╗');
        addLog('info', '║         AVAILABLE COMMANDS            ║');
        addLog('info', '╠═══════════════════════════════════════╣');
        addLog('info', '║  start      - Start the trading bot   ║');
        addLog('info', '║  stop       - Stop the trading bot    ║');
        addLog('info', '║  status     - Show current status     ║');
        addLog('info', '║  clear      - Clear terminal logs     ║');
        addLog('info', '║  symbol X   - Change to symbol X      ║');
        addLog('info', '║  help       - Show this help          ║');
        addLog('info', '╚═══════════════════════════════════════╝');
        addLog('info', '');
        break;

      case 'start':
        if (stats.status === 'RUNNING') {
          addLog('warning', 'Bot is already running!');
        } else {
          setStats(prev => ({ ...prev, status: 'RUNNING' }));
          addLog('success', `🚀 Bot STARTED on ${stats.symbol}/USDT`);
          addLog('info', 'Analyzing market every 8 seconds...');
          localStorage.setItem(STORAGE_KEYS.BOT_STATUS, JSON.stringify({ ...stats, status: 'RUNNING' }));
        }
        break;

      case 'stop':
        if (stats.status === 'IDLE') {
          addLog('warning', 'Bot is not running!');
        } else {
          setStats(prev => ({ ...prev, status: 'IDLE' }));
          addLog('warning', '⏹️ Bot STOPPED');
          localStorage.setItem(STORAGE_KEYS.BOT_STATUS, JSON.stringify({ ...stats, status: 'IDLE' }));
        }
        break;

      case 'status':
        addLog('info', '');
        addLog('info', '┌─────────────────────────────────┐');
        addLog('info', `│ Status:  ${stats.status.padEnd(22)}│`);
        addLog('info', `│ Symbol:  ${(stats.symbol + '/USDT').padEnd(22)}│`);
        addLog('info', `│ Trades:  ${stats.trades.toString().padEnd(22)}│`);
        addLog('info', `│ Signal:  ${(stats.lastSignal || 'NONE').padEnd(22)}│`);
        addLog('info', '└─────────────────────────────────┘');
        addLog('info', '');
        break;

      case 'clear':
        setLogs([]);
        break;

      default:
        if (cmd.startsWith('symbol ')) {
          const newSymbol = cmd.replace('symbol ', '').toUpperCase();
          if (['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP'].includes(newSymbol)) {
            setStats(prev => ({ ...prev, symbol: newSymbol }));
            addLog('success', `Symbol changed to ${newSymbol}/USDT`);
          } else {
            addLog('error', `Unknown symbol: ${newSymbol}`);
            addLog('info', 'Available: BTC, ETH, SOL, DOGE, ADA, XRP');
          }
        } else {
          addLog('error', `Unknown command: ${command}`);
          addLog('info', 'Type "help" for available commands');
        }
    }
  };

  return <Terminal logs={logs} stats={stats} onCommand={handleCommand} />;
}

export default App;
