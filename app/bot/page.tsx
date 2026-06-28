'use client';

import { useState, useEffect } from 'react';
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
    
    // Check localStorage for trial status
    const botTrialStart = localStorage.getItem('bot_trial_start');
    const botUnlocked = localStorage.getItem('bot_unlocked');

    // If already unlocked, show iframe
    if (botUnlocked === 'true') {
      setIsUnlocked(true);
      return;
    }

    // First time visiting
    if (!botTrialStart) {
      localStorage.setItem('bot_trial_start', Date.now().toString());
      setIsTrialValid(true);
      return;
    }

    // Check if 7 days have passed
    const trialStartTime = parseInt(botTrialStart, 10);
    const currentTime = Date.now();
    const timeElapsed = currentTime - trialStartTime;

    if (timeElapsed < TRIAL_DURATION_MS) {
      setIsTrialValid(true);
    } else {
      setIsTrialValid(false);
    }
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  };

  // Show loading state until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
      </div>
    );
  }

  const showPaywall = !isTrialValid && !isUnlocked;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex flex-col w-full flex-1">
        {/* Back Button */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border/50 flex-shrink-0">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Trading Console - Full Height Scrollable iframe */}
        <div className="w-full overflow-y-auto relative">
          {showPaywall && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center min-h-[calc(100vh-140px)]">
              <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center">
                {/* Lock Icon */}
                <div className="mb-6 p-4 rounded-full bg-primary/20 border border-primary/40">
                  <Lock className="w-8 h-8 text-primary" />
                </div>

                {/* Heading */}
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Trial Period Expired
                </h2>

                {/* Description */}
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Your 7-day trial period for the Trading Bot has ended. To continue using this feature, please contact the administrator and obtain an activation bypass key.
                </p>

                {/* Password Input Section */}
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
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your activation key"
                    className="w-full px-4 py-3 rounded-lg bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {showPasswordError && (
                    <p className="text-red-500 text-sm font-medium">
                      Invalid activation key. Please try again.
                    </p>
                  )}
                </div>

                {/* Unlock Button */}
                <Button
                  onClick={handlePasswordSubmit}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-all mb-4"
                >
                  Unlock Access
                </Button>

                {/* Contact Info */}
                <p className="text-xs text-muted-foreground/70">
                  Don't have an activation key? Contact support for assistance.
                </p>
              </div>
            </div>
          )}

          <iframe
            src="https://lumenspread-bot-ok.base44.app"
            title="Trading Console"
            className="w-full border-0"
            style={{ 
              display: 'block',
              minHeight: 'calc(100vh - 140px)',
              height: 'auto',
              opacity: showPaywall ? 0.3 : 1,
              pointerEvents: showPaywall ? 'none' : 'auto'
            }}
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; magnetometer; microphone; payment; usb"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          />
        </div>
      </main>
    </div>
  );
}
