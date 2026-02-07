
'use client';

import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

interface LoadingScreenProps {
  isAppReady: boolean;
}

export default function LoadingScreen({ isAppReady }: LoadingScreenProps) {
  const [progress, setProgress] = useState(10);
  const [visible, setVisible] = useState(true);

  // Animate progress to 90%
  useEffect(() => {
    if (!visible || progress >= 90) return;

    const timer = setTimeout(() => {
      setProgress(prev => Math.min(90, prev + Math.floor(Math.random() * 10) + 5));
    }, 300);

    return () => clearTimeout(timer);
  }, [progress, visible]);

  // Handle app ready signal and failsafe timer
  useEffect(() => {
    let failsafeTimer: NodeJS.Timeout | null = null;

    const hideScreen = () => {
      if (!visible) return;
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
      }, 400); // Wait for progress bar animation before starting fade-out
    };

    if (isAppReady) {
      hideScreen();
    } else {
      // Failsafe to hide the screen after 3 seconds regardless
      failsafeTimer = setTimeout(hideScreen, 3000);
    }

    return () => {
      if (failsafeTimer) {
        clearTimeout(failsafeTimer);
      }
    };
  }, [isAppReady, visible]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        !visible && "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col items-center gap-4 w-64">
        <Logo className="w-16 h-16 text-accent animate-pulse" />
        <h1 className="text-xl font-bold tracking-tight text-foreground font-headline">
          QUANTIX
        </h1>
        <Progress value={progress} className="w-full h-2 mt-2" />
      </div>
    </div>
  );
}
