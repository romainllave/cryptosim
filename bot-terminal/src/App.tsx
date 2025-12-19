import { useState, useEffect } from 'react';
import { Terminal } from './Terminal';
import type { LogEntry as UILogEntry, BotStats } from './types';
import { getLogs, subscribeToLogs, saveLog, getUserSettings, subscribeToUserSettings } from './supabase';
import type { LogEntry as DBLogEntry } from './supabase';
import './index.css';

// We need to map DBLogEntry to UILogEntry (handle Date)
const mapLog = (dbLog: DBLogEntry): UILogEntry => ({
  id: dbLog.id,
  type: dbLog.type,
  message: dbLog.message,
  timestamp: dbLog.timestamp || (dbLog.created_at ? new Date(dbLog.created_at) : new Date())
});

function App() {
  const [logs, setLogs] = useState<UILogEntry[]>([]);
  const [stats, setStats] = useState<BotStats>({
    status: 'ACTIVE',
    symbol: 'BTC',
    trades: 0,
    balance: 0,
    lastSignal: '',
    strategyMode: 'LONG'
  });

  // Initial Data Load
  useEffect(() => {
    async function init() {
      const history = await getLogs(50);
      setLogs(history.map(mapLog).reverse());

      // Initial settings
      const settings = await getUserSettings();
      if (settings.strategy_mode) {
        setStats(prev => ({ ...prev, strategyMode: settings.strategy_mode }));
      }
    }
    init();
  }, []);

  // Real-time Logs Subscription
  useEffect(() => {
    const unsubscribe = subscribeToLogs((dbLog) => {
      setLogs(prev => {
        // Avoid duplicates
        if (prev.some(l => l.id === dbLog.id)) return prev;
        return [...prev, mapLog(dbLog)];
      });
    });
    return () => unsubscribe();
  }, []);

  // Settings Subscription
  useEffect(() => {
    const unsubscribe = subscribeToUserSettings((settings) => {
      if (settings.strategy_mode) {
        setStats(prev => ({ ...prev, strategyMode: settings.strategy_mode }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();

    // Save input to log
    saveLog('info', `> ${command}`);

    // Local clear logic
    if (cmd === 'clear') {
      setLogs([]);
    }
  };

  return <Terminal logs={logs} stats={stats} onCommand={handleCommand} />;
}

export default App;
