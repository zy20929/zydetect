import { useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysis-store';
import { SSEEvent } from '@/lib/types';

export function useAnalysis() {
  const store = useAnalysisStore();

  const startAnalysis = useCallback(async () => {
    const { imageDataUrls, selectedPersonas, mode } = store;
    if (imageDataUrls.length === 0 || selectedPersonas.length === 0) return;

    store.startAnalysis();

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

              // 收到报告时保存到历史
              if (event.type === 'report') {
                store.saveToHistory(event.content);
              }
              // 完成或错误时结束分析
              if (event.type === 'done' || event.type === 'error') {
                store.finishAnalysis();
              }
            } catch {
              // 跳过格式不正确的事件
            }
          }
        }
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '分析请求失败');
    }
  }, [store]);

  return { startAnalysis };
}
