'use client';

import { DetectiveId } from '@/lib/types';
import { DETECTIVE_PERSONAS } from '@/lib/constants';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { Check, Users, User, Search } from 'lucide-react';
import { useState } from 'react';

/** 侦探分类 */
const CATEGORIES = [
  { key: 'all', labelKey: 'categories.all' },
  { key: 'classic', labelKey: 'categories.classic' },
  { key: 'chinese', labelKey: 'categories.chinese' },
  { key: 'chinese-modern', labelKey: 'categories.chineseModern' },
  { key: 'ancient', labelKey: 'categories.ancient' },
  { key: 'medieval', labelKey: 'categories.medieval' },
  { key: 'c18', labelKey: 'categories.c18' },
  { key: 'c19europe', labelKey: 'categories.c19europe' },
  { key: 'c19america', labelKey: 'categories.c19america' },
  { key: 'c20', labelKey: 'categories.c20' },
  { key: 'c21', labelKey: 'categories.c21' },
  { key: 'emerging', labelKey: 'categories.emerging' },
];

const CATEGORY_MAP: Record<string, string[]> = {
  classic: ['holmes', 'conan'],
  chinese: ['digong', 'baozheng', 'songci', 'hairui', 'kuangzhong', 'shishilun', 'gaoyao', 'zhaoguanghan', 'huangba', 'kouzhun', 'yuchenglong', 'xuyougong'],
  'chinese-modern': ['wuguoqing', 'cuidaozhi', 'chenshixian', 'gaotangdou', 'zhangxin', 'mayulin', 'dongyanzhen', 'linyuhui', 'liuyao', 'congbin', 'jiazhiwen', 'zhangjizong', 'liuliang', 'lvdenzhong', 'xulimin', 'jizongtang', 'chengrui', 'wangqingju', 'mengxiaoping', 'liushuquan', 'qianghui', 'linqing', 'koujianping', 'yuxinmin', 'yanzizhong', 'baishaokang', 'wangguiqiang', 'minjianxiong', 'liujianjun', 'banmaosen', 'wangshiqing', 'zhangshaoqing', 'wangyanji', 'zhouyunbiao', 'chenlin', 'gaozhanguo', 'wanlihua', 'zhangyufen', 'weihua'],
  ancient: ['cicero', 'antiphon', 'chanakya', 'qehsu'],
  medieval: ['lareynie', 'desgrez'],
  c18: ['hfielding', 'jfielding'],
  c19europe: ['vidocq', 'bertillon', 'abberline', 'gross', 'locard', 'bell', 'galton', 'caminada', 'wensley', 'clarke', 'pollaky', 'featherstone'],
  c19america: ['pinkerton', 'warne', 'einstein', 'petrosino', 'burns', 'flynn', 'chaplain', 'goodwin', 'clement', 'west', 'mallory', 'webster', 'schindler', 'oconnell_j', 'oconnell_d', 'johnkai'],
  c20: ['spilsbury', 'henrylee', 'ness', 'jeffreys', 'glessnerlee', 'toschi', 'kenda', 'pistone', 'murphy', 'pena', 'serpico', 'hiratsuka', 'koshko', 'tofte', 'fabian', 'wickstead', 'murray', 'tallman', 'christie', 'onraet'],
  c21: ['reichs', 'kayser', 'thali', 'byard', 'ubelaker', 'aschheim', 'acharya', 'douglas', 'rossmo', 'burgess', 'holes', 'delisi', 'raine', 'kwonilyong', 'leejinsuk', 'sherman', 'oconnell_m', 'leblanc', 'sella', 'khan', 'blumenthal', 'weisburd', 'bull', 'hagan', 'pollanen', 'eckert', 'kroll', 'joseph', 'abbakyari', 'rashidalghafri', 'hadialghafli', 'ramanujghosh'],
  emerging: ['mcnamara', 'jensen', 'davies', 'leopold'],
};

export default function PersonaSelector() {
  const { selectedPersonas, mode, setPersonas, setMode } = useAnalysisStore();
  const { t, locale } = useI18n();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const togglePersona = (id: DetectiveId) => {
    if (selectedPersonas.includes(id)) {
      setPersonas(selectedPersonas.filter((p) => p !== id));
    } else {
      // 单人模式下只能选择一位侦探
      if (mode === 'solo') {
        setPersonas([id]);
      } else {
        setPersonas([...selectedPersonas, id]);
      }
    }
  };

  // 过滤侦探列表
  let filtered = DETECTIVE_PERSONAS;
  if (activeCategory !== 'all') {
    const ids = CATEGORY_MAP[activeCategory] || [];
    filtered = filtered.filter((p) => ids.includes(p.id));
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.includes(q),
    );
  }

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('solo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors detective-card ${
            mode === 'solo'
              ? 'bg-[var(--gold)] text-[var(--card-alt)]'
              : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] border border-[var(--card-border)]'
          }`}
        >
          <User size={16} />
          {t('home.solo')}
        </button>
        <button
          onClick={() => setMode('group')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors detective-card ${
            mode === 'group'
              ? 'bg-[var(--gold)] text-[var(--card-alt)]'
              : 'bg-[var(--card-bg)] text-[var(--foreground)]/60 hover:text-[var(--foreground)] border border-[var(--card-border)]'
          }`}
        >
          <Users size={16} />
          {t('home.group')}
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" size={18} />
        <input
          type="text"
          placeholder={t('home.searchDetectives')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 placeholder:text-[var(--foreground)]/30"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors detective-card ${
              activeCategory === cat.key
                ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                : 'bg-[var(--card-bg)] text-[var(--foreground)]/50 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
            }`}
          >
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      {/* 侦探卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map((persona) => {
          const isSelected = selectedPersonas.includes(persona.id);
          return (
            <button
              key={persona.id}
              onClick={() => togglePersona(persona.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all detective-card
                ${isSelected
                  ? `${persona.borderColor} ${persona.bgColor} shadow-md`
                  : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/50'}
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check size={18} className={persona.accentColor} />
                </div>
              )}
              <h3 className={`font-bold ${isSelected ? persona.accentColor : 'text-[var(--foreground)]'}`}>{persona.nameZh}</h3>
              <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-500' : 'text-[var(--foreground)]/40'}`}>{persona.title}</p>
              <p className={`text-sm mt-2 ${isSelected ? 'text-gray-600' : 'text-[var(--foreground)]/60'}`}>{persona.description}</p>
              <p className={`text-xs mt-2 italic ${isSelected ? 'text-gray-400' : 'text-[var(--gold-dim)]'}`}>"{persona.quote}"</p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-[var(--foreground)]/40 py-8">
            {t('home.noMatch')}
          </p>
        )}
      </div>

      {/* 已选计数 */}
      {selectedPersonas.length > 0 && (
        <p className="text-sm text-[var(--gold)]/70 text-center">
          {t('home.selectedCount', selectedPersonas.length)}
        </p>
      )}
    </div>
  );
}
