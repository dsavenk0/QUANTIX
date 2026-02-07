'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-4 border-b border-accent/10 bg-accent/5 backdrop-blur-xl md:px-6 shrink-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Logo className="w-6 h-6 text-accent" />
          <h1 className="text-base font-bold tracking-tight sm:text-lg text-foreground font-headline">
            QUANTIX
          </h1>
          <Separator orientation="vertical" className="h-6 hidden md:block" />
          <p className="text-sm text-muted-foreground hidden md:block">
            Smart analytics for smart traders
          </p>
        </div>
      </div>
    </header>
  );
}
