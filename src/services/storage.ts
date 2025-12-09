import type { Transaction } from '../types';

const BALANCE_KEY = 'cryptosim_balance';
const TRANSACTIONS_KEY = 'cryptosim_transactions';

const DEFAULT_BALANCE = 100000;

export const loadBalance = (): number => {
    try {
        const stored = localStorage.getItem(BALANCE_KEY);
        if (stored === null) return DEFAULT_BALANCE;
        return parseFloat(stored);
    } catch (e) {
        console.error("Failed to load balance", e);
        return DEFAULT_BALANCE;
    }
};

export const saveBalance = (balance: number): void => {
    try {
        localStorage.setItem(BALANCE_KEY, balance.toString());
    } catch (e) {
        console.error("Failed to save balance", e);
    }
};

export const loadTransactions = (): Transaction[] => {
    try {
        const stored = localStorage.getItem(TRANSACTIONS_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        // Revive dates if necessary (JSON.parse leaves them as strings)
        return parsed.map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp)
        }));
    } catch (e) {
        console.error("Failed to load transactions", e);
        return [];
    }
};

export const saveTransactions = (transactions: Transaction[]): void => {
    try {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (e) {
        console.error("Failed to save transactions", e);
    }
};

export const clearData = (): void => {
    localStorage.removeItem(BALANCE_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
};
