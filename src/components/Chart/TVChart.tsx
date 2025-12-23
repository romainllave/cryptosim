import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { CandleData } from '../../utils/chartData';
import type { LineData } from '../../utils/indicators';
import { ChartOverlay } from './ChartOverlay';

interface TVChartProps {
    data: CandleData[];
    indicators?: {
        sma?: LineData[];
    };
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    isFullScreen?: boolean;
    selectedTool?: string;
    onDrawingComplete?: () => void;
}

export const TVChart: React.FC<TVChartProps> = ({
    data,
    indicators,
    colors = {},
    isFullScreen,
    selectedTool = 'cursor',
    onDrawingComplete = () => { }
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
    const smaSeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        try {
            console.log("TVChart: Creating chart");
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: colors.backgroundColor || 'white' },
                    textColor: colors.textColor || 'black',
                },
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
                grid: {
                    vertLines: { color: colors.lineColor ? 'rgba(42, 46, 57, 0.5)' : '#f0f3fa' },
                    horzLines: { color: colors.lineColor ? 'rgba(42, 46, 57, 0.5)' : '#f0f3fa' },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // Candlestick Series
            const newSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#089981',
                downColor: '#f23645',
                borderVisible: false,
                wickUpColor: '#089981',
                wickDownColor: '#f23645',
            });

            if (data && data.length > 0) {
                newSeries.setData(data.map(d => ({ ...d, time: d.time as Time })));
            }

            // SMA Series
            const smaSeries = chart.addSeries(LineSeries, {
                color: '#2962FF',
                lineWidth: 2,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            if (indicators?.sma) {
                smaSeries.setData(indicators.sma.map(d => ({ ...d, time: d.time as Time })));
            }

            chartRef.current = chart as IChartApi;
            seriesRef.current = newSeries;
            smaSeriesRef.current = smaSeries;

            // Use ResizeObserver for more robust resizing (handles sidebar toggles)
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    chart.applyOptions({ width, height });
                }
            });

            resizeObserver.observe(chartContainerRef.current);

            return () => {
                resizeObserver.disconnect();
                chart.remove();
            };
        } catch (e) {
            console.error("TVChart Crash:", e);
        }
    }, []);

    // Effect for Color/Theme Updates
    useEffect(() => {
        if (!chartRef.current || !colors) return;

        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: colors.backgroundColor || 'white' },
                textColor: colors.textColor || 'black',
            },
            grid: {
                vertLines: { color: colors.lineColor ? 'rgba(42, 46, 57, 0.5)' : '#f0f3fa' },
                horzLines: { color: colors.lineColor ? 'rgba(42, 46, 57, 0.5)' : '#f0f3fa' },
            }
        });

        if (seriesRef.current) {
            seriesRef.current.applyOptions({
                upColor: '#089981',
                downColor: '#f23645',
                wickUpColor: '#089981',
                wickDownColor: '#f23645',
            });
        }
    }, [colors]);

    // Effect for Data Updates
    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            try {
                seriesRef.current.setData(data.map(d => ({ ...d, time: d.time as Time })));
            } catch (e) {
                console.error("TVChart Update Crash:", e);
            }
        }
    }, [data]);

    // Effect for Indicators (SMA) Updates
    useEffect(() => {
        if (smaSeriesRef.current) {
            if (indicators?.sma && indicators.sma.length > 0) {
                smaSeriesRef.current.setData(indicators.sma.map(d => ({ ...d, time: d.time as Time })));
            } else {
                smaSeriesRef.current.setData([]);
            }
        }
    }, [indicators]);

    // Effect for FullScreen (Refit Chart)
    useEffect(() => {
        if (!chartRef.current) return;

        // Delay to allow CSS transition to finish (300ms in App.tsx)
        const timer = setTimeout(() => {
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        }, 350); // Matches synchronized 300ms transition + small buffer

        return () => clearTimeout(timer);
    }, [isFullScreen]);

    return (
        <div ref={chartContainerRef} className="w-full h-full relative">
            <ChartOverlay
                chart={chartRef.current}
                series={seriesRef.current}
                currentTool={selectedTool}
                onDrawingComplete={onDrawingComplete}
            />
        </div>
    );
};
