'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Zap,
  Home,
  ArrowRightLeft,
  TrendingUp,
  History,
  Settings,
  Wallet,
  HelpCircle,
  Info,
  ChevronRight,
  Droplets,
  Search,
  Bot,
  ShoppingBag,
  Copy,
  Check,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface AppMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function AppMenu({ isOpen, onClose, onOpenSettings }: AppMenuProps) {
  const pathname = usePathname();
  const { activeWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search Tokens', href: '/token-search' },
    { icon: ShoppingBag, label: 'Real-World Spending', href: '/spending' },
    { icon: ArrowRightLeft, label: 'Swap', href: '/swap' },
    { icon: ArrowRightLeft, label: 'Exchange', href: '/exchange' },
    { icon: Droplets, label: 'Pools', href: '/pools' },
    { icon: TrendingUp, label: 'Portfolio', href: '/portfolio' },
    { icon: History, label: 'History', href: '/history' },
    { icon: Bot, label: 'Trading Bot', href: '/bot' },
    { icon: Wallet, label: 'Wallets', href: '/wallets' },
  ];

  const exchangeSubsections = [
    { icon: History, label: 'Exchange History', href: '/exchange#history' },
    { icon: Settings, label: 'My Orders', href: '/exchange#orders' },
    { icon: ChevronRight, label: 'Filled Trades', href: '/exchange#filled' },
    { icon: TrendingUp, label: 'Charts', href: '/exchange#charts' },
  ];

  const utilityItems = [
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    { icon: HelpCircle, label: 'Help', href: 'https://stellar.org/learn' },
    { icon: Info, label: 'About', href: '/about' },
  ];

  const handleCopyAddress = async () => {
    if (!activeWallet) return;
    try {
      await navigator.clipboard.writeText(activeWallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[v0] Failed to copy address:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
        onClick={onClose}
      />

      {/* Menu Panel - Glassmorphism */}
      <div className="fixed top-0 left-0 h-full w-72 sm:w-80 bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-xl border-r border-primary/10 z-50 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="px-4 py-4 border-b border-primary/5 bg-gradient-to-r from-primary/8 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/40 ring-1 ring-primary/50">
                <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-foreground tracking-tight">Stellar Wallet</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Active Wallet Badge - Credit Card Style */}
        {activeWallet && (
          <div className="mx-3 mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-secondary/8 border border-primary/20 backdrop-blur-sm shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 opacity-75">Active Wallet</p>
                <p className="text-base font-bold text-foreground leading-tight">{activeWallet.name}</p>
              </div>
              <Wallet className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
            </div>
            
            {/* Address with Copy */}
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background/50 hover:bg-primary/10 border border-primary/15 transition-all duration-200 group/copy"
            >
              <code className="text-xs font-mono text-muted-foreground group-hover/copy:text-foreground transition-colors flex-1 text-left truncate">
                {activeWallet.publicKey.substring(0, 14)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 10)}
              </code>
              <div className="flex-shrink-0">
                {copied ? (
                  <Check className="w-4 h-4 text-primary animate-pulse" strokeWidth={2.5} />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground group-hover/copy:text-primary transition-colors" strokeWidth={2} />
                )}
              </div>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-3 opacity-70">Navigation</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isExchangeActive = item.label === 'Exchange' && pathname === '/exchange';
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/25 to-primary/5 text-primary border border-primary/30 shadow-lg shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/8 border border-transparent hover:border-primary/10'
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary' : 'group-hover:text-primary/70'}`} />
                  <span className="tracking-tight">{item.label}</span>
                  {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/50" />}
                </Link>
                
                {/* Exchange subsection quick links */}
                {isExchangeActive && (
                  <div className="ml-6 mt-2 mb-2 space-y-1 opacity-90">
                    {exchangeSubsections.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:bg-primary/10 group/sub"
                      >
                        <sub.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover/sub:opacity-100 transition-opacity" />
                        <span className="tracking-tight">{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-4 mx-2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-3 opacity-70">General</p>
          {/* Utility Items */}
          {utilityItems.map((item, idx) => {
            if (item.href) {
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={onClose}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/8 transition-all duration-200 border border-transparent hover:border-primary/10 mb-1 group"
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary/70 transition-colors" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-70 transition-opacity" />
                </Link>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => {
                  item.action?.();
                  if (item.label !== 'Settings') onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/8 transition-all duration-200 border border-transparent hover:border-primary/10 mb-1 group"
              >
                <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary/70 transition-colors" />
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-70 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-primary/10 bg-gradient-to-t from-background/50 to-transparent">
          <p className="text-xs text-muted-foreground text-center tracking-wide opacity-70">
            Stellar Lumens Wallet <span className="text-primary/60">·</span> v1.0
          </p>
        </div>
      </div>
    </>
  );
}
