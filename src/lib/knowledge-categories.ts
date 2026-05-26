/**
 * 知识库分类配置（客户端可用）
 */

import { KnowledgeCategory } from './types';

export const KNOWLEDGE_CATEGORIES: Record<KnowledgeCategory, { label: string; icon: string }> = {
  geography: { label: '地理位置', icon: '🌍' },
  architecture: { label: '建筑特征', icon: '🏛️' },
  history: { label: '历史背景', icon: '📜' },
  psychology: { label: '人物心理', icon: '🧠' },
  environment: { label: '自然环境', icon: '🌿' },
  predictions: { label: '事件预测', icon: '🔮' },
};
