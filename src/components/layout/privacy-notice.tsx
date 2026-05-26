'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, Database, Clock, X, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function PrivacyNotice() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setHasAcknowledged(localStorage.getItem('privacy_acknowledged') === 'true');
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('privacy_acknowledged', 'true');
    setHasAcknowledged(true);
    setIsOpen(false);
  };

  if (!isClient) return null;

  if (hasAcknowledged && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-[var(--foreground)]/30 hover:text-[var(--gold)] transition-colors"
      >
        <Shield size={12} />
        {t('privacy.title')}
      </button>
    );
  }

  return (
    <>
      {/* Bottom privacy bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)] border-t-[var(--card-border)] p-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-[var(--foreground)]/60">
            <Shield size={14} className="text-[var(--gold)] shrink-0" />
            <span className="hidden sm:inline">
              {t('privacy.banner')}
            </span>
            <span className="sm:hidden">{t('privacy.bannerShort')}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsOpen(true)}
              className="text-xs text-[var(--gold)] hover:underline"
            >
              {t('privacy.learnMore')}
            </button>
            <button
              onClick={handleAcknowledge}
              className="px-3 py-1 text-xs bg-[var(--gold)] text-[var(--card-alt)] rounded-md hover:bg-[var(--gold-dim)] transition-colors"
            >
              {t('privacy.gotIt')}
            </button>
          </div>
        </div>
      </div>

      {/* Privacy modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsOpen(false)}>
          <div
            className="bg-[var(--card-bg)] border-[var(--card-border)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b-[var(--card-border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--gold)] flex items-center gap-2">
                <Shield size={18} />
                {t('privacy.title')}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-[var(--foreground)]/40 hover:text-[var(--foreground)]">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 text-sm text-[var(--foreground)]/70">
              <div className="flex gap-3">
                <Eye size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">{t('privacy.imageProcessing')}</h4>
                  <p className="text-xs text-[var(--foreground)]/50">
                    {t('privacy.imageProcessingDesc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Database size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">{t('privacy.dataStorage')}</h4>
                  <p className="text-xs text-[var(--foreground)]/50">
                    {t('privacy.dataStorageDesc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">{t('privacy.dataRetention')}</h4>
                  <p className="text-xs text-[var(--foreground)]/50">
                    {t('privacy.dataRetentionDesc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">{t('privacy.disclaimer')}</h4>
                  <p className="text-xs text-[var(--foreground)]/50">
                    {t('privacy.disclaimerDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t-[var(--card-border)]">
              <button
                onClick={handleAcknowledge}
                className="w-full py-2 bg-[var(--gold)] text-[var(--card-alt)] rounded-lg font-medium text-sm hover:bg-[var(--gold-dim)] transition-colors"
              >
                {t('privacy.agree')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
