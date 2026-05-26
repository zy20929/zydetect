/**
 * Markdown 高亮插件
 * 自动将 【证据依据】、【确定程度】、【知识支撑】 标签转换为带样式的 HTML
 * 同时过滤掉 [Image #N] 等模型生成的图片引用
 */

/** 过滤掉模型生成的 [Image #N] 等图片引用 */
function stripImageRefs(text: string): string {
  return text.replace(/\[Image\s*#?\d+\]/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export function remarkHighlightTags() {
  return (tree: any) => {
    // 简单遍历所有文本节点，替换标签为内联 span
    function process(node: any) {
      if (!node) return;

      if (node.type === 'text' && typeof node.value === 'string') {
        let value = node.value;

        // 过滤 [Image #N] 引用
        value = stripImageRefs(value);
        if (value === '') { node.value = ''; return; }

        if (!value.includes('【')) { node.value = value; return; }

        // 用 HTML 替换标签
        const replaced = value
          .replace(/【证据依据】/g, '<span class="evidence-tag">【证据依据】</span>')
          .replace(/【知识支撑】/g, '<span class="knowledge-tag">【知识支撑】</span>')
          .replace(/【确定程度】(确凿|高概率|可能|不确定)/g, (match: string, level: string) => {
            return `<span class="confidence-tag" data-level="${level}">${match}</span>`;
          });

        if (replaced !== value) {
          node.type = 'html';
          node.value = replaced;
          return;
        }
      }

      // 递归处理子节点
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          process(child);
        }
      }
    }

    if (tree.children) {
      for (const child of tree.children) {
        process(child);
      }
    }
  };
}
