import type { CandleData } from './chartData';

export interface LineData {
    time: string; // or number, matching lightweight-charts Time
    value: number;
}

export const calculateSMA = (data: CandleData[], period: number): LineData[] => {
    if (data.length < period) return [];

    const result: LineData[] = [];

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
        const avg = sum / period;

        result.push({
            time: data[i].time as string, // Cast to string assuming CandleData time is string
            value: avg
        });
    }

    return result;
};
