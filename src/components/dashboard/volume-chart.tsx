'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { format } from 'date-fns';
import { Bar, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip as UiTooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


type OHLCV = { time: number; open: number; high: number; low: number; close: number; value: number };

interface VolumeChartProps {
  chartData: (OHLCV & { [key: string]: number | null | undefined })[];
  timeframe: string;
  onHide: () => void;
}

const chartConfig = {
  volume: {
    label: "Volume",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const CustomVolumeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 text-xs rounded-md bg-card/80 backdrop-blur-sm border border-border">
        <p className="font-bold">{format(new Date(data.time * 1000), "PPpp")}</p>
        <div className="grid grid-cols-2 gap-x-2">
          <span>Volume:</span><span className="font-mono text-right">{data.value ? (data.value / 1000000).toFixed(2) + 'M' : 'N/A'}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function VolumeChart({ chartData, timeframe, onHide }: VolumeChartProps) {
    
    const getYAxisDomain = (data: any[]): [number, number] => {
        if (!data || data.length === 0) return [0, 0];
        const max = Math.max(...data.map(d => d.value || 0));
        return [0, max * 1.5]; // Give some padding at the top
    };

    const timeTickFormatter = (value: number) => {
        if (!value) return '';
        switch (timeframe) {
            case '1m':
            case '5m':
            case '1h':
                return format(new Date(value * 1000), 'HH:mm');
            case '4h':
            case '1d':
                return format(new Date(value * 1000), 'MMM d');
            default:
                return format(new Date(value * 1000), 'HH:mm');
        }
    };

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between p-4 pb-0 space-y-0">
                <CardTitle className="text-base font-headline">Volume</CardTitle>
                 <TooltipProvider>
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
                </TooltipProvider>
            </CardHeader>
            <CardContent className="p-0 pt-2">
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} syncId="tradingChart" margin={{ top: 0, right: 30, left: 0, bottom: 20 }}>
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
                            dataKey="value"
                            domain={getYAxisDomain(chartData)}
                            tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                        />
                        <Tooltip
                            cursor={{ stroke: 'hsl(var(--border))' }}
                            content={<CustomVolumeTooltip />}
                        />
                        <Bar dataKey="value" yAxisId="right" name="Volume" opacity={0.6}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} />
                            ))}
                        </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
