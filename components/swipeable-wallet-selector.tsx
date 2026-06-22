'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { cn } from '@/lib/utils';

export function SwipeableWalletSelector() {
  const { wallets, activeWallet, setActiveWallet } = useWallet();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startTimeRef.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = startYRef.current - endY; // Positive = swipe up, Negative = swipe down
      const deltaTime = Date.now() - startTimeRef.current;
      const velocity = Math.abs(deltaY) / deltaTime;

      // Detect swipe: at least 30px and velocity > 0.3
      if (Math.abs(deltaY) > 30 && velocity > 0.3) {
        if (deltaY > 0) {
          // Swipe up - expand
          setIsExpanded(true);
        } else {
          // Swipe down - collapse
          setIsExpanded(false);
        }
      }
    },
    []
  );

  const handleMouseWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current?.contains(e.currentTarget)) return;

    // Prevent default scroll behavior when interacting with wallet selector
    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.deltaY;
    if (Math.abs(deltaY) > 20) {
      if (deltaY < 0) {
        // Scroll up - expand
        setIsExpanded(true);
      } else {
        // Scroll down - collapse
        setIsExpanded(false);
      }
    }
  }, []);

  const handleCopyAddress = async (e: React.MouseEvent, publicKey: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(publicKey);
    setCopiedId(publicKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectWallet = (walletId: string) => {
    setActiveWallet(walletId);
    setIsExpanded(false);
  };

  const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

  if (!activeWallet || wallets.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out',
        isExpanded ? 'bg-background/95 backdrop-blur-md' : 'bg-card border-b border-primary/20'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleMouseWheel}
    >
      {/* Collapsed Header - Always visible */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between py-3 px-2 transition-all',
            'hover:bg-primary/5 rounded-lg',
            isExpanded && 'border-b border-primary/10'
          )}
        >
          {/* Wallet Display */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {wallets.length > 1 ? wallets.length : activeWallet.name?.charAt(0) || '∞'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {activeWallet.name || truncateKey(activeWallet.publicKey)}
                </p>
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {truncateKey(activeWallet.publicKey)}
                </p>
              </div>
            </div>
          </div>

          {/* Chevron Icon */}
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-primary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>

      {/* Expanded Wallet List */}
      {isExpanded && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            {wallets.map((wallet) => {
              const isActive = wallet.id === activeWallet.id || wallet.publicKey === activeWallet.publicKey;
              return (
                <button
                  key={wallet.id || wallet.publicKey}
                  onClick={() => handleSelectWallet(wallet.id || wallet.publicKey)}
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 rounded-lg transition-all',
                    'hover:bg-primary/10 border',
                    isActive
                      ? 'bg-primary/15 border-primary/40 ring-2 ring-primary/30'
                      : 'bg-background border-border/50 hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {wallet.name?.charAt(0) || '∞'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className={cn('font-semibold truncate text-sm', isActive ? 'text-primary' : 'text-foreground')}>
                        {wallet.name || 'Unnamed Wallet'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {truncateKey(wallet.publicKey)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleCopyAddress(e, wallet.publicKey)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copiedId === wallet.publicKey ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          {wallets.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-semibold text-foreground">{wallets.length}</span> wallet{wallets.length !== 1 ? 's' : ''} • Swipe to toggle
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hint text for desktop users */}
      {!isExpanded && wallets.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-1">
          <p className="text-xs text-muted-foreground text-center">Swipe up/down to switch wallets</p>
        </div>
      )}
    </div>
  );
}
