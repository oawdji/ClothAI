const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getClient } = require('../services/ai-client');

// Multer 配置：内存存储，限制 20MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的图片格式: ${file.mimetype}，仅支持 JPG/PNG/WebP`));
    }
  },
});

// 调试路由
router.get('/ping', (req, res) => { res.json({ pong: true }); });

// POST /api/upload — 代理上传图片到 ToAPIs
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('未收到图片文件');
      err.statusCode = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    const aiClient = getClient();
    const url = await aiClient.uploadImage(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 批量上传（最多 10 张）
router.post('/upload/batch', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      const err = new Error('未收到图片文件');
      err.statusCode = 400;
      err.code = 'NO_FILE';
      throw err;
    }

    const aiClient = getClient();
    const results = [];
    for (const file of req.files) {
      const url = await aiClient.uploadImage(file.buffer, file.originalname);
      results.push({ url, filename: file.originalname, size: file.size });
    }

    res.json({
      success: true,
      data: { files: results },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
