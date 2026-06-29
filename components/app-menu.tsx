'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface AppMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function AppMenu({ isOpen, onClose, onOpenSettings }: AppMenuProps) {
  const pathname = usePathname();
  const { activeWallet, wallets, setActiveWallet, removeWallet } = useWallet();

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
  ];

  const utilityItems = [
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    { icon: HelpCircle, label: 'Help', href: 'https://stellar.org/learn' },
    { icon: Info, label: 'About', href: '/about' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed top-0 left-0 h-full w-72 sm:w-80 bg-card border-r border-border z-50 flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-foreground">Stellar Wallet</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Active Wallet Info */}
        {activeWallet && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50">
            <p className="section-label mb-1">Active Wallet</p>
            <p className="text-sm font-semibold text-foreground truncate">{activeWallet.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
              {activeWallet.publicKey.substring(0, 10)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 6)}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <p className="section-label px-3 mb-2">Navigation</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 border-t border-border/60" />

          <p className="section-label px-3 mb-2">General</p>
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mb-0.5"
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mb-0.5"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              </button>
            );
          })}

          {/* Switch Wallet */}
          {wallets.length > 1 && (
            <>
              <div className="my-3 border-t border-border/60" />
              <p className="section-label px-3 mb-2">Switch Wallet</p>
              {wallets.map((wallet) => {
                const isCurrentWallet = activeWallet?.publicKey === wallet.publicKey;
                return (
                  <button
                    key={wallet.publicKey}
                    onClick={() => { setActiveWallet(wallet.publicKey); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 ${
                      isCurrentWallet
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isCurrentWallet ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {wallet.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {wallet.balances?.length || 0} asset{wallet.balances?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {isCurrentWallet && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground text-center">
            Stellar Lumens Wallet &middot; v1.0
          </p>
        </div>
      </div>
    </>
  );
}
