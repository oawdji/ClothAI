import axios from 'axios'

const API_BASE = '/api'  // Vite proxy → localhost:3001

const client = axios.create({
  baseURL: API_BASE,
  timeout: 130000, // 比后端多 10 秒
})

/**
 * 提交 AI 生成请求
 * @param {object} params
 * @param {string} params.mode
 * @param {Array} params.groups
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
