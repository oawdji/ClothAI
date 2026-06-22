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
      images: images.map(img => {
        // 如果已经是 data URL 则直接返回，否则包装
        if (img.startsWith('data:')) return img;
        return `data:image/png;base64,${img}`;
      }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
