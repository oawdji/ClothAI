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
   * 底层 API 调用 — 适配 ToAPIs 格式
   * @param {string} prompt
   * @param {Array<{ name: string, data: string }>} images
   * @returns {Promise<string[]>}
   */
  async _callAPI(prompt, images) {
    // 规范化所有图片，构建 data URL 列表
    const imageUrls = images.map(img => {
      normalize(img.data); // 校验格式和大小
      return img.data;     // 直接使用 data URL（支持 base64 内嵌）
    });

    const body = {
      model: 'gemini-3-pro-image-preview',
      prompt,
      size: '16:9',
      n: 1,
      metadata: {
        resolution: '2K',
      },
      image_urls: imageUrls,
    };

    console.log(`[AIClient] 提交生成任务，参考图数量: ${imageUrls.length}`);

    // 1. 提交生成任务
    const taskResponse = await this._fetch('/images/generations', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const task = await taskResponse.json();
    console.log(`[AIClient] 任务已创建: ${task.id}, 状态: ${task.status}`);

    if (!task.id) {
      throw new Error('AI API 未返回任务 ID');
    }

    // 2. 轮询等待结果
    const result = await this._pollTask(task.id);
    return result;
  }

  /**
   * 轮询任务状态直到完成
   * @param {string} taskId
   * @returns {Promise<string[]>} base64 图片数组
   */
  async _pollTask(taskId) {
    const maxAttempts = 60;       // 最多轮询 60 次
    const pollInterval = 2000;    // 每 2 秒一次
    const maxWait = this.timeout; // 超时上限

    const startTime = Date.now();

    for (let i = 0; i < maxAttempts; i++) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('AI 生成超时，请重试');
      }

      await this._sleep(pollInterval);

      const response = await this._fetch(`/images/generations/${taskId}`, {
        method: 'GET',
      });

      const task = await response.json();
      console.log(`[AIClient] 轮询 ${i + 1}/${maxAttempts}: 状态=${task.status}`);

      if (task.status === 'completed' || task.status === 'succeeded') {
        // 提取结果图片（兼容多种返回格式）
        if (task.images && Array.isArray(task.images)) {
          return task.images;
        }
        if (task.result && task.result.images) {
          return task.result.images;
        }
        if (task.output && Array.isArray(task.output)) {
          return task.output;
        }
        console.warn('[AIClient] 任务完成但未找到结果图片，完整响应:', JSON.stringify(task).slice(0, 500));
        return [];
      }

      if (task.status === 'failed' || task.status === 'error') {
        throw new Error(`AI 生成失败: ${task.error || task.message || '未知错误'}`);
      }

      // 其他状态 (processing, queued, pending 等) 继续轮询
    }

    throw new Error('AI 生成超时（超过最大轮询次数），请重试');
  }

  /**
   * 封装 fetch，自动添加认证头
   */
  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API 返回错误 (${response.status}): ${errorText}`);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
