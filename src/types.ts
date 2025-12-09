export interface Crypto {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
}

export interface Transaction {
    id: string;
    type: 'BUY' | 'SELL';
    symbol: string;
    amount: number;
    price: number;
    total: number;
    timestamp: Date;
}

export const MOCK_CRYPTOS: Crypto[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: 98432.10, change24h: 2.5 },
    { symbol: 'ETH', name: 'Ethereum', price: 3854.21, change24h: -1.2 },
    { symbol: 'SOL', name: 'Solana', price: 145.67, change24h: 5.8 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.32, change24h: 12.4 },
    { symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: -0.5 },
    { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: 1.1 },
];
