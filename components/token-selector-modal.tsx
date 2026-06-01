'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Star } from 'lucide-react';
import { TokenMetadata } from '@/types/token';
import { getIssuerTokenIcon } from '@/lib/stellar-utils';
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
  'ARST_GCSAZVWXZKWS4XS223M5F54H2B6XPIBER2JJ4CA4DDXPLGMIVLRMR2': { name: 'ARS Token', domain: 'anclap.com', image: 'https://anclap.com/assets/img/arst-logo.png' },
  'BRLT_GCHH4UPC43VEMDOZ2OYSEFWPVNBVPZQLSUF3USKX6CJXJ6JKF3AIYBRLT': { name: 'BRL Token', domain: 'ntokens.com', image: 'https://ntokens.com/assets/brlt-logo.png' },
  'DOGET_GDOEVDDBU6OBWKL7VHDAOKD77UP4DKHQYKOKJJT5PR3WRDBTX35HUEUX': { name: 'Doge Token', domain: 'doget.org', image: 'https://doget.org/assets/doget-logo.png' },
  'yUSDC_GDGTVWSM4MGS4T7Z6W4RPWOCHE2I6RDFCIFZG5YCHF3QHFKWVWDCCV': { name: 'Yield USDC', domain: 'ultrastellar.com', image: 'https://ultrastellar.com/static/images/icons/yUSDC.png' },
  'FIDR_GBZQNUAGO4DZFWOHJ3PVXZKZ2LTSOVAMCTVM46OEMWNWTED4DFS3NAYH': { name: 'FIDR', domain: 'fidr.io', image: '' },
  'LSP_GAB7STHVD5BDH3EEYXPI3OM7PCS4V443PYB5FNT6CFGJVPDLMKDM24WK': { name: 'Lumenswap', domain: 'lumenswap.io', image: '' },
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

// Token card component with cached icon loading and domain fetching
function TokenCard({
  token,
  isFav,
  onSelect,
  onToggleFavorite,
}: {
  token: Token;
  isFav: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const [iconUrl, setIconUrl] = useState<string | null>(token.image || null);
  const [imageError, setImageError] = useState(false);
  const [domain, setDomain] = useState<string | undefined>(token.domain);

  // Fetch icon from issuer's stellar.toml if not provided
  useEffect(() => {
    if (!token.image && !imageError && token.issuer) {
      let cancelled = false;
      getIssuerTokenIcon(token.code, token.issuer).then((url) => {
        if (!cancelled && url) setIconUrl(url);
      });
      return () => { cancelled = true; };
    }
  }, [token.code, token.issuer, token.image, imageError]);

  // Fetch domain from Horizon account if not provided
  useEffect(() => {
    if (!token.domain && token.issuer) {
      let cancelled = false;
      fetch(`${HORIZON_URL}/accounts/${token.issuer}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!cancelled && data?.home_domain) {
            setDomain(data.home_domain);
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [token.domain, token.issuer]);

  // Display domain or truncated issuer
  const displayDomain = domain || token.domain || (token.issuer ? token.issuer.substring(0, 12) + '...' : 'Native');

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:border-primary/50 bg-background/30 hover:bg-primary/10 transition-all"
    >
      {/* Favorite Star */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors"
      >
        <Star
          className="w-4 h-4"
          fill={isFav ? 'currentColor' : 'none'}
        />
      </button>

      {/* Token Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold overflow-hidden">
        {iconUrl && !imageError ? (
          <img
            src={iconUrl}
            alt={token.code}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
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

      {/* Token Name */}
      {token.name && (
        <p className="text-xs text-muted-foreground text-center truncate w-full">
          {token.name}
        </p>
      )}

      {/* Domain or Issuer - prefer domain over issuer address */}
      <p className="text-xs text-muted-foreground/70 text-center truncate w-full">
        {displayDomain}
      </p>
    </button>
  );
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
  const [displayTokens, setDisplayTokens] = useState<Token[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Memoize wallet tokens with enriched metadata and deduplication
  const walletTokens = useMemo(() => {
    // Create a map to deduplicate tokens by code+issuer
    const tokenMap = new Map<string, Token>();
    
    walletBalances.forEach((b) => {
      // Skip liquidity_pool_shares - they're not tradable assets
      if (b.asset_type === 'liquidity_pool_shares') return;
      
      const code = b.asset_code || 'XLM';
      const issuer = b.asset_issuer || '';
      const key = `${code}_${issuer}`;
      
      // Only add if not already in map (deduplication)
      if (!tokenMap.has(key)) {
        const meta = enrichTokenWithMetadata(code, issuer || undefined);
        tokenMap.set(key, {
          code,
          issuer: issuer || undefined,
          name: meta.name,
          domain: meta.domain,
          image: meta.image,
          verified: meta.verified,
          source: 'wallet' as const,
        });
      }
    });
    
    return Array.from(tokenMap.values());
  }, [walletBalances]);

  // Update favorites when modal opens
  useEffect(() => {
    if (isOpen) {
      const favs = getFavoriteTokens();
      const favSet = new Set(favs.map((t) => `${t.code}_${t.issuer}`));
      setFavorites(favSet);
    }
  }, [isOpen]);

  // Update display tokens to show wallet tokens only
  useEffect(() => {
    setDisplayTokens(walletTokens);
  }, [walletTokens]);

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-card border border-primary/20 rounded-t-lg md:rounded-lg w-full md:w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col glow-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Select {type === 'selling' ? 'First' : 'Second'} Asset
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose from your wallet assets
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Token Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayTokens.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-center">
                No assets in your wallet. Fund your account first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {displayTokens.map((token, idx) => {
                const isFav = favorites.has(`${token.code}_${token.issuer}`);
                return (
                  <TokenCard
                    key={`${token.code}-${token.issuer || 'native'}-${idx}`}
                    token={token}
                    isFav={isFav}
                    onSelect={() => handleTokenSelect(token)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, token)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
