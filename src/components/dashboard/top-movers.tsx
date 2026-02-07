'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Eye, GripVertical, Maximize2, Minimize2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


interface Mover {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  priceChangePercent: string;
  lastPrice: string;
  quoteVolume: string;
}

interface TopMoversProps {
  onSymbolChange: (symbol: string) => void;
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

const STABLECOINS = ['USDC', 'TUSD', 'BUSD', 'DAI', 'USDP', 'GUSD', 'PAX', 'FDUSD'];
const QUOTE_ASSETS = ['USDT'];

const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    return num.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' });
}

export default function TopMovers({ onSymbolChange, onHide, onExpand, isExpanded, height, dragListeners, onMove, isFirst, isLast, isPinned, onPin, isResizable, onResizeStart, isMobile }: TopMoversProps) {
  const [movers, setMovers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchTopMovers() {
      try {
        setLoading(true);
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', { signal });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Top Movers API did not return an array:", data);
            if (!signal.aborted) {
              setMovers([]);
            }
            return;
        }
        
        const topMovers = data
          .filter((d: any) => {
              const quoteAsset = QUOTE_ASSETS.find(qa => d.symbol.endsWith(qa));
              if (!quoteAsset) return false;
              
              const baseAsset = d.symbol.substring(0, d.symbol.length - quoteAsset.length);

              return !d.symbol.includes('_') && 
                d.quoteVolume && parseFloat(d.quoteVolume) > 1000000 &&
                !STABLECOINS.includes(baseAsset);
          })
          .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 100)
          .map((d: any) => {
            const quoteAsset = QUOTE_ASSETS.find(qa => d.symbol.endsWith(qa))!;
            const baseAsset = d.symbol.substring(0, d.symbol.length - quoteAsset.length);
            return {
                symbol: d.symbol,
                baseAsset: baseAsset,
                quoteAsset: quoteAsset,
                priceChangePercent: d.priceChangePercent,
                lastPrice: d.lastPrice,
                quoteVolume: d.quoteVolume,
            };
          });
        
        if (!signal.aborted) {
          setMovers(topMovers);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Failed to fetch top movers:", error);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTopMovers();

    return () => {
      controller.abort();
    };
  }, []);

  const handleRowClick = (symbol: string) => {
    const quoteAsset = QUOTE_ASSETS.find(qa => symbol.endsWith(qa));
    if (!quoteAsset) return;
    const baseAsset = symbol.substring(0, symbol.length - quoteAsset.length);
    const formattedSymbol = `${baseAsset.toLowerCase()}-${quoteAsset.toLowerCase()}`;
    onSymbolChange(formattedSymbol);
  };

  return (
    <Card 
        className={cn("relative flex flex-col", isPinned && "border-accent ring-2 ring-accent/30")}
        style={{ height: height ? `${height}px` : undefined }}
    >
      <CardHeader className="flex-row items-center justify-between p-4 space-y-0">
        <CardTitle className="text-base font-headline">Top 100 by Volume</CardTitle>
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
      <CardContent className="flex-1 p-0 min-h-0">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="px-2">#</TableHead>
                <TableHead className="px-2">Name</TableHead>
                <TableHead className="text-right px-2">Price <span className="hidden md:inline">(USD)</span></TableHead>
                <TableHead className="text-right px-2">Change <span className="hidden md:inline">(24h)</span></TableHead>
                <TableHead className="text-right px-2">Volume <span className="hidden md:inline">(24h)</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-2 py-2"><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                    <TableCell className="px-2 py-2"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="px-2 py-2"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="px-2 py-2"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="px-2 py-2"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                movers.map((mover, index) => {
                  const priceChange = parseFloat(mover.priceChangePercent);
                  return (
                    <TableRow key={mover.symbol} onClick={() => handleRowClick(mover.symbol)} className="cursor-pointer">
                      <TableCell className="text-muted-foreground px-2 py-2">{index + 1}</TableCell>
                      <TableCell className="font-medium px-2 py-2">
                        <div className="flex items-center gap-1">
                           <Avatar className="w-5 h-5">
                             <AvatarImage 
                               src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${mover.baseAsset.toLowerCase()}.png`}
                               alt={`${mover.baseAsset} icon`}
                             />
                             <AvatarFallback className="text-xs bg-muted/20">
                               {mover.baseAsset.charAt(0)}
                             </AvatarFallback>
                           </Avatar>
                          <span className="text-primary-foreground">{mover.baseAsset}/{mover.quoteAsset}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-code px-2 py-2 text-primary-foreground">{formatNumber(parseFloat(mover.lastPrice), {minimumFractionDigits: 2, maximumFractionDigits: 4})}</TableCell>
                      <TableCell className={cn("text-right font-code px-2 py-2", priceChange >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {priceChange.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-code px-2 py-2 text-primary-foreground">${formatNumber(parseFloat(mover.quoteVolume), { notation: 'compact', compactDisplay: 'short' })}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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
