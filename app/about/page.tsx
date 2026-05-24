'use client';

import { ArrowLeft, Shield, Rocket, Code, Mail, Globe, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">About</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-cyan-400 rounded-2xl flex items-center justify-center">
            <Globe className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold">Stellar Lumens Multiwallet</h2>
          <p className="text-muted-foreground">
            Welcome to Orion-Multiwallet, your secure and fast gateway to the Stellar ecosystem.
          </p>
        </div>

        {/* Our Mission */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Our Mission</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Our goal is to make global finance accessible to everyone. We chose the Stellar blockchain to offer you near-instant transactions, commission costs of less than a cent, and the ability to exchange digital assets worldwide without barriers.
          </p>
        </section>

        {/* Security and Control */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Security and Control</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Your privacy first</p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We believe in true decentralization. That&apos;s why our wallet is non-custodial:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Total Control:</span>
                <span className="text-muted-foreground"> You are the sole owner of your private keys and recovery phrase.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Zero Tracking:</span>
                <span className="text-muted-foreground"> We never save or store your passwords or funds on our servers.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Local Security:</span>
                <span className="text-muted-foreground"> All sensitive data is encrypted directly on your device.</span>
              </div>
            </li>
          </ul>
          
          {/* Security Warning */}
          <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive font-medium">
              Important Security Notice: Our team will never ask you for your private key (Secret Key) or recovery phrase. Never share them with anyone.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Key Features</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Multi-Asset:</span>
                <span className="text-muted-foreground"> Manage XLM and all approved tokens (Assets) on the Stellar network.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Integrated DEX:</span>
                <span className="text-muted-foreground"> Exchange your tokens directly from your wallet using Stellar&apos;s native Decentralized Exchange.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Low Costs:</span>
                <span className="text-muted-foreground"> Send payments worldwide for fractions of a cent in transactions.</span>
              </div>
            </li>
          </ul>
        </section>

        {/* Technical Transparency */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Technical Transparency</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We are a project built on community trust:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Open Code:</span>
                <span className="text-muted-foreground"> Our code is transparent and verifiable by anyone.</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">•</span>
              <div>
                <span className="font-medium text-foreground">Stellar Standard:</span>
                <span className="text-muted-foreground"> We use official Stellar protocols to ensure maximum compatibility and security.</span>
              </div>
            </li>
          </ul>
          <a 
            href="https://github.com/retestellare/v0-stellar-lumens-multiwallet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
          >
            <Code className="w-4 h-4" />
            View Source Code on GitHub
          </a>
        </section>

        {/* Official Contacts */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Official Contacts and Channels</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Avoid scams. Use only our verified links to receive support or read updates:
          </p>
          <div className="space-y-3">
            <a 
              href="https://orion-multiwallet.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Official Website</p>
                <p className="text-sm text-muted-foreground">orion-multiwallet.xyz</p>
              </div>
            </a>
            <a 
              href="mailto:support.stellarforge@proton.me"
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Customer Support</p>
                <p className="text-sm text-muted-foreground">support.stellarforge@proton.me</p>
              </div>
            </a>
            <a 
              href="https://twitter.com/stellarforg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              <Twitter className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">X Community (Twitter)</p>
                <p className="text-sm text-muted-foreground">@stellarforg</p>
              </div>
            </a>
            <a 
              href="https://t.me/Forgestellartokenfactory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Telegram Channel</p>
                <p className="text-sm text-muted-foreground">Forgestellartokenfactory</p>
              </div>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 text-sm text-muted-foreground">
          <p>stellarforge by sages</p>
          <p>Revolution 2026 - All rights reserved</p>
        </footer>
      </div>
    </main>
  );
}
