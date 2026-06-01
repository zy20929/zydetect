'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Locale } from '@/lib/types';
import { zh, en } from './translations';

/** 宽松翻译类型 — 允许不同语言的不同字符串 */
type TranslationObj = Record<string, string | ((...args: unknown[]) => string) | Record<string, unknown>>;

const translations: Record<Locale, TranslationObj> = { zh, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, ...args: unknown[]) => string;
  locales: { code: Locale; label: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

/** 支持的语言列表 */
const LOCALES = [
  { code: 'zh' as Locale, label: '中文', flag: '🇨🇳' },
  { code: 'en' as Locale, label: 'English', flag: '🇬🇧' },
];

/**
 * 点号分隔的键路径解析为嵌套对象取值
 * 例如: 'home.title' → translations.zh.home.title
 */
function getValueByKey(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return current;
}

/** 从 localStorage 获取保存的语言，默认中文 */
function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem('locale');
  if (saved && ['zh', 'en'].includes(saved)) return saved as Locale;
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');
  const [isClient, setIsClient] = useState(false);

  // 客户端挂载后从 localStorage 读取语言偏好
  useEffect(() => {
    setIsClient(true);
    const saved = getSavedLocale();
    setLocaleState(saved);
    document.documentElement.lang = saved;
    document.cookie = `locale=${saved}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const setLocale = useCallback((locale: Locale) => {
    setLocaleState(locale);
    document.documentElement.lang = locale;
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
      document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  const t = useCallback(
    (key: string, ...args: unknown[]): string => {
      const value = getValueByKey(translations[locale], key);
      if (typeof value === 'function') {
        return value(...args);
      }
      return typeof value === 'string' ? value : key;
    },
    [locale],
  );

  // SSR 时返回默认中文，客户端挂载后再显示实际语言
  if (!isClient) {
    return (
      <I18nContext.Provider value={{ locale: 'zh', setLocale, t, locales: LOCALES }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
