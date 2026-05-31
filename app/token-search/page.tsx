'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Loader2, Star } from 'lucide-react';
import { getTokenPicks } from '@/lib/token-service';
import { getIssuerTokenIcon } from '@/lib/stellar-utils';
import { getFavoriteTokens, toggleFavoriteToken } from '@/lib/token-storage';
import { TokenMetadata } from '@/types/token';

const HORIZON_URL = 'https://horizon.stellar.org';

// Known tokens metadata
const KNOWN_TOKEN_METADATA: Record<string, { name: string; domain: string; image: string }> = {
  'XLM_': { name: 'Stellar Lumens', domain: 'stellar.org', image: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
  'USDC_GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': { name: 'USD Coin', domain: 'circle.com', image: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
};

function enrichTokenWithMetadata(code: string, issuer: string | undefined): { name?: string; domain?: string; image?: string; verified?: boolean } {
  const key = `${code}_${issuer || ''}`;
  if (KNOWN_TOKEN_METADATA[key]) {
    return { ...KNOWN_TOKEN_METADATA[key], verified: true };
  }
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
}

async function searchHorizonTokens(query: string): Promise<Token[]> {
  try {
    const isIssuerSearch = query.startsWith('G') && query.length >= 10;
    const isDomainSearch = query.includes('.') && !query.startsWith('G');
    
    let tokens: Token[] = [];
    
    if (isIssuerSearch) {
      // Search by issuer
      const url = `${HORIZON_URL}/assets?asset_issuer=${encodeURIComponent(query)}&limit=20`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const records = data._embedded?.records || [];
        tokens = records.map((r: any) => ({
          code: r.asset_code,
          issuer: r.asset_issuer,
          name: r.asset_code,
          verified: r.accounts?.authorized > 100,
        }));
      }
    } else if (isDomainSearch) {
      // Search by domain
      const domain = query.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      try {
        const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
        const tomlResponse = await fetch(tomlUrl, { signal: AbortSignal.timeout(5000) });
        if (tomlResponse.ok) {
          const tomlText = await tomlResponse.text();
          const currencyBlocks = tomlText.split(/\[\[CURRENCIES\]\]/i).slice(1);
          
          for (const block of currencyBlocks) {
            const codeMatch = block.match(/code\s*=\s*"([^"]+)"/i);
            const issuerMatch = block.match(/issuer\s*=\s*"([^"]+)"/i);
            const nameMatch = block.match(/name\s*=\s*"([^"]+)"/i);
            const imageMatch = block.match(/image\s*=\s*"([^"]+)"/i);
            
            if (codeMatch && issuerMatch) {
              tokens.push({
                code: codeMatch[1],
                issuer: issuerMatch[1],
                name: nameMatch?.[1] || codeMatch[1],
                image: imageMatch?.[1],
                domain: domain,
                verified: true,
              });
            }
          }
        }
      } catch {
        // Fall back to code search
      }
      
      if (tokens.length === 0) {
        const url = `${HORIZON_URL}/assets?asset_code=${encodeURIComponent(query.toUpperCase())}&limit=20`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const records = data._embedded?.records || [];
          tokens = records.map((r: any) => ({
            code: r.asset_code,
            issuer: r.asset_issuer,
            name: r.asset_code,
            verified: r.accounts?.authorized > 100,
          }));
        }
      }
    } else {
      // Search by code
      const url = `${HORIZON_URL}/assets?asset_code=${encodeURIComponent(query.toUpperCase())}&limit=20`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const records = data._embedded?.records || [];
        tokens = records.map((r: any) => ({
          code: r.asset_code,
          issuer: r.asset_issuer,
          name: r.asset_code,
          verified: r.accounts?.authorized > 100,
        }));
      }
    }

    return tokens;
  } catch (error) {
    console.error('[v0] Search error:', error);
    return [];
  }
}

function TokenCard({ token, isFav, onToggleFavorite }: { token: Token; isFav: boolean; onToggleFavorite: () => void }) {
  const [iconUrl, setIconUrl] = useState<string | null>(token.image || null);
  const [imageError, setImageError] = useState(false);
  const [domain, setDomain] = useState<string | undefined>(token.domain);

  useEffect(() => {
    if (!token.image && !imageError && token.issuer) {
      let cancelled = false;
      getIssuerTokenIcon(token.code, token.issuer).then((url) => {
        if (!cancelled && url) setIconUrl(url);
      });
      return () => { cancelled = true; };
    }
  }, [token.code, token.issuer, token.image, imageError]);

  useEffect(() => {
    if (!token.domain && token.issuer) {
      let cancelled = false;
      fetch(`${HORIZON_URL}/accounts/${token.issuer}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!cancelled && data?.home_domain) setDomain(data.home_domain);
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [token.domain, token.issuer]);

  const displayDomain = domain || token.domain || (token.issuer ? token.issuer.substring(0, 12) + '...' : 'Native');

  return (
    <div className="flex items-start gap-4 p-4 border border-border/50 rounded-lg hover:border-primary/50 bg-background/30 hover:bg-primary/10 transition-all">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold overflow-hidden flex-shrink-0">
        {iconUrl && !imageError ? (
          <img src={iconUrl} alt={token.code} className="w-full h-full object-cover" onError={() => setImageError(true)} />
        ) : (
          <span>{token.code.charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">{token.code}</p>
          {token.verified && <span className="text-xs text-primary" title="Verified">✓</span>}
        </div>
        {token.name && <p className="text-sm text-muted-foreground truncate">{token.name}</p>}
        <p className="text-xs text-muted-foreground/70 truncate">{displayDomain}</p>
      </div>
      <button onClick={onToggleFavorite} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
        <Star className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export default function TokenSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const recommendedTokens = useMemo(() => {
    return getTokenPicks().map((t) => ({
      code: t.code,
      issuer: t.issuer,
      name: t.name,
      domain: t.domain,
      image: t.image,
      verified: t.verified,
    }));
  }, []);

  useEffect(() => {
    const favs = getFavoriteTokens();
    const favSet = new Set(favs.map((t) => `${t.code}_${t.issuer}`));
    setFavorites(favSet);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchHorizonTokens(searchQuery);
      setSearchResults(results);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleFavorite = (token: Token) => {
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

  const displayTokens = searchQuery.length >= 2 ? searchResults : [];
  const showRecommended = searchQuery.length < 2;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-8">Search Tokens</h1>

        {/* Search Box */}
        <div className="glow-border p-6 rounded-lg mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by token name, domain, or issuer address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-input border-border text-foreground pl-12 pr-10 py-3 text-lg"
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Search by:</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Token name (e.g., Bitcoin)</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Domain (e.g., circle.com)</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Issuer (e.g., GA5ZS...)</span>
          </div>
        </div>

        {/* Search Results or Recommended */}
        {searchQuery.length >= 2 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Results for &quot;{searchQuery}&quot;</h2>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Searching Stellar network...</p>
              </div>
            ) : displayTokens.length === 0 ? (
              <div className="flex items-center justify-center py-12 border border-border/50 rounded-lg">
                <p className="text-muted-foreground text-center">No tokens found. Try a different search term.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {displayTokens.map((token) => {
                  const isFav = favorites.has(`${token.code}_${token.issuer}`);
                  return (
                    <TokenCard
                      key={`${token.code}-${token.issuer || 'native'}`}
                      token={token}
                      isFav={isFav}
                      onToggleFavorite={() => handleToggleFavorite(token)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Curated by LOBSTR */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Curated by LOBSTR</h2>
              <div className="grid gap-3">
                {recommendedTokens.map((token) => {
                  const isFav = favorites.has(`${token.code}_${token.issuer}`);
                  return (
                    <TokenCard
                      key={`${token.code}-${token.issuer}`}
                      token={token}
                      isFav={isFav}
                      onToggleFavorite={() => handleToggleFavorite(token)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Featured Assets */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Featured Assets</h2>
              <div className="grid gap-3">
                {recommendedTokens.map((token) => {
                  const isFav = favorites.has(`${token.code}_${token.issuer}`);
                  return (
                    <TokenCard
                      key={`${token.code}-${token.issuer}`}
                      token={token}
                      isFav={isFav}
                      onToggleFavorite={() => handleToggleFavorite(token)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
