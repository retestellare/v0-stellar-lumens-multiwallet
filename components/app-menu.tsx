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
      <div className="fixed top-0 left-0 h-full w-72 sm:w-80 bg-card border-r border-border/60 z-50 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary shadow-md shadow-primary/30 ring-1 ring-primary/40">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm text-foreground tracking-tight">Stellar Wallet</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Active Wallet Info */}
        {activeWallet && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-primary/6 border border-primary/15">
            <p className="section-label mb-1">Active Wallet</p>
            <p className="text-sm font-semibold text-foreground truncate tracking-tight">{activeWallet.name}</p>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                  isActive
                    ? 'bg-primary/12 text-primary border border-primary/15'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <span className="tracking-tight">{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(245,197,24,0.6)]" />}
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
