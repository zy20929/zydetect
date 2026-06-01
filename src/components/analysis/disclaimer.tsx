'use client';

import { Shield, AlertTriangle, Info } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { zh, en } from '@/i18n/translations';

const DISCLAIMER_ITEMS: Record<string, readonly string[]> = { zh: zh.disclaimer.items, en: en.disclaimer.items };

/** Disclaimer at the bottom of analysis reports */
export default function AnalysisDisclaimer() {
  const { locale, t } = useI18n();
  const items = DISCLAIMER_ITEMS[locale] || DISCLAIMER_ITEMS.zh;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-4">
      <div className="flex gap-3 items-start">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--foreground)]/70">{t('disclaimer.title')}</h4>
          <ul className="text-xs text-[var(--foreground)]/40 space-y-1 list-disc list-inside">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Confidence badge for reasoning steps */
export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const { t } = useI18n();
  const config = {
    high: { label: t('knowledge.confidenceHigh'), color: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    medium: { label: t('knowledge.confidenceMedium'), color: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
    low: { label: t('knowledge.confidenceLow'), color: 'bg-red-900/50 text-red-400 border-red-700/50' },
  };

  const { label, color } = config[confidence];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${color}`}>
      <Info size={10} />
      {label}
    </span>
  );
}
