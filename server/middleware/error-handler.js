/**
 * Express 全局错误处理中间件
 * 必须放在所有路由之后注册
 */
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${err.message}`);
  if (err.stack) {
    console.error(err.stack.split('\n').slice(0, 6).join('\n'));
  }

  // 已知的业务错误（带状态码）
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
