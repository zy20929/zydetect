'use client';

import { useEffect, useState } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { DetectiveId, DetectiveReasoning } from '@/lib/types';
import { PERSONA_MAP } from '@/lib/constants';
import { useI18n } from '@/i18n/context';
import { Eye, MessageCircle, Brain, CheckCircle, Loader2, Search, FileText, Clock } from 'lucide-react';

/** 格式化时间 */
function formatSeconds(seconds: number, t: (key: string) => string): string {
  if (seconds < 60) return `${Math.round(seconds)}${t('progress.secondsUnit')}`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}${t('progress.minutesUnit')}${s}${t('progress.secondsUnit')}`;
}

/** 步骤类型配置 */
const STEP_CONFIG = {
  observation: { labelKey: 'stepTypes.observation', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-800/30' },
  question: { labelKey: 'stepTypes.question', icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-800/30' },
  analysis: { labelKey: 'stepTypes.analysis', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-800/30' },
  conclusion: { labelKey: 'stepTypes.conclusion', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800/30' },
};

/** 推理阶段定义 — label is a translation key */
const PHASES = [
  { labelKey: 'progress.knowledgeRetrieval', icon: Search, key: 'knowledge' },
  { labelKey: 'progress.detectiveReasoning', icon: Brain, key: 'detective' },
  { labelKey: 'progress.synthesis', icon: MessageCircle, key: 'synthesis' },
  { labelKey: 'progress.reportGeneration', icon: FileText, key: 'report' },
];

/** 可视化推理进度指示器 */
export default function ReasoningProgressIndicator() {
  const { t } = useI18n();
  const { isAnalyzing, isSynthesizing, finalReport, detectives, mode, analysisStartTime, selectedPersonas, synthesisText } = useAnalysisStore();
  const detectiveList = Object.values(detectives) as DetectiveReasoning[];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!analysisStartTime) return;
    const timer = setInterval(() => setElapsed((Date.now() - analysisStartTime) / 1000), 1000);
    return () => clearInterval(timer);
  }, [analysisStartTime]);

  if (!isAnalyzing && !isSynthesizing && !finalReport) return null;

  const isGroupMode = mode === 'group' && detectiveList.length > 1;
  const detectivesDone = detectiveList.filter(d => d.status === 'complete').length;
  const totalSteps = detectiveList.reduce((sum, d) => sum + d.steps.length, 0);
  const currentDetective = detectiveList.find(d => d.status === 'streaming');

  // 确定当前阶段
  let activePhaseIndex = 0;
  if (finalReport) activePhaseIndex = 3;
  else if (isSynthesizing) activePhaseIndex = 2;
  else if (detectivesDone > 0 || detectiveList.some(d => d.status === 'streaming')) activePhaseIndex = 1;
  else activePhaseIndex = 0;

  // 整体进度百分比
  const overallProgress = (() => {
    if (finalReport) return 100;
    if (isSynthesizing) return 60 + Math.min(30, (synthesisText.length / 500) * 30);
    if (isGroupMode && detectiveList.length > 0) return Math.round((detectivesDone / detectiveList.length) * 60);
    if (currentDetective) {
      const stepProgress = currentDetective.steps.length > 0 ? Math.min(currentDetective.steps.length / 8, 1) * 15 : 0;
      return Math.round(10 + stepProgress);
    }
    return 5;
  })();

  return (
    <div className="rounded-xl border border-[var(--gold)]/20 overflow-hidden bg-gradient-to-br from-[var(--card-bg)] to-[var(--card-accent)]/30 animate-fade-in">
      {/* 进度头部 */}
      <div className="p-4 border-b border-[var(--gold)]/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="text-[var(--gold)] animate-spin" />
            <span className="text-sm font-bold text-[var(--gold)]">{t('progress.reasoningInProgress')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[var(--foreground)]/30" />
            <span className="text-xs text-[var(--foreground)]/40 font-mono">{formatSeconds(elapsed, t)}</span>
          </div>
        </div>

        {/* 整体进度条 */}
        <div className="relative h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--gold)] to-amber-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
          {/* 扫光效果 */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{
              animation: 'shimmer 2s infinite',
              transform: `translateX(${(overallProgress / 100) * 200 - 100}%)`,
            }}
          />
        </div>
        <div className="text-right text-xs text-[var(--gold)]/50 mt-1 font-mono">{Math.round(overallProgress)}%</div>
      </div>

      {/* 阶段指示器 */}
      <div className="p-4 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-1">
          {PHASES.map((phase, i) => {
            const Icon = phase.icon;
            const isDone = i < activePhaseIndex || (finalReport && i <= 3);
            const isActive = i === activePhaseIndex;

            return (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isDone
                      ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
                      : isActive
                        ? 'bg-[var(--gold)]/5 text-[var(--gold)]/70 border border-[var(--gold)]/20'
                        : 'text-[var(--foreground)]/20'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isDone ? 'bg-[var(--gold)] text-[var(--card-alt)]' : isActive ? 'border border-[var(--gold)]/40' : 'border border-[var(--card-border)]'
                  }`}>
                    {isDone ? <CheckCircle size={12} /> : <Icon size={12} />}
                  </div>
                  <span className="text-xs font-medium">{t(phase.labelKey)}</span>
                  {isActive && (
                    <Loader2 size={10} className="animate-spin ml-auto opacity-50" />
                  )}
                </div>
                {i < PHASES.length - 1 && (
                  <div className={`w-3 h-px ${isDone ? 'bg-[var(--gold)]/40' : 'bg-[var(--card-border)]'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 侦探推理详情（仅在侦探推理阶段显示） */}
      {activePhaseIndex === 1 && detectiveList.length > 0 && (
        <div className="p-4 border-b border-[var(--card-border)]">
          <div className="text-xs text-[var(--foreground)]/30 mb-2">{t('progress.detectiveProgress', detectivesDone, detectiveList.length)}</div>
          <div className="space-y-2">
            {detectiveList.map((d) => {
              const persona = PERSONA_MAP[d.detectiveId];
              if (!persona) return null;

              const stepTypes = d.steps.map(s => s.type);
              const typeCounts: Record<string, number> = {};
              stepTypes.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });

              return (
                <div
                  key={d.detectiveId}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    d.status === 'complete'
                      ? 'border-emerald-800/30 bg-emerald-900/10'
                      : d.status === 'streaming'
                        ? 'border-[var(--gold)]/30 bg-[var(--gold)]/5'
                        : 'border-[var(--card-border)] bg-[var(--card-bg)]/30 opacity-50'
                  }`}
                >
                  {/* 状态图标 */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    d.status === 'complete' ? 'bg-emerald-900/50 text-emerald-400' :
                    d.status === 'streaming' ? 'bg-[var(--gold)]/20 text-[var(--gold)]' :
                    'bg-[var(--card-border)] text-[var(--foreground)]/20'
                  }`}>
                    {d.status === 'complete' ? <CheckCircle size={14} /> :
                     d.status === 'streaming' ? <Loader2 size={14} className="animate-spin" /> :
                     <span className="text-[10px]">{persona.nameZh[0]}</span>}
                  </div>

                  {/* 侦探名 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--foreground)]/70">{persona.nameZh}</span>
                      {d.status === 'streaming' && d.steps.length > 0 && (
                        <span className="text-[10px] text-[var(--gold)]/50">{t('progress.stepsReasoning', d.steps.length)}</span>
                      )}
                      {d.status === 'complete' && (
                        <span className="text-[10px] text-emerald-400/50">{t('progress.steps', d.steps.length)}</span>
                      )}
                    </div>
                    {/* 步骤类型分布 */}
                    {d.steps.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {Object.entries(typeCounts).map(([type, count]) => {
                          const config = STEP_CONFIG[type as keyof typeof STEP_CONFIG];
                          if (!config) return null;
                          return (
                            <span
                              key={type}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${config.bg} ${config.color} ${config.border} border`}
                            >
                              {t(config.labelKey)}×{count}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* 等待状态 */}
                    {d.status === 'pending' && (
                      <div className="text-[10px] text-[var(--foreground)]/20 mt-0.5">{t('progress.waiting')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 综合推理阶段 */}
      {activePhaseIndex === 2 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--gold)]/60">
            <MessageCircle size={14} />
            <span className="text-xs font-medium">{t('progress.synthesizing')}</span>
          </div>
          <div className="text-xs text-[var(--foreground)]/40 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto pr-1">
            {synthesisText || t('progress.synthesizingText')}
            {isSynthesizing && <span className="inline-block w-1.5 h-3.5 bg-[var(--gold)] animate-pulse ml-0.5" />}
          </div>
        </div>
      )}
    </div>
  );
}
