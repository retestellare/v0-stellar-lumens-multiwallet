'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { searchAssets } from '@/lib/stellar-utils';

interface Token {
  code: string;
  issuer?: string;
  name?: string;
  source?: 'wallet' | 'picks' | 'all' | 'manual';
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  walletBalances: Array<{ asset_code?: string; asset_type?: string; asset_issuer?: string }>;
  type: 'selling' | 'buying';
}

const SUGGESTED_PICKS: Token[] = [
  { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4MY5KU4ERRJLKZLCC5HR52IRXLWDGQDA', name: 'USD Coin', source: 'picks' },
  { code: 'EURC', issuer: 'CHANGETRUSTLINEKEY', name: 'Euro Coin', source: 'picks' },
  { code: 'SRT', issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE2EURIDVXL6B', name: 'Stellar Rewards', source: 'picks' },
];

export function TokenSelectorModal({
  isOpen,
  onClose,
  onSelect,
  walletBalances,
  type,
}: TokenSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'picks' | 'all' | 'manual'>('picks');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);

  const walletTokens: Token[] = walletBalances.map((b) => ({
    code: b.asset_code || 'XLM',
    issuer: b.asset_issuer,
    source: 'wallet',
  }));

  useEffect(() => {
    if (activeTab === 'manual' && searchQuery.length > 1) {
      const search = async () => {
        setLoading(true);
        try {
          const results = await searchAssets(searchQuery.toUpperCase(), undefined, 20);
          setSearchResults(
            results.map((r: any) => ({
              code: r.asset_code,
              issuer: r.asset_issuer,
              source: 'manual',
            }))
          );
        } catch (error) {
          console.error('[v0] Error searching assets:', error);
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      };
      search();
    }
  }, [searchQuery, activeTab]);

  const getDisplayTokens = () => {
    switch (activeTab) {
      case 'wallet':
        return walletTokens.filter((t) => !searchQuery || t.code.includes(searchQuery.toUpperCase()));
      case 'picks':
        return SUGGESTED_PICKS.filter((t) => !searchQuery || t.code.includes(searchQuery.toUpperCase()));
      case 'all':
        return searchResults;
      case 'manual':
        return searchResults;
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-card border border-primary/20 rounded-t-lg md:rounded-lg w-full md:w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col glow-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-foreground">Select {type === 'selling' ? 'Selling' : 'Buying'} Asset</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-background/30 border-b border-border sticky top-16">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-input border-border text-foreground pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 bg-background/50 border-b border-border overflow-x-auto sticky top-28">
          {[
            { id: 'wallet', label: 'My Assets' },
            { id: 'picks', label: 'Our Picks' },
            { id: 'all', label: 'All Tokens' },
            { id: 'manual', label: 'Manual' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background/50 text-muted-foreground hover:text-foreground border border-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Token Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">Searching tokens...</p>
            </div>
          ) : getDisplayTokens().length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-center">
                {activeTab === 'manual' && searchQuery.length < 2
                  ? 'Enter at least 2 characters to search'
                  : 'No tokens found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {getDisplayTokens().map((token, idx) => (
                <button
                  key={`${token.code}-${token.issuer || 'native'}-${idx}`}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:border-primary/50 bg-background/30 hover:bg-primary/10 transition-all"
                >
                  {/* Token Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold">
                    {token.code.charAt(0)}
                  </div>

                  {/* Token Code */}
                  <p className="font-semibold text-foreground text-center text-sm">{token.code}</p>

                  {/* Issuer or Source */}
                  <p className="text-xs text-muted-foreground text-center truncate w-full">
                    {token.issuer ? token.issuer.substring(0, 12) + '...' : 'Native'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
