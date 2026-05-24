'use client';

import { useState, useEffect } from 'react';
import { fetchTokenMetadataFromToml } from '@/lib/stellar-utils';
import { getTokenPicks } from '@/lib/token-service';

// Known tokens cache for instant metadata lookup
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

// Get metadata from cache or token picks
function getTokenMetadata(code: string, issuer: string): { name?: string; domain?: string; image?: string } | null {
  const key = `${code}_${issuer || ''}`;
  if (KNOWN_TOKEN_METADATA[key]) {
    return KNOWN_TOKEN_METADATA[key];
  }
  // Check token picks
  const picks = getTokenPicks();
  const match = picks.find(p => p.code === code && p.issuer === (issuer || ''));
  if (match) {
    return { name: match.name, domain: match.domain, image: match.image };
  }
  return null;
}

interface AssetItemProps {
  code: string;
  issuer: string;
  balance: string;
}

export function AssetItem({ code, issuer, balance }: AssetItemProps) {
  // Try instant lookup first
  const cachedMeta = getTokenMetadata(code, issuer);
  
  const [image, setImage] = useState<string | null>(cachedMeta?.image || null);
  const [domain, setDomain] = useState<string | null>(cachedMeta?.domain || null);
  const [imageError, setImageError] = useState(false);
  
  // Only fetch from TOML if not in cache
  useEffect(() => {
    if (cachedMeta) return; // Already have metadata
    
    const fetchMeta = async () => {
      const meta = await fetchTokenMetadataFromToml(code, issuer);
      if (meta.image) setImage(meta.image);
      if (meta.domain) setDomain(meta.domain);
    };
    
    fetchMeta();
  }, [code, issuer, cachedMeta]);
  
  return (
    <div className="flex items-center justify-between p-2 bg-background/30 rounded border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2">
        {/* Token Image */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border border-primary/30 flex-shrink-0">
          {image && !imageError ? (
            <img 
              src={image} 
              alt={code} 
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-xs font-bold text-primary">{code.charAt(0)}</span>
          )}
        </div>
        
        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{code}</p>
          <p className="text-xs text-muted-foreground truncate">
            {domain || (issuer ? `${issuer.substring(0, 8)}...` : 'Native')}
          </p>
        </div>
      </div>
      
      {/* Balance */}
      <p className="text-sm font-semibold text-primary ml-2">
        {parseFloat(balance).toFixed(4)}
      </p>
    </div>
  );
}
