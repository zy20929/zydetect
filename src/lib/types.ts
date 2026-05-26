export type DetectiveId =
  // 特例保留（虚构但经典）
  | 'holmes' | 'conan'
  // 古代中国
  | 'digong' | 'baozheng' | 'songci' | 'hairui' | 'kuangzhong' | 'shishilun'
  | 'gaoyao' | 'zhaoguanghan' | 'huangba' | 'kouzhun' | 'yuchenglong' | 'xuyougong'
  // 古代世界
  | 'cicero' | 'antiphon' | 'chanakya' | 'qehsu'
  // 中世纪欧洲
  | 'lareynie' | 'desgrez'
  // 18世纪
  | 'hfielding' | 'jfielding'
  // 19世纪欧洲
  | 'vidocq' | 'bertillon' | 'abberline' | 'gross' | 'locard'
  | 'bell' | 'galton' | 'caminada' | 'wensley' | 'clarke' | 'pollaky' | 'featherstone'
  // 19世纪美洲
  | 'pinkerton' | 'warne'
  | 'einstein' | 'petrosino' | 'burns' | 'flynn' | 'chaplain' | 'goodwin' | 'clement' | 'west' | 'mallory' | 'webster' | 'schindler' | 'oconnell_j' | 'oconnell_d'
  // 20世纪
  | 'spilsbury' | 'henrylee' | 'ness' | 'jeffreys' | 'glessnerlee'
  | 'toschi' | 'kenda' | 'pistone' | 'murphy' | 'pena' | 'serpico' | 'hiratsuka' | 'koshko' | 'tofte' | 'fabian' | 'wickstead' | 'murray' | 'tallman' | 'christie' | 'onraet'
  // 中国当代刑侦专家
  | 'wuguoqing' | 'cuidaozhi' | 'chenshixian' | 'gaotangdou' | 'zhangxin'
  | 'mayulin' | 'dongyanzhen' | 'linyuhui' | 'liuyao' | 'congbin'
  | 'jiazhiwen' | 'zhangjizong' | 'liuliang' | 'lvdenzhong' | 'xulimin'
  | 'jizongtang' | 'chengrui' | 'wangqingju' | 'mengxiaoping' | 'liushuquan'
  | 'qianghui' | 'linqing' | 'koujianping'
  | 'yuxinmin' | 'yanzizhong' | 'baishaokang' | 'wangguiqiang'
  | 'minjianxiong' | 'liujianjun' | 'banmaosen' | 'wangshiqing' | 'zhangshaoqing'
  | 'wangyanji' | 'zhouyunbiao' | 'chenlin' | 'gaozhanguo' | 'wanlihua'
  // 21世纪全球专家
  | 'reichs' | 'kayser' | 'thali' | 'byard' | 'ubelaker' | 'aschheim' | 'acharya'
  | 'douglas' | 'rossmo' | 'burgess' | 'holes' | 'delisi' | 'raine' | 'kwonilyong' | 'leejinsuk'
  | 'sherman' | 'oconnell_m' | 'leblanc' | 'sella' | 'khan' | 'blumenthal' | 'weisburd' | 'bull' | 'hagan' | 'pollanen' | 'eckert'
  | 'kroll' | 'joseph' | 'zhangyufen'
  | 'mcnamara' | 'jensen' | 'weihua' | 'davies' | 'leopold'
  | 'abbakyari' | 'rashidalghafri' | 'hadialghafli' | 'ramanujghosh' | 'johnkai';

export type AnalysisMode = 'solo' | 'group';

export type StepType = 'observation' | 'question' | 'analysis' | 'conclusion';

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

export interface DetectivePersona {
  id: DetectiveId;
  name: string;       // 当前语言下的名称
  nameZh: string;     // 中文名称（始终显示）
  nameEn: string;     // 英文名称
  title: string;
  description: string;
  quote: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

export interface ReasoningStep {
  id: string;
  type: StepType;
  content: string;
  order: number;
}

export interface DetectiveReasoning {
  detectiveId: DetectiveId;
  steps: ReasoningStep[];
  fullText: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  errorMessage?: string;
}

export interface AnalysisResult {
  id: string;
  imageDataUrls: string[];
  imageFileName: string;
  personas: DetectiveId[];
  mode: AnalysisMode;
  detectives: DetectiveReasoning[];
  synthesis: string;
  finalReport: string;
  createdAt: string;
  updatedAt: string;
}

/** 知识检索数据结构 */
export interface KnowledgeItem {
  source: 'wikipedia' | 'duckduckgo' | 'search';
  title: string;
  summary: string;
  url?: string;
  relevance: 'high' | 'medium' | 'low';
}

/** 持久化知识库条目 */
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  keywords: string[];
  content: string;
  source: string;           // 来源描述
  confidence: number;       // 置信度 0-1
  analysisCount: number;    // 被引用的分析次数
  createdAt: string;
  lastVerified: string;
}

export type KnowledgeCategory =
  | 'geography'    // 地理位置
  | 'architecture' // 建筑特征
  | 'history'      // 历史背景
  | 'psychology'   // 人物心理
  | 'environment'  // 自然环境
  | 'predictions'; // 事件预测

/** SSE 事件类型 */
export type SSEEvent =
  | { type: 'model_check'; available: boolean }
  | { type: 'knowledge_start' }
  | { type: 'knowledge_keyword_extracted'; keywords: string[] }
  | { type: 'knowledge_searching'; source: string; query: string }
  | { type: 'knowledge_result'; knowledge: KnowledgeItem[]; localKnowledge: KnowledgeEntry[] }
  | { type: 'knowledge_update'; added: number }
  | { type: 'detective_start'; detectiveId: DetectiveId }
  | { type: 'step'; detectiveId: DetectiveId; step: ReasoningStep }
  | { type: 'detective_complete'; detectiveId: DetectiveId; fullText: string }
  | { type: 'synthesis_start' }
  | { type: 'synthesis_delta'; content: string }
  | { type: 'synthesis_complete'; content: string }
  | { type: 'report'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/** 对话消息类型 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
