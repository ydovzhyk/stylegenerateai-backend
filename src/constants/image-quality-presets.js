const IMAGE_QUALITY_PRESETS = {
  draft: {
    id: 'draft',
    label: 'Draft',
    apiQuality: 'low',
    outputFormat: 'webp',
    outputCompression: 70,
    inputFidelity: 'high',
    promptSuffix:
      'Keep the result clean, simple, lightweight, and suitable for a fast preview.',
  },

  standard: {
    id: 'standard',
    label: 'Standard',
    apiQuality: 'medium',
    outputFormat: 'webp',
    outputCompression: 82,
    inputFidelity: 'high',
    promptSuffix:
      'Keep the result clean, polished, visually appealing, and balanced in detail.',
  },

  premium: {
    id: 'premium',
    label: 'Premium',
    apiQuality: 'high',
    outputFormat: 'jpeg',
    outputCompression: 92,
    inputFidelity: 'high',
    promptSuffix:
      'Keep the result premium, refined, polished, and rich in visible details.',
  },

  print: {
    id: 'print',
    label: 'Print',
    apiQuality: 'high',
    outputFormat: 'png',
    outputCompression: null,
    inputFidelity: 'high',
    promptSuffix:
      'Keep the result maximally clean, polished, and suitable for high-quality export or print.',
  },
}

const DEFAULT_IMAGE_QUALITY_PRESET = 'standard'

function resolveImageQualityPreset(qualityId) {
  return (
    IMAGE_QUALITY_PRESETS[qualityId] ||
    IMAGE_QUALITY_PRESETS[DEFAULT_IMAGE_QUALITY_PRESET]
  )
}

module.exports = {
  IMAGE_QUALITY_PRESETS,
  DEFAULT_IMAGE_QUALITY_PRESET,
  resolveImageQualityPreset,
}
