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
import ErrorBoundary from '@/components/ui/error-boundary';
import { AnalysisSkeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { startAnalysis } = useAnalysis();
  const { imageDataUrls, selectedPersonas, isAnalyzing, finalReport, error } = useAnalysisStore();
  const { t } = useI18n();
  const [hasStarted, setHasStarted] = useState(false);

  // 当图片被清空或取消/出错时，重置"已推理"状态
  useEffect(() => {
    if (imageDataUrls.length === 0 && !isAnalyzing && !finalReport) {
      setHasStarted(false);
    }
  }, [imageDataUrls.length, isAnalyzing, finalReport]);

  useEffect(() => {
    loadHistoryFromStorage();
  }, []);

  const canStart = Boolean(imageDataUrls.length > 0 && selectedPersonas.length > 0 && !isAnalyzing);

  const handleStart = async () => {
    if (!canStart) return;
    setHasStarted(true);
    await startAnalysis();
  };

  return (
    <div className="min-h-screen pb-12">
      {/* 顶部横幅 */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[var(--card-accent)] via-[var(--card-bg)] to-[var(--card-alt)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 装饰图标 — 桌面端显示，移动端隐藏 */}
          <div className="hidden sm:block absolute top-4 left-1/4 text-[var(--gold)]/5">
            <Search size={120} strokeWidth={0.5} />
          </div>
          <div className="hidden sm:block absolute top-8 right-1/3 text-[var(--gold)]/5">
            <MapPin size={80} strokeWidth={0.5} />
          </div>
          <div className="hidden sm:block absolute bottom-4 left-1/2 text-[var(--gold)]/5">
            <Brain size={100} strokeWidth={0.5} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold)]/5 to-transparent w-1/3 animate-spotlight" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Sparkles className="text-[var(--gold)] animate-type-blink" size={20} />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-wide">
              {t('home.title')}
            </h2>
          </div>
          <p className="text-[var(--foreground)]/50 max-w-2xl mx-auto text-xs sm:text-sm px-2">
            {t('home.subtitle')}
          </p>
        </div>
      </div>

      {/* 主布局：上传区（全宽） + 侦探选择 + 结果 */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Step 1: 上传图片 - 全宽 */}
        <section>
          <h3 className="text-base sm:text-lg font-semibold text-[var(--gold)] mb-2 sm:mb-3 flex items-center gap-2">
            <MapPin size={16} />
            {t('home.step1')}
          </h3>
          <ImageUpload />
        </section>

        {/* Step 2: 选择侦探 + Step 3: 推理结果 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {/* 左侧：侦探选择 */}
          <div className="lg:col-span-1 min-h-[400px] lg:min-h-[500px]">
            <PersonaSidebar onStart={handleStart} canStart={canStart} isAnalyzing={isAnalyzing} />
          </div>

          {/* 右侧：推理演示/结果 */}
          <div className="lg:col-span-2 min-h-[400px] lg:min-h-[500px]">
            <div className="space-y-4 sm:space-y-6">
            {!hasStarted && !finalReport && <ReasoningDemo />}

            {(hasStarted || finalReport) && (
              <ErrorBoundary fallback={<AnalysisSkeleton />}>
                <AnalysisView />
              </ErrorBoundary>
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
