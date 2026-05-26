'use client';

import { useState, useEffect, useRef } from 'react';

/** 打字机效果组件 — 逐字显示文本 */
export default function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const prevTextRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const charIndexRef = useRef(0);

  useEffect(() => {
    // 当新文本追加时，从上次位置继续打字
    if (text.length > prevTextRef.current.length) {
      // 新增部分开始打字
      const start = prevTextRef.current.length;
      const end = text.length;
      let idx = start;

      // 清除旧定时器
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = window.setInterval(() => {
        if (idx < end) {
          idx++;
          setDisplayed(text.slice(0, idx));
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, speed);

      prevTextRef.current = text;
      charIndexRef.current = end;
    } else if (text === '') {
      setDisplayed('');
      prevTextRef.current = '';
      charIndexRef.current = 0;
    }
  }, [text, speed]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return <>{displayed}</>;
}
