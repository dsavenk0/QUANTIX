'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Indicator, OHLCV } from "@/lib/exchanges/common";
import { format } from 'date-fns';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, useCallback } from 'react';


type IndicatorData = { [key: string]: (number | null)[] };

interface PriceChartProps {
  data: OHLCV[];
  indicatorData: IndicatorData;
  activeIndicators: Indicator[];
  timeframe: string;
  activeTool: string;
  clearDrawingCounter: number;
  onPan: (delta: number) => void;
  drawingColor: string;
}

type LineData = {
    points: {x: number, y: number}[];
    tool: 'Brush' | 'Trend Line';
    color: string;
}

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--accent))",
  },
  'sma-20': { label: 'SMA 20', color: 'hsl(var(--chart-2))' },
  'sma-50': { label: 'SMA 50', color: 'hsl(var(--chart-3))' },
  'sma-100': { label: 'SMA 100', color: 'hsl(var(--chart-4))' },
  'ema-20': { label: 'EMA 20', color: 'hsl(var(--chart-5))' },
  'ema-50': { label: 'EMA 50', color: 'hsl(var(--primary))' },
  'ema-100': { label: 'EMA 100', color: 'hsl(43, 90%, 55%)' },
  'rsi-14': { label: 'RSI 14', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

function ChartHeaderInfo({ data }: { data: OHLCV[] }) {
  const latestData = data.length > 0 ? data[data.length - 1] : null;
  if (!latestData) return null;

  const ohlc = [
    { label: 'O', value: latestData.open, color: latestData.open >= latestData.close ? 'text-accent' : 'text-destructive' },
    { label: 'H', value: latestData.high, color: 'text-accent' },
    { label: 'L', value: latestData.low, color: 'text-destructive' },
    { label: 'C', value: latestData.close, color: latestData.close >= latestData.open ? 'text-accent' : 'text-destructive' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {ohlc.map(item => (
        <div key={item.label} className="flex items-center gap-1">
          <span>{item.label}</span>
          <span className={cn('font-medium text-foreground', item.color)}>{item.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

const Candlestick = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;
    
    if (open == null || close == null || high == null || low == null || isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) {
        return null;
    }

    const isRising = close >= open;

    const fill = isRising ? 'hsl(var(--accent))' : 'hsl(var(--destructive))';
    const stroke = isRising ? 'hsl(var(--accent))' : 'hsl(var(--destructive))';
    
    const range = high - low;
    if (range === 0) {
        return <line x1={x} y1={y} x2={x + width} y2={y} stroke={stroke} strokeWidth={1}/>;
    }

    const bodyHeight = (Math.abs(open - close) / range) * height;
    const bodyY = isRising ? y + ((high - close) / range) * height : y + ((high - open) / range) * height;

    return (
        <g>
            <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={stroke} strokeWidth={1}/>
            <rect x={x} y={bodyY} width={width} height={Math.max(1, bodyHeight)} fill={fill} stroke={stroke} strokeWidth={0.5}/>
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 text-xs rounded-md bg-card/80 backdrop-blur-sm border border-border">
        <p className="font-bold">{format(new Date(data.time * 1000), "PPpp")}</p>
        <div className="grid grid-cols-2 gap-x-2">
          <span>Open:</span><span className="font-mono text-right">{data.open?.toFixed(2)}</span>
          <span>High:</span><span className="font-mono text-right">{data.high?.toFixed(2)}</span>
          <span>Low:</span><span className="font-mono text-right">{data.low?.toFixed(2)}</span>
          <span>Close:</span><span className="font-mono text-right">{data.close?.toFixed(2)}</span>
          <span>Volume:</span><span className="font-mono text-right">{(data.value / 1000000).toFixed(2)}M</span>
        </div>
         {payload.map((p, i) => {
            if (typeof p.dataKey !== 'string') return null;
            const isIndicator = ['sma-', 'ema-', 'rsi-'].some(prefix => p.dataKey.startsWith(prefix));
            return isIndicator && p.value ? (
              <div key={i} className="grid grid-cols-2 gap-x-2">
                  <span style={{color: p.color}}>{p.name}:</span>
                  <span className="font-mono text-right">{Number(p.value).toFixed(2)}</span>
              </div>
            ) : null
         })}
      </div>
    );
  }
  return null;
};

export default function PriceChart({ data, indicatorData, activeIndicators, timeframe, activeTool, clearDrawingCounter, onPan, drawingColor }: PriceChartProps) {
  const chartData = data.map((d, i) => {
    const indicators: any = {};
    for (const key in indicatorData) {
      indicators[key] = indicatorData[key][i];
    }
    return {...d, ...indicators};
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<LineData[]>([]);
  const [currentLine, setCurrentLine] = useState<LineData | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartPosRef = useRef<{ x: number } | null>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const allLines = currentLine ? [...lines, currentLine] : lines;
    if (allLines.length === 0) return;
    
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    allLines.forEach(line => {
      if (line.points.length < 2) return;
      ctx.strokeStyle = line.color;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });
  }, [lines, currentLine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        redrawCanvas();
      }
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    }
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [lines, currentLine, redrawCanvas]);


  useEffect(() => {
    if (clearDrawingCounter > 0) {
      setLines([]);
      setCurrentLine(null);
    }
  }, [clearDrawingCounter]);

  const getMousePos = (e: React.MouseEvent): {x: number, y: number} | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'Cursor') {
        setIsPanning(true);
        panStartPosRef.current = { x: e.clientX };
    } else if (activeTool === 'Brush' || activeTool === 'Trend Line') {
        const pos = getMousePos(e);
        if (!pos) return;
        setIsDrawing(true);
        setCurrentLine({ 
            points: [pos, pos], 
            tool: activeTool as 'Brush' | 'Trend Line',
            color: drawingColor,
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        if (!panStartPosRef.current) return;
        const chartWidth = chartContainerRef.current?.clientWidth;
        if (!chartWidth || data.length === 0) return;

        const dx = e.clientX - panStartPosRef.current.x;
        const pointsPerPixel = data.length / chartWidth;
        const dataDelta = Math.round(dx * pointsPerPixel);
        
        if (Math.abs(dataDelta) !== 0) {
            onPan(dataDelta);
            panStartPosRef.current = { x: e.clientX };
        }
        return;
    }
    
    if (isDrawing) {
        const pos = getMousePos(e);
        if (!pos) return;

        setCurrentLine(prev => {
            if (!prev) return null;
            if (prev.tool === 'Brush') {
                return { ...prev, points: [...prev.points, pos] };
            } else { // Trend Line
                return { ...prev, points: [prev.points[0], pos] };
            }
        });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
    }
    
    if (isDrawing) {
        setIsDrawing(false);
        if (currentLine && currentLine.points.length > 1 && (currentLine.points[0].x !== currentLine.points[1].x || currentLine.points[0].y !== currentLine.points[1].y)) {
            setLines(prev => [...prev, currentLine]);
        }
        setCurrentLine(null);
    }
  };

  const getPriceYAxisDomain = (data: any[]): [number | string, number | string] => {
     if (!data || data.length === 0) {
      return ['auto', 'auto'];
    }
    const lows = data.map(d => d.low).filter(v => v !== null && v !== undefined);
    const highs = data.map(d => d.high).filter(v => v !== null && v !== undefined);
     if (lows.length === 0 || highs.length === 0) return ['auto', 'auto'];
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }

  const timeTickFormatter = (value: number) => {
    if (!value) return '';
    switch (timeframe) {
        case '1m':
        case '5m':
            return format(new Date(value * 1000), 'HH:mm');
        case '1h':
        case '4h':
        case '1d':
            return format(new Date(value * 1000), 'MMM d');
        default:
            return format(new Date(value * 1000), 'HH:mm');
    }
  };

  const movingAverageIndicators = activeIndicators.filter(i => i.name === 'SMA' || i.name === 'EMA');
  const rsiIndicator = activeIndicators.find(i => i.name === 'RSI');
  
  const priceChartHeight = rsiIndicator ? "70%" : "100%";
  const rsiChartHeight = rsiIndicator ? "30%" : "0%";
  const isDrawingToolActive = activeTool === 'Brush' || activeTool === 'Trend Line';

  return (
    <div 
        ref={chartContainerRef} 
        className="h-full w-full relative"
    >
        <ChartContainer config={chartConfig} className="h-full w-full bg-transparent flex flex-col">
            <div className="p-4 pb-0">
                <ChartHeaderInfo data={data} />
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height={priceChartHeight}>
                    <ComposedChart data={chartData} syncId="tradingChart" margin={{ top: 10, right: 30, left: 0, bottom: rsiIndicator ? 0 : 20 }}>
                    <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={rsiIndicator ? () => '' : timeTickFormatter}
                        fontSize={12}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="right"
                        dataKey="close"
                        domain={getPriceYAxisDomain(chartData)}
                        tickFormatter={(value) => `${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                    />
                    <Tooltip
                        cursor={{ stroke: 'hsl(var(--border))' }}
                        content={<CustomTooltip />}
                    />
                    <Bar
                        dataKey={(d) => [d.low, d.high]}
                        shape={<Candlestick />}
                        yAxisId="left"
                        name="Price"
                    />
                    {movingAverageIndicators.map(indicator => (
                        <Line 
                            key={indicator.id}
                            yAxisId="left"
                            type="monotone" 
                            dataKey={indicator.id} 
                            stroke={chartConfig[indicator.id as keyof typeof chartConfig]?.color}
                            strokeWidth={2}
                            dot={false}
                            name={`${indicator.name} ${indicator.period}`}
                        />
                    ))}
                    </ComposedChart>
                </ResponsiveContainer>
                {rsiIndicator && (
                    <ResponsiveContainer width="100%" height={rsiChartHeight}>
                        <ComposedChart data={chartData} syncId="tradingChart" margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                            <XAxis
                                dataKey="time"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={timeTickFormatter}
                                fontSize={12}
                            />
                            <YAxis
                                yAxisId="rsi"
                                orientation="right"
                                domain={[0, 100]}
                                tickCount={3}
                                axisLine={false}
                                tickLine={false}
                                fontSize={12}
                            />
                            <Tooltip
                                cursor={{ stroke: 'hsl(var(--border))' }}
                                content={<CustomTooltip />}
                            />
                            <ReferenceLine y={70} yAxisId="rsi" stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                            <ReferenceLine y={30} yAxisId="rsi" stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                            <Line 
                                yAxisId="rsi"
                                type="monotone" 
                                dataKey={rsiIndicator.id}
                                stroke={chartConfig[rsiIndicator.id as keyof typeof chartConfig]?.color}
                                strokeWidth={2}
                                dot={false}
                                name={`${rsiIndicator.name} ${rsiIndicator.period}`}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </ChartContainer>
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none z-10"
        />
        <div
            className={cn(
                "absolute top-0 left-0 w-full h-full z-20",
                isDrawingToolActive && "cursor-crosshair",
                activeTool === 'Cursor' && (isPanning ? 'cursor-grabbing' : 'cursor-grab')
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    </div>
  );
}
