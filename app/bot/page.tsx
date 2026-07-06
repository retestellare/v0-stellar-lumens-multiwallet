'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';

const SECRET_PASSWORD = 'stellarbotrevolution369';
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function BotPage() {
  const [isTrialValid, setIsTrialValid] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const botUnlocked = localStorage.getItem('bot_unlocked');
    if (botUnlocked === 'true') {
      setIsUnlocked(true);
      return;
    }

    const botTrialStart = localStorage.getItem('bot_trial_start');
    if (!botTrialStart) {
      localStorage.setItem('bot_trial_start', Date.now().toString());
      setIsTrialValid(true);
      return;
    }

    const elapsed = Date.now() - parseInt(botTrialStart, 10);
    setIsTrialValid(elapsed < TRIAL_DURATION_MS);
  }, []);

  const handlePasswordSubmit = () => {
    if (passwordInput === SECRET_PASSWORD) {
      localStorage.setItem('bot_unlocked', 'true');
      setIsUnlocked(true);
      setShowPasswordError(false);
      setPasswordInput('');
    } else {
      setShowPasswordError(true);
      setPasswordInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handlePasswordSubmit();
  };

  if (!mounted) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        <Header />
      </div>
    );
  }

  const showPaywall = !isTrialValid && !isUnlocked;

  return (
    /*
     * This page only renders the Header + Back button.
     * The actual iframe is mounted persistently in the root layout via
     * <PersistentBotFrame> so it survives navigation and never resets.
     * We set a transparent background so the persistent iframe behind
     * this page is fully visible.
     */
    <div
      className="min-h-dvh flex flex-col text-foreground"
      style={{ background: 'transparent' }}
    >
      {/* Header sits on top of the iframe */}
      <Header />

      {/* Back button bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/50 flex-shrink-0 bg-background/80 backdrop-blur-sm">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Paywall overlay — only shown when trial expired and not unlocked */}
      {showPaywall && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center">
            <div className="mb-6 p-4 rounded-full bg-primary/20 border border-primary/40">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Trial Period Expired
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your 7-day trial has ended. Contact the administrator for an activation key.
            </p>
            <div className="w-full space-y-3 mb-6">
              <label className="text-sm font-medium text-muted-foreground block">
                Activation Key
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setShowPasswordError(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter your activation key"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {showPasswordError && (
                <p className="text-red-500 text-sm font-medium">
                  Invalid activation key. Please try again.
                </p>
              )}
            </div>
            <Button
              onClick={handlePasswordSubmit}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-all mb-4"
            >
              Unlock Access
            </Button>
            <p className="text-xs text-muted-foreground/70">
              Contact support if you don&apos;t have an activation key.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
