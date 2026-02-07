
'use client';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { WidgetState } from '@/app/page';

const widgetNames = {
    topMovers: 'Top Movers',
    orderBook: 'Order Book',
    marketSentiment: 'Market Sentiment',
    cumulativeDelta: 'Cumulative Delta',
    halvingCountdown: 'Bitcoin Halving Countdown',
} as const;

type WidgetKey = keyof typeof widgetNames;

export function WidgetOverlay({ activeWidget }: { activeWidget?: WidgetState }) {
    if (!activeWidget) return null;

    const name = widgetNames[activeWidget.key as WidgetKey];

    return (
        <Card className="flex h-20 items-center justify-between p-4 bg-card/80 backdrop-blur-sm shadow-2xl opacity-75 border-2 border-dashed border-accent">
            <span className="font-bold text-lg">{name}</span>
            <GripVertical className="h-6 w-6 text-muted-foreground" />
        </Card>
    );
}
