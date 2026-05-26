'use client';

import { useState, useEffect } from 'react';
import ImageUpload from '@/components/upload/image-upload';
import PersonaSidebar from '@/components/persona/persona-sidebar';
import AnalysisView from '@/components/analysis/analysis-view';
import ReasoningDemo from '@/components/demo/reasoning-demo';
import PrivacyNotice from '@/components/layout/privacy-notice';
import { useAnalysis } from '@/hooks/use-analysis';
import { useAnalysisStore, loadHistoryFromStorage } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { Loader2, Sparkles, Search, MapPin, Brain, Check } from 'lucide-react';

export default function Home() {
  const { startAnalysis } = useAnalysis();
  const { imageDataUrls, selectedPersonas, isAnalyzing, finalReport } = useAnalysisStore();
  const { t } = useI18n();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    loadHistoryFromStorage();
  }, []);

  const canStart = Boolean(imageDataUrls.length > 0 && selectedPersonas.length > 0 && !isAnalyzing);

  const handleStart = async () => {
    if (!canStart) return;
    setHasStarted(true);
    await startAnalysis();
  };

  // 步骤状态
  const step1Done = imageDataUrls.length > 0;
  const step2Done = selectedPersonas.length > 0;

  return (
    <div className="min-h-screen pb-12">
      {/* 顶部横幅 */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[var(--card-accent)] via-[var(--card-bg)] to-[var(--card-alt)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-1/4 text-[var(--gold)]/5">
            <Search size={120} strokeWidth={0.5} />
          </div>
          <div className="absolute top-8 right-1/3 text-[var(--gold)]/5">
            <MapPin size={80} strokeWidth={0.5} />
          </div>
          <div className="absolute bottom-4 left-1/2 text-[var(--gold)]/5">
            <Brain size={100} strokeWidth={0.5} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold)]/5 to-transparent w-1/3 animate-spotlight" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 py-8 text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="text-[var(--gold)] animate-type-blink" size={28} />
            <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-wide">
              {t('home.title')}
            </h2>
          </div>
          <p className="text-[var(--foreground)]/50 max-w-2xl mx-auto text-sm">
            {t('home.subtitle')}
          </p>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {[
              { num: '1', label: t('home.step1'), done: step1Done },
              { num: '2', label: t('home.step2'), done: step2Done },
              { num: '3', label: t('home.step3'), done: hasStarted || !!finalReport },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${step.done
                    ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                    : 'border border-[var(--gold)]/40 text-[var(--gold)]/60'}
                `}>
                  {step.done ? <Check size={14} /> : step.num}
                </div>
                <span className={`text-xs hidden sm:inline ${step.done ? 'text-[var(--gold)]' : 'text-[var(--foreground)]/40'}`}>
                  {step.label}
                </span>
                {i < 2 && <div className={`w-6 h-px ${step.done ? 'bg-[var(--gold)]' : 'bg-[var(--card-border)]'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主布局：上传区（全宽） + 侦探选择 + 结果 */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* Step 1: 上传图片 - 全宽 */}
        <section>
          <h3 className="text-lg font-semibold text-[var(--gold)] mb-3 flex items-center gap-2">
            <MapPin size={18} />
            {t('home.step1')}
          </h3>
          <ImageUpload />
        </section>

        {/* Step 2: 选择侦探 + Step 3: 推理结果 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* 左侧：侦探选择 */}
          <div className="lg:col-span-1 min-h-[500px]">
            <PersonaSidebar onStart={handleStart} canStart={canStart} isAnalyzing={isAnalyzing} />
          </div>

          {/* 右侧：推理演示/结果 */}
          <div className="lg:col-span-2 min-h-[500px]">
            <div className="space-y-6">
            {!hasStarted && !finalReport && <ReasoningDemo />}

            {(hasStarted || finalReport) && (
              <AnalysisView />
            )}
            </div>
          </div>
        </section>
      </div>

      {/* 隐私提示 */}
      <PrivacyNotice />
    </div>
  );
}
