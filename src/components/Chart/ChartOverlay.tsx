import React, { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface Drawing {
    id: string;
    type: 'horizontal' | 'trend' | 'ray';
    points: { time: Time, price: number }[];
    color: string;
}

interface ChartOverlayProps {
    chart: IChartApi | null;
    series: ISeriesApi<"Candlestick"> | null;
    currentTool: string;
    onDrawingComplete: () => void;
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({ chart, series, currentTool, onDrawingComplete }) => {
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [activeDrawing, setActiveDrawing] = useState<Drawing | null>(null);
    const overlayRef = useRef<SVGSVGElement>(null);
    const [, setTick] = useState(0); // For re-render loop

    // Convert Time/Price to Pixel Coordinates
    const coordinatesToPixels = (time: Time, price: number) => {
        if (!chart || !series) return null;
        const timeScale = chart.timeScale();
        const x = timeScale.timeToCoordinate(time);
        const y = series.priceToCoordinate(price);
        return { x, y };
    };

    // Convert Pixel Coordinates to Time/Price
    const pixelsToCoordinates = (x: number, y: number) => {
        if (!chart || !series) return null;
        const timeScale = chart.timeScale();
        const time = timeScale.coordinateToTime(x);
        const price = series.coordinateToPrice(y);
        return { time, price };
    };

    const handleMouseDown = (e: ReactMouseEvent) => {
        if (currentTool === 'cursor' || !chart || !series) return;

        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coords = pixelsToCoordinates(x, y);

        if (coords?.time && coords?.price) {
            if (currentTool === 'horzline') {
                const newDrawing: Drawing = {
                    id: Math.random().toString(36),
                    type: 'horizontal',
                    points: [{ time: coords.time, price: coords.price }],
                    color: '#2962FF'
                };
                setDrawings(prev => [...prev, newDrawing]);
                onDrawingComplete();
            } else if (currentTool === 'trendline') {
                setActiveDrawing({
                    id: Math.random().toString(36),
                    type: 'trend',
                    points: [{ time: coords.time, price: coords.price }, { time: coords.time, price: coords.price }],
                    color: '#2962FF'
                });
            }
        }
    };

    const handleMouseMove = (e: ReactMouseEvent) => {
        if (!activeDrawing || !chart || !series) return;

        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const coords = pixelsToCoordinates(x, y);

        if (coords?.time && coords?.price) {
            setActiveDrawing(prev => {
                if (!prev) return null;
                // Type safe update
                const newPoint = { time: coords.time as Time, price: coords.price as number };
                return {
                    ...prev,
                    points: [prev.points[0], newPoint]
                };
            });
        }
    };

    const handleMouseUp = () => {
        if (activeDrawing) {
            setDrawings(prev => [...prev, activeDrawing]);
            setActiveDrawing(null);
            onDrawingComplete();
        }
    };

    // Re-render triggering (Simple version: using rAF loop to sync with chart scroll)
    useEffect(() => {
        let frame: number;
        const loop = () => {
            setTick(t => t + 1);
            frame = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(frame);
    }, []);

    if (!chart || !series) return null;

    return (
        <svg
            ref={overlayRef}
            className={`absolute inset-0 z-10 w-full h-full ${currentTool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: currentTool !== 'cursor' ? 'crosshair' : 'default' }}
        >
            {[...drawings, activeDrawing].filter(Boolean).map(d => {
                if (!d) return null;

                if (d.type === 'horizontal') {
                    const coords = coordinatesToPixels(d.points[0].time, d.points[0].price);
                    if (!coords || coords.x === null || coords.y === null) return null;
                    return (
                        <line
                            key={d.id}
                            x1="0" y1={coords.y as number} x2="100%" y2={coords.y as number}
                            stroke={d.color} strokeWidth="2"
                        />
                    );
                }

                if (d.type === 'trend') {
                    const p1 = coordinatesToPixels(d.points[0].time, d.points[0].price);
                    const p2 = coordinatesToPixels(d.points[1].time, d.points[1].price);
                    if (!p1 || !p2 || p1.x === null || p2.x === null || p1.y === null || p2.y === null) return null;
                    return (
                        <line
                            key={d.id}
                            x1={p1.x as number} y1={p1.y as number} x2={p2.x as number} y2={p2.y as number}
                            stroke={d.color} strokeWidth="2"
                        />
                    );
                }
                return null;
            })}
        </svg>
    );
};
