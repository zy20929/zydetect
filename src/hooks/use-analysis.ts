import { useCallback, useRef } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { SSEEvent } from '@/lib/types';

export function useAnalysis() {
  const store = useAnalysisStore();
  const { locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);
  // 异步事件队列，防止 React 批量合并更新
  const eventQueueRef = useRef<SSEEvent[]>([]);
  const processingRef = useRef(false);

  /** 逐个处理 SSE 事件，每步都 yield 给浏览器渲染 */
  const processNextEvent = useCallback(() => {
    const queue = eventQueueRef.current;
    if (queue.length === 0 || processingRef.current) return;
    processingRef.current = true;

    const event = queue.shift()!;
    store.handleSSEEvent(event);

    if (event.type === 'report') {
      store.saveToHistory(event.content);
    }

    if (event.type === 'done' || event.type === 'error') {
      processingRef.current = false;
      return;
    }

    processingRef.current = false;
    // 用 setTimeout 0 强制 yield 给浏览器，触发一次渲染
    setTimeout(processNextEvent, 0);
  }, [store]);

  const enqueueEvent = useCallback((event: SSEEvent) => {
    eventQueueRef.current.push(event);
    if (!processingRef.current) {
      processNextEvent();
    }
  }, [processNextEvent]);

  const startAnalysis = useCallback(async () => {
    const { imageDataUrls, selectedPersonas, mode } = store;
    if (imageDataUrls.length === 0 || selectedPersonas.length === 0) return;

    // 清空之前的队列
    eventQueueRef.current = [];
    processingRef.current = false;

    store.startAnalysis();

    const maxRetries = 2;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // 指数退避：2s → 4s → 8s
        const delay = 2000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: imageDataUrls,
            personas: selectedPersonas,
            mode,
            locale,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: SSEEvent = JSON.parse(line.slice(6));
                enqueueEvent(event);

                if (event.type === 'done' || event.type === 'error') {
                  store.finishAnalysis();
                  if (event.type === 'error' && attempt < maxRetries) {
                    lastError = event.message;
                    throw new Error(lastError);
                  }
                  return;
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message === lastError) {
                  throw parseErr;
                }
              }
            }
          }
        }

        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        lastError = err instanceof Error ? err.message : '分析请求失败';
        if (attempt >= maxRetries) {
          store.setError(lastError);
        }
      }
    }
  }, [store, locale, enqueueEvent]);

  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      store.cancelAnalysis();
    }
  }, [store]);

  return { startAnalysis, cancelAnalysis };
}
