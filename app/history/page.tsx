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

  const receivedCount = payments.filter(p => isReceived(p)).length;
  const sentCount = payments.filter(p => !isReceived(p)).length;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="page-container py-6">

        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-label mb-1">Wallet</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Transaction History</h1>
            {activeWallet && (
              <p className="text-sm text-muted-foreground mt-0.5">{activeWallet.name}</p>
            )}
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats row — only when loaded */}
        {payments.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total', value: payments.length, color: 'text-foreground' },
              { label: 'Received', value: receivedCount, color: 'text-emerald-400' },
              { label: 'Sent', value: sentCount, color: 'text-primary' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className={`text-xl font-bold num ${s.color}`}>{s.value}</p>
                <p className="section-label mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Payments list */}
        {loading && payments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-14 text-center">
            <RefreshCw className="w-7 h-7 text-muted-foreground mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading transactions&hellip;</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-14 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet. Your payments will appear here.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border/40">
              {payments.map((payment) => {
                const received = isReceived(payment);
                const assetCode = getAssetCode(payment);

                return (
                  <div key={payment.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      received ? 'bg-emerald-500/15' : 'bg-primary/10'
                    }`}>
                      {received
                        ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        : <ArrowUpRight className="w-4 h-4 text-primary" />
                      }
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-semibold num ${received ? 'text-emerald-400' : 'text-foreground'}`}>
                          {received ? '+' : '-'}{formatAmount(payment.amount)} {assetCode}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {payment.type === 'create_account' ? 'account created' : payment.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {received ? 'From' : 'To'} {getCounterparty(payment)}
                        </span>
                        <span className="text-xs text-muted-foreground/50">&middot;</span>
                        <span className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</span>
                      </div>
                    </div>

                    {/* Explorer link */}
                    <Link
                      href={`https://stellar.expert/explorer/public/tx/${payment.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      aria-label="View on Stellar Expert"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
