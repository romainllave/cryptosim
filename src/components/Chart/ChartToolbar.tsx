import React from 'react';
import {
    MousePointer2,
    Move,
    Minus,
    TrendingUp,
    Type,
    Frame,
    Eraser,
    Spline,
    Ruler,
    Circle,
    Slash
} from 'lucide-react';
import { clsx } from 'clsx';

interface ChartToolbarProps {
    selectedTool: string;
    onSelectTool: (tool: string) => void;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({ selectedTool, onSelectTool }) => {
    const tools = [
        { id: 'cursor', icon: MousePointer2, label: 'Curseur' },
        { id: 'crosshair', icon: Move, label: 'Réticule' },
        { separator: true },
        { id: 'trendline', icon: TrendingUp, label: 'Ligne de Tendance' },
        { id: 'horzline', icon: Minus, label: 'Ligne Horizontale' },
        { id: 'ray', icon: Slash, label: 'Rayon' },
        { separator: true },
        { id: 'fib', icon: Spline, label: 'Fibonacci' },
        { id: 'text', icon: Type, label: 'Texte' },
        { id: 'rect', icon: Frame, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Cercle' },
        { id: 'measure', icon: Ruler, label: 'Mesurer' },
        { separator: true },
        { id: 'clear', icon: Eraser, label: 'Tout Effacer', danger: true },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#1e222d] border border-border dark:border-[#2a2e39] rounded-lg shadow-sm">
            {tools.map((tool, index) => {
                if (tool.separator) {
                    return <div key={`sep-${index}`} className="w-px h-6 bg-gray-200 dark:bg-[#2a2e39] mx-1" />;
                }

                const Icon = tool.icon as React.ElementType;
                const isSelected = selectedTool === tool.id;

                return (
                    <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id!)}
                        className={clsx(
                            "p-2 rounded-md transition-all duration-200 relative group",
                            isSelected
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                : tool.danger
                                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    : "text-text-secondary hover:bg-gray-100 dark:text-[#787b86] dark:hover:bg-[#2a2e39] hover:text-text-primary dark:hover:text-[#d1d4dc]"
                        )}
                        title={tool.label}
                    >
                        <Icon size={18} />
                    </button>
                );
            })}
        </div>
    );
};
