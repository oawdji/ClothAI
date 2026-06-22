const { buildPrompt } = require('./prompt-builder');

class AIClient {
  constructor(baseUrl, apiKey, timeout = 120000) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  /**
   * 上传图片到 ToAPIs，获取可用的图片 URL
   * @param {Buffer} fileBuffer - 图片文件 Buffer
   * @param {string} filename - 原始文件名
   * @returns {Promise<string>} 图片 URL
   */
  async uploadImage(fileBuffer, filename) {
    console.log(`[AIClient] 上传图片: ${filename} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

    // Node.js 原生 FormData + Blob 上传
    // 注：Node 21+ FormData 是全局可用，但 append 值必须为 Blob 实例
    const formData = new FormData();
    const mimeType = this._getMimeType(filename);
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);

    const response = await this._fetch('/uploads/images', {
      method: 'POST',
      body: formData,
    }, false); // 不设 Content-Type，让 Node.js 自动设置 multipart boundary

    const result = await response.json();
    console.log('[AIClient] 上传响应:', JSON.stringify(result).slice(0, 400));

    // 兼容多种 ToAPIs 返回格式
    const imageUrl = result.data?.url
      || result.data?.image_url
      || result.url
      || result.image_url;

    if (!imageUrl) {
      console.error('[AIClient] 未能从上传响应中提取图片 URL');
      throw new Error('上传图片失败：API 未返回图片 URL');
    }

    console.log(`[AIClient] 上传成功 → ${imageUrl}`);
    return imageUrl;
  }

  /**
   * 批量上传图片，返回 URL 列表
   * @param {Array<{ name: string, dataUrl: string }>} images
   * @returns {Promise<Array<{ name: string, url: string }>>}
   */
  async uploadImages(images) {
    const results = [];
    for (const img of images) {
      // 已有 URL 的图片直接透传，不重复上传
      if (img.url && typeof img.url === 'string' && img.url.startsWith('http')) {
        console.log(`[AIClient] 图片"${img.name}"已有URL，跳过上传`);
        results.push({ name: img.name, url: img.url });
        continue;
      }

      // 仅有 base64 data 的需要先上传
      const dataUrl = img.data || img.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error(`图片"${img.name}"缺少数据：请先通过上传接口获取 URL`);
      }
      const buffer = this._dataUrlToBuffer(dataUrl);
      const url = await this.uploadImage(buffer, img.name);
      results.push({ name: img.name, url });
    }
    return results;
  }

  /**
   * 调用 AI 图片生成 API
   * @param {object} params
   * @param {string} params.mode - 'single' | 'outfit'
   * @param {Array<{ tag: string, images: Array<{ name: string, url: string }> }>} params.groups
   * @param {{ gender: string, background: string, pose: string }} params.config
   * @returns {Promise<string[]>} 生成的结果图 (URL 数组)
   */
  async generate({ mode, groups, config }) {
    const prompt = buildPrompt(config);

    if (mode === 'single') {
      // 一对一模式：每组独立调用，并行发出
      const results = await Promise.all(
        groups.map(group => this._generateImage(prompt, group.images))
      );
      return results.flat();
    } else {
      // 组合穿搭模式：所有图片合并一次调用
      const allImages = groups.flatMap(g => g.images);
      const result = await this._generateImage(prompt, allImages);
      return result;
    }
  }

  /**
   * 调用 ToAPIs 图片生成接口
   * @param {string} prompt
   * @param {Array<{ name: string, url: string }>} images
   * @returns {Promise<string[]>} 生成的结果图 URL 数组
   */
  async _generateImage(prompt, images) {
    // 提取并校验图片 URL：确保全部是 HTTPS URL，不含 base64
    const imageUrls = images.map(img => img.url);
    const base64Urls = imageUrls.filter(url => !url || (typeof url === 'string' && url.startsWith('data:')));
    if (base64Urls.length > 0) {
      throw new Error(
        `检测到 ${base64Urls.length} 张图片仍是 base64 格式。` +
        `API 不再支持在生成接口中直接传入 base64 图片数据，请先上传到 ${this.baseUrl}/uploads/images 获取 URL`
      );
    }
    if (!imageUrls.every(url => typeof url === 'string' && url.startsWith('http'))) {
      throw new Error('图片 URL 格式无效，需要以 https:// 开头的完整 URL');
    }

    const body = {
      model: 'gemini-3-pro-image-preview',
      prompt,
      size: '16:9',
      n: 1,
      metadata: { resolution: '2K' },
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
   * @returns {Promise<string[]>} 结果图片 URL 数组
   */
  async _pollTask(taskId) {
    const maxAttempts = 90;       // 最多轮询 90 次 (3 分钟)
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
      console.log(`[AIClient] 轮询 ${i + 1}/${maxAttempts}: 状态=${task.status}, 进度=${task.progress || '?'}%`);

      if (task.status === 'completed' || task.status === 'succeeded') {
        // 兼容多种 ToAPIs 返回格式
        // 格式1: { url: '...' } — 单张结果图 URL
        if (task.url) {
          return [task.url];
        }
        // 格式2: { images: [...] }
        if (task.images && Array.isArray(task.images) && task.images.length > 0) {
          return task.images;
        }
        // 格式3: { result: { images: [...] } }
        if (task.result?.images && Array.isArray(task.result.images)) {
          return task.result.images;
        }
        // 格式4: { result: { url: '...' } }
        if (task.result?.url) {
          return [task.result.url];
        }
        // 格式5: { result: { data: [{ url: '...' }] } }
        if (task.result?.data && Array.isArray(task.result.data)) {
          return task.result.data.map(item => item.url || item);
        }
        // 格式6: { output: [...] }
        if (task.output && Array.isArray(task.output)) {
          return task.output;
        }
        console.warn('[AIClient] 任务完成但未找到结果图片，完整响应:', JSON.stringify(task).slice(0, 500));
        return [];
      }

      if (task.status === 'failed' || task.status === 'error' || task.status === 'canceled') {
        const reason = task.error || task.message || task.status;
        throw new Error(`AI 生成失败: ${reason}`);
      }

      // 异常状态（API 未知返回）
      if (!['pending', 'processing', 'in_progress', 'running'].includes(task.status)) {
        console.warn(`[AIClient] 未知任务状态: ${task.status}`, JSON.stringify(task).slice(0, 300));
      }
    }

    throw new Error('AI 生成超时（超过最大轮询次数），请重试');
  }

  /**
   * 封装 fetch，自动添加认证头
   */
  async _fetch(path, options = {}, setContentType = true) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
    };
    // 仅 JSON 请求设 Content-Type；FormData 由 http 库自动设
    if (setContentType) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AIClient] API错误 ${response.status}: ${errorText.slice(0, 300)}`);
        throw new Error(
          `AI API 返回错误 (${response.status}): ${errorText.slice(0, 200)}`
        );
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 从 data URL 提取 Buffer
   */
  _dataUrlToBuffer(dataUrl) {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的 data URL 格式');
    }
    return Buffer.from(matches[2], 'base64');
  }

  /**
   * 根据扩展名返回 MIME 类型
   */
  _getMimeType(filename) {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    return map[ext] || 'image/jpeg';
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
