'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GridStrategyFormProps {
  orderSize: string;
  minOrderSize: string;
  gridStep: string;
  isDryRun: boolean;
  isRunning: boolean;
  status: string;
  onOrderSizeChange: (value: string) => void;
  onMinOrderSizeChange: (value: string) => void;
  onGridStepChange: (value: string) => void;
  onDryRunChange: (value: boolean) => void;
}

export default function GridStrategyForm({
  orderSize,
  minOrderSize,
  gridStep,
  isDryRun,
  isRunning,
  status,
  onOrderSizeChange,
  onMinOrderSizeChange,
  onGridStepChange,
  onDryRunChange,
}: GridStrategyFormProps) {
  return (
    <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-4">
      {/* Strategy Header */}
      <div>
        <h3 className="font-bold flex items-center gap-2 text-primary">
          <Zap className="w-4 h-4" />
          Spread Market Maker Strategy
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Places buy orders just above the best bid and sell orders just below the best ask. Updates every 5-10 seconds to capture spreads on Mainnet.
        </p>
      </div>

      {/* Input: Order Size */}
      <div className="space-y-1">
        <Label className="text-xs">Order Size per Level (XLM)</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={orderSize}
          onChange={(e) => onOrderSizeChange(e.target.value)}
          disabled={isRunning}
          className="h-8 text-xs"
        />
      </div>

      {/* Input: Minimum Order Size Threshold */}
      <div className="space-y-1">
        <Label className="text-xs">Minimum Order Size to Place (XLM)</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={minOrderSize}
          onChange={(e) => onMinOrderSizeChange(e.target.value)}
          placeholder="e.g. 10"
          disabled={isRunning}
          className="h-8 text-xs text-primary font-medium focus:border-primary"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Dynamic orders falling below this threshold will be skipped to avoid micro-fills.
        </p>
      </div>

      {/* Input: Grid Step */}
      <div className="space-y-1">
        <Label className="text-xs">Grid Step (%)</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={gridStep}
          onChange={(e) => onGridStepChange(e.target.value)}
          disabled={isRunning}
          className="h-8 text-xs"
        />
      </div>

      {/* Checkbox: Dry Run */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={isDryRun}
          onChange={(e) => onDryRunChange(e.target.checked)}
          disabled={isRunning}
          className="w-4 h-4"
        />
        <span>Dry-Run Mode (simulate grid without trading)</span>
      </label>

      {/* Bot Status Indicator */}
      <div className="border border-primary/20 rounded p-3 bg-background flex items-center gap-2 text-xs font-semibold">
        <span>Status:</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'STOPPED' ? 'bg-muted-foreground' : 'bg-green-500'}`}></span>
          {status}
        </span>
      </div>
    </div>
  );
}
