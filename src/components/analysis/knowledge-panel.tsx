'use client';

import { useAnalysisStore } from '@/store/analysis-store';
import { KNOWLEDGE_CATEGORIES } from '@/lib/knowledge-categories';
import { useI18n } from '@/i18n/context';
import { Loader2, Globe, Search, BookOpen, Database } from 'lucide-react';

export default function KnowledgePanel() {
  const { t } = useI18n();
  const { knowledgeState } = useAnalysisStore();
  const { isSearching, keywords, searchingSource, externalKnowledge, localKnowledge, aiAvailable } = knowledgeState;

  // 推理引擎不可用时，只要知识库有内容就展示
  const showWhenEngineUnavailable = aiAvailable === false && localKnowledge.length > 0;
  // 推理引擎可用时，原有逻辑
  const showWhenEngineAvailable = (!isSearching && keywords.length === 0 && externalKnowledge.length === 0 && localKnowledge.length === 0)
    ? false
    : true;

  if (!showWhenEngineAvailable && !showWhenEngineUnavailable) {
    return null;
  }

  return (
    <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden">
      <div className="p-4 bg-[var(--card-bg)] border-b border-[var(--card-border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--gold)]" />
          <h3 className="font-bold text-[var(--gold)]">{t('knowledgePanel.title')}</h3>
          {isSearching && (
            <div className="flex items-center gap-2 text-sm text-[var(--gold)]/70 ml-auto">
              <Loader2 size={14} className="animate-spin" />
              {searchingSource === 'wikipedia' && t('knowledgePanel.searchingWikipedia')}
              {searchingSource === 'duckduckgo' && t('knowledgePanel.searchingDuckDuckGo')}
              {!searchingSource && t('knowledgePanel.extractingKeywords')}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 推理引擎不可用提示 */}
        {aiAvailable === false && (
          <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-950/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-medium text-orange-300">{t('knowledgePanel.engineUnavailable')}</span>
            </div>
            <p className="text-xs text-[var(--foreground)]/50 ml-7">
              {t('knowledgePanel.engineUnavailableDesc')}
            </p>
          </div>
        )}

        {/* 关键词 */}
        {keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]/70 mb-2">
              <Search size={14} className="text-[var(--foreground)]/40" />
              {t('knowledgePanel.extractKeywords')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-[var(--card-accent)] text-[var(--gold)] rounded-full text-xs font-medium border border-[var(--card-border)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 外部知识（Wikipedia + DuckDuckGo） */}
        {externalKnowledge.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]/70 mb-2">
              <Globe size={14} className="text-blue-400" />
              {t('knowledgePanel.authoritativeSources')}
            </div>
            <div className="space-y-2">
              {externalKnowledge.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.source === 'wikipedia'
                          ? 'bg-[var(--card-border)] text-[var(--foreground)]/70'
                          : 'bg-orange-900/50 text-orange-300'
                      }`}
                    >
                      {item.source === 'wikipedia' ? 'Wikipedia' : 'DuckDuckGo'}
                    </span>
                    <span className="text-sm font-medium text-[var(--foreground)]">{item.title}</span>
                    {item.relevance === 'high' && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-900/50 text-emerald-300">
                        {t('knowledgePanel.highRelevance')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--foreground)]/60 leading-relaxed">{item.summary}</p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--gold)] hover:text-[var(--gold-dim)]"
                    >
                      <Globe size={10} />
                      {t('knowledgePanel.viewSource')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 本地知识库 */}
        {localKnowledge.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]/70 mb-2">
              <Database size={14} className="text-purple-400" />
              {t('knowledgePanel.localKnowledge')}
            </div>
            <div className="space-y-2">
              {localKnowledge.map((item) => {
                const cat = KNOWLEDGE_CATEGORIES[item.category as keyof typeof KNOWLEDGE_CATEGORIES];
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{cat?.icon}</span>
                      <span className="text-xs text-[var(--foreground)]/50">{cat?.label || item.category}</span>
                      <span className="text-xs text-[var(--foreground)]/40">
                        {t('knowledge.confidence')} {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--foreground)]/60 leading-relaxed">{item.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!isSearching &&
          keywords.length === 0 &&
          externalKnowledge.length === 0 &&
          localKnowledge.length === 0 && (
            <p className="text-sm text-[var(--foreground)]/40 italic text-center py-4">
              {t('knowledgePanel.analyzingImage')}
            </p>
          )}
      </div>
    </div>
  );
}
