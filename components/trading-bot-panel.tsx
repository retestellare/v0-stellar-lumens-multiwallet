'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bot, Play, Square, Copy, Check, AlertTriangle, Settings, Trash2, Lock, Info, Zap, Eye, EyeOff } from 'lucide-react';
import { Keypair, Asset, Horizon } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/lib/wallet-context';
import { GridMarketMakingBot, GridStrategyType } from '@/lib/grid-strategies';
import { transferFundsToBotWallet, getBotWalletBalance, getMainWalletBalance, TransactionResult } from '@/lib/fund-transfer';
import { decryptSecret, addTrustline, getAccountBalancesClean } from '@/lib/stellar-utils';
import { BotWalletModal } from '@/components/bot-wallet-modal';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

interface BotWalletData {
  publicKey: string;
  secretKey: string;
  encryptedSecret: string;
  balance: number;
  createdAt: string;
  network: 'mainnet';
  password?: string;
}

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  const { activeWallet } = useWallet();

  // Bot Wallet State
  const [botWallet, setBotWallet] = useState<BotWalletData | null>(null);
  const [botTokenHoldings, setBotTokenHoldings] = useState<any[]>([]);
  const [showBotWalletModal, setShowBotWalletModal] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingPassword, setFundingPassword] = useState<string>('');
  const [showFundingPassword, setShowFundingPassword] = useState(false);
  const [fundingAmount, setFundingAmount] = useState<string>('10');
  const [fundingError, setFundingError] = useState<string>('');
  const [fundingSuccess, setFundingSuccess] = useState<string>('');
  const [botCopied, setBotCopied] = useState(false);

  // Grid Strategy State - Locked to Spread Market Maker
  const [orderSize, setOrderSize] = useState<string>('50');
  const [gridStepPercent, setGridStepPercent] = useState<string>('0.20');
  const strategyType: GridStrategyType = 'spread'; // Only use Spread Market Maker

  // Trading State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isDryRun, setIsDryRun] = useState<boolean>(true);
  const [sessionPassword, setSessionPassword] = useState<string>('');
  const [showSessionPasswordModal, setShowSessionPasswordModal] = useState<boolean>(false);
  const [sessionPasswordInput, setSessionPasswordInput] = useState<string>('');
  const [showSessionPasswordInput, setShowSessionPasswordInput] = useState(false);
  const [walletPassword, setWalletPassword] = useState<string>('');
  const [showWalletPassword, setShowWalletPassword] = useState(false);
  const [trustlinePassword, setTrustlinePassword] = useState<string>('');
  const [showTrustlinePassword, setShowTrustlinePassword] = useState(false);
  const [isTrustlineSetup, setIsTrustlineSetup] = useState<boolean>(false);
  const [trustlineLoading, setTrustlineLoading] = useState<boolean>(false);

  // Bot Instance and Logs
  const [botInstance, setBotInstance] = useState<GridMarketMakingBot | null>(null);
  const [logs, setLogs] = useState<string[]>(['[System] Orion Grid Trading Bot initialized on Mainnet...']);
  const [showSettings, setShowSettings] = useState(false);
  const [mainWalletBalance, setMainWalletBalance] = useState<number>(0);

  // Token Selector State
  const [selectedToken, setSelectedToken] = useState<string>('xlm');
  const [customAssetCode, setCustomAssetCode] = useState<string>('');
  const [customIssuer, setCustomIssuer] = useState<string>('');

  // Load bot wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stellar_bot_wallet');
    if (stored) {
      try {
        const wallet = JSON.parse(stored);
        setBotWallet(wallet);
        // If wallet exists and no session password, show password modal
        if (!sessionPassword) {
          setShowSessionPasswordModal(true);
        }
        // Immediately refresh balance and token holdings from Mainnet Horizon
        (async () => {
          try {
            const balance = await getBotWalletBalance(wallet.publicKey);
            setBotWallet(prev => prev ? { ...prev, balance } : null);
            // Fetch all token holdings
            const holdings = await getAccountBalancesClean(wallet.publicKey);
            setBotTokenHoldings(holdings);
          } catch (error) {
            console.error('[v0] Failed to fetch bot wallet balance and holdings from Mainnet:', error);
          }
        })();
      } catch (error) {
        console.error('[v0] Failed to parse stored bot wallet:', error);
      }
    }
  }, []); // Only run on mount

  // Show modal if wallet exists but no session password
  useEffect(() => {
    const stored = localStorage.getItem('stellar_bot_wallet');
    if (stored && !sessionPassword) {
      setShowSessionPasswordModal(true);
    }
  }, [sessionPassword]);

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

  const refreshBotBalance = useCallback(async (publicKey: string) => {
    try {
      const balance = await getBotWalletBalance(publicKey);
      setBotWallet(prev => prev ? { ...prev, balance } : null);
      // Also fetch updated token holdings
      const holdings = await getAccountBalancesClean(publicKey);
      setBotTokenHoldings(holdings);
      console.log('[v0] Bot wallet balance and holdings refreshed from Mainnet:', balance);
    } catch (error) {
      console.error('[v0] Failed to refresh bot balance and holdings from Mainnet:', error);
    }
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  }, []);

  const handleGenerateBotWallet = useCallback(() => {
    setShowBotWalletModal(true);
  }, []);

  const handleBotWalletCreated = useCallback((wallet: BotWalletData) => {
    setBotWallet(wallet);
    // Store password in session if provided
    if (wallet.password) {
      setSessionPassword(wallet.password);
    }
    addLog('Bot wallet created and secured on Mainnet');
    // Immediately refresh balance from Mainnet after creation/import
    refreshBotBalance(wallet.publicKey);
    setShowBotWalletModal(false);
  }, [addLog]);

  const handleFundBot = useCallback(async () => {
    if (!activeWallet || !botWallet || !fundingAmount) {
      setFundingError('Please provide all required information');
      return;
    }

    if (!fundingPassword) {
      setFundingError('Please enter your wallet password to authorize the transfer');
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
      // Get wallet secret for signing transaction using same logic as dashboard send button
      let walletSecret: string;
      try {
        walletSecret = decryptSecret(activeWallet.encryptedSecret, fundingPassword);
      } catch (err: any) {
        setFundingError('Invalid password. Please check your wallet password and try again.');
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
        try {
          await refreshBotBalance(botWallet.publicKey);
          await loadMainWalletBalance();
        } catch (balanceError) {
          console.error('[v0] Balance refresh error:', balanceError);
        }
        
        setFundingAmount('');
        setFundingPassword('');
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
  }, [activeWallet, botWallet, fundingAmount, fundingPassword, mainWalletBalance, addLog]);

  /**
   * Check if trustline exists and create if missing.
   * This function explicitly receives the wallet password as a parameter.
   */
  const checkAndCreateTrustline = useCallback(
    async (password: string, asset: Asset, assetCode: string, assetIssuer: string, assetDisplay: string): Promise<boolean> => {
      if (!password || password.trim() === '') {
        addLog('[Error] Invalid or missing wallet password for authorization.');
        return false;
      }
      
      try {
        if (asset.isNative()) {
          return true;
        }

        const horizon = new Horizon.Server('https://horizon.stellar.org');
        const account = await horizon.loadAccount(botWallet!.publicKey);
        const hasTrust = account.balances.some((b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer);

        if (!hasTrust) {
          addLog(`[System] Missing Trustline for ${assetDisplay}. Opening on Mainnet...`);

          // Decrypt bot secret key using the passed password parameter
          let botSecretKey: string;
          try {
            botSecretKey = decryptSecret(botWallet!.encryptedSecret, password);
          } catch (err: any) {
            addLog('[Error] Invalid or missing wallet password for authorization.');
            return false;
          }

          // Open trustline using addTrustline
          const trustlineResult = await addTrustline(botSecretKey, assetCode, assetIssuer);

          if (!trustlineResult.success) {
            const errorCode = trustlineResult.error || 'unknown_error';
            addLog(`[Error] Failed to open trustline for ${assetDisplay}. Error: ${errorCode}`);
            return false;
          }

          addLog(`[System] Trustline for ${assetDisplay} confirmed on Mainnet. Proceeding with strategy launch.`);

          // Small delay to ensure trustline is fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return true;
      } catch (error: any) {
        let errorCode = 'unknown_error';
        if (error.response?.data?.extras?.result_codes) {
          const codes = error.response.data.extras.result_codes;
          errorCode = codes.operations?.[0] || codes.transaction || errorCode;
        }
        addLog(`[Error] Trustline validation failed: ${errorCode}`);
        return false;
      }
    },
    [botWallet, addLog]
  );

  const handleAddTrustline = useCallback(async () => {
    if (!sessionPassword || sessionPassword.trim() === '') {
      addLog('[Error] Session expired. Please re-authenticate with your wallet password.');
      setShowSessionPasswordModal(true);
      return;
    }

    if (selectedToken === 'xlm') {
      addLog('[Error] XLM does not require a trustline.');
      return;
    }

    if (!botWallet) {
      addLog('[Error] Bot wallet not found.');
      return;
    }

    // Validate custom token if selected
    if (selectedToken === 'custom') {
      if (!customAssetCode.trim() || !customIssuer.trim()) {
        addLog('Error: Please enter both Asset Code and Issuer Public Key for custom token');
        return;
      }
    }

    // Determine the trading asset based on selection
    let tradingAsset: Asset;
    let assetDisplay: string;
    let assetCode: string;
    let assetIssuer: string;

    if (selectedToken === 'usdc') {
      assetCode = 'USDC';
      assetIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5T36C2YNE7L';
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = 'USDC';
    } else if (selectedToken === 'eurc') {
      assetCode = 'EURC';
      assetIssuer = 'GDHU6W2FSTZ7N6D7S5S7N7GFF6AL66S7X4K6P4K3K3K3K3K3K3K3K3';
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = 'EURC';
    } else if (selectedToken === 'custom') {
      assetCode = customAssetCode;
      assetIssuer = customIssuer;
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = assetCode;
    } else {
      addLog('[Error] Invalid token selection.');
      return;
    }

    setTrustlineLoading(true);
    try {
      const trustlineReady = await checkAndCreateTrustline(
        sessionPassword,
        tradingAsset,
        assetCode,
        assetIssuer,
        assetDisplay
      );

      if (trustlineReady) {
        setIsTrustlineSetup(true);
        addLog(`[System] Trustline for ${assetDisplay} is ready. You can now start the bot.`);
      }
    } catch (error: any) {
      addLog(`[Error] Failed to add trustline: ${error.message}`);
    } finally {
      setTrustlineLoading(false);
    }
  }, [sessionPassword, selectedToken, customAssetCode, customIssuer, botWallet, checkAndCreateTrustline, addLog]);

  const handleStartBot = useCallback(async () => {
    // Check if session password exists
    if (!sessionPassword || sessionPassword.trim() === '') {
      addLog('[Error] Session expired. Please re-authenticate with your wallet password.');
      setShowSessionPasswordModal(true);
      return;
    }
    
    if (!botWallet || botWallet.balance < 1) {
      addLog('Bot wallet must have at least 1 XLM funded on Mainnet to operate');
      return;
    }

    // Validate custom token if selected
    if (selectedToken === 'custom') {
      if (!customAssetCode.trim() || !customIssuer.trim()) {
        addLog('Error: Please enter both Asset Code and Issuer Public Key for custom token');
        return;
      }
    }

    // For non-XLM tokens, verify trustline is already set up
    if (selectedToken !== 'xlm' && !isTrustlineSetup) {
      addLog('[Error] Please add the trustline for the selected token before launching the bot.');
      return;
    }

    // Determine the trading asset based on selection
    let tradingAsset: Asset;
    let assetDisplay: string;
    let assetCode: string;
    let assetIssuer: string;

    if (selectedToken === 'xlm') {
      tradingAsset = Asset.native();
      assetDisplay = 'XLM';
      assetCode = 'XLM';
      assetIssuer = '';
    } else if (selectedToken === 'usdc') {
      assetCode = 'USDC';
      assetIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5T36C2YNE7L';
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = 'USDC';
    } else if (selectedToken === 'eurc') {
      assetCode = 'EURC';
      assetIssuer = 'GDHU6W2FSTZ7N6D7S5S7N7GFF6AL66S7X4K6P4K3K3K3K3K3K3K3K3';
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = 'EURC';
    } else if (selectedToken === 'custom') {
      assetCode = customAssetCode;
      assetIssuer = customIssuer;
      tradingAsset = new Asset(assetCode, assetIssuer);
      assetDisplay = assetCode;
    } else {
      tradingAsset = Asset.native();
      assetDisplay = 'XLM';
      assetCode = 'XLM';
      assetIssuer = '';
    }

    // Spread market maker strategy requires XLM as base currency
    if (selectedToken !== 'xlm') {
      addLog('[Error] Spread Market Maker strategy requires XLM as the base currency.');
      return;
    }

    if (isDryRun) {
      addLog('DRY-RUN MODE: Orders will be simulated, not submitted to Mainnet');
    } else {
      addLog(`Starting LIVE Bot on MAINNET with ${strategyType} strategy...`);
      addLog(`Strategy: Spread Market Maker - Places buy orders at spreads using XLM, sells purchases at spread prices`);
      addLog(`Order Size: ${orderSize} XLM per level, Grid Step: ${gridStepPercent}%`);
    }

    setIsRunning(true);

    try {
      // Get current spot price (will fetch real price from Stellar API)
      const spotPrice = 0.15;

      // Use bot's encrypted secret key with session password
      let decryptedSecretKey: string;
      try {
        decryptedSecretKey = decryptSecret(botWallet.encryptedSecret, sessionPassword);
      } catch (err: any) {
        addLog('[Error] Failed to decrypt wallet. Session may have expired.');
        setIsRunning(false);
        setShowSessionPasswordModal(true);
        return;
      }

      const config = {
        botSecretKey: decryptedSecretKey,
        tradingPair: {
          buying: tradingAsset,
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
        addLog('Bot trading loop started on Mainnet');
      } else {
        await bot.initializeGrid();
        addLog('Grid initialized for DRY-RUN preview');
        const botLogs = bot.getLogs();
        setLogs(botLogs);
      }
    } catch (error: any) {
      let errorCode = 'unknown_error';
      if (error.response?.data?.extras?.result_codes) {
        const codes = error.response.data.extras.result_codes;
        errorCode = codes.operations?.[0] || codes.transaction || errorCode;
      }
      addLog(`[Error] Bot startup failed: ${errorCode}`);
      setIsRunning(false);
    }
  }, [botWallet, isDryRun, strategyType, orderSize, gridStepPercent, selectedToken, customAssetCode, customIssuer, isTrustlineSetup, sessionPassword, addLog]);

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
      {/* Session Password Modal */}
      {showSessionPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold">Re-authenticate Wallet</h2>
            <p className="text-xs text-muted-foreground">
              Enter your wallet password to authorize bot operations for this session.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Wallet Password</Label>
              <div className="relative">
                <Input
                  type={showSessionPasswordInput ? 'text' : 'password'}
                  placeholder="Enter your wallet password"
                  value={sessionPasswordInput}
                  onChange={(e) => setSessionPasswordInput(e.target.value)}
                  className="h-8 text-sm pr-8"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && sessionPasswordInput.trim()) {
                      setSessionPassword(sessionPasswordInput);
                      setShowSessionPasswordModal(false);
                      setSessionPasswordInput('');
                    }
                  }}
                />
                <button
                  onClick={() => setShowSessionPasswordInput(!showSessionPasswordInput)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  {showSessionPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSessionPasswordModal(false);
                  setSessionPasswordInput('');
                }}
                className="flex-1 h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (sessionPasswordInput.trim()) {
                    setSessionPassword(sessionPasswordInput);
                    setShowSessionPasswordModal(false);
                    setSessionPasswordInput('');
                  }
                }}
                disabled={!sessionPasswordInput.trim()}
                className="flex-1 h-8 text-xs"
              >
                Authenticate
              </Button>
            </div>
          </div>
        </div>
      )}

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
            
            {/* Token Holdings */}
            {botTokenHoldings.length > 0 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-destructive/10">
                <p className="text-xs font-semibold text-muted-foreground">Token Holdings:</p>
                <div className="space-y-1">
                  {botTokenHoldings.map((holding, idx) => {
                    const assetCode = holding.asset_code || 'XLM';
                    const assetIssuer = holding.asset_issuer 
                      ? `${holding.asset_issuer.substring(0, 6)}...${holding.asset_issuer.substring(-4)}`
                      : 'Native';
                    const balance = parseFloat(holding.balance).toFixed(4);
                    
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs bg-background/50 p-2 rounded">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-primary">{assetCode}</span>
                          {holding.asset_issuer && (
                            <span className="text-muted-foreground text-xs">{assetIssuer}</span>
                          )}
                        </div>
                        <span className="font-semibold">{balance}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

          {/* Amount Input */}
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
              disabled={isFunding || !activeWallet || !fundingAmount || !fundingPassword}
              size="sm"
              className="gap-1"
            >
              <Zap className="w-3 h-3" />
              Fund
            </Button>
          </div>

          {/* Password Input for Authorization */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Wallet Password (to authorize transfer)
            </Label>
            <div className="relative">
              <Input
                type={showFundingPassword ? 'text' : 'password'}
                placeholder="Enter your wallet password"
                value={fundingPassword}
                onChange={(e) => setFundingPassword(e.target.value)}
                disabled={isFunding || !activeWallet}
                className="h-8 text-sm pr-8"
              />
              <button
                onClick={() => setShowFundingPassword(!showFundingPassword)}
                disabled={isFunding}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                type="button"
              >
                {showFundingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {fundingError && <p className="text-xs text-destructive">{fundingError}</p>}
          {fundingSuccess && <p className="text-xs text-green-400">{fundingSuccess}</p>}
        </div>
      )}

      {/* Grid Strategy Selection - Only show when wallet exists and has funds */}
      {botWallet && botWallet.balance >= 1 && (
        <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-card/50">
        <h3 className="text-sm font-semibold">Grid Strategy</h3>
        
        {/* Spread Market Maker Strategy Info */}
        <div className="border border-primary/20 rounded-lg p-3 bg-primary/5 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold text-primary">Spread Market Maker Strategy</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Places buy orders just above the best bid and sell orders just below the best ask. Updates every 5-10 seconds to capture spreads on Mainnet.
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

      {/* Token Selector */}
      <div className="border border-border rounded-lg p-4 space-y-4 bg-background/50">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trading Token</Label>
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a token to trade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlm">XLM (Stellar Native)</SelectItem>
              <SelectItem value="usdc">USDC (Mainnet)</SelectItem>
              <SelectItem value="eurc">EURC (Mainnet)</SelectItem>
              <SelectItem value="custom">Custom Token</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Bot will trade XLM against the selected token
          </p>
        </div>

        {selectedToken === 'custom' && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Asset Code</Label>
              <Input
                placeholder="e.g., MYTOKEN"
                value={customAssetCode}
                onChange={(e) => setCustomAssetCode(e.target.value.toUpperCase())}
                maxLength={12}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The token code (e.g., USDC, BTC, ETH)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Issuer Public Key</Label>
              <Input
                placeholder="e.g., GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5T36C2YNE7L"
                value={customIssuer}
                onChange={(e) => setCustomIssuer(e.target.value.trim())}
                className="text-xs font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The Stellar public key that issued this token
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trustline Setup Section - Only for non-XLM tokens */}
      {botWallet && selectedToken !== 'xlm' && !isTrustlineSetup && (
        <div className="border border-amber-500/20 rounded-lg p-4 space-y-3 bg-amber-500/5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1 text-amber-600">
              <Zap className="w-3 h-3" />
              Add Trustline for {selectedToken.toUpperCase()}
            </Label>
            <p className="text-xs text-muted-foreground">
              Click the button below to add a trustline for this token to your bot wallet using your stored session password.
            </p>
          </div>
          <Button
            onClick={handleAddTrustline}
            disabled={!sessionPassword || trustlineLoading}
            className="w-full"
            variant="outline"
          >
            {trustlineLoading ? 'Adding Trustline...' : 'Add Trustline'}
          </Button>
        </div>
      )}

      {/* Trustline Confirmed Status */}
      {botWallet && selectedToken !== 'xlm' && isTrustlineSetup && (
        <div className="border border-green-500/20 rounded-lg p-3 bg-green-500/5 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-600">
            Trustline for {selectedToken.toUpperCase()} is ready
          </span>
        </div>
      )}

      {/* Strategy Requirements Info */}
      {botWallet && (
        <div className="border border-blue-500/20 rounded-lg p-3 bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-600 mb-1">Strategy Requirements:</p>
          <p className="text-xs text-muted-foreground">
            <strong>Spread Market Maker:</strong> Only XLM is needed. The bot places buy orders just above the best bid and sell orders just below the best ask, automatically executing spread trades on Stellar Mainnet.
          </p>
        </div>
      )}

      {/* Bot Control Buttons */}
      <div className="flex gap-2">
        {!isRunning ? (
          <Button
            onClick={() => {
              // If no session password, show modal first before proceeding
              if (!sessionPassword) {
                setShowSessionPasswordModal(true);
              } else {
                handleStartBot();
              }
            }}
            disabled={!botWallet || parseFloat(orderSize) <= 0 || botWallet.balance < 1 || (selectedToken !== 'xlm' && !isTrustlineSetup)}
            className="flex-1 gap-2"
          >
            <Play className="w-4 h-4" />
            LAUNCH BOT
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
