'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';
import { 
  getLiquidityPoolDetails, 
  depositToLiquidityPool, 
  withdrawFromLiquidityPool,
  decryptSecret,
  getAccountBalances
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
  Wallet,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface PoolShare {
  liquidity_pool_id: string;
  balance: string;
  // Enriched data from pool details
  assetA?: { code: string; issuer?: string };
  assetB?: { code: string; issuer?: string };
  reserveA?: string;
  reserveB?: string;
  fee?: number;
  totalShares?: string;
}

export default function PoolsPage() {
  const { wallets, activeWalletId, updateBalances } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [poolShares, setPoolShares] = useState<PoolShare[]>([]);
  
  // Modal state
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [selectedPool, setSelectedPool] = useState<PoolShare | null>(null);
  
  // Form state
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<'deposit' | 'withdraw' | null>(null);
  
  // Pool reserves for auto-calculation
  const [poolReserves, setPoolReserves] = useState<{ reserveA: number; reserveB: number } | null>(null);
  const [reservesLoading, setReservesLoading] = useState(false);
  const [reservesError, setReservesError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'amountA' | 'amountB' | null>(null);

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // RESET: Read LP shares directly from wallet.balances array
  const fetchPoolShares = useCallback(async () => {
    if (!activeWallet) {
      setPoolShares([]);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch fresh balances from Horizon
      const balances = await getAccountBalances(activeWallet.publicKey);
      
      // Filter for liquidity_pool_shares type
      const lpShares = balances.filter((b: any) => b.asset_type === 'liquidity_pool_shares');
      
      console.log('[v0] Found LP shares in balances:', lpShares);
      
      if (lpShares.length === 0) {
        setPoolShares([]);
        setLoading(false);
        return;
      }
      
      // Enrich each LP share with pool details
      const enrichedShares = await Promise.all(
        lpShares.map(async (share: any) => {
          const poolId = share.liquidity_pool_id;
          const details = await getLiquidityPoolDetails(poolId);
          
          if (!details) {
            return {
              liquidity_pool_id: poolId,
              balance: share.balance,
            };
          }
          
          const reserveA = details.reserves?.[0];
          const reserveB = details.reserves?.[1];
          
          return {
            liquidity_pool_id: poolId,
            balance: share.balance,
            assetA: reserveA ? {
              code: reserveA.asset === 'native' ? 'XLM' : reserveA.asset.split(':')[0],
              issuer: reserveA.asset === 'native' ? undefined : reserveA.asset.split(':')[1],
            } : undefined,
            assetB: reserveB ? {
              code: reserveB.asset === 'native' ? 'XLM' : reserveB.asset.split(':')[0],
              issuer: reserveB.asset === 'native' ? undefined : reserveB.asset.split(':')[1],
            } : undefined,
            reserveA: reserveA?.amount,
            reserveB: reserveB?.amount,
            fee: details.fee_bp ? details.fee_bp / 100 : 0.3,
            totalShares: details.total_shares,
          };
        })
      );
      
      setPoolShares(enrichedShares);
    } catch (error) {
      console.error('[v0] Error fetching pool shares:', error);
      setPoolShares([]);
    } finally {
      setLoading(false);
    }
  }, [activeWallet]);

  useEffect(() => {
    if (mounted && activeWallet) {
      fetchPoolShares();
    }
  }, [mounted, activeWallet, fetchPoolShares]);

  // Fetch pool reserves when deposit modal opens
  useEffect(() => {
    const fetchReserves = async () => {
      if (activeModal !== 'deposit' || !selectedPool) {
        setPoolReserves(null);
        setReservesError(null);
        return;
      }

      setReservesLoading(true);
      setReservesError(null);
      
      try {
        const details = await getLiquidityPoolDetails(selectedPool.liquidity_pool_id);
        
        if (!details.reserves || details.reserves.length < 2) {
          setReservesError('Unable to fetch pool reserves');
          setPoolReserves(null);
          return;
        }

        const reserveA = parseFloat(details.reserves[0].amount);
        const reserveB = parseFloat(details.reserves[1].amount);

        if (reserveA === 0 || reserveB === 0) {
          setReservesError('Pool has zero reserves - manual entry required');
          setPoolReserves(null);
        } else {
          setPoolReserves({ reserveA, reserveB });
        }
      } catch (error) {
        console.error('[v0] Error fetching pool reserves:', error);
        setReservesError('Failed to fetch pool reserves');
        setPoolReserves(null);
      } finally {
        setReservesLoading(false);
      }
    };

    fetchReserves();
  }, [activeModal, selectedPool]);

  // Auto-calculate amountB when amountA changes
  useEffect(() => {
    if (editingField !== 'amountA' || !poolReserves || !amountA) {
      return;
    }

    const userAmount = parseFloat(amountA);
    if (isNaN(userAmount) || userAmount <= 0) {
      setAmountB('');
      return;
    }

    // Calculate: amountB = amountA × (reserveB / reserveA)
    const ratio = poolReserves.reserveB / poolReserves.reserveA;
    const calculatedB = (userAmount * ratio).toFixed(7);
    setAmountB(calculatedB);
  }, [amountA, poolReserves, editingField]);

  // Auto-calculate amountA when amountB changes
  useEffect(() => {
    if (editingField !== 'amountB' || !poolReserves || !amountB) {
      return;
    }

    const userAmount = parseFloat(amountB);
    if (isNaN(userAmount) || userAmount <= 0) {
      setAmountA('');
      return;
    }

    // Calculate: amountA = amountB × (reserveA / reserveB)
    const ratio = poolReserves.reserveA / poolReserves.reserveB;
    const calculatedA = (userAmount * ratio).toFixed(7);
    setAmountA(calculatedA);
  }, [amountB, poolReserves, editingField]);

  // Reset form when modal closes or pool changes
  useEffect(() => {
    if (activeModal !== 'deposit') {
      setAmountA('');
      setAmountB('');
      setEditingField(null);
    }
  }, [activeModal]);
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
        const slippageFactor = parseFloat(slippage) / 100;
        const priceRatio = parseFloat(amountA) / parseFloat(amountB);
        const minPrice = { n: Math.floor(priceRatio * (1 - slippageFactor) * 10000000), d: 10000000 };
        const maxPrice = { n: Math.ceil(priceRatio * (1 + slippageFactor) * 10000000), d: 10000000 };
        
        result = await depositToLiquidityPool(
          secret,
          selectedPool.liquidity_pool_id,
          amountA,
          amountB,
          minPrice,
          maxPrice
        );
      } else {
        result = await withdrawFromLiquidityPool(
          secret,
          selectedPool.liquidity_pool_id,
          withdrawAmount,
          '0',
          '0'
        );
      }
      
      if (result.success) {
        setTxResult({ success: true, message: `Success! TX: ${result.hash?.slice(0, 8)}...` });
        setActiveModal(null);
        setAmountA('');
        setAmountB('');
        setWithdrawAmount('');
        fetchPoolShares();
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

  const formatNumber = (value: string | undefined, decimals = 4) => {
    if (!value) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(decimals);
  };

  const truncatePoolId = (id: string) => {
    return `${id.slice(0, 8)}...${id.slice(-8)}`;
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
              <p className="text-sm text-muted-foreground">Your LP positions from wallet balances</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchPoolShares}
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
              Select a wallet to view your liquidity pool positions.
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
                <button onClick={() => setTxResult(null)} className="ml-auto hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Info Banner */}
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Reading from Wallet Balances</p>
                <p className="text-muted-foreground">
                  LP shares are stored in your wallet as asset_type: liquidity_pool_shares. 
                  This page reads directly from your balance data.
                </p>
              </div>
            </div>

            {/* Your LP Shares */}
            <div className="glow-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-background/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your LP Shares</h2>
                  <span className="text-sm text-muted-foreground">
                    {poolShares.length} position{poolShares.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading LP shares from wallet...</p>
                </div>
              ) : poolShares.length === 0 ? (
                <div className="p-8 text-center">
                  <Droplets className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-lg font-medium mb-1">No LP Positions Found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    No liquidity_pool_shares found in wallet balances.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add liquidity to a pool via StellarX, StellarTerm, or other DEX interfaces.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {poolShares.map((pool) => (
                    <div key={pool.liquidity_pool_id} className="p-4 hover:bg-muted/30 transition-colors">
                      {/* Pool Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold border-2 border-background">
                              {pool.assetA?.code?.slice(0, 2) || '??'}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold border-2 border-background">
                              {pool.assetB?.code?.slice(0, 2) || '??'}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {pool.assetA?.code || '?'} / {pool.assetB?.code || '?'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Fee: {pool.fee || 0.3}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono font-bold text-primary">{formatNumber(pool.balance)}</p>
                          <p className="text-xs text-muted-foreground">shares</p>
                        </div>
                      </div>
                      
                      {/* Pool ID */}
                      <div className="mb-3 p-2 bg-background/50 rounded text-xs">
                        <span className="text-muted-foreground">Pool ID: </span>
                        <code className="font-mono text-foreground">{truncatePoolId(pool.liquidity_pool_id)}</code>
                        <a 
                          href={`https://stellar.expert/explorer/public/liquidity-pool/${pool.liquidity_pool_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      {/* Reserves */}
                      {pool.reserveA && pool.reserveB && (
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div className="bg-background/50 rounded p-2">
                            <p className="text-muted-foreground text-xs">Reserve {pool.assetA?.code}</p>
                            <p className="font-mono">{formatNumber(pool.reserveA)}</p>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <p className="text-muted-foreground text-xs">Reserve {pool.assetB?.code}</p>
                            <p className="font-mono">{formatNumber(pool.reserveB)}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedPool(pool);
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
                            setSelectedPool(pool);
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
              {selectedPool.assetA?.code || '?'} / {selectedPool.assetB?.code || '?'} Pool
            </p>
            
            {/* Pool Reserves Info */}
            {reservesLoading && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-400">Fetching pool reserves...</p>
              </div>
            )}
            
            {reservesError && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400">{reservesError}</p>
              </div>
            )}
            
            {poolReserves && !reservesError && (
              <div className="mb-4 p-3 bg-background/50 rounded border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Reserve Ratio</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono">
                    <span className="text-foreground font-bold">{poolReserves.reserveA.toFixed(2)}</span>
                    <span className="text-muted-foreground"> {selectedPool.assetA?.code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">/</div>
                  <div className="text-xs font-mono">
                    <span className="text-foreground font-bold">{poolReserves.reserveB.toFixed(2)}</span>
                    <span className="text-muted-foreground"> {selectedPool.assetB?.code}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-muted-foreground">
                    Amount {selectedPool.assetA?.code || 'A'}
                  </label>
                  {editingField === 'amountA' && poolReserves && !reservesError && (
                    <span className="text-xs text-primary">Editing</span>
                  )}
                  {editingField === 'amountB' && poolReserves && !reservesError && amountA && (
                    <span className="text-xs text-muted-foreground">Auto</span>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountA}
                  onChange={(e) => {
                    setAmountA(e.target.value);
                    setEditingField('amountA');
                  }}
                  onBlur={() => setEditingField(null)}
                  disabled={reservesLoading}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-muted-foreground">
                    Amount {selectedPool.assetB?.code || 'B'}
                  </label>
                  {editingField === 'amountB' && poolReserves && !reservesError && (
                    <span className="text-xs text-primary">Editing</span>
                  )}
                  {editingField === 'amountA' && poolReserves && !reservesError && amountB && (
                    <span className="text-xs text-muted-foreground">Auto</span>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountB}
                  onChange={(e) => {
                    setAmountB(e.target.value);
                    setEditingField('amountB');
                  }}
                  onBlur={() => setEditingField(null)}
                  disabled={reservesLoading}
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
              {selectedPool.assetA?.code || '?'} / {selectedPool.assetB?.code || '?'} Pool
            </p>
            
            <div className="mb-4 p-3 bg-background/50 rounded">
              <p className="text-sm text-muted-foreground">Your shares</p>
              <p className="text-lg font-mono font-bold">{formatNumber(selectedPool.balance)}</p>
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
                        (parseFloat(selectedPool.balance) * pct / 100).toFixed(7)
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
              Enter your wallet password to sign this transaction.
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
