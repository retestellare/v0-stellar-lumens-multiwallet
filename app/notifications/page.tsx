'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  Volume2, 
  VolumeX,
  Clock,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { useNotifications } from '@/lib/notification-context';
import { Header } from '@/components/header';

export default function NotificationsPage() {
  const { 
    notifications, 
    soundEnabled, 
    setSoundEnabled, 
    markAllAsRead, 
    isLoading 
  } = useNotifications();

  // Mark as read when page opens
  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', '');
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Recent transactions from all your wallets
            </p>
          </div>
          
          {isLoading && (
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-3 mb-8 p-4 w-full rounded-lg glow-border hover:bg-background/50 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-6 h-6 text-primary" />
          ) : (
            <VolumeX className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-lg text-foreground">
            Play Notification Sounds.
          </span>
          {soundEnabled && (
            <span className="ml-auto text-primary font-semibold">ON</span>
          )}
        </button>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground">No recent transactions</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Transactions will appear here when they occur
              </p>
            </div>
          ) : (
            notifications.map((tx) => (
              <div
                key={tx.id}
                className={`rounded-lg p-4 ${
                  tx.type === 'payment' 
                    ? 'bg-destructive/20 border border-destructive/30' 
                    : 'bg-card border border-border'
                }`}
              >
                {/* Wallet indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  <span>{tx.walletName}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{truncateAddress(tx.walletPublicKey)}</span>
                </div>

                {tx.type === 'trade' ? (
                  // Trade notification
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-destructive" />
                        <span className="text-lg text-foreground">Sold</span>
                      </div>
                      <span className="text-lg font-mono text-destructive">
                        - {parseFloat(tx.soldAmount || '0').toFixed(7)} {tx.soldAsset}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft className="w-5 h-5 text-primary" />
                        <span className="text-lg text-foreground">Bought</span>
                      </div>
                      <span className="text-lg font-mono text-primary">
                        {parseFloat(tx.boughtAmount || '0').toFixed(7)} {tx.boughtAsset}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(tx.timestamp)}</span>
                      <a
                        href={`https://stellar.expert/explorer/public/tx/${tx.id.replace('trade_', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : tx.type === 'payment' ? (
                  // Sent payment notification (red background)
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-destructive" />
                        <span className="text-lg font-semibold text-destructive">Sent</span>
                      </div>
                      <span className="text-lg font-mono text-destructive">
                        - {parseFloat(tx.amount || '0').toFixed(7)} {tx.asset}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-mono text-foreground">
                        {truncateAddress(tx.destination || '')}
                      </span>
                    </div>
                    
                    {tx.memo && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Memo</span>
                        <span className="text-foreground">{tx.memo}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(tx.timestamp)}</span>
                      <a
                        href={`https://stellar.expert/explorer/public/op/${tx.id.replace('payment_', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  // Received payment notification
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft className="w-5 h-5 text-primary" />
                        <span className="text-lg font-semibold text-primary">Received</span>
                      </div>
                      <span className="text-lg font-mono text-primary">
                        + {parseFloat(tx.amount || '0').toFixed(7)} {tx.asset}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">From</span>
                      <span className="font-mono text-foreground">
                        {truncateAddress(tx.from || '')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(tx.timestamp)}</span>
                      <a
                        href={`https://stellar.expert/explorer/public/op/${tx.id.replace('payment_', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
