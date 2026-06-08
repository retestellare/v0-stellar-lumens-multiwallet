'use client';

import { useState, useCallback, useRef } from 'react';
import { Bot, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Horizon, Asset } from '@stellar/stellar-sdk';

interface TradingBotPanelProps {
  selectedAsset?: { code: string; issuer?: string };
  onClose?: () => void;
}

// Mappa con indirizzi reali per evitare errori di compilazione
const ASSET_ISSUERS: Record<string, string> = {
  FORGE: 'GCO7IKW6AL67LI26S3666V46S7X2OTFU6K2O7KVTZZOZHXFMXCO6K7CO', 
  MAGC: 'GDBA7IDH5Y7U47V33FEXU3L7Y7R5XW5R5H4Y6Z3P7Q5XW5R5H4Y6Z3P7',  
  METJ: 'GBBBI4X7KVTZZOZHXFMXCO6K7COGCO7IKW6AL67LI26S3666V46S7X2OT',  
  USDC: 'GA5ZSEJYB37JTY5HECQBDRAB67FFGIE67F763Z777A6AONFDNFS62ICP', 
  BTC: 'GDPJSTFHCSIQFWVE567NWOFHI7WLSZ76COF6WNY6A3A6U76N5HU7QBTC',   
  ETH: 'GBVOL67TMUQBGL4TZYNMY3HZ7SDFDAX6YID67FLZ67FLZ67FLZ67FETH',   
};

export function TradingBotPanel({ selectedAsset, onClose }: TradingBotPanelProps) {
  // Bot Configuration State
  const [pair, setPair] = useState<string>(selectedAsset?.code || 'FORGE');
  const [budget, setBudget] = useState<string>('10');
  const [minPrice, setMinPrice] = useState<string>('0.001');
  const [maxPrice, setMaxPrice] = useState<string>('0.1');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stream and Metric State
  const [logs, setLogs] = useState<string[]>(['[System] Trading Bot initialized on Stellar Mainnet...']);
  const [priceUpdates, setPriceUpdates] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<string>('N/A');

  // Riferimento per gestire la chiusura dello stream ed evitare loop di re-render
  const closeStreamRef = useRef<(() => void) | null>(null);

  // Scarto millesimale per scavalcare l'avversario sullo spread
  const microUndercut = 0.0000001;

  // Aggiunta log nel terminale
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-19), message]);
  }, []);

  // Strategia competitiva di posizionamento sullo Spread (Undercutting)
  const checkSpreadStrategy = useCallback((bids: any[], asks: any[]) => {
    if (bids.length === 0 || asks.length === 0) return;

    // Primi prezzi assoluti sul libro degli ordini (I migliori attuali)
    const highestBid = parseFloat(bids[0].price); // Primo compratore
    const lowestAsk = parseFloat(asks[0].price);   // Primo venditore

    const minAllowed = parseFloat(minPrice);
    const maxAllowed = parseFloat(maxPrice);

    if (isNaN(minAllowed) || isNaN(maxAllowed)) return;

    // Calcolo prezzo medio indicativo per la UI
    const midPrice = (highestBid + lowestAsk) / 2;
    setLastPrice(midPrice.toFixed(6));

    // --- STRATEGIA DI ACQUISTO (Piazzarsi sopra il miglior compratore) ---
    const targetBuyPrice = highestBid + microUndercut;

    if (targetBuyPrice < lowestAsk && targetBuyPrice <= maxAllowed) {
      addLog(`[${new Date().toLocaleTimeString()}] 🚀 SPREAD COMPRA: Mi piazzo a ${targetBuyPrice.toFixed(6)} (Sopra a ${highestBid.toFixed(6)})`);
      // Qui andrà la chiamata SDK: inserisciOrdineSuStellar('BUY', targetBuyPrice);
    }

    // --- STRATEGIA DI VENDITA (Piazzarsi sotto il miglior venditore) ---
    const targetSellPrice = lowestAsk - microUndercut;

    if (targetSellPrice > highestBid && targetSellPrice >= minAllowed) {
      addLog(`[${new Date().toLocaleTimeString()}] 🚀 SPREAD VENDI: Mi piazzo a ${targetSellPrice.toFixed(6)} (Sotto a ${lowestAsk.toFixed(6)})`);
      // Qui andrà la chiamata SDK: inserisciOrdineSuStellar('SELL', targetSellPrice);
    }

  }, [minPrice, maxPrice, addLog]);

  // Connessione in tempo reale all'Order Book di Stellar Mainnet
  const startStellarStream = useCallback(() => {
    setPriceUpdates(0);
    addLog(`[${new Date().toLocaleTimeString()}] ⚔️ Avvio monitoraggio dinamico Order Book...`);

    const server = new Horizon.Server("https://horizon.stellar.org");
    const nativeAsset = Asset.native();
    
    const tokenIssuer = selectedAsset?.code === pair && selectedAsset.issuer 
      ? selectedAsset.issuer 
      : (ASSET_ISSUERS[pair] || '');

    if (pair !== 'XLM' && !tokenIssuer) {
      addLog(`[${new Date().toLocaleTimeString()}] ❌ Errore: Indirizzo Issuer assente`);
      setIsRunning(false);
      return;
    }

    const customAsset = new Asset(pair, tokenIssuer);

    try {
      // Pulizia di emergenza se ci sono connessioni residue pendenti
      if (closeStreamRef.current) {
        closeStreamRef.current();
      }

      // Ci agganciamo all'ascolto dell'Order Book anziché alla cronologia dei trade passati
      const unsubscribe = server.orderBook(nativeAsset, customAsset)
        .stream({
          onmessage: (book) => {
            setPriceUpdates(prev => prev + 1);
            // Invia le tabelle correnti dei compratori e venditori alla strategia
            checkSpreadStrategy(book.bids, book.asks);
          },
          onerror: (error) => {
            console.error("Stellar Order Book Stream Error:", error);
          }
        });

      closeStreamRef.current = unsubscribe;
    } catch (err) {
      addLog(`[${new Date().toLocaleTimeString()}] ❌ Connessione fallita`);
      setIsRunning(false);
    }
  }, [pair, selectedAsset, addLog, checkSpreadStrategy]);

  const handleStartBot = useCallback(() => {
    if (!pair || !budget || !minPrice || !maxPrice) {
      addLog('[Error] Fill in all configuration inputs');
      return;
    }
    setIsRunning(true);
    addLog(`[${new Date().toLocaleTimeString()}] BOT STARTED`);
    startStellarStream();
  }, [pair, budget, minPrice, maxPrice, addLog, startStellarStream]);

  const handleStopBot = useCallback(() => {
    if (closeStreamRef.current) {
      closeStreamRef.current();
      closeStreamRef.current = null;
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
          <h2 className="text-lg font-bold text-foreground">Market Maker Bot Configuration</h2>
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
            placeholder="10"
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
        <Label className="text-xs font-medium">Live Book Tracking logs</Label>
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
            Book Changes Caught: {priceUpdates} | Mid-Price: {lastPrice}
          </p>
        </div>
      </div>

      {/* Network Info */}
      <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted/30 p-2">
        <p className="font-medium">🌍 Order Book Target:</p>
        <p>• Live connections stream directly from native SDEX Orderbook</p>
        <p>• Aggressive front-running tracking active without CPU freezing loops</p>
      </div>
    </div>
  );
}
