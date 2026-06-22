'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Zap, Bell } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { useNotifications } from '@/lib/notification-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SwipeableWalletSelectorProps {
  onMenuOpen?: () => void;
}

export function SwipeableWalletSelector({ onMenuOpen }: SwipeableWalletSelectorProps) {
  const { wallets, activeWallet, setActiveWallet } = useWallet();
  const { unreadCount, markAllAsRead } = useNotifications();
  const router = useRouter();
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
      const deltaY = startYRef.current - endY;
      const deltaTime = Date.now() - startTimeRef.current;
      const velocity = Math.abs(deltaY) / deltaTime;

      if (Math.abs(deltaY) > 30 && velocity > 0.3) {
        if (deltaY > 0) {
          setIsExpanded(true);
        } else {
          setIsExpanded(false);
        }
      }
    },
    []
  );

  const handleMouseWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current?.contains(e.currentTarget)) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaY = e.deltaY;
    if (Math.abs(deltaY) > 20) {
      if (deltaY < 0) {
        setIsExpanded(true);
      } else {
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

  const handleNotificationClick = () => {
    markAllAsRead();
    router.push('/notifications');
  };

  const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

  if (!activeWallet || wallets.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Main Header Box */}
        <div
          ref={containerRef}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300',
            isExpanded
              ? 'bg-card border-primary/40'
              : 'bg-card border-primary/20 hover:border-primary/30'
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleMouseWheel}
        >
          {/* Left: Menu Button */}
          <button
            onClick={onMenuOpen}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-background/50 transition-colors"
            aria-label="Open menu"
          >
            <Zap className="w-5 h-5 text-primary" />
          </button>

          {/* Center: Wallet Selector */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background/30 transition-colors min-w-0"
          >
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">
                {activeWallet.name || truncateKey(activeWallet.publicKey)}
              </p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {truncateKey(activeWallet.publicKey)}
              </p>
            </div>
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Right: Notification Badge */}
          <button
            onClick={handleNotificationClick}
            className="flex-shrink-0 relative p-2 rounded-lg hover:bg-background/50 transition-colors"
            aria-label={`${unreadCount} notifications`}
          >
            {unreadCount > 0 ? (
              <>
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-primary text-white text-xs font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
                <Bell className="w-5 h-5 text-primary" />
              </>
            ) : (
              <Bell className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Expanded Wallet List Dropdown */}
        {isExpanded && (
          <div className="mt-2 p-3 rounded-xl bg-card border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              {wallets.map((wallet) => {
                const isActive = wallet.id === activeWallet.id || wallet.publicKey === activeWallet.publicKey;
                return (
                  <button
                    key={wallet.id || wallet.publicKey}
                    onClick={() => handleSelectWallet(wallet.id || wallet.publicKey)}
                    className={cn(
                      'flex items-center justify-between gap-2 p-2 rounded-lg transition-all text-left',
                      isActive
                        ? 'bg-primary/15 border border-primary/40'
                        : 'bg-background/50 border border-transparent hover:bg-background/70'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {wallet.name?.charAt(0) || '∞'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
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
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      {copiedId === wallet.publicKey ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </button>
                );
              })}
            </div>

            {wallets.length > 1 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-semibold text-foreground">{wallets.length}</span> wallet{wallets.length !== 1 ? 's' : ''} • Swipe up/down
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
