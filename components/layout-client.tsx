'use client';

import { useState } from 'react';
import { SwipeableWalletSelector } from '@/components/swipeable-wallet-selector';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';

interface LayoutClientProps {
  children: React.ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <SwipeableWalletSelector onMenuOpen={() => setMenuOpen(true)} />
      <div className="pt-24">
        {children}
      </div>
      <AppMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => {
          setMenuOpen(false);
          setSettingsOpen(true);
        }}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
