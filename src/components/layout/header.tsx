'use client';

import { Search, History, Database, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/i18n/context';
import LanguageSwitcher from '@/components/ui/language-switcher';
import ViewControls from './view-controls';
import { useEffect, useState } from 'react';

/** 鉴微侦探 LOGO — 放大镜 + 指纹纹理 */
function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 放大镜外圈 */}
      <circle cx="11" cy="11" r="8" stroke="var(--gold)" strokeWidth="2.5" fill="none" />
      {/* 放大镜手柄 */}
      <line x1="16.5" y1="16.5" x2="24" y2="24" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
      {/* 内部指纹纹理 — 三层弧线 */}
      <path d="M7 11 C7 8, 9 6, 11 6" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M5 11 C5 7, 8 4, 11 4" stroke="var(--gold)" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2" fill="var(--gold)" opacity="0.8" />
    </svg>
  );
}

export default function Header() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  if (!isClient) return null;

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <LogoIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)] tracking-wide">鉴微侦探</h1>
            <p className="text-xs text-[var(--gold-dim)]">Examine & Deduce</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm text-[var(--foreground)]/70 hover:text-[var(--gold)] transition-colors flex items-center gap-1"
            >
              <Search size={14} />
              {t('nav.home')}
            </Link>
            <Link
              href="/history"
              className="text-sm text-[var(--foreground)]/70 hover:text-[var(--gold)] transition-colors flex items-center gap-1"
            >
              <History size={14} />
              {t('nav.history')}
            </Link>
            <Link
              href="/knowledge"
              className="text-sm text-[var(--foreground)]/70 hover:text-[var(--gold)] transition-colors flex items-center gap-1"
            >
              <Database size={14} />
              {t('nav.knowledge')}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ViewControls />
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--foreground)]/60 hover:text-[var(--gold)] hover:bg-[var(--card-alt)] transition-all"
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
