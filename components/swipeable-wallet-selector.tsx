'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface TouchState {
  startY: number;
  currentY: number;
  isDragging: boolean;
}

export function SwipeableWalletSelector() {
  const { wallets, activeWallet, setActiveWallet, activeWalletId } = useWallet();
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    startY: 0,
    currentY: 0,
    isDragging: false,
  });
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchState({
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      isDragging: true,
    });
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchState(prev => ({
      ...prev,
      currentY: e.touches[0].clientY,
    }));
  };

  const handleTouchEnd = () => {
    const { startY, currentY } = touchState;
    const difference = startY - currentY; // Positive = swiped up, Negative = swiped down
    const threshold = 50; // Minimum swipe distance

    if (wallets.length <= 1) {
      setTouchState({ startY: 0, currentY: 0, isDragging: false });
      return;
    }

    if (Math.abs(difference) > threshold) {
      const currentIndex = wallets.findIndex(w => w.id === activeWalletId);

      if (difference > 0) {
        // Swiped up - move to next wallet
        setSwipeDirection('up');
        const nextIndex = (currentIndex + 1) % wallets.length;
        setActiveWallet(wallets[nextIndex].id);
      } else {
        // Swiped down - move to previous wallet
        setSwipeDirection('down');
        const prevIndex = currentIndex === 0 ? wallets.length - 1 : currentIndex - 1;
        setActiveWallet(wallets[prevIndex].id);
      }

      setTimeout(() => setSwipeDirection(null), 200);
    }

    setTouchState({ startY: 0, currentY: 0, isDragging: false });
  };

  // Show hint on first load if multiple wallets
  useEffect(() => {
    if (wallets.length > 1) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [wallets.length]);

  if (!activeWallet || wallets.length === 0) {
    return null;
  }

  const currentIndex = wallets.findIndex(w => w.id === activeWalletId);
  const previousWallet = wallets[(currentIndex - 1 + wallets.length) % wallets.length];
  const nextWallet = wallets[(currentIndex + 1) % wallets.length];

  const truncateKey = (key: string) => `${key.slice(0, 6)}...${key.slice(-6)}`;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-md border-b border-primary/20 touch-none select-none cursor-grab active:cursor-grabbing overflow-hidden"
    >
      {/* Swipe Hint */}
      {showHint && wallets.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="animate-pulse text-xs text-primary/60 font-medium">
            Swipe to switch wallets
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Container for wallet carousel */}
        <div className="space-y-2">
          {/* Previous Wallet Hint */}
          {wallets.length > 1 && (
            <div className="text-xs text-muted-foreground/60 px-2 h-4 flex items-center gap-1">
              <ChevronUp className="w-3 h-3" />
              <span className="truncate">{previousWallet.name || truncateKey(previousWallet.publicKey)}</span>
            </div>
          )}

          {/* Active Wallet Display */}
          <div
            className={`relative flex items-center justify-between px-4 py-3 rounded-lg border-2 bg-card/40 transition-all duration-200 ${
              swipeDirection === 'up' || swipeDirection === 'down'
                ? 'border-primary/40 scale-105'
                : 'border-primary/20 hover:border-primary/40'
            }`}
          >
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {wallets.length > 1 ? 'Active Wallet' : 'Wallet'}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {activeWallet.name || 'Unnamed Wallet'}
                </span>
                <span className="text-xs text-muted-foreground/70 font-mono truncate">
                  {truncateKey(activeWallet.publicKey)}
                </span>
              </div>
            </div>

            {/* Wallet Counter */}
            {wallets.length > 1 && (
              <div className="ml-3 text-right">
                <div className="text-xs font-semibold text-primary">
                  {currentIndex + 1}/{wallets.length}
                </div>
              </div>
            )}
          </div>

          {/* Next Wallet Hint */}
          {wallets.length > 1 && (
            <div className="text-xs text-muted-foreground/60 px-2 h-4 flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              <span className="truncate">{nextWallet.name || truncateKey(nextWallet.publicKey)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
