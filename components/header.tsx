'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu } from 'lucide-react';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';
import { NotificationBadge } from '@/components/notification-badge';

export function Header() {
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
      <header className="border-b border-border bg-sidebar/50 glass-effect sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Opens Menu on Click */}
            <button 
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 group"
            >
              <div className="relative">
                <Zap className="w-6 h-6 text-primary group-hover:glow-pulse" />
                <div className="absolute inset-0 rounded-full glow-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-lg text-foreground">Stellar</span>
                <span className="text-xs text-muted-foreground">Lumens Wallet</span>
              </div>
            </button>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors ${
                    pathname === link.href
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side - Notification Badge + Mobile Menu Button + Live Status */}
            <div className="flex items-center gap-3">
              {/* Notification Badge */}
              <NotificationBadge />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Live Status */}
              <div className="text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2 glow-pulse"></span>
                Live
              </div>
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
      />
    </>
  );
}
