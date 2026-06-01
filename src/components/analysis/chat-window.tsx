'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { PERSONA_MAP } from '@/lib/constants';
import { ChatMessage, ReasoningStep } from '@/lib/types';
import { Send, Trash2, Loader2, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/** 根据对话进展获取主题色（暗色主题） */
function getTheme(messagesCount: number) {
  if (messagesCount <= 1) {
    // 观察阶段 — 冷静蓝
    return {
      border: 'border-blue-800/50',
      header: 'from-blue-950/80 to-[var(--card-bg)]',
      headerBorder: 'border-blue-800/50',
      icon: 'text-blue-400',
      title: 'text-blue-300',
      badge: 'bg-blue-900/50 text-blue-300',
      bubble: 'bg-blue-950/30 border-blue-800/30',
      input: 'focus:ring-blue-700 focus:border-blue-700',
      button: 'bg-blue-700 hover:bg-blue-600',
      buttonDisabled: 'bg-[var(--card-border)] text-[var(--foreground)]/30',
      phaseKey: 'chat.phases.observation' as const,
    };
  }
  if (messagesCount <= 3) {
    // 提问阶段 — 思考紫
    return {
      border: 'border-purple-800/50',
      header: 'from-purple-950/80 to-[var(--card-bg)]',
      headerBorder: 'border-purple-800/50',
      icon: 'text-purple-400',
      title: 'text-purple-300',
      badge: 'bg-purple-900/50 text-purple-300',
      bubble: 'bg-purple-950/30 border-purple-800/30',
      input: 'focus:ring-purple-700 focus:border-purple-700',
      button: 'bg-purple-700 hover:bg-purple-600',
      buttonDisabled: 'bg-[var(--card-border)] text-[var(--foreground)]/30',
      phaseKey: 'chat.phases.discussion' as const,
    };
  }
  if (messagesCount <= 5) {
    // 推理阶段 — 热烈橙
    return {
      border: 'border-amber-800/50',
      header: 'from-amber-950/80 to-[var(--card-bg)]',
      headerBorder: 'border-amber-800/50',
      icon: 'text-amber-400',
      title: 'text-amber-300',
      badge: 'bg-amber-900/50 text-amber-300',
      bubble: 'bg-amber-950/30 border-amber-800/30',
      input: 'focus:ring-amber-700 focus:border-amber-700',
      button: 'bg-amber-600 hover:bg-amber-500',
      buttonDisabled: 'bg-[var(--card-border)] text-[var(--foreground)]/30',
      phaseKey: 'chat.phases.reasoning' as const,
    };
  }
  // 结论阶段 — 沉稳绿
  return {
    border: 'border-emerald-800/50',
    header: 'from-emerald-950/80 to-[var(--card-bg)]',
    headerBorder: 'border-emerald-800/50',
    icon: 'text-emerald-400',
    title: 'text-emerald-300',
    badge: 'bg-emerald-900/50 text-emerald-300',
    bubble: 'bg-emerald-950/30 border-emerald-800/30',
    input: 'focus:ring-emerald-700 focus:border-emerald-700',
    button: 'bg-emerald-700 hover:bg-emerald-600',
    buttonDisabled: 'bg-[var(--card-border)] text-[var(--foreground)]/30',
    phaseKey: 'chat.phases.conclusion' as const,
  };
}

export default function ChatWindow() {
  const { t, locale } = useI18n();
  const store = useAnalysisStore();
  const {
    imageDataUrls,
    selectedPersonas,
    chatMessages,
    isChatResponding,
    finalReport,
    detectives,
    mode,
  } = store;

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 根据对话进展获取主题色
  const theme = getTheme(chatMessages.length);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  /** 获取当前对话侦探的显示名称 */
  const getDetectiveName = () => {
    if (selectedPersonas.length === 1) {
      const persona = PERSONA_MAP[selectedPersonas[0]];
      if (!persona) return t('chat.detective');
      return locale === 'zh' ? persona.nameZh : persona.nameEn;
    }
    return t('chat.detectiveTeam');
  };

  /** 获取最后一条分析文本作为上下文 */
  const getLastAnalysisText = () => {
    if (mode === 'solo' && Object.values(detectives).length > 0) {
      const d = Object.values(detectives)[0];
      return d?.fullText || finalReport || '';
    }
    return finalReport || '';
  };

  /** 获取所有侦探的推理步骤（用于步骤引用） */
  const getAllSteps = () => {
    const steps: { detectiveName: string; step: ReasoningStep }[] = [];
    Object.values(detectives).forEach((d) => {
      const persona = PERSONA_MAP[d.detectiveId];
      d.steps.forEach((step) => {
        steps.push({ detectiveName: persona?.nameZh || t('chat.detective'), step });
      });
    });
    return steps;
  };

  /** 插入步骤引用到输入框 */
  const insertStepRef = (detectiveName: string, stepOrder: number, content: string) => {
    const ref = `[@${detectiveName} ${t('chat.stepN', stepOrder + 1)}]`;
    setInput((prev) => prev + ref + ' ');
    inputRef.current?.focus();
  };

  /** 发送消息 */
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isChatResponding || imageDataUrls.length === 0) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    store.addChatMessage(userMsg);
    setInput('');
    store.setChatResponding(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageDataUrls,
          detectiveIds: selectedPersonas,
          messages: [...chatMessages, userMsg],
          lastAnalysisText: getLastAnalysisText(),
          locale,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'delta') {
                assistantContent += event.content;
                setStreamingText(assistantContent);
              } else if (event.type === 'chat_done') {
                if (assistantContent) {
                  store.addChatMessage({
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date().toISOString(),
                  });
                }
                setStreamingText('');
                store.setChatResponding(false);
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      store.addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**${t('chat.error')}**: ${err instanceof Error ? err.message : t('chat.chatFailed')}`,
        timestamp: new Date().toISOString(),
      });
      setStreamingText('');
      store.setChatResponding(false);
    }
  }, [input, isChatResponding, imageDataUrls, selectedPersonas, chatMessages, finalReport, detectives, mode, store]);

  /** 处理键盘事件 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 清空对话 */
  const handleClear = () => {
    store.clearChat();
    setStreamingText('');
  };

  return (
    <div className={`rounded-xl border-2 ${theme.border} overflow-hidden transition-all duration-500`}>
      {/* 头部 */}
      <div className={`p-4 bg-gradient-to-r ${theme.header} border-b ${theme.headerBorder} flex items-center justify-between transition-all duration-500`}>
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className={theme.icon} />
          <h3 className={`font-bold ${theme.title} transition-colors duration-500`}>{t('chat.title')}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme.badge} transition-colors duration-500`}>
            {t(theme.phaseKey)}
          </span>
          <span className="text-xs text-[var(--foreground)]/40">— {getDetectiveName()}</span>
        </div>
        {chatMessages.length > 0 && (
          <button
            onClick={handleClear}
            disabled={isChatResponding}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--foreground)]/50 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            {t('chat.clear')}
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[var(--card-alt)]">
        {chatMessages.length === 0 && !streamingText && (
          <p className="text-center text-sm text-[var(--foreground)]/40 py-8">
            {t('chat.emptyHint')}
          </p>
        )}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3 text-sm transition-all duration-300
                ${msg.role === 'user'
                  ? 'bg-[var(--gold)] text-[var(--card-alt)] rounded-br-sm'
                  : `${theme.bubble} text-[var(--foreground)]/80 rounded-bl-sm border shadow-sm`}
              `}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {/* 流式输出中的消息 */}
        {streamingText && (
          <div className="flex justify-start">
            <div className={`max-w-[80%] ${theme.bubble} rounded-2xl rounded-bl-sm px-4 py-3 border shadow-sm text-sm text-[var(--foreground)]/80 transition-colors duration-500`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{streamingText}</ReactMarkdown>
            </div>
          </div>
        )}
        {isChatResponding && !streamingText && (
          <div className="flex justify-start">
            <div className={`${theme.bubble} rounded-2xl rounded-bl-sm px-4 py-3 border shadow-sm transition-colors duration-500`}>
              <div className={`flex items-center gap-2 text-sm ${theme.icon}`}>
                <Loader2 size={14} className="animate-spin" />
                {t('chat.thinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-3 bg-[var(--card-bg)] border-t-[var(--card-border)]">
        {/* 步骤引用快捷按钮 */}
        {getAllSteps().length > 0 && (
          <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] text-[var(--foreground)]/30 shrink-0">{t('chat.stepRefLabel')}</span>
            {getAllSteps().slice(-6).map(({ detectiveName, step }, i) => (
              <button
                key={`${step.id}-${i}`}
                onClick={() => insertStepRef(detectiveName, step.order, step.content)}
                className="shrink-0 px-2 py-0.5 rounded text-[10px] bg-[var(--card-alt)] border border-[var(--card-border)] text-[var(--foreground)]/50 hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-colors"
                title={step.content.slice(0, 50)}
              >
                {t('chat.stepRefButton', detectiveName, step.order + 1)}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            disabled={isChatResponding}
            rows={1}
            className={`flex-1 resize-none px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-alt)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${theme.input}`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatResponding}
            className={`
              flex items-center justify-center px-4 rounded-lg font-medium transition-all shrink-0
              ${input.trim() && !isChatResponding
                ? `${theme.button} text-white`
                : `${theme.buttonDisabled} cursor-not-allowed`}
            `}
          >
            {isChatResponding ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-xs text-[var(--foreground)]/40 mt-1">{t('chat.enterHint')}</p>
      </div>
    </div>
  );
}
