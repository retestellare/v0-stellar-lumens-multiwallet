'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bot, Play, Square, Copy, Check, AlertTriangle, Settings, Trash2, Lock, Info, Zap } from 'lucide-react';
import { Keypair, Asset } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/lib/wallet-context';
import { GridMarketMakingBot, GridStrategyType } from '@/lib/grid-strategies';
import { transferFundsToBotWallet, getBotWalletBalance, getMainWalletBalance, TransactionResult } from '@/lib/fund-transfer';
import { BotWalletModal } from '@/components/bot-wallet-modal';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

interface BotWalletData {
  publicKey: string;
  secretKey: string;
  balance: number;
  createdAt: string;
  network: 'mainnet';
}

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  const { activeWallet, unlockWallet } = useWallet();

  // Bot Wallet State
  const [botWallet, setBotWallet] = useState<BotWalletData | null>(null);
  const [showBotWalletModal, setShowBotWalletModal] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingAmount, setFundingAmount] = useState<string>('10');
  const [fundingError, setFundingError] = useState<string>('');
  const [fundingSuccess, setFundingSuccess] = useState<string>('');
  const [botCopied, setBotCopied] = useState(false);

  // Grid Strategy State
  const [strategyType, setStrategyType] = useState<GridStrategyType>('symmetrical');
  const [orderSize, setOrderSize] = useState<string>('50');
  const [gridStepPercent, setGridStepPercent] = useState<string>('0.20');

  // Trading State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);

  // Bot Instance and Logs
  const [botInstance, setBotInstance] = useState<GridMarketMakingBot | null>(null);
  const [logs, setLogs] = useState<string[]>(['[System] Orion Grid Trading Bot initialized on Mainnet...']);
  const [showSettings, setShowSettings] = useState(false);
  const [mainWalletBalance, setMainWalletBalance] = useState<number>(0);

  // Load bot wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stellar_bot_wallet');
    if (stored) {
      try {
        const wallet = JSON.parse(stored);
        setBotWallet(wallet);
        // Refresh balance from network
        refreshBotBalance(wallet.publicKey);
      } catch (error) {
        console.error('[v0] Failed to load bot wallet:', error);
      }
    }
  }, []);

  // Load main wallet balance
  useEffect(() => {
    if (activeWallet) {
      loadMainWalletBalance();
    }
  }, [activeWallet]);

  const loadMainWalletBalance = async () => {
    if (!activeWallet) return;
    try {
      const balance = await getMainWalletBalance(activeWallet.publicKey);
      setMainWalletBalance(balance.xlm);
    } catch (error) {
      console.error('[v0] Failed to load main wallet balance:', error);
    }
  };

  const refreshBotBalance = async (publicKey: string) => {
    try {
      const balance = await getBotWalletBalance(publicKey);
      setBotWallet(prev => prev ? { ...prev, balance } : null);
    } catch (error) {
      console.error('[v0] Failed to refresh bot balance:', error);
    }
  };

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  }, []);

  const handleGenerateBotWallet = useCallback(() => {
    setShowBotWalletModal(true);
  }, []);

  const handleBotWalletCreated = useCallback((wallet: BotWalletData) => {
    setBotWallet(wallet);
    addLog('Bot wallet created and secured on Mainnet');
    setShowBotWalletModal(false);
  }, [addLog]);

  const handleFundBot = useCallback(async () => {
    if (!activeWallet || !botWallet || !fundingAmount) {
      setFundingError('Please provide all required information');
      return;
    }

    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      setFundingError('Please enter a valid amount');
      return;
    }

    if (amount < 1) {
      setFundingError('Minimum funding is 1 XLM (required for wallet activation)');
      return;
    }

    if (amount > mainWalletBalance) {
      setFundingError(`Insufficient balance. You have ${mainWalletBalance.toFixed(2)} XLM`);
      return;
    }

    setIsFunding(true);
    setFundingError('');
    setFundingSuccess('');

    try {
      // Get wallet secret for signing transaction
      let walletSecret: string;
      try {
        walletSecret = unlockWallet(activeWallet.id, '');
      } catch {
        setFundingError('Please unlock your wallet first to authorize the transaction');
        setIsFunding(false);
        return;
      }

      const transferConfig = {
        fromSecretKey: walletSecret,
        toBotPublicKey: botWallet.publicKey,
        amountXlm: amount,
      };

      const result = await transferFundsToBotWallet(transferConfig);

      if (result.success) {
        setFundingSuccess(`Transferred ${fundingAmount} XLM to bot wallet. Transaction: ${result.hash?.substring(0, 16)}...`);
        addLog(`Funded bot wallet with ${fundingAmount} XLM on Mainnet. TX: ${result.hash?.substring(0, 20)}...`);
        
        // Refresh balances
        await refreshBotBalance(botWallet.publicKey);
        await loadMainWalletBalance();
        
        setFundingAmount('');
      } else {
        setFundingError(result.error || 'Transfer failed');
        addLog(`Funding error: ${result.error}`);
      }
    } catch (error: any) {
      setFundingError(`Funding failed: ${error.message}`);
      addLog(`Funding error: ${error}`);
    } finally {
      setIsFunding(false);
    }
  }, [activeWallet, botWallet, fundingAmount, mainWalletBalance, addLog, unlockWallet]);

  const handleStartBot = useCallback(async () => {
    if (!botWallet || botWallet.balance < 1) {
      addLog('Bot wallet must have at least 1 XLM funded on Mainnet to operate');
      return;
    }

    if (isDryRun) {
      addLog('DRY-RUN MODE: Orders will be simulated, not submitted to Mainnet');
    } else {
      addLog(`Starting LIVE Grid Bot on MAINNET with ${strategyType} strategy...`);
      addLog(`Using ${orderSize} XLM per grid level, grid step: ${gridStepPercent}%`);
    }

    setIsRunning(true);

    try {
      // Get current spot price (mock for now)
      const spotPrice = 0.15;
      
      const config = {
        botSecretKey: botWallet.secretKey,
        tradingPair: {
          buying: new Asset(selectedAsset?.code || 'FORGE', selectedAsset?.issuer || 'GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJsu6LPJKW6KBTDNPK5YGDX7QU6'),
          selling: Asset.native(),
        },
        strategyType,
        spotPrice,
        orderSize: parseFloat(orderSize),
        enableAutoUpdate: true,
      };

      const bot = new GridMarketMakingBot(config);
      setBotInstance(bot);

      if (!isDryRun) {
        await bot.start();
        addLog('Grid bot trading loop started on Mainnet');
      } else {
        await bot.initializeGrid();
        addLog('Grid initialized for DRY-RUN preview');
        const botLogs = bot.getLogs();
        setLogs(botLogs);
      }
    } catch (error) {
      addLog(`Error starting bot: ${error}`);
      setIsRunning(false);
    }
  }, [botWallet, isDryRun, strategyType, orderSize, gridStepPercent, selectedAsset, addLog]);

  const handleStopBot = useCallback(async () => {
    if (botInstance && !isDryRun) {
      await botInstance.stop();
      addLog('Bot stopped on Mainnet, all orders cancelled');
    }
    setBotInstance(null);
    setIsRunning(false);
  }, [botInstance, isDryRun, addLog]);

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
    if (!confirm('Are you sure? This will reset the bot wallet. Funds require manual recovery with your secret key.')) {
      return;
    }

    if (isRunning) {
      await handleStopBot();
    }

    localStorage.removeItem('stellar_bot_wallet');
    setBotWallet(null);
    addLog('Bot wallet reset. Generate or import a new wallet to continue.');
  }, [isRunning, addLog]);

  return (
    <div className="space-y-4 p-4">
      <BotWalletModal
        isOpen={showBotWalletModal}
        onClose={() => setShowBotWalletModal(false)}
        onWalletCreated={handleBotWalletCreated}
      />

      {/* Bot Wallet Section */}
      <div className="border border-destructive/20 rounded-lg p-4 space-y-3 bg-destructive/5">
        {botWallet ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Bot Wallet</h3>
                <span className="text-xs font-bold px-2 py-1 rounded bg-destructive/20 text-destructive border border-destructive/30">
                  MAINNET
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBotWalletModal(true)}
                  disabled={isRunning}
                  className="p-1 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
                  title="Manage Bot Wallet"
                >
                  <Settings className="w-3.5 h-3.5 text-primary" />
                </button>
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
              {botWallet.balance >= 1 && <span className="text-green-400 ml-2">✓ Active</span>}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-muted-foreground text-center">No bot wallet created yet</p>
            <Button
              onClick={() => setShowBotWalletModal(true)}
              size="sm"
              className="gap-2"
            >
              <Bot className="w-3 h-3" />
              Create or Import Bot Wallet
            </Button>
          </div>
        )}
      </div>

      {/* Fund Bot Wallet - Only show when wallet exists */}
      {botWallet && (
        <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
          <div>
            <Label className="text-xs font-semibold">Fund Bot Wallet on Mainnet</Label>
            <p className="text-xs text-muted-foreground mt-1">Main wallet balance: {mainWalletBalance.toFixed(2)} XLM</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Amount (XLM) - Min 1 XLM"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              disabled={isFunding || !activeWallet}
              className="h-8 text-sm"
            />
            <Button
              onClick={handleFundBot}
              disabled={isFunding || !activeWallet || !fundingAmount}
              size="sm"
              className="gap-1"
            >
              <Zap className="w-3 h-3" />
              Fund
            </Button>
          </div>
          {fundingError && <p className="text-xs text-destructive">{fundingError}</p>}
          {fundingSuccess && <p className="text-xs text-green-400">{fundingSuccess}</p>}
        </div>
      )}

      {/* Grid Strategy Selection - Only show when wallet exists and has funds */}
      {botWallet && botWallet.balance >= 1 && (
        <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
        <h3 className="text-sm font-semibold">Grid Strategy</h3>
        
        <div className="space-y-2">
          <Label className="text-xs">Strategy Type</Label>
          <Select value={strategyType} onValueChange={(val) => setStrategyType(val as GridStrategyType)} disabled={isRunning}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="symmetrical">Symmetrical Grid (10 levels, equal sizes)</SelectItem>
              <SelectItem value="geometric">Geometric Asymmetric (12 levels, rising market)</SelectItem>
              <SelectItem value="defensive">Defensive Grid (6 levels, broad range)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {strategyType === 'symmetrical' && '5 buy + 5 sell levels around spot price'}
            {strategyType === 'geometric' && '8 buy + 4 sell levels, optimized for rising markets'}
            {strategyType === 'defensive' && 'Progressive sizes across ±5% range'}
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Order Size per Level (XLM)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={orderSize}
            onChange={(e) => setOrderSize(e.target.value)}
            disabled={isRunning}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Grid Step (%)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={gridStepPercent}
            onChange={(e) => setGridStepPercent(e.target.value)}
            disabled={isRunning}
            className="h-8 text-xs"
          />
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => setIsDryRun(e.target.checked)}
            disabled={isRunning}
            className="w-4 h-4"
          />
          <span>Dry-Run Mode (simulate grid without trading)</span>
        </label>

        {/* Status Display */}
        <div className="border border-primary/20 rounded-lg p-3 space-y-2 bg-card/50">
        <p className="text-xs">
          Status: <span className={`font-bold ${isRunning ? 'text-green-400' : 'text-muted-foreground'}`}>
            {isRunning ? '🟢 RUNNING' : '⚪ STOPPED'}
          </span>
        </p>
        {isRunning && (
          <p className="text-xs text-muted-foreground">
            Mode: {isDryRun ? '🔄 DRY-RUN' : '⚠️ MAINNET LIVE TRADING'}
          </p>
        )}
        </div>
        </div>
      )}

      {/* Bot Control Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            onClick={handleStartBot}
            disabled={!botWallet || parseFloat(orderSize) <= 0 || botWallet.balance < 1}
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
        <p className="text-xs font-semibold text-primary mb-2">Live Logs - Mainnet Grid Bot</p>
        <div className="space-y-0.5 font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="break-all">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Mainnet Warning */}
      <div className="border border-destructive/20 bg-destructive/10 rounded-md p-3 text-xs text-destructive flex flex-col gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1">
          ⚠️ Mainnet Grid Trading - Critical:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Bot operates exclusively on Stellar Mainnet with REAL funds</li>
          <li>Grid orders are placed using ManageBuyOffer/ManageSellOffer with 20s timeout</li>
          <li>All prices are subject to slippage checks before submission</li>
          <li>Orders auto-cancel when bot is stopped - all positions closed</li>
          <li>Use DRY-RUN first to validate your strategy before live trading</li>
          <li className="text-destructive font-bold">Secret key = permanent access to funds. Guard it carefully!</li>
        </ul>
      </div>
    </div>
  );
}
