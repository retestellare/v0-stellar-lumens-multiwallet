'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { encryptSecret, decryptSecret, generateKeyPair, getPublicKeyFromSecret, getAccountBalances } from '@/lib/stellar-utils';

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  encryptedSecret: string;
  balances: any[];
  createdAt: Date;
}

export interface WalletContextType {
  wallets: Wallet[];
  activeWalletId: string | null;
  addWallet: (name: string, secret: string, password: string) => void;
  createWallet: (name: string, password: string) => void;
  removeWallet: (id: string) => void;
  setActiveWallet: (id: string) => void;
  updateBalances: (walletId: string) => Promise<void>;
  unlockWallet: (walletId: string, password: string) => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // Load wallets from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stellar_wallets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWallets(parsed);
        if (parsed.length > 0) {
          setActiveWalletId(parsed[0].id);
        }
      } catch (error) {
        console.error('[v0] Error loading wallets:', error);
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
        createdAt: new Date(),
      };

      setWallets(prev => [...prev, newWallet]);
      setActiveWalletId(id);
    } catch (error) {
      console.error('[v0] Error adding wallet:', error);
      throw error;
    }
  }, []);

  const createWallet = useCallback((name: string, password: string) => {
    try {
      const { publicKey, secret } = generateKeyPair();
      addWallet(name, secret, password);
    } catch (error) {
      console.error('[v0] Error creating wallet:', error);
      throw error;
    }
  }, [addWallet]);

  const removeWallet = useCallback((id: string) => {
    setWallets(prev => prev.filter(w => w.id !== id));
    if (activeWalletId === id) {
      setActiveWalletId(wallets.length > 1 ? wallets[0].id : null);
    }
  }, [activeWalletId, wallets]);

  const unlockWallet = useCallback((walletId: string, password: string): string => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) throw new Error('Wallet not found');
    
    try {
      return decryptSecret(wallet.encryptedSecret, password);
    } catch (error) {
      throw new Error('Incorrect password');
    }
  }, [wallets]);

  const updateBalances = useCallback(async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    try {
      const balances = await getAccountBalances(wallet.publicKey);
      setWallets(prev =>
        prev.map(w =>
          w.id === walletId ? { ...w, balances } : w
        )
      );
    } catch (error) {
      console.error('[v0] Error updating balances:', error);
    }
  }, [wallets]);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        activeWalletId,
        addWallet,
        createWallet,
        removeWallet,
        setActiveWallet: setActiveWalletId,
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
