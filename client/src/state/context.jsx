import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)

const initialState = {
  // 步骤1
  uploadedImages: [],
  // 步骤2
  tags: [],
  imageTags: {},        // { imageId: tagName }
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

    case 'SET_IMAGES':
      return {
        ...state,
        uploadedImages: action.payload,
        imageTags: {},
        tags: [],
        resultImages: [],
        error: '',
      }

    case 'REMOVE_IMAGE': {
      const filtered = state.uploadedImages.filter(img => img.id !== action.payload)
      const newTags = { ...state.imageTags }
      delete newTags[action.payload]
      return {
        ...state,
        uploadedImages: filtered,
        imageTags: newTags,
        tags: rebuildTags(newTags),
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
