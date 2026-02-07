'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { format } from 'date-fns';
import { Area, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Line } from "recharts";
import { ArrowUp, ArrowDown, Eye, GripVertical, Maximize2, Minimize2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip as UiTooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ChartDataPoint = { 
    time: number; 
    delta: number;
};

interface CumulativeDeltaChartProps {
  chartData: ChartDataPoint[];
  onHide: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  fiveMinuteAverage?: number | null;
  height?: number;
  dragListeners?: any;
  onMove: (direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  isPinned: boolean;
  onPin: () => void;
  isResizable?: boolean;
  onResizeStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  isMobile?: boolean;
}

const chartConfig = {
  delta: {
    label: "Cumulative Delta",
    color: "hsl(var(--accent))",
  },
  deltaNegative: {
    label: "Cumulative Delta (Negative)",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

const CustomDeltaTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const color = value >= 0 ? 'var(--color-delta)' : 'var(--color-deltaNegative)';
    return (
      <div className="p-2 text-xs rounded-md bg-card/80 backdrop-blur-sm border border-border">
        <p className="font-bold">{format(new Date(data.time * 1000), "PPpp")}</p>
        <div className="grid grid-cols-2 gap-x-2">
          <span>Cumulative Delta:</span><span className="font-mono text-right" style={{color: color}}>{value ? value.toFixed(2) : 'N/A'}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CumulativeDeltaChart({ chartData, onHide, onExpand, isExpanded, fiveMinuteAverage, height, dragListeners, onMove, isFirst, isLast, isPinned, onPin, isResizable, onResizeStart, isMobile }: CumulativeDeltaChartProps) {
    
    const getYAxisDomain = (data: ChartDataPoint[]): [string | number, string | number] => {
        if (!data || data.length === 0) return [-1, 1];
        
        const deltas = data.map(d => d.delta).filter(d => d !== null && d !== undefined) as number[];
        if (deltas.length === 0) return [-1, 1];

        let min = Math.min(...deltas);
        let max = Math.max(...deltas);

        if (min === max) {
            return [min - 1, max + 1];
        }

        const padding = (max - min) * 0.2; // Increased padding to 20%
        let finalMin = min - padding;
        let finalMax = max + padding;

        // Ensure a minimum range if values are small and close to zero
        if ((finalMax - finalMin < 2) && (Math.abs(finalMin) < 1 && Math.abs(finalMax) < 1)) {
            return [-1, 1];
        }
        
        return [finalMin, finalMax];
    };
    
    const domain = getYAxisDomain(chartData);
    const yMin = Number(domain[0]);
    const yMax = Number(domain[1]);

    let zeroPercentOffset = '100%';
    if (yMax <= 0 && yMin < yMax) {
        zeroPercentOffset = '0%';
    } else if (yMin < 0 && yMax > 0) {
        const range = yMax - yMin;
        if (range > 0) {
            zeroPercentOffset = `${(yMax / range) * 100}%`;
        }
    }

    const timeTickFormatter = (value: number) => {
        if (!value) return '';
        // The Cumulative Delta chart displays a stream of recent trades,
        // so a more granular time format is always appropriate regardless of the main chart's timeframe.
        return format(new Date(value * 1000), 'HH:mm:ss');
    };
    
    const deltaTickFormatter = (value: number) => {
        if (value === 0) return '0.00';
        if (Math.abs(value) >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(2)}M`;
        }
        if (Math.abs(value) >= 1_000) {
            return `${(value / 1_000).toFixed(2)}k`;
        }
        return value.toFixed(2);
    }

    return (
        <Card 
            className={cn("relative flex flex-col", isPinned && "border-accent ring-2 ring-accent/30")}
            style={{ height: height ? `${height}px` : undefined }}
        >
            <CardHeader className="flex-row items-center justify-between p-4 pb-0 space-y-0">
                <div className="flex items-baseline gap-4">
                    <CardTitle className="text-base font-headline">Cumulative Delta</CardTitle>
                    {fiveMinuteAverage !== null && fiveMinuteAverage !== undefined && (
                        <div
                          className={cn(
                            "text-sm font-code",
                            fiveMinuteAverage >= 0 ? "text-accent" : "text-destructive"
                          )}
                          title={`5-minute average: ${fiveMinuteAverage.toFixed(2)}`}
                        >
                            5m Avg: {deltaTickFormatter(fiveMinuteAverage)}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        {(isMobile || isExpanded) && (
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onPin}>
                                        {isPinned ? <Pin className="w-4 h-4 text-accent" fill="currentColor" /> : <Pin className="w-4 h-4 text-muted-foreground" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{isPinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                            </UiTooltip>
                        )}
                        {!isPinned && (
                            <>
                                {!isMobile && dragListeners && (
                                    <UiTooltip>
                                        <TooltipTrigger asChild>
                                            <button {...dragListeners} className="cursor-grab p-1 rounded-md hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2">
                                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Drag to reorder</p></TooltipContent>
                                    </UiTooltip>
                                )}
                                <UiTooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onMove('up')} disabled={isFirst}>
                                            <ArrowUp className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Move Up</p></TooltipContent>
                                </UiTooltip>
                                <UiTooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onMove('down')} disabled={isLast}>
                                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Move Down</p></TooltipContent>
                                </UiTooltip>
                                {!isMobile && (
                                    <UiTooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onExpand}>
                                                {isExpanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isExpanded ? 'Collapse' : 'Expand'}</p>
                                        </TooltipContent>
                                    </UiTooltip>
                                )}
                                <UiTooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onHide}>
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Hide Widget</p>
                                    </TooltipContent>
                                </UiTooltip>
                            </>
                        )}
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="p-0 pt-2 flex-1 min-h-0">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="strokeDelta" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={zeroPercentOffset} stopColor="var(--color-delta)" stopOpacity={1}/>
                                <stop offset={zeroPercentOffset} stopColor="var(--color-deltaNegative)" stopOpacity={1}/>
                            </linearGradient>
                            <linearGradient id="fillDelta" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={zeroPercentOffset} stopColor="var(--color-delta)" stopOpacity={0.4} />
                                <stop offset={zeroPercentOffset} stopColor="var(--color-deltaNegative)" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="fillDeltaNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={zeroPercentOffset} stopColor="var(--color-delta)" stopOpacity={0.05} />
                                <stop offset={zeroPercentOffset} stopColor="var(--color-deltaNegative)" stopOpacity={0.4} />
                            </linearGradient>
                            <clipPath id="clipPositive">
                                <rect x="0" y="0" width="100%" height={zeroPercentOffset} />
                            </clipPath>
                             <clipPath id="clipNegative">
                                 <rect x="0" y={zeroPercentOffset} width="100%" height={(yMin / (yMin - yMax)) * 100 + '%'} />
                            </clipPath>
                        </defs>
                        <XAxis
                            dataKey="time"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={timeTickFormatter}
                            fontSize={12}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            dataKey="delta"
                            domain={domain}
                            tickFormatter={deltaTickFormatter}
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            width={50}
                            tickCount={7}
                        />
                        <Tooltip
                            cursor={{ stroke: 'hsl(var(--border))' }}
                            content={<CustomDeltaTooltip />}
                        />
                        <ReferenceLine y={0} yAxisId="right" stroke="hsl(var(--chart-3))" strokeDasharray="3 3" />
                        <Area
                            yAxisId="right"
                            dataKey="delta"
                            type="monotone"
                            stroke="none"
                            fill="url(#fillDelta)"
                            clipPath="url(#clipPositive)"
                            connectNulls
                        />
                        <Area
                            yAxisId="right"
                            dataKey="delta"
                            type="monotone"
                            stroke="none"
                            fill="url(#fillDeltaNegative)"
                            clipPath="url(#clipNegative)"
                            connectNulls
                        />
                        <Line
                            yAxisId="right"
                            dataKey="delta"
                            type="monotone"
                            stroke="url(#strokeDelta)"
                            strokeWidth={2}
                            dot={false}
                            name="Cumulative Delta"
                            connectNulls
                        />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            {isResizable && (
                <div
                    onMouseDown={onResizeStart}
                    onTouchStart={onResizeStart}
                    className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-20 flex items-center justify-center group"
                >
                    <div className="w-10 h-1.5 rounded-full bg-border group-hover:bg-accent transition-colors" />
                </div>
            )}
        </Card>
    )
}
