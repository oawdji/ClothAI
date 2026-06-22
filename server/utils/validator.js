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
      const img = g.images[j];
      if (!(img.url || img.data) || (img.url && typeof img.url !== 'string') || (img.data && typeof img.data !== 'string')) {
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
