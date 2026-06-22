/**
 * 图片处理工具
 * - 剥离 data URL 前缀，提取纯 base64
 * - 校验图片格式
 * - 限制尺寸
 */

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

module.exports = { parseDataUrl, normalize, SUPPORTED_TYPES };
