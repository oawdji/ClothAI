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

    // 3. 处理图片：已有 URL 的直接使用，有 base64 data 的先上传
    console.log(`[API] 处理图片，共 ${groups.length} 组...`);
    const groupsWithUrls = [];
    for (const group of groups) {
      const hasUrl = group.images.every(img => img.url);
      if (!hasUrl) {
        const hasData = group.images.some(img => img.data || img.dataUrl);
        console.log(`[API] 标签"${group.tag}": ${group.images.length} 张图片，` +
          `有URL:${group.images.filter(i=>i.url).length} 有Data:${group.images.filter(i=>i.data||i.dataUrl).length}`);
        console.log(`[API] 标签"${group.tag}"的图片需要上传...`);
        try {
          const uploadedImages = await aiClient.uploadImages(group.images);
          console.log(`[API] 标签"${group.tag}"上传完成，共 ${uploadedImages.length} 个URL`);
          groupsWithUrls.push({ tag: group.tag, images: uploadedImages });
        } catch (uploadErr) {
          console.error(`[API] 标签"${group.tag}"上传失败:`, uploadErr.message);
          throw uploadErr;
        }
      } else {
        console.log(`[API] 标签"${group.tag}": ${group.images.length} 张图片，全部已有URL，跳过上传`);
        groupsWithUrls.push(group);
      }
    }

    console.log(`[API] 所有图片处理完毕，开始AI生成 (模式: ${mode})...`);

    // 4. 调用 AI 生成
    const resultImages = await aiClient.generate({ mode, groups: groupsWithUrls, config: finalConfig });
    console.log(`[API] AI生成完成，共 ${resultImages.length} 张结果图`);

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
