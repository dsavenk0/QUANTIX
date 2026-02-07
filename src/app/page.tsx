
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import Header from '@/components/layout/header';
import { useToast } from "@/hooks/use-toast";
import { getExchangeClient, availableExchanges } from '@/lib/exchanges';
import type { ExchangeClient } from '@/lib/exchanges/client';
import type { OrderBookData, OHLCV, Trade, WebSocketMessage } from '@/lib/exchanges/common';
import { cn } from '@/lib/utils';
import LoadingScreen from '@/components/layout/loading-screen';
import { DraggableWidget } from '@/components/dashboard/draggable-widget';
import { WidgetOverlay } from '@/components/dashboard/widget-overlay';
import ChartPanel from '@/components/dashboard/chart-panel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const WidgetSkeletonLoader = () => (
    <Card className="h-full min-h-[150px] w-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between p-4 pb-0 space-y-0">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
        </CardHeader>
        <CardContent className="p-4 flex-1">
            <Skeleton className="h-full w-full" />
        </CardContent>
    </Card>
);

const TopMovers = dynamic(() => import('@/components/dashboard/top-movers'), { 
    ssr: false, 
    loading: () => <WidgetSkeletonLoader />
});
const OrderBook = dynamic(() => import('@/components/dashboard/order-book'), { 
    ssr: false, 
    loading: () => <WidgetSkeletonLoader />
});
const MarketSentiment = dynamic(() => import('@/components/dashboard/market-sentiment'), { 
    ssr: false, 
    loading: () => <WidgetSkeletonLoader />
});
const CumulativeDeltaChart = dynamic(() => import('@/components/dashboard/cumulative-delta-chart'), { 
    ssr: false, 
    loading: () => <WidgetSkeletonLoader />
});
const HalvingCountdown = dynamic(() => import('@/components/dashboard/halving-countdown'), { 
    ssr: false, 
    loading: () => <WidgetSkeletonLoader />
});


// Cookie utility functions
function setCookie(name: string, value: any, days: number) {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') {
    document.cookie = name + "=" + (JSON.stringify(value) || "") + expires + "; path=/";
  }
}

function getCookie(name: string): any | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        const value = c.substring(nameEQ.length, c.length);
        if (value) return JSON.parse(value);
        return null;
      } catch (e) {
        return c.substring(nameEQ.length, c.length);
      }
    }
  }
  return null;
}

type WidgetKey = 'topMovers' | 'orderBook' | 'marketSentiment' | 'cumulativeDelta' | 'halvingCountdown';
export type WidgetState = { key: WidgetKey; expanded: boolean; pinned: boolean; height: number };

const largeWidgetKeys: Readonly<WidgetKey[]> = ['topMovers'];
const DEFAULT_HEIGHT_SMALL = 150;
const DEFAULT_HEIGHT_LARGE = 480;
const HALVING_WIDGET_MIN_HEIGHT = 150;
const ORDER_BOOK_MIN_HEIGHT = 150;


export default function Home() {
  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('N/A');
  const [timeframe, setTimeframe] = useState('4h');
  const [isDrawingToolbarVisible, setIsDrawingToolbarVisible] = useState(true);
  const [isTvDetailsVisible, setIsTvDetailsVisible] = useState(false);
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [widgetVisibility, setWidgetVisibility] = useState({
    topMovers: true,
    orderBook: true,
    marketSentiment: true,
    cumulativeDelta: false,
    halvingCountdown: true,
  });
  
  const [widgets, setWidgets] = useState<WidgetState[]>([
    { key: 'marketSentiment', expanded: false, pinned: false, height: DEFAULT_HEIGHT_SMALL },
    { key: 'cumulativeDelta', expanded: false, pinned: false, height: DEFAULT_HEIGHT_SMALL },
    { key: 'topMovers', expanded: false, pinned: false, height: DEFAULT_HEIGHT_LARGE },
    { key: 'orderBook', expanded: false, pinned: false, height: DEFAULT_HEIGHT_SMALL },
    { key: 'halvingCountdown', expanded: false, pinned: false, height: HALVING_WIDGET_MIN_HEIGHT },
  ]);

  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  const [hasMounted, setHasMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resizingWidgetKey, setResizingWidgetKey] = useState<WidgetKey | null>(null);
  const initialDragState = useRef<{ initialY: number; initialHeight: number } | null>(null);
  const symbolRef = useRef(symbol);

  const [client, setClient] = useState<ExchangeClient | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(true);

  useEffect(() => {
    if (symbol !== 'N/A') {
      symbolRef.current = symbol;
    }
  }, [symbol]);


  // Data states for widgets
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [currentPrice, setCurrentPrice] = useState(0);
  const [animatedOrders, setAnimatedOrders] = useState<number[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  const chartPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load state from cookies on mount
    const savedExchange = getCookie('exchange');
    if (savedExchange && availableExchanges.includes(savedExchange)) {
      setExchange(savedExchange);
    }
    
    const savedTimeframe = getCookie('timeframe');
    if (savedTimeframe) setTimeframe(savedTimeframe);
    
    const savedToolbarVisibility = getCookie('isDrawingToolbarVisible');
    if (savedToolbarVisibility !== null) {
        setIsDrawingToolbarVisible(savedToolbarVisibility);
    }
    
    const savedTvDetailsVisibility = getCookie('isTvDetailsVisible');
    if (savedTvDetailsVisibility !== null) {
        setIsTvDetailsVisible(savedTvDetailsVisibility);
    }

    const savedVisibility = getCookie('widgetVisibility');
    if (savedVisibility) {
        setWidgetVisibility(prev => ({ ...prev, ...savedVisibility }));
    }
    
    const savedWidgets = getCookie('widgets');
    if (savedWidgets && Array.isArray(savedWidgets) && savedWidgets.length > 0 && 'key' in savedWidgets[0]) {
      // Add pinned and height properties if they are missing for backward compatibility
      const normalizedWidgets = savedWidgets.map((w: any) => {
        const isLarge = largeWidgetKeys.includes(w.key);
        let height = w.height || (isLarge ? DEFAULT_HEIGHT_LARGE : DEFAULT_HEIGHT_SMALL);

        // Enforce minimum heights when loading from cookies
        let minHeight = DEFAULT_HEIGHT_SMALL;
        if (w.key === 'halvingCountdown') {
            minHeight = HALVING_WIDGET_MIN_HEIGHT;
        } else if (w.key === 'orderBook') {
            minHeight = ORDER_BOOK_MIN_HEIGHT;
        }
        height = Math.max(height, minHeight);
        
        return { 
            ...w, 
            pinned: w.pinned || false,
            height,
        };
      });
      setWidgets(normalizedWidgets);
    }

    setHasMounted(true);
  }, []);

  // Save state to cookies on change
  useEffect(() => { if (hasMounted) setCookie('exchange', exchange, 30); }, [exchange, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('symbol', symbol, 30); }, [symbol, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('timeframe', timeframe, 30); }, [timeframe, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('isDrawingToolbarVisible', isDrawingToolbarVisible, 30); }, [isDrawingToolbarVisible, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('isTvDetailsVisible', isTvDetailsVisible, 30); }, [isTvDetailsVisible, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('widgetVisibility', widgetVisibility, 30); }, [widgetVisibility, hasMounted]);
  useEffect(() => { if (hasMounted) setCookie('widgets', widgets, 30); }, [widgets, hasMounted]);

  const handleWidgetVisibilityChange = useCallback((widgetKey: WidgetKey, isVisible: boolean) => {
    setWidgetVisibility(prev => ({ ...prev, [widgetKey]: isVisible }));
    if (!isVisible) {
        // If hiding an expanded widget, also mark it as not expanded.
        setWidgets(currentWidgets => currentWidgets.map(w => 
            w.key === widgetKey ? {...w, expanded: false} : w
        ));
    }
  }, []);

  const handleExpandToggle = useCallback((keyToToggle: WidgetKey) => {
    setWidgets(currentWidgets => {
      const widgetToToggle = currentWidgets.find(w => w.key === keyToToggle);
      if (!widgetToToggle) return currentWidgets;

      const isExpanding = !widgetToToggle.expanded;

      if (isExpanding) {
        // When expanding, move the widget to the end of the array to make it the last "expanded" one.
        const otherWidgets = currentWidgets.filter(w => w.key !== keyToToggle);
        const updatedWidget = { 
            ...widgetToToggle, 
            expanded: true,
            height: keyToToggle === 'marketSentiment' ? DEFAULT_HEIGHT_SMALL : widgetToToggle.height
        };
        return [...otherWidgets, updatedWidget];
      } else {
        // When collapsing, just update its state in place.
        return currentWidgets.map(widget =>
          widget.key === keyToToggle
            ? { ...widget, expanded: false }
            : widget
        );
      }
    });
  }, []);
  
  const handlePinToggle = useCallback((keyToPin: WidgetKey) => {
    setWidgets(currentWidgets => {
      const widgetToPin = currentWidgets.find(w => w.key === keyToPin);
      if (!widgetToPin) return currentWidgets;

      const isPinning = !widgetToPin.pinned;

      if (isPinning) {
        // When pinning, move the widget to the end of the array to mark it as "last".
        // It must also be expanded.
        const otherWidgets = currentWidgets.filter(w => w.key !== keyToPin);
        const updatedWidget = { 
            ...widgetToPin, 
            pinned: true,
            expanded: true,
        };
        return [...otherWidgets, updatedWidget];
      } else {
        // When unpinning, just update its state in place. It remains expanded.
        return currentWidgets.map(widget =>
          widget.key === keyToPin
            ? { ...widget, pinned: false, expanded: true }
            : widget
        );
      }
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require mouse to move 10px to start dragging
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const activeIndex = items.findIndex((item) => item.key === active.id);
        const overIndex = items.findIndex((item) => item.key === over.id);

        if (activeIndex === -1 || overIndex === -1) return items;

        const activeItemOriginal = items[activeIndex];
        const overItemOriginal = items[overIndex];

        // Prevent dropping onto a pinned widget or dragging a pinned one.
        if (overItemOriginal.pinned || activeItemOriginal.pinned) {
            return items;
        }

        const newItems = [...items];
        const activeItem = items[activeIndex];
        const overItem = items[overIndex];

        // Swap the widgets' content (key), but keep all layout properties (expanded, pinned, height) tied to the position.
        newItems[activeIndex] = {
          key: overItem.key,
          expanded: activeItem.expanded,
          pinned: activeItem.pinned,
          height: activeItem.height,
        };
        newItems[overIndex] = {
          key: activeItem.key,
          expanded: overItem.expanded,
          pinned: overItem.pinned,
          height: overItem.height,
        };

        return newItems;
      });
    }
  }, []);

  const visibleWidgets = useMemo(() => widgets.filter(w => widgetVisibility[w.key]), [widgets, widgetVisibility]);

  const renderedWidgets = useMemo(() => {
    const pinnedVisible = visibleWidgets.filter(w => w.pinned);
    // The last pinned widget is the last one in the original array.
    // By reversing the collected pinned widgets, we place the last one at the top.
    const sortedPinned = [...pinnedVisible].reverse();
    
    const unpinnedVisible = visibleWidgets.filter(w => !w.pinned);

    if (isMobile) {
        // On mobile, just stack them: pinned first (in reverse order of pinning), then the rest.
        return [...sortedPinned, ...unpinnedVisible];
    }
    
    // On desktop, render pinned first, then other expanded widgets, then narrow widgets.
    const expandedUnpinned = unpinnedVisible.filter(w => w.expanded);
    const narrowUnpinned = unpinnedVisible.filter(w => !w.expanded);
    
    return [...sortedPinned, ...expandedUnpinned, ...narrowUnpinned];
  }, [visibleWidgets, isMobile]);

  const handleWidgetMove = useCallback((key: WidgetKey, direction: 'up' | 'down') => {
    const fromIndexSorted = renderedWidgets.findIndex(w => w.key === key);
    if (fromIndexSorted === -1) return;

    const toIndexSorted = direction === 'up' ? fromIndexSorted - 1 : fromIndexSorted + 1;
    if (toIndexSorted < 0 || toIndexSorted >= renderedWidgets.length) return;

    const activeKey = renderedWidgets[fromIndexSorted].key;
    const overKey = renderedWidgets[toIndexSorted].key;
    
    setWidgets((items) => {
      const activeIndex = items.findIndex((item) => item.key === activeKey);
      const overIndex = items.findIndex((item) => item.key === overKey);

      if (activeIndex === -1 || overIndex === -1) return items;

      const activeItemOriginal = items[activeIndex];
      const overItemOriginal = items[overIndex];

      // Prevent moving a pinned widget or moving into a pinned widget's slot
      if (activeItemOriginal.pinned || overItemOriginal.pinned) {
          return items;
      }

      const newItems = [...items];

      // On mobile, swap the entire widget objects, preserving all their properties.
      [newItems[activeIndex], newItems[overIndex]] = [newItems[overIndex], newItems[activeIndex]];
      
      return newItems;
    });
  }, [renderedWidgets, setWidgets, isMobile]);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, key: WidgetKey) => {
    e.preventDefault();
    const widget = widgetsRef.current.find(w => w.key === key);
    if (widget && widget.pinned && widget.expanded) {
        return; // Don't resize pinned widgets
    }
    document.body.classList.add('is-resizing');
    setResizingWidgetKey(key);
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (widget) {
      initialDragState.current = {
        initialY: clientY,
        initialHeight: widget.height,
      };
    }
  }, []);

  const handleResize = useCallback((event: MouseEvent | TouchEvent) => {
    if (!resizingWidgetKey || !initialDragState.current) return;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // Auto-scroll when dragging near the viewport edges
    const scrollMargin = 80; // 80px from the edge
    const scrollSpeed = 20;  // scroll by 20px
    if (clientY > window.innerHeight - scrollMargin) {
      window.scrollBy(0, scrollSpeed);
    } else if (clientY < scrollMargin) {
      window.scrollBy(0, -scrollSpeed);
    }

    const { initialY, initialHeight } = initialDragState.current;
    const deltaY = clientY - initialY;
    const proposedHeight = initialHeight + deltaY;

    setWidgets(currentWidgets => {
        const targetWidget = currentWidgets.find(w => w.key === resizingWidgetKey);
        if (!targetWidget) return currentWidgets;

        let selfMinHeight = DEFAULT_HEIGHT_SMALL;
        if (resizingWidgetKey === 'halvingCountdown') {
            selfMinHeight = HALVING_WIDGET_MIN_HEIGHT;
        } else if (resizingWidgetKey === 'orderBook') {
            selfMinHeight = ORDER_BOOK_MIN_HEIGHT;
        }
        let finalHeight = Math.max(selfMinHeight, proposedHeight);

        const newWidgets = [...currentWidgets];
        
        const updateWidgetHeight = (key: WidgetKey, height: number) => {
            const index = newWidgets.findIndex(w => w.key === key);
            if (index !== -1) {
                newWidgets[index] = { ...newWidgets[index], height };
            }
        };
        
        // If the widget is a narrow widget on desktop, we need to sync its peer.
        if (!isMobile && !targetWidget.expanded) {
            const narrowWidgets = currentWidgets.filter(w => widgetVisibility[w.key] && !w.expanded);
            const targetWidgetIndexInNarrow = narrowWidgets.findIndex(w => w.key === resizingWidgetKey);

            if (targetWidgetIndexInNarrow !== -1) {
                const peerIndexInNarrow = targetWidgetIndexInNarrow % 2 === 0
                    ? targetWidgetIndexInNarrow + 1
                    : targetWidgetIndexInNarrow - 1;

                if (peerIndexInNarrow >= 0 && peerIndexInNarrow < narrowWidgets.length) {
                    const peerWidgetKey = narrowWidgets[peerIndexInNarrow].key;
                    const peerMinHeight = DEFAULT_HEIGHT_SMALL;
                    // The final height must be valid for both.
                    finalHeight = Math.max(finalHeight, peerMinHeight);
                    updateWidgetHeight(peerWidgetKey, finalHeight);
                }
            }
        }
        
        updateWidgetHeight(resizingWidgetKey, finalHeight);
        
        return newWidgets;
    });
  }, [resizingWidgetKey, widgetVisibility, isMobile]);

  const handleResizeEnd = useCallback(() => {
    document.body.classList.remove('is-resizing');
    setResizingWidgetKey(null);
    initialDragState.current = null;
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (resizingWidgetKey) {
        e.preventDefault();
        handleResize(e);
      }
    };
    const handleEnd = () => handleResizeEnd();

    if (resizingWidgetKey) {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    }
    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
    };
  }, [resizingWidgetKey, handleResize, handleResizeEnd]);

  useEffect(() => {
    if (!hasMounted) return;
    const loadClient = async () => {
      setIsClientLoading(true);
      const newClient = await getExchangeClient(exchange);
      setClient(newClient);
      setIsClientLoading(false);
    };
    loadClient();
  }, [exchange, hasMounted]);

  const handleExchangeChange = useCallback((newExchange: string) => {
    setAllSymbols([]);
    setSymbol('N/A');
    setOrderBook({ bids: [], asks: [] });
    setCurrentPrice(0);
    setTrades([]);
    setExchange(newExchange);
  }, []);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    if (allSymbols.includes(newSymbol)) {
        setSymbol(newSymbol);
        setOrderBook({ bids: [], asks: [] });
        setCurrentPrice(0);
        setTrades([]);
    } else {
        toast({
            variant: "destructive",
            title: "Symbol Not Available",
            description: `The pair "${newSymbol.toUpperCase().replace('-', '/')}" is not available on the ${exchange} exchange.`,
        });
    }
  }, [allSymbols, exchange, toast]);
  
  const handleTopMoverSelect = useCallback((symbol: string) => {
    handleSymbolChange(symbol);
    chartPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [handleSymbolChange]);

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);
  
  useEffect(() => {
    if (isClientLoading || !hasMounted) {
      return;
    }

    if (!client) {
      if (exchange !== 'binance') { // Only toast for non-default exchanges
          toast({
              title: "Exchange Not Integrated",
              description: `The exchange "${exchange}" is not yet supported.`,
              variant: "destructive",
          });
      }
      return;
    };
    
    const loadSymbols = async () => {
        try {
            const symbols = await client.fetchAllSymbols();
            if (hasMounted) {
                setAllSymbols(symbols);
                const previousSymbol = getCookie('symbol') || symbolRef.current;
                let newSymbol = 'N/A';

                if (symbols.length > 0) {
                    if (previousSymbol) {
                        const baseAsset = previousSymbol.split('-')[0];
                        
                        const preferredPairs = [
                            previousSymbol, // Try exact match first
                            `${baseAsset}-usdc`,
                            `${baseAsset}-usd`,
                        ];

                        newSymbol = preferredPairs.find(p => symbols.includes(p)) || 'N/A';
                    }

                    // Fallback logic if no preferred pair is found
                    if (newSymbol === 'N/A') {
                        if (symbols.includes('btc-usdt')) {
                            newSymbol = 'btc-usdt';
                        } else if (symbols.includes('btc-usd')) { // Common on Kraken/Coinbase
                            newSymbol = 'btc-usd';
                        } else {
                            // Generic fallback
                            newSymbol = symbols.find(s => s.startsWith('btc-')) || 
                                        symbols.find(s => s.endsWith('-usdt')) || 
                                        symbols[0];
                        }
                    }
                }
                
                if (newSymbol && newSymbol !== 'N/A') {
                  setSymbol(newSymbol);
                } else {
                  setSymbol('N/A');
                }
            }
        } catch (error: any) {
            if (hasMounted) {
               setSymbol('N/A');
               toast({ variant: 'destructive', title: `Failed to load symbols for ${exchange}`, description: error.toString() });
            }
        }
    };
    
    if (hasMounted) {
        loadSymbols();
    }
    
  }, [client, isClientLoading, hasMounted, toast, exchange]);

  // WebSocket connection
  useEffect(() => {
    if (isClientLoading || !client || symbol === 'N/A' || !hasMounted || !allSymbols.includes(symbol)) {
      return;
    }

    if (client.name === 'coinbase') {
        toast({
            title: "Real-Time Data Notice for Coinbase",
            description: "Live updates (order book, trades) are disabled due to API security requirements. Chart data is fetched periodically.",
        });
    }

    const messageHandler = (message: WebSocketMessage, clientName: string) => {
        if (clientName !== exchange) return;

        if (message.type === 'depth') {
            setOrderBook(message.data);
        } else if (message.type === 'trade') {
            setCurrentPrice(message.data.price);
            setAnimatedOrders(prev => [...prev, message.data.price]);
            setTrades(prev => [...prev, message.data].slice(-1000)); // Keep last 1000 trades
            setTimeout(() => setAnimatedOrders(p => p.filter(price => price !== message.data.price)), 500);
        } else if (message.type === 'kline' && message.data.close) {
            setCurrentPrice(message.data.close);
        }
    };

    const disconnect = client.connect(symbol, timeframe, messageHandler);

    return () => {
      disconnect();
    };
  }, [client, isClientLoading, symbol, timeframe, exchange, hasMounted, allSymbols, toast]);

  const cumulativeDeltaData = useMemo(() => {
      if (trades.length === 0) return [];
      let runningDelta = 0;
      return trades.map(trade => {
        // isBuyerMaker is true when the taker is a seller. This constitutes a market sell (negative delta).
        const signedQuoteVolume = (trade.isBuyerMaker ? -1 : 1) * trade.quantity * trade.price;
        runningDelta += signedQuoteVolume;
        return { time: trade.time / 1000, delta: runningDelta }; // time in seconds
      });
  }, [trades]);

  const fiveMinuteAverageDelta = useMemo(() => {
    if (cumulativeDeltaData.length === 0) return null;
    
    const fiveMinutesAgo = (Date.now() / 1000) - 300;
    const recentData = cumulativeDeltaData.filter(d => d.time >= fiveMinutesAgo);
    
    if (recentData.length === 0) return null;
    
    const sum = recentData.reduce((acc, d) => acc + d.delta, 0);
    return sum / recentData.length;
  }, [cumulativeDeltaData]);
  
  const activeWidget = activeId ? widgets.find(w => w.key === activeId) : null;

  return (
    <div className="flex flex-col min-h-screen font-headline">
      <LoadingScreen isAppReady={hasMounted && symbol !== 'N/A'} />
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 p-2 sm:p-4 md:p-4">
        <div className="lg:col-span-2" ref={chartPanelRef}>
            {hasMounted ? (
                <ChartPanel 
                  exchange={exchange}
                  onExchangeChange={handleExchangeChange}
                  symbol={symbol}
                  onSymbolChange={handleSymbolChange}
                  timeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                  allSymbols={allSymbols}
                  widgetVisibility={widgetVisibility}
                  onWidgetVisibilityChange={handleWidgetVisibilityChange}
                  isDrawingToolbarVisible={isDrawingToolbarVisible}
                  onIsDrawingToolbarVisibleChange={setIsDrawingToolbarVisible}
                  isTvDetailsVisible={isTvDetailsVisible}
                  onIsTvDetailsVisibleChange={setIsTvDetailsVisible}
                />
            ) : null}
        </div>
        {hasMounted && (
          <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
          >
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {renderedWidgets.map((widgetState, index) => {
                  const { key, expanded, pinned } = widgetState;
                  let { height } = widgetState;

                  const narrowWidgets = renderedWidgets.filter(w => !w.expanded && !w.pinned);
                  const widgetIndexInNarrow = narrowWidgets.findIndex(w => w.key === key);
                  
                  const isLastNarrowAndOdd = !expanded && !pinned && narrowWidgets.length % 2 === 1 && widgetIndexInNarrow === narrowWidgets.length - 1;
                  
                  const isFullWidth = expanded || isLastNarrowAndOdd;

                  if (!isMobile && !expanded && !isLastNarrowAndOdd) {
                    // Find peer in the same row
                    const peerIndex = (widgetIndexInNarrow % 2 === 0) ? widgetIndexInNarrow + 1 : widgetIndexInNarrow - 1;
                    if (peerIndex >= 0 && peerIndex < narrowWidgets.length) {
                      const peerWidget = narrowWidgets[peerIndex];
                      // The larger one should adjust to the smaller one's height
                      height = Math.min(height, peerWidget.height);
                    }
                  } else if (isMobile) {
                    // On mobile, widgets should keep their own height. The logic to sync heights is disabled.
                  }


                  const wrapperClassName = cn({ "md:col-span-2": isFullWidth });

                  const widgetIsPinned = expanded && pinned;
                  
                  const isResizable = !widgetIsPinned;

                  const widgetProps = {
                    onHide: () => handleWidgetVisibilityChange(key, false),
                    onExpand: () => handleExpandToggle(key),
                    isExpanded: expanded,
                    onMove: (direction: 'up' | 'down') => handleWidgetMove(key, direction),
                    isFirst: index === 0 || widgetIsPinned || (index > 0 && renderedWidgets[index - 1].expanded && renderedWidgets[index - 1].pinned),
                    isLast: index === renderedWidgets.length - 1 || widgetIsPinned || (index < renderedWidgets.length - 1 && renderedWidgets[index + 1].expanded && renderedWidgets[index + 1].pinned),
                    isPinned: widgetIsPinned,
                    onPin: () => handlePinToggle(key),
                    isMobile,
                  };
                  
                  let component;
                  if (key === 'topMovers') {
                    component = <TopMovers {...widgetProps} onSymbolChange={handleTopMoverSelect} height={height} isResizable={isResizable} onResizeStart={(e) => handleResizeStart(e, key)} />;
                  } else if (key === 'orderBook') {
                    component = <OrderBook {...widgetProps} data={orderBook} currentPrice={currentPrice} animatedOrders={animatedOrders} height={height} isResizable={isResizable} onResizeStart={(e) => handleResizeStart(e, key)} />;
                  } else if (key === 'marketSentiment') {
                    component = <MarketSentiment {...widgetProps} data={orderBook} height={height} isResizable={isResizable} onResizeStart={(e) => handleResizeStart(e, key)} />;
                  } else if (key === 'cumulativeDelta') {
                      component = <CumulativeDeltaChart {...widgetProps} chartData={cumulativeDeltaData} fiveMinuteAverage={fiveMinuteAverageDelta} height={height} isResizable={isResizable} onResizeStart={(e) => handleResizeStart(e, key)} />;
                  } else if (key === 'halvingCountdown') {
                      component = <HalvingCountdown {...widgetProps} height={height} isResizable={isResizable} onResizeStart={(e) => handleResizeStart(e, key)} />;
                  }


                  if (!component) {
                      return null;
                  }
                  
                  return (
                      <DraggableWidget
                        key={key}
                        id={key}
                        className={wrapperClassName}
                        isPinned={expanded && pinned}
                        disabled={isMobile}
                      >
                        {component}
                      </DraggableWidget>
                    );
                })}
              </div>
              <DragOverlay>
                  {activeId ? (
                      <WidgetOverlay activeWidget={activeWidget ?? undefined} />
                  ) : null}
              </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  );
}
