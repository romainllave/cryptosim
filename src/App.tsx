import { useState, useEffect, useMemo } from 'react';
import { CryptoList } from './components/Sidebar/CryptoList';
import { TVChart } from './components/Chart/TVChart';
import { TransactionHistory } from './components/History/TransactionHistory';
import { TradePanel } from './components/Trading/TradePanel';
import { BotPanel } from './components/Bot/BotPanel';
import { HoldingsPage } from './components/Holdings/HoldingsPage';
import type { Crypto, Transaction } from './types';
import { MOCK_CRYPTOS } from './types';
import type { CandleData } from './utils/chartData';
import { Activity, Moon, Sun, Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchKlines, subscribeToTickers, subscribeToKline } from './services/binance';
// import { loadBalance, saveBalance, loadTransactions, saveTransactions } from './services/storage'; // Deprecated
import { calculateSMA } from './utils/indicators';
import type { BotState, BotConfig, Position } from './bot/botTypes';
import {
  sendBotCommand,
  saveTrade,
  updateBalance,
  subscribeToTrades,
  subscribeToBotStatus,
  getUserSettings,
  updateUserSettings,
  getTrades,
  getBalance,
  subscribeToBalance,
  subscribeToPositions
} from './services/supabase';
import type { BotTrade } from './services/supabase';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [cryptos, setCryptos] = useState<Crypto[]>(MOCK_CRYPTOS);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(10000); // Default, will verify with DB
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showSMA, setShowSMA] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<'1m' | '15m'>('1m');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [view, setView] = useState<'trading' | 'holdings'>('trading');

  // Bot state (Synced with Supabase)
  const [botState, setBotState] = useState<BotState>({
    status: 'IDLE',
    lastAnalysis: [],
    lastSignal: 'HOLD',
    tradesCount: 0,
    profitLoss: 0,
    lastTradeTime: null,
    currentPosition: null
  });

  const [botConfig, setBotConfig] = useState<BotConfig>({
    tradeAmount: 0.001,
    symbol: 'BTC',
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

  const smaData = useMemo(() => {
    if (!showSMA) return [];
    return calculateSMA(candleData, 20);
  }, [candleData, showSMA]);

  const selectedCrypto = cryptos.find(c => c.symbol === selectedSymbol) || cryptos[0];

  // Initialization: Load Settings, Balance, and History from Supabase
  useEffect(() => {
    async function initData() {
      // 1. Settings (Theme, Symbol)
      const settings = await getUserSettings();
      setIsDarkMode(settings.theme === 'dark');
      if (settings.last_symbol) {
        setSelectedSymbol(settings.last_symbol);
        setBotConfig(prev => ({ ...prev, symbol: settings.last_symbol }));
      }

      // 2. Balance
      const dbBalance = await getBalance();
      setBalance(dbBalance);

      // 3. Transactions History
      const dbTrades = await getTrades(100);
      const mappedTransactions: Transaction[] = dbTrades.map(t => ({
        id: `db-${t.id || Math.random()}`,
        type: t.type,
        symbol: t.symbol,
        amount: t.amount,
        price: t.price,
        total: t.total,
        timestamp: new Date(t.created_at || Date.now())
      }));
      setTransactions(mappedTransactions);

      // 4. Calculate Holdings
      const initialHoldings: Record<string, number> = {};
      mappedTransactions.forEach(tx => {
        const symbol = tx.symbol;
        if (!initialHoldings[symbol]) initialHoldings[symbol] = 0;
        if (tx.type === 'BUY') {
          initialHoldings[symbol] += tx.amount;
        } else {
          initialHoldings[symbol] -= tx.amount;
        }
      });
      setHoldings(initialHoldings);
    }

    initData();
  }, []);

  // Sync Theme changes to DB
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      updateUserSettings({ theme: 'dark' });
    } else {
      document.documentElement.classList.remove('dark');
      updateUserSettings({ theme: 'light' });
    }
  }, [isDarkMode]);

  // Sync Symbol changes to DB
  useEffect(() => {
    updateUserSettings({ last_symbol: selectedSymbol });
  }, [selectedSymbol]);

  // Subscribe to Bot Status from Supabase
  useEffect(() => {
    const unsubscribe = subscribeToBotStatus((data) => {
      setBotState(prev => ({
        ...prev,
        status: data.status,
      }));
      if (data.status === 'RUNNING' && data.symbol) {
        setBotConfig(prev => ({ ...prev, symbol: data.symbol, enabled: true }));
      } else {
        setBotConfig(prev => ({ ...prev, enabled: false }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Balance from Supabase (Real-time)
  useEffect(() => {
    const unsubscribe = subscribeToBalance((newBalance) => {
      setBalance(newBalance);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Positions from Supabase (Real-time)
  useEffect(() => {
    const unsubscribe = subscribeToPositions((dbPos) => {
      if (dbPos) {
        const position: Position = {
          ...dbPos,
          entryTime: new Date(dbPos.entryTime)
        };
        setBotState(prev => ({
          ...prev,
          currentPosition: position,
          status: 'RUNNING'
        }));
        setBotConfig(prev => ({ ...prev, enabled: true }));
      } else {
        setBotState(prev => ({
          ...prev,
          currentPosition: null
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to bot trades from Supabase (real-time)
  useEffect(() => {
    const unsubscribe = subscribeToTrades((trade: BotTrade) => {
      const newTx: Transaction = {
        id: `bot-${trade.id || Date.now()}`,
        type: trade.type,
        symbol: trade.symbol,
        amount: trade.amount,
        price: trade.price,
        total: trade.total,
        timestamp: new Date(trade.created_at || Date.now())
      };

      setTransactions(prev => {
        if (prev.some(tx => tx.id === newTx.id)) return prev;
        return [newTx, ...prev];
      });

      setBotState(prev => ({
        ...prev,
        tradesCount: prev.tradesCount + 1,
        lastTradeTime: newTx.timestamp,
      }));

      // Update holdings
      setHoldings(prev => {
        const current = prev[newTx.symbol] || 0;
        return {
          ...prev,
          [newTx.symbol]: newTx.type === 'BUY' ? current + newTx.amount : current - newTx.amount
        };
      });
    });

    return () => unsubscribe();
  }, []);

  // Fetch Historical Data & Subscribe to specific symbol Kline
  useEffect(() => {
    const limit = timeframe === '15m' ? 1500 : 200;

    fetchKlines(selectedSymbol, timeframe, limit).then(data => {
      setCandleData(data);
    });

    const unsubscribeKline = subscribeToKline(selectedSymbol, timeframe, (candle) => {
      setCandleData(prev => {
        if (prev.length === 0) return [candle];
        const last = prev[prev.length - 1];
        if (last.time === candle.time) {
          return [...prev.slice(0, -1), candle];
        } else {
          return [...prev, candle];
        }
      });
    });

    return () => {
      unsubscribeKline();
    };
  }, [selectedSymbol, timeframe]);

  // Subscribe to Global Tickers for the sidebar list
  useEffect(() => {
    const symbols = cryptos.map(c => c.symbol);
    const unsubscribeTickers = subscribeToTickers(symbols, (data) => {
      setCryptos(prev => prev.map(c => {
        const update = data[c.symbol];
        if (update) {
          return {
            ...c,
            price: update.price,
            change24h: update.change
          };
        }
        return c;
      }));
    });

    return () => {
      unsubscribeTickers();
    }
  }, []);

  const handleTrade = (type: 'BUY' | 'SELL', amount: number, reason?: string) => {
    const price = selectedCrypto.price;
    const total = amount * price;

    if (type === 'BUY') {
      if (total > balance) {
        if (!reason) alert("Insufficient funds!");
        return;
      }
      setBalance(b => {
        const newBalance = b - total;
        updateBalance(newBalance).catch(console.error);
        return newBalance;
      });
    } else {
      const currentOwned = holdings[selectedSymbol] || 0;
      if (amount > currentOwned) {
        if (!reason) alert("Insufficient crypto holdings!");
        return;
      }
      setBalance(b => {
        const newBalance = b + total;
        updateBalance(newBalance).catch(console.error);
        return newBalance;
      });
    }

    // Update local holdings immediately
    setHoldings(prev => {
      const current = prev[selectedSymbol] || 0;
      return {
        ...prev,
        [selectedSymbol]: type === 'BUY' ? current + amount : current - amount
      };
    });

    const newTx: Transaction = {
      id: Date.now().toString() + (reason ? '-bot' : ''),
      type,
      symbol: selectedSymbol,
      amount,
      price,
      total,
      timestamp: new Date()
    };

    setTransactions(prev => [newTx, ...prev]);

    saveTrade({
      type,
      symbol: selectedSymbol,
      amount,
      price,
      total,
      reason: reason || 'Manual trade'
    }).catch(console.error);
  };

  const handleBotStart = () => {
    setBotState(prev => ({ ...prev, status: 'RUNNING' }));
    sendBotCommand('start', selectedSymbol).catch(console.error);
  };

  const handleBotStop = () => {
    setBotState(prev => ({ ...prev, status: 'IDLE' }));
    sendBotCommand('stop', selectedSymbol).catch(console.error);
  };

  const handleBotTradeAmountChange = (amount: number) => {
    setBotConfig(prev => ({ ...prev, tradeAmount: amount }));
  };

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden font-sans dark:bg-[#131722] dark:text-[#d1d4dc]">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-white shrink-0 dark:bg-[#1e222d] dark:border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1 rounded">
            <Activity size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">CryptoSim</h1>
          <button
            onClick={() => setView('holdings')}
            className={clsx(
              "ml-4 px-4 py-1.5 rounded-full text-sm font-bold transition-all",
              view === 'holdings'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-[#2a2e39] text-text-primary dark:text-[#d1d4dc] hover:bg-gray-200 dark:hover:bg-[#363a45]"
            )}
          >
            Saison
          </button>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="flex gap-4">
            {['BTC', 'ETH', 'SOL'].map(s => {
              const c = cryptos.find(c => c.symbol === s);
              return (
                <span key={s} className="font-medium text-text-secondary cursor-pointer hover:text-text-primary dark:text-[#787b86] dark:hover:text-[#d1d4dc]">
                  {s} <span className={clsx(
                    (c?.change24h ?? 0) >= 0 ? "text-up" : "text-down"
                  )}>
                    {c?.change24h?.toFixed(2)}%
                  </span>
                </span>
              )
            })}
          </div>
          <div className="font-medium">
            Balance: <span className="font-bold text-blue-600">{balance.toFixed(2)} USDT</span>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-text-secondary">
            RL
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {view === 'holdings' ? (
        <HoldingsPage
          holdings={holdings}
          cryptos={cryptos}
          onBack={() => setView('trading')}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden bg-gray-100 p-2 gap-2 dark:bg-[#131722] relative">
          {/* Left Sidebar */}
          <div className={clsx(
            "w-64 flex-none bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39] transition-all duration-500 ease-in-out",
            isFullScreen ? "-ml-72 opacity-0" : "ml-0 opacity-100"
          )}>
            <CryptoList
              cryptos={cryptos}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
            />
          </div>

          {/* Center Area */}
          <div className="flex-1 flex flex-col min-w-0 gap-2 transition-all duration-500 ease-in-out">
            {/* Chart Section */}
            <div className="flex-1 relative border border-border bg-white rounded-xl overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39]">
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="font-bold text-xl">{selectedSymbol}USDT</span>
                <span className="text-sm text-text-secondary mt-1 dark:text-[#787b86]">CryptoSim Pro</span>
                <button
                  onClick={() => setShowSMA(!showSMA)}
                  className={clsx(
                    "ml-4 px-2 py-1 text-xs font-semibold rounded transition-colors",
                    showSMA
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-gray-100 text-text-secondary dark:bg-[#2a2e39] dark:text-[#787b86]"
                  )}
                >
                  SMA 20
                </button>

                <div className="flex bg-gray-100 rounded p-0.5 ml-2 dark:bg-[#2a2e39]">
                  <button
                    onClick={() => setTimeframe('1m')}
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded transition-all",
                      timeframe === '1m'
                        ? "bg-white text-blue-600 shadow-sm dark:bg-[#1e222d] dark:text-blue-400"
                        : "text-text-secondary hover:text-text-primary dark:text-[#787b86] dark:hover:text-[#d1d4dc]"
                    )}
                  >
                    1m
                  </button>
                  <button
                    onClick={() => setTimeframe('15m')}
                    className={clsx(
                      "px-2 py-1 text-xs font-semibold rounded transition-all",
                      timeframe === '15m'
                        ? "bg-white text-blue-600 shadow-sm dark:bg-[#1e222d] dark:text-blue-400"
                        : "text-text-secondary hover:text-text-primary dark:text-[#787b86] dark:hover:text-[#d1d4dc]"
                    )}
                  >
                    15m
                  </button>
                </div>

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary dark:hover:bg-[#2a2e39] dark:text-[#787b86] transition-colors"
                  title={isFullScreen ? "Sortir du plein écran" : "Plein écran"}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
              <TVChart
                data={candleData}
                indicators={showSMA ? { sma: smaData } : undefined}
                isFullScreen={isFullScreen}
                colors={{
                  backgroundColor: isDarkMode ? '#1e222d' : 'white',
                  textColor: isDarkMode ? '#d1d4dc' : 'black',
                  lineColor: isDarkMode ? '#2962ff' : undefined,
                  areaTopColor: isDarkMode ? 'rgba(41, 98, 255, 0.3)' : undefined,
                  areaBottomColor: isDarkMode ? 'rgba(41, 98, 255, 0)' : undefined,
                }}
              />
            </div>

            {/* History Section */}
            <div className={clsx(
              "bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39] transition-all duration-500 ease-in-out overflow-y-hidden",
              isFullScreen ? "h-0 opacity-0 mt-0" : "h-1/3 min-h-[200px] opacity-100 mt-0"
            )}>
              <TransactionHistory transactions={transactions} />
            </div>
          </div>

          {/* Right Panel */}
          <div className={clsx(
            "w-72 flex-none bg-white rounded-xl border border-border flex flex-col transition-all duration-500 ease-in-out overflow-y-auto custom-scrollbar dark:bg-[#1e222d] dark:border-[#2a2e39] shadow-sm",
            isFullScreen ? "-mr-80 opacity-0" : "mr-0 opacity-100"
          )}>
            <TradePanel
              crypto={selectedCrypto}
              balance={balance}
              ownedAmount={holdings[selectedSymbol] || 0}
              onTrade={handleTrade}
            />
            <BotPanel
              botState={botState}
              botConfig={botConfig}
              onStart={handleBotStart}
              onStop={handleBotStop}
              onTradeAmountChange={handleBotTradeAmountChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
