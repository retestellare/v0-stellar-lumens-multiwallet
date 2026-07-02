'use client';

import React from 'react';
import { useWallet } from '@/lib/wallet-context';
import { ArrowLeft } from 'lucide-react';

interface PasswordSessionScreenProps {
  onBack?: () => void;
}

export const PasswordSessionScreen: React.FC<PasswordSessionScreenProps> = ({ onBack }) => {
  const { passwordSessionType, setPasswordSessionType } = useWallet();

  const options = [
    { value: 'everytime' as const, label: 'Everytime' },
    { value: 'after_hour' as const, label: 'After an hour' },
    { value: 'never' as const, label: 'Never' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-700/50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-lg font-semibold text-slate-200">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8">
        <h2 className="text-xl text-slate-400 mb-8">Require session password</h2>

        {/* Radio Options */}
        <div className="space-y-6">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setPasswordSessionType(option.value)}
              className="flex items-center gap-4 w-full p-4 rounded-lg hover:bg-slate-700/30 transition-colors active:bg-slate-700/50"
            >
              {/* Radio Circle */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all ${
                  passwordSessionType === option.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-500 bg-transparent'
                }`}
              />
              {/* Label */}
              <span
                className={`text-lg font-medium transition-colors ${
                  passwordSessionType === option.value
                    ? 'text-slate-100'
                    : 'text-slate-400'
                }`}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Description */}
        <div className="mt-12 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
          <p className="text-sm text-slate-400">
            {passwordSessionType === 'everytime' &&
              'Password will be required every time you need to access your wallet.'}
            {passwordSessionType === 'after_hour' &&
              'Password will be cached for 60 minutes. After that, you will be asked to enter it again.'}
            {passwordSessionType === 'never' &&
              'Password will remain cached in memory for the entire session. Be careful with this option.'}
          </p>
        </div>
      </div>
    </div>
  );
};
