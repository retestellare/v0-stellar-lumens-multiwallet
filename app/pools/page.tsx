'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';
import { 
  getAccountLiquidityPools, 
  getLiquidityPoolDetails, 
  depositToLiquidityPool, 
  withdrawFromLiquidityPool,
  decryptSecret 
} from '@/lib/stellar-utils';
import { 
  ArrowLeft, 
  Droplets, 
  Plus, 
  Minus, 
  Loader2, 
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
  Wallet
} from 'lucide-react';
import Link from 'next/link';

interface PoolPosition {
  poolId: string;
  shares: string;
  assetA: { code: string; issuer?: string };
  assetB: { code: string; issuer?: string };
  reserveA: string;
  reserveB: string;
  fee: number;
}

export default function PoolsPage() {
  const { wallets, activeWalletId, updateBalances } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<PoolPosition[]>([]);
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [selectedPool, setSelectedPool] = useState<PoolPosition | null>(null);
  
  // Form state
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [slippage, setSlippage] = useState('1'); // 1% default
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<'deposit' | 'withdraw' | null>(null);

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's LP positions
  const fetchPositions = useCallback(async () => {
    if (!activeWallet) return;
    
    setLoading(true);
    try {
      const pools = await getAccountLiquidityPools(activeWallet.publicKey);
      
      // Get details for each pool
      const positionsWithDetails = await Promise.all(
        pools.map(async (pool: any) => {
          const details = await getLiquidityPoolDetails(pool.id);
          if (!details) return null;
          
          const assetA = details.reserves[0];
          const assetB = details.reserves[1];
          
          return {
            poolId: pool.id,
            shares: pool.balance || '0',
            assetA: {
              code: assetA.asset === 'native' ? 'XLM' : assetA.asset.split(':')[0],
              issuer: assetA.asset === 'native' ? undefined : assetA.asset.split(':')[1],
            },
            assetB: {
              code: assetB.asset === 'native' ? 'XLM' : assetB.asset.split(':')[0],
              issuer: assetB.asset === 'native' ? undefined : assetB.asset.split(':')[1],
            },
            reserveA: assetA.amount,
            reserveB: assetB.amount,
            fee: details.fee_bp / 100, // Convert basis points to percentage
          };
        })
      );
      
      setPositions(positionsWithDetails.filter(Boolean) as PoolPosition[]);
    } catch (error) {
      console.error('Failed to fetch LP positions:', error);
    } finally {
      setLoading(false);
    }
  }, [activeWallet]);

  useEffect(() => {
    if (mounted && activeWallet) {
      fetchPositions();
    }
  }, [mounted, activeWallet, fetchPositions]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!selectedPool || !amountA || !amountB) return;
    setPendingAction('deposit');
    setShowPasswordModal(true);
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!selectedPool || !withdrawAmount) return;
    setPendingAction('withdraw');
    setShowPasswordModal(true);
  };

  // Execute transaction after password
  const executeTransaction = async () => {
    if (!activeWallet || !password || !pendingAction || !selectedPool) return;
    
    setShowPasswordModal(false);
    setIsSubmitting(true);
    setTxResult(null);
    
    try {
      const secret = await decryptSecret(activeWallet.encryptedSecret, password);
      if (!secret) {
        setTxResult({ success: false, message: 'Invalid password' });
        setIsSubmitting(false);
        return;
      }
      
      let result;
      
      if (pendingAction === 'deposit') {
        // Calculate price bounds with slippage
        const slippageFactor = parseFloat(slippage) / 100;
        const priceRatio = parseFloat(amountA) / parseFloat(amountB);
        const minPrice = { n: Math.floor(priceRatio * (1 - slippageFactor) * 10000000), d: 10000000 };
        const maxPrice = { n: Math.ceil(priceRatio * (1 + slippageFactor) * 10000000), d: 10000000 };
        
        result = await depositToLiquidityPool(
          secret,
          selectedPool.poolId,
          amountA,
          amountB,
          minPrice,
          maxPrice
        );
      } else {
        // Withdraw with 0 minimum (accept any amount)
        result = await withdrawFromLiquidityPool(
          secret,
          selectedPool.poolId,
          withdrawAmount,
          '0',
          '0'
        );
      }
      
      if (result.success) {
        setTxResult({ success: true, message: `Transaction successful! Hash: ${result.hash?.slice(0, 8)}...` });
        setActiveModal(null);
        setAmountA('');
        setAmountB('');
        setWithdrawAmount('');
        // Refresh positions and balances
        fetchPositions();
        if (activeWallet) {
          updateBalances(activeWallet.id);
        }
      } else {
        setTxResult({ success: false, message: result.error || 'Transaction failed' });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Transaction failed' });
    } finally {
      setIsSubmitting(false);
      setPassword('');
      setPendingAction(null);
    }
  };

  // Format number for display
  const formatNumber = (value: string, decimals = 4) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(decimals);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/exchange">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Droplets className="w-6 h-6 text-primary" />
                Liquidity Pools
              </h1>
              <p className="text-sm text-muted-foreground">Provide liquidity and earn fees</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchPositions}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <WalletSelectorDropdown />
          </div>
        </div>

        {/* Wallet Check */}
        {!activeWallet ? (
          <div className="glow-border rounded-lg p-8 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Wallet Selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please select or create a wallet to manage liquidity pools.
            </p>
            <Link href="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Transaction Result */}
            {txResult && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
                txResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'
              }`}>
                {txResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                <span className={txResult.success ? 'text-green-500' : 'text-destructive'}>
                  {txResult.message}
                </span>
                <button 
                  onClick={() => setTxResult(null)}
                  className="ml-auto hover:opacity-70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Info Banner */}
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">How Liquidity Pools Work</p>
                <p className="text-muted-foreground">
                  Deposit two assets in equal value to earn trading fees. Your share of the pool 
                  determines your portion of fees. Withdraw anytime to reclaim your assets.
                </p>
              </div>
            </div>

            {/* Your Positions */}
            <div className="glow-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-background/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your LP Positions</h2>
                  <span className="text-sm text-muted-foreground">
                    {positions.length} pool{positions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading positions...</p>
                </div>
              ) : positions.length === 0 ? (
                <div className="p-8 text-center">
                  <Droplets className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-lg font-medium mb-1">No LP Positions</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You don&apos;t have any liquidity pool shares yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To deposit, you need to establish a trustline to a liquidity pool first via the Stellar network.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {positions.map((position) => (
                    <div key={position.poolId} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold border-2 border-background">
                              {position.assetA.code.slice(0, 2)}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold border-2 border-background">
                              {position.assetB.code.slice(0, 2)}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {position.assetA.code} / {position.assetB.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Fee: {position.fee}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono">{formatNumber(position.shares)} shares</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-muted-foreground text-xs">Pool Reserve A</p>
                          <p className="font-mono">{formatNumber(position.reserveA)} {position.assetA.code}</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-muted-foreground text-xs">Pool Reserve B</p>
                          <p className="font-mono">{formatNumber(position.reserveB)} {position.assetB.code}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedPool(position);
                            setActiveModal('deposit');
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Deposit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedPool(position);
                            setActiveModal('withdraw');
                          }}
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Deposit Modal */}
      {activeModal === 'deposit' && selectedPool && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sidebar border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Deposit to Pool</h3>
              <button onClick={() => setActiveModal(null)}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {selectedPool.assetA.code} / {selectedPool.assetB.code} Pool
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Amount {selectedPool.assetA.code}
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Amount {selectedPool.assetB.code}
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Slippage Tolerance (%)
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleDeposit}
                disabled={!amountA || !amountB || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Deposit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {activeModal === 'withdraw' && selectedPool && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sidebar border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Withdraw from Pool</h3>
              <button onClick={() => setActiveModal(null)}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {selectedPool.assetA.code} / {selectedPool.assetB.code} Pool
            </p>
            
            <div className="mb-4 p-3 bg-background/50 rounded">
              <p className="text-sm text-muted-foreground">Your shares</p>
              <p className="text-lg font-mono">{formatNumber(selectedPool.shares)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Shares to Withdraw
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setWithdrawAmount(
                        (parseFloat(selectedPool.shares) * pct / 100).toFixed(7)
                      )}
                      className="flex-1 text-xs py-1 rounded border border-primary/50 text-primary hover:bg-primary/10"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Withdraw'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-sidebar border border-border rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-4">Enter Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your wallet password to sign the transaction.
            </p>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeTransaction()}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPendingAction(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={executeTransaction}
                disabled={!password}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
