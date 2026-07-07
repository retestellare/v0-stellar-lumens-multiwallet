'use client';

import { useState, memo } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

interface AppMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

// Static arrays defined outside the component to prevent recreation on every render
const menuItems: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Search Tokens', href: '/token-search' },
  { icon: ShoppingBag, label: 'Real-World Spending', href: '/spending' },
  { icon: ArrowRightLeft, label: 'Swap', href: '/swap' },
  { icon: ArrowRightLeft, label: 'Exchange', href: '/exchange' },
  { icon: Droplets, label: 'Pools', href: '/pools' },
  { icon: Zap, label: 'Arbitrage', href: '/arbitrage' },
  { icon: TrendingUp, label: 'Portfolio', href: '/portfolio' },
  { icon: History, label: 'History', href: '/history' },
  { icon: Bot, label: 'Trading Bot', href: '/bot' },
  { icon: Wallet, label: 'Wallets', href: '/wallets' },
];



// NavMenuItem extracted as a memoized component to prevent unnecessary icon re-renders
const NavMenuItem = memo(function NavMenuItem({
  item,
  isActive,
  onClose,
}: {
  item: { icon: LucideIcon; label: string; href: string };
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <div>
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out mb-1 group ${
          isActive
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent hover:border-white/8'
        }`}
      >
        <item.icon
          className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ease-in-out ${
            isActive ? 'text-amber-400' : 'group-hover:text-amber-400/70'
          }`}
        />
        <span className="tracking-tight">{item.label}</span>
        {isActive && (
          <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 shadow-md shadow-amber-400/60" />
        )}
      </Link>


    </div>
  );
});

export const AppMenu = memo(function AppMenu({ isOpen, onClose, onOpenSettings }: AppMenuProps) {
  const pathname = usePathname();
  const { activeWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const utilityItems: (
    | { icon: LucideIcon; label: string; href: string; action?: never }
    | { icon: LucideIcon; label: string; action: () => void; href?: never }
  )[] = [
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
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed top-0 left-0 h-full w-72 sm:w-80 bg-[#05091a] border-r border-amber-500/10 z-50 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl shadow-black/90">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/6 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 ring-1 ring-amber-400/40">
                <Zap className="w-4 h-4 text-[#05091a]" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-slate-100 tracking-tight">Stellar Wallet</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-100 hover:bg-white/8 transition-all duration-200 ease-in-out"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Active Wallet Badge - Credit Card Style */}
        {activeWallet && (
          <div className="mx-3 mt-4 p-4 rounded-2xl bg-gradient-to-br from-amber-500/12 via-amber-500/6 to-[#0b1228] border border-amber-500/20 shadow-xl shadow-amber-500/8 hover:shadow-amber-500/15 transition-all duration-300 ease-in-out group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Active Wallet</p>
                <p className="text-base font-bold text-slate-100 leading-tight">{activeWallet.name}</p>
              </div>
              <Wallet className="w-5 h-5 text-amber-500/50 group-hover:text-amber-400 transition-colors duration-200 ease-in-out" strokeWidth={1.5} />
            </div>

            {/* Address with Copy */}
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-black/20 hover:bg-amber-500/8 border border-white/8 hover:border-amber-500/25 transition-all duration-200 ease-in-out group/copy"
            >
              <code className="text-xs font-mono text-slate-500 group-hover/copy:text-slate-200 transition-colors duration-200 ease-in-out flex-1 text-left truncate">
                {activeWallet.publicKey.substring(0, 14)}...{activeWallet.publicKey.substring(activeWallet.publicKey.length - 10)}
              </code>
              <div className="flex-shrink-0">
                {copied ? (
                  <Check className="w-4 h-4 text-amber-400 animate-pulse" strokeWidth={2.5} />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 group-hover/copy:text-amber-400 transition-colors duration-200 ease-in-out" strokeWidth={2} />
                )}
              </div>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NavMenuItem
                key={item.href}
                item={item}
                isActive={isActive}
                onClose={onClose}
              />
            );
          })}

          {/* Divider */}
          <div className="my-4 mx-2 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />

          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 mb-3">General</p>
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200 ease-in-out border border-transparent hover:border-white/8 mb-1 group"
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-amber-400/70 transition-colors duration-200 ease-in-out" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30 group-hover:opacity-60 transition-opacity duration-200 ease-in-out" />
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200 ease-in-out border border-transparent hover:border-white/8 mb-1 group"
              >
                <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-amber-400/70 transition-colors duration-200 ease-in-out" />
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30 group-hover:opacity-60 transition-opacity duration-200 ease-in-out" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
          <p className="text-xs text-slate-600 text-center tracking-wide">
            Stellar Lumens Wallet <span className="text-amber-500/50">·</span> v1.0
          </p>
        </div>
      </div>
    </>
  );
});
