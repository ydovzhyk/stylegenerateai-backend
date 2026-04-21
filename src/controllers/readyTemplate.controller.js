const RequestError = require('../helpers/RequestError')
const { ReadyTemplate } = require('../models/readyTemplate.model')
const { Category } = require('../models/category.model')
const { saveTemplatePreview } = require('../helpers/saveTemplatePreview')
const {
  generateReadyTemplatePreview: generateReadyTemplatePreviewImage,
} = require('../services/ready-template/openai-ready-template.service')
const {
  resolveCategoryFromPrompt,
} = require('../services/ready-template/openai-resolve-category.service')
const {
  suggestTemplateMetadataFromPrompt,
} = require('../services/ready-template/openai-suggest-template-metadata.service')
const {
  recalculateCategoryTemplatesCount,
} = require('../helpers/recalculateCategoryTemplatesCount')

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

function normalizeCategoryValue(value = '') {
  return String(value).trim()
}

function normalizeCategoryKey(value = '') {
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ')
}

function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return []

  return arr.map((item) => String(item || '').trim()).filter(Boolean)
}

function uniqueStringArray(arr = []) {
  const seen = new Set()

  return arr.filter((item) => {
    const key = normalizeCategoryKey(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildCategoryValues(items = []) {
  return items.map((item) => String(item?.value || '').trim()).filter(Boolean)
}

function mapCategoryItemsForAI(items = []) {
  return items.map((item) => ({
    value: String(item?.value || '').trim(),
    dna: {
      coreIdentity: String(item?.dna?.coreIdentity || '').trim(),
      mustHave: normalizeStringArray(item?.dna?.mustHave),
      mayUse: normalizeStringArray(item?.dna?.mayUse),
      avoid: normalizeStringArray(item?.dna?.avoid),
    },
  }))
}

function findExistingCategoryByValue(items = [], value = '') {
  const targetKey = normalizeCategoryKey(value)
  if (!targetKey) return null

  return (
    items.find((item) => normalizeCategoryKey(item?.value) === targetKey) ||
    null
  )
}

function sanitizeGeneratedCategory(raw = {}) {
  const value = normalizeCategoryValue(raw?.value)

  return {
    value,
    dna: {
      coreIdentity: String(raw?.dna?.coreIdentity || '').trim(),
      mustHave: uniqueStringArray(normalizeStringArray(raw?.dna?.mustHave)),
      mayUse: uniqueStringArray(normalizeStringArray(raw?.dna?.mayUse)),
      avoid: uniqueStringArray(normalizeStringArray(raw?.dna?.avoid)),
    },
  }
}

function isValidGeneratedCategory(category) {
  if (!category || typeof category !== 'object') return false

  if (!category.value) return false
  if (category.value.length < 2) return false
  if (category.value.length > 60) return false

  if (!category.dna || typeof category.dna !== 'object') return false

  const coreIdentity = String(category.dna.coreIdentity || '').trim()
  if (!coreIdentity) return false
  if (coreIdentity.length < 10) return false
  if (coreIdentity.length > 300) return false

  if (!Array.isArray(category.dna.mustHave)) return false
  if (!Array.isArray(category.dna.mayUse)) return false
  if (!Array.isArray(category.dna.avoid)) return false

  if (category.dna.mustHave.length === 0) return false

  return true
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

    const normalizedCategory = normalizeCategoryValue(category)

    await ReadyTemplate.create({
      title: title.trim(),
      slug: normalizedSlug,
      category: normalizedCategory,
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

    await recalculateCategoryTemplatesCount(normalizedCategory)

    return res
      .status(201)
      .json({ message: 'Ready template created successfully' })
  } catch (e) {
    next(e)
  }
}

// const createReadyTemplate = async (req, res, next) => {
//   try {
//     const {
//       title,
//       slug,
//       category,
//       tags,
//       basePrompt,
//       isPublished,
//       previewSourceKey,
//       useInCreateYourLook,
//     } = req.body

//     if (!req.file) {
//       throw RequestError(400, 'Preview image is required')
//     }

//     const normalizedSlug = normalizeSlug(slug || title)

//     const existingTemplate = await ReadyTemplate.findOne({
//       slug: normalizedSlug,
//     })

//     if (existingTemplate) {
//       throw RequestError(409, 'Template with this slug already exists')
//     }

//     const preview = await saveTemplatePreview({
//       buffer: req.file.buffer,
//       slug: normalizedSlug,
//       mimeType: req.file.mimetype,
//     })

//     const normalizedPublished = normalizeBoolean(isPublished)
//     const normalizedUseInCreateYourLook = normalizeBoolean(useInCreateYourLook)
//     const normalizedPreviewSourceKey = String(previewSourceKey || '').trim()
//     const normalizedCategory = normalizeCategoryValue(category)

//     if (normalizedUseInCreateYourLook && !normalizedPreviewSourceKey) {
//       throw RequestError(
//         400,
//         'Create Your Look preview requires a prototype-based source key',
//       )
//     }

//     await ReadyTemplate.create({
//       title: title.trim(),
//       slug: normalizedSlug,
//       category: normalizedCategory,
//       tags: normalizeTags(tags),
//       basePrompt: basePrompt.trim(),
//       ...(normalizedPublished !== undefined && {
//         isPublished: normalizedPublished,
//       }),
//       previewUrl: preview.url,
//       previewPath: preview.path,
//       previewSourceKey: normalizedPreviewSourceKey,
//       ...(normalizedUseInCreateYourLook !== undefined && {
//         useInCreateYourLook: normalizedUseInCreateYourLook,
//       }),
//     })

//     await recalculateCategoryTemplatesCount(normalizedCategory)

//     return res
//       .status(201)
//       .json({ message: 'Ready template created successfully' })
//   } catch (e) {
//     next(e)
//   }
// }

const resolvePromptMetadata = async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim()

    if (!prompt) {
      throw RequestError(400, 'Prompt is required')
    }

    let doc = await Category.findOne()

    if (!doc) {
      doc = await Category.create({ items: [] })
    }

    const existingItems = Array.isArray(doc.items) ? [...doc.items] : []

    const aiResult = await resolveCategoryFromPrompt({
      prompt,
      categories: mapCategoryItemsForAI(existingItems),
    })

    if (!aiResult || typeof aiResult !== 'object') {
      throw RequestError(500, 'Failed to resolve category from prompt')
    }

    let resolvedCategory = ''
    let values = buildCategoryValues(existingItems)
    let message = ''

    if (aiResult.type === 'existing') {
      const matched = findExistingCategoryByValue(
        existingItems,
        aiResult.value || aiResult.promptCategory,
      )

      if (!matched) {
        throw RequestError(500, 'Resolved existing category was not found')
      }

      resolvedCategory = matched.value
      message = 'Existing category matched successfully'
    } else if (aiResult.type === 'new') {
      const sanitizedCategory = sanitizeGeneratedCategory(aiResult.category)

      if (!isValidGeneratedCategory(sanitizedCategory)) {
        throw RequestError(500, 'Generated category is invalid')
      }

      const duplicate = findExistingCategoryByValue(
        existingItems,
        sanitizedCategory.value,
      )

      if (duplicate) {
        resolvedCategory = duplicate.value
        message = 'Existing category matched successfully'
      } else {
        doc.items.push(sanitizedCategory)
        await doc.save()

        values = buildCategoryValues(doc.items)
        resolvedCategory = sanitizedCategory.value
        message = 'New category created successfully'
      }
    } else {
      throw RequestError(500, 'Unknown category resolution result')
    }

    const metadata = await suggestTemplateMetadataFromPrompt({
      prompt,
      category: resolvedCategory,
    })

    return res.status(200).json({
      promptCategory: resolvedCategory,
      suggestedTitle: metadata.suggestedTitle,
      suggestedTags: metadata.suggestedTags,
      values,
      message,
    })
  } catch (e) {
    next(e)
  }
}

const getCategories = async (req, res, next) => {
  try {
    const doc = await Category.findOne().lean()

    return res.status(200).json({
      values: (doc?.items || []).map((item) => item.value),
    })
  } catch (e) {
    next(e)
  }
}

const getYourLookPreview = async (req, res, next) => {
  try {
    const rawLimit = Number(req.query?.limit)
    const limit =
      Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20) : 10

    const baseQuery = {
      isPublished: true,
      useInCreateYourLook: true,
      previewUrl: { $exists: true, $ne: '' },
      previewSourceKey: { $exists: true, $ne: '' },
    }

    const commonSelect = {
      title: 1,
      slug: 1,
      category: 1,
      previewUrl: 1,
      previewSourceKey: 1,
      useInCreateYourLook: 1,
      createdAt: 1,
      _id: 1,
    }

    const [manTemplates, womanTemplates] = await Promise.all([
      ReadyTemplate.find({
        ...baseQuery,
        previewSourceKey: { $regex: /^man_/i },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(commonSelect)
        .lean(),

      ReadyTemplate.find({
        ...baseQuery,
        previewSourceKey: { $regex: /^woman_/i },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(commonSelect)
        .lean(),
    ])

    return res.status(200).json({
      values: {
        man: manTemplates,
        woman: womanTemplates,
      },
      meta: {
        limit,
        manCount: manTemplates.length,
        womanCount: womanTemplates.length,
      },
    })
  } catch (e) {
    next(e)
  }
}

module.exports = {
  createReadyTemplate,
  generateReadyTemplatePreview,
  resolvePromptMetadata,
  getCategories,
  getYourLookPreview,
}