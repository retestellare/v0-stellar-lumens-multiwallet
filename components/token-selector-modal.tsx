'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Star, Loader2 } from 'lucide-react';
import { TokenMetadata } from '@/types/token';
import { getTokenPicks } from '@/lib/token-service';
import {
  getFavoriteTokens,
  toggleFavoriteToken,
} from '@/lib/token-storage';

const HORIZON_URL = 'https://horizon.stellar.org';

// Known tokens cache for fast metadata lookup
const KNOWN_TOKEN_METADATA: Record<string, { name: string; domain: string; image: string }> = {
  'XLM_': { name: 'Stellar Lumens', domain: 'stellar.org', image: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
  'USDC_GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': { name: 'USD Coin', domain: 'circle.com', image: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  'EURC_GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2': { name: 'Euro Coin', domain: 'circle.com', image: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png' },
  'yXLM_GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55': { name: 'Yield XLM', domain: 'ultrastellar.com', image: 'https://ultrastellar.com/static/images/icons/yXLM.png' },
  'AQUA_GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA': { name: 'Aquarius', domain: 'aqua.network', image: 'https://aqua.network/assets/img/aqua-logo.png' },
  'BTC_GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM': { name: 'Bitcoin', domain: 'ultrastellar.com', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  'ETH_GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM': { name: 'Ethereum', domain: 'ultrastellar.com', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  'SHX_GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEZ6GKPNAC4ZISIJEJNLBPA4FT': { name: 'Stronghold SHX', domain: 'stronghold.co', image: 'https://assets.coingecko.com/coins/images/31254/small/SHX.png' },
  'USD_GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX': { name: 'AnchorUSD', domain: 'anchorusd.com', image: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
  'VELO_GDM4RQUQQUVSKQA7S6EM7XBZP3FCGH4Q7CL6TABQ7B2BEJ5ERARM2M5M': { name: 'Velo', domain: 'velo.org', image: 'https://assets.coingecko.com/coins/images/12722/small/velo.png' },
  'RIO_GBNLJIYH34UWO5YZFA3A3HD3N76R6DOI33N4JONUOHEEYZYCAYTEJ5AK': { name: 'Realio', domain: 'realio.fund', image: 'https://assets.coingecko.com/coins/images/12206/small/realio.png' },
};

// Enrich token with metadata from cache or picks
function enrichTokenWithMetadata(code: string, issuer: string | undefined): { name?: string; domain?: string; image?: string; verified?: boolean } {
  const key = `${code}_${issuer || ''}`;
  if (KNOWN_TOKEN_METADATA[key]) {
    return { ...KNOWN_TOKEN_METADATA[key], verified: true };
  }
  // Check token picks for metadata
  const picks = getTokenPicks();
  const match = picks.find(p => p.code === code && p.issuer === (issuer || ''));
  if (match) {
    return { name: match.name, domain: match.domain, image: match.image, verified: match.verified };
  }
  return {};
}

interface Token {
  code: string;
  issuer?: string;
  name?: string;
  image?: string;
  verified?: boolean;
  domain?: string;
  source?: 'wallet' | 'picks' | 'search' | 'favorites';
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  walletBalances: Array<{ asset_code?: string; asset_type?: string; asset_issuer?: string }>;
  type: 'selling' | 'buying';
}

// Search tokens directly from Horizon API
async function searchHorizonTokens(query: string): Promise<Token[]> {
  try {
    // Check if query looks like an issuer address (starts with G and is 56 chars)
    const isIssuerSearch = query.startsWith('G') && query.length >= 10;
    
    let url: string;
    if (isIssuerSearch) {
      // Search by issuer
      url = `${HORIZON_URL}/assets?asset_issuer=${encodeURIComponent(query)}&limit=20`;
    } else {
      // Search by code
      url = `${HORIZON_URL}/assets?asset_code=${encodeURIComponent(query.toUpperCase())}&limit=20`;
    }

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const records = data._embedded?.records || [];

    return records.map((r: any) => ({
      code: r.asset_code,
      issuer: r.asset_issuer,
      name: r.asset_code,
      verified: r.accounts?.authorized > 100,
      source: 'search' as const,
    }));
  } catch (error) {
    console.error('[v0] Horizon search error:', error);
    return [];
  }
}

export function TokenSelectorModal({
  isOpen,
  onClose,
  onSelect,
  walletBalances,
  type,
}: TokenSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'picks' | 'favorites'>('picks');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayTokens, setDisplayTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Memoize wallet tokens with enriched metadata
  const walletTokens = useMemo(
    () =>
      walletBalances.map((b) => {
        const code = b.asset_code || 'XLM';
        const issuer = b.asset_issuer;
        const meta = enrichTokenWithMetadata(code, issuer);
        return {
          code,
          issuer,
          name: meta.name,
          domain: meta.domain,
          image: meta.image,
          verified: meta.verified,
          source: 'wallet' as const,
        };
      }),
    [walletBalances]
  );

  // Get curated picks with more tokens
  const tokenPicks = useMemo(() => {
    const picks = getTokenPicks();
    return picks.map((t) => ({
      code: t.code,
      issuer: t.issuer,
      name: t.name,
      domain: t.domain,
      image: t.image,
      verified: t.verified,
      source: 'picks' as const,
    }));
  }, []);

  // Update favorites when modal opens
  useEffect(() => {
    if (isOpen) {
      const favs = getFavoriteTokens();
      const favSet = new Set(favs.map((t) => `${t.code}_${t.issuer}`));
      setFavorites(favSet);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // Handle search with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchHorizonTokens(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update display tokens based on tab and search
  useEffect(() => {
    // If searching, show search results
    if (searchQuery.length >= 2) {
      setDisplayTokens(searchResults);
      return;
    }

    // Otherwise show tab content
    if (activeTab === 'wallet') {
      setDisplayTokens(walletTokens);
    } else if (activeTab === 'picks') {
      setDisplayTokens(tokenPicks);
    } else if (activeTab === 'favorites') {
      const favs = getFavoriteTokens();
      setDisplayTokens(
        favs.map((t) => ({
          code: t.code,
          issuer: t.issuer,
          name: t.name,
          image: t.image,
          verified: t.verified,
          source: 'favorites' as const,
        }))
      );
    }
  }, [activeTab, searchQuery, searchResults, walletTokens, tokenPicks]);

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
      source: 'stellar-expert',
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

  const showingSearch = searchQuery.length >= 2;

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
        <div className="p-4 bg-background/30 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by token code or issuer address (G...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-input border-border text-foreground pl-10 pr-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
          </div>
          {searchQuery.length >= 2 && (
            <p className="text-xs text-muted-foreground mt-2">
              Searching Stellar network for &quot;{searchQuery}&quot;...
            </p>
          )}
        </div>

        {/* Tabs - only show when not searching */}
        {!showingSearch && (
          <div className="flex gap-2 p-4 bg-background/50 border-b border-border">
            {[
              { id: 'wallet', label: 'My Assets' },
              { id: 'picks', label: 'Our Picks' },
              { id: 'favorites', label: 'Favorites' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap z-10 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background border border-border/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Token Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Searching Stellar network...</p>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-center">
                {showingSearch
                  ? 'No tokens found. Try a different code or issuer.'
                  : activeTab === 'favorites'
                  ? 'No favorites yet. Star tokens to add them here.'
                  : activeTab === 'wallet'
                  ? 'No assets in your wallet.'
                  : 'No tokens available.'}
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
                    <button
                      onClick={(e) => handleToggleFavorite(e, token)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Star
                        className="w-4 h-4"
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>

                    {/* Token Avatar */}
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

                    {/* Token Name or Domain */}
                    {(token.name || token.domain) && (
                      <p className="text-xs text-muted-foreground text-center truncate w-full">
                        {token.name || token.domain}
                      </p>
                    )}

                    {/* Domain or Issuer - prefer domain over issuer address */}
                    <p className="text-xs text-muted-foreground/70 text-center truncate w-full">
                      {token.domain || (token.issuer ? token.issuer.substring(0, 12) + '...' : 'Native')}
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
