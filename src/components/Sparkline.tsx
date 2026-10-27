import React from 'react';
import { SensorReading } from '../types';

interface SparklineProps {
  data: SensorReading[];
  color?: string;
  unit: string;
  height?: number;
  minThreshold?: number;
  maxThreshold?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#06b6d4',
  unit,
  height = 42,
  minThreshold,
  maxThreshold,
}) => {
  if (!data || data.length === 0) {
    return <div className="h-10 flex items-center justify-center text-[10px] text-slate-500 font-mono">No data</div>;
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = 140;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  const points = data
    .map((d, index) => {
      const x = (index / (data.length - 1)) * width;
      const normalized = (d.value - minVal) / range;
      const y = height - paddingY - normalized * usableHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const currentVal = data[data.length - 1]?.value;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Trend (24h)</span>
        <span className="text-slate-300">
          Min {minVal.toFixed(2)} - Max {maxVal.toFixed(2)} {unit}
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Fill under sparkline */}
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#grad-${color.replace('#', '')})`}
        />

        {/* The line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Latest reading pulse dot */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={height - paddingY - ((currentVal - minVal) / range) * usableHeight}
            r="3"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};
