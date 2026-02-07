
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, Eye, GripVertical, Maximize2, Minimize2, Pin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HalvingCountdownProps {
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

const HALVING_INTERVAL = 210000;
const AVG_BLOCK_TIME_SECONDS = 600; // 10 minutes

const CountdownItem = ({ value, label }: { value: number, label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl md:text-3xl font-bold font-code tracking-tighter">{String(value).padStart(2, '0')}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default function HalvingCountdown({ onHide, onExpand, isExpanded, height, dragListeners, onMove, isFirst, isLast, isPinned, onPin, isResizable, onResizeStart, isMobile }: HalvingCountdownProps) {
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [nextHalvingBlock, setNextHalvingBlock] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const response = await fetch('https://mempool.space/api/blocks/tip/height');
        if (!response.ok) throw new Error('Network response was not ok');
        const heightText = await response.text();
        const height = parseInt(heightText, 10);
        
        const nextHalving = (Math.floor(height / HALVING_INTERVAL) + 1) * HALVING_INTERVAL;
        const blocksRemaining = nextHalving - height;
        const time = blocksRemaining * AVG_BLOCK_TIME_SECONDS;

        setCurrentBlock(height);
        setNextHalvingBlock(nextHalving);
        setTimeRemaining(time);

      } catch (error) {
        console.error("Failed to fetch block height:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockHeight();
    const fetchInterval = setInterval(fetchBlockHeight, 30000); // Fetch every 30 seconds

    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (timeRemaining === null) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining !== null]);

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return { days, hours, minutes, seconds };
  };

  const { days, hours, minutes, seconds } = formatTime(timeRemaining);

  return (
    <Card 
        className={cn("relative flex flex-col", isPinned && "border-accent ring-2 ring-accent/30")}
        style={{ height: height ? `${height}px` : undefined }}
    >
      <CardHeader className="flex-row items-center justify-between p-4 pb-2 space-y-0">
        <CardTitle className="text-base font-headline">Bitcoin Halving Countdown</CardTitle>
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
      <CardContent className="flex flex-col justify-center flex-1 p-4 pt-0">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
                <Skeleton className="w-3/4 h-8" />
                <Skeleton className="w-1/2 h-4" />
            </div>
        ) : (
          <div className='flex flex-col h-full justify-between'>
            <div className="grid grid-cols-4 gap-2 text-center text-primary-foreground">
                <CountdownItem value={days} label="Days" />
                <CountdownItem value={hours} label="Hours" />
                <CountdownItem value={minutes} label="Minutes" />
                <CountdownItem value={seconds} label="Seconds" />
            </div>
             <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                    <div className="font-bold text-primary-foreground">{currentBlock?.toLocaleString() ?? '...'}</div>
                    <div className="text-muted-foreground">Current Block</div>
                </div>
                <div>
                    <div className="font-bold text-primary-foreground">{nextHalvingBlock?.toLocaleString() ?? '...'}</div>
                    <div className="text-muted-foreground">Next Halving</div>
                </div>
                 <div>
                    <div className="font-bold text-primary-foreground">{(nextHalvingBlock && currentBlock) ? (nextHalvingBlock - currentBlock).toLocaleString() : '...'}</div>
                    <div className="text-muted-foreground">Blocks Left</div>
                </div>
            </div>
          </div>
        )}
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
