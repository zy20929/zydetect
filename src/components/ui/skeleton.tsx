'use client';

import { Brain } from 'lucide-react';

/** 分析卡片骨架屏 — 替代加载 spinner */
export function AnalysisSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden animate-pulse">
      {/* 头部 */}
      <div className="p-3 border-b-[var(--card-border)] flex items-center gap-2">
        <Brain size={16} className="text-[var(--gold)]/40" />
        <div className="h-4 w-24 bg-[var(--card-border)] rounded" />
      </div>
      {/* 内容 */}
      <div className="p-4 space-y-3">
        <div className="h-3 w-3/4 bg-[var(--card-border)] rounded" />
        <div className="h-3 w-full bg-[var(--card-border)] rounded" />
        <div className="h-3 w-5/6 bg-[var(--card-border)] rounded" />
        <div className="h-3 w-2/3 bg-[var(--card-border)] rounded" />
        <div className="h-3 w-full bg-[var(--card-border)] rounded" />
      </div>
    </div>
  );
}

/** 侦探卡片骨架屏 — 侧边栏加载占位 */
export function PersonaSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--card-border)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-[var(--card-border)] rounded" />
              <div className="h-3 w-32 bg-[var(--card-border)] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 报告内容骨架屏 */
export function ReportSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden animate-pulse">
      <div className="p-3 border-b-[var(--card-border)]">
        <div className="h-4 w-32 bg-[var(--card-border)] rounded" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-1/4 bg-[var(--card-border)] rounded" />
            <div className="h-3 w-full bg-[var(--card-border)] rounded" />
            <div className="h-3 w-5/6 bg-[var(--card-border)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
