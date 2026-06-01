import { DetectiveId } from './types';
import { PERSONA_MAP } from './constants';

/** 生成单人侦探调查报告 */
export function generateReport(detectiveId: DetectiveId, fullText: string): string {
  const persona = PERSONA_MAP[detectiveId];
  if (!persona) return fullText;

  const now = new Date().toLocaleDateString('zh-CN');

  return `# 调查报告

> **侦探**: ${persona.nameZh} — ${persona.title}
> **日期**: ${now}
> **模式**: 单独分析

---

${fullText}
`;
}

/** 生成多侦探联合调查报告 */
export function generateMultiDetectiveReport(
  personaIds: DetectiveId[],
  results: Record<string, string>,
  synthesis: string,
): string {
  const now = new Date().toLocaleDateString('zh-CN');

  let report = `# 联合调查报告\n\n`;
  report += `> **侦探团队**: ${personaIds.map((id) => PERSONA_MAP[id]?.nameZh).join('、')}\n`;
  report += `> **日期**: ${now}\n`;
  report += `> **模式**: 组团推理\n\n---\n\n`;

  // 各侦探独立推理
  for (const id of personaIds) {
    const persona = PERSONA_MAP[id];
    if (!persona) continue;

    report += `\n## ${persona.nameZh}（${persona.title}）的推理\n\n`;
    report += results[id] || `*无推理结果*\n\n`;
    report += `---\n\n`;
  }

  // 综合推理
  if (synthesis) {
    report += `\n## 联合综合推理\n\n`;
    report += synthesis + '\n\n';
    report += `---\n\n`;
  }

  return report;
}
