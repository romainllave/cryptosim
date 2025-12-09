import { useState, useEffect } from 'react';
import { CryptoList } from './components/Sidebar/CryptoList';
import { TVChart } from './components/Chart/TVChart';
import { TransactionHistory } from './components/History/TransactionHistory';
import { TradePanel } from './components/Trading/TradePanel';
import type { Crypto, Transaction } from './types';
import { MOCK_CRYPTOS } from './types';
import type { CandleData } from './utils/chartData';
import { Activity, Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchKlines, subscribeToTickers, subscribeToKline } from './services/binance';
import { loadBalance, saveBalance, loadTransactions, saveTransactions } from './services/storage';
import { calculateSMA } from './utils/indicators';
import { useMemo } from 'react';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [cryptos, setCryptos] = useState<Crypto[]>(MOCK_CRYPTOS); // Start with mock, update with real
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [balance, setBalance] = useState<number>(() => loadBalance());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showSMA, setShowSMA] = useState<boolean>(false);

  const smaData = useMemo(() => {
    if (!showSMA) return [];
    return calculateSMA(candleData, 20);
  }, [candleData, showSMA]);

  const selectedCrypto = cryptos.find(c => c.symbol === selectedSymbol) || cryptos[0];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Persist Balance
  useEffect(() => {
    saveBalance(balance);
  }, [balance]);

  // Persist Transactions
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Fetch Historical Data & Subscribe to specific symbol Kline
  useEffect(() => {
    // 1. Fetch History
    fetchKlines(selectedSymbol).then(data => {
      setCandleData(data);
    });

    // 2. Subscribe to Real-time Candle updates
    const unsubscribeKline = subscribeToKline(selectedSymbol, '1m', (candle) => {
      setCandleData(prev => {
        if (prev.length === 0) return [candle];
        const last = prev[prev.length - 1];
        // If same time, update last candle. If new time, push new candle.
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
  }, [selectedSymbol]);

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
  }, []); // Run once on mount (or when crypto list structure changes)

  const handleTrade = (type: 'BUY' | 'SELL', amount: number) => {
    const price = selectedCrypto.price;
    const total = amount * price;

    if (type === 'BUY') {
      if (total > balance) {
        alert("Insufficient funds!");
        return;
      }
      setBalance(b => b - total);
    } else {
      setBalance(b => b + total);
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      symbol: selectedSymbol,
      amount,
      price,
      total,
      timestamp: new Date()
    };

    setTransactions(prev => [newTx, ...prev]);
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

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden bg-gray-100 p-2 gap-2 dark:bg-[#131722]">
        {/* Left Sidebar */}
        <div className="w-64 flex-none bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39]">
          <CryptoList
            cryptos={cryptos}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
        </div>

        {/* Center Area */}
        <div className="flex-1 flex flex-col min-w-0 gap-2">
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
            </div>
            <TVChart
              data={candleData}
              indicators={showSMA ? { sma: smaData } : undefined}
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
          <div className="h-1/3 min-h-[200px] bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39]">
            <TransactionHistory transactions={transactions} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-72 flex-none bg-white rounded-xl border border-border overflow-hidden shadow-sm dark:bg-[#1e222d] dark:border-[#2a2e39]">
          <TradePanel
            crypto={selectedCrypto}
            balance={balance}
            onTrade={handleTrade}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
