'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { encryptSecret, decryptSecret, generateKeyPair, getPublicKeyFromSecret, getAccountBalances, getMultipleWalletBalances, parseWalletBalances } from '@/lib/stellar-utils';

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
  fetchError?: string; // Error message if balance fetch failed
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
  // Global decrypted secret — unlocked once on app open, cleared on wallet change
  globalDecryptedSecret: string | null;
  setGlobalDecryptedSecret: (secret: string | null) => void;
  // Store the session password so wallet switches auto-decrypt without re-prompting
  setSessionPassword: (password: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  
  // Per-wallet decrypted secret cache — stored in RAM only, cleared on page reload.
  const [walletSecrets, setWalletSecrets] = useState<Record<string, string>>({});

  // Session password — cached in RAM after the first successful unlock so that
  // switching wallets can silently decrypt the new wallet without re-prompting.
  const sessionPasswordRef = React.useRef<string | null>(null);

  // globalDecryptedSecret is the secret for the *currently active* wallet.
  const globalDecryptedSecret = activeWalletId ? (walletSecrets[activeWalletId] ?? null) : null;

  // When the active wallet changes, try to auto-decrypt it with the cached session password.
  useEffect(() => {
    if (!activeWalletId || !sessionPasswordRef.current) return;
    // Already unlocked for this wallet in this session — nothing to do.
    if (walletSecrets[activeWalletId]) return;

    const wallet = wallets.find(w => w.id === activeWalletId || w.publicKey === activeWalletId);
    if (!wallet) return;

    try {
      const secret = decryptSecret(wallet.encryptedSecret, sessionPasswordRef.current);
      setWalletSecrets(prev => ({ ...prev, [activeWalletId]: secret }));
    } catch {
      // Password doesn't match this wallet — modal will appear as a fallback.
    }
  }, [activeWalletId, wallets]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSessionPassword = useCallback((password: string) => {
    sessionPasswordRef.current = password;
  }, []);

  const setGlobalDecryptedSecret = useCallback((secret: string | null) => {
    if (!activeWalletId) return;
    setWalletSecrets(prev => {
      if (secret === null) {
        const next = { ...prev };
        delete next[activeWalletId];
        return next;
      }
      return { ...prev, [activeWalletId]: secret };
    });
  }, [activeWalletId]);

  // Password session management - stored in RAM only
  const [passwordSessionType, setPasswordSessionType] = useState<PasswordSessionType>('everytime');
  const [passwordSessions, setPasswordSessions] = useState<Record<string, { password: string; timestamp: number }>>({});
  const timeoutRefs = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Compute active wallet
  const activeWallet = useMemo(() => {
    return wallets.find(w => w.id === activeWalletId || w.publicKey === activeWalletId) || null;
  }, [wallets, activeWalletId]);

  // Persist wallets to localStorage whenever they change
  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('stellar_wallets', JSON.stringify(wallets));
    }
  }, [wallets]);

  // Load wallets from localStorage on mount and fetch balances with batching
  useEffect(() => {
    const loadWallets = async () => {
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

          // Batch fetch balances for all wallets in the background
          const walletsNeedingFetch = cleanedWallets.filter(w => !w.balances || w.balances.length === 0);
          if (walletsNeedingFetch.length > 0) {
            const publicKeys = walletsNeedingFetch.map((w: any) => w.publicKey);
            try {
              const batchResults = await getMultipleWalletBalances(publicKeys, 5, 150);
              
              // Update wallets with fetched balances
              setWallets(prevWallets =>
                prevWallets.map(wallet => {
                  const result = batchResults[wallet.publicKey];
                  if (result && walletsNeedingFetch.find(w => w.id === wallet.id)) {
                    if (result.error) {
                      return { ...wallet, fetchError: result.error };
                    } else {
                      const { assets, poolShares } = parseWalletBalances(result.balances);
                      return { ...wallet, balances: assets, poolShares: poolShares || [], fetchError: undefined };
                    }
                  }
                  return wallet;
                })
              );
            } catch (error) {
              console.error('[v0] Error batch fetching wallets:', error);
            }
          }
        } catch (error) {
          console.error('[v0] Error loading wallets:', error);
        }
      }
    };

    loadWallets();
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

  // Save password to memory with session type
  const savePasswordSession = useCallback((walletId: string, password: string, sessionType: PasswordSessionType) => {
    // Clear any existing timeout for this wallet
    if (timeoutRefs.current[walletId]) {
      clearTimeout(timeoutRefs.current[walletId]);
      delete timeoutRefs.current[walletId];
    }

    setPasswordSessions(prev => ({
      ...prev,
      [walletId]: {
        password,
        timestamp: Date.now(),
      },
    }));

    // If after_hour, set a timeout to clear the password after 60 minutes
    if (sessionType === 'after_hour') {
      const timeoutId = setTimeout(() => {
        setPasswordSessions(prev => {
          const updated = { ...prev };
          delete updated[walletId];
          return updated;
        });
        delete timeoutRefs.current[walletId];
      }, 60 * 60 * 1000); // 60 minutes in milliseconds

      timeoutRefs.current[walletId] = timeoutId;
    }
  }, []);

  // Retrieve password if valid based on session type
  const getPasswordSession = useCallback((walletId: string): string | null => {
    if (passwordSessionType === 'everytime') {
      return null; // Always ask for password
    }

    const session = passwordSessions[walletId];
    if (!session) return null;

    if (passwordSessionType === 'after_hour') {
      const ageInMs = Date.now() - session.timestamp;
      const ageInMinutes = ageInMs / (60 * 1000);
      if (ageInMinutes > 60) {
        // Password expired, remove it
        setPasswordSessions(prev => {
          const updated = { ...prev };
          delete updated[walletId];
          return updated;
        });
        return null;
      }
      return session.password;
    }

    if (passwordSessionType === 'never') {
      return session.password; // Return password indefinitely
    }

    return null;
  }, [passwordSessionType, passwordSessions]);

  // Clear password session for a specific wallet
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

  const updateBalances = useCallback(async (walletId: string) => {
    setWallets(prevWallets => {
      const wallet = prevWallets.find(w => w.id === walletId || w.publicKey === walletId);
      if (!wallet) return prevWallets;
      
      // Fetch balances asynchronously in the background
      (async () => {
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
          console.error('[v0] Balance fetch error:', error?.message);
          setWallets(current =>
            current.map(w =>
              (w.id === walletId || w.publicKey === walletId)
                ? { ...w, fetchError: error?.message || 'Network Error' }
                : w
            )
          );
        }
      })();
      
      return prevWallets;
    });
  }, []);

  // Auto-refresh balances when active wallet changes
  useEffect(() => {
    if (activeWalletId) {
      updateBalances(activeWalletId);
    }
  }, [activeWalletId, updateBalances]);

  const batchImportWallets = useCallback((entries: Array<{ privateKey: string; publicKey: string; accountName: string }>, password: string) => {
    let successful = 0;
    let failed = 0;
    const newWalletsToAdd: Wallet[] = [];

    entries.forEach(entry => {
      try {
        const encryptedSecret = encryptSecret(entry.privateKey, password);
        const id = `wallet_${Date.now()}_${Math.random()}`;
        
        const newWallet: Wallet = {
          id,
          name: entry.accountName,
          publicKey: entry.publicKey,
          encryptedSecret,
          balances: [],
          poolShares: [],
          createdAt: new Date(),
        };

        newWalletsToAdd.push(newWallet);
        successful++;
      } catch (error) {
        failed++;
      }
    });

    // Add all wallets at once and set active to the first newly imported one
    if (successful > 0) {
      setWallets(prev => [...prev, ...newWalletsToAdd]);
      // Set first new wallet as active
      if (newWalletsToAdd.length > 0) {
        setActiveWalletId(newWalletsToAdd[0].id);
      }
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
