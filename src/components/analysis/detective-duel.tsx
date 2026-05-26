'use client';

import { useState } from 'react';
import { DetectiveId, DetectiveReasoning } from '@/lib/types';
import { PERSONA_MAP } from '@/lib/constants';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { Swords, Trophy, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** 步骤类型配置（与 reasoning-timeline 一致） */
const STEP_CONFIG = {
  observation: { labelKey: 'stepTypes.observation', color: 'bg-blue-900/50 text-blue-300' },
  question: { labelKey: 'stepTypes.question', color: 'bg-amber-900/50 text-amber-300' },
  analysis: { labelKey: 'stepTypes.analysis', color: 'bg-purple-900/50 text-purple-300' },
  conclusion: { labelKey: 'stepTypes.conclusion', color: 'bg-emerald-900/50 text-emerald-300' },
};

interface DetectiveDuelProps {
  detectiveA: DetectiveReasoning;
  detectiveB: DetectiveReasoning;
}

/** 侦探对决模式 — 对比两位侦探的推理 */
export default function DetectiveDuel({ detectiveA, detectiveB }: DetectiveDuelProps) {
  const { t } = useI18n();
  const { selectedPersonas, mode } = useAnalysisStore();
  const [activeView, setActiveView] = useState<'side-by-side' | 'diff' | 'stats'>('side-by-side');

  const personaA = PERSONA_MAP[detectiveA.detectiveId];
  const personaB = PERSONA_MAP[detectiveB.detectiveId];

  if (!personaA || !personaB) return null;

  // 统计信息
  const statsA = {
    steps: detectiveA.steps.length,
    observations: detectiveA.steps.filter(s => s.type === 'observation').length,
    questions: detectiveA.steps.filter(s => s.type === 'question').length,
    analyses: detectiveA.steps.filter(s => s.type === 'analysis').length,
    conclusions: detectiveA.steps.filter(s => s.type === 'conclusion').length,
    textLength: detectiveA.fullText.length,
  };

  const statsB = {
    steps: detectiveB.steps.length,
    observations: detectiveB.steps.filter(s => s.type === 'observation').length,
    questions: detectiveB.steps.filter(s => s.type === 'question').length,
    analyses: detectiveB.steps.filter(s => s.type === 'analysis').length,
    conclusions: detectiveB.steps.filter(s => s.type === 'conclusion').length,
    textLength: detectiveB.fullText.length,
  };

  // 找出共同点和差异点（基于步骤类型序列）
  const findCommonSteps = () => {
    const common: string[] = [];
    const diffA: string[] = [];
    const diffB: string[] = [];

    const stepsA = detectiveA.steps.map(s => s.type);
    const stepsB = detectiveB.steps.map(s => s.type);

    const maxLen = Math.max(stepsA.length, stepsB.length);
    for (let i = 0; i < maxLen; i++) {
      if (stepsA[i] && stepsB[i] && stepsA[i] === stepsB[i]) {
        common.push(stepsA[i]);
      } else {
        if (stepsA[i]) diffA.push(stepsA[i]);
        if (stepsB[i]) diffB.push(stepsB[i]);
      }
    }

    return { common, diffA, diffB };
  };

  const comparison = findCommonSteps();

  return (
    <div className="rounded-xl border border-[var(--gold)]/30 overflow-hidden animate-fade-in">
      {/* 对决头部 */}
      <div className="p-4 bg-gradient-to-r from-[var(--card-accent)] via-[var(--card-bg)] to-[var(--card-accent)] border-b border-[var(--gold)]/30">
        <div className="flex items-center justify-between">
          {/* 侦探 A */}
          <div className="flex-1 text-center">
            <div className="text-lg font-bold text-[var(--gold)]">{personaA.nameZh}</div>
            <div className="text-xs text-[var(--foreground)]/50">{personaA.title}</div>
          </div>

          {/* VS 标志 */}
          <div className="flex items-center gap-2 px-4">
            <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center">
              <Swords size={18} className="text-[var(--gold)]" />
            </div>
          </div>

          {/* 侦探 B */}
          <div className="flex-1 text-center">
            <div className="text-lg font-bold text-[var(--gold)]">{personaB.nameZh}</div>
            <div className="text-xs text-[var(--foreground)]/50">{personaB.title}</div>
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex justify-center gap-2 mt-4">
          {[
            { key: 'side-by-side' as const, label: t('duel.sideBySide'), icon: <ChevronLeft size={12} /> },
            { key: 'diff' as const, label: t('duel.diff'), icon: <BarChart3 size={12} /> },
            { key: 'stats' as const, label: t('duel.stats'), icon: <Trophy size={12} /> },
          ].map(view => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeView === view.key
                  ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                  : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)] hover:bg-[var(--card-alt)]'}
              `}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* 对决内容 */}
      <div className="p-4">
        {activeView === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4">
            {/* 侦探 A 推理 */}
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-3">
              <h4 className="text-sm font-bold text-[var(--gold)] mb-2">{t('duel.reasoningOf', personaA.nameZh)}</h4>
              <div className="text-xs text-[var(--foreground)]/70 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{detectiveA.fullText}</ReactMarkdown>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--card-border)] text-[10px] text-[var(--foreground)]/40">
                {t('duel.stepsAndWords', statsA.steps, statsA.textLength)}
              </div>
            </div>

            {/* 侦探 B 推理 */}
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-3">
              <h4 className="text-sm font-bold text-[var(--gold)] mb-2">{t('duel.reasoningOf', personaB.nameZh)}</h4>
              <div className="text-xs text-[var(--foreground)]/70 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{detectiveB.fullText}</ReactMarkdown>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--card-border)] text-[10px] text-[var(--foreground)]/40">
                {t('duel.stepsAndWords', statsB.steps, statsB.textLength)}
              </div>
            </div>
          </div>
        )}

        {activeView === 'diff' && (
          <div className="space-y-4">
            {/* 共同推理路径 */}
            {comparison.common.length > 0 && (
              <div className="rounded-lg border border-emerald-800/30 bg-emerald-900/10 p-3">
                <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                  <Trophy size={14} />
                  {t('duel.commonPath')} ({comparison.common.length} {t('duel.stepsLabel')})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {comparison.common.map((type, i) => {
                    const config = STEP_CONFIG[type as keyof typeof STEP_CONFIG] || STEP_CONFIG.observation;
                    return (
                      <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                        {t(config.labelKey)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 侦探 A 独有路径 */}
            {comparison.diffA.length > 0 && (
              <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-3">
                <h4 className="text-sm font-bold text-blue-400 mb-2">{t('duel.uniquePath', personaA.nameZh)} ({comparison.diffA.length} {t('duel.stepsLabel')})</h4>
                <div className="flex flex-wrap gap-1">
                  {comparison.diffA.map((type, i) => {
                    const config = STEP_CONFIG[type as keyof typeof STEP_CONFIG] || STEP_CONFIG.observation;
                    return (
                      <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                        {t(config.labelKey)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 侦探 B 独有路径 */}
            {comparison.diffB.length > 0 && (
              <div className="rounded-lg border border-purple-800/30 bg-purple-900/10 p-3">
                <h4 className="text-sm font-bold text-purple-400 mb-2">{t('duel.uniquePath', personaB.nameZh)} ({comparison.diffB.length} {t('duel.stepsLabel')})</h4>
                <div className="flex flex-wrap gap-1">
                  {comparison.diffB.map((type, i) => {
                    const config = STEP_CONFIG[type as keyof typeof STEP_CONFIG] || STEP_CONFIG.observation;
                    return (
                      <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                        {t(config.labelKey)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'stats' && (
          <div className="grid grid-cols-2 gap-4">
            {/* 侦探 A 统计 */}
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-4">
              <h4 className="text-sm font-bold text-[var(--gold)] mb-3">{personaA.nameZh}</h4>
              <div className="space-y-2">
                <StatBar label={t('duel.stepsLabel')} value={statsA.steps} max={Math.max(statsA.steps, statsB.steps)} color="bg-blue-500" />
                <StatBar label={t('stepTypes.observation')} value={statsA.observations} max={Math.max(statsA.observations, statsB.observations)} color="bg-blue-400" />
                <StatBar label={t('stepTypes.question')} value={statsA.questions} max={Math.max(statsA.questions, statsB.questions)} color="bg-amber-400" />
                <StatBar label={t('stepTypes.analysis')} value={statsA.analyses} max={Math.max(statsA.analyses, statsB.analyses)} color="bg-purple-400" />
                <StatBar label={t('stepTypes.conclusion')} value={statsA.conclusions} max={Math.max(statsA.conclusions, statsB.conclusions)} color="bg-emerald-400" />
                <StatBar label={t('duel.wordsLabel')} value={statsA.textLength} max={Math.max(statsA.textLength, statsB.textLength)} color="bg-[var(--gold)]" />
              </div>
            </div>

            {/* 侦探 B 统计 */}
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-4">
              <h4 className="text-sm font-bold text-[var(--gold)] mb-3">{personaB.nameZh}</h4>
              <div className="space-y-2">
                <StatBar label={t('duel.stepsLabel')} value={statsB.steps} max={Math.max(statsA.steps, statsB.steps)} color="bg-purple-500" />
                <StatBar label={t('stepTypes.observation')} value={statsB.observations} max={Math.max(statsA.observations, statsB.observations)} color="bg-blue-400" />
                <StatBar label={t('stepTypes.question')} value={statsB.questions} max={Math.max(statsA.questions, statsB.questions)} color="bg-amber-400" />
                <StatBar label={t('stepTypes.analysis')} value={statsB.analyses} max={Math.max(statsA.analyses, statsB.analyses)} color="bg-purple-400" />
                <StatBar label={t('stepTypes.conclusion')} value={statsB.conclusions} max={Math.max(statsA.conclusions, statsB.conclusions)} color="bg-emerald-400" />
                <StatBar label={t('duel.wordsLabel')} value={statsB.textLength} max={Math.max(statsA.textLength, statsB.textLength)} color="bg-[var(--gold)]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 统计进度条 */
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--foreground)]/50 w-16">{label}</span>
      <div className="flex-1 h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-[var(--foreground)]/70 w-8 text-right">{value}</span>
    </div>
  );
}
