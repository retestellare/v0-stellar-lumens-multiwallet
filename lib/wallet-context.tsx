'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { encryptSecret, decryptSecret, generateKeyPair, getPublicKeyFromSecret, getAccountBalances, parseWalletBalances } from '@/lib/stellar-utils';

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  encryptedSecret: string;
  balances: any[];
  poolShares: any[]; // Separate pool shares from regular balances
  createdAt: Date;
  federationName?: string;
  homeDomain?: string;
}

export interface WalletContextType {
  wallets: Wallet[];
  activeWalletId: string | null;
  activeWallet: Wallet | null;
  addWallet: (name: string, secret: string, password: string) => void;
  createWallet: (name: string, password: string) => void;
  removeWallet: (id: string) => void;
  setActiveWallet: (id: string) => void;
  updateWalletName: (id: string, name: string) => void;
  updateWalletDetails: (id: string, details: { name?: string; federationName?: string; homeDomain?: string }) => void;
  updateBalances: (walletId: string) => Promise<void>;
  unlockWallet: (walletId: string, password: string) => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // Compute active wallet
  const activeWallet = useMemo(() => {
    return wallets.find(w => w.id === activeWalletId || w.publicKey === activeWalletId) || null;
  }, [wallets, activeWalletId]);

  // Load wallets from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stellar_wallets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Clean up balances when loading from storage to remove duplicates
        const cleanedWallets = parsed.map((wallet: any) => {
          if (wallet.balances && Array.isArray(wallet.balances)) {
            const { assets, poolShares } = parseWalletBalances(wallet.balances);
            return { ...wallet, balances: assets, poolShares: poolShares || [] };
          }
          return { ...wallet, poolShares: wallet.poolShares || [] };
        });
        setWallets(cleanedWallets);
        if (cleanedWallets.length > 0) {
          setActiveWalletId(cleanedWallets[0].id || cleanedWallets[0].publicKey);
        }
      } catch (error) {
        // Silent fail
      }
    }
  }, []);

  // Save wallets to localStorage whenever they change
  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('stellar_wallets', JSON.stringify(wallets));
    }
  }, [wallets]);

  const addWallet = useCallback((name: string, secret: string, password: string) => {
    try {
      const publicKey = getPublicKeyFromSecret(secret);
      const encryptedSecret = encryptSecret(secret, password);
      const id = `wallet_${Date.now()}`;
      
      const newWallet: Wallet = {
        id,
        name,
        publicKey,
        encryptedSecret,
        balances: [],
        poolShares: [],
        createdAt: new Date(),
      };

      setWallets(prev => [...prev, newWallet]);
      setActiveWalletId(id);
    } catch (error) {
      throw error;
    }
  }, []);

  const createWallet = useCallback((name: string, password: string) => {
    try {
      const { publicKey, secret } = generateKeyPair();
      addWallet(name, secret, password);
    } catch (error) {
      throw error;
    }
  }, [addWallet]);

  const removeWallet = useCallback((id: string) => {
    setWallets(prev => {
      const filtered = prev.filter(w => w.id !== id && w.publicKey !== id);
      // Update localStorage immediately
      if (filtered.length > 0) {
        localStorage.setItem('stellar_wallets', JSON.stringify(filtered));
      } else {
        localStorage.removeItem('stellar_wallets');
      }
      return filtered;
    });
    if (activeWalletId === id) {
      setActiveWalletId(wallets.length > 1 ? wallets[0].id : null);
    }
  }, [activeWalletId, wallets]);

  const updateWalletName = useCallback((id: string, name: string) => {
    setWallets(prev =>
      prev.map(w =>
        (w.id === id || w.publicKey === id) ? { ...w, name } : w
      )
    );
  }, []);

  const updateWalletDetails = useCallback((id: string, details: { name?: string; federationName?: string; homeDomain?: string }) => {
    setWallets(prev =>
      prev.map(w =>
        (w.id === id || w.publicKey === id) ? { ...w, ...details } : w
      )
    );
  }, []);

  const unlockWallet = useCallback((walletId: string, password: string): string => {
    const wallet = wallets.find(w => w.id === walletId || w.publicKey === walletId);
    if (!wallet) throw new Error('Wallet not found');
    
    try {
      return decryptSecret(wallet.encryptedSecret, password);
    } catch (error) {
      throw new Error('Incorrect password');
    }
  }, [wallets]);

  const updateBalances = useCallback(async (walletId: string) => {
    // Use a functional update to avoid stale closure issues
    setWallets(prev => {
      const wallet = prev.find(w => w.id === walletId || w.publicKey === walletId);
      if (!wallet) return prev;
      
      // Fetch balances asynchronously
      getAccountBalances(wallet.publicKey)
        .then(rawBalances => {
          // Parse balances to separate regular assets from pool shares
          const { assets, poolShares } = parseWalletBalances(rawBalances);
          setWallets(current =>
            current.map(w =>
              (w.id === walletId || w.publicKey === walletId) 
                ? { ...w, balances: assets, poolShares } 
                : w
            )
          );
        })
        .catch(() => {
          // Account may not exist yet - keep existing balances
        });
      
      return prev;
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        activeWalletId,
        activeWallet,
        addWallet,
        createWallet,
        removeWallet,
        setActiveWallet: setActiveWalletId,
        updateWalletName,
        updateWalletDetails,
        updateBalances,
        unlockWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
