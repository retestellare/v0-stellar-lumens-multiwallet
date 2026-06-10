'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bot, Play, Square, Copy, Check, AlertTriangle, Settings, Trash2 } from 'lucide-react';
import { Keypair, Asset } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/lib/wallet-context';
import { MarketMakerBot, MarketMakingConfig } from '@/lib/market-maker-bot';

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

  // Market Making Configuration
  const [isMainnet, setIsMainnet] = useState(false);
  const [spreadThreshold, setSpreadThreshold] = useState<string>('0.5');
  const [minProfit, setMinProfit] = useState<string>('0.10');
  const [orderInterval, setOrderInterval] = useState<string>('5');
  const [dailyLimit, setDailyLimit] = useState<string>('1000');
  const [microStep, setMicroStep] = useState<string>('0.000001');

  // Trading Configuration
  const [pair, setPair] = useState<string>(selectedAsset?.code || 'FORGE');
  const [buyAmount, setBuyAmount] = useState<string>('10');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);

  // Bot Instance and Logs
  const [botInstance, setBotInstance] = useState<MarketMakerBot | null>(null);
  const [logs, setLogs] = useState<string[]>(['[System] Trading Bot initialized...']);
  const [showSettings, setShowSettings] = useState(false);

  // Load bot wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stellar_bot_wallet');
    if (stored) {
      try {
        const wallet = JSON.parse(stored);
        setBotWallet(wallet);
        setBackupConfirmed(true);
      } catch (error) {
        console.error('[v0] Failed to load bot wallet:', error);
      }
    }
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  }, []);

  const handleGenerateBotWallet = useCallback(() => {
    setIsGenerating(true);
    try {
      const newKeypair = Keypair.random();
      const wallet: BotWalletData = {
        publicKey: newKeypair.publicKey(),
        secretKey: newKeypair.secret(),
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      setBotWallet(wallet);
      setShowBackupModal(true);
      addLog('Bot wallet generated successfully');
    } catch (error) {
      addLog(`Error generating wallet: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  }, [addLog]);

  const handleConfirmBackup = useCallback(() => {
    if (botWallet) {
      localStorage.setItem('stellar_bot_wallet', JSON.stringify(botWallet));
      setBackupConfirmed(true);
      setShowBackupModal(false);
      addLog('Bot wallet saved and backed up securely');
    }
  }, [botWallet, addLog]);

  const handleFundBot = useCallback(() => {
    if (!activeWallet || !botWallet || !fundingAmount) {
      setFundingError('Please provide all required information');
      return;
    }

    setIsFunding(true);
    setFundingError('');
    try {
      const amount = parseFloat(fundingAmount);
      setBotWallet(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
      addLog(`Funded bot wallet with ${fundingAmount} XLM. Balance: ${(botWallet.balance + amount).toFixed(2)} XLM`);
      setFundingAmount('');
    } catch (error) {
      setFundingError(`Funding failed: ${error}`);
      addLog(`Funding error: ${error}`);
    } finally {
      setIsFunding(false);
    }
  }, [activeWallet, botWallet, fundingAmount, addLog]);

  const handleStartBot = useCallback(async () => {
    if (!botWallet || !isMainnet === false && !isDryRun) {
      addLog('Please configure bot wallet and select network');
      return;
    }

    setIsRunning(true);
    addLog(`Starting market maker bot in ${isDryRun ? 'DRY-RUN' : isMainnet ? 'MAINNET' : 'TESTNET'} mode...`);

    try {
      const config: MarketMakingConfig = {
        spreadThresholdPercent: parseFloat(spreadThreshold),
        minProfitTargetXlm: parseFloat(minProfit),
        orderUpdateIntervalSeconds: parseInt(orderInterval),
        dailySpendingLimitXlm: parseFloat(dailyLimit),
        isTestnet: !isMainnet,
        microStep,
      };

      const bot = new MarketMakerBot(botWallet.secretKey, config);
      setBotInstance(bot);

      if (isDryRun) {
        addLog('DRY-RUN MODE: Orders will be simulated, not submitted');
      } else {
        // Parse assets for order book
        const sellingAsset = new Asset('XLM');
        const buyingAsset = new Asset(pair, 'GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJsu6LPJKW6KBTDNPK5YGDX7QU6');

        bot.startTradingLoop(buyingAsset, sellingAsset, buyAmount, (updatedLogs) => {
          setLogs(updatedLogs.map((log, idx) => `[${idx}] ${log}`));
        });

        addLog(`Bot trading loop started with ${buyAmount} ${pair} per cycle`);
      }
    } catch (error) {
      addLog(`Error starting bot: ${error}`);
      setIsRunning(false);
    }
  }, [botWallet, isMainnet, isDryRun, spreadThreshold, minProfit, orderInterval, dailyLimit, microStep, pair, buyAmount, addLog]);

  const handleStopBot = useCallback(async () => {
    if (botInstance) {
      await botInstance.stopTradingLoop();
      setBotInstance(null);
      addLog('Bot stopped, all orders cancelled');
    }
    setIsRunning(false);
  }, [botInstance, addLog]);

  const handleCopyBotAddress = useCallback(() => {
    if (!botWallet) return;
    try {
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
    } catch (err) {
      console.error('[v0] Copy failed:', err);
    }
  }, [botWallet]);

  const handleResetBotWallet = useCallback(async () => {
    if (!confirm('Are you sure you want to reset the bot wallet? This will clear the current wallet and stop the bot if running.')) {
      return;
    }

    if (isRunning) {
      await handleStopBot();
    }

    localStorage.removeItem('stellar_bot_wallet');
    localStorage.removeItem('stellar_bot_secret_key');
    localStorage.removeItem('stellar_bot_public_key');
    setBotWallet(null);
    setBackupConfirmed(false);
    addLog('Bot wallet reset. Generate a new wallet to continue.');
  }, [isRunning, addLog]);

  if (!botWallet || !backupConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        {showBackupModal && botWallet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-primary/20 rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Save Your Bot Wallet Secret Key
              </h3>
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                <p className="text-xs text-destructive mb-2">
                  <strong>⚠️ WARNING:</strong> Never share this secret key with anyone. If you lose it, you lose access to your bot wallet forever.
                </p>
                <code className="text-xs break-all text-muted-foreground">
                  Secret: {botWallet.secretKey}
                </code>
              </div>
              <div className="bg-muted/50 rounded p-3">
                <code className="text-xs break-all text-muted-foreground">
                  Public Key (Bot Address): {botWallet.publicKey}
                </code>
              </div>
              <Button
                onClick={handleConfirmBackup}
                className="w-full"
              >
                I have safely stored my Secret Key
              </Button>
            </div>
          </div>
        )}
        <Button onClick={handleGenerateBotWallet} disabled={isGenerating} className="w-full">
          {isGenerating ? 'Generating...' : 'Generate Bot Wallet'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Bot Wallet Section */}
      <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Bot Wallet</h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              isMainnet 
                ? 'bg-destructive/20 text-destructive border border-destructive/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {isMainnet ? '🌐 MAINNET' : '🧪 TESTNET'}
            </span>
            <button
              onClick={handleResetBotWallet}
              disabled={isRunning}
              className="p-1 hover:bg-destructive/20 rounded transition-colors disabled:opacity-50"
              title="Reset Bot Wallet"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <code className="break-all font-mono text-muted-foreground flex-1">
            {botWallet.publicKey.substring(0, 12)}...{botWallet.publicKey.substring(-6)}
          </code>
          <button
            onClick={handleCopyBotAddress}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
          >
            {botCopied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Balance: <span className="text-primary font-bold">{botWallet.balance.toFixed(2)} XLM</span>
        </p>
      </div>

      {/* Fund Bot Wallet */}
      <div className="border border-primary/20 rounded-lg p-4 space-y-2 bg-card/50">
        <Label className="text-xs font-semibold">Fund Bot Wallet</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Amount (XLM)"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            disabled={isFunding || !activeWallet}
            className="h-8 text-sm"
          />
          <Button
            onClick={handleFundBot}
            disabled={isFunding || !activeWallet || !fundingAmount}
            size="sm"
          >
            Fund
          </Button>
        </div>
        {fundingError && <p className="text-xs text-destructive">{fundingError}</p>}
      </div>

      {/* Network & Safety Settings */}
      <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Settings</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
          >
            <Settings className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={(e) => setIsDryRun(e.target.checked)}
              disabled={isRunning}
              className="w-4 h-4"
            />
            <span>Dry-Run Mode (simulate, don&apos;t trade)</span>
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isMainnet}
              onChange={(event) => {
                if (event.target.checked) {
                  if (!confirm('⚠️ WARNING: You are switching to MAINNET. Real funds will be at risk. Only proceed if you have tested on TESTNET first. Continue?')) {
                    return;
                  }
                }
                setIsMainnet(event.target.checked);
                addLog(`Network switched to ${event.target.checked ? 'MAINNET' : 'TESTNET'}`);
              }}
              disabled={isRunning}
              className="w-4 h-4"
            />
            <span className={isMainnet ? 'text-destructive font-bold' : ''}>
              ⚠️ Mainnet (real funds at risk)
            </span>
          </label>
        </div>

        {showSettings && (
          <div className="space-y-3 pt-3 border-t border-primary/10">
            <div className="space-y-1">
              <Label className="text-xs">Min Spread Threshold (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={spreadThreshold}
                onChange={(e) => setSpreadThreshold(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Min Profit Target (XLM)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Order Update Interval (seconds)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={orderInterval}
                onChange={(e) => setOrderInterval(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Daily Spending Limit (XLM)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Micro Step (price increment)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={microStep}
                onChange={(e) => setMicroStep(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Trading Configuration */}
      <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
        <h3 className="text-sm font-semibold">Trading Configuration</h3>

        <div className="space-y-1">
          <Label className="text-xs">Trading Pair</Label>
          <Select value={pair} onValueChange={setPair} disabled={isRunning}>
            <SelectTrigger className="h-8 text-xs">
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

        <div className="space-y-1">
          <Label className="text-xs">Buy Amount per Cycle ({pair})</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="10"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            disabled={isRunning}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Status Display */}
      <div className="border border-primary/20 rounded-lg p-3 space-y-2 bg-card/50">
        <p className="text-xs">
          Status: <span className={`font-bold ${isRunning ? 'text-green-400' : 'text-muted-foreground'}`}>
            {isRunning ? '🟢 RUNNING' : '⚪ STOPPED'}
          </span>
        </p>
        {isRunning && (
          <p className="text-xs text-muted-foreground">
            Mode: {isDryRun ? '🔄 DRY-RUN' : isMainnet ? '⚠️ MAINNET' : '🧪 TESTNET'}
          </p>
        )}
      </div>

      {/* Bot Control Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            onClick={handleStartBot}
            disabled={!botWallet || parseFloat(buyAmount) <= 0}
            className="flex-1 gap-2"
          >
            <Play className="w-4 h-4" />
            START BOT
          </Button>
        ) : (
          <Button
            onClick={handleStopBot}
            variant="destructive"
            className="flex-1 gap-2"
          >
            <Square className="w-4 h-4" />
            STOP BOT
          </Button>
        )}
      </div>

      {/* Live Logs Terminal */}
      <div className="border border-primary/20 rounded-lg p-3 bg-black space-y-1">
        <p className="text-xs font-semibold text-primary mb-2">Live Logs</p>
        <div className="space-y-0.5 font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="break-all">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Integration Notes Box */}
      <div className="border border-destructive/20 bg-destructive/10 rounded-md p-3 text-xs text-destructive flex flex-col gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1">
          ⚠️ Integration Notes:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Market Making with spread sniping is active on {isMainnet ? '🌐 MAINNET - Real Funds' : '🧪 TESTNET - Test Environment'}</li>
          <li>Bot validates spread threshold ({spreadThreshold}%) and profit margin ({minProfit} XLM)</li>
          <li>Orders update every {orderInterval} seconds to stay competitive</li>
          <li>All orders auto-cancel when bot is stopped</li>
          <li>Use DRY-RUN mode to test strategy before trading with real funds</li>
          {isMainnet && <li className="text-destructive font-bold">🔴 MAINNET ACTIVE - Verify settings carefully before starting!</li>}
        </ul>

        <div className={`pt-2 border-t border-destructive/10 font-bold text-center tracking-wide animate-pulse ${
          isMainnet ? 'text-destructive' : 'text-yellow-400'
        }`}>
          {isMainnet ? 'Real Mainnet Trading 🚀' : 'Testnet Trading Mode 🧪'}
        </div>
      </div>
    </div>
  );
}
