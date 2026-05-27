'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { Header } from '@/components/header';
import { 
  pathPaymentStrictSend, 
  findStrictSendPaths, 
  getAccountBalances,
  decryptSecret,
  getLiquidityPoolDetails
} from '@/lib/stellar-utils';
import { 
  Zap, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Shield,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  tokenCode: string;
  tokenIssuer: string;
  sendAmount: string;
  expectedReturn: string;
  profitPercent: number;
  path: Array<{ code: string; issuer?: string }>;
  source: 'orderbook' | 'pool' | 'mixed';
  timestamp: Date;
}

interface ArbitrageLog {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
  txHash?: string;
}

export default function ArbitragePage() {
  const { wallets, activeWalletId } = useWallet();
  const activeWallet = wallets.find(w => w.id === activeWalletId);
  
  // User settings
  const [xlmQuota, setXlmQuota] = useState<string>('10');
  const [minProfitPercent, setMinProfitPercent] = useState<string>('1');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  
  // Security
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [logs, setLogs] = useState<ArbitrageLog[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [xlmBalance, setXlmBalance] = useState<string>('0');
  const [executingId, setExecutingId] = useState<string | null>(null);
  
  // Monitoring interval ref
  const monitoringRef = useRef<NodeJS.Timeout | null>(null);
  
  // Popular tokens to scan for arbitrage
  const SCAN_TOKENS = [
    { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    { code: 'yXLM', issuer: 'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55' },
    { code: 'AQUA', issuer: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA' },
    { code: 'SHX', issuer: 'GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ636HK6Y4U32VCGYHYVQ2A2W' },
    { code: 'SSLX', issuer: 'GBHFGY3ZFPNFVNWBJZZL2E3VDCFPWOKB4MLWLXWGM3TZQJSF3BN3DJHK' },
  ];
  
  // Add log entry
  const addLog = useCallback((type: ArbitrageLog['type'], message: string, txHash?: string) => {
    setLogs(prev => [{
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      txHash
    }, ...prev].slice(0, 50)); // Keep last 50 logs
  }, []);
  
  // Fetch XLM balance
  useEffect(() => {
    if (!activeWallet) return;
    
    const fetchBalance = async () => {
      try {
        const balances = await getAccountBalances(activeWallet.publicKey);
        const xlm = balances.find((b: any) => b.asset_type === 'native');
        setXlmBalance(xlm?.balance || '0');
      } catch {
        setXlmBalance('0');
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [activeWallet]);
  
  // Scan for arbitrage opportunities
  const scanForOpportunities = useCallback(async () => {
    if (!activeWallet || isScanning) return;
    
    setIsScanning(true);
    addLog('info', 'Scanning for arbitrage opportunities...');
    
    const newOpportunities: ArbitrageOpportunity[] = [];
    const sendAmount = xlmQuota;
    const minProfit = parseFloat(minProfitPercent) / 100;
    
    try {
      for (const token of SCAN_TOKENS) {
        // Find path: XLM -> Token -> XLM (round trip)
        // Step 1: XLM -> Token
        const pathsToToken = await findStrictSendPaths(
          'XLM', undefined,
          token.code, token.issuer,
          sendAmount
        );
        
        if (pathsToToken.length === 0) continue;
        
        // Get best token amount we'd receive
        const bestToToken = pathsToToken[0];
        const tokenAmount = bestToToken.destination_amount;
        
        // Step 2: Token -> XLM (with that token amount)
        const pathsBackToXLM = await findStrictSendPaths(
          token.code, token.issuer,
          'XLM', undefined,
          tokenAmount
        );
        
        if (pathsBackToXLM.length === 0) continue;
        
        // Get best XLM amount we'd receive back
        const bestBackToXLM = pathsBackToXLM[0];
        const returnAmount = parseFloat(bestBackToXLM.destination_amount);
        const startAmount = parseFloat(sendAmount);
        
        // Calculate profit
        const profit = returnAmount - startAmount;
        const profitPercent = (profit / startAmount) * 100;
        
        // Only add if profitable above threshold
        if (profitPercent > minProfit * 100) {
          newOpportunities.push({
            id: `${token.code}-${Date.now()}`,
            tokenCode: token.code,
            tokenIssuer: token.issuer,
            sendAmount: sendAmount,
            expectedReturn: returnAmount.toFixed(7),
            profitPercent: profitPercent,
            path: [{ code: token.code, issuer: token.issuer }],
            source: 'mixed',
            timestamp: new Date()
          });
          
          addLog('success', `Found opportunity: ${token.code} +${profitPercent.toFixed(2)}% profit`);
        }
      }
      
      setOpportunities(newOpportunities);
      
      if (newOpportunities.length === 0) {
        addLog('info', 'No profitable opportunities found in this scan');
      } else {
        addLog('success', `Found ${newOpportunities.length} arbitrage opportunities`);
      }
    } catch (error: any) {
      addLog('error', `Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  }, [activeWallet, xlmQuota, minProfitPercent, addLog, isScanning]);
  
  // Execute arbitrage
  const executeArbitrage = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!activeWallet || !isAuthenticated) {
      addLog('error', 'Please authenticate first');
      return;
    }
    
    setExecutingId(opportunity.id);
    addLog('info', `Executing arbitrage: ${opportunity.tokenCode}...`);
    
    try {
      // Decrypt secret key
      const secretKey = decryptSecret(activeWallet.encryptedSecret, password);
      if (!secretKey) {
        addLog('error', 'Failed to decrypt wallet');
        setExecutingId(null);
        return;
      }
      
      // Calculate destMin with anti-loss protection
      // We require at least the original amount + minimum profit
      const startAmount = parseFloat(opportunity.sendAmount);
      const minProfitAmount = startAmount * (parseFloat(minProfitPercent) / 100);
      const destMin = (startAmount + minProfitAmount).toFixed(7);
      
      addLog('info', `Anti-loss protection: minimum return ${destMin} XLM`);
      
      // Execute atomic path payment: XLM -> Token -> XLM
      const result = await pathPaymentStrictSend(
        secretKey,
        'XLM', undefined, // Send XLM
        opportunity.sendAmount,
        'XLM', undefined, // Receive XLM (round trip)
        destMin, // CRITICAL: Anti-loss minimum
        opportunity.path, // Through token
        activeWallet.publicKey // Send to self
      );
      
      if (result.success) {
        addLog('success', `Arbitrage successful! TX: ${result.hash?.substring(0, 8)}...`, result.hash);
        // Remove executed opportunity
        setOpportunities(prev => prev.filter(o => o.id !== opportunity.id));
      } else {
        addLog('error', `Arbitrage failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog('error', `Execution error: ${error.message}`);
    } finally {
      setExecutingId(null);
    }
  }, [activeWallet, isAuthenticated, password, minProfitPercent, addLog]);
  
  // Auto-execute best opportunity
  useEffect(() => {
    if (!autoExecute || !isMonitoring || opportunities.length === 0) return;
    
    // Find best opportunity
    const best = opportunities.reduce((a, b) => 
      a.profitPercent > b.profitPercent ? a : b
    );
    
    if (best.profitPercent > parseFloat(minProfitPercent)) {
      executeArbitrage(best);
    }
  }, [opportunities, autoExecute, isMonitoring, minProfitPercent, executeArbitrage]);
  
  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      // Stop monitoring
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
        monitoringRef.current = null;
      }
      setIsMonitoring(false);
      addLog('info', 'Arbitrage monitoring stopped');
    } else {
      // Start monitoring
      if (!isAuthenticated && autoExecute) {
        addLog('warning', 'Please authenticate to enable auto-execute');
        return;
      }
      
      setIsMonitoring(true);
      addLog('info', `Arbitrage monitoring started (Quota: ${xlmQuota} XLM, Min Profit: ${minProfitPercent}%)`);
      
      // Initial scan
      scanForOpportunities();
      
      // Scan every 15 seconds
      monitoringRef.current = setInterval(scanForOpportunities, 15000);
    }
  }, [isMonitoring, isAuthenticated, autoExecute, xlmQuota, minProfitPercent, scanForOpportunities, addLog]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
      }
    };
  }, []);
  
  // Authenticate
  const handleAuthenticate = () => {
    if (!activeWallet || !password) return;
    
    try {
      const secretKey = decryptSecret(activeWallet.encryptedSecret, password);
      if (secretKey) {
        setIsAuthenticated(true);
        addLog('success', 'Wallet authenticated successfully');
      } else {
        addLog('error', 'Invalid password');
      }
    } catch {
      addLog('error', 'Authentication failed');
    }
  };
  
  if (!activeWallet) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="glow-border p-8 rounded-lg text-center">
            <p className="text-muted-foreground">Please connect a wallet to use arbitrage</p>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Atomic Arbitrage</h1>
            <p className="text-sm text-muted-foreground">XLM round-trip via orderbook/pools</p>
          </div>
        </div>
        
        {/* Warning Banner */}
        <div className="glow-border p-4 rounded-lg mb-6 border-l-4 border-l-yellow-500 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Anti-Loss Protection Enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions use <code className="px-1 py-0.5 bg-muted rounded">pathPaymentStrictSend</code> with 
                destMin set above your stake. If profit isn&apos;t guaranteed, the blockchain rejects the 
                transaction atomically - you lose nothing except the fee.
              </p>
            </div>
          </div>
        </div>
        
        {/* Configuration */}
        <div className="glow-border rounded-lg p-5 mb-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* XLM Quota */}
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                XLM Arbitrage Quota
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={xlmQuota}
                  onChange={(e) => setXlmQuota(e.target.value)}
                  disabled={isMonitoring}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="10"
                  min="1"
                  step="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">XLM</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Balance: {parseFloat(xlmBalance).toFixed(2)} XLM
              </p>
            </div>
            
            {/* Min Profit */}
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                Minimum Profit Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={minProfitPercent}
                  onChange={(e) => setMinProfitPercent(e.target.value)}
                  disabled={isMonitoring}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="1"
                  min="0.1"
                  step="0.1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Anti-loss: destMin = stake + {minProfitPercent}%
              </p>
            </div>
          </div>
          
          {/* Authentication */}
          {!isAuthenticated && (
            <div className="border-t border-border pt-4 mt-4">
              <label className="text-sm text-muted-foreground block mb-1.5">
                Wallet Password (required for execution)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter wallet password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleAuthenticate}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Authenticate
                </button>
              </div>
            </div>
          )}
          
          {isAuthenticated && (
            <div className="flex items-center gap-2 text-sm text-green-500 mt-4">
              <CheckCircle2 className="w-4 h-4" />
              <span>Wallet authenticated - ready for execution</span>
            </div>
          )}
          
          {/* Auto Execute Toggle */}
          <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Execute</p>
              <p className="text-xs text-muted-foreground">Automatically execute profitable opportunities</p>
            </div>
            <button
              onClick={() => setAutoExecute(!autoExecute)}
              disabled={!isAuthenticated}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                autoExecute ? 'bg-primary' : 'bg-muted'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                autoExecute ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={toggleMonitoring}
            className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              isMonitoring
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isMonitoring ? (
              <>
                <Square className="w-4 h-4" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Enable Arbitrage Monitoring
              </>
            )}
          </button>
          
          <button
            onClick={scanForOpportunities}
            disabled={isScanning}
            className="py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Now
          </button>
        </div>
        
        {/* Opportunities */}
        <div className="glow-border rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-border bg-background/50">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Opportunities
              </h3>
              <span className="text-sm text-muted-foreground">
                {opportunities.length} found
              </span>
            </div>
          </div>
          
          {opportunities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No opportunities detected yet</p>
              <p className="text-xs mt-1">Click &quot;Scan Now&quot; or enable monitoring</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{opp.tokenCode}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        opp.profitPercent >= 2 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        +{opp.profitPercent.toFixed(2)}%
                      </span>
                    </div>
                    <button
                      onClick={() => executeArbitrage(opp)}
                      disabled={!isAuthenticated || executingId === opp.id}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {executingId === opp.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          Execute
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-destructive">Send {opp.sendAmount} XLM</span>
                    {' → '}
                    <span className="text-foreground">{opp.tokenCode}</span>
                    {' → '}
                    <span className="text-green-500">Receive {opp.expectedReturn} XLM</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Activity Log */}
        <div className="glow-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-background/50">
            <h3 className="text-base font-bold text-foreground">Activity Log</h3>
          </div>
          
          <div className="max-h-[250px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No activity yet
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {logs.map((log) => (
                  <div key={log.id} className="px-4 py-2 flex items-start gap-2">
                    {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
                    {log.type === 'error' && <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />}
                    {log.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
                    {log.type === 'info' && <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        log.type === 'error' ? 'text-destructive' : 
                        log.type === 'success' ? 'text-green-500' : 
                        log.type === 'warning' ? 'text-yellow-500' : 
                        'text-foreground'
                      }`}>
                        {log.message}
                      </p>
                      {log.txHash && (
                        <a
                          href={`https://stellar.expert/explorer/public/tx/${log.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View on Explorer
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
