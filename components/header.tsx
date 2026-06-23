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
      <header className="border-b border-primary/20 bg-background sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout (hidden on md:) - 3 Column Grid */}
          <div className="md:hidden grid grid-cols-3 items-center h-16 gap-2">
            {/* Left: Mobile Logo */}
            <button 
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-1.5 group transition-all hover:opacity-80 justify-start"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary shadow-lg flex-shrink-0">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">Stellar</span>
            </button>
            
            {/* Center: Wallet Selector Dropdown */}
            <div className="flex justify-center px-1">
              <WalletSelectorDropdown compact={true} />
            </div>

            {/* Right: Mobile Right Controls */}
            <div className="flex items-center gap-2 justify-end">
              {/* Notification Badge */}
              <NotificationBadge />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Desktop Layout (hidden on mobile) */}
          <div className="hidden md:flex items-center justify-between h-20 gap-4">
            {/* Logo Section */}
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
            
            {/* Desktop Navigation */}
            <nav className="flex items-center gap-8">
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

            {/* Desktop Right Side Controls */}
            <div className="flex items-center gap-4">
              {/* Notification Badge */}
              <NotificationBadge />

              {/* Live Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-primary">Live</span>
              </div>

              {/* Menu Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
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
