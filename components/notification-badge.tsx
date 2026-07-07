'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/notification-context';

export function NotificationBadge() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const router = useRouter();

  const handleClick = () => {
    markAllAsRead();
    router.push('/notifications');
  };

  if (unreadCount === 0) {
    return (
      <button
        onClick={handleClick}
        className="relative p-2 rounded-lg hover:bg-background/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="relative"
      aria-label={`${unreadCount} new notifications`}
    >
      {/* Badge with count */}
      <div className="flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg bg-pink-500 text-white font-bold text-sm animate-pulse">
        {unreadCount > 99 ? '99+' : unreadCount}
      </div>
    </button>
  );
}
