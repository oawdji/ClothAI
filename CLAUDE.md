# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

虚拟试衣网站 — 用户上传衣服图片，AI 生成模特+衣服的效果图。个人工具类 Demo，无用户系统。

## 技术栈

- **前端**: React
- **后端**: Node.js
- **AI**: 用户自有的图片生成大模型 API（参考图 + 提示词 → 生成图）

## 核心需求

1. 上传多张衣服图片，通过**标签**归组（相同标签 = 同一件衣服的不同角度/细节照片）
2. 两种生成模式：
   - **一对一模式**：每组衣服独立生成一张模特图
   - **组合穿搭模式**：多组衣服组合成一张完整穿搭模特图
3. 模特自定义选项：性别、背景风格、姿态
4. 无用户系统，无登录

## 项目结构

```
Cloth/
├── client/                  # React 前端 (Vite)
│   ├── vite.config.js       # Vite 配置（含 /api 代理到 :3001）
│   └── src/
│       ├── App.jsx          # 应用入口，组装四步骤
│       ├── App.css          # 全局样式
│       ├── state/
│       │   └── context.jsx  # useReducer + Context 全局状态
│       ├── services/
│       │   └── api.js       # 前端 API 调用层 (axios)
│       └── components/
│           ├── Header.jsx           # 页面标题
│           ├── StepUpload.jsx/css   # 步骤1：拖拽上传+缩略图
│           ├── StepTagging.jsx/css  # 步骤2：标签归组
│           ├── StepConfig.jsx       # 步骤3：模式+模特参数+生成按钮
│           └── StepResult.jsx/css   # 步骤4：加载/结果展示/下载
├── server/                  # Node.js 后端 (Express)
│   ├── index.js             # 入口，组装中间件+路由
│   ├── routes/
│   │   └── api.js           # POST /api/generate
│   ├── services/
│   │   ├── prompt-builder.js    # 配置→提示词
│   │   ├── image-processor.js   # base64 图片校验/解析
│   │   └── ai-client.js         # ToAPIs 客户端（提交+轮询）
│   ├── middleware/
│   │   └── error-handler.js     # 全局错误处理
│   └── utils/
│       └── validator.js     # 请求参数校验
├── photo/                   # 测试图片素材
└── docs/superpowers/        # 设计文档
    ├── specs/               # 需求+技术规格
    └── plans/               # 实现计划
```

## 启动方式

```bash
# 后端
cd server && npm run dev      # http://localhost:3001

# 前端
cd client && npm run dev      # http://localhost:5173

# 健康检查: http://localhost:3001/api/health
```

## 配置

修改 `server/.env` 填入实际 API 密钥：
```
AI_API_BASE_URL=https://toapis.com/v1
AI_API_KEY=<你的密钥>
```

## AI 图片生成 API

```javascript
// POST https://toapis.com/v1/images/generations
// Authorization: Bearer <API_KEY>
// Content-Type: application/json
const body = {
  model: 'gemini-3-pro-image-preview',
  prompt: '...',
  size: '16:9',
  n: 1,
  metadata: { resolution: '2K' },
  image_urls: ['https://example.com/image.jpg']  // 参考图 URL
};
// 返回: { id: "task-xxx", status: "processing" }
// 需轮询查状态，完成后获取结果图
```

## GitHub

- 仓库: https://github.com/oawdji/ClothAI.git
- 每个步骤完成后推送到 GitHub

## 工作习惯

- 永远使用中文回答
- 在编码前先完成需求设计文档（brainstorming → spec → plan → 实现）
- 每个实现步骤完成后 commit + push 到 GitHub
