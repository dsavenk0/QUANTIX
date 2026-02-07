'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown, Eye, GripVertical, Maximize2, Minimize2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrderBookData = {
  bids: [number, number][];
  asks: [number, number][];
};

interface MarketSentimentProps {
  data: OrderBookData;
  onHide: () => void;
  onExpand: () => void;
  isExpanded: boolean;
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

const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' });
}

export default function MarketSentiment({ data, onHide, onExpand, isExpanded, height, dragListeners, onMove, isFirst, isLast, isPinned, onPin, isResizable, onResizeStart, isMobile }: MarketSentimentProps) {
  const [history, setHistory] = useState<{ time: number; bidPercentage: number }[]>([]);

  const { bidTotal, askTotal, bidPercentage } = useMemo(() => {
    const bidTotal = (data.bids || []).reduce((acc, [price, size]) => acc + (price * size), 0);
    const askTotal = (data.asks || []).reduce((acc, [price, size]) => acc + (price * size), 0);
    const total = bidTotal + askTotal;

    if (total === 0) {
      return { bidTotal: 0, askTotal: 0, bidPercentage: 50 };
    }

    const bidPercentage = (bidTotal / total) * 100;
    
    return { bidTotal, askTotal, bidPercentage };
  }, [data]);

  useEffect(() => {
    const now = Date.now();
    setHistory(prev => {
        const newEntry = { time: now, bidPercentage: bidPercentage };
        const updatedHistory = [...prev, newEntry];
        // Keep only last 5 minutes of data
        return updatedHistory.filter(item => now - item.time < 300000);
    });
  }, [bidPercentage]);

  const fiveMinuteAverageBidPercentage = useMemo(() => {
      if (history.length < 5) return bidPercentage; // Use current value until enough history is gathered
      const sum = history.reduce((acc, item) => acc + item.bidPercentage, 0);
      return sum / history.length;
  }, [history, bidPercentage]);

  const avgBidPercentage = fiveMinuteAverageBidPercentage;
  const avgAskPercentage = 100 - avgBidPercentage;


  return (
    <Card 
        className={cn("relative flex flex-col", isPinned && "border-accent ring-2 ring-accent/30")}
        style={{ height: height ? `${height}px` : undefined }}
    >
      <CardHeader className="flex-row items-center justify-between p-4 space-y-0">
        <CardTitle className="text-base font-headline">Market Sentiment</CardTitle>
        <div className="flex items-center gap-1">
            <TooltipProvider>
                {(isMobile || isExpanded) && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onPin}>
                                {isPinned ? <Pin className="w-4 h-4 text-accent" fill="currentColor" /> : <Pin className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isPinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                    </Tooltip>
                )}
                {!isPinned && (
                    <>
                        {!isMobile && dragListeners && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button {...dragListeners} className="cursor-grab p-1 rounded-md hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2">
                                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><p>Drag to reorder</p></TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onMove('up')} disabled={isFirst}>
                                    <ArrowUp className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Move Up</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => onMove('down')} disabled={isLast}>
                                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Move Down</p></TooltipContent>
                        </Tooltip>
                        {!isMobile && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onExpand}>
                                        {isExpanded ? <Minimize2 className="w-4 h-4 text-muted-foreground" /> : <Maximize2 className="w-4 h-4 text-muted-foreground" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isExpanded ? 'Collapse' : 'Expand'}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onHide}>
                                    <Eye className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Hide Widget</p>
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-between flex-1 p-4 pt-2">
        <div className="flex justify-end md:justify-between text-xs text-muted-foreground">
          <span className="hidden md:inline">Ratio of total bid vs. ask value in the order book.</span>
          <span className="font-code">5m Avg</span>
        </div>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <div className="w-full bg-destructive/20 rounded-full h-3 flex overflow-hidden">
                            <div
                                className="bg-accent/80 h-full"
                                style={{ width: `${avgBidPercentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-sm font-bold">
                            <span className="text-accent">{avgBidPercentage.toFixed(1)}%</span>
                            <span className="text-destructive">{avgAskPercentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Bids: {avgBidPercentage.toFixed(2)}%</p>
                    <p>Asks: {avgAskPercentage.toFixed(2)}%</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <div className="flex justify-between text-xs font-code">
            <div className="text-accent">
                <span className="text-muted-foreground">Bids: </span>
                ${formatNumber(bidTotal)}
            </div>
            <div className="text-destructive text-right">
                 <span className="text-muted-foreground">Asks: </span>
                ${formatNumber(askTotal)}
            </div>
        </div>
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
  );
}
