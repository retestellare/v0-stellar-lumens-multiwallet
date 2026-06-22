'use client';

import { useEffect } from 'react';
import { Header } from '@/components/header';
import { AppMenu } from '@/components/app-menu';
import { SettingsModal } from '@/components/settings-modal';
import { useNotifications } from '@/lib/notification-context';

interface LayoutClientProps {
  children: React.ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
  const { registerNotification } = useNotifications();

  useEffect(() => {
    // Initialize notifications if needed
  }, [registerNotification]);

  return (
    <>
      <Header />
      <div className="min-h-screen">
        {children}
      </div>
    </>
  );
}
