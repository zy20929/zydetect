/**
 * 外部知识检索引擎
 * 数据源：Wikipedia REST API + DuckDuckGo Instant Answer API
 */

import { KnowledgeItem } from './types';

/**
 * 从图片中提取检索关键词
 * 调用 Claude 分析图片，返回 3-5 个最有价值的搜索关键词
 */
export async function extractKeywords(
  imageBase64: string,
  onText?: (delta: string) => void,
): Promise<string[]> {
  const { streamClaudeVision } = await import('./claude');

  let fullText = '';

  await streamClaudeVision(
    `你是一个专业的图片分析助手。请分析这张图片，提取 3-5 个最有价值的搜索关键词。

这些关键词应该能帮助搜索引擎找到关于图中内容的真实信息。

## 关键词类型
- 地理位置（城市、地标、国家）
- 建筑名称或风格
- 历史事件或时期
- 人物或角色
- 动植物或自然现象
- 文化或艺术相关

## 输出格式
请仅输出关键词列表，每行一个，不要解释。
例如：
埃菲尔铁塔
巴黎
战神广场
铁结构建筑
1889年`,
    imageBase64,
    {
      onText: (delta) => {
        fullText += delta;
        onText?.(delta);
      },
      onDone: () => {},
      onError: () => {},
    },
  );

  // 解析关键词：按行分割，去除空行
  const keywords = fullText
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter((line) => line.length > 1 && !/^[#\d]/.test(line))
    .slice(0, 5);

  return keywords.length > 0 ? keywords : ['图片内容'];
}

/**
 * 搜索 Wikipedia
 * 调用 Wikipedia REST API 获取文章摘要
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchWikipedia(keywords: string[]): Promise<KnowledgeItem[]> {
  const items: KnowledgeItem[] = [];

  for (const keyword of keywords.slice(0, 2)) {
    try {
      // Wikipedia REST API — 搜索
      const searchUrl = `https://zh.wikipedia.org/api/rest_v1/search/page?q=${encodeURIComponent(keyword)}&limit=1`;

      const searchResp = await fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent': 'DetectiveAI/1.0 (Knowledge Research Tool)',
          Accept: 'application/json',
        },
      }, 5000);

      if (!searchResp.ok) continue;

      const searchData = await searchResp.json();

      if (searchData.pages && searchData.pages.length > 0) {
        const page = searchData.pages[0];

        // 获取页面摘要
        const summaryUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
        const summaryResp = await fetchWithTimeout(summaryUrl, {
          headers: {
            'User-Agent': 'DetectiveAI/1.0 (Knowledge Research Tool)',
          },
        }, 5000);

        if (summaryResp.ok) {
          const summaryData = await summaryResp.json();
          if (summaryData.extract) {
            items.push({
              source: 'wikipedia',
              title: summaryData.title || page.title,
              summary: summaryData.extract,
              url: summaryData.content_urls?.desktop?.page,
              relevance: 'high',
            });
          }
        }
      }
    } catch {
      // 单个搜索失败不影响其他搜索
      continue;
    }
  }

  return items;
}

/**
 * 搜索 DuckDuckGo Instant Answer
 * 获取即时答案和相关信息
 */
export async function searchDuckDuckGo(keywords: string[]): Promise<KnowledgeItem[]> {
  const items: KnowledgeItem[] = [];

  for (const keyword of keywords.slice(0, 2)) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(keyword)}&format=json&no_html=1&skip_disambig=1`;

      const resp = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'DetectiveAI/1.0',
        },
      }, 5000);

      if (!resp.ok) continue;

      const data = await resp.json();

      // 提取即时答案
      if (data.Abstract) {
        items.push({
          source: 'duckduckgo',
          title: data.Heading || keyword,
          summary: data.Abstract,
          url: data.AbstractURL,
          relevance: 'high',
        });
      }

      // 提取相关主题
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        const topic = data.RelatedTopics[0];
        if (topic.Text && topic.FirstURL) {
          items.push({
            source: 'duckduckgo',
            title: topic.Text.split(' - ')[0] || keyword,
            summary: topic.Text,
            url: topic.FirstURL,
            relevance: 'medium',
          });
        }
      }
    } catch {
      continue;
    }
  }

  return items;
}

/**
 * 完整的知识检索流程
 * 1. 提取关键词
 * 2. 搜索 Wikipedia
 * 3. 搜索 DuckDuckGo
 * 4. 合并去重
 */
export async function gatherKnowledge(
  imageBase64: string,
  callbacks?: {
    onKeywords?: (keywords: string[]) => void;
    onSearching?: (source: string, query: string) => void;
  },
): Promise<KnowledgeItem[]> {
  // 阶段 1: 提取关键词
  const keywords = await extractKeywords(imageBase64);
  callbacks?.onKeywords?.(keywords);

  // 阶段 2: 并行搜索多个来源
  callbacks?.onSearching?.('wikipedia', keywords.join(', '));
  callbacks?.onSearching?.('duckduckgo', keywords.join(', '));

  const [wikiResults, ddgResults] = await Promise.all([
    searchWikipedia(keywords),
    searchDuckDuckGo(keywords),
  ]);

  // 阶段 3: 合并去重
  const allItems = [...wikiResults, ...ddgResults];

  // 按标题去重
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, 10); // 最多返回 10 条知识
}
