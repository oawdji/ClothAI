import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)

const initialState = {
  // 步骤1
  uploadedImages: [],      // 本地预览用：{ id, name, dataUrl, file }
  imageUrls: {},           // 上传后：{ imageId: url }
  uploading: false,        // 是否正在上传
  uploadProgress: {},      // 每张图片的上传进度：{ imageId: 0-100 }
  // 步骤2
  tags: [],
  imageTags: {},           // { imageId: tagName }
  // 步骤3
  mode: 'outfit',
  config: {
    gender: 'female',
    background: 'white',
    pose: 'standing',
  },
  // 步骤4
  generating: false,
  resultImages: [],
  error: '',
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_IMAGES': {
      // 只保留仍在新列表中的图片的 URL/进度/标签
      const newIds = new Set(action.payload.map(img => img.id))
      const keepIfPresent = (map) => {
        const result = {}
        for (const [id, val] of Object.entries(map)) {
          if (newIds.has(id)) result[id] = val
        }
        return result
      }
      const imageUrls = keepIfPresent(state.imageUrls)
      const uploadProgress = keepIfPresent(state.uploadProgress)
      const imageTags = keepIfPresent(state.imageTags)
      return {
        ...state,
        uploadedImages: action.payload,
        imageUrls,
        uploadProgress,
        uploading: Object.keys(uploadProgress).some(id => uploadProgress[id] < 100),
        imageTags,
        tags: rebuildTags(imageTags),
        resultImages: [],
        error: '',
      }
    }

    case 'REMOVE_IMAGE': {
      const filtered = state.uploadedImages.filter(img => img.id !== action.payload)
      const newTags = { ...state.imageTags }
      delete newTags[action.payload]
      const newUrls = { ...state.imageUrls }
      delete newUrls[action.payload]
      const newProgress = { ...state.uploadProgress }
      delete newProgress[action.payload]
      return {
        ...state,
        uploadedImages: filtered,
        imageTags: newTags,
        imageUrls: newUrls,
        uploadProgress: newProgress,
        tags: rebuildTags(newTags),
      }
    }

    // 上传状态
    case 'UPLOAD_START':
      return { ...state, uploading: true }

    case 'UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: { ...state.uploadProgress, [action.payload.imageId]: action.payload.progress },
      }

    case 'UPLOAD_SUCCESS': {
      const newUrls = { ...state.imageUrls, [action.payload.imageId]: action.payload.url }
      const newProgress = { ...state.uploadProgress, [action.payload.imageId]: 100 }
      return {
        ...state,
        imageUrls: newUrls,
        uploadProgress: newProgress,
        uploading: Object.keys(newProgress).some(id => newProgress[id] < 100),
      }
    }

    case 'UPLOAD_ERROR': {
      // 标记失败图片为"已完成"（不再计入上传中），同时保留其他上传中的图片状态
      const newProgress = { ...state.uploadProgress }
      if (action.payload?.imageId) {
        newProgress[action.payload.imageId] = 100 // 失败也算完成，不再阻塞 uploading 状态
      }
      const stillUploading = Object.keys(newProgress).some(id => newProgress[id] < 100)
      return {
        ...state,
        error: action.payload?.message || action.payload,
        uploadProgress: newProgress,
        uploading: stillUploading,
      }
    }

    case 'SET_IMAGE_TAG': {
      const newTags = { ...state.imageTags, [action.payload.imageId]: action.payload.tag }
      return {
        ...state,
        imageTags: newTags,
        tags: rebuildTags(newTags),
      }
    }

    case 'ADD_TAG':
      if (!action.payload || state.tags.includes(action.payload)) return state
      return { ...state, tags: [...state.tags, action.payload] }

    case 'SET_MODE':
      return { ...state, mode: action.payload }

    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } }

    case 'GENERATE_START':
      return { ...state, generating: true, error: '', resultImages: [] }

    case 'GENERATE_SUCCESS':
      return { ...state, generating: false, resultImages: action.payload }

    case 'GENERATE_ERROR':
      return { ...state, generating: false, error: action.payload }

    default:
      return state
  }
}

function rebuildTags(imageTags) {
  return [...new Set(Object.values(imageTags).filter(Boolean))]
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
