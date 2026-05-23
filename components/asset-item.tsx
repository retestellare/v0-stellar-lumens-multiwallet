'use client';

import { useState, useEffect } from 'react';
import { fetchTokenMetadataFromToml } from '@/lib/stellar-utils';

interface AssetItemProps {
  code: string;
  issuer: string;
  balance: string;
}

export function AssetItem({ code, issuer, balance }: AssetItemProps) {
  const [image, setImage] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMeta = async () => {
      if (code === 'XLM' || !issuer) {
        setImage('https://stellar.org/favicon.ico');
        setDomain('stellar.org');
        return;
      }
      
      const meta = await fetchTokenMetadataFromToml(code, issuer);
      if (meta.image) setImage(meta.image);
      if (meta.domain) setDomain(meta.domain);
    };
    
    fetchMeta();
  }, [code, issuer]);
  
  return (
    <div className="flex items-center justify-between p-2 bg-background/30 rounded border border-border/50">
      <div className="flex items-center gap-2">
        {/* Token Image */}
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/30 flex-shrink-0">
          {image ? (
            <img 
              src={image} 
              alt={code} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<span class="text-xs font-bold text-primary">${code.charAt(0)}</span>`;
              }}
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
