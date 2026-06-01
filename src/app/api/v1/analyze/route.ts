import { NextRequest } from 'next/server';
import { streamClaudeVision, StreamCallbacks, checkModelAvailability } from '@/lib/claude';
import { getSystemPrompt } from '@/prompts';
import { DetectiveId, AnalysisMode } from '@/lib/types';
import { generateReport, generateMultiDetectiveReport } from '@/lib/markdown';
import { PERSONA_MAP } from '@/lib/constants';
import { gatherKnowledge } from '@/lib/knowledge';
import { searchKnowledge, readAllEntries, addEntries, initKnowledgeBase } from '@/lib/knowledge-base';
import type { KnowledgeEntry } from '@/lib/types';

/** 将 API 原始错误转换为友好中文提示 */
function formatApiError(raw: string): string {
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
  // 截去过长的原始消息，只保留核心信息
  const msg = raw.replace(/\{[\s\S]*\}/, '').trim();
  return msg || '分析过程出现异常，请稍后重试';
}

/** 初始化知识库（确保数据目录存在） */
initKnowledgeBase();

/** 根据用户语言生成系统提示词后缀 */
function getLanguageInstruction(locale: string): string {
  switch (locale) {
    case 'en':
      return '\n\n## Language\nPlease respond entirely in English.';
    default:
      return '\n\n## 语言\n请使用简体中文回答。';
  }
}

interface AnalyzeRequest {
  images: string[];
  personas: DetectiveId[];
  mode: AnalysisMode;
  locale?: string;
}

/** SSE 事件编码 */
function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** 仅用知识库生成推理报告（AI 不可用时的回退方案） */
function generateKnowledgeOnlyReport(
  personaIds: DetectiveId[],
  localKnowledge: KnowledgeEntry[],
  mode: AnalysisMode,
): string {
  const personaNames = personaIds.map((id) => PERSONA_MAP[id]?.nameZh || id).join('、');
  let report = `#  知识库推理报告\n\n`;
  report += `**推理模式**: ${mode === 'solo' ? '单人推理' : '组团推理'} | **参与侦探**: ${personaNames}\n\n`;

  if (localKnowledge.length === 0) {
    report += `⚠️ **当前知识库中没有可用的历史经验数据。**\n\n`;
    report += `由于推理引擎暂时不可用，且知识库中没有相关经验，无法生成推理报告。\n`;
    report += `建议：\n- 尝试先进行几次分析以积累知识库\n- 检查 API 配置是否正确\n- 稍后重试\n`;
    return report;
  }

  report += `> ⚠️ 推理引擎当前不可用，以下推理基于历史知识库中的经验数据。\n\n`;

  // 按分类分组
  const grouped: Record<string, typeof localKnowledge> = {};
  for (const item of localKnowledge) {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const categoryLabels: Record<string, string> = {
    geography: '🌍 地理位置推断',
    architecture: '🏛️ 建筑特征分析',
    history: ' 历史背景关联',
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

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { images, personas, mode, locale = 'zh' } = body;

    if (!images || images.length === 0 || !personas || personas.length === 0) {
      return new Response(
        sse({ type: 'error', message: '缺少必要参数：images 和 personas' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => controller.enqueue(sse(data));

        // SSE 保活：每 15 秒发送注释行防止连接被中断
        const keepaliveId = setInterval(() => {
          try { controller.enqueue(': keepalive\n\n'); } catch {}
        }, 15000);

        // 阶段 0: 检测 AI 模型可用性
        const aiAvailable = await checkModelAvailability();
        enqueue({ type: 'model_check', available: aiAvailable });

        if (!aiAvailable) {
          // AI 不可用：仅使用知识库推理
          enqueue({ type: 'knowledge_start' });
          enqueue({ type: 'knowledge_keyword_extracted', keywords: [] });

          // AI 不可用，读取全部知识库条目作为推理依据
          const allEntries = readAllEntries();

          enqueue({
            type: 'knowledge_result',
            knowledge: [],
            localKnowledge: allEntries,
          });

          // 为每位侦探标记开始和完成
          for (const detectiveId of personas) {
            enqueue({ type: 'detective_start', detectiveId });
            enqueue({ type: 'detective_complete', detectiveId, fullText: '推理引擎不可用，使用知识库推理。' });
          }

          // 生成知识库推理报告
          const report = generateKnowledgeOnlyReport(personas, allEntries, mode);
          enqueue({ type: 'report', content: report });
          enqueue({ type: 'done' });
          clearInterval(keepaliveId);
          controller.close();
          return;
        }

        // ========== AI 可用：正常流程 ==========

        // 阶段 1: 知识检索（限时 5 秒，超时跳过）
        enqueue({ type: 'knowledge_start' });

        let keywords: string[] = [];
        let externalKnowledge: Awaited<ReturnType<typeof gatherKnowledge>> = [];

        try {
          const knowledgeTimeout = 5000;
          externalKnowledge = await Promise.race([
            gatherKnowledge(images[0], {
              onKeywords: (kws) => {
                keywords = kws;
                enqueue({ type: 'knowledge_keyword_extracted', keywords: kws });
              },
              onSearching: (source, query) => {
                enqueue({ type: 'knowledge_searching', source, query });
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), knowledgeTimeout),
            ),
          ]);
        } catch {
          // 知识检索失败不影响后续流程，静默跳过
        }

        // 从本地知识库检索相关知识
        let localKnowledge: Awaited<ReturnType<typeof searchKnowledge>> = [];
        if (keywords.length > 0) {
          try {
            localKnowledge = searchKnowledge(keywords);
          } catch {
            // 本地知识库可能还未初始化
          }
        }

        enqueue({
          type: 'knowledge_result',
          knowledge: externalKnowledge,
          localKnowledge,
        });

        // 将知识注入侦探提示词
        const knowledgeContext = buildKnowledgeContext(externalKnowledge, localKnowledge);

        if (mode === 'solo') {
          await handleSolo(enqueue, images, personas[0], knowledgeContext, locale);
        } else {
          await handleGroup(enqueue, images, personas, knowledgeContext, locale);
        }

        enqueue({ type: 'done' });
        clearInterval(keepaliveId);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return new Response(sse({ type: 'error', message }), {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/** 构建知识上下文字符串，注入侦探提示词 */
function buildKnowledgeContext(
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

/** 单人推理模式 */
async function handleSolo(
  enqueue: (data: unknown) => void,
  images: string[],
  detectiveId: DetectiveId,
  knowledgeContext: string,
  locale: string,
): Promise<void> {
  enqueue({ type: 'detective_start', detectiveId });

  let fullText = '';
  const emittedSteps = new Set<string>();

  const callbacks: StreamCallbacks = {
    onText: (delta) => {
      fullText += delta;
      enqueue({ type: 'detective_delta', detectiveId, fullText });
      const allSteps = extractAllSteps(fullText, emittedSteps);
      for (const step of allSteps) {
        if (!emittedSteps.has(step.id)) {
          emittedSteps.add(step.id);
          enqueue({ type: 'step', detectiveId, step });
        }
      }
    },
    onDone: (text) => {
      fullText = text;
      const report = generateReport(detectiveId, fullText);
      enqueue({ type: 'detective_complete', detectiveId, fullText });

      // 分析完成后更新知识库
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

/** 组团推理模式 — 并行分析 + AI 合成 */
async function handleGroup(
  enqueue: (data: unknown) => void,
  images: string[],
  personaIds: DetectiveId[],
  knowledgeContext: string,
  locale: string,
): Promise<void> {
  const results: Record<string, string> = {};
  const langSuffix = getLanguageInstruction(locale);

  // 第一阶段：并行分析每位侦探
  const promises = personaIds.map(
    (detectiveId) =>
      new Promise<void>((resolve) => {
        enqueue({ type: 'detective_start', detectiveId });

        let fullText = '';
        const emittedSteps = new Set<string>();

        const callbacks: StreamCallbacks = {
          onText: (delta) => {
            fullText += delta;
            enqueue({ type: 'detective_delta', detectiveId, fullText });
            const allSteps = extractAllSteps(fullText, emittedSteps);
            for (const step of allSteps) {
              if (!emittedSteps.has(step.id)) {
                emittedSteps.add(step.id);
                enqueue({ type: 'step', detectiveId, step });
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

  // 第二阶段：AI 综合推理
  enqueue({ type: 'synthesis_start' });
  const synthesisReport = await generateSynthesis(enqueue, personaIds, results, knowledgeContext, locale);

  // 分析完成后更新知识库
  updateKnowledgeFromAnalysis(synthesisReport, personaIds);

  // 第三阶段：生成联合调查报告
  const report = generateMultiDetectiveReport(personaIds, results, synthesisReport);
  enqueue({ type: 'report', content: report });
}

/** AI 综合推理 — 让 Claude 综合多位侦探的发现进行联合分析 */
async function generateSynthesis(
  enqueue: (data: unknown) => void,
  personaIds: DetectiveId[],
  results: Record<string, string>,
  knowledgeContext: string,
  locale: string,
): Promise<string> {
  // 拼接所有侦探的推理结果作为输入
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

/** 从分析结果中提取知识点，更新知识库 */
function updateKnowledgeFromAnalysis(fullText: string, detectiveIds: DetectiveId[]): void {
  try {
    // 异步提取知识，不阻塞主流程
    extractKnowledgeFromText(fullText, detectiveIds).catch(() => {});
  } catch {
    // 静默失败
  }
}

async function extractKnowledgeFromText(fullText: string, detectiveIds: DetectiveId[]): Promise<void> {
  const { streamClaudeText } = await import('@/lib/claude');

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
        onText: (delta) => {
          extractedJson += delta;
        },
        onDone: () => {
          resolve();
        },
        onError: () => {
          resolve();
        },
      },
    );
  });

  // 解析提取的 JSON
  try {
    // 提取 JSON 部分
    const jsonMatch = extractedJson.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const entries = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(entries) || entries.length === 0) return;

    // 按分类添加
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

// ========== 推理步骤解析器 ==========

/** 解析并提取当前所有已完成的推理步骤 */
function extractAllSteps(fullText: string, emittedSteps: Set<string>): { id: string; type: 'observation' | 'question' | 'analysis' | 'conclusion'; content: string; order: number }[] {
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

  // 找到所有标题行及其位置
  const foundHeadings: { type: string; key: string; lineIndex: number; textType: 'observation' | 'question' | 'analysis' | 'conclusion' }[] = [];
  for (let i = 0; i < textLines.length; i++) {
    for (const { pattern, type, key } of headings) {
      if (pattern.test(textLines[i].trim())) {
        const stepKey = `${key}-${i}`;
        if (!emittedSteps.has(stepKey)) {
          foundHeadings.push({ type: type, key, lineIndex: i, textType: type });
        }
        break;
      }
    }
  }

  // 按行号排序
  foundHeadings.sort((a, b) => a.lineIndex - b.lineIndex);

  let order = emittedSteps.size;
  for (const heading of foundHeadings) {
    const stepKey = `${heading.key}-${heading.lineIndex}`;
    emittedSteps.add(stepKey);

    // 提取该标题下的内容（直到下一个标题或结束）
    const contentLines: string[] = [];
    for (let i = heading.lineIndex + 1; i < textLines.length; i++) {
      const line = textLines[i].trim();
      // 遇到新标题就停止
      let isHeading = false;
      for (const { pattern } of headings) {
        if (pattern.test(line)) {
          isHeading = true;
          break;
        }
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

function extractSectionContent(fullText: string, type: string): string {
  const headingMap: Record<string, string[]> = {
    observation: ['### 观察', '### Observation', '## 观察', '## Observation'],
    question: ['### 提问', '### Question', '## 提问', '## Question'],
    analysis: ['### 推理', '### Analysis', '## 推理', '## Analysis'],
    conclusion: ['### 结论', '### Conclusion', '## 结论', '## Conclusion'],
  };

  const headings = headingMap[type] || [];
  for (const heading of headings) {
    const idx = fullText.lastIndexOf(heading);
    if (idx !== -1) {
      const afterHeading = fullText.slice(idx + heading.length).trim();
      const lines = afterHeading.split('\n');
      const contentLines: string[] = [];
      for (const line of lines) {
        if (/^#{1,3}\s/.test(line.trim())) break;
        contentLines.push(line);
      }
      const content = contentLines.join('\n').trim();
      if (content.length > 10) {
        return content.slice(0, 800);
      }
    }
  }
  return '';
}
