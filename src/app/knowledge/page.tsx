'use client';

import { useState, useEffect } from 'react';
import { KNOWLEDGE_CATEGORIES } from '@/lib/knowledge-categories';
import { Loader2, Database, TrendingUp, Search, Trash2, RefreshCw, Edit3, Save, X, Plus } from 'lucide-react';
import { useI18n } from '@/i18n/context';

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  source: string;
  confidence: number;
  analysisCount: number;
  createdAt: string;
  lastVerified: string;
}

interface CategoryData {
  entries: KnowledgeEntry[];
}

export default function KnowledgeDashboard() {
  const { t } = useI18n();
  const [knowledge, setKnowledge] = useState<Record<string, CategoryData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({ content: '', keywords: '', confidence: 0.8, category: 'geography' as string });

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/knowledge');
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data);
      }
    } catch {
      // 知识库可能还未初始化
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  // 删除条目
  const handleDelete = async (entryId: string, category: string) => {
    if (!confirm(t('knowledge.deleteConfirm'))) return;
    try {
      await fetch('/api/v1/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, category }),
      });
      loadKnowledge();
      if (selectedEntry?.id === entryId) { setSelectedEntry(null); setIsEditing(false); }
    } catch {
      // 静默失败
    }
  };

  // 保存编辑
  const handleSave = async () => {
    if (!selectedEntry) return;
    try {
      await fetch('/api/v1/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: selectedEntry.id,
          category: selectedEntry.category,
          content: editForm.content,
          keywords: editForm.keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean),
          confidence: Math.min(1, Math.max(0, editForm.confidence)),
        }),
      });
      loadKnowledge();
      setIsEditing(false);
      setSelectedEntry(null);
    } catch {}
  };

  // 添加条目
  const handleAdd = async () => {
    try {
      await fetch('/api/v1/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editForm.category,
          content: editForm.content,
          keywords: editForm.keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean),
          confidence: Math.min(1, Math.max(0, editForm.confidence)),
          source: t('knowledge.manualAdd'),
        }),
      });
      loadKnowledge();
      setIsAdding(false);
    } catch {}
  };

  // 打开编辑
  const openEdit = (entry: KnowledgeEntry) => {
    setEditForm({
      content: entry.content,
      keywords: entry.keywords.join(', '),
      confidence: entry.confidence,
      category: entry.category,
    });
    setIsEditing(true);
  };

  // 统计
  const totalEntries = Object.values(knowledge).reduce(
    (sum, cat) => sum + cat.entries.length,
    0,
  );
  const avgConfidence = totalEntries > 0
    ? Object.values(knowledge)
        .flatMap((cat) => cat.entries)
        .reduce((sum, e) => sum + e.confidence, 0) / totalEntries
    : 0;

  // 过滤条目
  const allEntries = Object.entries(knowledge)
    .flatMap(([category, data]) =>
      data.entries.map((e) => ({ ...e, _category: category })),
    )
    .filter((e) => {
      if (activeTab !== 'all' && e._category !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.content.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => b.confidence * b.analysisCount - a.confidence * a.analysisCount);

  if (selectedEntry) {
    const cat = KNOWLEDGE_CATEGORIES[selectedEntry.category as keyof typeof KNOWLEDGE_CATEGORIES];

    if (isEditing) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => { setIsEditing(false); setSelectedEntry(null); }}
            className="mb-4 text-sm text-[var(--gold)] hover:text-[var(--gold-dim)]"
          >
            ← {t('knowledge.back')}
          </button>
          <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden">
            <div className="p-4 bg-[var(--card-bg)] border-b-[var(--card-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-[var(--gold)]" />
                <h2 className="font-bold text-[var(--gold)]">{t('knowledge.editTitle')}</h2>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-[var(--foreground)]/40 hover:text-[var(--foreground)]/60">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.category')}</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] text-sm"
                >
                  {Object.entries(KNOWLEDGE_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.content')}</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.keywords')}</label>
                <input
                  type="text"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.confidence')}: {(editForm.confidence * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0" max="100"
                  value={editForm.confidence * 100}
                  onChange={(e) => setEditForm({ ...editForm, confidence: parseInt(e.target.value) / 100 })}
                  className="mt-1 w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-[var(--gold)] text-[var(--card-alt)] rounded-lg hover:bg-[var(--gold-dim)]"
                >
                  <Save size={14} /> {t('common.save')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-[var(--foreground)]/60 border border-[var(--card-border)] rounded-lg hover:bg-[var(--card-bg)]"
                >
                  <X size={14} /> {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => { setSelectedEntry(null); setIsEditing(false); }}
          className="mb-4 text-sm text-[var(--gold)] hover:text-[var(--gold-dim)]"
        >
          ← 返回知识库
        </button>
        <div className="rounded-xl border-2 border-[var(--card-border)] overflow-hidden">
          <div className="p-4 bg-[var(--card-bg)] border-b-[var(--card-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat?.icon}</span>
              <h2 className="font-bold text-[var(--gold)]">{cat?.label || selectedEntry.category}</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.content')}</h3>
              <p className="mt-1 text-[var(--foreground)]">{selectedEntry.content}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.keywords')}</h3>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedEntry.keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[var(--card-accent)] text-[var(--gold)] rounded-full text-xs border border-[var(--card-border)]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.confidence')}</h3>
                <p className="mt-1 text-lg font-bold dark:text-emerald-400 text-emerald-600">
                  {(selectedEntry.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.citations', selectedEntry.analysisCount)}</h3>
                <p className="mt-1 text-lg font-bold dark:text-blue-400 text-blue-600">
                  {selectedEntry.analysisCount}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.source')}</h3>
                <p className="mt-1 text-sm text-[var(--foreground)]/60 truncate">{selectedEntry.source}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => openEdit(selectedEntry)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--gold)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:border-[var(--gold)]/50"
              >
                <Edit3 size={14} /> {t('common.edit')}
              </button>
              <button
                onClick={() => handleDelete(selectedEntry.id, selectedEntry.category)}
                className="flex items-center gap-1 px-3 py-2 text-sm dark:text-red-400 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-[var(--gold)] mb-6">{t('knowledge.dashboard')}</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border dark:bg-gradient-to-br dark:from-blue-950/50 dark:to-[var(--card-bg)] dark:border-blue-800/30 bg-gradient-to-br from-[var(--gold)]/10 to-[var(--card-bg)] border-[var(--gold)]/20">
          <div className="flex items-center gap-2">
            <Database className="dark:text-blue-400 text-[var(--gold-dim)]" size={20} />
            <span className="text-sm font-medium dark:text-blue-300 text-[var(--gold)]">{t('knowledge.entries')}</span>
          </div>
          <p className="text-3xl font-bold dark:text-blue-200 text-[var(--gold)] mt-2">{totalEntries}</p>
        </div>
        <div className="p-4 rounded-xl border dark:bg-gradient-to-br dark:from-emerald-950/50 dark:to-[var(--card-bg)] dark:border-emerald-800/30 bg-gradient-to-br from-emerald-600/10 to-[var(--card-bg)] border-emerald-600/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="dark:text-emerald-400 text-emerald-600" size={20} />
            <span className="text-sm font-medium dark:text-emerald-300 text-emerald-700">{t('knowledge.avgConfidence')}</span>
          </div>
          <p className="text-3xl font-bold dark:text-emerald-200 text-emerald-700 mt-2">
            {(avgConfidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-4 rounded-xl border dark:bg-gradient-to-br dark:from-purple-950/50 dark:to-[var(--card-bg)] dark:border-purple-800/30 bg-gradient-to-br from-purple-600/10 to-[var(--card-bg)] border-purple-600/20">
          <div className="flex items-center gap-2">
            <Database className="dark:text-purple-400 text-purple-600" size={20} />
            <span className="text-sm font-medium dark:text-purple-300 text-purple-700">{t('knowledge.categoryCount')}</span>
          </div>
          <p className="text-3xl font-bold dark:text-purple-200 text-purple-700 mt-2">
            {Object.keys(knowledge).length}
          </p>
        </div>
      </div>

      {/* 分类统计 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-[var(--foreground)]/70 mb-3">{t('knowledge.categoryStats')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(KNOWLEDGE_CATEGORIES).map(([key, cat]) => {
            const count = knowledge[key]?.entries.length || 0;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(activeTab === key ? 'all' : key)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  activeTab === key
                    ? 'border-[var(--gold)]/50 bg-[var(--card-bg)]'
                    : 'border-[var(--card-border)] hover:border-[var(--gold)]/30 bg-[var(--card-bg)]/50'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="text-xs text-[var(--foreground)]/40 mt-1">{cat.label}</p>
                <p className="text-lg font-bold text-[var(--foreground)] mt-1">{count}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索和刷新 */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)]/30" size={18} />
          <input
            type="text"
            placeholder={t('knowledge.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 placeholder:text-[var(--foreground)]/30"
          />
        </div>
        <button
          onClick={loadKnowledge}
          className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--card-bg)] flex items-center gap-1 text-[var(--foreground)]/70"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('knowledge.refresh')}
        </button>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditForm({ content: '', keywords: '', confidence: 0.8, category: 'geography' });
          }}
          className="px-4 py-2 rounded-lg bg-[var(--gold)] text-[var(--card-alt)] text-sm font-medium flex items-center gap-1 hover:bg-[var(--gold-dim)]"
        >
          <Plus size={16} /> {t('knowledge.add')}
        </button>
      </div>

      {/* 添加条目弹窗 */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsAdding(false)}>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--gold)] mb-4">{t('knowledge.addTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.category')}</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-sm"
                >
                  {Object.entries(KNOWLEDGE_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.content')}</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-sm resize-none"
                  placeholder={t('knowledge.contentPlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.keywords')}</label>
                <input
                  type="text"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-sm"
                  placeholder={t('knowledge.keywordsPlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]/50">{t('knowledge.confidence')}: {(editForm.confidence * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0" max="100"
                  value={editForm.confidence * 100}
                  onChange={(e) => setEditForm({ ...editForm, confidence: parseInt(e.target.value) / 100 })}
                  className="mt-1 w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-[var(--gold)] text-[var(--card-alt)] rounded-lg hover:bg-[var(--gold-dim)]"
                >
                  <Save size={14} /> {t('knowledge.add')}
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-[var(--foreground)]/60 border border-[var(--card-border)] rounded-lg hover:bg-[var(--card-bg)]"
                >
                  <X size={14} /> {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 知识条目列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--foreground)]/30" />
          <span className="ml-2 text-[var(--foreground)]/40">{t('knowledge.loading')}</span>
        </div>
      ) : allEntries.length === 0 ? (
        <div className="text-center py-12 text-[var(--foreground)]/40">
          <Database size={40} className="mx-auto mb-3" />
          <p>{t('knowledge.noEntries')}</p>
          <p className="text-sm mt-1">{t('knowledge.noEntriesHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEntries.map((entry) => {
            const cat = KNOWLEDGE_CATEGORIES[entry.category as keyof typeof KNOWLEDGE_CATEGORIES];
            return (
              <div
                key={entry.id}
                className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-all cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{cat?.icon}</span>
                      <span className="text-xs text-[var(--foreground)]/40">{cat?.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          entry.confidence >= 0.8
                            ? 'dark:bg-emerald-900/50 dark:text-emerald-300 bg-emerald-100 text-emerald-700'
                            : entry.confidence >= 0.5
                              ? 'dark:bg-amber-900/50 dark:text-amber-300 bg-amber-100 text-amber-700'
                              : 'dark:bg-red-900/50 dark:text-red-300 bg-red-100 text-red-700'
                        }`}
                      >
                        {(entry.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground)]/70">{entry.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[var(--card-border)] text-[var(--foreground)]/50 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--foreground)]/40 ml-4 shrink-0">
                    <span>{t('knowledge.citations', entry.analysisCount)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.id, entry.category);
                      }}
                      className="p-1 dark:hover:text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
