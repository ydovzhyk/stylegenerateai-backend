const fs = require('fs/promises')
const path = require('path')

const { Category } = require('../models/category.model')
const { ReadyTemplate } = require('../models/readyTemplate.model')
const RequestError = require('../helpers/RequestError')
const {
  generateTemplateDrafts,
} = require('../services/ready-template/openai-generateTemplateDrafts.service')
const {
  askModelForJson,
} = require('../services/openai/askModelForJson.service')

const { generateReadyTemplatePreview } = require('../services/ready-template/openai-ready-template.service')

const { saveTemplatePreview } = require('../helpers/saveTemplatePreview')

const PROTOTYPE_SOURCE_MAP = {
  man_front_color: {
    publicUrl: '/images/photo-prototype/men-color.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'men-color.png',
    ),
  },
  man_front_black: {
    publicUrl: '/images/photo-prototype/men-black.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'men-black.png',
    ),
  },
  man_profile_color: {
    publicUrl: '/images/photo-prototype/men-color-profile.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'men-color-profile.png',
    ),
  },
  man_profile_black: {
    publicUrl: '/images/photo-prototype/men-black-profile.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'men-black-profile.png',
    ),
  },
  woman_front_color: {
    publicUrl: '/images/photo-prototype/women-color.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'women-color.png',
    ),
  },
  woman_front_black: {
    publicUrl: '/images/photo-prototype/women-black.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'women-black.png',
    ),
  },
  woman_profile_color: {
    publicUrl: '/images/photo-prototype/women-color-profile.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'women-color-profile.png',
    ),
  },
  woman_profile_black: {
    publicUrl: '/images/photo-prototype/women-black-profile.png',
    filePath: path.join(
      process.cwd(),
      'public',
      'images',
      'photo-prototype',
      'women-black-profile.png',
    ),
  },
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 20)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20)
  }

  return []
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function pickSourceMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'

  return 'image/png'
}

async function readReferencePrompts() {
  const filePath = path.join(
    process.cwd(),
    'src',
    'config',
    'template-factory',
    'reference-prompts.json',
  )

  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)

  return Array.isArray(parsed?.items) ? parsed.items : []
}

const autogenerateReadyTemplatesController = async (req, res, next) => {
  try {
    const {
      perCategory = 2,
      limitCategories,
      categories: requestedCategories = [],
      dryRun = false,
    } = req.body || {}

    const normalizedPerCategory = Number(perCategory)
    const normalizedLimitCategories = limitCategories
      ? Number(limitCategories)
      : null
    const normalizedDryRun = normalizeBoolean(dryRun) ?? false

    if (!Number.isInteger(normalizedPerCategory) || normalizedPerCategory < 1) {
      throw RequestError(400, 'perCategory must be a positive integer')
    }

    if (
      normalizedLimitCategories !== null &&
      (!Number.isInteger(normalizedLimitCategories) ||
        normalizedLimitCategories < 1)
    ) {
      throw RequestError(400, 'limitCategories must be a positive integer')
    }

    const categoryDoc = await Category.findOne().lean()

    if (
      !categoryDoc ||
      !Array.isArray(categoryDoc.values) ||
      !categoryDoc.values.length
    ) {
      throw RequestError(404, 'No categories found')
    }

    let categories = categoryDoc.values
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    if (Array.isArray(requestedCategories) && requestedCategories.length > 0) {
      const requestedSet = new Set(
        requestedCategories
          .map((item) => String(item || '').trim())
          .filter(Boolean),
      )

      categories = categories.filter((item) => requestedSet.has(item))
    }

    if (normalizedLimitCategories !== null) {
      categories = categories.slice(0, normalizedLimitCategories)
    }

    if (!categories.length) {
      throw RequestError(400, 'No matching categories selected for generation')
    }

    const referencePrompts = await readReferencePrompts()

    const report = {
      totalCategories: categories.length,
      requestedPerCategory: normalizedPerCategory,
      dryRun: normalizedDryRun,
      generatedDrafts: 0,
      createdTemplates: 0,
      failedTemplates: 0,
      items: [],
    }

    for (const category of categories) {
      let drafts = []

      try {
        drafts = await generateTemplateDrafts({
          category,
          perCategory: normalizedPerCategory,
          referencePrompts,
          askModelForJson,
        })
      } catch (error) {
        report.failedTemplates += normalizedPerCategory
        report.items.push({
          category,
          status: 'failed',
          stage: 'draft_generation',
          error: error.message || 'Failed to generate drafts',
        })
        continue
      }

      report.generatedDrafts += drafts.length

      for (const draft of drafts) {
        try {
          const normalizedTitle = String(draft?.title || '').trim()
          const normalizedSlug = normalizeSlug(draft?.slug || draft?.title)
          const normalizedCategory = String(draft?.category || category).trim()
          const normalizedTags = normalizeTags(draft?.tags)
          const normalizedBasePrompt = String(draft?.basePrompt || '').trim()
          const normalizedPreviewSourceKey = String(
            draft?.previewSourceKey || '',
          ).trim()
          const normalizedUseInCreateYourLook =
            normalizeBoolean(draft?.useInCreateYourLook) ?? false

          if (!normalizedTitle) {
            throw new Error('Draft title is required')
          }

          if (!normalizedSlug) {
            throw new Error('Draft slug is required')
          }

          if (!normalizedBasePrompt) {
            throw new Error('Draft basePrompt is required')
          }

          if (!normalizedPreviewSourceKey) {
            throw new Error('Draft previewSourceKey is required')
          }

          const sourceMeta = PROTOTYPE_SOURCE_MAP[normalizedPreviewSourceKey]

          if (!sourceMeta?.filePath) {
            throw new Error(
              `Prototype source not found for key: ${normalizedPreviewSourceKey}`,
            )
          }

          const existingTemplate = await ReadyTemplate.findOne({
            slug: normalizedSlug,
          }).lean()

          if (existingTemplate) {
            report.items.push({
              category: normalizedCategory,
              title: normalizedTitle,
              slug: normalizedSlug,
              status: 'skipped',
              stage: 'duplicate_check',
              message: 'Template with this slug already exists',
            })
            continue
          }

          if (normalizedDryRun) {
            report.items.push({
              category: normalizedCategory,
              title: normalizedTitle,
              slug: normalizedSlug,
              previewSourceKey: normalizedPreviewSourceKey,
              status: 'draft_only',
            })
            continue
          }

          const sourceBuffer = await fs.readFile(sourceMeta.filePath)
          const sourceMimeType = pickSourceMimeType(sourceMeta.filePath)

          const generatedPreview = await generateReadyTemplatePreview({
            buffer: sourceBuffer,
            mimeType: sourceMimeType,
            prompt: normalizedBasePrompt,
            outputId: 'portrait_2_3',
            photoQualityId: 'standard',
          })

          const savedPreview = await saveTemplatePreview({
            buffer: generatedPreview.buffer,
            slug: normalizedSlug,
            mimeType: generatedPreview.mimeType,
          })

          const readyTemplate = await ReadyTemplate.create({
            title: normalizedTitle,
            slug: normalizedSlug,
            category: normalizedCategory,
            tags: normalizedTags,
            previewUrl: savedPreview.url,
            previewPath: savedPreview.path,
            previewSourceKey: normalizedPreviewSourceKey,
            useInCreateYourLook: normalizedUseInCreateYourLook,
            basePrompt: normalizedBasePrompt,
            isPublished: true,
          })

          report.createdTemplates += 1
          report.items.push({
            category: normalizedCategory,
            title: normalizedTitle,
            slug: normalizedSlug,
            previewSourceKey: normalizedPreviewSourceKey,
            status: 'created',
            readyTemplateId: readyTemplate._id,
          })
        } catch (error) {
          report.failedTemplates += 1
          report.items.push({
            category,
            title: draft?.title || null,
            slug: draft?.slug || null,
            status: 'failed',
            stage: 'materialization',
            error: error.message || 'Failed to create ready template',
          })
        }
      }
    }

    return res.status(200).json(report)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  autogenerateReadyTemplatesController,
}
