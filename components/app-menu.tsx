'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed top-0 left-0 h-full w-72 sm:w-80 bg-card border-r border-border z-50 flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Active Wallet Info */}
        {activeWallet && (
          <div className="p-4 border-b border-border bg-background/30">
            <p className="text-xs text-muted-foreground mb-1">Active Wallet</p>
            <p className="text-sm font-medium text-foreground truncate">{activeWallet.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {activeWallet.publicKey.substring(0, 8)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 8)}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground hover:bg-background/50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Utility Items */}
          <div className="px-2">
            {utilityItems.map((item, idx) => {
              if (item.href) {
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={onClose}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg text-foreground hover:bg-background/50 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </Link>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action?.();
                    if (item.label !== 'Settings') {
                      onClose();
                    }
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-foreground hover:bg-background/50 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
              );
            })}
          </div>

          {/* Wallets Section */}
          {wallets.length > 1 && (
            <>
              <div className="my-4 border-t border-border" />
              <div className="px-2">
                <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Switch Wallet
                </p>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.publicKey}
                    onClick={() => {
                      setActiveWallet(wallet.publicKey);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                      activeWallet?.publicKey === wallet.publicKey
                        ? 'bg-primary/20 text-primary'
                        : 'text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {wallet.balances?.length || 0} assets
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Stellar Lumens Multiwallet v1.0
          </p>
        </div>
      </div>
    </>
  );
}
