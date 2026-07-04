'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu } from 'lucide-react';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';
import { NotificationBadge } from '@/components/notification-badge';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';

interface HeaderProps {
  onOpenBulkWallet?: () => void;
}

export function Header({ onOpenBulkWallet }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/exchange', label: 'Exchange' },
    { href: '/pools', label: 'Pools' },
    { href: '/history', label: 'History' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_1px_0_0_rgba(28,45,80,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="md:hidden grid grid-cols-3 items-center h-14 gap-2">
            {/* Left: Logo */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 group transition-all duration-200 ease-in-out active:scale-[0.98]"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary shadow-lg shadow-primary/30 ring-1 ring-primary/40 shrink-0">
                <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate tracking-tight">Stellar</span>
            </button>

            {/* Center: Wallet Selector */}
            <div className="flex justify-center">
              <WalletSelectorDropdown compact={true} />
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-1.5 justify-end">
              <NotificationBadge />
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-muted transition-all duration-200 ease-in-out active:scale-[0.98]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between h-16 gap-6">
            {/* Logo */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-3 group transition-all flex-shrink-0"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-lg shadow-primary/30 ring-1 ring-primary/40">
                <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors tracking-tight">Stellar</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 tracking-wide uppercase">Lumens Wallet</span>
              </div>
            </button>

            {/* Navigation */}
            <nav className="flex items-center gap-0.5 bg-muted/20 rounded-xl p-1 border border-border/40">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out active:scale-[0.98] ${
                    pathname === link.href
                      ? 'text-primary-foreground bg-primary shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <NotificationBadge />

              {/* Live badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Live</span>
              </div>

              <WalletSelectorDropdown compact={false} />

              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-muted transition-all duration-200 ease-in-out active:scale-[0.98]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
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
