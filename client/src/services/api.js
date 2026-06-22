import axios from 'axios'

const API_BASE = '/api'  // Vite proxy → localhost:3001

const client = axios.create({
  baseURL: API_BASE,
  timeout: 130000, // 比后端多 10 秒
})

/**
 * 上传单张图片到后端（后端代理转发到 ToAPIs）
 * @param {File} file - 原始文件对象
 * @param {function} onProgress - 进度回调 (0-100)
 * @returns {Promise<{ url: string, filename: string }>}
 */
export async function uploadImage(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return data.data
}

/**
 * 提交 AI 生成请求
 * @param {object} params
 * @param {string} params.mode
 * @param {Array<{ tag: string, images: Array<{ name: string, url: string }> }>} params.groups
 * @param {object} params.config
 * @returns {Promise<{ images: string[] }>}
 */
export async function generateImage({ mode, groups, config }) {
  const { data } = await client.post('/generate', { mode, groups, config })
  return data
}

/**
 * 健康检查
 */
export async function healthCheck() {
  const { data } = await client.get('/health')
  return data
}
