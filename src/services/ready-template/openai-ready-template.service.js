const OpenAI = require('openai')
const { toFile } = require('openai')

const {
  resolveImageOutputFormat,
} = require('../../constants/image-output-formats')
const {
  resolveImageQualityPreset,
} = require('../../constants/image-quality-presets')
const { resolveMimeType } = require('../../helpers/image-config')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []

  return tags
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 10)
}

function buildReadyTemplatePrompt({
  prompt,
  title,
  category,
  styleNotes,
  tags = [],
  output,
  photoQuality,
}) {
  const safePrompt = String(prompt || '').trim()
  const safeTitle = String(title || '').trim()
  const safeCategory = String(category || '').trim()
  const safeStyleNotes = String(styleNotes || '').trim()
  const safeTags = normalizeTags(tags)

  const aspectRatio = output?.aspectRatio || '2:3'
  const label = output?.label || 'Portrait 2:3'
  const qualitySuffix = String(photoQuality?.promptSuffix || '').trim()

  return [
    'Create a final preview image for an art template catalog.',
    'Use the uploaded source photo as the main identity reference.',
    "Strictly preserve the person's facial identity from the source image.",
    'Do not alter facial structure, proportions, or key identity features.',
    'The face must remain clearly recognizable as the same person.',
    'Identity preservation is more important than stylistic changes.',
    'Follow the user prompt precisely and prioritize its artistic direction, composition, pose, styling, and scene details over the source photo when needed.',
    'However, never sacrifice facial identity for style, lighting, or composition.',

    safeCategory
      ? `This preview belongs to the category: ${safeCategory}.`
      : '',
    safeTitle ? `Template title: ${safeTitle}.` : '',
    safeStyleNotes ? `Style notes: ${safeStyleNotes}.` : '',
    safeTags.length ? `Tags: ${safeTags.join(', ')}.` : '',

    `Generate the final image in ${label} format with ${aspectRatio} aspect ratio.`,
    'Adapt the composition naturally to fit the requested output format without weakening the intended scene composition from the user prompt.',

    'The result must look visually strong, polished, and suitable for a public template gallery while preserving the intended artistic mood and effects from the user prompt.',
    'Do not simplify, soften, or neutralize dramatic, gritty, smoky, cinematic, battle-worn, or stylized elements if they are part of the user prompt.',

    'Keep all visible objects structurally believable, clean, and coherent.',
    'Weapons must have realistic, intentional, physically plausible shapes and silhouettes.',
    'Avoid warped, melted, wavy, bent, broken, or ambiguous blades unless the prompt explicitly requests such a design.',
    'Armor, clothing, and accessories must remain consistent, symmetrical where appropriate, and physically believable.',
    'Hair styling must remain visually coherent and physically plausible throughout the image.',
    'Do not mix incompatible hairstyles in a confusing way unless the prompt explicitly asks for it.',
    'Keep braids, buns, loose hair, and wind effects consistent with one another.',

    'Avoid deformed anatomy, broken hands, duplicated elements, blurred face details, distorted armor, inconsistent hair structure, malformed weapons, text artifacts, watermarks, frames, and accidental collage-like composition.',
    'Output a single polished final image.',
    qualitySuffix,
    `User instructions: ${safePrompt}`,
  ]
    .filter(Boolean)
    .join(' ')
}

// function buildReadyTemplatePrompt({
//   prompt,
//   title,
//   category,
//   styleNotes,
//   tags = [],
//   output,
//   photoQuality,
// }) {
//   const safePrompt = String(prompt || '').trim()
//   const safeTitle = String(title || '').trim()
//   const safeCategory = String(category || '').trim()
//   const safeStyleNotes = String(styleNotes || '').trim()
//   const safeTags = normalizeTags(tags)

//   const aspectRatio = output?.aspectRatio || '2:3'
//   const label = output?.label || 'Portrait 2:3'
//   const qualitySuffix = String(photoQuality?.promptSuffix || '').trim()

//   return [
//     'Create a final preview image for an art template catalog.',
//     'Use the uploaded source photo as the main identity reference.',
//     'Preserve the main person, facial identity, and overall recognizability where possible.',
//     'Follow the user prompt precisely and prioritize its artistic direction, composition, pose, styling, and scene details over the source photo when needed.',
//     safeCategory
//       ? `This preview belongs to the category: ${safeCategory}.`
//       : '',
//     safeTitle ? `Template title: ${safeTitle}.` : '',
//     safeStyleNotes ? `Style notes: ${safeStyleNotes}.` : '',
//     safeTags.length ? `Tags: ${safeTags.join(', ')}.` : '',
//     `Generate the final image in ${label} format with ${aspectRatio} aspect ratio.`,
//     'Adapt the composition naturally to fit the requested output format without weakening the intended scene composition from the user prompt.',
//     'The result must look visually strong, polished, and suitable for a public template gallery while preserving the intended artistic mood and effects from the user prompt.',
//     'Do not simplify, soften, or neutralize dramatic, gritty, smoky, cinematic, battle-worn, or stylized elements if they are part of the user prompt.',
//     'Avoid deformed anatomy, broken hands, duplicated elements, blurred face details, text artifacts, watermarks, frames, and accidental collage-like composition.',
//     'Output a single polished final image.',
//     qualitySuffix,
//     `User instructions: ${safePrompt}`,
//   ]
//     .filter(Boolean)
//     .join(' ')
// }

async function generateReadyTemplatePreview({
  buffer,
  mimeType,
  prompt,
  title,
  category,
  styleNotes,
  tags = [],
  outputId = 'portrait_2_3',
  photoQualityId = 'standard',
  model = 'gpt-image-1.5',
}) {
  const output = resolveImageOutputFormat(outputId)
  const photoQuality = resolveImageQualityPreset(photoQualityId)

  const promptUsed = buildReadyTemplatePrompt({
    prompt,
    title,
    category,
    styleNotes,
    tags,
    output,
    photoQuality,
  })

  const imageFile = await toFile(buffer, 'source-image.png', {
    type: mimeType || 'image/png',
  })

  const requestPayload = {
    model,
    image: imageFile,
    prompt: promptUsed,
    size: output.size,
    quality: photoQuality.apiQuality,
    output_format: photoQuality.outputFormat,
    input_fidelity: photoQuality.inputFidelity || 'high',
  }

  if (
    photoQuality.outputCompression != null &&
    ['jpeg', 'webp'].includes(photoQuality.outputFormat)
  ) {
    requestPayload.output_compression = photoQuality.outputCompression
  }

  const response = await openai.images.edit(requestPayload)

  const imageBase64 = response?.data?.[0]?.b64_json

  if (!imageBase64) {
    const error = new Error('OpenAI did not return an image')
    error.status = 502
    throw error
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64')

  return {
    buffer: imageBuffer,
    mimeType: resolveMimeType(photoQuality.outputFormat),
    promptUsed,
    usage: response?.usage || null,
    output,
    photoQuality,
  }
}

module.exports = {
  generateReadyTemplatePreview,
}
