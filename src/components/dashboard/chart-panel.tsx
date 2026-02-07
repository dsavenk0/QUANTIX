
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { LayoutDashboard, PanelLeft, PanelLeftOpen, PanelRightOpen, PanelRightClose } from 'lucide-react';
import SymbolSearch from './symbol-search';
import React from 'react';
import { availableExchanges } from '@/lib/exchanges';
import TradingViewWidget from './tradingview-widget';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type WidgetVisibility = {
    topMovers: boolean;
    orderBook: boolean;
    marketSentiment: boolean;
    cumulativeDelta: boolean;
    halvingCountdown: boolean;
};

interface ChartPanelProps {
  exchange: string;
  onExchangeChange: (exchange: string) => void;
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  allSymbols: string[];
  widgetVisibility: WidgetVisibility;
  onWidgetVisibilityChange: (widget: keyof WidgetVisibility, visible: boolean) => void;
  isDrawingToolbarVisible: boolean;
  onIsDrawingToolbarVisibleChange: (visible: boolean) => void;
  isTvDetailsVisible: boolean;
  onIsTvDetailsVisibleChange: (visible: boolean) => void;
}

const timeframes = ['1m', '5m', '30m', '1h', '4h', '1d'];

const widgets = [
    { id: 'topMovers', label: 'Top Movers' },
    { id: 'orderBook', label: 'Order Book' },
    { id: 'marketSentiment', label: 'Market Sentiment' },
    { id: 'cumulativeDelta', label: 'Cumulative Delta' },
    { id: 'halvingCountdown', label: 'BTC Halving Countdown' },
] as const;


function ChartPanel({ 
  exchange, onExchangeChange,
  symbol, onSymbolChange, 
  timeframe, onTimeframeChange, 
  allSymbols,
  widgetVisibility,
  onWidgetVisibilityChange,
  isDrawingToolbarVisible,
  onIsDrawingToolbarVisibleChange,
  isTvDetailsVisible,
  onIsTvDetailsVisibleChange,
}: ChartPanelProps) {

  return (
     <div className="flex flex-col h-full min-h-[650px] gap-4">
        <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center w-full gap-1 p-2 border-b sm:gap-2">
            <Select value={exchange} onValueChange={onExchangeChange}>
                <SelectTrigger className="h-8 px-2 text-xs border-0 w-auto focus:ring-0 gap-2 capitalize font-bold">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {availableExchanges.map(ex => (
                        <SelectItem key={ex} value={ex} className="capitalize">
                        {ex}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <SymbolSearch symbols={allSymbols} value={symbol} onChange={onSymbolChange} />
            
            <div className="flex-grow" />

            <div className="items-center hidden gap-1 md:flex">
                {timeframes.map(t => (
                <Button key={t} variant={timeframe === t ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => onTimeframeChange(t)}>
                    {t.toUpperCase()}
                </Button>
                ))}
            </div>
            <Select onValueChange={onTimeframeChange} value={timeframe}>
                <SelectTrigger className="w-auto h-8 px-2 text-xs border-0 md:hidden focus:ring-0 font-bold">
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {timeframes.map(t => (
                    <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                    <LayoutDashboard className="w-4 h-4 sm:mr-1" />
                    <span className="hidden text-xs sm:inline">Widgets</span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuLabel>Show/Hide Widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {widgets.map(widget => (
                    <DropdownMenuCheckboxItem
                    key={widget.id}
                    checked={widgetVisibility[widget.id as keyof WidgetVisibility]}
                    onCheckedChange={(checked) => onWidgetVisibilityChange(widget.id as keyof WidgetVisibility, !!checked)}
                    >
                    {widget.label}
                    </DropdownMenuCheckboxItem>
                ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="relative flex-1 min-h-0">
            {symbol === 'N/A' ? (
                 <Skeleton className="w-full h-full min-h-[580px]" />
            ) : (
                <TradingViewWidget 
                    symbol={symbol}
                    exchange={exchange}
                    timeframe={timeframe}
                    isToolbarVisible={isDrawingToolbarVisible}
                    isDetailsVisible={isTvDetailsVisible}
                />
            )}
        </div>
        {symbol !== 'N/A' && (
            <CardFooter className="justify-between p-1 border-t h-9">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onIsDrawingToolbarVisibleChange(!isDrawingToolbarVisible)}>
                                {isDrawingToolbarVisible ? <PanelLeft className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                                <span className="sr-only">Toggle Drawing Toolbar</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>{isDrawingToolbarVisible ? 'Hide Drawing Toolbar' : 'Show Drawing Toolbar'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onIsTvDetailsVisibleChange(!isTvDetailsVisible)}>
                                {isTvDetailsVisible ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                                <span className="sr-only">Toggle Details Panel</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>{isTvDetailsVisible ? 'Hide Details Panel' : 'Show Details Panel'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardFooter>
        )}
        </Card>
    </div>
  );
}

export default React.memo(ChartPanel);
