/**
 * 分析服务层 — 承载所有业务逻辑：单人/组团推理、知识注入、步骤解析、知识提取
 */
import { streamClaudeVision, streamClaudeText, StreamCallbacks, checkModelAvailability } from '@/lib/claude';
import { getSystemPrompt } from '@/prompts';
import { DetectiveId, AnalysisMode } from '@/lib/types';
import { PERSONA_MAP } from '@/lib/constants';
import { gatherKnowledge } from '@/lib/knowledge';
import { searchKnowledge, readAllEntries, addEntries, initKnowledgeBase } from '@/lib/knowledge-base';
import type { KnowledgeEntry } from '@/lib/types';

// Re-export knowledge-base functions used by route controller
export { initKnowledgeBase, readAllEntries };

/* ===== 公共类型 ===== */
export interface SSECallbacks {
  enqueue: (data: unknown) => void;
  images: string[];
  personas: DetectiveId[];
  knowledgeContext: string;
  locale: string;
}

/* ===== 错误格式化 ===== */
export function formatApiError(raw: string): string {
  if (raw.includes('429') || raw.includes('rate_limit') || raw.includes('throttl')) {
    return '推理引擎繁忙，请求过于频繁，请稍后重试';
  }
  if (raw.includes('network') || raw.includes('ECONNREFUSED') || raw.includes('timeout')) {
    return '网络连接异常，请检查网络后重试';
  }
  if (raw.includes('401') || raw.includes('unauthorized')) {
    return 'API 密钥无效，请联系管理员';
  }
  if (raw.includes('500') || raw.includes('internal')) {
    return '服务器内部错误，请稍后重试';
  }
  const msg = raw.replace(/\{[\s\S]*\}/, '').trim();
  return msg || '分析过程出现异常，请稍后重试';
}

/* ===== 语言指令 ===== */
export function getLanguageInstruction(locale: string): string {
  switch (locale) {
    case 'en': return '\n\n## Language\nPlease respond entirely in English.';
    default: return '\n\n## 语言\n请使用简体中文回答。';
  }
}

/* ===== 知识库回退报告 ===== */
export function generateKnowledgeOnlyReport(
  personaIds: DetectiveId[],
  localKnowledge: KnowledgeEntry[],
  mode: AnalysisMode,
): string {
  const personaNames = personaIds.map((id) => PERSONA_MAP[id]?.nameZh || id).join('、');
  let report = `# 知识库推理报告\n\n`;
  report += `**推理模式**: ${mode === 'solo' ? '单人推理' : '组团推理'} | **参与侦探**: ${personaNames}\n\n`;

  if (localKnowledge.length === 0) {
    report += `⚠️ **当前知识库中没有可用的历史经验数据。**\n\n`;
    report += `由于推理引擎暂时不可用，且知识库中没有相关经验，无法生成推理报告。\n`;
    report += `建议：\n- 尝试先进行几次分析以积累知识库\n- 检查 API 配置是否正确\n- 稍后重试\n`;
    return report;
  }

  report += `> ⚠️ 推理引擎当前不可用，以下推理基于历史知识库中的经验数据。\n\n`;

  const grouped: Record<string, typeof localKnowledge> = {};
  for (const item of localKnowledge) {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const categoryLabels: Record<string, string> = {
    geography: '🌍 地理位置推断',
    architecture: '🏛️ 建筑特征分析',
    history: '📜 历史背景关联',
    psychology: '🧠 人物心理模式',
    environment: '🌿 自然环境特征',
    predictions: '🔮 事件预测',
  };

  report += `## 📊 知识库发现\n\n`;
  for (const [category, items] of Object.entries(grouped)) {
    const label = categoryLabels[category] || `📁 ${category}`;
    report += `### ${label}\n\n`;
    for (const item of items) {
      const confidencePct = (item.confidence * 100).toFixed(0);
      report += `- **${item.content}**\n`;
      report += `  *来源: ${item.source} | 置信度: ${confidencePct}%*\n\n`;
    }
  }

  report += `## 💡 综合推理建议\n\n`;
  report += `基于知识库中的 ${localKnowledge.length} 条经验数据，结合各位侦探的推理风格，`;
  report += `建议从以下维度进行分析：\n\n`;

  for (const [category, items] of Object.entries(grouped)) {
    const label = categoryLabels[category] || category;
    const topItems = items.slice(0, 2);
    report += `- **${label}**: ${topItems.map((item) => item.content).join('；')}\n`;
  }

  report += `\n---\n*此报告由知识库自动生成，推理引擎恢复后将提供基于视觉的推理分析。*`;
  return report;
}

/* ===== 知识上下文构建 ===== */
export function buildKnowledgeContext(
  external: { title: string; summary: string; source: string }[],
  local: { category: string; keywords: string[]; content: string; confidence: number }[],
): string {
  let context = '';

  if (external.length > 0) {
    context += '\n\n## 参考事实依据（来自权威来源）\n\n';
    context += '以下信息已通过权威知识源验证，请在推理中引用：\n\n';
    for (const item of external) {
      context += `**${item.title}**: ${item.summary}\n\n`;
    }
  }

  if (local.length > 0) {
    context += '\n## 历史分析经验（来自知识库）\n\n';
    context += '以下是过去类似分析中积累的知识：\n\n';
    for (const item of local) {
      context += `- [${item.category}] ${item.content} (置信度: ${(item.confidence * 100).toFixed(0)}%)\n`;
    }
  }

  return context;
}

/* ===== AI 可用性检测 ===== */
export { checkModelAvailability };

/* ===== 知识检索 ===== */
export async function fetchKnowledge(imageUrl: string): Promise<{
  keywords: string[];
  externalKnowledge: Awaited<ReturnType<typeof gatherKnowledge>>;
  localKnowledge: Awaited<ReturnType<typeof searchKnowledge>>;
}> {
  let keywords: string[] = [];
  let externalKnowledge: Awaited<ReturnType<typeof gatherKnowledge>> = [];

  try {
    externalKnowledge = await gatherKnowledge(imageUrl, {
      onKeywords: (kws) => { keywords = kws; },
      onSearching: () => {},
    });
  } catch {
    // 检索失败不影响后续流程
  }

  let localKnowledge: Awaited<ReturnType<typeof searchKnowledge>> = [];
  if (keywords.length > 0) {
    try {
      localKnowledge = searchKnowledge(keywords);
    } catch {
      // 本地知识库可能还未初始化
    }
  }

  return { keywords, externalKnowledge, localKnowledge };
}

/* ===== 单人推理模式 ===== */
export async function handleSolo(
  enqueue: (data: unknown) => void,
  images: string[],
  detectiveId: DetectiveId,
  knowledgeContext: string,
  locale: string,
): Promise<void> {
  enqueue({ type: 'detective_start', detectiveId });

  let fullText = '';
  const emittedSteps = new Set<string>();
  let lastDeltaTime = 0;
  const deltaThrottle = 100;
  let lastStepExtractTime = 0;
  const stepThrottle = 500; // 步骤提取较耗时，500ms 节流

  const callbacks: StreamCallbacks = {
    onText: (delta) => {
      fullText += delta;
      const now = Date.now();
      if (now - lastDeltaTime >= deltaThrottle) {
        lastDeltaTime = now;
        enqueue({ type: 'detective_delta', detectiveId, fullText });
      }
      // 步骤提取节流
      if (now - lastStepExtractTime >= stepThrottle) {
        lastStepExtractTime = now;
        const allSteps = extractAllSteps(fullText, emittedSteps);
        for (const step of allSteps) {
          if (!emittedSteps.has(step.id)) {
            emittedSteps.add(step.id);
            enqueue({ type: 'step', detectiveId, step });
          }
        }
      }
    },
    onDone: (text) => {
      fullText = text;
      const report = generateReport(detectiveId, fullText);
      enqueue({ type: 'detective_complete', detectiveId, fullText });
      updateKnowledgeFromAnalysis(fullText, [detectiveId]);
      enqueue({ type: 'report', content: report });
    },
    onError: (err) => {
      enqueue({ type: 'error', message: formatApiError(err.message) });
    },
  };

  const basePrompt = getSystemPrompt(detectiveId);
  const langSuffix = getLanguageInstruction(locale);
  const systemPrompt = basePrompt + knowledgeContext + langSuffix;

  await streamClaudeVision(systemPrompt, images, callbacks);
}

/* ===== 组团推理模式 ===== */
export async function handleGroup(
  enqueue: (data: unknown) => void,
  images: string[],
  personaIds: DetectiveId[],
  knowledgeContext: string,
  locale: string,
): Promise<void> {
  const results: Record<string, string> = {};
  const langSuffix = getLanguageInstruction(locale);

  const promises = personaIds.map(
    (detectiveId) =>
      new Promise<void>((resolve) => {
        enqueue({ type: 'detective_start', detectiveId });

        let fullText = '';
        const emittedSteps = new Set<string>();
        let lastDeltaTime = 0;
        let lastStepExtractTime = 0;
        const deltaThrottle = 100;
        const stepThrottle = 500;

        const callbacks: StreamCallbacks = {
          onText: (delta) => {
            fullText += delta;
            const now = Date.now();
            if (now - lastDeltaTime >= deltaThrottle) {
              lastDeltaTime = now;
              enqueue({ type: 'detective_delta', detectiveId, fullText });
            }
            if (now - lastStepExtractTime >= stepThrottle) {
              lastStepExtractTime = now;
              const allSteps = extractAllSteps(fullText, emittedSteps);
              for (const step of allSteps) {
                if (!emittedSteps.has(step.id)) {
                  emittedSteps.add(step.id);
                  enqueue({ type: 'step', detectiveId, step });
                }
              }
            }
          },
          onDone: (text) => {
            fullText = text;
            results[detectiveId] = text;
            enqueue({ type: 'detective_complete', detectiveId, fullText });
            resolve();
          },
          onError: (err) => {
            enqueue({ type: 'error', message: formatApiError(err.message) });
            resolve();
          },
        };

        const basePrompt = getSystemPrompt(detectiveId);
        const systemPrompt = basePrompt + knowledgeContext + langSuffix;
        streamClaudeVision(systemPrompt, images, callbacks);
      }),
  );

  await Promise.all(promises);

  // AI 综合推理
  enqueue({ type: 'synthesis_start' });
  const synthesisReport = await generateSynthesis(enqueue, personaIds, results, knowledgeContext, locale);

  // 更新知识库
  updateKnowledgeFromAnalysis(synthesisReport, personaIds);

  // 生成联合报告
  const report = generateMultiDetectiveReport(personaIds, results, synthesisReport);
  enqueue({ type: 'report', content: report });
}

/* ===== AI 综合推理 ===== */
async function generateSynthesis(
  enqueue: (data: unknown) => void,
  personaIds: DetectiveId[],
  results: Record<string, string>,
  knowledgeContext: string,
  locale: string,
): Promise<string> {
  const combinedInput = personaIds
    .map((id) => {
      const persona = PERSONA_MAP[id];
      const name = persona ? persona.nameZh : id;
      return `## ${name} 的推理\n\n${results[id] || '无'}`;
    })
    .join('\n\n');

  const synthesisSystemPrompt = `你是一位首席侦探分析师，负责综合多位侦探的发现进行联合推理。

你的任务是：
1. 梳理每位侦探的核心发现
2. 找出不同侦探之间的共识与分歧
3. 综合所有线索，给出更全面、更深入的推理
4. 预测可能发生的未来事件

## 输出格式

### 共识分析
（列出各位侦探都认同的关键发现）

### 分歧探讨
（列出各位侦探观点不一致的地方，分析原因）

### 综合推理
（整合所有线索，给出更深入的分析）

### 未来事件预测
（基于综合分析，预测可能发生的事件）

### 最终结论
（总结联合推理的最终判断）

请用侦探推理的语言风格，逻辑清晰，推理严谨。`;

  const systemPrompt = synthesisSystemPrompt + knowledgeContext + getLanguageInstruction(locale);
  let fullText = '';

  try {
    await streamClaudeVision(
      systemPrompt,
      combinedInput,
      {
        onText: (delta) => {
          fullText += delta;
          enqueue({ type: 'synthesis_delta', content: delta });
        },
        onDone: () => {
          enqueue({ type: 'synthesis_complete', content: fullText });
        },
        onError: (err) => {
          enqueue({ type: 'error', message: `综合推理失败: ${formatApiError(err.message)}` });
        },
      },
    );
  } catch {
    fullText = '# 综合推理\n\n综合推理过程出现异常，以下为各侦探独立分析结果。';
    enqueue({ type: 'synthesis_complete', content: fullText });
  }

  return fullText;
}

/* ===== 报告生成 ===== */
import { generateReport, generateMultiDetectiveReport } from '@/lib/markdown';
export { generateReport, generateMultiDetectiveReport };

/* ===== 知识提取 ===== */
export function updateKnowledgeFromAnalysis(fullText: string, detectiveIds: DetectiveId[]): void {
  try {
    extractKnowledgeFromText(fullText, detectiveIds).catch(() => {});
  } catch {
    // 静默失败
  }
}

async function extractKnowledgeFromText(fullText: string, detectiveIds: DetectiveId[]): Promise<void> {
  let extractedJson = '';

  await new Promise<void>((resolve) => {
    streamClaudeText(
      `你是知识库提取助手。请从以下侦探推理文本中提取有价值的知识点，存储到知识库中。

## 提取规则
1. 提取已验证的事实性信息（如地理位置、建筑名称、历史事件等）
2. 不要提取推测或不确定的内容
3. 每条知识点应该简洁明了
4. 为每条知识分配最合适的分类

## 分类选项
- geography: 地理位置推断
- architecture: 建筑特征分析
- history: 历史背景关联
- psychology: 人物心理模式
- environment: 自然环境特征
- predictions: 事件预测

## 输出格式
请输出 JSON 数组，格式如下：
[
  {
    "category": "分类",
    "keywords": ["关键词1", "关键词2"],
    "content": "知识点内容",
    "source": "侦探推理: 侦探名称",
    "confidence": 0.8
  }
]

## 待分析文本
${fullText}

请仅输出 JSON，不要解释。`,
      fullText,
      {
        onText: (delta) => { extractedJson += delta; },
        onDone: () => { resolve(); },
        onError: () => { resolve(); },
      },
    );
  });

  try {
    const jsonMatch = extractedJson.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const entries = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(entries) || entries.length === 0) return;

    const grouped = entries.reduce((acc: Record<string, typeof entries>, entry: any) => {
      const cat = entry.category || 'geography';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    }, {});

    for (const [category, items] of Object.entries(grouped)) {
      addEntries(category as any, items.map((item: any) => ({
        category: item.category as any,
        keywords: item.keywords || [],
        content: item.content || '',
        source: item.source || `侦探推理: ${detectiveIds.join(', ')}`,
        confidence: Math.min(1, Math.max(0, item.confidence || 0.7)),
      })));
    }
  } catch {
    // JSON 解析失败，静默处理
  }
}

/* ===== 推理步骤解析 ===== */
export function extractAllSteps(
  fullText: string,
  emittedSteps: Set<string>,
): { id: string; type: 'observation' | 'question' | 'analysis' | 'conclusion'; content: string; order: number }[] {
  const headings: { pattern: RegExp; type: 'observation' | 'question' | 'analysis' | 'conclusion'; key: string }[] = [
    { pattern: /^#{1,3}\s*观察/m, type: 'observation', key: 'obs-zh' },
    { pattern: /^#{1,3}\s*提问/m, type: 'question', key: 'q-zh' },
    { pattern: /^#{1,3}\s*推理/m, type: 'analysis', key: 'a-zh' },
    { pattern: /^#{1,3}\s*结论/m, type: 'conclusion', key: 'c-zh' },
    { pattern: /^#{1,3}\s*Observation/m, type: 'observation', key: 'obs-en' },
    { pattern: /^#{1,3}\s*Question/m, type: 'question', key: 'q-en' },
    { pattern: /^#{1,3}\s*Analysis/m, type: 'analysis', key: 'a-en' },
    { pattern: /^#{1,3}\s*Conclusion/m, type: 'conclusion', key: 'c-en' },
  ];

  const newSteps: { id: string; type: 'observation' | 'question' | 'analysis' | 'conclusion'; content: string; order: number }[] = [];
  const textLines = fullText.split('\n');

  const foundHeadings: { type: string; key: string; lineIndex: number; textType: 'observation' | 'question' | 'analysis' | 'conclusion' }[] = [];
  for (let i = 0; i < textLines.length; i++) {
    for (const { pattern, type, key } of headings) {
      if (pattern.test(textLines[i].trim())) {
        const stepKey = `${key}-${i}`;
        if (!emittedSteps.has(stepKey)) {
          foundHeadings.push({ type, key, lineIndex: i, textType: type });
        }
        break;
      }
    }
  }

  foundHeadings.sort((a, b) => a.lineIndex - b.lineIndex);

  let order = emittedSteps.size;
  for (const heading of foundHeadings) {
    const stepKey = `${heading.key}-${heading.lineIndex}`;
    emittedSteps.add(stepKey);

    const contentLines: string[] = [];
    for (let i = heading.lineIndex + 1; i < textLines.length; i++) {
      const line = textLines[i].trim();
      let isHeading = false;
      for (const { pattern } of headings) {
        if (pattern.test(line)) { isHeading = true; break; }
      }
      if (isHeading) break;
      if (line) contentLines.push(textLines[i]);
    }

    const content = contentLines.join('\n').trim();
    if (content.length > 5) {
      newSteps.push({
        id: `step-${heading.key}-${heading.lineIndex}`,
        type: heading.textType,
        content: content.slice(0, 800),
        order: order++,
      });
    }
  }

  return newSteps;
}
