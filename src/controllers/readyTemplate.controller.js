const RequestError = require('../helpers/RequestError')
const { ReadyTemplate } = require('../models/readyTemplate.model')
const { Category } = require('../models/category.model')
const { saveTemplatePreview } = require('../helpers/saveTemplatePreview')
const {
  generateReadyTemplatePreview: generateReadyTemplatePreviewImage,
} = require('../services/ready-template/openai-ready-template.service')

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

const generateReadyTemplatePreview = async (req, res, next) => {
  try {
    const {
      prompt,
      sourceMode,
      prototypeGender,
      prototypeView,
      prototypeTone,
      outputId,
      photoQualityId,
    } = req.body

    if (!req.file) {
      throw RequestError(400, 'Source image is required')
    }

    const result = await generateReadyTemplatePreviewImage({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      prompt,
      outputId,
      photoQualityId,
    })

    const previewUrl = `data:${result.mimeType};base64,${result.buffer.toString(
      'base64',
    )}`

    return res.status(200).json({
      previewUrl,
      mimeType: result.mimeType,
      promptUsed: result.promptUsed,
      output: result.output,
      photoQuality: result.photoQuality,
      meta: {
        sourceMode: sourceMode || null,
        prototypeGender: prototypeGender || null,
        prototypeView: prototypeView || null,
        prototypeTone: prototypeTone || null,
      },
      usage: result.usage || null,
      message: 'Preview generated successfully',
    })
  } catch (e) {
    next(e)
  }
}

const createReadyTemplate = async (req, res, next) => {
  try {
    const {
      title,
      slug,
      category,
      tags,
      basePrompt,
      isPublished,
      previewSourceKey,
      useInCreateYourLook,
    } = req.body

    if (!req.file) {
      throw RequestError(400, 'Preview image is required')
    }

    const normalizedSlug = normalizeSlug(slug || title)

    const existingTemplate = await ReadyTemplate.findOne({
      slug: normalizedSlug,
    })
    if (existingTemplate) {
      throw RequestError(409, 'Template with this slug already exists')
    }

    const preview = await saveTemplatePreview({
      buffer: req.file.buffer,
      slug: normalizedSlug,
      mimeType: req.file.mimetype,
    })

    const normalizedPublished = normalizeBoolean(isPublished)
    const normalizedUseInCreateYourLook = normalizeBoolean(useInCreateYourLook)
    const normalizedPreviewSourceKey = String(previewSourceKey || '').trim()

    if (normalizedUseInCreateYourLook && !normalizedPreviewSourceKey) {
      throw RequestError(
        400,
        'Create Your Look preview requires a prototype-based source key',
      )
    }

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
      previewSourceKey: normalizedPreviewSourceKey,
      ...(normalizedUseInCreateYourLook !== undefined && {
        useInCreateYourLook: normalizedUseInCreateYourLook,
      }),
    })

    return res.status(201).json({ message: 'Ready template created successfully'})
  } catch (e) {
    next(e)
  }
}

const addCategory = async (req, res, next) => {
  try {
  const { value } = req.body
  const normalized = value.trim().toLowerCase()
  let doc = await Category.findOne()

  if (!doc) {
    doc = await Category.create({ values: [normalized] })
  } else {
    if (!doc.values.includes(normalized)) {
      doc.values.push(normalized)
      await doc.save()
    }
    }

    return res.status(201).json({ ok: true })
  } catch (e) {
    next(e)
  }
}

const getCategories = async (req, res, next) => {
  try {
    const doc = await Category.findOne()
    return res.status(200).json({
      values: doc?.values || [],
    })
  } catch (e) {
    next(e)
  }
}


module.exports = {
  createReadyTemplate,
  generateReadyTemplatePreview,
  addCategory,
  getCategories,
}
