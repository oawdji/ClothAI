# 虚拟试衣生成器 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个上传衣服图片、通过 AI 大模型生成模特试穿效果图的 Web 应用

**架构：** React 单页面前端 + Node.js Express 后端，前端上传图片→标签归组→配置参数，后端构建提示词→调用用户 AI API→返回结果

**技术栈：** React 18 (Vite) + Node.js + Express

**规格文档：** `docs/superpowers/specs/20260622-virtual-tryon-spec.md`

---

## 模块与执行顺序

```
Phase 1  项目脚手架搭建
Phase 2  后端核心模块 (prompt-builder → image-processor → validator → ai-client → error-handler → routes → index)
Phase 3  前端核心模块 (App shell → state → api-service → StepUpload → StepTagging → StepConfig → StepResult)
Phase 4  端到端联调
```

---

## Phase 1：项目脚手架搭建

### 任务 1.1：初始化 React 前端项目 (Vite)

**文件：**
- 创建：`client/` (整个 Vite React 项目)

- [ ] **步骤 1：创建 Vite React 项目**

```bash
cd g:\ai\AICoding\Cloth
npm create vite@latest client -- --template react
```

- [ ] **步骤 2：进入目录安装依赖**

```bash
cd g:\ai\AICoding\Cloth\client
npm install
```

- [ ] **步骤 3：安装额外依赖**

```bash
npm install axios file-saver jszip
```

- [ ] **步骤 4：清理模板文件，保留最小结构**

删除 `client/src/App.css` 中的默认样式，修改 `client/src/App.jsx` 为：

```jsx
function App() {
  return (
    <div className="app">
      <h1>🧥 虚拟试衣生成器</h1>
    </div>
  )
}

export default App
```

- [ ] **步骤 5：验证项目能启动**

```bash
cd g:\ai\AICoding\Cloth\client
npm run dev
```

预期：浏览器打开 http://localhost:5173，显示"🧥 虚拟试衣生成器"

---

### 任务 1.2：初始化 Node.js 后端项目 (Express)

**文件：**
- 创建：`server/package.json`
- 创建：`server/index.js`
- 创建：`server/.env.example`

- [ ] **步骤 1：创建 server 目录并初始化**

```bash
mkdir g:\ai\AICoding\Cloth\server
cd g:\ai\AICoding\Cloth\server
npm init -y
```

- [ ] **步骤 2：安装依赖**

```bash
npm install express cors dotenv multer
npm install -D nodemon
```

- [ ] **步骤 3：创建 `server/.env.example`**

```env
AI_API_BASE_URL=https://your-api-endpoint.com/v1
AI_API_KEY=your-api-key
AI_API_TIMEOUT=120000
PORT=3001
```

- [ ] **步骤 4：创建 `server/.env`**

```env
AI_API_BASE_URL=https://your-api-endpoint.com/v1
AI_API_KEY=your-api-key
AI_API_TIMEOUT=120000
PORT=3001
```

- [ ] **步骤 5：创建最小入口 `server/index.js`**

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **步骤 6：修改 `server/package.json` 添加启动脚本**

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

- [ ] **步骤 7：验证后端启动**

```bash
cd g:\ai\AICoding\Cloth\server
npm run dev
```

预期：终端显示 "Server running on http://localhost:3001"
验证：`curl http://localhost:3001/api/health` 返回 `{"status":"ok",...}`

---

## Phase 2：后端核心模块

### 任务 2.1：提示词构建引擎 (prompt-builder.js)

**文件：**
- 创建：`server/services/prompt-builder.js`

- [ ] **步骤 1：创建 `server/services/prompt-builder.js`**

```javascript
// 根据用户配置构建 AI 生成提示词
const GENDER_MAP = {
  male: 'male',
  female: 'female',
  neutral: 'androgynous',
};

const POSE_MAP = {
  standing: 'standing naturally, arms relaxed, facing camera',
  walking: 'walking on a runway, dynamic and confident pose',
  sitting: 'sitting elegantly on a modern stool, relaxed posture',
};

const BACKGROUND_MAP = {
  white: 'pure white studio background, clean and minimal',
  gray: 'neutral gray backdrop, professional studio setting',
  natural: 'natural outdoor setting with soft bokeh, warm daylight',
};

/**
 * @param {{ gender: string, background: string, pose: string }} config
 * @returns {string} 拼接后的提示词
 */
function buildPrompt(config) {
  const { gender, background, pose } = config;

  const genderText = GENDER_MAP[gender] || GENDER_MAP.neutral;
  const poseText = POSE_MAP[pose] || POSE_MAP.standing;
  const bgText = BACKGROUND_MAP[background] || BACKGROUND_MAP.white;

  return [
    'professional fashion photography, e-commerce product photo,',
    `${genderText} model wearing the reference clothing,`,
    `${poseText},`,
    `${bgText},`,
    'high quality, 4k, studio lighting, full body shot, front view,',
    'fabric texture visible, natural folds, realistic draping',
  ].join(' ');
}

module.exports = { buildPrompt };
```

- [ ] **步骤 2：验证模块可加载**

```bash
cd g:\ai\AICoding\Cloth\server
node -e "const { buildPrompt } = require('./services/prompt-builder'); console.log(buildPrompt({gender:'female',background:'white',pose:'standing'}))"
```

预期：输出一段完整的英文提示词

---

### 任务 2.2：图片处理模块 (image-processor.js)

**文件：**
- 创建：`server/services/image-processor.js`

```javascript
/**
 * 图片处理工具
 * - 剥离 data URL 前缀，提取纯 base64
 * - 校验图片格式
 * - 限制尺寸（最大 2048px 宽高）
 */

const MAX_DIMENSION = 2048;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * @param {string} dataUrl - data:image/jpeg;base64,xxxx
 * @returns {{ mimeType: string, base64: string }}
 */
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('无效的图片数据格式，需要 data URL');
  }
  return { mimeType: match[1], base64: match[2] };
}

/**
 * @param {string} dataUrl
 * @returns {{ mimeType: string, base64: string }} 规范化后的图片数据
 */
function normalize(dataUrl) {
  const { mimeType, base64 } = parseDataUrl(dataUrl);

  if (!SUPPORTED_TYPES.includes(mimeType)) {
    throw new Error(`不支持的图片格式: ${mimeType}，仅支持 JPG/PNG/WebP`);
  }

  // 检查 base64 大小（粗略限制约 10MB 原始文件）
  const sizeInBytes = base64.length * 0.75;
  if (sizeInBytes > 10 * 1024 * 1024) {
    throw new Error('单张图片大小不能超过 10MB');
  }

  return { mimeType, base64 };
}

module.exports = { parseDataUrl, normalize, SUPPORTED_TYPES, MAX_DIMENSION };
```

---

### 任务 2.3：请求参数校验 (validator.js)

**文件：**
- 创建：`server/utils/validator.js`

```javascript
const ALLOWED_MODES = ['single', 'outfit'];
const ALLOWED_GENDERS = ['male', 'female', 'neutral'];
const ALLOWED_BACKGROUNDS = ['white', 'gray', 'natural'];
const ALLOWED_POSES = ['standing', 'walking', 'sitting'];

/**
 * @param {object} body - POST /api/generate 的请求体
 * @returns {{ valid: boolean, error?: string }} 校验结果
 */
function validateGenerate(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体不能为空' };
  }

  if (!ALLOWED_MODES.includes(body.mode)) {
    return { valid: false, error: `不支持的生成模式: ${body.mode}，可选值: ${ALLOWED_MODES.join(', ')}` };
  }

  if (!Array.isArray(body.groups) || body.groups.length === 0) {
    return { valid: false, error: '至少需要一组衣服图片' };
  }

  for (let i = 0; i < body.groups.length; i++) {
    const g = body.groups[i];
    if (!g.tag || typeof g.tag !== 'string') {
      return { valid: false, error: `第 ${i + 1} 组缺少标签名称` };
    }
    if (!Array.isArray(g.images) || g.images.length === 0) {
      return { valid: false, error: `标签"${g.tag}"下至少需要一张图片` };
    }
    for (let j = 0; j < g.images.length; j++) {
      if (!g.images[j].data || typeof g.images[j].data !== 'string') {
        return { valid: false, error: `标签"${g.tag}"的第 ${j + 1} 张图片数据无效` };
      }
    }
  }

  if (body.mode === 'outfit' && body.groups.length < 2) {
    return { valid: false, error: '组合穿搭模式至少需要两组衣服' };
  }

  const config = body.config || {};
  if (config.gender && !ALLOWED_GENDERS.includes(config.gender)) {
    return { valid: false, error: `不支持的性别选项: ${config.gender}` };
  }
  if (config.background && !ALLOWED_BACKGROUNDS.includes(config.background)) {
    return { valid: false, error: `不支持的背景选项: ${config.background}` };
  }
  if (config.pose && !ALLOWED_POSES.includes(config.pose)) {
    return { valid: false, error: `不支持的姿态选项: ${config.pose}` };
  }

  return { valid: true };
}

module.exports = { validateGenerate, ALLOWED_MODES, ALLOWED_GENDERS, ALLOWED_BACKGROUNDS, ALLOWED_POSES };
```

---

### 任务 2.4：AI API 客户端 (ai-client.js)

**文件：**
- 创建：`server/services/ai-client.js`

```javascript
const { buildPrompt } = require('./prompt-builder');
const { normalize } = require('./image-processor');

class AIClient {
  constructor(baseUrl, apiKey, timeout = 120000) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  /**
   * 调用 AI 图片生成 API
   * @param {object} params
   * @param {string} params.mode - 'single' | 'outfit'
   * @param {Array<{ tag: string, images: Array<{ name: string, data: string }> }>} params.groups
   * @param {{ gender: string, background: string, pose: string }} params.config
   * @returns {Promise<string[]>} 生成的结果图 (base64 数组)
   */
  async generate({ mode, groups, config }) {
    const prompt = buildPrompt(config);

    if (mode === 'single') {
      // 一对一模式：每组独立调用，并行发出
      const results = await Promise.all(
        groups.map(group => this._callAPI(prompt, group.images))
      );
      return results.flat();
    } else {
      // 组合穿搭模式：所有图片合并一次调用
      const allImages = groups.flatMap(g => g.images);
      const result = await this._callAPI(prompt, allImages);
      return result;
    }
  }

  /**
   * 底层 API 调用
   * @param {string} prompt
   * @param {Array<{ name: string, data: string }>} images
   * @returns {Promise<string[]>}
   */
  async _callAPI(prompt, images) {
    // 规范化所有图片
    const normalized = images.map(img => normalize(img.data));

    // 构建请求体 — 此处为通用结构，根据实际 API 调整
    const body = {
      prompt,
      reference_images: normalized.map(n => n.base64),
      negative_prompt: 'blurry, low quality, distorted body, bad anatomy, watermark, logo',
      num_images: 1,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API 返回错误 (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      // 假设返回格式为 { images: ["base64..."] }
      return result.images || [];
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * 从环境变量创建默认 AI 客户端实例
 */
function createDefaultClient() {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const timeout = parseInt(process.env.AI_API_TIMEOUT || '120000', 10);

  if (!baseUrl || !apiKey) {
    console.warn('[AIClient] AI_API_BASE_URL 或 AI_API_KEY 未配置，API 调用将失败');
  }

  return new AIClient(baseUrl || '', apiKey || '', timeout);
}

// 单例
let instance = null;
function getClient() {
  if (!instance) {
    instance = createDefaultClient();
  }
  return instance;
}

module.exports = { AIClient, getClient };
```

---

### 任务 2.5：全局错误处理中间件 (error-handler.js)

**文件：**
- 创建：`server/middleware/error-handler.js`

```javascript
/**
 * Express 全局错误处理中间件
 * 必须放在所有路由之后注册
 */
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${err.message}`);
  if (err.stack) {
    console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  }

  // 已知的业务错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code || 'ERROR', message: err.message },
    });
  }

  // AI API 超时
  if (err.name === 'AbortError') {
    return res.status(504).json({
      success: false,
      error: { code: 'TIMEOUT', message: 'AI 生成超时，请重试' },
    });
  }

  // 通用 500
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误，请稍后重试' },
  });
}

module.exports = errorHandler;
```

---

### 任务 2.6：API 路由 (routes/api.js)

**文件：**
- 创建：`server/routes/api.js`

```javascript
const express = require('express');
const router = express.Router();
const { validateGenerate } = require('../utils/validator');
const { getClient } = require('../services/ai-client');

// POST /api/generate
router.post('/generate', async (req, res, next) => {
  try {
    // 1. 校验参数
    const validation = validateGenerate(req.body);
    if (!validation.valid) {
      const err = new Error(validation.error);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const { mode, groups, config = {} } = req.body;

    // 2. 应用默认配置
    const finalConfig = {
      gender: config.gender || 'female',
      background: config.background || 'white',
      pose: config.pose || 'standing',
    };

    // 3. 调用 AI 生成
    const aiClient = getClient();
    const images = await aiClient.generate({ mode, groups, config: finalConfig });

    // 4. 返回结果
    res.json({
      success: true,
      images: images.map(img => `data:image/png;base64,${img}`),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

---

### 任务 2.7：组装后端入口 (index.js)

**文件：**
- 修改：`server/index.js`

将之前创建的最小入口替换为完整版本：

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRouter = require('./routes/api');
const errorHandler = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api', apiRouter);

// 全局错误处理（必须在路由之后）
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**验证：** 重启 `npm run dev`，确认无报错。`/api/health` 依然正常返回。

---

## Phase 3：前端核心模块

### 任务 3.1：App 框架与 Header

**文件：**
- 修改：`client/src/App.jsx`
- 创建：`client/src/App.css`

- [ ] **步骤 1：编写 `client/src/App.css`（全局样式）**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.app-header {
  text-align: center;
  padding: 32px 0 24px;
}

.app-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.app-header p {
  color: #888;
  font-size: 14px;
}

/* 步骤卡片 */
.step-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.step-card h2 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #222;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
}

.btn-primary:hover {
  background: #4338ca;
}

.btn-primary:disabled {
  background: #c7d2fe;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fef2f2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fee2e2;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

/* 通用 */
.error-msg {
  color: #dc2626;
  font-size: 13px;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 6px;
  margin-top: 8px;
}
```

- [ ] **步骤 2：编写 `client/src/App.jsx`**

```jsx
import { AppProvider } from './state/context'
import Header from './components/Header'
import StepUpload from './components/StepUpload'
import StepTagging from './components/StepTagging'
import StepConfig from './components/StepConfig'
import StepResult from './components/StepResult'
import './App.css'

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Header />
        <StepUpload />
        <StepTagging />
        <StepConfig />
        <StepResult />
      </div>
    </AppProvider>
  )
}

export default App
```

- [ ] **步骤 3：创建 `client/src/components/Header.jsx`**

```jsx
function Header() {
  return (
    <header className="app-header">
      <h1>🧥 虚拟试衣生成器</h1>
      <p>上传衣服图片，AI 生成模特试穿效果图</p>
    </header>
  )
}

export default Header
```

此时由于其他组件还未创建，App 会报错，这是预期的。接下来逐一创建。

---

### 任务 3.2：全局状态管理 (state/context.js)

**文件：**
- 创建：`client/src/state/context.js`

```jsx
import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)

const initialState = {
  // 步骤1
  uploadedImages: [],
  // 步骤2
  tags: [],
  imageTags: {},        // { imageId: tagName }
  // 步骤3
  mode: 'outfit',
  config: {
    gender: 'female',
    background: 'white',
    pose: 'standing',
  },
  // 步骤4
  generating: false,
  resultImages: [],
  error: '',
}

function reducer(state, action) {
  switch (action.type) {

    // 上传图片
    case 'SET_IMAGES':
      return {
        ...state,
        uploadedImages: action.payload,
        // 重置后续步骤数据
        imageTags: {},
        tags: [],
        resultImages: [],
        error: '',
      }

    case 'REMOVE_IMAGE':
      const filtered = state.uploadedImages.filter(img => img.id !== action.payload)
      const newTags1 = { ...state.imageTags }
      delete newTags1[action.payload]
      return {
        ...state,
        uploadedImages: filtered,
        imageTags: newTags1,
        tags: rebuildTags(newTags1),
      }

    // 标签
    case 'SET_IMAGE_TAG':
      const newTags2 = { ...state.imageTags, [action.payload.imageId]: action.payload.tag }
      return {
        ...state,
        imageTags: newTags2,
        tags: rebuildTags(newTags2),
      }

    case 'ADD_TAG':
      if (!action.payload || state.tags.includes(action.payload)) return state
      return { ...state, tags: [...state.tags, action.payload] }

    // 配置
    case 'SET_MODE':
      return { ...state, mode: action.payload }
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } }

    // 生成
    case 'GENERATE_START':
      return { ...state, generating: true, error: '', resultImages: [] }
    case 'GENERATE_SUCCESS':
      return { ...state, generating: false, resultImages: action.payload }
    case 'GENERATE_ERROR':
      return { ...state, generating: false, error: action.payload }

    default:
      return state
  }
}

function rebuildTags(imageTags) {
  return [...new Set(Object.values(imageTags).filter(Boolean))]
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
```

---

### 任务 3.3：前端 API 调用层 (services/api.js)

**文件：**
- 创建：`client/src/services/api.js`

```javascript
import axios from 'axios'

const API_BASE = 'http://localhost:3001/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 130000, // 比后端多 10 秒
})

/**
 * 提交 AI 生成请求
 * @param {object} params
 * @param {string} params.mode
 * @param {Array} params.groups
 * @param {object} params.config
 * @returns {Promise<{ images: string[] }>}
 */
export async function generateImage({ mode, groups, config }) {
  const { data } = await client.post('/generate', { mode, groups, config })
  return data
}

/**
 * 健康检查
 */
export async function healthCheck() {
  const { data } = await client.get('/health')
  return data
}
```

---

### 任务 3.4：上传组件 (StepUpload)

**文件：**
- 创建：`client/src/components/StepUpload.jsx`
- 创建：`client/src/components/StepUpload.css`

- [ ] **步骤 1：创建 `client/src/components/StepUpload.css`**

```css
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.drop-zone:hover, .drop-zone.active {
  border-color: #4f46e5;
  background: #eef2ff;
}

.drop-zone p {
  color: #6b7280;
  margin: 8px 0;
}

.drop-zone .hint {
  font-size: 12px;
  color: #9ca3af;
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.thumbnail-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-item .remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **步骤 2：创建 `client/src/components/StepUpload.jsx`**

```jsx
import { useRef, useState, useCallback } from 'react'
import { useAppState } from '../state/context'
import './StepUpload.css'

let idCounter = 0
function genId() {
  return `img_${Date.now()}_${++idCounter}`
}

function StepUpload() {
  const { state, dispatch } = useAppState()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const processFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('请选择图片文件')
      return
    }

    const readers = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve({
          id: genId(),
          name: file.name,
          dataUrl: reader.result,
        })
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then(newImages => {
      dispatch({ type: 'SET_IMAGES', payload: [...state.uploadedImages, ...newImages] })
    })
  }, [state.uploadedImages, dispatch])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e) => {
    processFiles(e.target.files)
    e.target.value = ''
  }

  const removeImage = (id) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id })
  }

  return (
    <section className="step-card">
      <h2>📤 步骤1：上传衣服图片</h2>

      <div
        className={`drop-zone ${dragOver ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>📁 拖拽图片到此处，或点击选择文件</p>
        <p className="hint">支持 JPG、PNG、WebP，单张不超过 10MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {state.uploadedImages.length > 0 && (
        <div className="thumbnail-grid">
          {state.uploadedImages.map(img => (
            <div key={img.id} className="thumbnail-item">
              <img src={img.dataUrl} alt={img.name} />
              <button className="remove-btn" onClick={() => removeImage(img.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {state.uploadedImages.length === 0 && (
        <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
          暂未上传图片
        </p>
      )}
    </section>
  )
}

export default StepUpload
```

---

### 任务 3.5：标签归组组件 (StepTagging)

**文件：**
- 创建：`client/src/components/StepTagging.jsx`
- 创建：`client/src/components/StepTagging.css`

- [ ] **步骤 1：创建 `client/src/components/StepTagging.css`**

```css
.tag-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.tag-row .thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.tag-row .name {
  flex: 1;
  font-size: 13px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row select, .tag-row input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  min-width: 120px;
}

.tag-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.tag-bar input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.tag-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 20px;
  font-size: 12px;
}
```

- [ ] **步骤 2：创建 `client/src/components/StepTagging.jsx`**

```jsx
import { useState } from 'react'
import { useAppState } from '../state/context'
import './StepTagging.css'

function StepTagging() {
  const { state, dispatch } = useAppState()
  const [newTag, setNewTag] = useState('')

  const { uploadedImages, imageTags, tags } = state

  if (uploadedImages.length === 0) return null

  const addTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      dispatch({ type: 'ADD_TAG', payload: trimmed })
      setNewTag('')
    }
  }

  const handleTagChange = (imageId, tag) => {
    dispatch({ type: 'SET_IMAGE_TAG', payload: { imageId, tag } })
  }

  return (
    <section className="step-card">
      <h2>🏷️ 步骤2：标签归组</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        为每张图片分配标签，相同标签 = 同一件衣服的不同角度照片
      </p>

      {/* 已有标签 */}
      {tags.length > 0 && (
        <div className="tag-chips">
          {tags.map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      )}

      {/* 新建标签 */}
      <div className="tag-bar">
        <input
          placeholder="输入新标签名（如"上衣A"）"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
        />
        <button className="btn btn-secondary btn-sm" onClick={addTag}>+ 新建</button>
      </div>

      {/* 图片标签行 */}
      {uploadedImages.map(img => (
        <div key={img.id} className="tag-row">
          <img className="thumb" src={img.dataUrl} alt={img.name} />
          <span className="name">{img.name}</span>
          <select
            value={imageTags[img.id] || ''}
            onChange={e => handleTagChange(img.id, e.target.value)}
          >
            <option value="">未分类</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      ))}
    </section>
  )
}

export default StepTagging
```

---

### 任务 3.6：生成配置组件 (StepConfig)

**文件：**
- 创建：`client/src/components/StepConfig.jsx`

```jsx
import { useAppState } from '../state/context'

const GENDERS = [
  { value: 'female', label: '👩 女性' },
  { value: 'male', label: '👨 男性' },
  { value: 'neutral', label: '🧑 中性' },
]

const BACKGROUNDS = [
  { value: 'white', label: '⬜ 纯白背景' },
  { value: 'gray', label: '🩶 灰色背景' },
  { value: 'natural', label: '🌿 自然场景' },
]

const POSES = [
  { value: 'standing', label: '🧍 自然站姿' },
  { value: 'walking', label: '🚶 行走姿态' },
  { value: 'sitting', label: '🪑 优雅坐姿' },
]

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <label
            key={opt.value}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: value === opt.value ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: value === opt.value ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            <input
              type="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ display: 'none' }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function StepConfig() {
  const { state, dispatch } = useAppState()

  const canGenerate =
    !state.generating &&
    state.uploadedImages.length > 0 &&
    state.tags.length > 0 &&
    Object.values(state.imageTags).filter(Boolean).length > 0

  const handleGenerate = () => {
    dispatch({ type: 'GENERATE_START' })
  }

  return (
    <section className="step-card">
      <h2>⚙️ 步骤3：生成配置</h2>

      {/* 模式选择 */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>生成模式</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <label
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: state.mode === 'outfit' ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: state.mode === 'outfit' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input
              type="radio" value="outfit" checked={state.mode === 'outfit'}
              onChange={() => dispatch({ type: 'SET_MODE', payload: 'outfit' })}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>👗 组合穿搭</div>
            <div style={{ fontSize: 12, color: '#888' }}>多件衣服合成一张图</div>
          </label>
          <label
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: state.mode === 'single' ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: state.mode === 'single' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input
              type="radio" value="single" checked={state.mode === 'single'}
              onChange={() => dispatch({ type: 'SET_MODE', payload: 'single' })}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📷 一对一</div>
            <div style={{ fontSize: 12, color: '#888' }}>每件衣服独立生成</div>
          </label>
        </div>
      </div>

      <RadioGroup
        label="模特性别"
        options={GENDERS}
        value={state.config.gender}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { gender: v } })}
      />
      <RadioGroup
        label="背景风格"
        options={BACKGROUNDS}
        value={state.config.background}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { background: v } })}
      />
      <RadioGroup
        label="模特姿态"
        options={POSES}
        value={state.config.pose}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { pose: v } })}
      />

      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={!canGenerate}
        style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 8 }}
      >
        {state.generating ? '⏳ 生成中...' : '🚀 开始生成'}
      </button>

      {!canGenerate && state.uploadedImages.length > 0 && (
        <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          请先上传图片并为图片分配标签
        </p>
      )}
    </section>
  )
}

export default StepConfig
```

---

### 任务 3.7：结果展示组件 (StepResult)

**文件：**
- 创建：`client/src/components/StepResult.jsx`
- 创建：`client/src/components/StepResult.css`

- [ ] **步骤 1：创建 `client/src/components/StepResult.css`**

```css
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.result-card {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.result-card img {
  width: 100%;
  display: block;
}

.result-card .actions {
  padding: 10px;
  display: flex;
  gap: 8px;
}

.loading-box {
  text-align: center;
  padding: 48px 24px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.download-all {
  text-align: center;
  margin-top: 20px;
}
```

- [ ] **步骤 2：创建 `client/src/components/StepResult.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useAppState } from '../state/context'
import { generateImage } from '../services/api'
import './StepResult.css'

function StepResult() {
  const { state, dispatch } = useAppState()
  const hasTriggered = useRef(false)

  // 触发生成
  useEffect(() => {
    if (!state.generating || hasTriggered.current) return
    hasTriggered.current = true

    // 构建 groups
    const tagGroups = {}
    state.uploadedImages.forEach(img => {
      const tag = state.imageTags[img.id]
      if (!tag) return
      if (!tagGroups[tag]) tagGroups[tag] = []
      tagGroups[tag].push({ name: img.name, data: img.dataUrl })
    })

    const groups = Object.entries(tagGroups).map(([tag, images]) => ({ tag, images }))

    generateImage({ mode: state.mode, groups, config: state.config })
      .then(result => {
        dispatch({ type: 'GENERATE_SUCCESS', payload: result.images })
        hasTriggered.current = false
      })
      .catch(err => {
        const msg = err.response?.data?.error?.message || err.message || '生成失败，请重试'
        dispatch({ type: 'GENERATE_ERROR', payload: msg })
        hasTriggered.current = false
      })
  }, [state.generating])

  // 单张下载
  const downloadSingle = (base64, index) => {
    const byteString = atob(base64.split(',')[1] || base64)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: 'image/png' })
    saveAs(blob, `model-${index + 1}.png`)
  }

  // 打包下载
  const downloadAll = async () => {
    const zip = new JSZip()
    state.resultImages.forEach((img, i) => {
      const base64 = img.includes('base64,') ? img.split('base64,')[1] : img
      zip.file(`model-${i + 1}.png`, base64, { base64: true })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, '生成的模特图.zip')
  }

  if (state.generating) {
    return (
      <section className="step-card">
        <h2>🖼️ 步骤4：生成结果</h2>
        <div className="loading-box">
          <div className="spinner" />
          <p style={{ color: '#888' }}>AI 正在生成模特试穿图...</p>
          <p style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>可能需要 10-60 秒，请耐心等待</p>
        </div>
      </section>
    )
  }

  if (state.error) {
    return (
      <section className="step-card">
        <h2>🖼️ 步骤4：生成结果</h2>
        <div className="error-msg">{state.error}</div>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => { hasTriggered.current = false; dispatch({ type: 'GENERATE_START' }) }}
        >
          🔄 重试
        </button>
      </section>
    )
  }

  if (state.resultImages.length === 0) return null

  return (
    <section className="step-card">
      <h2>🖼️ 步骤4：生成结果</h2>
      <div className="result-grid">
        {state.resultImages.map((img, i) => (
          <div key={i} className="result-card">
            <img src={img} alt={`生成结果 ${i + 1}`} />
            <div className="actions">
              <button className="btn btn-primary btn-sm" onClick={() => downloadSingle(img, i)}>
                ⬇ 下载
              </button>
            </div>
          </div>
        ))}
      </div>
      {state.resultImages.length > 1 && (
        <div className="download-all">
          <button className="btn btn-secondary" onClick={downloadAll}>
            📦 全部打包下载 (ZIP)
          </button>
        </div>
      )}
    </section>
  )
}

export default StepResult
```

---

## Phase 4：端到端联调

### 任务 4.1：前后端联通测试

- [ ] **步骤 1：启动后端**

```bash
cd g:\ai\AICoding\Cloth\server
npm run dev
```

预期：`Server running on http://localhost:3001`

- [ ] **步骤 2：启动前端**

```bash
cd g:\ai\AICoding\Cloth\client
npm run dev
```

预期：Vite 启动在 http://localhost:5173

- [ ] **步骤 3：验证健康检查**

浏览器打开 http://localhost:5173，打开 DevTools Console，运行：

```javascript
fetch('http://localhost:3001/api/health').then(r => r.json()).then(console.log)
```

预期：打印 `{ status: "ok", timestamp: "..." }`

- [ ] **步骤 4：完整流程手动测试**

1. 上传 `photo/` 目录下的测试图片
2. 创建标签（如"上衣"）并分配给图片
3. 选择生成模式、模特参数
4. 点击生成 → 观察请求发出
5. 检查后端日志和网络请求

---

### 任务 4.2：错误场景覆盖

手动验证以下错误场景：

| 场景 | 操作 | 预期结果 |
|------|------|----------|
| 空提交 | 不上传图片直接点生成 | 按钮禁用 |
| 未分配标签 | 上传图片后不分配标签 | 按钮禁用，提示文字 |
| 单个标签+组合模式 | 标签<2时选组合穿搭 | 后端返回校验错误提示 |
| 后端未启动 | 关闭后端服务后点生成 | 前端显示网络错误提示 |
| 非图片上传 | 拖入非图片文件 | 自动过滤，仅添加图片 |

---

### 任务 4.3：整体验收

对照规格文档逐项检查：

- [ ] FR-1：图片上传（拖拽 + 选择文件），缩略图预览，删除功能
- [ ] FR-2：标签创建、图片标签分配、修改
- [ ] FR-3：两种生成模式切换
- [ ] FR-4：模特性别、背景、姿态选择
- [ ] FR-5：生成加载状态展示
- [ ] FR-6：结果展示、单张下载、打包下载
- [ ] FR-7：各错误场景提示正确

---

## 附录：启动命令速查

```bash
# 后端
cd server && npm run dev

# 前端
cd client && npm run dev

# 访问
# 前端: http://localhost:5173
# 后端: http://localhost:3001
# 健康检查: http://localhost:3001/api/health
```
