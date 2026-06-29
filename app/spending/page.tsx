import { RealWorldSpending } from '@/components/real-world-spending';

export const metadata = {
  title: 'Real-World Spending - Stellar Lumens Multiwallet',
  description: 'Use your XLM everywhere with our DeFi Protocol. No KYC required under €150.',
};

export default function SpendingPage() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <RealWorldSpending />
      </div>
    </main>
  );
}
