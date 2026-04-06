const RequestError = require('../helpers/RequestError')

const { ReadyTemplate } = require('../models/readyTemplate.model')
const { saveTemplatePreview } = require('../helpers/saveTemplatePreview')

function normalizeSlug(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }

  return []
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const createReadyTemplate = async (req, res) => {
  const { title, slug, category, tags, basePrompt, isPublished } = req.body

  if (!req.file) {
    throw RequestError(400, 'Preview image is required')
  }

  const normalizedSlug = normalizeSlug(slug || title)

  const existingTemplate = await ReadyTemplate.findOne({ slug: normalizedSlug })
  if (existingTemplate) {
    throw RequestError(409, 'Template with this slug already exists')
  }

  const preview = await saveTemplatePreview({
    buffer: req.file.buffer,
    slug: normalizedSlug,
    mimeType: req.file.mimetype,
  })

  const normalizedPublished = normalizeBoolean(isPublished)

  const readyTemplate = await ReadyTemplate.create({
    title: title.trim(),
    slug: normalizedSlug,
    category: category.trim(),
    tags: normalizeTags(tags),
    basePrompt: basePrompt.trim(),
    ...(normalizedPublished !== undefined && {
      isPublished: normalizedPublished,
    }),
    previewUrl: preview.url,
    previewPath: preview.path,
  })

  res.status(201).json(readyTemplate)
}

module.exports = {
  createReadyTemplate,
}
