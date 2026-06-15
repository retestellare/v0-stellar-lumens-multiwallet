import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WalletBalance {
  address: string;
  xlmBalance: number;
  tokenBalances: Array<{
    code: string;
    issuer?: string;
    balance: number;
  }>;
  status: 'LOADING' | 'READY' | 'ERROR' | 'INSUFFICIENT';
  error?: string;
  lastUpdated?: Date;
}

interface WalletMonitorDashboardProps {
  walletAddress?: string;
  xlmBalance?: number;
  tokenBalances?: Array<{
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
  }>;
  status?: 'LOADING' | 'READY' | 'ERROR' | 'INSUFFICIENT';
  error?: string;
  isActive?: boolean;
}

export default function WalletMonitorDashboard({
  walletAddress = 'Fetching...',
  xlmBalance = 0,
  tokenBalances = [],
  status = 'LOADING',
  error,
  isActive = false,
}: WalletMonitorDashboardProps) {
  const [displayInfo, setDisplayInfo] = useState<WalletBalance>({
    address: walletAddress,
    xlmBalance: xlmBalance,
    tokenBalances: tokenBalances.map((t) => ({
      code: t.asset_code || 'XLM',
      issuer: t.asset_issuer ? `${t.asset_issuer.substring(0, 6)}...${t.asset_issuer.substring(-4)}` : undefined,
      balance: parseFloat(t.balance),
    })),
    status: status,
    error: error,
    lastUpdated: new Date(),
  });

  useEffect(() => {
    setDisplayInfo((prev) => ({
      ...prev,
      address: walletAddress,
      xlmBalance: xlmBalance,
      tokenBalances: tokenBalances.map((t) => ({
        code: t.asset_code || 'XLM',
        issuer: t.asset_issuer ? `${t.asset_issuer.substring(0, 6)}...${t.asset_issuer.substring(-4)}` : undefined,
        balance: parseFloat(t.balance),
      })),
      status: status,
      error: error,
      lastUpdated: new Date(),
    }));
  }, [walletAddress, xlmBalance, tokenBalances, status, error]);

  const getStatusColor = () => {
    switch (status) {
      case 'READY':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'INSUFFICIENT':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'ERROR':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="w-3 h-3" />;
      case 'ERROR':
        return <AlertCircle className="w-3 h-3" />;
      case 'LOADING':
        return <Clock className="w-3 h-3 animate-spin" />;
      default:
        return null;
    }
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <div className="bg-card border border-primary/20 rounded-lg p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary/10 pb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          Bot Wallet Monitor
          {getStatusIcon()}
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 ${getStatusColor()}`}>
          {status === 'LOADING' && 'Syncing...'}
          {status === 'READY' && 'Active'}
          {status === 'INSUFFICIENT' && 'Low Balance'}
          {status === 'ERROR' && 'Error'}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-xs text-destructive">
          <p className="font-semibold mb-1">Wallet Error</p>
          <p className="break-words">{error}</p>
          <p className="text-destructive/70 mt-2">
            Ensure the bot wallet secret key is stored in Vercel environment variables (STELLAR_BOT_SECRET_KEY).
          </p>
        </div>
      )}

      {/* Wallet Address */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-semibold">Public Key Address</label>
        <div className="bg-background rounded-md p-2 border border-primary/10">
          <code className="text-xs font-mono text-foreground break-all">{walletAddress}</code>
        </div>
      </div>

      {/* XLM Balance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background border border-primary/10 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">XLM Balance</p>
          <p className={`text-lg font-bold ${isActive ? 'text-green-400' : 'text-primary'}`}>
            {formatBalance(xlmBalance)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {xlmBalance >= 1 ? 'Sufficient' : 'Below minimum'}
          </p>
        </div>

        {/* Token Count */}
        <div className="bg-background border border-primary/10 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">Assets Held</p>
          <p className="text-lg font-bold text-blue-400">{tokenBalances.length}</p>
          <p className="text-[10px] text-muted-foreground">
            {tokenBalances.length > 0 ? 'Multiple assets' : 'XLM only'}
          </p>
        </div>
      </div>

      {/* Token Holdings */}
      {tokenBalances.length > 0 && (
        <div className="space-y-2 border-t border-primary/10 pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Token Holdings</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {tokenBalances.map((token, idx) => (
              <div key={idx} className="bg-background border border-primary/10 rounded-md p-2 flex items-center justify-between text-xs">
                <div>
                  <p className="font-mono font-semibold text-primary">{token.asset_code || 'UNKNOWN'}</p>
                  {token.asset_issuer && (
                    <p className="text-muted-foreground text-[10px] font-mono">
                      {token.asset_issuer.substring(0, 10)}...
                    </p>
                  )}
                </div>
                <p className="font-semibold text-foreground">{formatBalance(parseFloat(token.balance))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground italic pt-2 border-t border-primary/10">
        <p>
          Balances update automatically. Locked orders reduce available balances. Check environment variables if
          decryption errors occur.
        </p>
      </div>

      {/* Last Updated */}
      {displayInfo.lastUpdated && (
        <p className="text-[10px] text-muted-foreground text-right">
          Updated: {displayInfo.lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
