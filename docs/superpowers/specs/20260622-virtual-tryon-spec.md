# 虚拟试衣生成器 — 需求文档 & 技术文档

> 版本：v1.0 | 日期：2026-06-22

---

## 目录

1. [项目概述](#1-项目概述)
2. [功能需求](#2-功能需求)
3. [非功能需求](#3-非功能需求)
4. [技术架构](#4-技术架构)
5. [前端设计](#5-前端设计)
6. [后端设计](#6-后端设计)
7. [AI API 集成](#7-ai-api-集成)
8. [数据流与状态](#8-数据流与状态)
9. [接口规范](#9-接口规范)

---

## 1. 项目概述

### 1.1 项目定位

个人工具类网站，用户上传衣服图片，通过 AI 图片生成大模型生成模特穿着该衣服的效果图。无需用户系统，简单 Demo 级别。

### 1.2 核心场景

- **场景 A**：电商卖家上传一件衣服的多个角度照片，生成模特试穿图
- **场景 B**：用户上传上衣+裤子的照片，生成完整穿搭效果图

### 1.3 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React |
| 后端 | Node.js |
| AI | 用户自有图片生成大模型 API（参考图 + 提示词 → 生成图） |

---

## 2. 功能需求

### FR-1：图片上传

- 支持拖拽上传和点击选择文件
- 支持常见图片格式：JPG、PNG、WebP
- 单张图片大小限制 10MB
- 上传后即时预览缩略图
- 支持删除已选图片和批量清空

### FR-2：标签归组

- 每张图片可选择已有标签或新建标签
- 相同标签的照片视为同一件衣服的不同角度/细节照片
- 标签可自定义命名（如"上衣A"、"裤子B"）
- 支持修改已分配标签和删除标签

### FR-3：生成模式

- **一对一模式**：每组标签独立生成一张模特图，N 组 → N 张图
- **组合穿搭模式**：所有组标签的衣服合并生成一张完整穿搭模特图，N 组 → 1 张图
- 用户可在提交前切换模式

### FR-4：模特自定义

- **性别**：男 / 女 / 中性
- **背景风格**：纯白背景 / 灰色背景 / 自然场景
- **姿态**：自然站姿 / 行走姿态 / 坐姿

### FR-5：AI 生成与等待

- 提交后调用后端 API，后端转发至图片生成大模型
- 生成过程中显示加载状态和进度提示
- 支持异步轮询结果（或等待同步返回）

### FR-6：结果展示与下载

- 生成结果以图片网格展示
- 每张结果图支持独立下载
- 多张结果图时支持全部打包下载（ZIP）
- 支持重新生成（保留之前的配置）

### FR-7：错误处理

- 上传非图片文件时给出明确提示
- 图片过大时给出大小限制提示
- AI API 调用失败时展示错误信息并提供重试
- 网络异常时的断连提示

---

## 3. 非功能需求

### NFR-1：性能

- 页面首屏加载 < 3 秒
- 图片上传预览无卡顿（前端压缩缩略图）
- 生成请求超时时间 120 秒

### NFR-2：可用性

- 响应式布局，桌面端优先
- 操作流程直观，步骤引导明确
- 关键操作有即时反馈

### NFR-3：安全

- 上传文件类型后端二次校验
- 图片数据不落盘持久化存储（内存或临时文件，生成后清理）

---

## 4. 技术架构

### 4.1 整体架构

```
浏览器 (React SPA)
    │
    │ REST API (JSON)
    │
Node.js 服务器
    ├── 路由层 (routes/)
    ├── 服务层 (services/)
    │   ├── prompt-builder.js   — 提示词构建
    │   ├── image-processor.js  — 图片处理
    │   └── ai-client.js        — AI API 客户端
    └── 工具层 (utils/)
    │
    │ HTTP
    │
图片生成大模型 API (用户提供)
    输入：参考图 + 提示词
    输出：生成图
```

### 4.2 与 AI API 的交互模式

根据两种生成模式，调用 API 的逻辑不同：

**一对一模式**：每个标签组独立调用一次 API，并行发出：

```
上衣A → API → 模特穿"上衣A"的图
裤子A → API → 模特穿"裤子A"的图
```

**组合穿搭模式**：所有标签组的图片合并为一次调用：

```
上衣A + 裤子A → API → 模特穿"上衣A"+"裤子A"的完整穿搭图
```

---

## 5. 前端设计

### 5.1 页面结构

单页面应用，分为 4 个步骤区域（纵向排列）：

```
┌──────────────────────────────────────┐
│  🧥 虚拟试衣生成器    (Header)         │
├──────────────────────────────────────┤
│  步骤1：上传衣服图片                    │
│  ┌──────────────────────────────────┐ │
│  │  拖拽/点击上传区    缩略图预览      │ │
│  └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  步骤2：标签归组                       │
│  ┌──────────────────────────────────┐ │
│  │  图片列表 + 标签下拉选择 + 新建标签  │ │
│  └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  步骤3：生成配置                       │
│  ┌──────────────────────────────────┐ │
│  │  模式选择 | 性别 | 背景 | 姿态      │ │
│  │  [🚀 开始生成]                     │ │
│  └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  步骤4：生成结果                       │
│  ┌──────────────────────────────────┐ │
│  │  结果图片网格 | 单张下载 | 打包下载 │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 5.2 组件树

```
App
├── Header
├── StepUpload          (步骤1：上传)
│   ├── DropZone
│   └── ThumbnailList
│       └── ThumbnailItem (删除按钮)
├── StepTagging         (步骤2：标签)
│   └── ImageTagRow
│       ├── Thumbnail
│       ├── TagDropdown  (已有标签选择)
│       └── NewTagInput  (新建标签)
├── StepConfig          (步骤3：配置)
│   ├── ModeSelector    (一对一 / 组合穿搭)
│   ├── GenderSelector
│   ├── BackgroundSelector
│   ├── PoseSelector
│   └── GenerateButton
├── StepResult          (步骤4：结果)
│   ├── LoadingSpinner
│   ├── ResultGrid
│   │   └── ResultCard (预览 + 下载按钮)
│   └── DownloadAllButton
└── ErrorBoundary
```

### 5.3 状态管理

使用 React 内置 `useReducer` + Context，无需引入 Redux。核心状态：

```typescript
interface AppState {
  // 步骤1：上传
  uploadedImages: { id: string; name: string; dataUrl: string }[];

  // 步骤2：标签
  tags: string[];                              // 所有标签名列表
  imageTags: Record<string, string>;           // imageId → tagName

  // 步骤3：配置
  mode: 'single' | 'outfit';
  config: {
    gender: 'male' | 'female' | 'neutral';
    background: 'white' | 'gray' | 'natural';
    pose: 'standing' | 'walking' | 'sitting';
  };

  // 步骤4：结果
  taskStatus: 'idle' | 'generating' | 'done' | 'error';
  taskId: string | null;
  resultImages: string[];                      // base64 结果图
  errorMessage: string;
}
```

---

## 6. 后端设计

### 6.1 目录结构

```
server/
├── index.js              # 入口，启动 Express 服务
├── routes/
│   └── api.js            # API 路由定义
├── services/
│   ├── prompt-builder.js # 根据配置构建 AI 提示词
│   ├── image-processor.js# 图片压缩/格式转换
│   └── ai-client.js      # 封装对 AI API 的 HTTP 调用
├── middleware/
│   └── error-handler.js  # 全局错误处理中间件
└── utils/
    └── validator.js      # 请求参数校验
```

### 6.2 文件职责

| 文件 | 职责 | 对外暴露 |
|------|------|----------|
| `index.js` | Express 启动、中间件注册、端口监听 | — |
| `routes/api.js` | 路由定义，请求→服务层分派 | Router |
| `services/prompt-builder.js` | 将配置对象转为自然语言提示词 | `buildPrompt(config)` |
| `services/image-processor.js` | 图片 Base64 解码、缩放、格式归一化 | `normalize(imageData)` |
| `services/ai-client.js` | 调用用户提供的图片生成 API | `generate(prompt, refImages)` |
| `middleware/error-handler.js` | 捕获异常，统一错误响应格式 | Express middleware |
| `utils/validator.js` | 校验 mode、gender、background、pose 等枚举值 | `validateGenerate(body)` |

### 6.3 提示词构建规则

`prompt-builder.js` 根据配置拼接模板：

```
基础模板：
"professional fashion photography, e-commerce product photo,

{gender} model wearing the reference clothing,
{pose} pose, {background} background,
high quality, 4k, studio lighting, full body shot, front view"

填充：
  gender:  "male" → "male", "female" → "female", "neutral" → "androgynous"
  pose:    "standing" → "standing naturally, arms relaxed",
           "walking" → "walking on a runway, dynamic pose",
           "sitting" → "sitting elegantly on a stool"
  background: "white" → "pure white studio background",
              "gray" → "neutral gray backdrop",
              "natural" → "natural outdoor setting with soft bokeh"
```

---

## 7. AI API 集成

### 7.1 调用约定

用户提供的图片生成 API 满足：**参考图 + 提示词 → 生成图**。

`services/ai-client.js` 封装为独立模块，所有 AI 相关逻辑集中在此文件：

```javascript
// 伪代码结构
class AIClient {
  constructor(apiBaseUrl, apiKey) {
    // apiBaseUrl 和 apiKey 从环境变量读取
  }

  async generate({ prompt, referenceImages, mode }) {
    // mode='single': referenceImages 为单个标签组的图片
    // mode='outfit': referenceImages 为所有标签组的图片
    // 调用用户 API，传入 prompt + base64 编码的图片
    // 返回生成的结果图 (base64 或 URL)
  }
}
```

### 7.2 配置

通过 `.env` 文件配置 API 连接信息（不提交到 Git）：

```
AI_API_BASE_URL=https://your-api-endpoint.com/v1
AI_API_KEY=your-api-key
AI_API_TIMEOUT=120000
PORT=3001
```

### 7.3 可替换性

`ai-client.js` 是唯一与 AI API 交互的模块。如果后续 API 接口发生变化，只需修改此文件，不影响其他代码。

---

## 8. 数据流与状态

### 8.1 完整请求生命周期

```
[浏览器]                    [Node.js]                    [AI API]
   │                           │                           │
   │ POST /api/generate        │                           │
   │ {mode, groups, config}    │                           │
   │──────────────────────────>│                           │
   │                           │ 校验参数 (validator.js)    │
   │                           │ 图片规范化 (image-         │
   │                           │   processor.js)           │
   │                           │ 构建提示词 (prompt-        │
   │                           │   builder.js)             │
   │                           │                           │
   │                           │ 调用 AI API               │
   │                           │ (ai-client.js)            │
   │                           │──────────────────────────>│
   │                           │                           │ 推理生成
   │                           │<──────────────────────────│
   │                           │ 返回结果图                 │
   │                           │                           │
   │ {taskId, status:"done",   │                           │
   │  images: [...]}           │                           │
   │<──────────────────────────│                           │
   │                           │                           │
   │ 渲染结果图                 │                           │
```

### 8.2 错误状态流转

```
idle → generating → done → 展示结果
                  → error → 展示错误信息 + 重试按钮
```

---

## 9. 接口规范

### POST /api/generate

**请求：**

```json
{
  "mode": "outfit",
  "groups": [
    {
      "tag": "上衣A",
      "images": [
        { "name": "正面.jpg", "data": "data:image/jpeg;base64,..." },
        { "name": "背面.jpg", "data": "data:image/jpeg;base64,..." }
      ]
    },
    {
      "tag": "裤子A",
      "images": [
        { "name": "侧面.jpg", "data": "data:image/jpeg;base64,..." }
      ]
    }
  ],
  "config": {
    "gender": "female",
    "background": "white",
    "pose": "standing"
  }
}
```

**成功响应：**

```json
{
  "success": true,
  "taskId": "abc-123",
  "images": ["data:image/png;base64,..."]
}
```

**错误响应：**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "不支持的生成模式，请选择 single 或 outfit"
  }
}
```

### GET /api/health

健康检查端点，返回 `{ status: "ok", timestamp: ... }`。

---

## 附录 A：待定事项

以下内容依赖用户提供的 AI API 具体文档进行调整：

- `ai-client.js` 中实际的请求参数结构
- 生成结果返回格式（base64 / URL / multipart）
- API 是同步返回还是需要轮询
- 单次请求中参考图的数量上限

## 附录 B：不在范围内

- 用户注册/登录系统
- 历史记录持久化
- 移动端适配
- 支付/计费
- 后台管理
