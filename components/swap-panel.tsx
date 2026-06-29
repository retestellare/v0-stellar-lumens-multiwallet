'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowUpDown, AlertCircle, Loader2, CheckCircle, ChevronDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { executeSwap } from '@/lib/stellar-utils';
import { getIssuerTokenIcon } from '@/lib/stellar-utils';
import { useWallet } from '@/lib/wallet-context';
import { findLobstrSwapPath, calculateLobstrSlippageAmount } from '@/lib/lobstr-swap';
import { TokenSelectorModal } from '@/components/token-selector-modal';

interface Token {
  code: string;
  issuer?: string;
  balance?: string;
  displayBalance?: string;
  image?: string;
}

interface SwapPath {
  path: Array<{ code: string; issuer?: string }>;
  destinationAmount: string;
  priceImpact: number;
}

const SLIPPAGE_OPTIONS = [0.5, 1, 2];

// Inline token avatar that loads icons from stellar.toml / known list
function TokenAvatar({ code, issuer, size = 36 }: { code: string; issuer?: string; size?: number }) {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImgError(false);
    setIconUrl(null);
    getIssuerTokenIcon(code, issuer || '').then((url) => {
      if (!cancelled && url) setIconUrl(url);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [code, issuer]);

  const initials = code.slice(0, 2).toUpperCase();
  // Deterministic hue from code string for fallback gradient
  const hue = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: iconUrl && !imgError ? 'transparent' : `hsl(${hue},60%,45%)`,
      }}
    >
      {iconUrl && !imgError ? (
        <img
          src={iconUrl}
          alt={code}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function SwapPanel() {
  const { activeWallet, globalDecryptedSecret } = useWallet();

  const [walletTokens, setWalletTokens] = useState<Token[]>([]);
  const [sendToken, setSendToken] = useState<Token | null>(null);
  const [receiveToken, setReceiveToken] = useState<Token | null>(null);

  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');

  const [bestPath, setBestPath] = useState<SwapPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedSlippage, setSelectedSlippage] = useState(1);
  const [priceImpactWarning, setPriceImpactWarning] = useState(false);
  const [spendableBalance, setSpendableBalance] = useState<string>('0');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendInputRef = useRef<HTMLInputElement>(null);

  // Load wallet tokens when active wallet changes
  useEffect(() => {
    if (activeWallet) {
      const tokens: Token[] = [];

      if (activeWallet.balances && Array.isArray(activeWallet.balances)) {
        const xlmBalance = activeWallet.balances.find((b: any) =>
          b.asset_type === 'native' || b.balance_type === 'native'
        )?.balance || '0';

        tokens.push({
          code: 'XLM',
          balance: xlmBalance,
          displayBalance: parseFloat(xlmBalance).toFixed(7),
        });

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

      setWalletTokens(tokens);

      if (tokens.length > 0) {
        setSendToken(tokens[0]);
        if (tokens.length > 1) {
          setReceiveToken(tokens[1]);
        }
      }
    }
  }, [activeWallet]);

  // Calculate spendable balance
  useEffect(() => {
    if (sendToken) {
      const balance = parseFloat(sendToken.balance || '0');
      let calculatedSpendable = balance;
      if (sendToken.code === 'XLM') {
        calculatedSpendable = Math.max(0, balance - 1.5);
      }
      setSpendableBalance(calculatedSpendable.toFixed(7));
    }
  }, [sendToken]);

  const calculateBestPath = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0 || !sendToken || !receiveToken) {
      setBestPath(null);
      return;
    }

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
      const formattedAmount = parseFloat(amount).toFixed(7);

      const result = await findLobstrSwapPath(
        sendToken.code,
        sendToken.issuer,
        receiveToken.code,
        receiveToken.issuer,
        formattedAmount
      );

      if (result && result.destinationAmount) {
        setBestPath(result);
        setReceiveAmount(parseFloat(result.destinationAmount).toFixed(7));
        setPriceImpactWarning(result.priceImpact > 1.5);
        setError(null);
      } else {
        setError('No liquidity available. Try a different pair or amount.');
        setBestPath(null);
        setReceiveAmount('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find swap path on Horizon');
      setBestPath(null);
      setReceiveAmount('');
    } finally {
      setLoading(false);
    }
  }, [sendToken, receiveToken]);

  const debouncedCalculate = useCallback((amount: string) => {
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      calculateBestPath(amount);
    }, 300);
  }, [calculateBestPath]);

  useEffect(() => {
    if (sendToken && receiveToken && sendAmount && parseFloat(sendAmount) > 0) {
      if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        calculateBestPath(sendAmount);
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToken, receiveToken]);

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
    const prevSend = sendToken;
    const prevReceive = receiveToken;
    setSendToken(prevReceive);
    setReceiveToken(prevSend);
    setReceiveAmount('');
    setBestPath(null);
    setError(null);
  };

  const handleSetPercentage = (pct: number) => {
    const spendable = parseFloat(spendableBalance);
    const amount = (spendable * pct / 100).toFixed(7).replace(/\.?0+$/, '');
    setSendAmount(amount);
    debouncedCalculate(amount);
  };

  const handleExecuteSwap = async () => {
    if (!activeWallet || !sendToken || !receiveToken || !sendAmount || !bestPath) {
      setError('Please complete all fields');
      return;
    }

    if (!globalDecryptedSecret) {
      setError('Wallet is locked. Please restart the app to unlock.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedSendAmount = parseFloat(sendAmount).toFixed(7);
      const slippageProtectedAmount = calculateLobstrSlippageAmount(receiveAmount, selectedSlippage);

      const result = await executeSwap(
        globalDecryptedSecret,
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
        setError(null);
        setSuccessMessage(`Swap successful! Transaction: ${result.hash}`);
        setSendAmount('');
        setReceiveAmount('');
        setBestPath(null);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Swap failed on Mainnet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute swap on Mainnet');
    } finally {
      setLoading(false);
    }
  };

  // Handle token selection from modal — find matching wallet token to get balance
  const handleSelectSendToken = (token: { code: string; issuer?: string }) => {
    const match = walletTokens.find(
      (t) => t.code === token.code && (t.issuer || '') === (token.issuer || '')
    );
    if (match) {
      setSendToken(match);
    } else {
      setSendToken({ code: token.code, issuer: token.issuer, balance: '0', displayBalance: '0.0000000' });
    }
    setSendAmount('');
    setBestPath(null);
    setReceiveAmount('');
    setError(null);
    setTimeout(() => sendInputRef.current?.focus(), 0);
  };

  const handleSelectReceiveToken = (token: { code: string; issuer?: string }) => {
    const match = walletTokens.find(
      (t) => t.code === token.code && (t.issuer || '') === (token.issuer || '')
    );
    if (match) {
      setReceiveToken(match);
    } else {
      setReceiveToken({ code: token.code, issuer: token.issuer, balance: '0', displayBalance: '0.0000000' });
    }
    setBestPath(null);
    setReceiveAmount('');
    setError(null);
  };

  // Computed exchange rate for display
  const exchangeRate = bestPath && sendAmount && parseFloat(sendAmount) > 0
    ? (parseFloat(bestPath.destinationAmount) / parseFloat(sendAmount)).toFixed(6)
    : null;

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
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground">Loading wallet tokens...</p>
      </div>
    );
  }

  const walletBalancesForModal = activeWallet.balances || [];

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Swap Tokens</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wallet: <span className="font-semibold text-primary">{activeWallet.name}</span>
          </p>
        </div>
        {exchangeRate && sendToken && receiveToken && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              1 {sendToken.code} = {exchangeRate} {receiveToken.code}
            </span>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 rounded-xl border border-green-500/30 bg-green-500/10 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-500 break-all">{successMessage}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Main Swap Card */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">

        {/* SEND Panel */}
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">You Send</p>

          <div className="flex items-center gap-3">
            {/* Token Selector Button */}
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all group min-w-0 flex-shrink-0"
            >
              <TokenAvatar code={sendToken?.code || 'XLM'} issuer={sendToken?.issuer} size={32} />
              <div className="flex flex-col items-start min-w-0">
                <span className="font-bold text-sm text-foreground leading-tight">{sendToken?.code || 'Select'}</span>
                {sendToken?.issuer && (
                  <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[64px]">
                    {sendToken.issuer.slice(0, 6)}…
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Amount Input */}
            <div className="flex-1 min-w-0">
              <Input
                ref={sendInputRef}
                type="number"
                placeholder="0.00"
                value={sendAmount}
                onChange={handleSendAmountChange}
                className="text-right text-xl font-bold text-foreground bg-transparent border-none shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 h-auto p-0 pr-1"
              />
            </div>
          </div>

          {/* Balance row + Percentage buttons */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-baseline gap-1">
              <span className="text-[11px] text-muted-foreground">Balance:</span>
              <span className="text-[11px] font-semibold text-foreground">{sendToken?.displayBalance || '0'} {sendToken?.code}</span>
              {sendToken?.code === 'XLM' && (
                <span className="text-[10px] text-yellow-400/80">(spendable: {spendableBalance})</span>
              )}
            </div>
          </div>

          <div className="flex gap-1.5">
            {[25, 50, 75].map((pct) => (
              <button
                key={pct}
                onClick={() => handleSetPercentage(pct)}
                className="flex-1 py-1.5 text-[11px] font-bold rounded-lg border border-border/50 bg-background/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => handleSetPercentage(100)}
              className="flex-1 py-1.5 text-[11px] font-bold rounded-lg border border-border/50 bg-background/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Divider with Swap Button */}
        <div className="relative flex items-center justify-center py-1 border-y border-border/30 bg-background/20">
          <button
            onClick={handleSwapTokens}
            disabled={!sendToken || !receiveToken}
            className="z-10 p-2 rounded-xl border border-border/60 bg-card hover:border-primary/60 hover:bg-primary/10 disabled:opacity-40 transition-all group shadow-sm"
            aria-label="Flip tokens"
          >
            <ArrowUpDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* RECEIVE Panel */}
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">You Receive</p>

          <div className="flex items-center gap-3">
            {/* Token Selector Button */}
            <button
              onClick={() => setShowReceiveModal(true)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all group min-w-0 flex-shrink-0"
            >
              <TokenAvatar code={receiveToken?.code || '?'} issuer={receiveToken?.issuer} size={32} />
              <div className="flex flex-col items-start min-w-0">
                <span className="font-bold text-sm text-foreground leading-tight">{receiveToken?.code || 'Select'}</span>
                {receiveToken?.issuer && (
                  <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[64px]">
                    {receiveToken.issuer.slice(0, 6)}…
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Estimated receive amount */}
            <div className="flex-1 flex items-center justify-end">
              {loading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <span className={`text-xl font-bold tabular-nums ${receiveAmount ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                  {receiveAmount ? parseFloat(receiveAmount).toFixed(4) : '0.0000'}
                </span>
              )}
            </div>
          </div>

          {receiveToken && (
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-muted-foreground">Balance:</span>
              <span className="text-[11px] font-semibold text-foreground">{receiveToken.displayBalance || '0'} {receiveToken.code}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quote Details */}
      {bestPath && (
        <div className="rounded-xl border border-border/30 bg-card/30 divide-y divide-border/20 text-sm">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Estimated received</span>
            <span className="text-xs font-semibold text-foreground">
              {parseFloat(bestPath.destinationAmount).toFixed(7)} {receiveToken?.code}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Price impact</span>
            <span className={`text-xs font-semibold ${priceImpactWarning ? 'text-yellow-400' : 'text-green-400'}`}>
              {bestPath.priceImpact.toFixed(2)}%
              {priceImpactWarning && ' ⚠'}
            </span>
          </div>
          {bestPath.path && bestPath.path.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Route</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                <span className="text-xs font-medium text-primary/80">{sendToken?.code}</span>
                {bestPath.path.map((asset, idx) => (
                  <span key={idx} className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary/80">{asset.code}</span>
                  </span>
                ))}
                <span className="text-muted-foreground text-xs">→</span>
                <span className="text-xs font-medium text-primary/80">{receiveToken?.code}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slippage Tolerance */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Slippage Tolerance</p>
        <div className="flex gap-2">
          {SLIPPAGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedSlippage(option)}
              className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                selectedSlippage === option
                  ? 'border-primary/60 bg-primary/15 text-primary shadow-sm'
                  : 'border-border/40 bg-background/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
              }`}
            >
              {option}%
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Swap Button */}
      <Button
        onClick={handleExecuteSwap}
        disabled={!sendAmount || !bestPath || !receiveToken || loading}
        className="w-full py-3 text-sm font-semibold rounded-xl"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {bestPath ? 'Executing swap...' : 'Finding best route...'}
          </span>
        ) : !sendAmount ? (
          'Enter an amount'
        ) : !bestPath ? (
          'No route found'
        ) : (
          'Confirm Swap'
        )}
      </Button>

      {/* Token Selector Modals */}
      <TokenSelectorModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSelect={handleSelectSendToken}
        walletBalances={walletBalancesForModal}
        type="selling"
      />
      <TokenSelectorModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        onSelect={handleSelectReceiveToken}
        walletBalances={walletBalancesForModal}
        type="buying"
      />
    </div>
  );
}
