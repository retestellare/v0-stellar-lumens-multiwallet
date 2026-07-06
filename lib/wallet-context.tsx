'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { encryptSecret, decryptSecret, generateKeyPair, getPublicKeyFromSecret, getAccountBalances, getMultipleWalletBalances, parseWalletBalances } from '@/lib/stellar-utils';

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  encryptedSecret: string;
  balances: any[];
  poolShares: any[];
  createdAt: Date;
  federationName?: string;
  homeDomain?: string;
  fetchError?: string;
}

export type PasswordSessionType = 'everytime' | 'after_hour' | 'never';

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
  savePasswordSession: (walletId: string, password: string, sessionType: PasswordSessionType) => void;
  getPasswordSession: (walletId: string) => string | null;
  clearPasswordSession: (walletId: string) => void;
  passwordSessionType: PasswordSessionType;
  setPasswordSessionType: (type: PasswordSessionType) => void;
  batchImportWallets: (entries: Array<{ privateKey: string; publicKey: string; accountName: string }>, password: string) => { successful: number; failed: number };
  globalDecryptedSecret: string | null;
  setGlobalDecryptedSecret: (secret: string | null) => void;
  setSessionPassword: (password: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // Per-wallet decrypted secret cache — stored in RAM only
  const [walletSecrets, setWalletSecrets] = useState<Record<string, string>>({});

  // Session password ref — not state, so changes don't trigger re-renders
  const sessionPasswordRef = useRef<string | null>(null);

  // globalDecryptedSecret is the secret for the currently active wallet
  const globalDecryptedSecret = activeWalletId ? (walletSecrets[activeWalletId] ?? null) : null;

  // Use a ref for wallets inside updateBalances to avoid stale closures
  // without adding wallets to the useCallback dependency array
  const walletsRef = useRef<Wallet[]>(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  // When the active wallet changes, try to auto-decrypt with cached session password
  useEffect(() => {
    if (!activeWalletId || !sessionPasswordRef.current) return;
    if (walletSecrets[activeWalletId]) return;

    const wallet = walletsRef.current.find(w => w.id === activeWalletId || w.publicKey === activeWalletId);
    if (!wallet) return;

    try {
      const secret = decryptSecret(wallet.encryptedSecret, sessionPasswordRef.current);
      setWalletSecrets(prev => ({ ...prev, [activeWalletId]: secret }));
    } catch {
      // Password doesn't match this wallet — modal will appear as a fallback
    }
  }, [activeWalletId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSessionPassword = useCallback((password: string) => {
    sessionPasswordRef.current = password;
  }, []);

  const setGlobalDecryptedSecret = useCallback((secret: string | null) => {
    setActiveWalletId(prev => {
      if (!prev) return prev;
      setWalletSecrets(prevSecrets => {
        if (secret === null) {
          const next = { ...prevSecrets };
          delete next[prev];
          return next;
        }
        return { ...prevSecrets, [prev]: secret };
      });
      return prev;
    });
  }, []);

  // Password session management — stored in RAM only
  const [passwordSessionType, setPasswordSessionType] = useState<PasswordSessionType>('everytime');
  const [passwordSessions, setPasswordSessions] = useState<Record<string, { password: string; timestamp: number }>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Compute active wallet from memo — stable as long as wallets/activeWalletId don't change
  const activeWallet = useMemo(() => {
    return wallets.find(w => w.id === activeWalletId || w.publicKey === activeWalletId) || null;
  }, [wallets, activeWalletId]);

  // Persist wallets to localStorage whenever they change (single effect, not duplicated)
  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('stellar_wallets', JSON.stringify(wallets));
    }
  }, [wallets]);

  // Load wallets from localStorage on mount only
  useEffect(() => {
    const loadWallets = async () => {
      const stored = localStorage.getItem('stellar_wallets');
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
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

        // Only fetch balances for wallets that have none cached
        const walletsNeedingFetch = cleanedWallets.filter(
          (w: any) => !w.balances || w.balances.length === 0
        );
        if (walletsNeedingFetch.length === 0) return;

        const publicKeys = walletsNeedingFetch.map((w: any) => w.publicKey);
        try {
          const batchResults = await getMultipleWalletBalances(publicKeys, 5, 150);
          setWallets(prev =>
            prev.map(wallet => {
              const result = batchResults[wallet.publicKey];
              if (result && walletsNeedingFetch.find((w: any) => w.id === wallet.id)) {
                if (result.error) {
                  return { ...wallet, fetchError: result.error };
                }
                const { assets, poolShares } = parseWalletBalances(result.balances);
                return { ...wallet, balances: assets, poolShares: poolShares || [], fetchError: undefined };
              }
              return wallet;
            })
          );
        } catch (error) {
          console.error('[v0] Error batch fetching wallets on load:', error);
        }
      } catch (error) {
        console.error('[v0] Error loading wallets from storage:', error);
      }
    };

    loadWallets();
  }, []); // runs once on mount only

  const addWallet = useCallback((name: string, secret: string, password: string) => {
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
  }, []);

  const createWallet = useCallback((name: string, password: string) => {
    const { publicKey, secret } = generateKeyPair();
    addWallet(name, secret, password);
  }, [addWallet]);

  const removeWallet = useCallback((id: string) => {
    setWallets(prev => {
      const filtered = prev.filter(w => w.id !== id && w.publicKey !== id);
      if (filtered.length > 0) {
        localStorage.setItem('stellar_wallets', JSON.stringify(filtered));
      } else {
        localStorage.removeItem('stellar_wallets');
      }
      return filtered;
    });
    setActiveWalletId(prev => {
      if (prev !== id) return prev;
      const remaining = walletsRef.current.filter(w => w.id !== id && w.publicKey !== id);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  }, []);

  const updateWalletName = useCallback((id: string, name: string) => {
    setWallets(prev =>
      prev.map(w => (w.id === id || w.publicKey === id) ? { ...w, name } : w)
    );
  }, []);

  const updateWalletDetails = useCallback((id: string, details: { name?: string; federationName?: string; homeDomain?: string }) => {
    setWallets(prev =>
      prev.map(w => (w.id === id || w.publicKey === id) ? { ...w, ...details } : w)
    );
  }, []);

  const unlockWallet = useCallback((walletId: string, password: string): string => {
    const wallet = walletsRef.current.find(w => w.id === walletId || w.publicKey === walletId);
    if (!wallet) throw new Error('Wallet not found');
    try {
      return decryptSecret(wallet.encryptedSecret, password);
    } catch {
      throw new Error('Incorrect password');
    }
  }, []); // no wallets dep — uses walletsRef

  const savePasswordSession = useCallback((walletId: string, password: string, sessionType: PasswordSessionType) => {
    if (timeoutRefs.current[walletId]) {
      clearTimeout(timeoutRefs.current[walletId]);
      delete timeoutRefs.current[walletId];
    }

    setPasswordSessions(prev => ({
      ...prev,
      [walletId]: { password, timestamp: Date.now() },
    }));

    if (sessionType === 'after_hour') {
      timeoutRefs.current[walletId] = setTimeout(() => {
        setPasswordSessions(prev => {
          const updated = { ...prev };
          delete updated[walletId];
          return updated;
        });
        delete timeoutRefs.current[walletId];
      }, 60 * 60 * 1000);
    }
  }, []);

  const getPasswordSession = useCallback((walletId: string): string | null => {
    if (passwordSessionType === 'everytime') return null;

    const session = passwordSessions[walletId];
    if (!session) return null;

    if (passwordSessionType === 'after_hour') {
      const ageInMinutes = (Date.now() - session.timestamp) / 60000;
      if (ageInMinutes > 60) {
        setPasswordSessions(prev => {
          const updated = { ...prev };
          delete updated[walletId];
          return updated;
        });
        return null;
      }
    }

    return session.password;
  }, [passwordSessionType, passwordSessions]);

  const clearPasswordSession = useCallback((walletId: string) => {
    if (timeoutRefs.current[walletId]) {
      clearTimeout(timeoutRefs.current[walletId]);
      delete timeoutRefs.current[walletId];
    }
    setPasswordSessions(prev => {
      const updated = { ...prev };
      delete updated[walletId];
      return updated;
    });
  }, []);

  // updateBalances uses walletsRef so it never needs wallets in its dep array
  // This prevents the infinite loop: wallets change → updateBalances ref changes
  // → useEffects re-run → fetch → wallets change → repeat
  const updateBalances = useCallback(async (walletId: string) => {
    const wallet = walletsRef.current.find(w => w.id === walletId || w.publicKey === walletId);
    if (!wallet) return;

    try {
      const rawBalances = await getAccountBalances(wallet.publicKey);
      const { assets, poolShares } = parseWalletBalances(rawBalances);

      setWallets(current =>
        current.map(w =>
          (w.id === walletId || w.publicKey === walletId)
            ? { ...w, balances: assets, poolShares: poolShares || [], fetchError: undefined }
            : w
        )
      );
    } catch (error: any) {
      console.error('[v0] Balance fetch error for', wallet.publicKey, ':', error?.message);
      // Only store error — do NOT clear existing balances on failure
      setWallets(current =>
        current.map(w =>
          (w.id === walletId || w.publicKey === walletId)
            ? { ...w, fetchError: error?.message || 'Network Error' }
            : w
        )
      );
    }
  }, []); // stable — no dependencies, uses walletsRef

  const batchImportWallets = useCallback((entries: Array<{ privateKey: string; publicKey: string; accountName: string }>, password: string) => {
    let successful = 0;
    let failed = 0;
    const newWalletsToAdd: Wallet[] = [];

    entries.forEach(entry => {
      try {
        const encryptedSecret = encryptSecret(entry.privateKey, password);
        const id = `wallet_${Date.now()}_${Math.random()}`;
        newWalletsToAdd.push({
          id,
          name: entry.accountName,
          publicKey: entry.publicKey,
          encryptedSecret,
          balances: [],
          poolShares: [],
          createdAt: new Date(),
        });
        successful++;
      } catch {
        failed++;
      }
    });

    if (successful > 0) {
      setWallets(prev => [...prev, ...newWalletsToAdd]);
      setActiveWalletId(newWalletsToAdd[0].id);
    }

    return { successful, failed };
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
        savePasswordSession,
        getPasswordSession,
        clearPasswordSession,
        passwordSessionType,
        setPasswordSessionType,
        batchImportWallets,
        globalDecryptedSecret,
        setGlobalDecryptedSecret,
        setSessionPassword,
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
