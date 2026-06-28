'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectorDropdown } from '@/components/wallet-selector-dropdown';
import { TokenSelectorModal } from '@/components/token-selector-modal';
import { 
  decryptSecret,
  getIssuerTokenIcon
} from '@/lib/stellar-utils';
import { 
  ArrowLeft, 
  Droplets, 
  Plus, 
  Loader2, 
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import * as StellarSdk from '@stellar/stellar-sdk';

// Define asset type for selected tokens
interface SelectedAsset {
  code: string;
  issuer: string;
  name?: string;
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
      if (issuer) {
        const url = await getIssuerTokenIcon(code, issuer);
        if (!cancelled && url) {
          setIconUrl(url);
        }
      }
    };
    
    fetchIcon();
    return () => { cancelled = true; };
  }, [code, issuer]);
  
  return (
    <div className={`${className} rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold border-2 border-background overflow-hidden`}>
      {iconUrl && !imageError ? (
        <img 
          src={iconUrl} 
          alt={code} 
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{code?.slice(0, 3) || '?'}</span>
      )}
    </div>
  );
}

export default function CreatePoolPage() {
  const { wallets, activeWalletId, updateBalances } = useWallet();
  const activeWallet = wallets.find(w => w.id === activeWalletId);
  
  // Safe initial states - null for unselected assets
  const [assetA, setAssetA] = useState<SelectedAsset | null>(null);
  const [assetB, setAssetB] = useState<SelectedAsset | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [password, setPassword] = useState('');
  const [selectingAsset, setSelectingAsset] = useState<'A' | 'B' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  // Check if form is valid for submission
  const isFormValid = assetA !== null && 
                       assetB !== null && 
                       parseFloat(amountA) > 0 && 
                       parseFloat(amountB) > 0 && 
                       password.length > 0;

  // Handle asset selection from modal
  const handleSelectAsset = useCallback((token: { code: string; issuer?: string; name?: string; image?: string }) => {
    const asset: SelectedAsset = {
      code: token.code,
      issuer: token.issuer || '',
      name: token.name,
      image: token.image
    };
    
    if (selectingAsset === 'A') {
      setAssetA(asset);
    } else if (selectingAsset === 'B') {
      setAssetB(asset);
    }
    setSelectingAsset(null);
    setErrorMessage(''); // Clear any previous errors
  }, [selectingAsset]);

  // Create liquidity pool with robust error handling
  const handleCreatePool = async () => {
    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');
    
    // Validation checks
    if (!activeWallet) {
      setErrorMessage('No wallet selected. Please select a wallet first.');
      return;
    }
    
    if (!assetA || !assetB) {
      setErrorMessage('Please select both assets before creating a pool.');
      return;
    }
    
    if (assetA.code === assetB.code && assetA.issuer === assetB.issuer) {
      setErrorMessage('Cannot create a pool with the same asset on both sides.');
      return;
    }
    
    const amtA = parseFloat(amountA);
    const amtB = parseFloat(amountB);
    
    if (isNaN(amtA) || amtA <= 0) {
      setErrorMessage('Please enter a valid amount for the first asset.');
      return;
    }
    
    if (isNaN(amtB) || amtB <= 0) {
      setErrorMessage('Please enter a valid amount for the second asset.');
      return;
    }
    
    if (!password) {
      setErrorMessage('Please enter your wallet password.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Decrypt the secret key
      let secretKey: string;
      try {
        secretKey = decryptSecret(activeWallet.encryptedSecret, password);
      } catch (decryptError) {
        setErrorMessage('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }
      
      // Create Stellar SDK objects
      const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const sourcePublicKey = keypair.publicKey();
      
      // Load account
      let account;
      try {
        account = await server.loadAccount(sourcePublicKey);
      } catch (loadError: any) {
        setErrorMessage(`Failed to load account: ${loadError.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      // Create asset objects
      const stellarAssetA = assetA.issuer 
        ? new StellarSdk.Asset(assetA.code, assetA.issuer)
        : StellarSdk.Asset.native();
      const stellarAssetB = assetB.issuer 
        ? new StellarSdk.Asset(assetB.code, assetB.issuer)
        : StellarSdk.Asset.native();
      
      // Order assets properly for Stellar liquidity pools
      let orderedAssetA = stellarAssetA;
      let orderedAssetB = stellarAssetB;
      let orderedAmountA = amountA;
      let orderedAmountB = amountB;
      
      // Stellar requires assets in a specific order
      if (StellarSdk.Asset.compare(stellarAssetA, stellarAssetB) > 0) {
        orderedAssetA = stellarAssetB;
        orderedAssetB = stellarAssetA;
        orderedAmountA = amountB;
        orderedAmountB = amountA;
      }
      
      // Create the liquidity pool asset
      const lpAsset = new StellarSdk.LiquidityPoolAsset(
        orderedAssetA,
        orderedAssetB,
        StellarSdk.LiquidityPoolFeeV18
      );
      
      // Get the pool ID
      const poolId = StellarSdk.getLiquidityPoolId(
        'constant_product',
        lpAsset.getLiquidityPoolParameters()
      ).toString('hex');
      
      // Build transaction
      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      });
      
      // Add trust line for the liquidity pool share asset
      transactionBuilder.addOperation(
        StellarSdk.Operation.changeTrust({
          asset: lpAsset,
        })
      );
      
      // Calculate price bounds (allow reasonable slippage for initial deposit)
      const priceRatio = parseFloat(orderedAmountA) / parseFloat(orderedAmountB);
      const minPrice = { n: Math.floor(priceRatio * 0.5 * 10000000), d: 10000000 };
      const maxPrice = { n: Math.ceil(priceRatio * 2.0 * 10000000), d: 10000000 };
      
      // Add deposit operation
      transactionBuilder.addOperation(
        StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: orderedAmountA,
          maxAmountB: orderedAmountB,
          minPrice: minPrice,
          maxPrice: maxPrice,
        })
      );
      
      const transaction = transactionBuilder.setTimeout(180).build();
      transaction.sign(keypair);
      
      // Submit transaction to the REAL Stellar network
      let result;
      try {
        result = await server.submitTransaction(transaction);
      } catch (submitError: any) {
        // Handle submission errors specifically
        let message = 'Transaction submission failed.';
        
        if (submitError.response?.data?.extras?.result_codes) {
          const codes = submitError.response.data.extras.result_codes;
          const opCode = codes.operations?.[0] || codes.transaction;
          
          // Translate common error codes
          switch (opCode) {
            case 'op_underfunded':
              message = 'Insufficient balance. Please check you have enough of both assets.';
              break;
            case 'op_line_full':
              message = 'Trust line is full. Cannot hold more of this asset.';
              break;
            case 'op_no_trust':
              message = 'Trust line required. Please add a trust line for the asset first.';
              break;
            case 'op_low_reserve':
              message = 'Account reserve too low. You need more XLM to cover the reserve.';
              break;
            case 'op_bad_price':
              message = 'Price out of range. The market price has moved significantly.';
              break;
            case 'tx_bad_auth':
              message = 'Authentication failed. Please check your password.';
              break;
            case 'tx_insufficient_fee':
              message = 'Insufficient fee. Network is busy, please try again.';
              break;
            default:
              message = `Transaction failed: ${opCode || submitError.message}`;
          }
        } else if (submitError.message) {
          message = submitError.message;
        }
        
        setErrorMessage(message);
        setLoading(false);
        return;
      }
      
      // Transaction was successful - extract the hash from the real result
      const txHashValue = result.hash;
      setTxHash(txHashValue);
      setSuccessMessage(`Liquidity pool created successfully! Your LP shares have been added to your wallet.`);
      setPassword('');
      
      // Reset form after success
      setAssetA(null);
      setAssetB(null);
      setAmountA('');
      setAmountB('');
      
      // Refresh wallet balances to show the new LP shares
      if (activeWallet?.id) {
        try {
          await updateBalances(activeWallet.id);
        } catch (refreshError) {
          // Silently handle refresh error - the transaction succeeded
          console.log('[v0] Balance refresh after pool creation:', refreshError);
        }
      }
      
    } catch (error: any) {
      // Catch any unexpected errors
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/pools">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">Create Liquidity Pool</h1>
              </div>
              <p className="text-sm text-muted-foreground">Add liquidity to create a new pool</p>
            </div>
          </div>
          <WalletSelectorDropdown />
        </div>
        
        {/* No Wallet Warning */}
        {!activeWallet && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-yellow-500" />
              <p className="text-yellow-500 font-medium">No Wallet Selected</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Please select or create a wallet to create a liquidity pool.
            </p>
          </div>
        )}
        
        {/* Main Form Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          {/* First Asset */}
          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">First Asset</label>
            <button
              onClick={() => setSelectingAsset('A')}
              disabled={!activeWallet}
              className="w-full flex items-center gap-3 p-3 bg-background border border-primary/30 rounded-lg hover:border-primary/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assetA ? (
                <>
                  <TokenIcon code={assetA.code} issuer={assetA.issuer} className="w-10 h-10" />
                  <div className="text-left">
                    <p className="font-semibold">{assetA.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {assetA.issuer ? `${assetA.issuer.slice(0, 8)}...` : 'Native'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Select first asset</span>
                </>
              )}
            </button>
            
            {assetA && (
              <Input
                type="number"
                placeholder="0.00"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="mt-2 bg-background"
                min="0"
                step="any"
              />
            )}
          </div>
          
          {/* Plus Icon Divider */}
          <div className="flex justify-center my-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          {/* Second Asset */}
          <div className="mb-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Second Asset</label>
            <button
              onClick={() => setSelectingAsset('B')}
              disabled={!activeWallet}
              className="w-full flex items-center gap-3 p-3 bg-background border border-primary/30 rounded-lg hover:border-primary/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assetB ? (
                <>
                  <TokenIcon code={assetB.code} issuer={assetB.issuer} className="w-10 h-10" />
                  <div className="text-left">
                    <p className="font-semibold">{assetB.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {assetB.issuer ? `${assetB.issuer.slice(0, 8)}...` : 'Native'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground">Select second asset</span>
                </>
              )}
            </button>
            
            {assetB && (
              <Input
                type="number"
                placeholder="0.00"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="mt-2 bg-background"
                min="0"
                step="any"
              />
            )}
          </div>
          
          {/* Password Input - only show when both assets selected */}
          {assetA && assetB && (
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Wallet Password</label>
              <Input
                type="password"
                placeholder="Enter your wallet password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background"
                autoComplete="current-password"
              />
            </div>
          )}
          
          {/* Create Pool Button - always visible, disabled when form invalid */}
          <Button
            onClick={handleCreatePool}
            disabled={!isFormValid || loading || !activeWallet}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 py-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Pool...
              </>
            ) : (
              <>
                <Droplets className="w-5 h-5" />
                Create Pool
              </>
            )}
          </Button>
          
          {/* Error Message - displayed below button */}
          {errorMessage && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-500 font-medium text-sm">{errorMessage}</p>
                  <button 
                    onClick={() => setErrorMessage('')}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-500 font-medium text-sm">{successMessage}</p>
                  {txHash && (
                    <a 
                      href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Info Card */}
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-blue-400 mb-1">About Liquidity Pools</p>
              <p>Creating a pool requires depositing both assets. You will receive LP shares representing your position. Pools use a 0.3% fee that goes to liquidity providers.</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Token Selector Modal - only render when selectingAsset is set */}
      {selectingAsset !== null && activeWallet && (
        <TokenSelectorModal
          isOpen={true}
          onClose={() => setSelectingAsset(null)}
          onSelect={handleSelectAsset}
          walletBalances={activeWallet.balances || []}
          type={selectingAsset === 'A' ? 'selling' : 'buying'}
        />
      )}
    </div>
  );
}
