'use client';

import { useAnalysisStore } from '@/store/analysis-store';
import { PERSONA_MAP } from '@/lib/constants';
import { useI18n } from '@/i18n/context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const { history, loadFromHistory, deleteFromHistory } = useAnalysisStore();
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <FileText className="mx-auto h-12 w-12 text-[var(--foreground)]/30" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--foreground)]/60">{t('history.empty')}</h2>
        <p className="mt-2 text-[var(--foreground)]/40">{t('history.emptyHint')}</p>
      </div>
    );
  }

  if (viewingIndex !== null && history[viewingIndex]) {
    const item = history[viewingIndex];
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setViewingIndex(null)}
          className="mb-4 text-sm text-[var(--gold)] hover:text-[var(--gold-dim)]"
        >
          {t('history.back')}
        </button>
        <div className="rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
          <div className="p-4 bg-[var(--card-bg)] border-b-[var(--card-border)] bg-[var(--card-bg)]">
            <h2 className="font-bold text-[var(--gold)]">
              {item.personas.map((p) => PERSONA_MAP[p]?.nameZh).join(' & ')} {t('history.reportTemplate', item.personas.map((p) => PERSONA_MAP[p]?.nameZh).join(' & '))}
            </h2>
            <p className="text-xs text-[var(--foreground)]/40 mt-1">
              {new Date(item.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
            </p>
          </div>
          <div className="p-6 prose prose-sm max-w-none prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.report}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-[var(--gold)] mb-6">{t('history.title')}</h2>
      <div className="space-y-4">
        {history.map((item, index) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors bg-[var(--card-bg)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-[var(--foreground)]">
                  {item.personas.map((p) => PERSONA_MAP[p]?.nameZh).join(' & ')}
                </h3>
                <p className="text-sm text-[var(--foreground)]/40 mt-1">
                  {new Date(item.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingIndex(index)}
                  className="p-2 text-[var(--foreground)]/50 hover:text-[var(--gold)] rounded-lg hover:bg-[var(--card-alt)]"
                  title={t('history.view')}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => deleteFromHistory(index)}
                  className="p-2 text-[var(--foreground)]/30 hover:text-red-400 rounded-lg hover:bg-red-950/30"
                  title={t('history.delete')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
