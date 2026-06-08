'use client';

import { useState, useCallback } from 'react';
import { Bot, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
// Importazione dell'SDK reale di Stellar
import { Horizon, Asset } from '@stellar/stellar-sdk';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

// Mappa degli Issuer reali conosciuti su Stellar per identificare i token senza errori
const ASSET_ISSUERS: Record<string, string> = {
  FORGE: 'GCO7IKW6AL67LI26S3666V46S7X2OTFU6K2O7KVTZZOZHXFMXCO6K7CO', // Inserito l'issuer di Stellarforge
  MAGC: 'GA32...99B',  // Verrà estratto in automatico se passato da wallet, o puoi mettere l'issuer reale qui
  METJ: 'GBBB...123',  // Sostituisci con l'issuer reale se necessario
  USDC: 'GA5ZSEJYB37JTY5HECQBDRAB67FFGIE67F763Z777A6AONFDNFS62ICP', // Issuer ufficiale di USDC su Stellar
};

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  // Bot Configuration State
  const [pair, setPair] = useState<string>(selectedAsset?.code || 'FORGE');
  const [budget, setBudget] = useState<string>('100');
  const [minPrice, setMinPrice] = useState<string>('0.001');
  const [maxPrice, setMaxPrice] = useState<string>('0.1');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stream and Strategy State
  const [logs, setLogs] = useState<string[]>(['[System] Trading Bot initialized on Mainnet...']);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Add log helper function
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-19), message]); // Tiene gli ultimi 20 log
  }, []);

  // FUNZIONE REALE: Avvio dello Streaming WebSocket sulla Blockchain di Stellar
  const startStellarStream = useCallback(() => {
    console.log('[Stellar] Starting Live Mainnet stream with pair: XLM/', pair);
    
    addLog(`[${new Date().toLocaleTimeString()}] Connecting to Stellar Mainnet...`);
    addLog(`[${new Date().toLocaleTimeString()}] Monitoring XLM/${pair} pair`);
    addLog(`[${new Date().toLocaleTimeString()}] Budget: ${budget} XLM | Range: ${minPrice} - ${maxPrice}`);

    // Configurazione del server Horizon di Stellar
    const server = new Horizon.Server("https://horizon.stellar.org");
    
    // Identificazione degli Asset (XLM è nativo)
    const nativeAsset = Asset.native();
    
    // Recuperiamo l'issuer del token custom (se passato dal wallet usiamo quello, altrimenti cerchiamo nella mappa)
    const tokenIssuer = selectedAsset?.code === pair && selectedAsset.issuer 
      ? selectedAsset.issuer 
      : (ASSET_ISSUERS[pair] || '');

    if (pair !== 'XLM' && !tokenIssuer) {
      addLog(`[${new Date().toLocaleTimeString()}] ⚠️ WARNING: Missing Issuer Address for ${pair}`);
    }

    const customAsset = new Asset(pair, tokenIssuer);

    // Apertura dello stream reale (WebSocket) per i trade di questa coppia di asset
    const closeStellarStream = server.trades()
      .forAssetPair(nativeAsset, customAsset)
      .cursor('now')
      .stream({
        onmessage: (trade) => {
          // Calcolo del prezzo di mercato reale derivato dal trade blockchain
          const currentPrice = parseFloat(trade.price.n) / parseFloat(trade.price.d);
          
          setPriceHistory(prev => [...prev.slice(-59), currentPrice]);
          
          // Logica della strategia applicata ai prezzi veri di Stellar
          if (currentPrice < parseFloat(minPrice)) {
            addLog(`[${new Date().toLocaleTimeString()}] 🟢 BUY SIGNAL: Price ${currentPrice.toFixed(6)} below threshold`);
            // TODO: Inserire qui la firma della transazione con la Secret Key dell'utente quando pronto
          } else if (currentPrice > parseFloat(maxPrice)) {
            addLog(`[${new Date().toLocaleTimeString()}] 🔴 SELL SIGNAL: Price ${currentPrice.toFixed(6)} above threshold`);
            // TODO: Inserire qui la firma della transazione con la Secret Key dell'utente quando pronto
          } else {
            addLog(`[${new Date().toLocaleTimeString()}] Price Update: ${currentPrice.toFixed(6)} (holding)`);
          }
        },
        onerror: (error) => {
          console.error("Stellar Stream Connection Error:", error);
        }
      });

    // Memorizziamo globalmente la funzione per chiudere lo stream
    (window as any).__closeStellarStream = closeStellarStream;
    
    return closeStellarStream;
  }, [pair, budget, minPrice, maxPrice, addLog, selectedAsset]);

  const handleStartBot = useCallback(async () => {
    if (!pair || !budget || !minPrice || !maxPrice) {
      addLog('[Error] Please fill in all fields');
      return;
    }

    setIsRunning(true);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STARTED`);
    
    // Avvia la connessione blockchain reale
    startStellarStream();
  }, [pair, budget, minPrice, maxPrice, addLog, startStellarStream]);

  const handleStopBot = useCallback(() => {
    // Recuperiamo e invochiamo la funzione di chiusura dello stream nativo di Stellar
    const closeStream = (window as any).__closeStellarStream;
    if (typeof closeStream === 'function') {
      closeStream(); // Disconnette il browser dalla rete Stellar in modo pulito
      (window as any).__closeStellarStream = null;
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

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted/30 p-2">
        <p className="font-medium">⚠️ Integration Notes:</p>
        <p>• Connected to Stellar Mainnet WebSockets stream via startStellarStream()</p>
        <p>• Implement trading logic in the strategy section using transaction builder</p>
        <p>• Ensure account has sufficient XLM buffer for network operations fees</p>
      </div>
    </div>
  );
}
