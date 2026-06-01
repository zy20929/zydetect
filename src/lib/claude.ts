import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export interface StreamCallbacks {
  onText: (delta: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

function detectMediaType(base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (base64.startsWith('/9j') || base64.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (base64.startsWith('iVB') || base64.startsWith('data:image/png')) return 'image/png';
  if (base64.startsWith('R0lG') || base64.startsWith('data:image/gif')) return 'image/gif';
  if (base64.startsWith('data:image/webp')) return 'image/webp';
  return 'image/jpeg';
}

function extractBase64Data(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || '';
  }
  return dataUrl;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function streamClaudeVision(
  systemPrompt: string,
  imageBase64: string | string[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
      const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];

      const imageContent = images.map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: detectMediaType(img),
          data: extractBase64Data(img),
        },
      }));

      const textPrompt = images.length > 1
        ? `请分析这 ${images.length} 张图片，对比它们之间的关联性和差异，用你的侦探推理风格进行深度分析。`
        : '请分析这张图片，用你的侦探推理风格来进行深度分析。';

      const messageStream = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text', text: textPrompt },
            ],
          },
        ],
      });

      let fullText = '';
      for await (const chunk of messageStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text;
          fullText += text;
          callbacks.onText(text);
        }
      }
      callbacks.onDone(fullText);
      return;
    } catch (error) {
      const isRateLimit = error instanceof Error && error.message.includes('429');
      if (isRateLimit && attempt < maxRetries - 1) {
        await delay(3000 * (attempt + 1));
        continue;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }
  }
}

/** 检测 AI 模型是否可用 */
export async function checkModelAvailability(): Promise<boolean> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    await anthropic.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: [{ type: 'text', text: '.' }] }],
    });
    return true;
  } catch {
    return false;
  }
}

/** 纯文本流式调用（不带图片） */
export async function streamClaudeText(
  systemPrompt: string,
  userMessage: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

    const messageStream = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      stream: true,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userMessage }],
        },
      ],
    });

    let fullText = '';
    for await (const chunk of messageStream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        const text = chunk.delta.text;
        fullText += text;
        callbacks.onText(text);
      }
    }
    callbacks.onDone(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/** 多轮对话模式 — 带对话历史上下文 */
export async function streamClaudeChat(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  imageBase64: string | string[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
      const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64];
      const imageContent = images.map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: detectMediaType(img),
          data: extractBase64Data(img),
        },
      }));

      // 构建 Anthropic 消息数组
      const chatMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<{ type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } } | { type: 'text'; text: string }> }> = [];

      if (messages.length === 0) {
        // 首次对话，附带图片
        chatMessages.push({
          role: 'user',
          content: [
            ...imageContent,
            { type: 'text', text: '请分析这张图片，用你的侦探推理风格来进行深度分析。' },
          ],
        });
      } else {
        // 有对话历史，图片 + 历史 + 最新用户消息
        chatMessages.push({
          role: 'user',
          content: [
            ...imageContent,
            { type: 'text', text: '基于以上图片和对话内容，继续回答我的问题。' },
          ],
        });
        // 追加对话历史（纯文本）
        for (const msg of messages) {
          chatMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }

      const messageStream = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        stream: true,
        messages: chatMessages,
      });

      let fullText = '';
      for await (const chunk of messageStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text;
          fullText += text;
          callbacks.onText(text);
        }
      }
      callbacks.onDone(fullText);
      return;
    } catch (error) {
      const isRateLimit = error instanceof Error && error.message.includes('429');
      if (isRateLimit && attempt < maxRetries - 1) {
        await delay(3000 * (attempt + 1));
        continue;
      }
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }
  }
}
