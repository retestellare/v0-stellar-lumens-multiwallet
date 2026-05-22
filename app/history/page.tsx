'use client';

import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { getAccountTransactions } from '@/lib/stellar-utils';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  created_at: string;
  memo?: string;
  operations_count: number;
  type?: string;
}

export default function HistoryPage() {
  const { wallets, activeWalletId } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeWalletId && mounted) {
      const fetchTransactions = async () => {
        setLoading(true);
        try {
          const activeWallet = wallets.find(w => w.id === activeWalletId);
          if (activeWallet) {
            const txs = await getAccountTransactions(activeWallet.publicKey, 50);
            setTransactions(txs);
          }
        } catch (error) {
          console.error('[v0] Error fetching transactions:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchTransactions();
      const interval = setInterval(fetchTransactions, 30000);
      return () => clearInterval(interval);
    }
  }, [activeWalletId, wallets, mounted]);

  if (!mounted) return null;

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div className="glow-border p-6 rounded-lg">
            <h1 className="text-3xl font-bold text-foreground mb-2">Transaction History</h1>
            <p className="text-muted-foreground text-sm">
              {activeWallet?.name} • {transactions.length} transactions
            </p>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="glow-border p-12 rounded-lg text-center">
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="glow-border p-12 rounded-lg text-center">
              <p className="text-muted-foreground">No transactions yet. Your transactions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any, idx: number) => (
                <div
                  key={tx.id}
                  className="glow-border p-4 rounded-lg hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Transaction Type Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          {tx.type === 'payment_received' || tx.memo?.includes('receive') ? (
                            <ArrowDown className="w-5 h-5 text-primary" />
                          ) : (
                            <ArrowUp className="w-5 h-5 text-accent" />
                          )}
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            Transaction {tx.id.substring(0, 8)}...
                          </h3>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                            {tx.operations_count} operation{tx.operations_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                        {tx.memo && (
                          <p className="text-xs text-muted-foreground mt-1">Memo: {tx.memo}</p>
                        )}
                      </div>
                    </div>

                    {/* View Link */}
                    <Link
                      href={`https://stellar.expert/explorer/public/tx/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {transactions.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Total Transactions</p>
                <p className="text-2xl font-bold text-primary">{transactions.length}</p>
              </div>
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Total Operations</p>
                <p className="text-2xl font-bold text-primary">
                  {transactions.reduce((sum: number, tx: any) => sum + tx.operations_count, 0)}
                </p>
              </div>
              <div className="glow-border p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Latest Activity</p>
                <p className="text-xs font-semibold text-foreground">
                  {transactions.length > 0 ? formatDate(transactions[0].created_at) : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
