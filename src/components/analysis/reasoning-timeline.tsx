'use client';

import { useState } from 'react';
import { StepType, ReasoningStep } from '@/lib/types';
import { useI18n } from '@/i18n/context';
import { Eye, HelpCircle, Brain, CheckCircle, ChevronDown, ChevronUp, Link2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReasoningTimelineProps {
  steps: ReasoningStep[];
  detectiveName: string;
  detectiveColor: string;
  isStreaming: boolean;
}

const STEP_CONFIG: Record<StepType, { icon: React.ReactNode; labelKey: string; color: string; bg: string }> = {
  observation: {
    icon: <Eye size={14} />,
    labelKey: 'stepTypes.observation',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30 border-blue-800/50',
  },
  question: {
    icon: <HelpCircle size={14} />,
    labelKey: 'stepTypes.question',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30 border-amber-800/50',
  },
  analysis: {
    icon: <Brain size={14} />,
    labelKey: 'stepTypes.analysis',
    color: 'text-purple-400',
    bg: 'bg-purple-900/30 border-purple-800/50',
  },
  conclusion: {
    icon: <CheckCircle size={14} />,
    labelKey: 'stepTypes.conclusion',
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/30 border-emerald-800/50',
  },
};

/** 推理步骤卡片（可展开/折叠） */
function StepCard({
  step,
  index,
  isLast,
  isStreaming,
}: {
  step: ReasoningStep;
  index: number;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const config = STEP_CONFIG[step.type];
  const isNew = isStreaming && isLast;

  // 提取内容中的引用标记（如 [证据1]、[推论2]）
  const refRegex = /\[([^\]]+)\]/g;
  const refs = step.content.match(refRegex) || [];

  return (
    <div className={`group ${isNew ? 'animate-fade-in' : ''}`}>
      <div
        className={`
          flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
          ${expanded
            ? 'border-[var(--gold)]/30 bg-[var(--card-bg)] shadow-md shadow-[var(--gold)]/5'
            : 'border-[var(--card-border)] bg-[var(--card-bg)]/50 hover:border-[var(--card-border)]/80'}
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* 步骤编号 */}
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
          ${config.bg} ${config.color} border
        `}>
          {index + 1}
        </div>

        {/* 步骤类型标签 */}
        <div className={`shrink-0 flex items-center gap-1 ${config.color}`}>
          {config.icon}
          <span className="text-[11px] font-medium">{t(config.labelKey)}</span>
        </div>

        {/* 内容摘要 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--foreground)]/70 line-clamp-1">{step.content}</p>
          {/* 引用标签 */}
          {refs.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Link2 size={10} className="text-[var(--foreground)]/30" />
              {refs.slice(0, 3).map((ref, i) => (
                <span key={i} className="text-[10px] text-[var(--gold)]/50 bg-[var(--gold)]/10 px-1.5 py-0.5 rounded">
                  {ref}
                </span>
              ))}
              {refs.length > 3 && (
                <span className="text-[10px] text-[var(--foreground)]/30">+{refs.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* 展开/折叠指示器 */}
        <div className="shrink-0 text-[var(--foreground)]/30 group-hover:text-[var(--foreground)]/50 transition-colors">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* 展开后的详细内容 */}
      {expanded && (
        <div className="ml-9 mt-2 p-3 rounded-lg bg-[var(--card-alt)] border border-[var(--card-border)] animate-fade-in">
          <div className="text-sm text-[var(--foreground)]/80 leading-relaxed whitespace-pre-wrap prose prose-sm prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>
          </div>
          {/* 证据链指示 */}
          {refs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
              <div className="flex items-center gap-1 text-[11px] text-[var(--gold)]/60">
                <Zap size={12} />
                <span>{t('timeline.evidenceChain', refs.length)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 连接线 */}
      {!isLast && (
        <div className="ml-5 w-px h-4 bg-[var(--card-border)]" />
      )}
    </div>
  );
}

/** 推理过程时间线（增强版） */
export default function ReasoningTimeline({
  steps,
  detectiveName,
  detectiveColor,
  isStreaming,
}: ReasoningTimelineProps) {
  const { t } = useI18n();
  const [allExpanded, setAllExpanded] = useState(false);

  if (steps.length === 0) return null;

  // 统计各类型步骤数量
  const typeCounts = steps.reduce((acc, step) => {
    acc[step.type] = (acc[step.type] || 0) + 1;
    return acc;
  }, {} as Record<StepType, number>);

  return (
    <div className="space-y-2">
      {/* 时间线标题 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className={`font-bold text-sm ${detectiveColor}`}>{t('timeline.reasoningProcess')}</h4>
          <span className="text-[11px] text-[var(--foreground)]/40">{t('timeline.steps', steps.length)}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 步骤类型统计 */}
          <div className="flex items-center gap-1 text-[10px]">
            {Object.entries(typeCounts).map(([type, count]) => {
              const config = STEP_CONFIG[type as StepType];
              return (
                <span key={type} className={`flex items-center gap-0.5 ${config.color}`}>
                  {config.icon}
                  <span>{t(config.labelKey)}</span>
                  <span>{count}</span>
                </span>
              );
            })}
          </div>
          {/* 全部展开/折叠按钮 */}
          {steps.length > 3 && (
            <button
              onClick={() => setAllExpanded(!allExpanded)}
              className="text-[10px] text-[var(--foreground)]/40 hover:text-[var(--gold)] transition-colors"
            >
              {allExpanded ? t('timeline.collapseAll') : t('timeline.expandAll')}
            </button>
          )}
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
            isStreaming={isStreaming}
          />
        ))}
      </div>
    </div>
  );
}
