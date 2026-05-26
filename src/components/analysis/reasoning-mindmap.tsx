'use client';

import { StepType } from '@/lib/types';
import { useI18n } from '@/i18n/context';
import { Eye, HelpCircle, Brain, CheckCircle } from 'lucide-react';

interface MindMapNodeProps {
  step: { id: string; type: StepType; content: string; order: number };
  color: string;
}

const NODE_STYLES: Record<StepType, { icon: React.ReactNode; labelKey: string; bg: string; border: string; glow: string }> = {
  observation: {
    icon: <Eye size={14} />,
    labelKey: 'mindmap.observation',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
  },
  question: {
    icon: <HelpCircle size={14} />,
    labelKey: 'mindmap.question',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  analysis: {
    icon: <Brain size={14} />,
    labelKey: 'mindmap.analysis',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
  conclusion: {
    icon: <CheckCircle size={14} />,
    labelKey: 'mindmap.conclusion',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
};

function MindMapNode({ step, color }: MindMapNodeProps) {
  const { t } = useI18n();
  const style = NODE_STYLES[step.type];

  return (
    <div
      className={`p-3 rounded-lg border ${style.bg} ${style.border} shadow-md ${style.glow} transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
          step.type === 'observation' ? 'bg-blue-600' :
          step.type === 'question' ? 'bg-amber-500' :
          step.type === 'analysis' ? 'bg-purple-600' : 'bg-emerald-500'
        }`}>
          {style.icon}
        </div>
        <span className="text-xs font-bold" style={{ color }}>{t(style.labelKey)}</span>
      </div>
      <div className="text-xs text-[var(--foreground)]/60 leading-relaxed line-clamp-3">
        {step.content.length > 150 ? step.content.slice(0, 150) + '...' : step.content}
      </div>
    </div>
  );
}

/** 推理思维导图 — 按阶段分组的逻辑链可视化 */
export default function ReasoningMindMap({
  steps,
  detectiveName,
  detectiveColor,
}: {
  steps: Array<{ id: string; type: StepType; content: string; order: number }>;
  detectiveName: string;
  detectiveColor: string;
}) {
  const { t } = useI18n();
  if (steps.length === 0) return null;

  // 按类型分组
  const grouped: Record<StepType, typeof steps> = {
    observation: [],
    question: [],
    analysis: [],
    conclusion: [],
  };
  for (const step of steps) {
    grouped[step.type].push(step);
  }

  const stageLabels: { type: StepType; labelKey: string }[] = [
    { type: 'observation', labelKey: 'mindmap.sceneObservation' },
    { type: 'question', labelKey: 'mindmap.keyQuestions' },
    { type: 'analysis', labelKey: 'mindmap.logicalReasoning' },
    { type: 'conclusion', labelKey: 'mindmap.finalConclusion' },
  ];

  const activeStages = stageLabels.filter(s => grouped[s.type].length > 0);

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${detectiveColor.replace('text-', 'bg-')}`} />
        <span className="text-xs font-bold" style={{ color: detectiveColor }}>{t('mindmap.title', detectiveName)}</span>
        <span className="text-[10px] text-[var(--foreground)]/30 ml-auto">{t('mindmap.nodes', steps.length)}</span>
      </div>

      {/* 阶段流（水平排列） */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activeStages.map((stage, stageIndex) => (
          <div key={stage.type} className="flex items-start">
            {/* 阶段列 */}
            <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]">
              {/* 阶段标题 */}
              <div className="px-2 py-1 rounded bg-[var(--card-alt)] border-[var(--card-border)] text-[11px] font-bold text-[var(--foreground)]/50 text-center">
                {t(stage.labelKey)}
              </div>
              {/* 阶段内节点 */}
              {grouped[stage.type].map((step) => (
                <MindMapNode key={step.id} step={step} color={detectiveColor} />
              ))}
            </div>

            {/* 阶段间连接箭头 */}
            {stageIndex < activeStages.length - 1 && (
              <div className="flex items-center pt-6 px-1 text-[var(--gold)]/30">
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                  <path d="M2 10 H12 M10 5 L14 10 L10 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 推导链摘要 */}
      {grouped.observation.length > 0 && grouped.conclusion.length > 0 && (
        <div className="mt-3 p-2 rounded bg-[var(--card-accent)]/30 border-[var(--card-border)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground)]/50">
            <span className="text-blue-400">{t('mindmap.observation')}</span>
            <span>→</span>
            <span className="text-amber-400">{t('mindmap.question')}</span>
            <span>→</span>
            <span className="text-purple-400">{t('mindmap.analysis')}</span>
            <span>→</span>
            <span className="text-emerald-400">{t('mindmap.conclusion')}</span>
            <span className="ml-auto text-[var(--foreground)]/30">
              {grouped.observation.length} → {grouped.question.length} → {grouped.analysis.length} → {grouped.conclusion.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
