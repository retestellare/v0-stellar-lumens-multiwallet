'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu } from 'lucide-react';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';
import { NotificationBadge } from '@/components/notification-badge';

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
          <div className="flex items-center justify-between h-20">
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
            <nav className="hidden md:flex items-center gap-8">
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

            {/* Right Side Controls */}
            <div className="flex items-center gap-4">
              {/* Notification Badge */}
              <NotificationBadge />

              {/* Live Status Indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-primary">Live</span>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
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
