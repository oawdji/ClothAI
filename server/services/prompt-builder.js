// 根据用户配置构建 AI 生成提示词
const GENDER_MAP = {
  male: 'male',
  female: 'female',
  neutral: 'androgynous',
};

const POSE_MAP = {
  standing: 'standing naturally, arms relaxed, facing camera, full body head-to-toe visible',
  walking: 'walking on a runway, dynamic and confident pose, full body head-to-toe visible',
  sitting: 'sitting elegantly on a modern stool, full body from head to toe visible, feet and head in frame',
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
    'full-length portrait, head to toe completely visible in frame,',
    'entire body from top of head to bottom of feet must be shown,',
    'no cropped body, no cut-off head, no cut-off feet, no close-up, no half-body,',
    'fabric texture visible, natural folds, realistic draping',
  ].join(' ');
}

module.exports = { buildPrompt };
