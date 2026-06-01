import { useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { SSEEvent } from '@/lib/types';

export function useAnalysis() {
  const store = useAnalysisStore();

  const startAnalysis = useCallback(async () => {
    const { imageDataUrls, selectedPersonas, mode } = store;
    if (imageDataUrls.length === 0 || selectedPersonas.length === 0) return;

    store.startAnalysis();

    const maxRetries = 2;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // 等待后重试
        await new Promise(r => setTimeout(r, 2000));
      }

      try {
        const response = await fetch('/api/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: imageDataUrls,
            personas: selectedPersonas,
            mode,
          }),
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
                  // 如果是 error 且还有重试次数，不返回
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
                // 跳过格式不正确的事件
              }
            }
          }
        }

        // 正常结束
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : '分析请求失败';
        if (attempt >= maxRetries) {
          store.setError(lastError);
        }
      }
    }
  }, [store]);

  return { startAnalysis };
}
