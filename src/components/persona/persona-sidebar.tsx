'use client';

import { DetectiveId, StepType } from '@/lib/types';
import { DETECTIVE_PERSONAS } from '@/lib/constants';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { Check, Users, User, Search, Loader2, Sparkles, ChevronDown, Eye, HelpCircle, Brain, CheckCircle, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import CostEstimate from '@/components/analysis/cost-estimate';
import FavoritesManager from './favorites-manager';

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

/** 推荐侦探（精选 10 位，覆盖不同风格） */
const RECOMMENDED_IDS = ['holmes', 'digong', 'henrylee', 'conan', 'baozheng', 'cuidaozhi', 'ness', 'zhangxin', 'linyuhui', 'douglas'];

/** 推理步骤图标配置 — label is a translation key */
const STEP_ICONS: Record<StepType, { icon: React.ReactNode; labelKey: string }> = {
  observation: { icon: <Eye size={12} />, labelKey: 'stepTypes.observation' },
  question: { icon: <HelpCircle size={12} />, labelKey: 'stepTypes.question' },
  analysis: { icon: <Brain size={12} />, labelKey: 'stepTypes.analysis' },
  conclusion: { icon: <CheckCircle size={12} />, labelKey: 'stepTypes.conclusion' },
};

/** 推理过程示例内容（根据侦探类型生成） */
function getSampleReasoning(id: DetectiveId): Array<{ type: StepType; content: string }> {
  const reasonings: Partial<Record<DetectiveId, Array<{ type: StepType; content: string }>>> = {
    holmes: [
      { type: 'observation', content: '我注意到光线角度表明这是下午时分，建筑物的阴影方向揭示了地理朝向。' },
      { type: 'question', content: '为何这个区域的建筑密度如此不均衡？是否存在人为规划或自然限制？' },
      { type: 'analysis', content: '根据排除法，这些特征组合最符合19世纪末工业革命时期的城市规划模式。' },
      { type: 'conclusion', content: '这是一个经历过重大工业转型的城镇区域，其建筑布局揭示了当时的社会经济结构。' },
    ],
    conan: [
      { type: 'observation', content: '图片中的植被分布和建筑风格表明这是东亚地区的某个城镇。' },
      { type: 'question', content: '为什么这些道路呈现如此规则的网格状分布？' },
      { type: 'analysis', content: '根据地形特征和建筑年代判断，这应该是一个有百年以上历史的老城区。' },
      { type: 'conclusion', content: '这个区域保留了传统与现代并存的城市发展痕迹。' },
    ],
    digong: [
      { type: 'observation', content: '此图山水相依，地势险要，似有风水格局之妙。' },
      { type: 'question', content: '为何此处选址如此讲究？莫非与古人"择地而居"之智慧有关？' },
      { type: 'analysis', content: '观其地形走势，背山面水，符合传统风水学中"藏风聚气"之格局。' },
      { type: 'conclusion', content: '此地选址深得古人智慧，是一处宜居之地。' },
    ],
    baozheng: [
      { type: 'observation', content: '观此图，建筑布局井然，但某些细节之处似有违和。' },
      { type: 'question', content: '这些不规则的建筑排列，是自然形成还是人为规划？' },
      { type: 'analysis', content: '本府以为，城中布局当有章法可循，若见乱象，必有缘由。' },
      { type: 'conclusion', content: '此地发展脉络清晰可见，古今交融中见真章。' },
    ],
    henrylee: [
      { type: 'observation', content: '从图像中的建筑结构、道路布局和植被特征来看，这是一个具有典型城市规划特征的区域。' },
      { type: 'question', content: '建筑物的年代特征和材料选择反映了怎样的社会经济发展水平？' },
      { type: 'analysis', content: '根据建筑风格和城市布局分析，这应该是经过系统规划的现代城镇区域。' },
      { type: 'conclusion', content: '让证据说话——这是一个发展中的现代社区，其规划体现了当代城市建设的理念。' },
    ],
  };

  if (reasonings[id]) return reasonings[id];

  const persona = DETECTIVE_PERSONAS.find(p => p.id === id);
  if (!persona) return [];

  return [
    { type: 'observation', content: `以${persona.nameZh}的独特视角观察此图，注意到了环境中的关键细节特征。` },
    { type: 'question', content: `基于${persona.title}的丰富经验，提出了关于此地特征的深入问题。` },
    { type: 'analysis', content: `运用专业领域的系统方法，对观察到的线索进行严谨分析。` },
    { type: 'conclusion', content: `"${persona.quote}"——得出最终判断。` },
  ];
}

/** 侦探档案卡片 */
function DetectiveCard({
  persona,
  isSelected,
  onToggle,
  showReasoning = false,
}: {
  persona: (typeof DETECTIVE_PERSONAS)[number];
  isSelected: boolean;
  onToggle: (id: DetectiveId) => void;
  showReasoning?: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const sampleReasoning = getSampleReasoning(persona.id);

  return (
    <div className={`
      rounded-lg border overflow-hidden transition-all
      ${isSelected
        ? 'border-[var(--gold)]/60 bg-[var(--gold)]/10'
        : 'border-[var(--card-border)] bg-[var(--card-bg)]/60 hover:border-[var(--gold)]/30'}
    `}>
      <button
        onClick={() => onToggle(persona.id)}
        className="w-full text-left p-2 flex items-center gap-2"
      >
        <div className={`
          w-8 h-8 rounded flex items-center justify-center shrink-0 text-xs font-bold
          ${isSelected
            ? 'bg-[var(--gold)] text-[var(--card-alt)]'
            : 'bg-[var(--card-accent)] text-[var(--gold)]/60'}
        `}>
          {persona.nameZh.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className={`font-medium text-sm truncate ${isSelected ? 'text-[var(--gold)]' : 'text-[var(--foreground)]/90'}`}>
            {persona.nameZh}
          </h4>
          <p className="text-[11px] text-[var(--foreground)]/30 truncate">{persona.title}</p>
        </div>

        {isSelected && (
          <Check size={14} className="text-[var(--gold)] shrink-0" />
        )}
      </button>

      {showReasoning && (
        <div className="px-2 pb-2">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--foreground)]/35 hover:text-[var(--gold)] hover:bg-[var(--card-alt)] transition-colors"
          >
            <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? t('detectiveCard.collapse') : t('detectiveCard.reasoningExample')}
          </button>

          {expanded && (
            <div className="mt-1 space-y-1 animate-fade-in">
              {sampleReasoning.slice(0, 2).map((step, index) => {
                const config = STEP_ICONS[step.type];
                return (
                  <div key={index} className="flex gap-1.5 items-start">
                    <div className="shrink-0 mt-0.5 text-[var(--gold)]/50">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-medium text-[var(--gold)]/60">{t(config.labelKey)}</span>
                      <p className="text-[10px] text-[var(--foreground)]/45 leading-relaxed mt-0.5 line-clamp-2">{step.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PersonaSidebar({
  onStart,
  canStart,
  isAnalyzing,
}: {
  onStart: () => void;
  canStart: boolean;
  isAnalyzing: boolean;
}) {
  const { selectedPersonas, mode, setPersonas, setMode, favorites } = useAnalysisStore();
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const togglePersona = (id: DetectiveId) => {
    if (selectedPersonas.includes(id)) {
      setPersonas(selectedPersonas.filter((p) => p !== id));
    } else {
      if (mode === 'solo') {
        setPersonas([id]);
      } else {
        setPersonas([...selectedPersonas, id]);
      }
    }
  };

  // 过滤
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

  // 推荐侦探
  const recommended = DETECTIVE_PERSONAS.filter(p => RECOMMENDED_IDS.includes(p.id));
  const remaining = filtered.filter(p => !RECOMMENDED_IDS.includes(p.id));
  const displayList = searchQuery || activeCategory !== 'all' ? filtered : recommended;
  const hasMore = !searchQuery && activeCategory === 'all' && remaining.length > 0;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-3 border-b-[var(--card-border)]">
        <h3 className="text-base font-bold text-[var(--gold)] flex items-center gap-2">
          <Search size={18} />
          {t('home.step2')}
        </h3>
      </div>

      <div className="p-3 space-y-2.5">
        {/* 模式切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('solo')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'solo'
                ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                : 'bg-[var(--card-alt)] text-[var(--foreground)]/50 border-[var(--card-border)] hover:text-[var(--foreground)]'
            }`}
          >
            <User size={14} />
            {t('home.solo')}
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'group'
                ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                : 'bg-[var(--card-alt)] text-[var(--foreground)]/50 border-[var(--card-border)] hover:text-[var(--foreground)]'
            }`}
          >
            <Users size={14} />
            {t('home.group')}
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" size={14} />
          <input
            type="text"
            placeholder={t('home.searchDetectives')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowAll(true); }}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-[var(--foreground)]/25"
          />
        </div>

        {/* 分类标签 - 可横向滚动 */}
        <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-hide -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setShowAll(true); }}
              className={`px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                  : 'bg-[var(--card-alt)] text-[var(--foreground)]/40 border-[var(--card-border)] hover:border-[var(--gold)]/40'
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* 开始推理按钮 */}
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`
            w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-all
            ${canStart
              ? 'bg-[var(--gold)] hover:bg-[var(--gold-dim)] text-[var(--card-alt)] shadow-md shadow-[var(--gold)]/20'
              : 'bg-[var(--card-border)] text-[var(--foreground)]/30 cursor-not-allowed'}
          `}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('home.analyzing')}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {t('home.startAnalysis')}
            </>
          )}
        </button>

        {/* 成本估算 */}
        {selectedPersonas.length > 0 && (
          <CostEstimate detectiveCount={selectedPersonas.length} mode={mode} />
        )}

        {/* 收藏管理 */}
        <FavoritesManager />

        {/* 分隔线 */}
        <div className="border-t border-b-[var(--card-border)]" />

        {/* 侦探列表标题 */}
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-[var(--foreground)]/40">
            {searchQuery ? `${t('detectiveList.searchResults')} (${filtered.length})` :
             activeCategory !== 'all' ? `${t(CATEGORIES.find(c => c.key === activeCategory)?.labelKey || '')} (${filtered.length})` :
             t('detectiveList.featuredDetectives')}
          </h4>
        </div>

        {/* 侦探卡片列表 */}
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 sidebar-scroll">
          {/* 推荐区域 */}
          {!searchQuery && activeCategory === 'all' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-xs text-[var(--gold)]/60">
                <Star size={12} />
                <span>{t('detectiveList.recommended')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {recommended.map((persona) => (
                  <DetectiveCard
                    key={persona.id}
                    persona={persona}
                    isSelected={selectedPersonas.includes(persona.id)}
                    onToggle={togglePersona}
                    showReasoning={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 其他侦探 / 搜索结果 */}
          {(searchQuery || activeCategory !== 'all') && displayList.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {displayList.map((persona) => (
                <DetectiveCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersonas.includes(persona.id)}
                  onToggle={togglePersona}
                  showReasoning={false}
                />
              ))}
            </div>
          )}

          {/* 显示更多 */}
          {!searchQuery && activeCategory === 'all' && hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-xs text-[var(--gold)]/60 hover:text-[var(--gold)] border border-dashed border-b-[var(--card-border)] rounded-lg hover:border-[var(--gold)]/40 transition-colors"
            >
              {showAll ? t('detectiveList.hideAll') : t('detectiveList.showAll', remaining.length)}
            </button>
          )}

          {/* 展开后显示其余侦探 */}
          {showAll && !searchQuery && activeCategory === 'all' && (
            <div className="grid grid-cols-2 gap-1.5">
              {remaining.map((persona) => (
                <DetectiveCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersonas.includes(persona.id)}
                  onToggle={togglePersona}
                  showReasoning={false}
                />
              ))}
            </div>
          )}

          {displayList.length === 0 && !hasMore && !showAll && (
            <p className="text-center text-[var(--foreground)]/30 py-4 text-xs">
              {t('home.noMatch')}
            </p>
          )}
        </div>

        {/* 已选计数 */}
        {selectedPersonas.length > 0 && (
          <p className="text-xs text-[var(--gold)]/60 text-center">
            {t('home.selectedCount', selectedPersonas.length)}
          </p>
        )}
      </div>
    </div>
  );
}
