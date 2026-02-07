'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ArrowUp, ArrowDown, Eye, GripVertical, Maximize2, Minimize2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type OrderBookData = {
  bids: [number, number][];
  asks: [number, number][];
};

interface OrderBookProps {
  data: OrderBookData;
  currentPrice: number;
  animatedOrders: number[];
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

const formatNumber = (num: number, options: Intl.NumberFormatOptions = {}) => num.toLocaleString('en-US', options);

const CompactOrderBookTable = ({ title, orders, type, maxTotal }: { title: string, orders: [number, number, number][]; type: 'bid' | 'ask'; maxTotal: number; }) => {
  const orderRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});
  const isMobile = useIsMobile();

  const backgroundStyle = (total: number) => {
    // Desktop compact: Bids from Right, Asks from Left
    // Mobile stacked: Both from Left
    const gradientDirection = isMobile ? 'right' : (type === 'bid' ? 'left' : 'right');
    const color = type === 'bid' ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--destructive) / 0.1)';
    const percentage = (total / maxTotal) * 100;
    return {
      background: `linear-gradient(to ${gradientDirection}, ${color} ${percentage}%, transparent ${percentage}%)`,
    };
  };

  const textAlignClass = isMobile ? 'text-right' : (type === 'bid' ? 'text-left' : 'text-right');
  const headerAlignClass = isMobile ? 'text-right' : (type === 'bid' ? 'text-left' : 'text-right');


  return (
    <div className="h-full flex flex-col">
      <h3 className={cn("text-sm font-semibold text-muted-foreground px-2 pt-1", headerAlignClass)}>{title}</h3>
      <div className="overflow-hidden flex-1">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className={cn("h-auto py-0.5 w-1/3 px-2", textAlignClass)}>Price</TableHead>
              <TableHead className={cn("h-auto py-0.5 w-1/3 px-2", textAlignClass)}>Quantity</TableHead>
              <TableHead className={cn("h-auto py-0.5 w-1/3 px-2", textAlignClass)}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(([price, size, total]) => (
              <TableRow
                key={price}
                ref={el => orderRefs.current[price] = el}
                className="relative text-xs font-code"
                style={backgroundStyle(total)}
              >
                <TableCell className={cn("w-1/3 py-1 px-2", textAlignClass, type === 'bid' ? 'text-accent' : 'text-destructive')}>{formatNumber(price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className={cn("w-1/3 text-primary-foreground py-1 px-2", textAlignClass)}>{size.toFixed(4)}</TableCell>
                <TableCell className={cn("w-1/3 text-primary-foreground py-1 px-2", textAlignClass)}>
                  {formatNumber(total, { notation: 'compact', compactDisplay: 'short' })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


export default function OrderBook({ data, currentPrice, animatedOrders, onHide, onExpand, isExpanded, height = 480, dragListeners, onMove, isFirst, isLast, isPinned, onPin, isResizable, onResizeStart, isMobile }: OrderBookProps) {
  const orderRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const isDesktopExpanded = isExpanded && !isMobile;

  const cardHeaderHeight = 60; // Estimated height of CardHeader in pixels
  const tableHeaderHeight = isDesktopExpanded ? 96 : 32;
  const rowHeight = 24;
  const contentHeight = height - cardHeaderHeight;

  let availableHeightForTable;
  if (isDesktopExpanded) {
    // Expanded desktop: Single table gets full content height
    availableHeightForTable = contentHeight;
  } else if (isMobile) {
    // Mobile compact: Stacked tables each get half
    availableHeightForTable = contentHeight / 2;
  } else {
    // Desktop compact: Side-by-side tables each get full content height
    availableHeightForTable = contentHeight;
  }

  const tableBodyHeight = availableHeightForTable - tableHeaderHeight;
  const numRows = Math.max(1, Math.floor(tableBodyHeight / rowHeight));

  const bidsWithTotal = (data.bids || [])
    .slice(0, numRows)
    .reduce((acc, [price, size], i) => {
      const total = (acc[i - 1]?.[2] || 0) + (size);
      acc.push([price, size, total]);
      return acc;
    }, [] as [number, number, number][]);

  const asksWithTotal = (data.asks || [])
    .slice(0, numRows)
    .reduce((acc, [price, size], i) => {
      const total = (acc[i - 1]?.[2] || 0) + (size);
      acc.push([price, size, total]);
      return acc;
    }, [] as [number, number, number][]).reverse(); // Reverse asks to have smallest price at the top (closest to spread)

  const maxTotal = Math.max(
    bidsWithTotal[bidsWithTotal.length - 1]?.[2] || 0, 
    asksWithTotal[0]?.[2] || 0 // After reversing, the largest total is at index 0
  );
  
  const finalSpreadData = isDesktopExpanded ? Array.from({ length: numRows }).map((_, i) => ({
    bid: bidsWithTotal[i],
    ask: asksWithTotal[i],
  })) : [];
  
  useEffect(() => {
    animatedOrders.forEach(price => {
      const rowForPrice = orderRefs.current[String(price)];
      if (rowForPrice) {
        rowForPrice.classList.remove('animate-flash');
        void rowForPrice.offsetWidth;
        rowForPrice.classList.add('animate-flash');
      }
    });
  }, [animatedOrders]);


  return (
    <Card 
        className={cn("relative flex flex-col", isPinned && "border-accent ring-2 ring-accent/30")}
        style={{ height: height ? `${height}px` : undefined }}
    >
      <CardHeader className="flex-row items-center justify-between p-4 space-y-0">
        <div className="flex items-baseline gap-4">
            <CardTitle className="text-base font-headline">Order Book</CardTitle>
            <div className="text-sm font-code text-accent">{currentPrice > 0 ? formatNumber(currentPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}</div>
        </div>
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
                                    <button {...dragListeners} className="p-1 rounded-md cursor-grab hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2">
                                        <GripVertical className="w-5 h-5 text-muted-foreground" />
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
      <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
        {isDesktopExpanded ? (
           <div className="h-full overflow-hidden">
             <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="text-sm border-b-0">
                        <TableHead colSpan={3} className="p-2 font-semibold text-center text-accent">Bids</TableHead>
                        <TableHead colSpan={3} className="p-2 font-semibold text-center text-destructive">Asks</TableHead>
                    </TableRow>
                    <TableRow className="text-xs">
                        <TableHead className="w-[18%] text-right px-2">Total</TableHead>
                        <TableHead className="w-[18%] text-right px-2">Quantity</TableHead>
                        <TableHead className="w-[14%] text-right px-2 text-accent">Price</TableHead>
                        <TableHead className="w-[14%] text-left px-2 text-destructive">Price</TableHead>
                        <TableHead className="w-[18%] text-left px-2">Quantity</TableHead>
                        <TableHead className="w-[18%] text-left px-2">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {finalSpreadData.map(({ bid, ask }, index) => {
                        const bidPrice = bid?.[0];
                        const bidSize = bid?.[1];
                        const bidTotal = bid?.[2];
                        const askPrice = ask?.[0];
                        const askSize = ask?.[1];
                        const askTotal = ask?.[2];

                        return (
                            <TableRow key={`${bidPrice}-${askPrice}-${index}`} className="relative text-xs font-code">
                                {/* BID side on the LEFT */}
                                <TableCell className="w-[18%] relative py-1 px-2 text-right">
                                    {bidTotal ? formatNumber(bidTotal, { notation: 'compact', compactDisplay: 'short' }) : ''}
                                    {bidTotal && <div
                                        className="absolute top-0 bottom-0 h-full -z-10 bg-accent/10 right-0"
                                        style={{ width: `${(bidTotal / maxTotal) * 100}%` }}
                                    />}
                                </TableCell>
                                <TableCell className="w-[18%] py-1 px-2 text-right">{bidSize ? bidSize.toFixed(4) : ''}</TableCell>
                                <TableCell ref={el => {if(bidPrice) orderRefs.current[String(bidPrice)] = el}} className="w-[14%] py-1 px-2 text-right text-accent">{bidPrice ? formatNumber(bidPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</TableCell>
                                
                                {/* ASK side on the RIGHT */}
                                <TableCell ref={el => {if(askPrice) orderRefs.current[String(askPrice)] = el}} className="w-[14%] py-1 px-2 text-left text-destructive">{askPrice ? formatNumber(askPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</TableCell>
                                <TableCell className="w-[18%] py-1 px-2 text-left">{askSize ? askSize.toFixed(4) : ''}</TableCell>
                                <TableCell className="w-[18%] relative py-1 px-2 text-left">
                                    {askTotal ? formatNumber(askTotal, { notation: 'compact', compactDisplay: 'short' }) : ''}
                                    {askTotal && <div
                                        className="absolute top-0 bottom-0 h-full -z-10 bg-destructive/10 left-0"
                                        style={{ width: `${(askTotal / maxTotal) * 100}%` }}
                                    />}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
             </Table>
           </div>
        ) : (
          <div className="grid h-full grid-cols-1 md:grid-cols-2">
             <div className="overflow-hidden"><CompactOrderBookTable title="Bids" orders={bidsWithTotal} type="bid" maxTotal={maxTotal} /></div>
             <div className="overflow-hidden"><CompactOrderBookTable title="Asks" orders={asksWithTotal.slice().reverse()} type="ask" maxTotal={maxTotal} /></div>
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
