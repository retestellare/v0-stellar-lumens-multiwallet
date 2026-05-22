'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-sidebar/50 glass-effect sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Zap className="w-6 h-6 text-primary group-hover:glow-pulse" />
              <div className="absolute inset-0 rounded-full glow-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-lg text-foreground">Stellar</span>
              <span className="text-xs text-muted-foreground">Lumens Wallet</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            <Link href="/portfolio" className="text-sm text-muted-foreground hover:text-primary transition-colors">Portfolio</Link>
            <Link href="/exchange" className="text-sm text-muted-foreground hover:text-primary transition-colors">Exchange</Link>
            <Link href="/history" className="text-sm text-muted-foreground hover:text-primary transition-colors">History</Link>
          </nav>

          <div className="text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2 glow-pulse"></span>
            Live
          </div>
        </div>
      </div>
    </header>
  );
}
