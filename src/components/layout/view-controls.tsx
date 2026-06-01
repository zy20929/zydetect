'use client';

import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function ViewControls() {
  const { t } = useI18n();
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleFullscreen}
        className="p-1.5 rounded-lg text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60 hover:bg-[var(--card-bg)] transition-colors"
        title={fullscreen ? t('viewControls.fullscreenOn') : t('viewControls.fullscreenOff')}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
}
