import { NextRequest } from 'next/server';
import { streamClaudeChat } from '@/lib/claude';
import { getSystemPrompt } from '@/prompts';
import { DetectiveId, ChatMessage } from '@/lib/types';
import { PERSONA_MAP } from '@/lib/constants';

interface ChatRequest {
  images: string[];
  detectiveIds: DetectiveId[];
  messages: ChatMessage[];
  lastAnalysisText: string;
  locale?: string;
}

/** SSE 事件编码 */
function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { images, detectiveIds, messages, lastAnalysisText, locale = 'zh' } = body;

    if (!images || images.length === 0 || !detectiveIds || detectiveIds.length === 0) {
      return new Response(sse({ type: 'error', message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    // 构建系统提示词
    const systemPrompt = buildChatSystemPrompt(detectiveIds, lastAnalysisText, locale);

    // 将对话历史转换为 Claude 格式
    const chatHistory = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: unknown) => controller.enqueue(sse(data));

        let fullText = '';
        await streamClaudeChat(
          systemPrompt,
          chatHistory,
          images,
          {
            onText: (delta) => {
              fullText += delta;
              enqueue({ type: 'delta', content: delta });
            },
            onDone: () => {
              enqueue({ type: 'done', content: fullText });
              enqueue({ type: 'chat_done' });
              controller.close();
            },
            onError: (err) => {
              enqueue({ type: 'error', message: err.message });
              controller.close();
            },
          },
        );
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}

/** 构建对话系统提示词 */
function buildChatSystemPrompt(detectiveIds: DetectiveId[], lastAnalysisText: string, locale: string): string {
  const personas = detectiveIds.map((id) => PERSONA_MAP[id]).filter(Boolean);

  let prompt = '';

  if (personas.length === 1) {
    // 单人模式：使用该侦探的系统提示词
    prompt = getSystemPrompt(detectiveIds[0]);
  } else {
    // 组团模式：首席侦探分析师角色
    prompt = `你是一位首席侦探分析师，负责综合以下侦探团队的发现进行联合推理。

## 侦探团队
${personas.map((p) => `- ${p.nameZh}（${p.title}）`).join('\n')}

## 对话规则
- 以首席侦探的身份回答用户的问题
- 综合各位侦探的观点进行分析
- 保持侦探推理的语言风格
- 回答要逻辑清晰，推理严谨
`;
  }

  // 附加已有分析结果作为上下文
  prompt += `

## 已有分析结果

以下是之前对图片的分析报告，请在回答用户问题时参考：

${lastAnalysisText}

## 对话要求

1. 基于已有分析结果回答用户的问题
2. 如果用户问到分析中未涉及的内容，可以进一步推理
3. 保持侦探推理的语言风格和角色设定
4. 回答要具体、详细，避免简短敷衍
5. 使用 Markdown 格式输出`;

  // 添加语言指令
  switch (locale) {
    case 'en': prompt += '\n\n## Language\nPlease respond entirely in English.'; break;
    default: prompt += '\n\n## 语言\n请使用简体中文回答。';
  }

  return prompt;
}
