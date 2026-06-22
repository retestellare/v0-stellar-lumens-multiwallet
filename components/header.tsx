'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';
import { NotificationBadge } from '@/components/notification-badge';
import { useWallet } from '@/lib/wallet-context';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenBulkWallet?: () => void;
}

export function Header({ onOpenBulkWallet }: HeaderProps) {
  const pathname = usePathname();
  const { wallets, activeWallet, setActiveWallet } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Close wallet menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setWalletMenuOpen(false);
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
          setWalletMenuOpen(true);
        } else {
          setWalletMenuOpen(false);
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
        setWalletMenuOpen(true);
      } else {
        setWalletMenuOpen(false);
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
    setWalletMenuOpen(false);
  };

  const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/exchange', label: 'Exchange' },
    { href: '/pools', label: 'Pools' },
    { href: '/history', label: 'History' },
  ];

  if (!activeWallet || wallets.length === 0) {
    return (
      <>
        <header className="border-b border-primary/20 bg-background sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <button 
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-3 group transition-all hover:opacity-80"
              >
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-primary shadow-lg">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Stellar</span>
                  <span className="text-xs text-muted-foreground">Lumens Wallet</span>
                </div>
              </button>
              <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={`text-sm font-medium transition-all ${pathname === link.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-4">
                <NotificationBadge />
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-xs font-medium text-primary">Live</span>
                </div>
                <button onClick={() => setMenuOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <header className="border-b border-primary/20 bg-background sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div
            ref={containerRef}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300',
              walletMenuOpen
                ? 'bg-card border-primary/40'
                : 'bg-card border-primary/20 hover:border-primary/30'
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleMouseWheel}
          >
            {/* Left: Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-background/50 transition-colors"
              aria-label="Open menu"
            >
              <Zap className="w-5 h-5 text-primary" />
            </button>

            {/* Center: Wallet Selector */}
            <button
              onClick={() => setWalletMenuOpen(!walletMenuOpen)}
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
                {walletMenuOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Right: Notification Badge */}
            <NotificationBadge />
          </div>

          {/* Expanded Wallet List Dropdown */}
          {walletMenuOpen && (
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

          {/* Desktop Navigation - Below wallet selector */}
          <nav className="hidden md:flex items-center gap-8 mt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-all ${
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4 mt-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors ml-auto"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* App Menu */}
      <AppMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => {
          setMenuOpen(false);
          setSettingsOpen(true);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenBulkWallet={onOpenBulkWallet}
      />
    </>
  );
}
