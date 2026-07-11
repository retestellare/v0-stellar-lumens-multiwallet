'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Trash2, Send, Download, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
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

export function AssetDetailModal({ isOpen, onClose, asset, onSend, onReceive, onRemove }: AssetDetailModalProps) {
  const { globalDecryptedSecret, activeWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'about' | 'receive' | 'send'>('about');
  const [sendView, setSendView] = useState<'selection' | 'form'>('selection');
  const [tomlData, setTomlData] = useState<TomlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMemo, setSendMemo] = useState('');

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

  const handleSendClick = () => {
    try {
      setSendError(null);
      setSendSuccess(null);
      setSendView('form');
    } catch (error) {
      console.error('[v0] Error opening send form:', error);
      setSendError('Failed to open send form. Please try again.');
    }
  };

  const handleConfirmSend = async () => {
    try {
      setSendError(null);
      setSendSuccess(null);

      if (!asset) {
        setSendError('No asset selected');
        return;
      }

      if (!globalDecryptedSecret) {
        setSendError('Wallet not unlocked. Please unlock your wallet first.');
        return;
      }

      if (!recipientAddress || recipientAddress.length !== 56 || !recipientAddress.startsWith('G')) {
        setSendError('Invalid recipient address');
        return;
      }

      if (!sendAmount || parseFloat(sendAmount) <= 0) {
        setSendError('Invalid amount. Must be greater than zero.');
        return;
      }

      setSendLoading(true);

      const result = await submitPayment(
        globalDecryptedSecret,
        recipientAddress,
        asset.code,
        asset.issuer || '',
        sendAmount.toString(),
        sendMemo || undefined
      );

      if (result.success) {
        setSendSuccess(`Successfully sent ${sendAmount} ${asset.code} to ${recipientAddress.substring(0, 8)}...`);
        setRecipientAddress('');
        setSendAmount('');
        setSendMemo('');
        setTimeout(() => {
          setSendView('selection');
          setSendSuccess(null);
        }, 2000);
      } else {
        setSendError(result.error || 'Failed to send payment');
      }
    } catch (error) {
      console.error('[v0] Error sending payment:', error);
      setSendError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setSendLoading(false);
    }
  };

  const handleBackFromForm = () => {
    setSendView('selection');
    setSendError(null);
    setRecipientAddress('');
    setSendAmount('');
    setSendMemo('');
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
              {sendView === 'selection' && (
                <div className="py-8 text-center space-y-4">
                  <p className="text-muted-foreground">Send {asset.code} to another wallet</p>
                  <Button 
                    onClick={handleSendClick}
                    className="bg-primary text-primary-foreground w-full"
                    disabled={sendLoading || !globalDecryptedSecret}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send {asset.code}
                  </Button>
                </div>
              )}

              {sendView === 'form' && (
                <div className="space-y-4">
                  {sendSuccess && (
                    <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-green-200">{sendSuccess}</p>
                      </div>
                    </div>
                  )}

                  {sendError && (
                    <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-200">{sendError}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Recipient Address</label>
                      <Input
                        type="text"
                        placeholder="GD4M5RUQ..."
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
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
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          disabled={sendLoading}
                          step="0.0000001"
                        />
                        <div className="flex items-center px-3 bg-muted/50 rounded-lg border border-border text-xs text-muted-foreground whitespace-nowrap">
                          {asset.code}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Memo (Optional)</label>
                      <Input
                        type="text"
                        placeholder="Add a note..."
                        value={sendMemo}
                        onChange={(e) => setSendMemo(e.target.value.substring(0, 28))}
                        disabled={sendLoading}
                        maxLength={28}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{sendMemo.length}/28 characters</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleBackFromForm}
                        variant="outline"
                        disabled={sendLoading}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleConfirmSend}
                        disabled={sendLoading || !recipientAddress || !sendAmount}
                        className="flex-1 bg-primary text-primary-foreground"
                      >
                        {sendLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Confirm Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
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
