'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ArrowRightLeft, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findBestSwapPath, executeSwap, decryptSecret } from '@/lib/stellar-utils';
import { useWallet } from '@/lib/wallet-context';

interface Token {
  code: string;
  issuer?: string;
  balance?: string;
}

interface SwapPath {
  path: string[];
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
  
  // UI states
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showReceiveDropdown, setShowReceiveDropdown] = useState(false);
  const [selectedSlippage, setSelectedSlippage] = useState(1);
  const [priceImpactWarning, setPriceImpactWarning] = useState(false);
  const [walletPassword, setWalletPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [executableSwap, setExecutableSwap] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout>();

  // Load wallet tokens when active wallet changes
  useEffect(() => {
    if (activeWallet && activeWallet.balances) {
      const tokens: Token[] = [];
      
      // Add XLM (native)
      tokens.push({
        code: 'XLM',
        balance: activeWallet.balances.find((b: any) => b.asset_type === 'native')?.balance || '0',
      });
      
      // Add other assets
      for (const balance of activeWallet.balances) {
        if (balance.asset_type !== 'native' && balance.asset_type !== 'liquidity_pool_shares') {
          tokens.push({
            code: balance.asset_code,
            issuer: balance.asset_issuer,
            balance: balance.balance,
          });
        }
      }
      
      setWalletTokens(tokens);
      
      // Auto-select first token as send token
      if (tokens.length > 0 && !sendToken) {
        setSendToken(tokens[0]);
      }
      // Auto-select second token as receive token if available
      if (tokens.length > 1 && !receiveToken) {
        setReceiveToken(tokens[1]);
      }
    }
  }, [activeWallet, sendToken, receiveToken]);

  // Real path calculation using Stellar SDK's PathPaymentStrictSend
  const calculateBestPath = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0 || !sendToken || !receiveToken) {
      setBestPath(null);
      return;
    }

    // Check if send amount exceeds wallet balance
    const balance = parseFloat(sendToken.balance || '0');
    if (parseFloat(amount) > balance) {
      setError(`Insufficient balance. You have ${balance} ${sendToken.code}`);
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
        setExecutableSwap(true);
      } else {
        setError('No swap path found. Check if both tokens are available on Mainnet.');
        setBestPath(null);
        setExecutableSwap(false);
      }
    } catch (err: any) {
      console.error('[v0] Path calculation error:', err);
      setError(err.message || 'Failed to calculate best path');
      setBestPath(null);
      setExecutableSwap(false);
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
      setExecutableSwap(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = sendToken;
    setSendToken(receiveToken);
    setReceiveToken(temp);
    setSendAmount('');
    setReceiveAmount('');
    setBestPath(null);
    setExecutableSwap(false);
  };

  const handleConfirmSwap = () => {
    if (!activeWallet || !sendToken || !receiveToken || !sendAmount || !bestPath) {
      setError('Invalid swap parameters');
      return;
    }

    setShowPasswordPrompt(true);
  };

  const executeSwapTransaction = async () => {
    if (!activeWallet || !sendToken || !receiveToken || !sendAmount || !bestPath || !walletPassword) {
      setError('Missing required swap parameters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Decrypt wallet secret key with password
      let decryptedSecret: string;
      try {
        decryptedSecret = decryptSecret(activeWallet.encryptedSecret, walletPassword);
      } catch (err) {
        setError('Invalid password. Please try again.');
        setLoading(false);
        return;
      }

      console.log('[v0] Executing swap on Mainnet Stellar:', {
        wallet: activeWallet.name,
        from: `${sendAmount} ${sendToken.code}`,
        to: receiveToken.code,
        expectedAmount: receiveAmount,
        slippage: selectedSlippage,
      });

      // Execute the swap on Mainnet
      const result = await executeSwap(
        decryptedSecret,
        sendToken.code,
        sendToken.issuer,
        sendAmount,
        receiveToken.code,
        receiveToken.issuer,
        receiveAmount,
        bestPath.path.map(p => {
          const code = p.split(' ')[0];
          const token = walletTokens.find(t => t.code === code);
          return {
            code,
            issuer: token?.issuer,
          };
        }),
        selectedSlippage
      );

      if (result.success) {
        setError(null);
        setSendAmount('');
        setReceiveAmount('');
        setBestPath(null);
        setExecutableSwap(false);
        setShowPasswordPrompt(false);
        setWalletPassword('');
        alert(`Swap successful! Transaction: ${result.hash}`);
      } else {
        setError(result.error || 'Swap failed on Mainnet');
      }
    } catch (err: any) {
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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Swap Tokens</h2>
        <p className="text-muted-foreground">
          Trading wallet: <span className="font-semibold text-primary">{activeWallet.name}</span>
        </p>
      </div>

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
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-colors text-foreground"
              >
                <span className="font-semibold">{sendToken?.code}</span>
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
                        setExecutableSwap(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-primary/20 border-b border-border/20 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{token.code}</span>
                        <span className="text-xs text-muted-foreground">{parseFloat(token.balance || '0').toFixed(4)}</span>
                      </div>
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
          {sendToken && (
            <p className="text-xs text-muted-foreground text-right">
              Balance: {parseFloat(sendToken.balance || '0').toFixed(7)} {sendToken.code}
            </p>
          )}
        </div>

        {/* Swap Direction Toggle */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 rounded-full hover:bg-primary/20 transition-colors"
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
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-colors text-foreground"
              >
                <span className="font-semibold">{receiveToken?.code}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Receive Dropdown Menu */}
              {showReceiveDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {walletTokens.map((token) => (
                    <button
                      key={`${token.code}_${token.issuer || 'native'}`}
                      onClick={() => {
                        setReceiveToken(token);
                        setShowReceiveDropdown(false);
                        setSendAmount('');
                        setBestPath(null);
                        setExecutableSwap(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-primary/20 border-b border-border/20 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{token.code}</span>
                        <span className="text-xs text-muted-foreground">{parseFloat(token.balance || '0').toFixed(4)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Display */}
            <div className="flex-1 px-4 py-3 rounded-lg border border-border/50 bg-background/50 flex items-center justify-between">
              <span className="text-foreground">
                {receiveAmount ? parseFloat(receiveAmount).toFixed(7) : '0.00'}
              </span>
              <span className="text-xs text-muted-foreground">{receiveToken?.code}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Best Path Information */}
      {bestPath && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <h3 className="font-semibold text-foreground">Trading Path</h3>
          <p className="text-sm text-muted-foreground">{bestPath.path.join('')}</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-background/50 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Price Impact</p>
              <p className={`font-semibold ${priceImpactWarning ? 'text-yellow-500' : 'text-green-500'}`}>
                {bestPath.priceImpact.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 rounded bg-background/50 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">You Receive</p>
              <p className="font-semibold text-foreground">{parseFloat(receiveAmount).toFixed(7)}</p>
            </div>
          </div>
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
              className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                selectedSlippage === option
                  ? 'border-primary bg-primary/20 text-primary'
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
        onClick={handleConfirmSwap}
        disabled={!sendAmount || loading || !bestPath || !executableSwap}
        className="w-full py-3 text-base font-semibold"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding Best Path...
          </div>
        ) : (
          'Confirm Swap on Mainnet'
        )}
      </Button>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border/50 rounded-lg p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Confirm Swap</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Enter your wallet password to execute the swap on Mainnet.
            </p>

            <input
              type="password"
              placeholder="Wallet Password"
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border/50 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setWalletPassword('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={executeSwapTransaction}
                disabled={loading || !walletPassword}
                className="flex-1"
              >
                {loading ? 'Executing...' : 'Execute Swap'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
