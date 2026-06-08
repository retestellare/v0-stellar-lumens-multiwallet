'use client';

import { useState, useCallback } from 'react';
import { Bot, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  // Bot Configuration State
  const [pair, setPair] = useState<string>(selectedAsset?.code || 'FORGE');
  const [budget, setBudget] = useState<string>('100');
  const [minPrice, setMinPrice] = useState<string>('0.001');
  const [maxPrice, setMaxPrice] = useState<string>('0.1');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stream and Strategy State
  const [logs, setLogs] = useState<string[]>(['[System] Trading Bot initialized...']);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Add log helper function - defined first so it can be used in callbacks
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-19), message]); // Keep last 20 logs
  }, []);

  // MOCK FUNCTION: Start Stellar Stream
  // TODO: Replace this with real Stellar SDK connection
  // Example: Use SorobanRpc to subscribe to price feeds
  // import { SorobanRpc } from '@stellar/js-sdk';
  // const soroban = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
  const startStellarStream = useCallback(() => {
    console.log('[v0] Starting Stellar stream with pair:', pair);
    
    addLog(`[${new Date().toLocaleTimeString()}] Connecting to Stellar network...`);
    addLog(`[${new Date().toLocaleTimeString()}] Monitoring XLM/${pair} pair`);
    addLog(`[${new Date().toLocaleTimeString()}] Budget: ${budget} XLM | Range: ${minPrice} - ${maxPrice}`);

    // TODO: Paste real Stellar SDK connection code here
    // const connection = await soroban.getEvents({...});
    
    // Mock price stream simulation - runs every 2 seconds
    const mockInterval = setInterval(() => {
      // Generate mock price between min and max
      const randomPrice = parseFloat(minPrice) + 
        Math.random() * (parseFloat(maxPrice) - parseFloat(minPrice));
      
      setPriceHistory(prev => [...prev.slice(-59), randomPrice]);
      
      // Mock strategy: Buy when price < minPrice, Sell when price > maxPrice
      if (randomPrice < parseFloat(minPrice) * 1.05) {
        addLog(`[${new Date().toLocaleTimeString()}] 🟢 BUY SIGNAL: Price ${randomPrice.toFixed(6)} below threshold`);
        // TODO: Execute buy order using Stellar SDK
        // const tx = await server.submitTransaction(buyOp);
      } else if (randomPrice > parseFloat(maxPrice) * 0.95) {
        addLog(`[${new Date().toLocaleTimeString()}] 🔴 SELL SIGNAL: Price ${randomPrice.toFixed(6)} above threshold`);
        // TODO: Execute sell order using Stellar SDK
        // const tx = await server.submitTransaction(sellOp);
      } else {
        addLog(`[${new Date().toLocaleTimeString()}] Price Update: ${randomPrice.toFixed(6)} (holding)`);
      }
    }, 2000);

    // Store interval ID globally for cleanup
    (window as any).__tradingBotInterval = mockInterval;
    
    return mockInterval;
  }, [pair, budget, minPrice, maxPrice, addLog]);

  const handleStartBot = useCallback(async () => {
    if (!pair || !budget || !minPrice || !maxPrice) {
      addLog('[Error] Please fill in all fields');
      return;
    }

    setIsRunning(true);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STARTED`);
    
    // Start the mock stream
    startStellarStream();
  }, [pair, budget, minPrice, maxPrice, addLog, startStellarStream]);

  const handleStopBot = useCallback(() => {
    const intervalId = (window as any).__tradingBotInterval;
    if (typeof intervalId === 'number') {
      clearInterval(intervalId);
      (window as any).__tradingBotInterval = null;
    }
    setIsRunning(false);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STOPPED`);
  }, [addLog]);

  const handleToggleBot = useCallback(() => {
    if (isRunning) {
      handleStopBot();
    } else {
      handleStartBot();
    }
  }, [isRunning, handleStartBot, handleStopBot]);

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Trading Bot Configuration</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Pair Selector */}
      <div className="space-y-2">
        <Label htmlFor="pair-select" className="text-sm font-medium">
          Trading Pair
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-medium text-foreground">
            XLM
          </div>
          <span className="text-muted-foreground">/</span>
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger id="pair-select" className="flex-1">
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
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Budget */}
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

        {/* Minimum Price */}
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

        {/* Maximum Price */}
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

      {/* START / STOP Toggle Button */}
      <div className="flex items-center justify-center">
        <Button
          onClick={handleToggleBot}
          className={`w-full gap-2 font-bold text-lg py-6 transition-all ${
            isRunning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              STOP BOT
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              START BOT
            </>
          )}
        </Button>
      </div>

      {/* Terminal-Style Log Box */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Live Logs</Label>
        <div className="h-48 rounded-md bg-black border border-primary/40 p-3 font-mono text-xs overflow-y-auto space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="text-green-400 whitespace-pre-wrap break-words">
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-green-400/50">Ready to start...</div>
          )}
        </div>
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">
            Status: <span className={isRunning ? 'text-green-500' : 'text-muted-foreground'}>
              {isRunning ? '🟢 RUNNING' : '⚪ STOPPED'}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Price Updates: {priceHistory.length} | Last: {priceHistory[priceHistory.length - 1]?.toFixed(6) || 'N/A'}
          </p>
        </div>
      </div>

      {/* Integration Notes Box */}
      <div className="border border-destructive/20 bg-destructive/10 rounded-md p-3 text-xs text-destructive flex flex-col gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-1">
          ⚠️ Integration Notes:
        </h3>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Replace mock stream with real Stellar SDK in startStellarStream()</li>
          <li>Implement trading logic in the strategy section</li>
          <li>Add proper error handling and transaction signing</li>
          <li>Test on testnet before mainnet deployment</li>
        </ul>

        {/* Under Construction Indicator */}
        <div className="pt-2 border-t border-destructive/10 font-bold text-center tracking-wide animate-pulse">
          Under construction 🚧
        </div>
      </div>
    </div>
  );
}
