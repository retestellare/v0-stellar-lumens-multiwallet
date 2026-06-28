'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ArrowRightLeft, AlertCircle, Loader2, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { executeSwap, decryptSecret } from '@/lib/stellar-utils';
import { useWallet } from '@/lib/wallet-context';
import { findLobstrSwapPath, calculateLobstrSlippageAmount } from '@/lib/lobstr-swap';

interface Token {
  code: string;
  issuer?: string;
  balance?: string;
  displayBalance?: string;
}

interface SwapPath {
  path: Array<{ code: string; issuer?: string }>;
  destinationAmount: string;
  priceImpact: number;
}

const SLIPPAGE_OPTIONS = [0.5, 1, 2];

export function SwapPanel() {
  // Get active wallet from context
  const { activeWallet } = useWallet();

  // Wallet tokens and states
  const [walletTokens, setWalletTokens] = useState<Token[]>([]);
  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [receiveToken, setReceiveToken] = useState<Token | null>(null);
  
  // Amount states
  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  
  // Best path and quote states
  const [bestPath, setBestPath] = useState<SwapPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // UI states
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showReceiveDropdown, setShowReceiveDropdown] = useState(false);
  const [selectedSlippage, setSelectedSlippage] = useState(1);
  const [priceImpactWarning, setPriceImpactWarning] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [spendableBalance, setSpendableBalance] = useState<string>('0');

  const debounceTimer = useRef<NodeJS.Timeout>();
  const sendInputRef = useRef<HTMLInputElement>(null);

  // Load wallet tokens when active wallet changes
  useEffect(() => {
    if (activeWallet) {
      console.log('[v0] Loading wallet tokens from:', activeWallet.name, activeWallet.balances);
      
      const tokens: Token[] = [];
      
      if (activeWallet.balances && Array.isArray(activeWallet.balances)) {
        // Add XLM (native)
        const xlmBalance = activeWallet.balances.find((b: any) => 
          b.asset_type === 'native' || b.balance_type === 'native'
        )?.balance || '0';
        
        tokens.push({
          code: 'XLM',
          balance: xlmBalance,
          displayBalance: parseFloat(xlmBalance).toFixed(7),
        });
        
        // Add other assets (skip pool shares and native)
        for (const balance of activeWallet.balances) {
          const isNative = balance.asset_type === 'native' || balance.balance_type === 'native';
          const isPoolShare = balance.asset_type === 'liquidity_pool_shares' || balance.balance_type === 'liquidity_pool_shares';
          
          if (!isNative && !isPoolShare && balance.asset_code) {
            tokens.push({
              code: balance.asset_code,
              issuer: balance.asset_issuer,
              balance: balance.balance,
              displayBalance: parseFloat(balance.balance || '0').toFixed(7),
            });
          }
        }
      }
      
      console.log('[v0] Loaded tokens:', tokens);
      setWalletTokens(tokens);
      
      // Auto-select first token as send token
      if (tokens.length > 0) {
        setSendToken(tokens[0]);
        // Auto-select second token as receive token if available
        if (tokens.length > 1) {
          setReceiveToken(tokens[1]);
        }
      }
    }
  }, [activeWallet]);

  // Calculate spendable balance whenever sendToken changes
  // For XLM: subtract 1.5 XLM reserve estimate (base + liabilities)
  // For other tokens: use full balance
  useEffect(() => {
    if (sendToken) {
      const balance = parseFloat(sendToken.balance || '0');
      let calculatedSpendable = balance;
      
      // If XLM, account for base reserve requirement (~1.5 XLM minimum)
      if (sendToken.code === 'XLM') {
        const reserveEstimate = 1.5;
        calculatedSpendable = Math.max(0, balance - reserveEstimate);
      }
      
      console.log('[v0] Spendable balance for', sendToken.code, ':', {
        total: balance,
        spendable: calculatedSpendable,
      });
      
      setSpendableBalance(calculatedSpendable.toFixed(7));
    }
  }, [sendToken]);

  // LOBSTR-style real-time path finding using direct Horizon fetch
  const calculateBestPath = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0 || !sendToken || !receiveToken) {
      setBestPath(null);
      return;
    }

    // Check if send amount exceeds wallet balance
    const balance = parseFloat(sendToken.balance || '0');
    if (parseFloat(amount) > balance) {
      setError(`Insufficient balance. You have ${balance.toFixed(7)} ${sendToken.code}`);
      setBestPath(null);
      setReceiveAmount('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format amount to exactly 7 decimal places (Stellar requirement)
      const formattedAmount = parseFloat(amount).toFixed(7);

      console.log('[v0] Finding LOBSTR-style swap path:', {
        from: `${formattedAmount} ${sendToken.code}${sendToken.issuer ? `:${sendToken.issuer}` : ''}`,
        to: `${receiveToken.code}${receiveToken.issuer ? `:${receiveToken.issuer}` : ''}`,
      });

      // Direct Horizon fetch - no SDK constructors, LOBSTR approach
      const result = await findLobstrSwapPath(
        sendToken.code,
        sendToken.issuer,
        receiveToken.code,
        receiveToken.issuer,
        formattedAmount
      );

      if (result && result.destinationAmount) {
        console.log('[v0] Swap quote received:', {
          destinationAmount: result.destinationAmount,
          priceImpact: result.priceImpact,
        });

        setBestPath(result);
        // Display destination amount with proper formatting
        setReceiveAmount(parseFloat(result.destinationAmount).toFixed(7));
        setPriceImpactWarning(result.priceImpact > 1.5);
        setError(null);
      } else {
        setError('No liquidity available. Try a different pair or amount.');
        setBestPath(null);
        setReceiveAmount('');
      }
    } catch (err: any) {
      console.error('[v0] Path calculation error:', err);
      setError(err.message || 'Failed to find swap path on Horizon');
      setBestPath(null);
      setReceiveAmount('');
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
    }, 300);
  }, [calculateBestPath]);

  // Re-fetch quote whenever tokens change (covers page-load auto-selection,
  // manual dropdown change, and the flip button).
  // We use a short delay so the new token state has fully committed.
  useEffect(() => {
    if (sendToken && receiveToken && sendAmount && parseFloat(sendAmount) > 0) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        calculateBestPath(sendAmount);
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToken, receiveToken]);

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

  // Swap send and receive tokens — preserve the current send amount so the
  // quote re-fetches immediately for the flipped pair.
  const handleSwapTokens = () => {
    const prevSend = sendToken;
    const prevReceive = receiveToken;
    setSendToken(prevReceive);
    setReceiveToken(prevSend);
    // Keep existing send amount; the token-change useEffect will re-fetch
    setReceiveAmount('');
    setBestPath(null);
    setError(null);
  };

  // Execute swap after password confirmation
  const handleExecuteSwap = async () => {
    if (!activeWallet || !sendToken || !receiveToken || !sendAmount || !bestPath) {
      setError('Please complete all fields');
      return;
    }

    if (!walletPassword) {
      setError('Please enter your wallet password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Decrypt the secret key
      let decryptedSecret: string;
      try {
        decryptedSecret = decryptSecret(activeWallet.encryptedSecret, walletPassword);
        console.log('[v0] Secret decrypted successfully');
      } catch (err) {
        setError('Invalid password. Please try again.');
        setLoading(false);
        return;
      }

      // Format amounts with exactly 7 decimal places (Stellar requirement)
      const formattedSendAmount = parseFloat(sendAmount).toFixed(7);
      
      // LOBSTR-style slippage protection: multiply by 0.99 for 1% buffer (or user selection)
      const slippageProtectedAmount = calculateLobstrSlippageAmount(
        receiveAmount,
        selectedSlippage
      );

      console.log('[v0] Executing LOBSTR-style swap on Mainnet:', {
        wallet: activeWallet.name,
        from: `${formattedSendAmount} ${sendToken.code}${sendToken.issuer ? `:${sendToken.issuer}` : ''}`,
        to: `${receiveAmount} ${receiveToken.code}${receiveToken.issuer ? `:${receiveToken.issuer}` : ''}`,
        slippageProtected: slippageProtectedAmount,
        slippageTolerance: `${selectedSlippage}%`,
        path: bestPath.path,
      });

      // Execute the swap on Mainnet with LOBSTR slippage protection
      const result = await executeSwap(
        decryptedSecret,
        sendToken.code,
        sendToken.issuer,
        formattedSendAmount,
        receiveToken.code,
        receiveToken.issuer,
        slippageProtectedAmount,
        bestPath.path,
        selectedSlippage
      );

      if (result.success) {
        console.log('[v0] Swap successful:', result.hash);
        setError(null);
        setSuccessMessage(`Swap successful! Transaction: ${result.hash}`);
        
        // Reset form
        setSendAmount('');
        setReceiveAmount('');
        setBestPath(null);
        setShowPasswordPrompt(false);
        setWalletPassword('');
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Swap failed on Mainnet');
      }
    } catch (err: any) {
      console.error('[v0] Swap execution error:', err);
      setError(err.message || 'Failed to execute swap on Mainnet');
    } finally {
      setLoading(false);
    }
  };

  if (!activeWallet) {
    return (
      <div className="p-6 rounded-lg border border-border/50 bg-card/30 text-center">
        <p className="text-muted-foreground">Please select a wallet from the dashboard to swap tokens.</p>
      </div>
    );
  }

  if (walletTokens.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-border/50 bg-card/30 text-center">
        <p className="text-muted-foreground">Loading wallet tokens...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Swap Tokens</h2>
        <p className="text-muted-foreground">
          Trading wallet: <span className="font-semibold text-primary">{activeWallet.name}</span>
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-500">{successMessage}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Swap Interface Card */}
      <div className="p-6 rounded-lg border border-border/50 bg-card/40 space-y-4">
        {/* Send Token Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Send</label>
          <div className="flex gap-2">
            {/* Token Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  setShowSendDropdown(!showSendDropdown);
                  setShowReceiveDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-colors text-foreground"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{sendToken?.code}</span>
                    <span className="text-xs text-muted-foreground">({sendToken?.displayBalance})</span>
                  </div>
                  <span className="text-xs font-semibold text-yellow-500">Spendable: {spendableBalance}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Send Dropdown Menu */}
              {showSendDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {walletTokens.map((token) => (
                    <button
                      key={`${token.code}_${token.issuer || 'native'}`}
                      onClick={() => {
                        setSendToken(token);
                        setShowSendDropdown(false);
                        setSendAmount('');
                        setBestPath(null);
                        setReceiveAmount('');
                        setError(null);
                        // Focus input after selection
                        setTimeout(() => sendInputRef.current?.focus(), 0);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-primary/20 border-b border-border/20 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{token.code}</span>
                        <span className="text-xs text-muted-foreground">{token.displayBalance}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <Input
              ref={sendInputRef}
              type="number"
              placeholder="0.00"
              value={sendAmount}
              onChange={handleSendAmountChange}
              onFocus={() => {
                setShowSendDropdown(false);
                setShowReceiveDropdown(false);
              }}
              className="w-32 min-w-[7rem] text-right text-foreground bg-background border-border/50 placeholder:text-muted-foreground focus:ring-primary focus:border-primary font-semibold text-base"
            />
          </div>

          {/* Quick Percentage Buttons */}
          <div className="flex gap-2 px-1">
            {[25, 50, 75].map((percentage) => (
              <button
                key={percentage}
                onClick={() => {
                  const spendable = parseFloat(spendableBalance);
                  const amount = (spendable * percentage / 100).toFixed(7);
                  // Remove trailing zeros after decimal point
                  const cleanAmount = amount.replace(/\.?0+$/, '');
                  setSendAmount(cleanAmount);
                  debouncedCalculate(cleanAmount);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-semibold rounded border border-border/50 bg-background/50 text-muted-foreground hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
              >
                {percentage}%
              </button>
            ))}
            <button
              onClick={() => {
                const spendable = parseFloat(spendableBalance);
                const amount = spendable.toFixed(7);
                // Remove trailing zeros after decimal point
                const cleanAmount = amount.replace(/\.?0+$/, '');
                setSendAmount(cleanAmount);
                debouncedCalculate(cleanAmount);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded border border-border/50 bg-background/50 text-muted-foreground hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            disabled={!sendToken || !receiveToken}
            className="p-2 rounded-full border border-border/50 bg-background/50 hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            <ArrowRightLeft className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Receive Token Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Receive</label>
          <div className="flex gap-2">
            {/* Token Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  setShowReceiveDropdown(!showReceiveDropdown);
                  setShowSendDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-colors text-foreground"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{receiveToken?.code || 'Select'}</span>
                  <span className="text-xs text-muted-foreground">({receiveToken?.displayBalance || '0'})</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Receive Dropdown Menu */}
              {showReceiveDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {walletTokens.map((token) => (
                    <button
                      key={`${token.code}_${token.issuer || 'native'}_receive`}
                      onClick={() => {
                        setReceiveToken(token);
                        setShowReceiveDropdown(false);
                        setBestPath(null);
                        setReceiveAmount('');
                        setError(null);
                        // The token-change useEffect will re-fetch automatically.
                        // Just focus the amount input for UX.
                        setTimeout(() => sendInputRef.current?.focus(), 0);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-primary/20 border-b border-border/20 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{token.code}</span>
                        <span className="text-xs text-muted-foreground">{token.displayBalance}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Receive Amount Display */}
            <div className="w-32 min-w-[7rem] px-3 py-3 rounded-lg border border-border/50 bg-background/30 text-foreground font-semibold flex items-center justify-end text-base tabular-nums overflow-hidden">
              {loading
                ? <span className="text-muted-foreground text-sm">...</span>
                : <span className={receiveAmount ? 'text-foreground' : 'text-muted-foreground'}>
                    {receiveAmount
                      ? parseFloat(receiveAmount).toFixed(4)
                      : '0.0000'}
                  </span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Best Path Info */}
      {bestPath && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Estimated Amount</p>
              <p className="text-lg font-semibold text-foreground">{parseFloat(bestPath.destinationAmount).toFixed(7)} {receiveToken?.code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price Impact</p>
              <p className={`text-lg font-semibold ${priceImpactWarning ? 'text-yellow-500' : 'text-green-500'}`}>
                {bestPath.priceImpact.toFixed(2)}%
              </p>
            </div>
          </div>
          
          {bestPath.path && bestPath.path.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Optimized Trading Path</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded bg-primary/20 text-xs font-semibold text-primary">{sendToken?.code}</span>
                {bestPath.path.map((asset, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-primary">→</span>
                    <span className="px-2 py-1 rounded bg-primary/20 text-xs font-semibold text-primary">{asset.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slippage Tolerance */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Slippage Tolerance</label>
        <div className="flex gap-2">
          {SLIPPAGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedSlippage(option)}
              className={`flex-1 py-2 rounded-lg border transition-colors ${
                selectedSlippage === option
                  ? 'border-primary bg-primary/20 text-primary font-semibold'
                  : 'border-border/50 bg-background/50 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {option}%
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Swap Button */}
      <Button
        onClick={() => setShowPasswordPrompt(!showPasswordPrompt)}
        disabled={!sendAmount || !bestPath || !receiveToken || showPasswordPrompt}
        className="w-full py-3 text-base font-semibold"
      >
        {showPasswordPrompt ? (
          'Enter Password Below'
        ) : (
          'Confirm Swap on Mainnet'
        )}
      </Button>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="p-4 rounded-lg border border-border/50 bg-card/40 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-primary" />
            <p className="font-semibold text-foreground">Enter Wallet Password to Execute</p>
          </div>
          
          <Input
            type="password"
            placeholder="Wallet password"
            value={walletPassword}
            disabled={loading}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => {
              setWalletPassword(e.target.value);
              setError(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading && walletPassword) {
                handleExecuteSwap();
              }
            }}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleExecuteSwap}
              disabled={!walletPassword || loading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </div>
              ) : (
                'Execute Swap'
              )}
            </Button>
            <Button
              onClick={() => {
                setShowPasswordPrompt(false);
                setWalletPassword('');
              }}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
