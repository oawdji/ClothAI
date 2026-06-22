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

    const aiClient = getClient();

    // 3. 上传所有图片到 ToAPIs，获取 URL
    console.log(`[API] 开始上传图片，共 ${groups.length} 组...`);
    const groupsWithUrls = [];
    for (const group of groups) {
      const uploadedImages = await aiClient.uploadImages(group.images);
      groupsWithUrls.push({ tag: group.tag, images: uploadedImages });
    }
    console.log('[API] 图片上传全部完成');

    // 4. 调用 AI 生成
    const resultImages = await aiClient.generate({ mode, groups: groupsWithUrls, config: finalConfig });

    // 5. 返回结果
    res.json({
      success: true,
      images: resultImages,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
