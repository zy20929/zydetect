import { NextRequest } from 'next/server';
import {
  formatApiError,
  generateKnowledgeOnlyReport,
  buildKnowledgeContext,
  checkModelAvailability,
  fetchKnowledge,
  handleSolo,
  handleGroup,
  initKnowledgeBase,
  readAllEntries,
} from './analyze.service';
import type { DetectiveId, AnalysisMode } from '@/lib/types';
import type { KnowledgeEntry } from '@/lib/types';

/** 初始化知识库 */
initKnowledgeBase();

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
          await handleAiUnavailable(enqueue, personas, mode);
          clearInterval(keepaliveId);
          controller.close();
          return;
        }

        // ========== AI 可用：正常流程 ==========
        await handleFullAnalysis(enqueue, images, personas, mode, locale);

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

/** AI 不可用时的知识库回退 */
async function handleAiUnavailable(
  enqueue: (data: unknown) => void,
  personas: DetectiveId[],
  mode: AnalysisMode,
): Promise<void> {
  enqueue({ type: 'knowledge_start' });
  enqueue({ type: 'knowledge_keyword_extracted', keywords: [] });

  const allEntries: KnowledgeEntry[] = readAllEntries();

  enqueue({ type: 'knowledge_result', knowledge: [], localKnowledge: allEntries });

  for (const detectiveId of personas) {
    enqueue({ type: 'detective_start', detectiveId });
    enqueue({ type: 'detective_complete', detectiveId, fullText: '推理引擎不可用，使用知识库推理。' });
  }

  const report = generateKnowledgeOnlyReport(personas, allEntries, mode);
  enqueue({ type: 'report', content: report });
}

/** 完整分析流程 */
async function handleFullAnalysis(
  enqueue: (data: unknown) => void,
  images: string[],
  personas: DetectiveId[],
  mode: AnalysisMode,
  locale: string,
): Promise<void> {
  // 阶段 1: 知识检索（限时 5 秒，超时跳过）
  enqueue({ type: 'knowledge_start' });

  let externalKnowledge: Awaited<ReturnType<typeof fetchKnowledge>>['externalKnowledge'] = [];
  let localKnowledge: Awaited<ReturnType<typeof fetchKnowledge>>['localKnowledge'] = [];

  try {
    const result = await Promise.race([
      fetchKnowledge(images[0]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    externalKnowledge = result.externalKnowledge;
    localKnowledge = result.localKnowledge;

    enqueue({ type: 'knowledge_keyword_extracted', keywords: result.keywords });
  } catch {
    // 知识检索失败不影响后续流程
  }

  enqueue({
    type: 'knowledge_result',
    knowledge: externalKnowledge,
    localKnowledge,
  });

  // 将知识注入侦探提示词
  const knowledgeContext = buildKnowledgeContext(
    externalKnowledge,
    localKnowledge,
  );

  if (mode === 'solo') {
    await handleSolo(enqueue, images, personas[0], knowledgeContext, locale);
  } else {
    await handleGroup(enqueue, images, personas, knowledgeContext, locale);
  }
}
