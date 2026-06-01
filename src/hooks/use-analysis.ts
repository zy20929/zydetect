import { useCallback, useRef } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { useI18n } from '@/i18n/context';
import { SSEEvent } from '@/lib/types';

export function useAnalysis() {
  const store = useAnalysisStore();
  const { locale } = useI18n();
  const abortRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async () => {
    const { imageDataUrls, selectedPersonas, mode } = store;
    if (imageDataUrls.length === 0 || selectedPersonas.length === 0) return;

    store.startAnalysis();

    const maxRetries = 2;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 2000));
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
                store.handleSSEEvent(event);

                if (event.type === 'report') {
                  store.saveToHistory(event.content);
                }
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
  }, [store, locale]);

  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      store.cancelAnalysis();
    }
  }, [store]);

  return { startAnalysis, cancelAnalysis };
}
