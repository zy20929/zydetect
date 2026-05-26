import { create } from 'zustand';
import {
  DetectiveId,
  AnalysisMode,
  DetectiveReasoning,
  SSEEvent,
  KnowledgeItem,
  KnowledgeEntry,
  ChatMessage,
} from '@/lib/types';

/** 收藏的侦探组合 */
interface FavoriteCombo {
  id: string;
  name: string;
  personas: DetectiveId[];
  mode: AnalysisMode;
  createdAt: string;
}

/** 反馈记录 */
interface FeedbackRecord {
  reportId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

/** 知识检索状态 */
interface KnowledgeState {
  isSearching: boolean;
  keywords: string[];
  searchingSource: string;
  searchingQuery: string;
  externalKnowledge: KnowledgeItem[];
  localKnowledge: KnowledgeEntry[];
  aiAvailable: boolean | null; // null=未检测, true=可用, false=不可用（回退知识库）
}

interface AnalysisState {
  // 输入
  imageDataUrls: string[];
  imageFileName: string;
  selectedPersonas: DetectiveId[];
  mode: AnalysisMode;

  // 分析状态
  isAnalyzing: boolean;
  analysisStartTime: number | null; // 分析开始时间戳（用于计算 ETA）
  detectives: Record<DetectiveId, DetectiveReasoning>;
  synthesisText: string;
  isSynthesizing: boolean;
  finalReport: string;
  error: string | null;

  // 知识检索
  knowledgeState: KnowledgeState;

  // 对话
  chatMessages: ChatMessage[];
  isChatResponding: boolean;

  // 历史记录（内存 + 持久化）
  history: { id: string; imageDataUrls: string[]; personas: DetectiveId[]; report: string; createdAt: string }[];

  // 收藏组合
  favorites: FavoriteCombo[];

  // 反馈记录
  feedbacks: FeedbackRecord[];

  // 操作
  setImage: (dataUrl: string, fileName: string) => void;
  addImage: (dataUrl: string) => void;
  removeImage: (index: number) => void;
  setPersonas: (personas: DetectiveId[]) => void;
  setMode: (mode: AnalysisMode) => void;
  startAnalysis: () => void;
  handleSSEEvent: (event: SSEEvent) => void;
  finishAnalysis: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
  clearChat: () => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatResponding: (responding: boolean) => void;
  saveToHistory: (report: string) => void;
  loadFromHistory: (index: number) => void;
  deleteFromHistory: (index: number) => void;
  addFavorite: (name: string) => void;
  removeFavorite: (id: string) => void;
  loadFavorite: (id: string) => void;
  submitFeedback: (reportId: string, rating: number, comment: string) => void;
}

/** 创建空的侦探推理状态 */
const createEmptyDetective = (id: DetectiveId): DetectiveReasoning => ({
  detectiveId: id,
  steps: [],
  fullText: '',
  status: 'pending',
});

/** 初始知识状态 */
const emptyKnowledgeState: KnowledgeState = {
  isSearching: false,
  keywords: [],
  searchingSource: '',
  searchingQuery: '',
  externalKnowledge: [],
  localKnowledge: [],
  aiAvailable: null,
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  // 初始状态
  imageDataUrls: [],
  imageFileName: '',
  selectedPersonas: [],
  mode: 'solo',
  isAnalyzing: false,
  analysisStartTime: null,
  detectives: {} as Record<DetectiveId, DetectiveReasoning>,
  synthesisText: '',
  isSynthesizing: false,
  finalReport: '',
  error: null,
  knowledgeState: emptyKnowledgeState,
  chatMessages: [],
  isChatResponding: false,
  history: [],
  favorites: [],
  feedbacks: [],

  setImage: (dataUrl, fileName) => set({ imageDataUrls: [dataUrl], imageFileName: fileName }),
  addImage: (dataUrl: string) => set((state) => ({ imageDataUrls: [...state.imageDataUrls, dataUrl] })),
  removeImage: (index: number) => set((state) => ({ imageDataUrls: state.imageDataUrls.filter((_, i) => i !== index) })),
  setPersonas: (personas) => set({ selectedPersonas: personas }),
  setMode: (mode) => {
    const currentMode = get().mode;
    // 从组团切换为个人时，清空已选侦探
    if (currentMode === 'group' && mode === 'solo') {
      set({ mode, selectedPersonas: [] });
    } else {
      set({ mode });
    }
  },

  /** 开始分析 — 重置侦探和知识状态 */
  startAnalysis: () => {
    const { selectedPersonas } = get();
    const detectives: Record<DetectiveId, DetectiveReasoning> = {} as Record<DetectiveId, DetectiveReasoning>;
    selectedPersonas.forEach((id) => {
      detectives[id] = createEmptyDetective(id);
    });
    set({
      isAnalyzing: true,
      analysisStartTime: Date.now(),
      detectives,
      synthesisText: '',
      isSynthesizing: false,
      finalReport: '',
      error: null,
      knowledgeState: { ...emptyKnowledgeState, isSearching: true },
    });
  },

  /** 处理 SSE 事件 */
  handleSSEEvent: (event) =>
    set((state) => {
      const detectives = { ...state.detectives };
      const knowledgeState = { ...state.knowledgeState };

      switch (event.type) {
        // AI 模型可用性检测
        case 'model_check':
          return {
            knowledgeState: { ...state.knowledgeState, aiAvailable: event.available },
          };

        // 知识检索开始
        case 'knowledge_start':
          return {
            knowledgeState: { ...emptyKnowledgeState, isSearching: true },
          };

        // 提取到关键词
        case 'knowledge_keyword_extracted':
          return {
            knowledgeState: { ...state.knowledgeState, keywords: event.keywords },
          };

        // 正在搜索某来源
        case 'knowledge_searching':
          return {
            knowledgeState: {
              ...state.knowledgeState,
              searchingSource: event.source,
              searchingQuery: event.query,
            },
          };

        // 知识检索结果
        case 'knowledge_result':
          return {
            knowledgeState: {
              isSearching: false,
              keywords: state.knowledgeState.keywords,
              searchingSource: '',
              searchingQuery: '',
              externalKnowledge: event.knowledge,
              localKnowledge: event.localKnowledge,
              aiAvailable: state.knowledgeState.aiAvailable,
            },
          };

        // 某位侦探开始推理
        case 'detective_start':
          if (detectives[event.detectiveId]) {
            detectives[event.detectiveId] = { ...detectives[event.detectiveId], status: 'streaming' };
          }
          return { detectives };

        // 收到推理步骤
        case 'step':
          if (detectives[event.detectiveId]) {
            const d = detectives[event.detectiveId];
            detectives[event.detectiveId] = {
              ...d,
              steps: [...d.steps, event.step],
            };
          }
          return { detectives };

        // 某位侦探完成
        case 'detective_complete':
          if (detectives[event.detectiveId]) {
            detectives[event.detectiveId] = {
              ...detectives[event.detectiveId],
              status: 'complete',
              fullText: event.fullText,
            };
          }
          return { detectives };

        // 综合推理开始
        case 'synthesis_start':
          return { isSynthesizing: true, synthesisText: '' };

        // 综合推理流式内容
        case 'synthesis_delta':
          return { synthesisText: state.synthesisText + event.content };

        // 综合推理完成
        case 'synthesis_complete':
          return { synthesisText: event.content, isSynthesizing: false };

        // 最终报告
        case 'report':
          return { finalReport: event.content };

        // 错误
        case 'error':
          return {
            error: event.message,
            isAnalyzing: false,
            isSynthesizing: false,
            knowledgeState: { ...state.knowledgeState, isSearching: false },
          };

        default:
          return state;
      }
    }),

  finishAnalysis: () =>
    set((state) => ({
      isAnalyzing: false,
      isSynthesizing: false,
      knowledgeState: { ...state.knowledgeState, isSearching: false },
    })),
  setError: (error) =>
    set((state) => ({
      error,
      isAnalyzing: false,
      isSynthesizing: false,
      knowledgeState: { ...state.knowledgeState, isSearching: false },
    })),

  /** 重置所有状态 */
  reset: () =>
    set({
      imageDataUrls: [],
      imageFileName: '',
      selectedPersonas: [],
      isAnalyzing: false,
      isSynthesizing: false,
      analysisStartTime: null,
      detectives: {} as Record<DetectiveId, DetectiveReasoning>,
      synthesisText: '',
      finalReport: '',
      error: null,
      knowledgeState: emptyKnowledgeState,
      chatMessages: [],
      isChatResponding: false,
    }),

  /** 清空对话 */
  clearChat: () => set({ chatMessages: [], isChatResponding: false }),

  /** 添加对话消息 */
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  /** 设置对话响应状态 */
  setChatResponding: (responding) => set({ isChatResponding: responding }),

  /** 保存到历史记录 */
  saveToHistory: (report) =>
    set((state) => {
      const newItem = {
        id: Date.now().toString(),
        imageDataUrls: state.imageDataUrls,
        personas: state.selectedPersonas,
        report,
        createdAt: new Date().toISOString(),
      };
      const newHistory = [...state.history, newItem];

      try {
        localStorage.setItem('detective-history', JSON.stringify(newHistory));
      } catch {
        // localStorage 不可用时静默失败
      }

      return { history: newHistory };
    }),

  /** 加载历史记录 */
  loadFromHistory: (index) =>
    set((state) => {
      const item = state.history[index];
      if (!item) return state;
      return {
        imageDataUrls: item.imageDataUrls,
        selectedPersonas: item.personas,
        finalReport: item.report,
      };
    }),

  /** 删除历史记录 */
  deleteFromHistory: (index) =>
    set((state) => {
      const newHistory = state.history.filter((_, i) => i !== index);
      try {
        localStorage.setItem('detective-history', JSON.stringify(newHistory));
      } catch {
        // 静默失败
      }
      return { history: newHistory };
    }),

  /** 收藏当前侦探组合 */
  addFavorite: (name) =>
    set((state) => {
      const { selectedPersonas, mode } = state;
      if (selectedPersonas.length === 0) return state;

      const newFavorite: FavoriteCombo = {
        id: Date.now().toString(),
        name,
        personas: selectedPersonas,
        mode,
        createdAt: new Date().toISOString(),
      };
      const newFavorites = [...state.favorites, newFavorite];

      try {
        localStorage.setItem('detective-favorites', JSON.stringify(newFavorites));
      } catch {
        // 静默失败
      }

      return { favorites: newFavorites };
    }),

  /** 删除收藏 */
  removeFavorite: (id) =>
    set((state) => {
      const newFavorites = state.favorites.filter((f) => f.id !== id);
      try {
        localStorage.setItem('detective-favorites', JSON.stringify(newFavorites));
      } catch {
        // 静默失败
      }
      return { favorites: newFavorites };
    }),

  /** 加载收藏组合 */
  loadFavorite: (id) =>
    set((state) => {
      const favorite = state.favorites.find((f) => f.id === id);
      if (!favorite) return state;
      return {
        selectedPersonas: favorite.personas,
        mode: favorite.mode,
      };
    }),

  /** 提交反馈 */
  submitFeedback: (reportId, rating, comment) =>
    set((state) => {
      const newFeedback: FeedbackRecord = {
        reportId,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
      const newFeedbacks = [...state.feedbacks, newFeedback];
      try {
        localStorage.setItem('detective-feedbacks', JSON.stringify(newFeedbacks));
      } catch {
        // 静默失败
      }
      return { feedbacks: newFeedbacks };
    }),
}));

/** 从 localStorage 加载历史记录和收藏 */
export function loadHistoryFromStorage(): void {
  try {
    const historyRaw = localStorage.getItem('detective-history');
    if (historyRaw) {
      const history = JSON.parse(historyRaw);
      useAnalysisStore.setState({ history });
    }
  } catch {
    // 静默失败
  }

  try {
    const favoritesRaw = localStorage.getItem('detective-favorites');
    if (favoritesRaw) {
      const favorites = JSON.parse(favoritesRaw);
      useAnalysisStore.setState({ favorites });
    }
  } catch {
    // 静默失败
  }

  try {
    const feedbacksRaw = localStorage.getItem('detective-feedbacks');
    if (feedbacksRaw) {
      const feedbacks = JSON.parse(feedbacksRaw);
      useAnalysisStore.setState({ feedbacks });
    }
  } catch {
    // 静默失败
  }
}
