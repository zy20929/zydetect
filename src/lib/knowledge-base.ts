/**
 * 持久化知识库
 * 基于 JSON 文件，按类别分类存储知识条目
 * 每次分析完成后自动追加更新
 */

import { KnowledgeCategory, KnowledgeEntry } from './types';
import { KNOWLEDGE_CATEGORIES } from './knowledge-categories';
import fs from 'fs';
import path from 'path';

/** 知识库根目录 */
const KNOWLEDGE_DIR = path.join(process.cwd(), 'data', 'knowledge');

/** 获取分类文件路径 */
function getCategoryPath(category: KnowledgeCategory): string {
  return path.join(KNOWLEDGE_DIR, `${category}.json`);
}

/** 确保知识库目录存在 */
function ensureDir(): void {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

/** 读取单个分类知识库 */
export function readCategory(category: KnowledgeCategory): { entries: KnowledgeEntry[] } {
  ensureDir();
  const filePath = getCategoryPath(category);

  if (!fs.existsSync(filePath)) {
    return { entries: [] };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

/** 读取所有分类知识库 */
export function readAllCategories(): Record<KnowledgeCategory, { entries: KnowledgeEntry[] }> {
  const result = {} as Record<KnowledgeCategory, { entries: KnowledgeEntry[] }>;

  for (const category of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    result[category] = readCategory(category);
  }

  return result;
}

/** 读取知识库中所有条目（不限关键词，用于 AI 不可用时回退） */
export function readAllEntries(): KnowledgeEntry[] {
  const allKnowledge = readAllCategories();
  const results: KnowledgeEntry[] = [];

  for (const category of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    for (const entry of allKnowledge[category].entries) {
      results.push(entry);
    }
  }

  // 按置信度和分析次数排序
  return results
    .sort((a, b) => {
      const scoreA = a.confidence * 0.7 + Math.min(a.analysisCount / 10, 0.3);
      const scoreB = b.confidence * 0.7 + Math.min(b.analysisCount / 10, 0.3);
      return scoreB - scoreA;
    })
    .slice(0, 20);
}

/** 添加知识条目到指定分类 */
export function addEntry(category: KnowledgeCategory, entry: Omit<KnowledgeEntry, 'id' | 'analysisCount' | 'createdAt' | 'lastVerified'>): KnowledgeEntry {
  ensureDir();
  const filePath = getCategoryPath(category);

  // 读取现有数据
  let data = { entries: [] as KnowledgeEntry[] };
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      // 文件损坏，重新创建
      data = { entries: [] };
    }
  }

  // 创建新条目
  const newEntry: KnowledgeEntry = {
    ...entry,
    id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    analysisCount: 1,
    createdAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
  };

  // 检查是否已存在相似条目（基于关键词重叠）
  const existingIndex = data.entries.findIndex((e: KnowledgeEntry) => {
    const overlap = e.keywords.filter((k) => entry.keywords.includes(k)).length;
    return overlap >= 2; // 至少 2 个关键词重叠视为相似
  });

  if (existingIndex !== -1) {
    // 更新现有条目
    data.entries[existingIndex].analysisCount += 1;
    data.entries[existingIndex].lastVerified = new Date().toISOString();
    data.entries[existingIndex].confidence = Math.min(1, data.entries[existingIndex].confidence + 0.05);
    newEntry.id = data.entries[existingIndex].id;
    data.entries[existingIndex] = { ...data.entries[existingIndex], ...entry };
  } else {
    // 添加新条目
    data.entries.push(newEntry);
  }

  // 写入文件
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  return newEntry;
}

/** 批量添加知识条目 */
export function addEntries(category: KnowledgeCategory, entries: Omit<KnowledgeEntry, 'id' | 'analysisCount' | 'createdAt' | 'lastVerified'>[]): KnowledgeEntry[] {
  return entries.map((entry) => addEntry(category, entry));
}

/** 根据关键词检索相关知识 */
export function searchKnowledge(keywords: string[]): KnowledgeEntry[] {
  const allKnowledge = readAllCategories();
  const results: KnowledgeEntry[] = [];
  const seen = new Set<string>();

  for (const category of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    for (const entry of allKnowledge[category].entries) {
      if (seen.has(entry.id)) continue;

      // 计算关键词匹配度
      const matchCount = entry.keywords.filter((k) =>
        keywords.some((kw) => k.includes(kw) || kw.includes(k)),
      ).length;

      if (matchCount > 0) {
        seen.add(entry.id);
        results.push(entry);
      }
    }
  }

  // 按置信度和分析次数排序
  return results
    .sort((a, b) => {
      const scoreA = a.confidence * 0.7 + Math.min(a.analysisCount / 10, 0.3);
      const scoreB = b.confidence * 0.7 + Math.min(b.analysisCount / 10, 0.3);
      return scoreB - scoreA;
    })
    .slice(0, 15); // 最多返回 15 条
}

/** 更新条目的分析计数 */
export function incrementAnalysisCount(entryId: string, category: KnowledgeCategory): void {
  const filePath = getCategoryPath(category);
  if (!fs.existsSync(filePath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entry = data.entries.find((e: KnowledgeEntry) => e.id === entryId);
    if (entry) {
      entry.analysisCount += 1;
      entry.lastVerified = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch {
    // 静默失败
  }
}

/** 更新知识条目 */
export function updateEntry(entryId: string, category: KnowledgeCategory, updates: Partial<Pick<KnowledgeEntry, 'content' | 'keywords' | 'confidence'>>): boolean {
  const filePath = getCategoryPath(category);
  if (!fs.existsSync(filePath)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entry = data.entries.find((e: KnowledgeEntry) => e.id === entryId);
    if (entry) {
      if (updates.content !== undefined) entry.content = updates.content;
      if (updates.keywords !== undefined) entry.keywords = updates.keywords;
      if (updates.confidence !== undefined) entry.confidence = updates.confidence;
      entry.lastVerified = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 删除知识条目 */
export function deleteEntry(entryId: string, category: KnowledgeCategory): boolean {
  const filePath = getCategoryPath(category);
  if (!fs.existsSync(filePath)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const initialLength = data.entries.length;
    data.entries = data.entries.filter((e: KnowledgeEntry) => e.id !== entryId);

    if (data.entries.length < initialLength) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 获取知识库统计信息 */
export function getKnowledgeStats(): Record<KnowledgeCategory, { count: number; avgConfidence: number }> {
  const allKnowledge = readAllCategories();
  const stats = {} as Record<KnowledgeCategory, { count: number; avgConfidence: number }>;

  for (const category of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    const entries = allKnowledge[category].entries;
    const count = entries.length;
    const avgConfidence = count > 0
      ? entries.reduce((sum: number, e: KnowledgeEntry) => sum + e.confidence, 0) / count
      : 0;

    stats[category] = { count, avgConfidence };
  }

  return stats;
}

/** 初始化空知识库文件 */
export function initKnowledgeBase(): void {
  ensureDir();

  for (const category of Object.keys(KNOWLEDGE_CATEGORIES) as KnowledgeCategory[]) {
    const filePath = getCategoryPath(category);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({ entries: [] }, null, 2), 'utf-8');
    }
  }
}
