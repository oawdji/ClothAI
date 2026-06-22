import { useRef, useState, useCallback } from 'react'
import { useAppState } from '../state/context'
import { uploadImage } from '../services/api'
import './StepUpload.css'

let idCounter = 0
function genId() {
  return `img_${Date.now()}_${++idCounter}`
}

function StepUpload() {
  const { state, dispatch } = useAppState()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const uploadFile = useCallback(async (imageId, file) => {
    try {
      dispatch({ type: 'UPLOAD_PROGRESS', payload: { imageId, progress: 0 } })
      const result = await uploadImage(file, (progress) => {
        dispatch({ type: 'UPLOAD_PROGRESS', payload: { imageId, progress } })
      })
      dispatch({ type: 'UPLOAD_SUCCESS', payload: { imageId, url: result.url } })
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || '上传失败'
      dispatch({ type: 'UPLOAD_ERROR', payload: `上传失败 (${file.name}): ${msg}` })
    }
  }, [dispatch])

  const processFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('请选择图片文件')
      return
    }

    // 文件大小检查
    const oversized = imageFiles.filter(f => f.size > 20 * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`以下文件超过 20MB 限制: ${oversized.map(f => f.name).join(', ')}`)
      return
    }

    const readers = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        const imageId = genId()
        reader.onload = () => resolve({
          id: imageId,
          name: file.name,
          dataUrl: reader.result,
          file, // 保留原始文件对象用于上传
        })
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then(newImages => {
      dispatch({ type: 'SET_IMAGES', payload: [...state.uploadedImages, ...newImages] })
      // 立即开始上传每张图片
      newImages.forEach(img => {
        dispatch({ type: 'UPLOAD_START' })
        uploadFile(img.id, img.file)
      })
    })
  }, [state.uploadedImages, dispatch, uploadFile])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e) => {
    processFiles(e.target.files)
    e.target.value = ''
  }

  const removeImage = (id) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id })
  }

  const allUploaded = state.uploadedImages.length > 0
    && state.uploadedImages.every(img => state.imageUrls[img.id])

  return (
    <section className="step-card">
      <h2>📤 步骤1：上传衣服图片</h2>

      <div
        className={`drop-zone ${dragOver ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>📁 拖拽图片到此处，或点击选择文件</p>
        <p className="hint">支持 JPG、PNG、WebP，单张不超过 20MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {state.uploadedImages.length > 0 && (
        <div className="thumbnail-grid">
          {state.uploadedImages.map(img => {
            const progress = state.uploadProgress[img.id]
            const url = state.imageUrls[img.id]
            return (
              <div key={img.id} className="thumbnail-item">
                <img src={img.dataUrl} alt={img.name} />
                {/* 上传进度覆盖层 */}
                {!url && progress !== undefined && progress < 100 && (
                  <div className="upload-overlay">
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="upload-progress-text">{progress}%</span>
                  </div>
                )}
                {url && (
                  <div className="upload-check">✅</div>
                )}
                <button
                  className="remove-btn"
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}

      {state.uploadedImages.length > 0 && !allUploaded && (
        <p style={{ marginTop: 10, color: '#f59e0b', fontSize: 13, textAlign: 'center' }}>
          ⏳ 正在上传图片到服务器...
        </p>
      )}
      {allUploaded && (
        <p style={{ marginTop: 10, color: '#10b981', fontSize: 13, textAlign: 'center' }}>
          ✅ 全部图片上传完成
        </p>
      )}
      {state.uploadedImages.length === 0 && (
        <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
          暂未上传图片
        </p>
      )}
    </section>
  )
}

export default StepUpload
