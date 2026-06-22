import { useAppState } from '../state/context'

const GENDERS = [
  { value: 'female', label: '👩 女性' },
  { value: 'male', label: '👨 男性' },
  { value: 'neutral', label: '🧑 中性' },
]

const BACKGROUNDS = [
  { value: 'white', label: '⬜ 纯白背景' },
  { value: 'gray', label: '🩶 灰色背景' },
  { value: 'natural', label: '🌿 自然场景' },
]

const POSES = [
  { value: 'standing', label: '🧍 自然站姿' },
  { value: 'walking', label: '🚶 行走姿态' },
  { value: 'sitting', label: '🪑 优雅坐姿' },
]

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <label
            key={opt.value}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: value === opt.value ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: value === opt.value ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            <input
              type="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ display: 'none' }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

function StepConfig() {
  const { state, dispatch } = useAppState()

  const allUploaded = state.uploadedImages.length > 0
    && state.uploadedImages.every(img => state.imageUrls[img.id])
  const allTagged = state.uploadedImages.length > 0
    && state.tags.length > 0
    && Object.values(state.imageTags).filter(Boolean).length >= state.uploadedImages.length

  const canGenerate =
    !state.generating &&
    allUploaded &&
    allTagged

  const handleGenerate = () => {
    dispatch({ type: 'GENERATE_START' })
  }

  return (
    <section className="step-card">
      <h2>⚙️ 步骤3：生成配置</h2>

      {/* 模式选择 */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>生成模式</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <label
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: state.mode === 'outfit' ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: state.mode === 'outfit' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input
              type="radio" value="outfit" checked={state.mode === 'outfit'}
              onChange={() => dispatch({ type: 'SET_MODE', payload: 'outfit' })}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>👗 组合穿搭</div>
            <div style={{ fontSize: 12, color: '#888' }}>多件衣服合成一张图</div>
          </label>
          <label
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: state.mode === 'single' ? '2px solid #4f46e5' : '1px solid #d1d5db',
              background: state.mode === 'single' ? '#eef2ff' : '#fff',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input
              type="radio" value="single" checked={state.mode === 'single'}
              onChange={() => dispatch({ type: 'SET_MODE', payload: 'single' })}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📷 一对一</div>
            <div style={{ fontSize: 12, color: '#888' }}>每件衣服独立生成</div>
          </label>
        </div>
      </div>

      <RadioGroup
        label="模特性别"
        options={GENDERS}
        value={state.config.gender}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { gender: v } })}
      />
      <RadioGroup
        label="背景风格"
        options={BACKGROUNDS}
        value={state.config.background}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { background: v } })}
      />
      <RadioGroup
        label="模特姿态"
        options={POSES}
        value={state.config.pose}
        onChange={(v) => dispatch({ type: 'SET_CONFIG', payload: { pose: v } })}
      />

      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={!canGenerate}
        style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 8 }}
      >
        {state.generating ? '⏳ 生成中...' : '🚀 开始生成'}
      </button>

      {!canGenerate && state.uploadedImages.length > 0 && (
        <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          {!allUploaded
            ? '⏳ 请等待图片上传完成'
            : !allTagged
              ? '🏷️ 请为所有图片分配标签'
              : ''}
        </p>
      )}
    </section>
  )
}

export default StepConfig
