'use client';

import { useState, useEffect } from 'react';
import { Star, Maximize2, Minimize2 } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function ViewControls() {
  const { t } = useI18n();
  const [starfieldEnabled, setStarfieldEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    try {
      const sf = localStorage.getItem('starfield-enabled');
      if (sf !== null) setStarfieldEnabled(sf === 'true');
    } catch {}
  }, []);

  const toggleStarfield = () => {
    const next = !starfieldEnabled;
    setStarfieldEnabled(next);
    try { localStorage.setItem('starfield-enabled', String(next)); } catch {}
  };

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
        onClick={toggleStarfield}
        className={`p-1.5 rounded-lg transition-colors ${
          starfieldEnabled ? 'text-[var(--gold)] bg-[var(--card-bg)]' : 'text-[var(--foreground)]/30 hover:text-[var(--foreground)]/50'
        }`}
        title={starfieldEnabled ? t('viewControls.starfieldOn') : t('viewControls.starfieldOff')}
      >
        <Star size={14} />
      </button>

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
