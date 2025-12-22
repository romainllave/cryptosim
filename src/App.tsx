import { useState, useEffect, useMemo, useRef } from 'react';
import { CryptoList } from './components/Sidebar/CryptoList';
import { TVChart } from './components/Chart/TVChart';
import { TransactionHistory } from './components/History/TransactionHistory';
import logo from './assets/logo.svg';
import { TradePanel } from './components/Trading/TradePanel';
import { BotPanel } from './components/Bot/BotPanel';
import { HoldingsPage } from './components/Holdings/HoldingsPage';
import { SettingsDropdown } from './components/Settings/SettingsDropdown';
import { StrategyPage } from './components/Strategy/StrategyPage';
import { ChartToolbar } from './components/Chart/ChartToolbar';
import type { Crypto, Transaction } from './types';
import { MOCK_CRYPTOS } from './types';
import type { CandleData } from './utils/chartData';
import { Moon, Sun, Maximize2, Minimize2, Settings, Menu, X } from 'lucide-react';
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
  subscribeToPositions,
  getHoldings,
  saveHoldings,
  subscribeToHoldings
} from './services/supabase';
import type { BotTrade } from './services/supabase';

import { SplashScreen } from './components/Splash/SplashScreen';
import { TitleBar } from './components/TitleBar';

function App() {
  const [showSplash, setShowSplash] = useState(true);
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
  const [view, setView] = useState<'trading' | 'holdings' | 'strategy'>('trading');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [strategyMode, setStrategyMode] = useState<'LONG' | 'SHORT'>('LONG');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>('cursor');
  const settingsRef = useRef<HTMLDivElement>(null);

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
      if (settings.strategy_mode) {
        setStrategyMode(settings.strategy_mode);
      }
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

      // 4. Load Holdings from Supabase
      const dbHoldings = await getHoldings();
      setHoldings(dbHoldings);
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

  // Close settings on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Subscribe to Holdings from Supabase (Real-time)
  useEffect(() => {
    const unsubscribe = subscribeToHoldings((newHoldings) => {
      setHoldings(newHoldings);
    });
    return () => unsubscribe();
  }, []);

  // Save holdings to Supabase when they change
  const holdingsRef = useRef(holdings);
  useEffect(() => {
    // Skip initial empty state
    if (Object.keys(holdings).length > 0 && holdings !== holdingsRef.current) {
      holdingsRef.current = holdings;
      saveHoldings(holdings);
    }
  }, [holdings]);


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

  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden font-sans dark:bg-[#131722] dark:text-[#d1d4dc] relative rounded-xl">
      <TitleBar isDarkMode={isDarkMode} />
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-transparent shrink-0 dark:border-[#2a2e39]">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg overflow-hidden border border-white/10">
            <img src={logo} alt="Logo" className="w-8 h-8 object-cover" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">CryptoSim <span className="text-blue-500">PRO</span></h1>
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

        <div className="flex items-center gap-2 sm:gap-6 text-sm">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="hidden lg:flex gap-4">
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
          <div className="hidden sm:block font-medium">
            Balance: <span className="font-bold text-blue-600">{balance.toFixed(2)} USDT</span>
          </div>
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors relative"
            >
              <Settings size={20} className={clsx("transition-transform duration-300", isSettingsOpen && "rotate-90")} />
            </button>
            <SettingsDropdown
              isOpen={isSettingsOpen}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              balance={balance}
              onNavigate={(newView) => {
                setView(newView);
                setIsSettingsOpen(false);
              }}
            />
          </div>
          <div className="w-8 h-8 bg-blue-600 rounded-full hidden sm:flex items-center justify-center text-xs font-bold text-white">
            RL
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 xl:hidden rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2e39] transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {view === 'holdings' ? (
        <HoldingsPage
          holdings={holdings}
          cryptos={cryptos}
          onBack={() => setView('trading')}
        />
      ) : view === 'strategy' ? (
        <StrategyPage
          currentMode={strategyMode}
          onBack={() => setView('trading')}
          onSave={(mode) => {
            setStrategyMode(mode);
            updateUserSettings({ strategy_mode: mode });
            setView('trading');
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-visible md:overflow-hidden bg-gray-100 p-2 gap-2 dark:bg-[#131722] relative transition-all duration-500 ease-in-out">
          {/* Overlay for mobile menu */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 xl:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Left Sidebar */}
          <div className={clsx(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-all duration-500 ease-in-out xl:relative xl:translate-x-0 xl:z-auto xl:flex xl:w-1/6 xl:min-w-[240px] xl:max-w-[300px] xl:flex-none xl:rounded-xl xl:border xl:shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39] overflow-hidden",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
            isFullScreen && "xl:!w-0 xl:!min-w-0 xl:!max-w-0 xl:opacity-0 xl:pointer-events-none xl:!border-0"
          )}>
            <div className="flex flex-col h-full w-full">
              <div className="p-4 border-b border-border flex justify-between items-center xl:hidden">
                <span className="font-bold">Marchés</span>
                <button onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
              </div>
              <CryptoList
                cryptos={cryptos}
                selectedSymbol={selectedSymbol}
                onSelect={(s) => {
                  setSelectedSymbol(s);
                  setIsMobileMenuOpen(false);
                }}
              />
            </div>
          </div>

          {/* Center Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-2 transition-all duration-500 ease-in-out">
            {/* Chart Section */}
            <div className="flex-none h-[400px] md:flex-1 relative border border-border bg-white rounded-xl overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39]">
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
                  className="hidden sm:block ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary dark:hover:bg-[#2a2e39] dark:text-[#787b86] transition-colors"
                  title={isFullScreen ? "Sortir du plein écran" : "Plein écran"}
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button
                  onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                  className="md:hidden ml-auto p-1.5 rounded-lg bg-blue-600 text-white shadow-lg"
                >
                  <img src={logo} alt="Bot" className="w-[18px] h-[18px] object-contain invert" />
                </button>
              </div>
              <TVChart
                data={candleData}
                indicators={showSMA ? { sma: smaData } : undefined}
                isFullScreen={isFullScreen}
                selectedTool={isFullScreen ? selectedTool : 'cursor'}
                onDrawingComplete={() => setSelectedTool('cursor')}
                colors={{
                  backgroundColor: isDarkMode ? '#1e222d' : 'white',
                  textColor: isDarkMode ? '#d1d4dc' : 'black',
                  lineColor: isDarkMode ? '#2962ff' : undefined,
                  areaTopColor: isDarkMode ? 'rgba(41, 98, 255, 0.3)' : undefined,
                  areaBottomColor: isDarkMode ? 'rgba(41, 98, 255, 0)' : undefined,
                }}
              />

              {/* Analysis Toolbar (Only in Full Screen) */}
              <div className={clsx(
                "absolute top-16 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300",
                isFullScreen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
              )}>
                <ChartToolbar
                  selectedTool={selectedTool}
                  onSelectTool={setSelectedTool}
                />
              </div>
            </div>

            {/* History Section */}
            <div className={clsx(
              "bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39] transition-all duration-500 ease-in-out",
              isFullScreen ? "h-0 min-h-0 md:h-0 md:min-h-0 opacity-0 mt-0 p-0 border-0 flex-0" : "flex-none h-[300px] md:h-1/3 md:min-h-[200px] opacity-100 mt-0"
            )}>
              <TransactionHistory transactions={transactions} />
            </div>
          </div>

          {/* Right Panel */}
          <div className={clsx(
            "fixed inset-y-0 right-0 z-50 w-72 bg-white border-l border-border transform transition-all duration-500 ease-in-out md:relative md:translate-x-0 md:z-auto md:flex md:w-1/4 md:min-w-[280px] md:max-w-[400px] md:flex-none md:rounded-xl md:border md:shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39] overflow-hidden",
            isRightPanelOpen ? "translate-x-0" : "translate-x-full",
            isFullScreen && "md:!w-0 md:!min-w-0 md:!max-w-0 md:opacity-0 md:pointer-events-none md:!border-0"
          )}>
            <div className="flex flex-col h-full w-full overflow-y-auto custom-scrollbar">
              <div className="p-4 border-b border-border flex justify-between items-center md:hidden">
                <span className="font-bold">Trading & Bot</span>
                <button onClick={() => setIsRightPanelOpen(false)}><X size={20} /></button>
              </div>
              <TradePanel
                crypto={selectedCrypto}
                balance={balance}
                ownedAmount={holdings[selectedSymbol] || 0}
                onTrade={(type, amount) => {
                  handleTrade(type, amount);
                  if (window.innerWidth < 768) setIsRightPanelOpen(false);
                }}
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
        </div>
      )}
    </div>
  );
}

export default App;
