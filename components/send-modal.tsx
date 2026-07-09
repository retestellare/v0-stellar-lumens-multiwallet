'use client';

import { useState, useEffect } from 'react';
import { X, Send, Plus, Trash2, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/lib/wallet-context';
import { submitPayment } from '@/lib/stellar-utils';

interface Recipient {
  id: string;
  address: string;
  amount: string;
  memo?: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendModal({ isOpen, onClose }: SendModalProps) {
  const { activeWallet, globalDecryptedSecret } = useWallet();
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '', memo: '' }
  ]);
  const [selectedAsset, setSelectedAsset] = useState<{ code: string; issuer: string; balance: string } | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; hash?: string } | null>(null);

  // Set default asset only once when modal opens with no selection
  useEffect(() => {
    if (isOpen && !selectedAsset && activeWallet?.balances?.length) {
      const xlm = activeWallet.balances.find((b: any) => !b.asset_code || b.asset_code === 'XLM');
      if (xlm) {
        setSelectedAsset({ code: 'XLM', issuer: '', balance: xlm.balance });
      } else {
        const first = activeWallet.balances[0];
        setSelectedAsset({ 
          code: first.asset_code || 'XLM', 
          issuer: first.asset_issuer || '', 
          balance: first.balance 
        });
      }
    }
  }, [isOpen, activeWallet, selectedAsset]);

  // Update balance when wallet balances refresh
  useEffect(() => {
    if (selectedAsset && activeWallet?.balances?.length) {
      const current = activeWallet.balances.find((b: any) => 
        (b.asset_code || 'XLM') === selectedAsset.code && 
        (b.asset_issuer || '') === selectedAsset.issuer
      );
      if (current && current.balance !== selectedAsset.balance) {
        setSelectedAsset(prev => prev ? { ...prev, balance: current.balance } : null);
      }
    }
  }, [activeWallet?.balances, selectedAsset]);

  // Limit amount to 7 decimal places
  const formatAmount = (value: string): string => {
    if (!value) return '';
    const parts = value.split('.');
    if (parts.length === 2 && parts[1].length > 7) {
      return `${parts[0]}.${parts[1].substring(0, 7)}`;
    }
    return value;
  };

  const addRecipient = () => {
    setRecipients([...recipients, { 
      id: Date.now().toString(), 
      address: '', 
      amount: '', 
      memo: '' 
    }]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter(r => r.id !== id));
    }
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
    // Limit amount to 7 decimal places
    const processedValue = field === 'amount' ? formatAmount(value) : value;
    setRecipients(recipients.map(r => 
      r.id === id ? { ...r, [field]: processedValue } : r
    ));
  };

  const getTotalAmount = () => {
    return recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const getAvailableBalance = () => {
    if (!selectedAsset) return 0;
    const balance = parseFloat(selectedAsset.balance) || 0;
    
    // For XLM, account for Stellar reserve requirements
    // Minimum reserve = (2 + subentry_count) * 0.5 XLM
    // We estimate based on typical usage: base 2 XLM + 0.5 per trustline
    // Conservative estimate: assume 5-10 trustlines, so ~4.5 XLM minimum reserve
    if (selectedAsset.code === 'XLM') {
      const estimatedReserve = 4.5; // Conservative estimate for typical account
      return Math.max(0, balance - estimatedReserve);
    }
    
    // For non-XLM assets, full balance is available for sending
    return balance;
  };

  const validateRecipients = () => {
    if (!selectedAsset) {
      return 'Asset not selected';
    }
    for (const r of recipients) {
      if (!r.address || r.address.length !== 56 || !r.address.startsWith('G')) {
        return 'Invalid recipient address';
      }
      if (!r.amount || parseFloat(r.amount) <= 0) {
        return 'Invalid amount';
      }
    }
    const total = getTotalAmount();
    const available = getAvailableBalance();
    if (total > available) {
      return `Insufficient available balance (${available.toFixed(7)} available)`;
    }
    return null;
  };

  const handleSend = async () => {
    if (!activeWallet) {
      setResult({ success: false, message: 'No active wallet selected' });
      return;
    }

    const validationError = validateRecipients();
    if (validationError) {
      setResult({ success: false, message: validationError });
      return;
    }

    if (!globalDecryptedSecret) {
      setResult({ success: false, message: 'Wallet is locked. Please restart the app to unlock.' });
      return;
    }
    
    setIsSubmitting(true);
    setResult(null);

    try {
      const secret = globalDecryptedSecret;
      
      // Send to each recipient
      const results: string[] = [];
      let successCount = 0;
      let failureMessage = '';
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          const res = await submitPayment(
            secret,
            recipient.address,
            selectedAsset.code,
            selectedAsset.issuer,
            recipient.amount,
            recipient.memo
          );
          
          if (res.success) {
            results.push(res.hash || 'success');
            successCount++;
          } else {
            failureMessage = res.error || 'Payment failed';
            // Continue to next recipient instead of throwing
            console.error(`[v0] Payment ${i + 1} failed: ${failureMessage}`);
          }
        } catch (recipientError: any) {
          failureMessage = recipientError.message || 'Payment failed';
          console.error(`[v0] Payment ${i + 1} error: ${failureMessage}`);
        }
      }

      if (successCount === 0) {
        setResult({ success: false, message: failureMessage || 'All payments failed' });
        return;
      }

      if (successCount < recipients.length) {
        setResult({ 
          success: false, 
          message: `${successCount}/${recipients.length} payments sent. Last error: ${failureMessage}`,
          hash: results[0]
        });
      } else {
        setResult({ 
          success: true, 
          message: recipients.length > 1 
            ? `Successfully sent to ${recipients.length} recipients!` 
            : 'Payment sent successfully!',
          hash: results[0]
        });
        
        // Reset form after success
        setTimeout(() => {
          if (onClose) {
            setRecipients([{ id: '1', address: '', amount: '', memo: '' }]);
            setResult(null);
            onClose();
          }
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('[v0] Send handler error:', error);
      setResult({ success: false, message: error.message || 'Failed to send payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    try {
      setRecipients([{ id: '1', address: '', amount: '', memo: '' }]);
      setResult(null);
      setSelectedAsset(null);
      setShowAssetPicker(false);
      setIsSubmitting(false);
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('[v0] Error closing send modal:', error);
      // Force close even if error occurs
      if (onClose) {
        onClose();
      }
    }
  };

  if (!isOpen) return null;
  
  // Safeguard: if asset becomes null during render, close modal
  if (!selectedAsset && isOpen) {
    handleClose();
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={handleClose} />
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-card border border-border rounded-xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Send {selectedAsset.code}</h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-background/50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <>
              {/* Asset Selector */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Asset</label>
                <button
                  onClick={() => setShowAssetPicker(!showAssetPicker)}
                  className="w-full flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <span className="font-medium">{selectedAsset?.code || 'Asset'}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-muted-foreground">
                      Available: {selectedAsset ? getAvailableBalance().toFixed(7).replace(/\.?0+$/, '') : '0'}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      (Total: {selectedAsset ? parseFloat(selectedAsset.balance).toFixed(7).replace(/\.?0+$/, '') : '0'})
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                
                {showAssetPicker && activeWallet?.balances && (
                  <div className="mt-2 p-2 bg-background border border-border rounded-lg max-h-40 overflow-y-auto">
                    {activeWallet.balances.map((b: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAsset({
                            code: b.asset_code || 'XLM',
                            issuer: b.asset_issuer || '',
                            balance: b.balance
                          });
                          setShowAssetPicker(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-background/80 transition-colors"
                      >
                        <span className="font-medium">{b.asset_code || 'XLM'}</span>
                        <span className="text-sm text-muted-foreground">
                          {parseFloat(b.balance).toFixed(7).replace(/\.?0+$/, '')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Recipients</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addRecipient}
                    className="text-primary hover:text-primary/80"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Recipient
                  </Button>
                </div>

                {recipients.map((recipient, idx) => (
                  <div key={recipient.id} className="p-3 bg-background/30 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Recipient {idx + 1}
                      </span>
                      {recipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient(recipient.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <Input
                      placeholder="Stellar address (G...)"
                      value={recipient.address}
                      onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                      className="bg-background/50"
                    />
                    
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0000001"
                        min="0.0000001"
                        placeholder="Amount"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                        className="bg-background/50 flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const availablePerRecipient = getAvailableBalance() / recipients.length;
                          updateRecipient(recipient.id, 'amount', availablePerRecipient.toFixed(7));
                        }}
                        className="px-3"
                      >
                        Max
                      </Button>
                    </div>
                    
                    <Input
                      placeholder="Memo (optional)"
                      value={recipient.memo}
                      onChange={(e) => updateRecipient(recipient.id, 'memo', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total to send:</span>
                  <span className="font-semibold text-primary">
                    {getTotalAmount().toFixed(7).replace(/\.?0+$/, '')} {selectedAsset.code}
                  </span>
                </div>
              </div>
            </>

          {/* Result Message */}
          {result && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30 text-green-500' 
                : 'bg-destructive/10 border border-destructive/30 text-destructive'
            }`}>
              {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSend}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
