'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Trash2, Send, Download, AlertCircle, Loader2, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchTokenMetadataFromToml, submitPayment } from '@/lib/stellar-utils';
import Image from 'next/image';
import { RemoveTrustlineButton } from "./remove-trustline-button";
import { useWallet } from '@/lib/wallet-context';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    code: string;
    issuer?: string;
    balance: string;
    domain?: string;
    image?: string;
    name?: string;
  } | null;
  onSend?: () => void;
  onReceive?: () => void;
  onRemove?: () => void;
}

interface TomlData {
  name?: string;
  desc?: string;
  image?: string;
  orgName?: string;
  orgUrl?: string;
  orgEmail?: string;
  orgTwitter?: string;
  orgAddress?: string;
  orgDesc?: string;
  conditions?: string;
  anchorAssetType?: string;
  redemptionInstructions?: string;
}

interface Recipient {
  id: string;
  address: string;
  amount: string;
  memo: string;
}

export function AssetDetailModal({ isOpen, onClose, asset, onSend, onReceive, onRemove }: AssetDetailModalProps) {
  const { globalDecryptedSecret, activeWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'about' | 'receive' | 'send'>('about');
  const [tomlData, setTomlData] = useState<TomlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Multi-send state
  const [recipients, setRecipients] = useState<Recipient[]>([{ id: '1', address: '', amount: '', memo: '' }]);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && asset?.issuer) {
      setLoading(true);
      fetchTokenMetadataFromToml(asset.issuer)
        .then(data => {
          if (data) {
            setTomlData({
              name: data.name,
              desc: data.desc,
              image: data.image,
              orgName: data.orgName,
              orgUrl: data.orgUrl,
              orgEmail: data.orgEmail,
              orgTwitter: data.orgTwitter,
              orgAddress: data.orgAddress,
              orgDesc: data.orgDesc,
              conditions: data.conditions,
            });
          }
        })
        .finally(() => setLoading(false));
    } else if (isOpen && !asset?.issuer) {
      // Native XLM
      setTomlData({
        name: 'Stellar Lumens',
        desc: 'XLM is the native asset of the Stellar network. It is used to pay transaction fees and maintain account minimum balances.',
        orgName: 'Stellar Development Foundation',
        orgUrl: 'https://stellar.org',
        orgTwitter: 'StellarOrg',
      });
    }
  }, [isOpen, asset]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openStellarExpert = () => {
    if (asset?.issuer) {
      window.open(`https://stellar.expert/explorer/public/asset/${asset.code}-${asset.issuer}`, '_blank');
    } else {
      window.open('https://stellar.expert/explorer/public/asset/XLM', '_blank');
    }
  };

  const addRecipient = () => {
    setRecipients(prev => [...prev, { id: Date.now().toString(), address: '', amount: '', memo: '' }]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const getTotalAmount = () =>
    recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const handleConfirmSend = async () => {
    setSendError(null);
    setSendSuccess(null);

    if (!asset) { setSendError('No asset selected'); return; }
    if (!globalDecryptedSecret) { setSendError('Wallet not unlocked. Please unlock your wallet first.'); return; }

    for (const r of recipients) {
      if (!r.address || r.address.length !== 56 || !r.address.startsWith('G')) {
        setSendError(`Invalid address: ${r.address.substring(0, 12) || '(empty)'}`);
        return;
      }
      if (!r.amount || parseFloat(r.amount) <= 0) {
        setSendError('Each recipient must have a valid amount greater than zero.');
        return;
      }
    }

    const total = getTotalAmount();
    const available = parseFloat(asset.balance || '0');
    if (total > available) {
      setSendError(`Total ${total.toFixed(7)} exceeds available balance ${available.toFixed(7)}`);
      return;
    }

    setSendLoading(true);
    try {
      for (const r of recipients) {
        const result = await submitPayment(
          globalDecryptedSecret,
          r.address,
          asset.code,
          asset.issuer || '',
          r.amount,
          r.memo || undefined
        );
        if (!result.success) {
          throw new Error(result.error || `Payment to ${r.address.substring(0, 8)}... failed`);
        }
      }
      const msg = recipients.length > 1
        ? `Successfully sent to ${recipients.length} recipients!`
        : `Successfully sent ${recipients[0].amount} ${asset.code} to ${recipients[0].address.substring(0, 8)}...`;
      setSendSuccess(msg);
      setRecipients([{ id: '1', address: '', amount: '', memo: '' }]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSendLoading(false);
    }
  };

  if (!isOpen || !asset) return null;

  const displayName = tomlData?.name || asset.name || asset.code;
  const displayDomain = asset.domain || (asset.issuer ? `${asset.issuer.substring(0, 8)}...` : 'Native');
  const displayImage = tomlData?.image || asset.image;

  const InfoRow = ({ label, value, copyable = true }: { label: string; value?: string; copyable?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between py-3 border-b border-border/50">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 max-w-[60%]">
          <span className="text-sm text-right break-all">{value}</span>
          {copyable && (
            <button 
              onClick={() => copyToClipboard(value, label)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              {copiedField === label ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          {/* Top row: icon + name + close button */}
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={asset.code}
                  width={40}
                  height={40}
                  className="rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold">
                  {asset.code.charAt(0)}
                </div>
              )}
            </div>

            {/* Name + full public key (two lines) */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg leading-tight">{asset.code}</h2>
              {asset.issuer ? (
                <p className="text-xs text-muted-foreground font-mono break-all leading-tight mt-0.5">
                  {asset.issuer.slice(0, Math.ceil(asset.issuer.length / 2))}
                  <br />
                  {asset.issuer.slice(Math.ceil(asset.issuer.length / 2))}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Native XLM</p>
              )}
            </div>

            {/* Close button — in flow, never pushed off screen */}
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Balance row */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{displayDomain}</p>
            <div className="text-right">
              <p className="font-bold text-base">{parseFloat(asset.balance).toFixed(7).replace(/\.?0+$/, '')}</p>
              <p className="text-xs text-muted-foreground">≈ $0.00 USD</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'about' && (
            <div className="space-y-1">
              {/* Remove Asset Button */}
               <RemoveTrustlineButton 
                 assetCode={asset.code} 
                 assetIssuer={asset.issuer || ''} 
                 balance={asset.balance || "0"}
                 onSuccess={onClose}
                  />


            
                 {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading asset information...
                </div>
              ) : (
                <>
                  <InfoRow label="Asset Name" value={displayName} />
                  <InfoRow label="Asset Issuer" value={asset.issuer || 'Native (XLM)'} />
                  {asset.domain && <InfoRow label="Asset Website" value={asset.domain} />}
                  {tomlData?.orgName && <InfoRow label="Organization" value={tomlData.orgName} />}
                  {tomlData?.orgUrl && <InfoRow label="Organization URL" value={tomlData.orgUrl} />}
                  {tomlData?.orgEmail && <InfoRow label="Organization Email" value={tomlData.orgEmail} />}
                  {tomlData?.orgTwitter && <InfoRow label="Twitter" value={tomlData.orgTwitter} />}
                  {tomlData?.orgAddress && <InfoRow label="Physical Address" value={tomlData.orgAddress || 'N/A'} />}
                  {tomlData?.conditions && (
                    <div className="py-3 border-b border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Asset Conditions</p>
                      <p className="text-sm">{tomlData.conditions}</p>
                    </div>
                  )}
                  {tomlData?.desc && (
                    <div className="py-3 border-b border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Asset Description</p>
                      <p className="text-sm">{tomlData.desc}</p>
                    </div>
                  )}
                  {tomlData?.orgDesc && (
                    <div className="py-3 border-b border-border/50">
                      <p className="text-sm text-muted-foreground mb-1">Organization Description</p>
                      <p className="text-sm">{tomlData.orgDesc}</p>
                    </div>
                  )}

                  {/* More Info Button */}
                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={openStellarExpert}
                      variant="outline"
                      className="text-primary border-primary hover:bg-primary/10"
                    >
                      More Info
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">Share your address to receive {asset.code}</p>
              <Button onClick={onReceive} className="bg-primary text-primary-foreground">
                <Download className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-4">
              {/* Asset + balance header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">Send {asset.code}</span>
                <span className="text-xs text-muted-foreground">
                  Available: {parseFloat(asset.balance || '0').toFixed(7).replace(/\.?0+$/, '')} {asset.code}
                </span>
              </div>

              {/* Feedback banners */}
              {sendSuccess && (
                <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-200">{sendSuccess}</p>
                </div>
              )}
              {sendError && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{sendError}</p>
                </div>
              )}

              {/* Recipient list */}
              <div className="space-y-4">
                {recipients.map((r, idx) => (
                  <div key={r.id} className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        Recipient {recipients.length > 1 ? idx + 1 : ''}
                      </span>
                      {recipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient(r.id)}
                          disabled={sendLoading}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                          aria-label="Remove recipient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Address</label>
                      <Input
                        type="text"
                        placeholder="GD4M5RUQ..."
                        value={r.address}
                        onChange={e => updateRecipient(r.id, 'address', e.target.value)}
                        disabled={sendLoading}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Amount</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={e => updateRecipient(r.id, 'amount', e.target.value)}
                          disabled={sendLoading}
                          step="0.0000001"
                          min="0"
                        />
                        <div className="flex items-center px-3 bg-muted/50 rounded-lg border border-border text-xs text-muted-foreground whitespace-nowrap">
                          {asset.code}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Memo (optional)</label>
                      <Input
                        type="text"
                        placeholder="Add a note..."
                        value={r.memo}
                        onChange={e => updateRecipient(r.id, 'memo', e.target.value.substring(0, 28))}
                        disabled={sendLoading}
                        maxLength={28}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add recipient */}
              <button
                onClick={addRecipient}
                disabled={sendLoading}
                className="w-full py-2 border border-dashed border-border/60 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another recipient
              </button>

              {/* Total + Send button */}
              {recipients.length > 1 && (
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>Total</span>
                  <span className="font-medium text-foreground">
                    {getTotalAmount().toFixed(7).replace(/\.?0+$/, '')} {asset.code}
                  </span>
                </div>
              )}

              <Button
                onClick={handleConfirmSend}
                disabled={sendLoading || !globalDecryptedSecret || recipients.every(r => !r.address || !r.amount)}
                className="w-full bg-primary text-primary-foreground"
              >
                {sendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {recipients.length > 1 ? `Send to ${recipients.length} Recipients` : `Send ${asset.code}`}
                  </>
                )}
              </Button>

              {!globalDecryptedSecret && (
                <p className="text-xs text-muted-foreground text-center">
                  Unlock your wallet to send
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom Tabs */}
        <div className="border-t border-border grid grid-cols-3 shrink-0">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 text-sm font-medium transition-colors ${
              activeTab === 'about' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`py-3 text-sm font-medium transition-colors ${
              activeTab === 'receive' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Receive
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`py-3 text-sm font-medium transition-colors ${
              activeTab === 'send' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
