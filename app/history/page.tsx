'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { getAccountPayments } from '@/lib/stellar-utils';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: string;
  created_at: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash: string;
}

export default function HistoryPage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  useEffect(() => {
    if (activeWalletId && mounted && activeWallet) {
      fetchPayments();
    }
  }, [activeWalletId, mounted, activeWallet?.publicKey]);

  const fetchPayments = async () => {
    if (!activeWallet) return;
    setLoading(true);
    try {
      const data = await getAccountPayments(activeWallet.publicKey, 50);
      // Filter for payment operations only
      const paymentOps = data.filter((op: any) => 
        op.type === 'payment' || op.type === 'create_account' || op.type === 'path_payment_strict_send' || op.type === 'path_payment_strict_receive'
      );
      setPayments(paymentOps);
    } catch (error) {
      console.error('[v0] Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(4);
  };

  const getAssetCode = (payment: Payment) => {
    if (payment.asset_type === 'native') return 'XLM';
    return payment.asset_code || 'Unknown';
  };

  const isReceived = (payment: Payment) => {
    return payment.to === activeWallet?.publicKey;
  };

  const getCounterparty = (payment: Payment) => {
    const address = isReceived(payment) ? payment.from : payment.to;
    return address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Unknown';
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="space-y-6">
          {/* Header */}
          <div className="glow-border p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Transaction History</h1>
                <p className="text-muted-foreground text-sm">
                  {activeWallet?.name} - {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={fetchPayments}
                disabled={loading}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-primary ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Payments List */}
          {loading && payments.length === 0 ? (
            <div className="glow-border p-12 rounded-lg text-center">
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="glow-border p-12 rounded-lg text-center">
              <p className="text-muted-foreground">No transactions yet. Your payments will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const received = isReceived(payment);
                const assetCode = getAssetCode(payment);
                
                return (
                  <div
                    key={payment.id}
                    className="glow-border p-4 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Direction Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        received ? 'bg-green-500/20' : 'bg-accent/20'
                      }`}>
                        {received ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-accent" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${received ? 'text-green-500' : 'text-accent'}`}>
                            {received ? '+' : '-'}{formatAmount(payment.amount)} {assetCode}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {received ? 'From' : 'To'}: {getCounterparty(payment)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>

                      {/* View Link */}
                      <Link
                        href={`https://stellar.expert/explorer/public/tx/${payment.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 text-primary" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary Stats */}
          {payments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Payments</p>
                <p className="text-xl font-bold text-primary">{payments.length}</p>
              </div>
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Received</p>
                <p className="text-xl font-bold text-green-500">
                  {payments.filter(p => isReceived(p)).length}
                </p>
              </div>
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Sent</p>
                <p className="text-xl font-bold text-accent">
                  {payments.filter(p => !isReceived(p)).length}
                </p>
              </div>
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Latest</p>
                <p className="text-xs font-semibold text-foreground truncate">
                  {payments.length > 0 ? formatDate(payments[0].created_at) : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
