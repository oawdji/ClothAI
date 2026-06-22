import { useState } from 'react'
import { useAppState } from '../state/context'
import './StepTagging.css'

function StepTagging() {
  const { state, dispatch } = useAppState()
  const [newTag, setNewTag] = useState('')

  const { uploadedImages, imageTags, tags } = state

  if (uploadedImages.length === 0) return null

  const addTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      dispatch({ type: 'ADD_TAG', payload: trimmed })
      setNewTag('')
    }
  }

  const handleTagChange = (imageId, tag) => {
    dispatch({ type: 'SET_IMAGE_TAG', payload: { imageId, tag } })
  }

  return (
    <section className="step-card">
      <h2>🏷️ 步骤2：标签归组</h2>
      <p className="step-desc">为每张图片分配标签，相同标签 = 同一件衣服的不同角度照片</p>

      {tags.length > 0 && (
        <div className="tag-chips">
          {tags.map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      )}

      <div className="tag-bar">
        <input
          placeholder='输入新标签名（如"上衣A"）'
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
        />
        <button className="btn btn-secondary btn-sm" onClick={addTag}>+ 新建</button>
      </div>

      {uploadedImages.map(img => (
        <div key={img.id} className="tag-row">
          <img className="thumb" src={img.dataUrl} alt={img.name} />
          <span className="name">{img.name}</span>
          <select
            value={imageTags[img.id] || ''}
            onChange={e => handleTagChange(img.id, e.target.value)}
          >
            <option value="">未分类</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      ))}
    </section>
  )
}

export default StepTagging
