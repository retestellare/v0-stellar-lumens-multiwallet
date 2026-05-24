'use client';

import { useState } from 'react';
import { X, Download, Copy, CheckCircle, QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet-context';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { activeWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!activeWallet) return;
    try {
      await navigator.clipboard.writeText(activeWallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = activeWallet.publicKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareAddress = async () => {
    if (!activeWallet) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Stellar Address',
          text: `Send Stellar assets to: ${activeWallet.publicKey}`,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  if (!isOpen || !activeWallet) return null;

  // Generate QR code data URL (simple SVG-based QR placeholder)
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeWallet.publicKey)}&bgcolor=0a0a0f&color=22d3ee`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-card border border-border rounded-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Receive</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background/50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* Wallet Info */}
          <div className="text-center">
            <p className="text-muted-foreground mb-1">Receiving to</p>
            <p className="text-lg font-semibold text-foreground">{activeWallet.name}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl">
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="w-48 h-48"
                crossOrigin="anonymous"
              />
            </div>
          </div>

          {/* Address Display */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block text-center">Your Stellar Address</label>
            <div className="p-3 bg-background/50 border border-border rounded-lg">
              <p className="text-xs sm:text-sm font-mono text-foreground text-center break-all select-all">
                {activeWallet.publicKey}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={copyAddress}
              className="flex-1"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </>
              )}
            </Button>
            
            {navigator.share && (
              <Button 
                variant="outline"
                onClick={shareAddress}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Send only Stellar network assets to this address. Sending other cryptocurrencies may result in permanent loss.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
