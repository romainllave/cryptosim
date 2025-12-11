import { useState, useEffect } from 'react';
import { Terminal } from './Terminal';
import type { LogEntry as UILogEntry, BotStats } from './types';
import { getLogs, subscribeToLogs, saveLog } from './supabase';
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
  const [stats] = useState<BotStats>({
    status: 'ACTIVE', // Default to active since we are just viewing
    symbol: 'BTC',
    trades: 0,
    balance: 0,
    lastSignal: '',
  });

  // Initial Data Load
  useEffect(() => {
    async function init() {
      const history = await getLogs(50);
      // Reverse because history comes newest first, but terminal wants oldest first (or handles it)
      // Terminal usually appends. If we setLogs, we want [oldest, ..., newest]
      setLogs(history.map(mapLog).reverse());
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
