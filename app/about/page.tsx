'use client';

import React from 'react';
import { ArrowLeft, Shield, Rocket, Code, Mail, Globe, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function BulletItem({ label, description }: { label: string; description: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">{label}:</span> {description}
      </p>
    </li>
  );
}

export default function AboutPage() {
  const contacts = [
    { icon: Globe, label: 'Official Website', href: 'https://orion-multiwallet.xyz/', detail: 'orion-multiwallet.xyz' },
    { icon: Mail, label: 'Customer Support', href: 'mailto:support.stellarforge@proton.me', detail: 'support.stellarforge@proton.me' },
    { icon: Twitter, label: 'X (Twitter)', href: 'https://twitter.com/stellarforg', detail: '@stellarforg' },
    { icon: MessageCircle, label: 'Telegram', href: 'https://t.me/Forgestellartokenfactory', detail: 'Forgestellartokenfactory' },
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-semibold">About</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Hero */}
        <div className="text-center space-y-3 pb-2">
          <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-balance">Stellar Lumens Multiwallet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-balance max-w-sm mx-auto">
            Your secure, non-custodial gateway to the Stellar ecosystem.
          </p>
        </div>

        {/* Mission */}
        <SectionCard icon={Rocket} title="Our Mission">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our goal is to make global finance accessible to everyone. We chose the Stellar blockchain to offer near-instant transactions, costs under a cent, and barrier-free digital asset exchange worldwide.
          </p>
        </SectionCard>

        {/* Security */}
        <SectionCard icon={Shield} title="Security and Control">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            We believe in true decentralization. Our wallet is fully non-custodial:
          </p>
          <ul className="space-y-2.5 mb-4">
            <BulletItem label="Total Control" description="You are the sole owner of your private keys and recovery phrase." />
            <BulletItem label="Zero Tracking" description="We never save or store your passwords or funds on our servers." />
            <BulletItem label="Local Security" description="All sensitive data is encrypted directly on your device." />
          </ul>
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25">
            <p className="text-xs text-destructive font-medium leading-relaxed">
              Our team will never ask for your private key or recovery phrase. Never share them with anyone.
            </p>
          </div>
        </SectionCard>

        {/* Features */}
        <SectionCard icon={Rocket} title="Key Features">
          <ul className="space-y-2.5">
            <BulletItem label="Multi-Asset" description="Manage XLM and all approved tokens on the Stellar network." />
            <BulletItem label="Integrated DEX" description="Exchange tokens directly using Stellar's native Decentralized Exchange." />
            <BulletItem label="Low Costs" description="Send payments worldwide for fractions of a cent." />
            <BulletItem label="Real-World Spending" description="Convert XLM to gift cards and virtual cards via Bitrefill." />
          </ul>
        </SectionCard>

        {/* Technical */}
        <SectionCard icon={Code} title="Technical Transparency">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Built on community trust using official Stellar protocols for maximum compatibility and security.
          </p>
          <a
            href="https://github.com/retestellare/v0-stellar-lumens-multiwallet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Code className="w-4 h-4" />
            View Source Code on GitHub
          </a>
        </SectionCard>

        {/* Contacts */}
        <SectionCard icon={Mail} title="Official Contacts">
          <p className="text-xs text-muted-foreground mb-3">
            Avoid scams. Use only our verified links for support or updates:
          </p>
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <c.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </SectionCard>

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground">
          <p>stellarforge by sages &middot; Revolution 2026</p>
        </footer>
      </div>
    </main>
  );
}
