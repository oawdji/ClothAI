import { useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useAppState } from '../state/context'
import { generateImage } from '../services/api'
import './StepResult.css'

function StepResult() {
  const { state, dispatch } = useAppState()
  const hasTriggered = useRef(false)

  // 触发生成
  useEffect(() => {
    if (!state.generating || hasTriggered.current) return
    hasTriggered.current = true

    // 构建 groups
    const tagGroups = {}
    state.uploadedImages.forEach(img => {
      const tag = state.imageTags[img.id]
      if (!tag) return
      if (!tagGroups[tag]) tagGroups[tag] = []
      tagGroups[tag].push({ name: img.name, data: img.dataUrl })
    })

    const groups = Object.entries(tagGroups).map(([tag, images]) => ({ tag, images }))

    generateImage({ mode: state.mode, groups, config: state.config })
      .then(result => {
        dispatch({ type: 'GENERATE_SUCCESS', payload: result.images })
        hasTriggered.current = false
      })
      .catch(err => {
        const msg = err.response?.data?.error?.message || err.message || '生成失败，请重试'
        dispatch({ type: 'GENERATE_ERROR', payload: msg })
        hasTriggered.current = false
      })
  }, [state.generating])

  // 单张下载
  const downloadSingle = (base64, index) => {
    try {
      const parts = base64.startsWith('data:') ? base64.split(',') : ['', base64]
      const byteString = atob(parts[1] || parts[0])
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([ab], { type: 'image/png' })
      saveAs(blob, `model-${index + 1}.png`)
    } catch (e) {
      // 兜底：如果 base64 解码失败，尝试直接下载
      saveAs(base64, `model-${index + 1}.png`)
    }
  }

  // 打包下载
  const downloadAll = async () => {
    const zip = new JSZip()
    state.resultImages.forEach((img, i) => {
      const base64 = img.includes('base64,') ? img.split('base64,')[1] : img
      zip.file(`model-${i + 1}.png`, base64, { base64: true })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, '生成的模特图.zip')
  }

  // 加载中
  if (state.generating) {
    return (
      <section className="step-card">
        <h2>🖼️ 步骤4：生成结果</h2>
        <div className="loading-box">
          <div className="spinner" />
          <p>AI 正在生成模特试穿图...</p>
          <p className="sub">可能需要 10-60 秒，请耐心等待</p>
        </div>
      </section>
    )
  }

  // 错误
  if (state.error) {
    return (
      <section className="step-card">
        <h2>🖼️ 步骤4：生成结果</h2>
        <div className="error-msg">{state.error}</div>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => { hasTriggered.current = false; dispatch({ type: 'GENERATE_START' }) }}
        >
          🔄 重试
        </button>
      </section>
    )
  }

  // 无结果
  if (state.resultImages.length === 0) return null

  // 展示结果
  return (
    <section className="step-card">
      <h2>🖼️ 步骤4：生成结果</h2>
      <div className="result-grid">
        {state.resultImages.map((img, i) => (
          <div key={i} className="result-card">
            <img src={img} alt={`生成结果 ${i + 1}`} />
            <div className="actions">
              <button className="btn btn-primary btn-sm" onClick={() => downloadSingle(img, i)}>
                ⬇ 下载
              </button>
            </div>
          </div>
        ))}
      </div>
      {state.resultImages.length > 1 && (
        <div className="download-all">
          <button className="btn btn-secondary" onClick={downloadAll}>
            📦 全部打包下载 (ZIP)
          </button>
        </div>
      )}
    </section>
  )
}

export default StepResult
