'use client';

import { DetectiveId, DetectiveReasoning, StepType } from '@/lib/types';
import { PERSONA_MAP } from '@/lib/constants';
import { useI18n } from '@/i18n/context';
import { Loader2, CheckCircle, Download, Copy, Check, Combine, AlertTriangle, BookOpen, Brain, FileText, MessageSquare, Clock, Share2, Image as ImageIcon, Swords } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { remarkHighlightTags } from '@/lib/remark-highlight-tags';
import { useAnalysisStore } from '@/store/analysis-store';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/layout/toast';
import KnowledgePanel from './knowledge-panel';
import ReasoningTimeline from './reasoning-timeline';
import ReasoningMindMap from './reasoning-mindmap';
import ReasoningProgressIndicator from './reasoning-progress-indicator';
import ChatWindow from './chat-window';
import AnalysisDisclaimer from './disclaimer';
import DetectiveDuel from './detective-duel';
import ReportFeedback from './report-feedback';

/** 格式化时间为秒 */
function formatSeconds(seconds: number, t: (key: string) => string): string {
  if (seconds < 60) return `${Math.round(seconds)}${t('progress.secondsUnit')}`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}${t('progress.minutesUnit')}${s}${t('progress.secondsUnit')}`;
}

/** 分析阶段指示器（含组团模式进度条和 ETA） */
function AnalysisProgress() {
  const { t } = useI18n();
  const { isAnalyzing, isSynthesizing, finalReport, detectives, mode, analysisStartTime, selectedPersonas } = useAnalysisStore();
  const detectiveList = Object.values(detectives) as DetectiveReasoning[];
  const detectivesDone = detectiveList.filter(d => d.status === 'complete').length;
  const [elapsed, setElapsed] = useState(0);

  // 实时更新已用时间
  useEffect(() => {
    if (!analysisStartTime) return;
    const timer = setInterval(() => {
      setElapsed((Date.now() - analysisStartTime) / 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [analysisStartTime]);

  // 计算 ETA
  const isGroupMode = mode === 'group' && detectiveList.length > 1;
  let eta = '';
  if (isAnalyzing && analysisStartTime && detectivesDone > 0 && isGroupMode) {
    const avgTimePerDetective = elapsed / detectivesDone;
    const remaining = detectiveList.length - detectivesDone;
    const etaSeconds = avgTimePerDetective * remaining;
    eta = `${t('progress.etaLabel')} ${formatSeconds(etaSeconds, t)}`;
  }

  if (!isAnalyzing && !finalReport) return null;

  const phases = [
    { label: t('analysis.phases.knowledge'), done: !isAnalyzing || finalReport ? true : detectivesDone > 0 },
    { label: t('analysis.phases.detective'), done: !isAnalyzing || finalReport ? true : detectivesDone === detectiveList.length && detectiveList.length > 0 },
    { label: t('analysis.phases.synthesis'), done: !isAnalyzing || finalReport ? true : finalReport !== '' },
    { label: t('analysis.phases.report'), done: !!finalReport },
  ];

  return (
    <div className="analysis-progress flex items-center gap-2 sm:gap-3 py-2 px-1 flex-wrap">
      {phases.map((phase, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
            phase.done ? 'bg-[var(--gold)] text-[var(--card-alt)]' : 'border border-[var(--gold)]/30 text-[var(--gold)]/40'
          }`}>
            {phase.done ? <Check size={10} /> : i + 1}
          </div>
          <span className={`text-[11px] hidden sm:inline ${phase.done ? 'text-[var(--gold)]' : 'text-[var(--foreground)]/30'}`}>
            {phase.label}
          </span>
          {i < phases.length - 1 && <div className={`w-4 h-px ${phase.done ? 'bg-[var(--gold)]/50' : 'bg-[var(--card-border)]'}`} />}
        </div>
      ))}

      {/* 已用时间 */}
      {isAnalyzing && (
        <div className="flex items-center gap-1 ml-2 text-[11px] text-[var(--foreground)]/40">
          <Clock size={10} />
          <span>{formatSeconds(elapsed, t)}</span>
        </div>
      )}

      {/* 组团模式：侦探进度条 */}
      {isGroupMode && isAnalyzing && (
        <div className="flex items-center gap-2 ml-3">
          <div className="w-20 h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] rounded-full transition-all duration-500"
              style={{ width: `${(detectivesDone / detectiveList.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-[var(--gold)]/70">{detectivesDone}/{detectiveList.length}</span>
          {eta && <span className="text-[11px] text-[var(--foreground)]/40">{eta}</span>}
        </div>
      )}

      {/* 单人模式：侦探状态 */}
      {!isGroupMode && isAnalyzing && detectiveList.length === 1 && detectiveList[0].status === 'streaming' && (
        <span className="text-[11px] text-[var(--gold)]/50 ml-2">{t('analysis.reasoning')}</span>
      )}
    </div>
  );
}

/** 单个侦探推理面板 */
function DetectivePanel({ detective }: { detective: DetectiveReasoning }) {
  const { t } = useI18n();
  const persona = PERSONA_MAP[detective.detectiveId];
  if (!persona) return null;

  const hasSteps = detective.steps.length > 0;
  const hasFullText = detective.fullText.length > 0;
  const [viewMode, setViewMode] = useState<'timeline' | 'mindmap'>('mindmap');

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden animate-fade-in flex flex-col">
      {/* 头部 */}
      <div className="p-3 border-b-[var(--card-border)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[var(--gold)] truncate">{persona.nameZh}</h3>
            <p className="text-xs text-[var(--foreground)]/40 truncate">{persona.title}</p>
          </div>
          {detective.status === 'streaming' && (
            <div className="flex items-center gap-2 text-sm text-[var(--foreground)]/50 shrink-0 ml-2">
              <Loader2 size={16} className="animate-spin" />
              {t('analysis.reasoning')}
            </div>
          )}
          {detective.status === 'complete' && (
            <div className="flex items-center gap-1 text-sm text-emerald-400 shrink-0 ml-2">
              <CheckCircle size={16} />
              {t('analysis.complete')}
            </div>
          )}
        </div>
      </div>

      {/* 实时推理文字流（流式显示，优先于时间线） */}
      {detective.status === 'streaming' && hasFullText && (
        <div className="p-3 border-b-[var(--card-border)]">
          <div className="flex items-center gap-1.5 mb-2 text-[var(--gold)]/60">
            <Brain size={12} />
            <span className="text-xs font-medium">{t('analysis.liveReasoning')}</span>
          </div>
          <div className="text-sm text-[var(--foreground)]/70 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
            {detective.fullText}
            <span className="inline-block w-2 h-4 bg-[var(--gold)] animate-pulse ml-0.5" />
          </div>
        </div>
      )}

      {/* 推理时间线/思维导图（完成后展示结构化步骤） */}
      {detective.status === 'complete' && hasSteps && (
        <div className="p-3 flex-1 overflow-hidden">
          {/* 视图切换 */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setViewMode('mindmap')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                  : 'text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60 hover:bg-[var(--card-border)]'
              }`}
            >
              {t('analysis.mindmap')}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-[var(--gold)] text-[var(--card-alt)]'
                  : 'text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60 hover:bg-[var(--card-border)]'
              }`}
            >
              {t('analysis.timeline')}
            </button>
          </div>

          {viewMode === 'mindmap' ? (
            <ReasoningMindMap
              steps={detective.steps}
              detectiveName={persona.nameZh}
              detectiveColor={persona.accentColor}
            />
          ) : (
            <ReasoningTimeline
              steps={detective.steps}
              detectiveName={persona.nameZh}
              detectiveColor={persona.accentColor}
              isStreaming={false}
            />
          )}
        </div>
      )}

      {/* 等待开始 */}
      {detective.status === 'pending' && (
        <div className="p-3 flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--foreground)]/40 italic">{t('analysis.waiting')}</p>
        </div>
      )}
    </div>
  );
}

/** 综合推理展示区（组团模式） */
function SynthesisSection() {
  const { t } = useI18n();
  const { synthesisText, isSynthesizing } = useAnalysisStore();

  if (!synthesisText && !isSynthesizing) return null;

  return (
    <div className="rounded-xl border border-[var(--gold)]/30 overflow-hidden animate-fade-in">
      <div className="p-3 bg-[var(--card-bg)] border-b-[var(--gold)]/30 flex items-center gap-2">
        <Combine size={16} className="text-[var(--gold)]" />
        <h3 className="font-bold text-[var(--gold)] text-sm">{t('analysis.synthesisReasoning')}</h3>
        {isSynthesizing && (
          <div className="flex items-center gap-1 text-xs text-[var(--gold)]/70 ml-auto">
            <Loader2 size={14} className="animate-spin" />
            {t('analysis.reasoning')}
          </div>
        )}
      </div>
      <div className="p-4 prose prose-sm max-w-none prose-invert text-[var(--foreground)]">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkHighlightTags]} rehypePlugins={[rehypeRaw]}>{synthesisText}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function AnalysisView() {
  const { t } = useI18n();
  const { detectives, finalReport, isAnalyzing, error, selectedPersonas, mode, isSynthesizing, knowledgeState } =
    useAnalysisStore();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const { toast } = useToast();

  // 从 localStorage 加载字体大小
  useEffect(() => {
    try {
      const fs = localStorage.getItem('report-font-size');
      if (fs) setFontSize(parseInt(fs));
    } catch {}
  }, []);

  const detectiveList = Object.values(detectives) as DetectiveReasoning[];
  const isSolo = mode === 'solo';

  /** 下载 Markdown 报告 */
  const handleDownload = () => {
    if (!finalReport) return;
    const names = selectedPersonas.map((p) => PERSONA_MAP[p]?.nameZh).join('_');
    const blob = new Blob([finalReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('report.filename', names)}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('report.toastExported'), 'success');
  };

  /** 复制到剪贴板 */
  const handleCopy = async () => {
    if (!finalReport) return;
    try {
      await navigator.clipboard.writeText(finalReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast(t('report.toastCopied'), 'success');
    } catch {
      toast(t('report.toastCopyFailed'), 'error');
    }
  };

  /** 导出为长图 (PNG) */
  const handleExportImage = async () => {
    if (!finalReport) return;
    toast(t('report.toastImageGenerating'), 'info');

    try {
      // 使用 html-to-image 或浏览器截图方案
      // 简化方案：创建一个隐藏的 div 来渲染报告并截图
      const reportEl = document.querySelector('.report-content');
      if (!reportEl) { toast(t('report.toastExportFailed'), 'error'); return; }

      // 使用 Canvas 方案
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { toast(t('report.toastExportFailed'), 'error'); return; }

      canvas.width = 800;
      canvas.height = Math.max(600, finalReport.length * 2);

      const cs = getComputedStyle(document.documentElement);
      ctx.fillStyle = cs.getPropertyValue('--background').trim() || '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = cs.getPropertyValue('--foreground').trim() || '#e8e6e3';
      ctx.font = `${fontSize}px monospace`;

      const lines = finalReport.split('\n');
      let y = 30;
      for (const line of lines) {
        ctx.fillText(line.slice(0, 80), 20, y);
        y += fontSize * 1.5;
        if (y > canvas.height - 20) {
          canvas.height += 400;
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) { toast(t('report.toastExportFailed'), 'error'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${t('report.filename', '侦探推理')}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast(t('report.toastImageExported'), 'success');
      }, 'image/png');
    } catch {
      toast(t('report.toastExportFailedFallback'), 'error');
    }
  };

  /** 分享（调用系统分享） */
  const handleShare = async () => {
    if (!finalReport) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('report.title'),
          text: finalReport.slice(0, 500),
        });
      } catch {
        // 用户取消
      }
    } else {
      handleCopy();
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
        <div className="p-3 border-b-[var(--card-border)] flex items-center gap-2">
          <Brain size={16} className="text-[var(--gold)]" />
          <h3 className="text-sm font-bold text-[var(--gold)]">{t('home.step3')}</h3>
        </div>
        <div className="p-6 bg-red-950/50 text-red-300">
          <p className="font-medium">{t('analysis.error')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (detectiveList.length === 0 && !finalReport && !isSynthesizing) return null;

  const hasKnowledgeContent = knowledgeState.isSearching || knowledgeState.keywords.length > 0 || knowledgeState.externalKnowledge.length > 0 || knowledgeState.localKnowledge.length > 0 || knowledgeState.aiAvailable === false;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
      {/* 标题栏 */}
      <div className="p-3 border-b-[var(--card-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-[var(--gold)]" />
          <h3 className="text-sm font-bold text-[var(--gold)]">{t('home.step3')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && <AnalysisProgress />}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* 可视化推理进度（分析进行中时优先展示） */}
        {(isAnalyzing || isSynthesizing) && <ReasoningProgressIndicator />}

        {/* 知识检索面板（仅在有内容时显示） */}
        {hasKnowledgeContent && <KnowledgePanel />}

        {/* 侦探推理面板 */}
        {detectiveList.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground)]/40">
              <Brain size={12} />
              <span className="text-xs font-medium">{t('analysis.reasoningProcess')}</span>
            </div>
            <div className={isSolo ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
              {detectiveList.map((d) => (
                <DetectivePanel key={d.detectiveId} detective={d} />
              ))}
            </div>
          </div>
        )}

        {/* 综合推理（仅组团模式） */}
        {mode === 'group' && <SynthesisSection />}

        {/* 侦探对决（组团模式且恰好 2 位侦探） */}
        {mode === 'group' && detectiveList.length === 2 && detectiveList[0].status === 'complete' && detectiveList[1].status === 'complete' && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground)]/40">
              <Swords size={12} />
              <span className="text-xs font-medium">{t('analysis.duel')}</span>
            </div>
            <DetectiveDuel detectiveA={detectiveList[0]} detectiveB={detectiveList[1]} />
          </div>
        )}

        {/* 最终报告 */}
        {finalReport && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground)]/40">
              <FileText size={12} />
              <span className="text-xs font-medium">{t('report.title')}</span>
            </div>
            <div className="rounded-xl border border-[var(--card-border)] overflow-hidden">
              <div className="p-2 sm:p-3 bg-[var(--card-accent)]/30 border-b-[var(--card-border)] flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
                <h2 className="font-bold text-[var(--gold)] text-xs sm:text-sm">{t('analysis.report')}</h2>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {/* 字体大小调节 */}
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                      className="p-1 rounded text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60 transition-colors"
                      title={t('report.fontSmaller')}
                    >
                      <FileText size={12} />
                    </button>
                    <span className="text-[10px] text-[var(--foreground)]/30 w-5 text-center font-mono">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                      className="p-1 rounded text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60 transition-colors"
                      title={t('report.fontLarger')}
                    >
                      <FileText size={14} />
                    </button>
                  </div>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-medium rounded-lg border-[var(--card-border)] hover:bg-[var(--card-bg)] transition-colors text-[var(--foreground)]/70"
                    title={t('report.share')}
                  >
                    <Share2 size={12} />
                    <span className="hidden sm:inline">{t('report.share')}</span>
                  </button>
                  <button
                    onClick={handleExportImage}
                    className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-medium rounded-lg border-[var(--card-border)] hover:bg-[var(--card-bg)] transition-colors text-[var(--foreground)]/70"
                    title={t('report.exportImage')}
                  >
                    <ImageIcon size={12} />
                    <span className="hidden sm:inline">{t('report.exportImage')}</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-lg border-[var(--card-border)] hover:bg-[var(--card-bg)] transition-colors text-[var(--foreground)]/70"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span className="hidden sm:inline">{copied ? t('report.copied') : t('report.copy')}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-lg bg-[var(--gold)] text-[var(--card-alt)] hover:bg-[var(--gold-dim)] transition-colors"
                  >
                    <Download size={12} />
                    <span className="hidden sm:inline">{t('report.exportMD')}</span>
                  </button>
                </div>
              </div>
              <div
                className="report-content p-4 prose prose-sm max-w-none prose-invert"
                style={{ fontSize: `${fontSize}px` }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkHighlightTags]} rehypePlugins={[rehypeRaw]}>{finalReport}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* 对话交互窗口 */}
        {finalReport && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[var(--foreground)]/40">
              <MessageSquare size={12} />
              <span className="text-xs font-medium">{t('analysis.interactiveChat')}</span>
            </div>
            <ChatWindow />
          </div>
        )}

        {/* 反馈评分 */}
        {finalReport && (
          <ReportFeedback
            reportId={selectedPersonas.join('_')}
            onFeedback={(rating, comment) => {
              useAnalysisStore.getState().submitFeedback(selectedPersonas.join('_'), rating, comment);
              toast(t('feedback.thankYou'), 'success');
            }}
          />
        )}

        {/* 免责声明 */}
        {finalReport && <AnalysisDisclaimer />}
      </div>
    </div>
  );
}
