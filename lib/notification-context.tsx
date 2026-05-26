'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from './wallet-context';
import { getAccountPayments, getAccountTrades } from './stellar-utils';

export interface Transaction {
  id: string;
  walletId: string;
  walletName: string;
  walletPublicKey: string;
  type: 'trade' | 'payment' | 'received';
  timestamp: string;
  // For trades
  soldAmount?: string;
  soldAsset?: string;
  boughtAmount?: string;
  boughtAsset?: string;
  // For payments
  amount?: string;
  asset?: string;
  destination?: string;
  from?: string;
  memo?: string;
}

interface NotificationContextType {
  notifications: Transaction[];
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRl9vT19teleXRlVEFUQQAAABkGAQBWQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhfm9vT19P//8A';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wallets } = useWallet();
  const [notifications, setNotifications] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckedRef = useRef<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Load settings and last checked timestamps from localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('notification_sound_enabled');
    if (savedSound !== null) {
      setSoundEnabledState(savedSound === 'true');
    }
    
    const savedLastChecked = localStorage.getItem('notification_last_checked');
    if (savedLastChecked) {
      try {
        lastCheckedRef.current = JSON.parse(savedLastChecked);
      } catch {
        // Ignore parse errors
      }
    }

    const savedUnread = localStorage.getItem('notification_unread_count');
    if (savedUnread) {
      setUnreadCount(parseInt(savedUnread, 10) || 0);
    }

    const savedNotifications = localStorage.getItem('notifications_cache');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save settings to localStorage
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('notification_sound_enabled', enabled.toString());
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Use Web Audio API for a simple notification beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Fetch transactions for all wallets
  const fetchAllTransactions = useCallback(async () => {
    if (wallets.length === 0) return;
    
    setIsLoading(true);
    const allTransactions: Transaction[] = [];
    let newTransactionsCount = 0;

    for (const wallet of wallets) {
      try {
        // Fetch recent trades
        const trades = await getAccountTrades(wallet.publicKey, 20);
        const lastCheckedTime = lastCheckedRef.current[wallet.publicKey] || '1970-01-01T00:00:00Z';
        
        for (const trade of trades) {
          const timestamp = trade.ledger_close_time;
          const isBuyer = trade.base_is_seller === false;
          
          const tx: Transaction = {
            id: `trade_${trade.id}`,
            walletId: wallet.id,
            walletName: wallet.name,
            walletPublicKey: wallet.publicKey,
            type: 'trade',
            timestamp,
            soldAmount: isBuyer ? trade.counter_amount : trade.base_amount,
            soldAsset: isBuyer 
              ? (trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code)
              : (trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code),
            boughtAmount: isBuyer ? trade.base_amount : trade.counter_amount,
            boughtAsset: isBuyer 
              ? (trade.base_asset_type === 'native' ? 'XLM' : trade.base_asset_code)
              : (trade.counter_asset_type === 'native' ? 'XLM' : trade.counter_asset_code),
          };
          
          allTransactions.push(tx);
          
          // Count new transactions (only after initial load)
          if (initialLoadDoneRef.current && timestamp > lastCheckedTime) {
            newTransactionsCount++;
          }
        }

        // Fetch recent payments
        const payments = await getAccountPayments(wallet.publicKey, 20);
        
        for (const payment of payments) {
          if (payment.type !== 'payment' && payment.type !== 'create_account') continue;
          
          const timestamp = payment.created_at;
          const isReceived = payment.to === wallet.publicKey;
          
          const tx: Transaction = {
            id: `payment_${payment.id}`,
            walletId: wallet.id,
            walletName: wallet.name,
            walletPublicKey: wallet.publicKey,
            type: isReceived ? 'received' : 'payment',
            timestamp,
            amount: payment.amount || payment.starting_balance,
            asset: payment.asset_type === 'native' ? 'XLM' : payment.asset_code,
            destination: payment.to,
            from: payment.from,
          };
          
          allTransactions.push(tx);
          
          // Count new transactions (only after initial load)
          if (initialLoadDoneRef.current && timestamp > lastCheckedTime) {
            newTransactionsCount++;
          }
        }

        // Update last checked time for this wallet
        if (trades.length > 0 || payments.length > 0) {
          const latestTime = [...trades.map(t => t.ledger_close_time), ...payments.map(p => p.created_at)]
            .sort()
            .reverse()[0];
          if (latestTime && (!initialLoadDoneRef.current || latestTime > (lastCheckedRef.current[wallet.publicKey] || ''))) {
            lastCheckedRef.current[wallet.publicKey] = latestTime;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch transactions for wallet ${wallet.name}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Keep only the most recent 100 transactions
    const limitedTransactions = allTransactions.slice(0, 100);
    
    setNotifications(limitedTransactions);
    localStorage.setItem('notifications_cache', JSON.stringify(limitedTransactions));
    localStorage.setItem('notification_last_checked', JSON.stringify(lastCheckedRef.current));
    
    // Play sound and update count for new transactions
    if (newTransactionsCount > 0) {
      setUnreadCount(prev => {
        const newCount = prev + newTransactionsCount;
        localStorage.setItem('notification_unread_count', newCount.toString());
        return newCount;
      });
      playSound();
    }
    
    initialLoadDoneRef.current = true;
    setIsLoading(false);
  }, [wallets, playSound]);

  // Fetch on mount and periodically
  useEffect(() => {
    if (wallets.length === 0) return;
    
    // Initial fetch
    fetchAllTransactions();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchAllTransactions, 30000);
    
    return () => clearInterval(interval);
  }, [wallets, fetchAllTransactions]);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    localStorage.setItem('notification_unread_count', '0');
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications_cache');
    localStorage.setItem('notification_unread_count', '0');
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        markAllAsRead,
        clearNotifications,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
