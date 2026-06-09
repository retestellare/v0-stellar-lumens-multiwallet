'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bot, Play, Square, Copy, Check, AlertTriangle } from 'lucide-react';
import { Keypair } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/lib/wallet-context';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

interface BotWalletData {
  publicKey: string;
  secretKey: string;
  balance: number;
  createdAt: string;
}

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  const { activeWallet } = useWallet();

  // Bot Wallet State
  const [botWallet, setBotWallet] = useState<BotWalletData | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingAmount, setFundingAmount] = useState<string>('50');
  const [fundingError, setFundingError] = useState<string>('');
  const [botCopied, setBotCopied] = useState(false);

  // Bot Configuration State
  const [pair, setPair] = useState<string>(selectedAsset?.code || 'FORGE');
  const [budget, setBudget] = useState<string>('100');
  const [minPrice, setMinPrice] = useState<string>('0.001');
  const [maxPrice, setMaxPrice] = useState<string>('0.1');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stream and Strategy State
  const [logs, setLogs] = useState<string[]>(['[System] Trading Bot initialized...']);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Add log helper function
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-19), message]); // Keep last 20 logs
  }, []);

  // Initialize or load bot wallet from localStorage
  useEffect(() => {
    const initializeBotWallet = async () => {
      const stored = localStorage.getItem('stellar_bot_wallet');
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setBotWallet(parsed);
          addLog('[System] Bot wallet loaded from storage');
        } catch (error) {
          console.error('[v0] Failed to parse stored bot wallet:', error);
          addLog('[System] Error loading bot wallet');
        }
      } else {
        addLog('[System] No bot wallet found. Create one to start.');
      }
    };

    initializeBotWallet();
  }, [addLog]);

  // Generate bot wallet
  const handleGenerateBotWallet = useCallback(async () => {
    setIsGenerating(true);
    addLog('[System] Generating bot wallet keypair...');

    try {
      // Generate new keypair
      const keypair = Keypair.random();
      const newBotWallet: BotWalletData = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        balance: 0,
        createdAt: new Date().toISOString(),
      };

      setBotWallet(newBotWallet);
      setShowBackupModal(true);
      setBackupConfirmed(false);
      addLog('[System] Bot wallet generated successfully');
    } catch (error) {
      console.error('[v0] Failed to generate bot wallet:', error);
      addLog('[System] Error: Failed to generate bot wallet');
      setIsGenerating(false);
    }
  }, [addLog]);

  // Save bot wallet to localStorage
  const handleConfirmBackup = useCallback(() => {
    if (botWallet) {
      localStorage.setItem('stellar_bot_wallet', JSON.stringify(botWallet));
      setBackupConfirmed(true);
      setShowBackupModal(false);
      addLog('[System] Bot wallet saved and backed up');
      setIsGenerating(false);
    }
  }, [botWallet, addLog]);

  // Copy bot public key
  const handleCopyBotAddress = useCallback(() => {
    if (!botWallet) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(botWallet.publicKey);
        setBotCopied(true);
        setTimeout(() => setBotCopied(false), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = botWallet.publicKey;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setBotCopied(true);
        setTimeout(() => setBotCopied(false), 2000);
      }
    } catch (err) {
      console.error('[v0] Failed to copy bot address:', err);
    }
  }, [botWallet]);

  // Handle funding bot wallet
  const handleFundBot = useCallback(async () => {
    if (!botWallet || !activeWallet || !fundingAmount) {
      setFundingError('Missing required information');
      return;
    }

    setIsFunding(true);
    setFundingError('');
    addLog('[System] Initiating fund transfer...');

    try {
      const amount = parseFloat(fundingAmount);
      if (isNaN(amount) || amount <= 0) {
        setFundingError('Invalid funding amount');
        setIsFunding(false);
        return;
      }

      // TODO: Integrate real Stellar SDK transaction here
      // Steps:
      // 1. Get active wallet secret key from user
      // 2. Load account from Horizon
      // 3. Build payment transaction to bot wallet
      // 4. Sign and submit transaction
      // 5. Update bot wallet balance

      addLog(`[${new Date().toLocaleTimeString()}] Sending ${amount} XLM to bot wallet...`);
      
      // Mock simulation for demonstration
      setTimeout(() => {
        const newBalance = botWallet.balance + amount;
        const updatedBotWallet = { ...botWallet, balance: newBalance };
        setBotWallet(updatedBotWallet);
        localStorage.setItem('stellar_bot_wallet', JSON.stringify(updatedBotWallet));
        addLog(`[${new Date().toLocaleTimeString()}] Successfully transferred ${amount} XLM`);
        addLog(`[System] Bot wallet balance: ${newBalance} XLM`);
        setIsFunding(false);
      }, 2000);
    } catch (error) {
      console.error('[v0] Funding error:', error);
      setFundingError('Failed to transfer funds');
      addLog('[System] Error: Transfer failed');
      setIsFunding(false);
    }
  }, [botWallet, activeWallet, fundingAmount, addLog]);

  // Start bot trading
  const handleStartBot = useCallback(async () => {
    if (!botWallet || botWallet.balance <= 0) {
      addLog('[Error] Bot wallet must be funded before starting');
      return;
    }

    if (!pair || !budget || !minPrice || !maxPrice) {
      addLog('[Error] Please fill in all trading parameters');
      return;
    }

    setIsRunning(true);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STARTED`);
    addLog(`[${new Date().toLocaleTimeString()}] Monitoring XLM/${pair} pair`);
    addLog(`[${new Date().toLocaleTimeString()}] Budget: ${budget} XLM | Range: ${minPrice} - ${maxPrice}`);

    // Mock price stream
    const mockInterval = setInterval(() => {
      const randomPrice = parseFloat(minPrice) + 
        Math.random() * (parseFloat(maxPrice) - parseFloat(minPrice));
      
      setPriceHistory(prev => [...prev.slice(-59), randomPrice]);

      if (randomPrice < parseFloat(minPrice) * 1.05) {
        addLog(`[${new Date().toLocaleTimeString()}] 🟢 BUY SIGNAL: Price ${randomPrice.toFixed(6)} below threshold`);
      } else if (randomPrice > parseFloat(maxPrice) * 0.95) {
        addLog(`[${new Date().toLocaleTimeString()}] 🔴 SELL SIGNAL: Price ${randomPrice.toFixed(6)} above threshold`);
      } else {
        addLog(`[${new Date().toLocaleTimeString()}] Price Update: ${randomPrice.toFixed(6)} (holding)`);
      }
    }, 2000);

    (window as any).__tradingBotInterval = mockInterval;
  }, [botWallet, pair, budget, minPrice, maxPrice, addLog]);

  const handleStopBot = useCallback(() => {
    const intervalId = (window as any).__tradingBotInterval;
    if (typeof intervalId === 'number') {
      clearInterval(intervalId);
      (window as any).__tradingBotInterval = null;
    }
    setIsRunning(false);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STOPPED`);
  }, [addLog]);

  // Backup Security Modal
  if (showBackupModal && botWallet && !backupConfirmed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-destructive/20 rounded-lg p-6 max-w-md w-full space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold">Save Your Bot Wallet Secret Key</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            This is your non-custodial Bot Wallet secret key. Save it in a secure location. If you lose it, you lose access to the bot's funds forever.
          </p>

          <div className="bg-background/50 p-3 rounded border border-border/50 break-all">
            <code className="text-xs font-mono text-foreground">{botWallet.secretKey}</code>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Public Key (Bot Address):</p>
            <div className="bg-background/50 p-2 rounded border border-border/50 break-all">
              <code className="text-xs font-mono text-foreground">{botWallet.publicKey}</code>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
            <p className="text-xs text-destructive font-semibold">
              ⚠️ Never share this secret key with anyone. Anyone with this key can access your bot's funds.
            </p>
          </div>

          <Button
            onClick={handleConfirmBackup}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            I have safely stored my Secret Key
          </Button>
        </div>
      </div>
    );
  }

  // Main Bot Configuration Panel
  return (
    <div className="space-y-6 bg-card border border-primary/10 rounded-lg p-4 md:p-6">
      {/* Bot Wallet Section */}
      <div className="space-y-3 pb-4 border-b border-primary/10">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Bot Wallet
        </h3>

        {!botWallet ? (
          <Button
            onClick={handleGenerateBotWallet}
            disabled={isGenerating}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? 'Generating...' : 'Generate Bot Wallet'}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 bg-background/30 p-2 rounded text-xs">
              <span className="text-muted-foreground">Bot Address:</span>
              <div className="flex items-center gap-1">
                <code className="font-mono text-foreground">
                  {botWallet.publicKey.substring(0, 8)}...{botWallet.publicKey.substring(-6)}
                </code>
                <button
                  onClick={handleCopyBotAddress}
                  className="p-1 hover:bg-primary/20 rounded transition-colors"
                >
                  {botCopied ? (
                    <Check className="w-3 h-3 text-primary" />
                  ) : (
                    <Copy className="w-3 h-3 text-primary" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-background/30 p-2 rounded text-xs">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold text-primary">{botWallet.balance.toFixed(2)} XLM</span>
            </div>
          </div>
        )}
      </div>

      {/* Funding Section */}
      {botWallet && (
        <div className="space-y-3 pb-4 border-b border-primary/10">
          <h3 className="text-sm font-semibold text-foreground">Fund Bot Wallet</h3>
          
          <div className="space-y-2">
            <Label htmlFor="funding-amount" className="text-xs font-medium">
              Amount to Transfer (XLM)
            </Label>
            <div className="flex gap-2">
              <Input
                id="funding-amount"
                type="text"
                inputMode="decimal"
                placeholder="50"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                disabled={isFunding}
                className="h-8 text-sm"
              />
              <Button
                onClick={handleFundBot}
                disabled={isFunding || !activeWallet}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4"
              >
                {isFunding ? 'Funding...' : 'Fund'}
              </Button>
            </div>
            {fundingError && <p className="text-xs text-destructive">{fundingError}</p>}
          </div>
        </div>
      )}

      {/* Trading Configuration */}
      {botWallet && (
        <>
          <div className="space-y-3 pb-4 border-b border-primary/10">
            <h3 className="text-sm font-semibold text-foreground">Trading Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="pair" className="text-xs font-medium">
                Trading Pair
              </Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger id="pair" className="h-8 text-sm">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORGE">FORGE</SelectItem>
                  <SelectItem value="MAGC">MAGC</SelectItem>
                  <SelectItem value="METJ">METJ</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-xs font-medium">
                  Budget (XLM)
                </Label>
                <Input
                  id="budget"
                  type="text"
                  inputMode="numeric"
                  placeholder="100"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={isRunning}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-price" className="text-xs font-medium">
                  Min Price
                </Label>
                <Input
                  id="min-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.001"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  disabled={isRunning}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-price" className="text-xs font-medium">
                  Max Price
                </Label>
                <Input
                  id="max-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.1"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  disabled={isRunning}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Status & Control */}
          <div className="space-y-3 pb-4 border-b border-primary/10">
            <div className="flex items-center justify-between bg-background/30 p-2 rounded">
              <span className="text-xs text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                <span className="text-xs font-semibold">{isRunning ? 'RUNNING' : 'STOPPED'}</span>
              </div>
            </div>

            <Button
              onClick={isRunning ? handleStopBot : handleStartBot}
              className={`w-full h-10 font-semibold ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-primary hover:bg-primary/90'
              } text-white flex items-center justify-center gap-2`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  STOP BOT
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  START BOT
                </>
              )}
            </Button>
          </div>

          {/* Live Logs Terminal */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Live Logs</Label>
            <div className="bg-black rounded border border-primary/20 p-3 h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
              {logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Integration Notes */}
      <div className="border border-destructive/20 bg-destructive/10 rounded-md p-3 text-xs text-destructive flex flex-col gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1">
          ⚠️ Integration Notes:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Replace mock funding with real Stellar SDK transaction signing</li>
          <li>Implement payment/createAccount operations to transfer XLM</li>
          <li>Add proper error handling and transaction verification</li>
          <li>Test on testnet before mainnet deployment</li>
        </ul>

        <div className="pt-2 border-t border-destructive/10 font-bold text-center tracking-wide animate-pulse">
          Under construction 🚧
        </div>
      </div>
    </div>
  );
}
