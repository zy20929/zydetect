'use client';

import { useI18n } from '@/i18n/context';
import { Globe, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { locale, setLocale, locales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLocale = locales.find((l) => l.code === locale);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[var(--foreground)]/70 hover:text-[var(--gold)] hover:bg-[var(--card-alt)] transition-colors"
        aria-label="切换语言"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{currentLocale?.flag} {currentLocale?.label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg overflow-hidden z-50">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                l.code === locale
                  ? 'bg-[var(--card-alt)] font-medium text-[var(--gold)]'
                  : 'text-[var(--foreground)]/60 hover:bg-[var(--card-alt)]'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === locale && (
                <span className="ml-auto text-[var(--gold)]/50">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
