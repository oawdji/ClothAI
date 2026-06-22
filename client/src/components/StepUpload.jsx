import { useRef, useState, useCallback } from 'react'
import { useAppState } from '../state/context'
import './StepUpload.css'

let idCounter = 0
function genId() {
  return `img_${Date.now()}_${++idCounter}`
}

function StepUpload() {
  const { state, dispatch } = useAppState()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const processFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('请选择图片文件')
      return
    }

    const readers = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve({
          id: genId(),
          name: file.name,
          dataUrl: reader.result,
        })
        reader.readAsDataURL(file)
      })
    })

    Promise.all(readers).then(newImages => {
      dispatch({ type: 'SET_IMAGES', payload: [...state.uploadedImages, ...newImages] })
    })
  }, [state.uploadedImages, dispatch])

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
        <p className="hint">支持 JPG、PNG、WebP，单张不超过 10MB</p>
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
          {state.uploadedImages.map(img => (
            <div key={img.id} className="thumbnail-item">
              <img src={img.dataUrl} alt={img.name} />
              <button className="remove-btn" onClick={() => removeImage(img.id)}>×</button>
            </div>
          ))}
        </div>
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
