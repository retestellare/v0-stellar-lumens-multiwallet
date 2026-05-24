'use client';

import { useState, useEffect } from 'react';
import { X, Send, Plus, Trash2, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret, submitPayment } from '@/lib/stellar-utils';

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
  const { activeWallet } = useWallet();
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '', memo: '' }
  ]);
  const [selectedAsset, setSelectedAsset] = useState<{ code: string; issuer: string; balance: string }>({ 
    code: 'XLM', 
    issuer: '', 
    balance: '0' 
  });
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; hash?: string } | null>(null);

  // Set default asset when wallet changes
  useEffect(() => {
    if (activeWallet?.balances?.length) {
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
  }, [activeWallet]);

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
    setRecipients(recipients.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const getTotalAmount = () => {
    return recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const validateRecipients = () => {
    for (const r of recipients) {
      if (!r.address || r.address.length !== 56 || !r.address.startsWith('G')) {
        return 'Invalid recipient address';
      }
      if (!r.amount || parseFloat(r.amount) <= 0) {
        return 'Invalid amount';
      }
    }
    const total = getTotalAmount();
    if (total > parseFloat(selectedAsset.balance)) {
      return 'Insufficient balance';
    }
    return null;
  };

  const handleContinue = () => {
    const error = validateRecipients();
    if (error) {
      setResult({ success: false, message: error });
      return;
    }
    setResult(null);
    setShowPasswordStep(true);
  };

  const handleSend = async () => {
    if (!activeWallet || !password) return;
    
    setIsSubmitting(true);
    setResult(null);

    try {
      const secret = decryptSecret(activeWallet.encryptedSecret, password);
      
      // Send to each recipient
      const results: string[] = [];
      for (const recipient of recipients) {
        const res = await submitPayment(
          secret,
          recipient.address,
          selectedAsset.code,
          selectedAsset.issuer,
          recipient.amount,
          recipient.memo
        );
        
        if (!res.success) {
          throw new Error(res.error || 'Payment failed');
        }
        results.push(res.hash || 'success');
      }

      setResult({ 
        success: true, 
        message: recipients.length > 1 
          ? `Successfully sent to ${recipients.length} recipients!` 
          : 'Payment sent successfully!',
        hash: results[0]
      });
      
      // Reset form after success
      setTimeout(() => {
        setRecipients([{ id: '1', address: '', amount: '', memo: '' }]);
        setPassword('');
        setShowPasswordStep(false);
        onClose();
      }, 2000);
      
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to send payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRecipients([{ id: '1', address: '', amount: '', memo: '' }]);
    setPassword('');
    setShowPasswordStep(false);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

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
          {!showPasswordStep ? (
            <>
              {/* Asset Selector */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Asset</label>
                <button
                  onClick={() => setShowAssetPicker(!showAssetPicker)}
                  className="w-full flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <span className="font-medium">{selectedAsset.code}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Balance: {parseFloat(selectedAsset.balance).toFixed(4)}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
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
                          {parseFloat(b.balance).toFixed(4)}
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
                        placeholder="Amount"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                        className="bg-background/50 flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const maxPerRecipient = parseFloat(selectedAsset.balance) / recipients.length;
                          updateRecipient(recipient.id, 'amount', maxPerRecipient.toFixed(7));
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
                    {getTotalAmount().toFixed(7)} {selectedAsset.code}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Password Step */
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Confirm sending {getTotalAmount().toFixed(4)} {selectedAsset.code} to {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
                </p>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Trading Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
          )}

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
          {!showPasswordStep ? (
            <Button onClick={handleContinue} className="w-full">
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPasswordStep(false)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={isSubmitting || !password}
                className="flex-1"
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
          )}
        </div>
      </div>
    </>
  );
}
