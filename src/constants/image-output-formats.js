const IMAGE_OUTPUT_FORMATS = {
  portrait_2_3: {
    id: 'portrait_2_3',
    label: 'Portrait 2:3',
    aspectRatio: '2:3',
    size: '1024x1536',
    width: 1024,
    height: 1536,
  },
  square_1_1: {
    id: 'square_1_1',
    label: 'Square 1:1',
    aspectRatio: '1:1',
    size: '1024x1024',
    width: 1024,
    height: 1024,
  },
  landscape_3_2: {
    id: 'landscape_3_2',
    label: 'Landscape 3:2',
    aspectRatio: '3:2',
    size: '1536x1024',
    width: 1536,
    height: 1024,
  },
}

const DEFAULT_IMAGE_OUTPUT_FORMAT = 'portrait_2_3'

function resolveImageOutputFormat(formatId) {
  return (
    IMAGE_OUTPUT_FORMATS[formatId] ||
    IMAGE_OUTPUT_FORMATS[DEFAULT_IMAGE_OUTPUT_FORMAT]
  )
}

module.exports = {
  IMAGE_OUTPUT_FORMATS,
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  resolveImageOutputFormat,
}
