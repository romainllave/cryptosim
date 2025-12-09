import { useState, useEffect, useCallback } from 'react';
import { Terminal } from './Terminal';
import type { LogEntry, BotStats } from './types';
import { STORAGE_KEYS } from './types';
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

  // Simulate bot activity when running
  useEffect(() => {
    if (stats.status !== 'RUNNING') return;

    const strategies = ['SMA Crossover', 'Mean Reversion', 'Momentum'];
    const signals = ['BUY', 'SELL', 'HOLD'];

    const interval = setInterval(() => {
      // Generate random analysis
      const smaSignal = signals[Math.floor(Math.random() * 3)];
      const meanSignal = signals[Math.floor(Math.random() * 3)];
      const momSignal = signals[Math.floor(Math.random() * 3)];

      addLog('info', `Analyzing ${stats.symbol}/USDT...`);
      addLog('signal', `  SMA: ${smaSignal} | MEAN: ${meanSignal} | MOM: ${momSignal}`);

      // Count votes
      const buyCount = [smaSignal, meanSignal, momSignal].filter(s => s === 'BUY').length;
      const sellCount = [smaSignal, meanSignal, momSignal].filter(s => s === 'SELL').length;

      if (buyCount >= 2) {
        addLog('success', `✓ SIGNAL: BUY (${buyCount}/3 strategies agree)`);
        const price = 98000 + Math.random() * 1000;
        addLog('trade', `✓ EXECUTED: BUY 0.001 ${stats.symbol} @ $${price.toFixed(2)}`);
        setStats(prev => ({ ...prev, trades: prev.trades + 1, lastSignal: 'BUY' }));
      } else if (sellCount >= 2) {
        addLog('success', `✓ SIGNAL: SELL (${sellCount}/3 strategies agree)`);
        const price = 98000 + Math.random() * 1000;
        addLog('trade', `✓ EXECUTED: SELL 0.001 ${stats.symbol} @ $${price.toFixed(2)}`);
        setStats(prev => ({ ...prev, trades: prev.trades + 1, lastSignal: 'SELL' }));
      } else {
        setStats(prev => ({ ...prev, lastSignal: 'HOLD' }));
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [stats.status, stats.symbol, addLog]);

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
