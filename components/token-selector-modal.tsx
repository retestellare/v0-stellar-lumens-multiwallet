'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Star } from 'lucide-react';
import { TokenMetadata } from '@/types/token';
import {
  searchTokens,
  getMostTradedTokens,
  getTokenPicks,
  fetchTokenMetadata,
} from '@/lib/token-service';
import {
  getFavoriteTokens,
  toggleFavoriteToken,
  isFavoriteToken,
} from '@/lib/token-storage';

interface Token {
  code: string;
  issuer?: string;
  name?: string;
  image?: string;
  verified?: boolean;
  source?: 'wallet' | 'picks' | 'all' | 'manual' | 'favorites';
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  walletBalances: Array<{ asset_code?: string; asset_type?: string; asset_issuer?: string }>;
  type: 'selling' | 'buying';
}

export function TokenSelectorModal({
  isOpen,
  onClose,
  onSelect,
  walletBalances,
  type,
}: TokenSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'picks' | 'all' | 'favorites'>('picks');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayTokens, setDisplayTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const walletTokens: Token[] = walletBalances.map((b) => ({
    code: b.asset_code || 'XLM',
    issuer: b.asset_issuer,
    source: 'wallet',
  }));

  // Update favorites set when modal opens
  useEffect(() => {
    if (isOpen) {
      const favs = getFavoriteTokens();
      const favSet = new Set(favs.map((t) => `${t.code}_${t.issuer}`));
      setFavorites(favSet);
    }
  }, [isOpen]);

  // Handle token searches and loads
  useEffect(() => {
    const loadTokens = async () => {
      setLoading(true);
      try {
        let tokens: Token[] = [];

        if (activeTab === 'wallet') {
          tokens = walletTokens.filter(
            (t) => !searchQuery || t.code.includes(searchQuery.toUpperCase())
          );
        } else if (activeTab === 'picks') {
          const picks = getTokenPicks();
          tokens = picks.map((t) => ({
            code: t.code,
            issuer: t.issuer,
            name: t.name,
            verified: t.verified,
            source: 'picks',
          }));
          if (searchQuery) {
            tokens = tokens.filter((t) => t.code.includes(searchQuery.toUpperCase()));
          }
        } else if (activeTab === 'favorites') {
          const favs = getFavoriteTokens();
          tokens = favs.map((t) => ({
            code: t.code,
            issuer: t.issuer,
            name: t.name,
            image: t.image,
            verified: t.verified,
            source: 'favorites',
          }));
          if (searchQuery) {
            tokens = tokens.filter((t) => t.code.includes(searchQuery.toUpperCase()));
          }
        } else if (activeTab === 'all') {
          if (searchQuery.length > 0) {
            const results = await searchTokens(searchQuery, 50);
            tokens = results.map((t) => ({
              code: t.code,
              issuer: t.issuer,
              name: t.name,
              image: t.image,
              verified: t.verified,
              source: 'all',
            }));
          } else {
            // Load most traded tokens
            const traded = await getMostTradedTokens(50);
            tokens = traded.map((t) => ({
              code: t.code,
              issuer: t.issuer,
              name: t.name,
              image: t.image,
              verified: t.verified,
              source: 'all',
            }));
          }
        }

        setDisplayTokens(tokens);
      } catch (error) {
        console.error('[v0] Error loading tokens:', error);
        setDisplayTokens([]);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [activeTab, searchQuery, walletTokens]);

  const handleTokenSelect = (token: Token) => {
    onSelect(token);
    onClose();
  };

  const handleToggleFavorite = (e: React.MouseEvent, token: Token) => {
    e.stopPropagation();
    
    const metadata: TokenMetadata = {
      code: token.code,
      issuer: token.issuer || '',
      name: token.name,
      image: token.image,
      verified: token.verified,
      source: 'all',
    };

    const isFav = toggleFavoriteToken(metadata);
    const key = `${token.code}_${token.issuer}`;
    
    setFavorites((prev) => {
      const updated = new Set(prev);
      if (isFav) {
        updated.add(key);
      } else {
        updated.delete(key);
      }
      return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-card border border-primary/20 rounded-t-lg md:rounded-lg w-full md:w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col glow-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-foreground">
            Select {type === 'selling' ? 'Selling' : 'Buying'} Asset
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
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
            { id: 'favorites', label: 'Favorites' },
            { id: 'all', label: 'All Tokens' },
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
          ) : displayTokens.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-center">
                {activeTab === 'all' && searchQuery.length === 0
                  ? 'Loading tokens...'
                  : 'No tokens found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {displayTokens.map((token, idx) => {
                const isFav = favorites.has(`${token.code}_${token.issuer}`);
                return (
                  <button
                    key={`${token.code}-${token.issuer || 'native'}-${idx}`}
                    onClick={() => handleTokenSelect(token)}
                    className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:border-primary/50 bg-background/30 hover:bg-primary/10 transition-all"
                  >
                    {/* Favorite Star */}
                    {activeTab === 'all' && (
                      <button
                        onClick={(e) => handleToggleFavorite(e, token)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Star
                          className="w-4 h-4"
                          fill={isFav ? 'currentColor' : 'none'}
                        />
                      </button>
                    )}

                    {/* Token Avatar / Image */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold overflow-hidden">
                      {token.image ? (
                        <img
                          src={token.image}
                          alt={token.code}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{token.code.charAt(0)}</span>
                      )}
                    </div>

                    {/* Token Code with Verified Badge */}
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-foreground text-center text-sm">{token.code}</p>
                      {token.verified && (
                        <span className="text-xs text-primary" title="Verified">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Token Name if available */}
                    {token.name && (
                      <p className="text-xs text-muted-foreground text-center truncate w-full">
                        {token.name}
                      </p>
                    )}

                    {/* Issuer */}
                    <p className="text-xs text-muted-foreground text-center truncate w-full">
                      {token.issuer ? token.issuer.substring(0, 12) + '...' : 'Native'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

