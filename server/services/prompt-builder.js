// 根据用户配置构建 AI 生成提示词
const GENDER_MAP = {
  male: 'male',
  female: 'female',
  neutral: 'androgynous',
};

const POSE_MAP = {
  standing: 'standing naturally, arms relaxed, facing camera',
  walking: 'walking on a runway, dynamic and confident pose',
  sitting: 'sitting elegantly on a modern stool, relaxed posture',
};

const BACKGROUND_MAP = {
  white: 'pure white studio background, clean and minimal',
  gray: 'neutral gray backdrop, professional studio setting',
  natural: 'natural outdoor setting with soft bokeh, warm daylight',
};

/**
 * @param {{ gender: string, background: string, pose: string }} config
 * @returns {string} 拼接后的提示词
 */
function buildPrompt(config) {
  const { gender, background, pose } = config;

  const genderText = GENDER_MAP[gender] || GENDER_MAP.neutral;
  const poseText = POSE_MAP[pose] || POSE_MAP.standing;
  const bgText = BACKGROUND_MAP[background] || BACKGROUND_MAP.white;

  return [
    'professional fashion photography, e-commerce product photo,',
    `${genderText} model wearing the reference clothing,`,
    `${poseText},`,
    `${bgText},`,
    'high quality, 4k, studio lighting, full body shot, front view,',
    'fabric texture visible, natural folds, realistic draping',
  ].join(' ');
}

module.exports = { buildPrompt };
