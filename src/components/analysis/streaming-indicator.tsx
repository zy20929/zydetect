'use client';

import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';

/** Streaming loading animation — detective is thinking */
export default function StreamingIndicator({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 p-4 text-gray-500">
      <div className="flex gap-1">
        <div className="thinking-dot" />
        <div className="thinking-dot" />
        <div className="thinking-dot" />
      </div>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm italic">{message || t('chat.thinking')}</span>
    </div>
  );
}
