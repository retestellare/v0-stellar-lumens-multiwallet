'use client';

import { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';
import { decryptSecret } from '@/lib/stellar-utils';
import { parseBulkWalletFile, generateBulkWalletFile, BulkWalletEntry } from '@/lib/bulk-wallet-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BulkWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'import' | 'export';

export function BulkWalletModal({ isOpen, onClose }: BulkWalletModalProps) {
  const { wallets, batchImportWallets, getPasswordSession } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [parseErrors, setParseErrors] = useState<{ line: number; error: string }[]>([]);
  const [parsedEntries, setParsedEntries] = useState<BulkWalletEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [exportError, setExportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setParseErrors([]);
    setParsedEntries([]);
    setImportError('');
    setImportSuccess('');

    try {
      const content = await file.text();
      const result = parseBulkWalletFile(content);

      if (result.errors.length > 0) {
        setParseErrors(result.errors);
      }

      setParsedEntries(result.valid);

      if (result.valid.length === 0 && result.errors.length === 0) {
        setImportError('File is empty or contains no valid entries');
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to read file');
    }
  };

  const handleImportWallets = async () => {
    if (!importPassword) {
      setImportError('Password is required');
      return;
    }

    if (parsedEntries.length === 0) {
      setImportError('No valid wallet entries to import');
      return;
    }

    try {
      setIsProcessing(true);
      setImportError('');
      const result = batchImportWallets(parsedEntries, importPassword);

      if (result.successful > 0) {
        setImportSuccess(`Successfully imported ${result.successful} wallet${result.successful !== 1 ? 's' : ''}`);
        if (result.failed > 0) {
          setImportSuccess(prev => `${prev}, but ${result.failed} failed`);
        }
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setImportError('Failed to import any wallets');
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import wallets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportWallets = async () => {
    if (wallets.length === 0) {
      setExportError('No wallets to export');
      return;
    }

    if (!exportPassword) {
      setExportError('Password is required to decrypt wallets');
      return;
    }

    try {
      setExportError('');
      const decryptedSecrets: Record<string, string> = {};

      // Decrypt all wallets with the provided password
      for (const wallet of wallets) {
        try {
          const decrypted = decryptSecret(wallet.encryptedSecret, exportPassword);
          decryptedSecrets[wallet.id] = decrypted;
        } catch (e) {
          setExportError(`Failed to decrypt wallet "${wallet.name}". Incorrect password?`);
          return;
        }
      }

      // Generate the export file
      const content = generateBulkWalletFile(wallets, decryptedSecrets);

      // Create and download the file
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
      element.setAttribute('download', `stellar-wallets-export-${new Date().toISOString().split('T')[0]}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setExportPassword('');
      setShowExportPassword(false);
      handleClose();
    } catch (err: any) {
      setExportError(err.message || 'Failed to export wallets');
    }
  };

  const handleClose = () => {
    setImportFile(null);
    setImportPassword('');
    setImportError('');
    setImportSuccess('');
    setParseErrors([]);
    setParsedEntries([]);
    setExportPassword('');
    setShowExportPassword(false);
    setExportError('');
    setActiveTab('import');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Bulk Wallet Management</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-6">
            <TabsTrigger value="import">Import Wallets</TabsTrigger>
            <TabsTrigger value="export">Export Wallets</TabsTrigger>
          </TabsList>

          <div className="px-6 pb-6">
            <TabsContent value="import" className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Format:</strong> private_key | public_key | account_name
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  One wallet per line. Keys must be valid Stellar keys.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="block w-full text-sm border border-input rounded-lg p-2 cursor-pointer"
                />
              </div>

              {parsedEntries.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                    <CheckCircle size={18} />
                    <span className="font-medium">{parsedEntries.length} valid entries found</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto text-sm">
                    {parsedEntries.map((entry, idx) => (
                      <div key={idx} className="text-green-700 dark:text-green-300 py-1">
                        • {entry.accountName} ({entry.publicKey.slice(0, 8)}...)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                    <AlertCircle size={18} />
                    <span className="font-medium">{parseErrors.length} parsing errors</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto text-sm space-y-1">
                    {parseErrors.map((err, idx) => (
                      <div key={idx} className="text-red-700 dark:text-red-300">
                        Line {err.line}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-200 text-sm">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-200 text-sm">
                  ✓ {importSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Password (to encrypt all wallets)</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  disabled={isProcessing}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportWallets}
                  disabled={parsedEntries.length === 0 || !importPassword || isProcessing}
                  className="flex-1"
                >
                  <Upload size={18} className="mr-2" />
                  {isProcessing ? 'Importing...' : 'Import Wallets'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              {wallets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No wallets to export</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} will be exported
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      All wallets will be decrypted and saved in the interstellar.exchange format.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {wallets.map((wallet) => (
                      <div key={wallet.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{wallet.name}</span>
                        <span className="text-xs text-muted-foreground">{wallet.publicKey.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </div>

                  {exportError && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-200 text-sm">
                      {exportError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Master Password (to decrypt all wallets)</label>
                    <div className="relative">
                      <Input
                        type={showExportPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowExportPassword(!showExportPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showExportPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleExportWallets}
                      disabled={!exportPassword || wallets.length === 0}
                      className="flex-1"
                    >
                      <Download size={18} className="mr-2" />
                      Export Wallets
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
