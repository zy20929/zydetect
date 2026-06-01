# 鉴微侦探 (zydetect)

> 上传一张图片，汇聚全球名探的独特视角，从细节线索出发，剖析地理环境、建筑特征与人物心理等多个维度，还原事件全貌并推演未来走向。

## 项目概述

**鉴微侦探** 是一个基于 AI 的图片推理分析 Web 应用。用户上传图片后，系统模拟全球历史名探的独特视角，通过观察 → 提问 → 推理 → 结论的四步推理流程，生成详细的分析报告。

**线上地址**：
- Vercel: `https://zydetect.vercel.app/`
- Cloudflare Workers: `https://zydetect.tianheng1973.workers.dev/`

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2.6 (Turbopack) |
| UI | React 19.2.4 + Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| AI | Anthropic Claude API (Claude Sonnet 4) |
| 国际化 | 内置 i18n (zh/en/ja/ko) |
| 部署 | Vercel / Cloudflare Pages + Workers |
| 语言 | TypeScript 5 |

## 核心功能

### 1. 图片推理分析
- 支持上传 JPG / PNG / GIF / WebP 格式图片
- 支持多图对比分析
- 基于 Claude 视觉模型的深度图片理解

### 2. 侦探角色系统
- **175+ 位真实历史侦探**，按朝代/国家/年代分类
- 每位侦探拥有独立的系统提示词、推理风格和专属 UI 配色
- 涵盖从古代中国到 21 世纪全球的法医学、刑侦学专家

### 3. 双模式分析
- **单人推理**：选择一位侦探，沉浸式体验其推理过程
- **组团推理**：多位侦探并行分析 + AI 综合推理，产生跨视角的联合结论

### 4. 实时推理展示
- SSE 流式输出，推理过程实时展示
- 四大推理步骤：观察 → 提问 → 推理 → 结论
- 思维导图 / 时间线 两种可视化模式
- 侦探对决模式（2 位侦探时自动触发）

### 5. 外部知识检索
- 自动从图片中提取关键词
- 检索 Wikipedia 和 DuckDuckGo 获取背景知识
- 本地知识库持久化存储，逐步积累分析经验

### 6. 对话交互
- 分析完成后，可与侦探进行后续对话
- 支持针对分析结果的深入追问

### 7. 报告导出
- 支持 Markdown 导出
- 支持复制、分享
- 支持导出为长图 (PNG)

### 8. 多语言支持
- 中文 (zh) / 英文 (en) / 日文 (ja) / 韩文 (ko)
- 一键切换

### 9. 主题切换
- 暗色模式 (默认) / 亮色模式
- 侦探风格深色 UI

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/v1/                   # API 路由
│   │   ├── analyze/route.ts      # 核心推理分析 API (SSE)
│   │   ├── chat/route.ts         # 对话交互 API (SSE)
│   │   └── knowledge/route.ts    # 知识库管理 API
│   ├── history/page.tsx          # 历史分析记录页面
│   ├── knowledge/page.tsx        # 知识库管理页面
│   ├── page.tsx                  # 首页
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式
├── components/
│   ├── analysis/                 # 分析相关组件
│   │   ├── analysis-view.tsx     # 主分析视图
│   │   ├── chat-window.tsx       # 对话窗口
│   │   ├── cost-estimate.tsx     # 成本估算
│   │   ├── detective-duel.tsx    # 侦探对决
│   │   ├── knowledge-panel.tsx   # 知识面板
│   │   ├── reasoning-mindmap.tsx # 推理思维导图
│   │   ├── reasoning-timeline.tsx# 推理时间线
│   │   └── ...
│   ├── demo/                     # 演示组件
│   │   └── reasoning-demo.tsx    # 自动推理演示
│   ├── layout/                   # 布局组件
│   │   ├── header.tsx            # 顶部导航栏
│   │   ├── privacy-notice.tsx    # 隐私提示
│   │   ├── starfield-background.tsx
│   │   └── toast.tsx
│   ├── persona/                  # 侦探角色组件
│   │   ├── persona-sidebar.tsx   # 侦探选择侧栏
│   │   └── favorites-manager.tsx # 收藏管理
│   ├── upload/                   # 上传组件
│   │   ── image-upload.tsx      # 图片上传区域
│   └── ui/                       # 通用 UI 组件
├── hooks/
│   └── use-analysis.ts           # 分析流程 Hook
├── i18n/
│   ├── context.tsx               # i18n 上下文
│   └── translations.ts           # 翻译文本 (zh/en/ja/ko)
├── lib/
│   ├── claude.ts                 # Anthropic Claude API 封装
│   ├── constants.ts              # 侦探角色数据 (175+位)
│   ├── types.ts                  # TypeScript 类型定义
│   ├── knowledge.ts              # 外部知识检索 (Wikipedia/DDG)
│   ├── knowledge-base.ts         # 本地知识库 CRUD
│   ├── knowledge-categories.ts   # 知识分类定义
│   ├── markdown.ts               # Markdown 报告生成
│   └── utils.ts                  # 工具函数
├── prompts/                      # 侦探系统提示词
│   ├── base.ts                   # 基础提示词模板
│   ├── holmes.ts                 # 福尔摩斯
│   ├── chinese.ts                # 中国古代名探
│   ├── chinese-experts.ts        # 中国当代刑侦专家 (48位)
│   ├── c19-europe.ts             # 19世纪欧洲
│   ├── c19-america.ts            # 19世纪美洲
│   ├── c20.ts                    # 20世纪
│   ├── c21-experts.ts            # 21世纪全球专家
│   ├── ancient.ts                # 古代世界
│   ├── medieval.ts               # 中世纪欧洲 + 18世纪
│   └── index.ts                  # 提示词注册表
└── store/
    └── analysis-store.ts         # Zustand 全局状态管理
```

## 侦探阵容 (175+ 位)

| 分类 | 数量 | 代表人物 |
|------|------|----------|
| 经典特例 | 2 | 福尔摩斯、柯南 |
| 中国古代名探 | 12 | 狄仁杰、包拯、宋慈、海瑞、况钟、施世纶 |
| 中国古代扩充 | 6 | 皋陶、赵广汉、黄霸、寇准、于成龙、徐有功 |
| 古代世界 | 4 | 西塞罗、安提丰、考底利耶、凯苏 |
| 中世纪欧洲 | 2 | 拉·雷尼、德格列 |
| 18 世纪 | 2 | 亨利·菲尔丁、约翰·菲尔丁 |
| 19 世纪欧洲 | 13 | 维多克、贝蒂荣、阿伯林、洛卡德、贝尔、高尔顿 |
| 19 世纪美洲 | 14 | 平克顿、凯特·沃恩、伯恩斯、佩特罗西诺 |
| 20 世纪 | 21 | 斯皮尔斯伯里、李昌钰、埃利奥特·内斯、杰弗里斯、托斯基 |
| 中国当代刑侦专家 | 48 | 崔道植、张欣、乌国庆、陈世贤、高堂斗 |
| 21 世纪全球专家 | 39 | Reichs、Kayser、Thali、道格拉斯、RossMo |
| 新兴力量 | 4 | McNamara、Jensen、Davies、Leopold |
| 中东/南亚专家 | 5 | Abbakyari、Rashid Al-Ghafri、Hadial Ghafli、Ramanuj Ghosh、John Kai |

## API 接口

### `POST /api/v1/analyze`
核心推理分析接口，SSE 流式输出。

**请求体**：
```typescript
{
  images: string[];      // Base64 图片数据 URL 数组
  personas: DetectiveId[]; // 侦探 ID 列表
  mode: 'solo' | 'group';  // 分析模式
}
```

**SSE 事件类型**：
| 事件类型 | 说明 |
|----------|------|
| `model_check` | AI 模型可用性检测 |
| `knowledge_start` | 知识检索开始 |
| `knowledge_keyword_extracted` | 提取到关键词 |
| `knowledge_searching` | 正在搜索外部知识 |
| `knowledge_result` | 外部知识 + 本地知识结果 |
| `detective_start` | 某侦探开始推理 |
| `step` | 推理步骤 (观察/提问/推理/结论) |
| `detective_complete` | 某侦探推理完成 |
| `synthesis_start/delta/complete` | 综合推理过程 (组团模式) |
| `report` | 最终报告 |
| `done` | 全部完成 |
| `error` | 错误 |

### `POST /api/v1/chat`
对话交互接口，SSE 流式输出。

**请求体**：
```typescript
{
  images: string[];
  detectiveIds: DetectiveId[];
  messages: ChatMessage[];   // 对话历史
  lastAnalysisText: string;  // 上一次分析结果
}
```

### `POST /api/v1/knowledge`
知识库管理接口。

## 推理流程

```
用户上传图片 + 选择侦探
        │
        ▼
  [阶段 0] AI 模型可用性检测
        │
        ▼
  [阶段 1] 知识检索
    ├── Claude 提取图片关键词
    ├── Wikipedia API 搜索
    ├── DuckDuckGo API 搜索
    └── 本地知识库检索
        │
        ▼
  [阶段 2] 侦探推理
    ├── 单人模式: 单个侦探并行推理
    └── 组团模式: 多位侦探并行推理 + AI 综合
        │
        ▼
  [阶段 3] 报告生成
    ├── Markdown 格式化
    └── 知识库更新 (提取知识点)
        │
        ▼
  [阶段 4] 对话交互 (可选)
    └── 基于分析结果的后续问答
```

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | 是 |
| `ANTHROPIC_BASE_URL` | API 基础 URL (可自定义代理) | 否 |
| `ANTHROPIC_MODEL` | 使用的模型 (默认 claude-sonnet-4-20250514) | 否 |

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入 ANTHROPIC_API_KEY

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

## 部署

### Vercel (推荐)
1. 连接 GitHub 仓库
2. 自动检测 Next.js 项目
3. 添加环境变量 `ANTHROPIC_API_KEY`
4. 部署

### Cloudflare Workers
```bash
npm run build
npx wrangler deploy
```

### Cloudflare Pages
```bash
npm run pages-build
```

## 设计特色

- **侦探风格 UI**：深空蓝色调 + 金色点缀，营造神秘氛围
- **星空背景动画**：Canvas 粒子星空效果
- **打字机动效**：标题闪烁、聚光灯扫过效果
- **响应式设计**：完整支持手机/平板/桌面端
- **暗色/亮色主题**：一键切换
