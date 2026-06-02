'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, HelpCircle, Brain, CheckCircle, Search } from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '@/lib/demo-scenarios';
import { useAnalysisStore } from '@/store/analysis-store';

/** 演示步骤类型 */
type DemoStepType = 'observation' | 'question' | 'analysis' | 'conclusion';

interface DemoStep {
  type: DemoStepType;
  icon: React.ReactNode;
  label: string;
  content: string;
  color: string;
}

const STEP_CONFIG: Record<DemoStepType, { icon: React.ReactNode; label: string; color: string }> = {
  observation: { icon: <Eye size={14} />, label: '观察', color: 'text-blue-400' },
  question: { icon: <HelpCircle size={14} />, label: '提问', color: 'text-amber-400' },
  analysis: { icon: <Brain size={14} />, label: '推理', color: 'text-purple-400' },
  conclusion: { icon: <CheckCircle size={14} />, label: '结论', color: 'text-emerald-400' },
};

const STEP_INTERVAL = 1500; // 每步间隔 1.5s
const SCENARIO_PAUSE = 5000; // 场景切换间隔 5s

/** 将一个知识库场景转换为演示步骤 */
function scenarioToSteps(scenario: DemoScenario): DemoStep[] {
  return scenario.steps.map((step) => {
    const config = STEP_CONFIG[step.type];
    return { type: step.type, icon: config.icon, label: config.label, content: step.content, color: config.color };
  });
}

/** 从剩余场景中随机挑选一个 */
function pickRandom(remaining: number[]): { chosen: number; rest: number[] } {
  const idx = Math.floor(Math.random() * remaining.length);
  const chosen = remaining[idx];
  return { chosen, rest: [...remaining.slice(0, idx), ...remaining.slice(idx + 1)] };
}

/** 自动轮播的推理演示 — 50 场景随机循环 */
export default function ReasoningDemo() {
  const isAnalyzing = useAnalysisStore((s) => s.isAnalyzing);
  const finalReport = useAnalysisStore((s) => s.finalReport);
  const isActive = !!finalReport || isAnalyzing;

  const allIndices = useRef(Array.from({ length: DEMO_SCENARIOS.length }, (_, i) => i));
  const [remaining, setRemaining] = useState<number[]>(() => allIndices.current.slice(1)); // 除去第一个
  const [currentIndex, setCurrentIndex] = useState(0); // 当前场景索引
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'step' | 'pause'>('step'); // 当前处于步骤播放还是暂停等待

  const scenario = DEMO_SCENARIOS[currentIndex];
  const steps = scenarioToSteps(scenario);
  const visibleSteps = currentStep >= 0 ? steps.slice(0, currentStep + 1) : [];

  const hasActiveTask = isActive;
  const taskPaused = hasActiveTask;

  // 步骤推进逻辑
  useEffect(() => {
    if (isPaused || taskPaused) return;

    if (phase === 'step') {
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          // 还有步骤，继续
          setCurrentStep((s) => s + 1);
        } else {
          // 当前场景演示完，进入暂停等待
          setPhase('pause');
        }
      }, STEP_INTERVAL);
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentIndex, isPaused, phase, steps.length, taskPaused]);

  // 暂停后随机挑选下一个场景
  useEffect(() => {
    if (phase !== 'pause' || isPaused || hasActiveTask) return;

    const timer = setTimeout(() => {
      if (remaining.length === 0) {
        // 全部演示完，重置循环
        const reshuffled = shuffleArray(allIndices.current);
        setRemaining(reshuffled.slice(1));
        setCurrentIndex(reshuffled[0]);
      } else {
        const { chosen, rest } = pickRandom(remaining);
        setRemaining(rest);
        setCurrentIndex(chosen);
      }
      setCurrentStep(-1);
      setPhase('step');
    }, SCENARIO_PAUSE);

    return () => clearTimeout(timer);
  }, [phase, isPaused, remaining, hasActiveTask, currentIndex]);

  // 当有分析任务时，清空当前演示状态
  useEffect(() => {
    if (hasActiveTask) {
      setCurrentStep(-1);
      setPhase('step');
    }
  }, [hasActiveTask]);

  function isPaused_by_task() {
    return hasActiveTask;
  }

  return (
    <div
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 标题栏 */}
      <div className="p-3 border-b-[var(--card-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-[var(--gold)]" />
          <h3 className="text-sm font-bold text-[var(--gold)]">推理演示</h3>
        </div>
        <span className="text-[10px] text-[var(--foreground)]/30">
          {hasActiveTask ? '分析中' : isPaused ? '已暂停' : '自动演示中'}
        </span>
      </div>

      {/* 场景信息 */}
      <div className="p-3 border-b-[var(--card-border)] bg-[var(--card-accent)]/30">
        <h4 className="text-xs font-semibold text-[var(--foreground)]/80 mb-0.5">{scenario.title}</h4>
        <p className="text-[11px] text-[var(--foreground)]/40">{scenario.description}</p>
      </div>

      {/* 推理步骤 */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto sidebar-scroll">
        {visibleSteps.length === 0 && phase === 'step' && (
          <div className="flex items-center justify-center h-[120px]">
            <div className="text-center">
              <div className="flex justify-center gap-1 mb-2">
                <div className="w-2 h-2 rounded-full bg-[var(--gold)]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--gold)]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[var(--gold)]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[11px] text-[var(--foreground)]/30">准备开始推理...</p>
            </div>
          </div>
        )}

        {phase === 'pause' && (
          <div className="flex items-center justify-center h-[60px]">
            <p className="text-[11px] text-[var(--foreground)]/25">推理完成，5 秒后切换下一个场景...</p>
          </div>
        )}

        {visibleSteps.map((step, index) => (
          <div
            key={`${currentIndex}-${index}`}
            className="flex gap-2 items-start animate-fade-in"
          >
            <div className={`shrink-0 mt-0.5 ${step.color}`}>
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${step.color} bg-current/10`}>
                  {step.label}
                </span>
                <span className="text-[10px] text-[var(--foreground)]/25">第 {index + 1} 步</span>
              </div>
              <p className="text-[11px] text-[var(--foreground)]/60 leading-relaxed">{step.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function shuffleArray(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
