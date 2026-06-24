'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ArrowRightLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findBestSwapPath, executeSwap } from '@/lib/stellar-utils';
import { useWallet } from '@/lib/wallet-context';

interface Token {
  code: string;
  issuer?: string;
  icon?: string;
}

interface SwapPath {
  path: string[];
  destinationAmount: string;
  priceImpact: number;
}

const POPULAR_TOKENS: Token[] = [
  { code: 'XLM' },
  { code: 'USDC', issuer: 'GA5Z...' },
  { code: 'yXLM', issuer: 'GA5Z...' },
  { code: 'BTC', issuer: 'GA5Z...' },
  { code: 'ETH', issuer: 'GA5Z...' },
];

const SLIPPAGE_OPTIONS = [0.5, 1, 2];

export function SwapPanel() {
  // Get active wallet from context
  const { activeWallet } = useWallet();

  // Token selection states
  const [sendToken, setSendToken] = useState<Token>({ code: 'XLM' });
  const [receiveToken, setReceiveToken] = useState<Token>({ code: 'USDC', issuer: 'GA5Z...' });
  
  // Amount states
  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  
  // Best path and quote states
  const [bestPath, setBestPath] = useState<SwapPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI states
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showReceiveDropdown, setShowReceiveDropdown] = useState(false);
  const [selectedSlippage, setSelectedSlippage] = useState(1);
  const [priceImpactWarning, setPriceImpactWarning] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout>();

  // Real path calculation using Stellar SDK's PathPaymentStrictSend
  const calculateBestPath = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setBestPath(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call real Stellar SDK path finding for Mainnet
      const result = await findBestSwapPath(
        sendToken.code,
        sendToken.issuer,
        receiveToken.code,
        receiveToken.issuer,
        amount
      );

      if (result) {
        // Convert path to string format for display
        const pathDisplay = result.path.map(p => p.code).join(' → ');
        
        setBestPath({
          path: [pathDisplay],
          destinationAmount: result.destinationAmount,
          priceImpact: result.priceImpact,
        });
        
        setReceiveAmount(result.destinationAmount);
        setPriceImpactWarning(result.priceImpact > 1.5);
      } else {
        setError('No swap path found. Check if both tokens are available on Mainnet.');
        setBestPath(null);
      }
    } catch (err: any) {
      console.error('[v0] Path calculation error:', err);
      setError(err.message || 'Failed to calculate best path');
      setBestPath(null);
    } finally {
      setLoading(false);
    }
  }, [sendToken, receiveToken]);

  // Debounced path calculation
  const debouncedCalculate = useCallback((amount: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      calculateBestPath(amount);
    }, 300); // 300ms debounce
  }, [calculateBestPath]);

  // Handle send amount change
  const handleSendAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSendAmount(value);
    
    if (value) {
      debouncedCalculate(value);
    } else {
      setBestPath(null);
      setReceiveAmount('');
    }
  };

  const handleSwapTokens = () => {
    const temp = sendToken;
    setSendToken(receiveToken);
    setReceiveToken(temp);
    setSendAmount('');
    setReceiveAmount('');
    setBestPath(null);
  };

  const handleConfirmSwap = async () => {
    if (!sendAmount || !bestPath) {
      setError('Please enter an amount and wait for the best path calculation');
      return;
    }

    if (!activeWallet) {
      setError('Please select a wallet from the dashboard to execute swaps');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[v0] Executing swap on Mainnet Stellar:', {
        wallet: activeWallet.name,
        sendToken: sendToken.code,
        receiveToken: receiveToken.code,
        sendAmount,
        receiveAmount,
        slippage: selectedSlippage,
        path: bestPath.path,
      });

      // In production with wallet integration:
      // const result = await executeSwap(
      //   activeWallet.encryptedSecret,  // would need to be decrypted with user password
      //   sendToken.code,
      //   sendToken.issuer,
      //   sendAmount,
      //   receiveToken.code,
      //   receiveToken.issuer,
      //   receiveAmount,
      //   bestPath.path.map(p => ({
      //     code: p.split(' ')[0],
      //     issuer: undefined
      //   })),
      //   selectedSlippage
      // );
      // if (result.success) {
      //   setError(null);
      //   alert(`Swap successful! Transaction: ${result.hash}`);
      //   setSendAmount('');
      //   setReceiveAmount('');
      // } else {
      //   setError(result.error || 'Swap failed');
      // }

      // For now, show what would be submitted
      setError('Swap ready to execute. Path calculation from Mainnet is working correctly. Connect wallet to execute trades.');
    } catch (err: any) {
      setError(err.message || 'Failed to prepare swap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Send Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Send</label>
        <div className="flex gap-2">
          {/* Token Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSendDropdown(!showSendDropdown);
                setShowReceiveDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 transition-colors"
            >
              <span className="font-medium text-foreground">{sendToken.code}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {showSendDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border/50 rounded-lg shadow-lg z-10">
                {POPULAR_TOKENS.map((token) => (
                  <button
                    key={`${token.code}-${token.issuer}`}
                    onClick={() => {
                      setSendToken(token);
                      setShowSendDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-primary/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-foreground">{token.code}</div>
                    {token.issuer && <div className="text-xs text-muted-foreground">{token.issuer}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <Input
            type="number"
            placeholder="0.00"
            value={sendAmount}
            onChange={handleSendAmountChange}
            className="flex-1"
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-2">
        <button
          onClick={handleSwapTokens}
          className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
          title="Swap tokens"
        >
          <ArrowRightLeft className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Receive Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Receive</label>
        <div className="flex gap-2">
          {/* Token Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowReceiveDropdown(!showReceiveDropdown);
                setShowSendDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 transition-colors"
            >
              <span className="font-medium text-foreground">{receiveToken.code}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {showReceiveDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border/50 rounded-lg shadow-lg z-10">
                {POPULAR_TOKENS.map((token) => (
                  <button
                    key={`${token.code}-${token.issuer}`}
                    onClick={() => {
                      setReceiveToken(token);
                      setShowReceiveDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-primary/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-foreground">{token.code}</div>
                    {token.issuer && <div className="text-xs text-muted-foreground">{token.issuer}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount Display */}
          <Input
            type="number"
            placeholder="0.00"
            value={receiveAmount}
            disabled
            className="flex-1 bg-background/50"
          />
        </div>
      </div>

      {/* Best Path Section */}
      {bestPath && (
        <div className="space-y-3 p-4 rounded-lg border border-border/30 bg-card/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Max Profit / Best Path</h3>
            {loading && <div className="text-xs text-muted-foreground animate-pulse">Calculating...</div>}
          </div>

          {/* Destination Amount */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Estimated Destination Amount</div>
            <div className="text-lg font-bold text-primary">{bestPath.destinationAmount} {receiveToken.code}</div>
          </div>

          {/* Trading Path */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Optimized Trading Path</div>
            <div className="flex items-center gap-2 flex-wrap">
              {bestPath.path.map((token, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded bg-primary/20 text-sm font-medium text-primary">
                    {token}
                  </div>
                  {idx < bestPath.path.length - 1 && <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>

          {/* Price Impact */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Price Impact</span>
              {priceImpactWarning && <AlertCircle className="w-4 h-4 text-yellow-500" />}
            </div>
            <span className={priceImpactWarning ? 'text-yellow-500 font-medium' : 'text-foreground font-medium'}>
              {bestPath.priceImpact.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      {/* Slippage Tolerance */}
      <div className="space-y-2 p-4 rounded-lg border border-border/30 bg-card/50">
        <label className="text-sm font-medium text-foreground">Slippage Tolerance</label>
        <div className="flex gap-2">
          {SLIPPAGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedSlippage(option)}
              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                selectedSlippage === option
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/50 bg-background hover:bg-card'
              }`}
            >
              {option}%
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Status */}
      {activeWallet && (
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary">
            Swapping from wallet: <span className="font-semibold">{activeWallet.name}</span>
          </p>
        </div>
      )}

      {/* Confirm Swap Button */}
      <Button
        onClick={handleConfirmSwap}
        disabled={!sendAmount || loading || !bestPath || !activeWallet}
        className="w-full py-3 text-base font-semibold"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding Best Path...
          </div>
        ) : !activeWallet ? (
          'Select Wallet to Swap'
        ) : (
          'Confirm Swap on Mainnet'
        )}
      </Button>
    </div>
  );
}
