'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { encryptSecret, decryptSecret, generateKeyPair, getPublicKeyFromSecret, getAccountBalances, parseWalletBalances } from '@/lib/stellar-utils';

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
  status: 'active' | 'unfunded' | 'loading' | 'error';
  statusMessage?: string;
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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [validationInProgress, setValidationInProgress] = useState<Set<string>>(new Set());
  
  // Password session management - stored in RAM only
  const [passwordSessionType, setPasswordSessionType] = useState<PasswordSessionType>('everytime');
  const [passwordSessions, setPasswordSessions] = useState<Record<string, { password: string; timestamp: number }>>({});
  const timeoutRefs = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Validate wallet status asynchronously - handles 404s for unfunded wallets
  const validateWalletStatus = useCallback(async (publicKey: string, walletId: string) => {
    // Prevent duplicate validations
    if (validationInProgress.has(walletId)) {
      console.log('[v0] Wallet validation already in progress:', walletId);
      return;
    }

    setValidationInProgress(prev => new Set(prev).add(walletId));

    try {
      const response = await fetch(`https://horizon.stellar.org/accounts/${publicKey}`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });

      if (response.status === 404) {
        // Wallet is unfunded/not activated on network
        setWallets(prev =>
          prev.map(w =>
            w.publicKey === publicKey
              ? {
                  ...w,
                  status: 'unfunded',
                  statusMessage: 'This wallet is not activated on the Stellar network yet. Send XLM to activate it.',
                  balances: [],
                  poolShares: [],
                }
              : w
          )
        );
        console.log('[v0] Wallet unfunded:', publicKey);
        return;
      }

      if (!response.ok) {
        // Other HTTP errors
        setWallets(prev =>
          prev.map(w =>
            w.publicKey === publicKey
              ? {
                  ...w,
                  status: 'error',
                  statusMessage: `Network error: ${response.statusText}`,
                }
              : w
          )
        );
        console.log('[v0] Wallet validation error:', response.statusText);
        return;
      }

      // Successfully loaded account - it's active
      const data = await response.json();
      const { assets, poolShares } = parseWalletBalances(data.balances || []);

      setWallets(prev =>
        prev.map(w =>
          w.publicKey === publicKey
            ? {
                ...w,
                status: 'active',
                statusMessage: undefined,
                balances: assets,
                poolShares: poolShares || [],
              }
            : w
        )
      );
      console.log('[v0] Wallet active:', publicKey);
    } catch (error) {
      // Network timeout or other errors - mark as error but don't crash
      setWallets(prev =>
        prev.map(w =>
          w.publicKey === publicKey
            ? {
                ...w,
                status: 'error',
                statusMessage: `Unable to load wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
              }
            : w
        )
      );
      console.log('[v0] Wallet validation error:', error);
    } finally {
      setValidationInProgress(prev => {
        const updated = new Set(prev);
        updated.delete(walletId);
        return updated;
      });
    }
  }, [validationInProgress]);

  // Compute active wallet - strictly use publicKey for identification
  const activeWallet = useMemo(() => {
    return wallets.find(w => w.publicKey === activeWalletId) || null;
  }, [wallets, activeWalletId]);

  // Persist activeWalletId and full wallet object to localStorage whenever it changes
  useEffect(() => {
    if (activeWalletId && activeWallet) {
      localStorage.setItem('stellar_activeWalletId', activeWalletId);
      // Also save the full wallet object for faster initial restoration
      localStorage.setItem('stellar_activeWallet', JSON.stringify(activeWallet));
      console.log('[v0] Saved activeWallet to localStorage:', activeWallet.name);
    }
  }, [activeWalletId, activeWallet]);
  useEffect(() => {
    const stored = localStorage.getItem('stellar_wallets');
    const storedActiveId = localStorage.getItem('stellar_activeWalletId');
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Clean up balances when loading from storage and initialize status
        const cleanedWallets = parsed.map((wallet: any) => {
          if (wallet.balances && Array.isArray(wallet.balances)) {
            const { assets, poolShares } = parseWalletBalances(wallet.balances);
            return {
              ...wallet,
              balances: assets,
              poolShares: poolShares || [],
              status: wallet.status || 'loading',
              statusMessage: wallet.statusMessage,
            };
          }
          return {
            ...wallet,
            poolShares: wallet.poolShares || [],
            status: wallet.status || 'loading',
            statusMessage: wallet.statusMessage,
          };
        });
        setWallets(cleanedWallets);
        
        // Restore activeWalletId from localStorage if it exists and is valid
        if (storedActiveId) {
          const walletExists = cleanedWallets.some(w => w.publicKey === storedActiveId);
          if (walletExists) {
            setActiveWalletId(storedActiveId);
            console.log('[v0] Restored activeWalletId from localStorage:', storedActiveId);
          } else {
            // Stored ID is invalid, use first wallet
            if (cleanedWallets.length > 0) {
              setActiveWalletId(cleanedWallets[0].publicKey);
            }
          }
        } else if (cleanedWallets.length > 0) {
          // No stored activeWalletId, use first wallet
          setActiveWalletId(cleanedWallets[0].publicKey);
        }
        
        // Validate status of all wallets asynchronously
        if (cleanedWallets.length > 0) {
          cleanedWallets.forEach(w => {
            validateWalletStatus(w.publicKey, w.id);
          });
        }
      } catch (error) {
        console.log('[v0] Error loading wallets from storage:', error);
      }
    }
  }, [validateWalletStatus]);

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
        status: 'loading',
        statusMessage: 'Validating wallet on network...',
      };

      setWallets(prev => [...prev, newWallet]);
      setActiveWalletId(publicKey);
      
      // Validate status asynchronously
      validateWalletStatus(publicKey, id);
    } catch (error) {
      throw error;
    }
  }, [validateWalletStatus]);

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
    // If removing active wallet, switch to first available
    if (activeWalletId === id) {
      setWallets(prev => {
        if (prev.length > 0) {
          setActiveWalletId(prev[0].publicKey);
        } else {
          setActiveWalletId(null);
        }
        return prev;
      });
    }
  }, [activeWalletId]);

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
    // Use a functional update to avoid stale closure issues
    setWallets(prev => {
      const wallet = prev.find(w => w.id === walletId || w.publicKey === walletId);
      if (!wallet) return prev;
      
      // Fetch balances asynchronously
      fetch(`https://horizon.stellar.org/accounts/${wallet.publicKey}`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          // Parse balances to separate regular assets from pool shares
          const { assets, poolShares } = parseWalletBalances(data.balances || []);
          setWallets(current =>
            current.map(w =>
              (w.id === walletId || w.publicKey === walletId) 
                ? {
                    ...w,
                    status: 'active',
                    balances: assets,
                    poolShares,
                  }
                : w
            )
          );
        })
        .catch(error => {
          // Account may not exist yet or network error - update status appropriately
          if (error.message.includes('404')) {
            setWallets(current =>
              current.map(w =>
                (w.id === walletId || w.publicKey === walletId)
                  ? {
                      ...w,
                      status: 'unfunded',
                      statusMessage: 'Wallet not funded on network',
                    }
                  : w
              )
            );
          }
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
        savePasswordSession,
        getPasswordSession,
        clearPasswordSession,
        passwordSessionType,
        setPasswordSessionType,
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
