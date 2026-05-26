'use client';

import { DollarSign, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/context';

/** API cost estimate display */
export default function CostEstimate({
  detectiveCount,
  mode,
}: {
  detectiveCount: number;
  mode: 'solo' | 'group';
}) {
  const { t } = useI18n();
  // Estimate cost (approx $0.01 per 1K tokens, varies by model)
  const baseCost = 0.05;
  const perDetectiveCost = 0.03;
  const synthesisCost = mode === 'group' ? 0.08 : 0;

  const estimatedCost = baseCost + detectiveCount * perDetectiveCost + synthesisCost;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card-alt)] border-[var(--card-border)]">
      <DollarSign size={16} className="text-[var(--gold)]/60" />
      <div className="flex-1">
        <p className="text-xs text-[var(--foreground)]/50">
          {t('cost.estimated')} <span className="text-[var(--gold)] font-medium">{estimatedCost.toFixed(2)}</span> {t('cost.currency')}
        </p>
        <p className="text-[11px] text-[var(--foreground)]/30">
          {t('cost.detectives', detectiveCount)} + {mode === 'group' ? t('cost.synthesis') : t('cost.solo')}
        </p>
      </div>
      <AlertCircle size={14} className="text-[var(--foreground)]/20 shrink-0" />
    </div>
  );
}
