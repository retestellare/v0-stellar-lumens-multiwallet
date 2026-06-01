'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  createLiquidityPool,
  decryptSecret,
  getIssuerTokenIcon
} from '@/lib/stellar-utils';
import { 
  ArrowLeft, 
  Droplets, 
  Plus,
  Loader2, 
  AlertCircle,
  CheckCircle2,
  X,
  Wallet,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { TokenSelectorModal } from '@/components/token-selector-modal';

interface SelectedAsset {
  code: string;
  issuer?: string;
  image?: string;
}

// Token icon component with fallback
function TokenIcon({ code, issuer, className = "w-10 h-10" }: { code: string; issuer?: string; className?: string }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchIcon = async () => {
      if (code === 'XLM') {
        setIconUrl('https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png');
        return;
      }
      const url = await getIssuerTokenIcon(code, issuer || '');
      if (!cancelled && url) {
        setIconUrl(url);
      }
    };
    
    fetchIcon();
    return () => { cancelled = true; };
  }, [code, issuer]);
  
  return (
    <div className={`${className} rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold border-2 border-primary/30 overflow-hidden`}>
      {iconUrl && !imageError ? (
        <img 
          src={iconUrl} 
          alt={code} 
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{code?.slice(0, 2) || '??'}</span>
      )}
    </div>
  );
}

export default function CreatePoolPage() {
  const router = useRouter();
  const { wallets, activeWalletId, updateBalances } = useWallet();
  const [mounted, setMounted] = useState(false);
  
  // Asset selection
  const [assetA, setAssetA] = useState<SelectedAsset | null>(null);
  const [assetB, setAssetB] = useState<SelectedAsset | null>(null);
  const [selectingAsset, setSelectingAsset] = useState<'A' | 'B' | null>(null);
  
  // Amounts
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  
  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string; poolId?: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  
  const activeWallet = wallets.find(w => w.id === activeWalletId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectAsset = (asset: { code: string; issuer?: string; image?: string }) => {
    if (selectingAsset === 'A') {
      setAssetA(asset);
    } else if (selectingAsset === 'B') {
      setAssetB(asset);
    }
    setSelectingAsset(null);
  };

  const handleCreatePool = () => {
    if (!assetA || !assetB || !amountA || !amountB) return;
    setShowPasswordModal(true);
  };

  const executeCreatePool = async () => {
    if (!activeWallet || !password || !assetA || !assetB) return;
    
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
      
      const result = await createLiquidityPool(
        secret,
        assetA.code,
        assetA.issuer || '',
        assetB.code,
        assetB.issuer || '',
        amountA,
        amountB
      );
      
      if (result.success) {
        setTxResult({ 
          success: true, 
          message: `Pool created successfully! TX: ${result.hash?.slice(0, 8)}...`,
          poolId: result.poolId
        });
        if (activeWallet) {
          updateBalances(activeWallet.id);
        }
        // Reset form
        setAssetA(null);
        setAssetB(null);
        setAmountA('');
        setAmountB('');
      } else {
        setTxResult({ success: false, message: result.error || 'Failed to create pool' });
      }
    } catch (error: any) {
      setTxResult({ success: false, message: error.message || 'Transaction failed' });
    } finally {
      setIsSubmitting(false);
      setPassword('');
    }
  };

  const canCreate = assetA && assetB && amountA && amountB && 
    parseFloat(amountA) > 0 && parseFloat(amountB) > 0 &&
    (assetA.code !== assetB.code || assetA.issuer !== assetB.issuer);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/pools">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" />
              Create Liquidity Pool
            </h1>
            <p className="text-sm text-muted-foreground">Add liquidity to create a new pool</p>
          </div>
        </div>

        {/* Wallet Check */}
        {!activeWallet ? (
          <div className="border border-primary/20 rounded-lg p-8 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Wallet Selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a wallet to create a liquidity pool.
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
                <div className="flex-1">
                  <span className={txResult.success ? 'text-green-500' : 'text-destructive'}>
                    {txResult.message}
                  </span>
                  {txResult.success && (
                    <div className="mt-2">
                      <Link href="/pools">
                        <Button size="sm" variant="outline">View Your Pools</Button>
                      </Link>
                    </div>
                  )}
                </div>
                <button onClick={() => setTxResult(null)} className="hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Create Pool Form */}
            <div className="border border-primary/20 rounded-lg p-6 space-y-6">
              {/* Asset A */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">First Asset</label>
                <button
                  onClick={() => setSelectingAsset('A')}
                  className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:border-primary/60 transition-colors bg-card"
                >
                  {assetA ? (
                    <>
                      <TokenIcon code={assetA.code} issuer={assetA.issuer} />
                      <div className="text-left">
                        <p className="font-semibold">{assetA.code}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assetA.issuer ? `${assetA.issuer.substring(0, 12)}...` : 'Native'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Search className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-muted-foreground">Select first asset</span>
                    </>
                  )}
                </button>
                {assetA && (
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Asset B */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Second Asset</label>
                <button
                  onClick={() => setSelectingAsset('B')}
                  className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:border-primary/60 transition-colors bg-card"
                >
                  {assetB ? (
                    <>
                      <TokenIcon code={assetB.code} issuer={assetB.issuer} />
                      <div className="text-left">
                        <p className="font-semibold">{assetB.code}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assetB.issuer ? `${assetB.issuer.substring(0, 12)}...` : 'Native'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Search className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-muted-foreground">Select second asset</span>
                    </>
                  )}
                </button>
                {assetB && (
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Same asset warning */}
              {assetA && assetB && assetA.code === assetB.code && assetA.issuer === assetB.issuer && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Cannot create a pool with the same asset on both sides
                </div>
              )}

              {/* Create Button */}
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!canCreate || isSubmitting}
                onClick={handleCreatePool}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Pool...
                  </>
                ) : (
                  <>
                    <Droplets className="w-4 h-4 mr-2" />
                    Create Pool
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Token Selector Modal */}
      {selectingAsset && (
        <TokenSelectorModal
          isOpen={true}
          onClose={() => setSelectingAsset(null)}
          onSelect={handleSelectAsset}
          walletBalances={activeWallet?.balances || []}
          type={selectingAsset === 'A' ? 'selling' : 'buying'}
        />
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/20 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Enter Password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your wallet password to create the liquidity pool.
            </p>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCreatePool()}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={executeCreatePool} disabled={!password}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
