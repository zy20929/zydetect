'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare } from 'lucide-react';
import { useI18n } from '@/i18n/context';

interface FeedbackProps {
  reportId: string;
  onFeedback: (rating: number, comment: string) => void;
}

/** 推理报告反馈评分 */
export default function ReportFeedback({ reportId, onFeedback }: FeedbackProps) {
  const { t } = useI18n();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === null) return;
    onFeedback(rating, comment);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-800/30 bg-emerald-900/10 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <ThumbsUp size={16} />
          <span className="text-sm font-medium">{t('feedback.thankYou')}</span>
        </div>
        <p className="text-xs text-[var(--foreground)]/50 mt-1">
          {t('feedback.thankYouDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-4">
      <h4 className="text-sm font-medium text-[var(--foreground)]/70 mb-3 flex items-center gap-2">
        <Star size={14} className="text-[var(--gold)]" />
        {t('feedback.qualityFeedback')}
      </h4>

      {/* 星级评分 */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              size={20}
              className={`
                transition-colors
                ${rating !== null && star <= rating
                  ? 'text-[var(--gold)] fill-[var(--gold)]'
                  : 'text-[var(--foreground)]/20 hover:text-[var(--gold)]/50'}
              `}
            />
          </button>
        ))}
        {rating !== null && (
          <span className="ml-2 text-xs text-[var(--gold)]">
          <span className="ml-2 text-xs text-[var(--gold)]">
            {t(['feedback.poor', 'feedback.fair', 'feedback.average', 'feedback.good', 'feedback.excellent'][rating - 1])}
          </span>
          </span>
        )}
      </div>

      {/* 快速评价 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setRating(5); }}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${rating === 5
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
              : 'text-[var(--foreground)]/50 hover:text-emerald-400 hover:bg-emerald-900/20 border border-[var(--card-border)]'}
          `}
        >
          <ThumbsUp size={12} />
          {t('feedback.accurate')}
        </button>
        <button
          onClick={() => { setRating(1); }}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${rating === 1
              ? 'bg-red-900/50 text-red-400 border border-red-700/50'
              : 'text-[var(--foreground)]/50 hover:text-red-400 hover:bg-red-900/20 border border-[var(--card-border)]'}
          `}
        >
          <ThumbsDown size={12} />
          {t('feedback.incorrect')}
        </button>
      </div>

      {/* 评论输入 */}
      <div className="space-y-2">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('feedback.placeholder')}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-[var(--foreground)]/25 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={rating === null}
          className={`
            flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-all
            ${rating !== null
              ? 'bg-[var(--gold)] text-[var(--card-alt)] hover:bg-[var(--gold-dim)]'
              : 'bg-[var(--card-border)] text-[var(--foreground)]/30 cursor-not-allowed'}
          `}
        >
          <MessageSquare size={12} />
          {t('feedback.submit')}
        </button>
      </div>
    </div>
  );
}
