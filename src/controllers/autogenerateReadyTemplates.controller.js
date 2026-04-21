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
const {
  generateReadyTemplatePreview,
} = require('../services/ready-template/openai-ready-template.service')
const {
  recalculateCategoryTemplatesCount,
} = require('../helpers/recalculateCategoryTemplatesCount')

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

function normalizeCategoryItems(categoryDoc) {
  if (!categoryDoc) return []

  if (Array.isArray(categoryDoc.items) && categoryDoc.items.length > 0) {
    return categoryDoc.items
      .map((item) => ({
        value: String(item?.value || '').trim(),
        dna:
          item?.dna && typeof item.dna === 'object'
            ? {
                coreIdentity: String(item.dna.coreIdentity || '').trim(),
                mustHave: Array.isArray(item.dna.mustHave)
                  ? item.dna.mustHave
                      .map((v) => String(v || '').trim())
                      .filter(Boolean)
                  : [],
                mayUse: Array.isArray(item.dna.mayUse)
                  ? item.dna.mayUse
                      .map((v) => String(v || '').trim())
                      .filter(Boolean)
                  : [],
                avoid: Array.isArray(item.dna.avoid)
                  ? item.dna.avoid
                      .map((v) => String(v || '').trim())
                      .filter(Boolean)
                  : [],
              }
            : {
                coreIdentity: '',
                mustHave: [],
                mayUse: [],
                avoid: [],
              },
      }))
      .filter((item) => item.value)
  }

  if (Array.isArray(categoryDoc.values) && categoryDoc.values.length > 0) {
    return categoryDoc.values
      .map((value) => ({
        value: String(value || '').trim(),
        dna: {
          coreIdentity: '',
          mustHave: [],
          mayUse: [],
          avoid: [],
        },
      }))
      .filter((item) => item.value)
  }

  return []
}

function buildSessionHistoryEntry(draft) {
  const title = String(draft?.title || '').trim()
  const category = String(draft?.category || '').trim()
  const styleNotes = String(draft?.styleNotes || '').trim()
  const tags = Array.isArray(draft?.tags)
    ? draft.tags.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  return {
    title,
    category,
    tags: tags.slice(0, 6),
    styleNotes,
  }
}

const autogenerateReadyTemplatesController = async (req, res, next) => {
  console.log('=== AUTOGENERATE CONTROLLER HIT ===')
  console.log('BODY:', req.body)

  try {
    const {
      mode,
      perCategory = 2,
      selectedCategory,
      rangeStart,
      rangeEnd,
      dryRun = false,
    } = req.body || {}

    const normalizedMode = String(mode || '').trim()
    const normalizedPerCategory = Number(perCategory)
    const normalizedSelectedCategory = String(selectedCategory || '').trim()
    const normalizedRangeStart =
      rangeStart === undefined || rangeStart === null
        ? null
        : Number(rangeStart)
    const normalizedRangeEnd =
      rangeEnd === undefined || rangeEnd === null ? null : Number(rangeEnd)
    const normalizedDryRun = normalizeBoolean(dryRun) ?? false

    if (!['single', 'range'].includes(normalizedMode)) {
      throw RequestError(400, 'mode must be either "single" or "range"')
    }

    if (!Number.isInteger(normalizedPerCategory) || normalizedPerCategory < 1) {
      throw RequestError(400, 'perCategory must be a positive integer')
    }

    const categoryDoc = await Category.findOne().lean()
    let categoryItems = normalizeCategoryItems(categoryDoc)

    if (!categoryItems.length) {
      throw RequestError(404, 'No categories found')
    }

    const totalAvailableCategories = categoryItems.length

    if (normalizedMode === 'single') {
      if (!normalizedSelectedCategory) {
        throw RequestError(400, 'selectedCategory is required for single mode')
      }

      categoryItems = categoryItems.filter(
        (item) => item.value === normalizedSelectedCategory,
      )
    }

    if (normalizedMode === 'range') {
      if (
        !Number.isInteger(normalizedRangeStart) ||
        !Number.isInteger(normalizedRangeEnd)
      ) {
        throw RequestError(
          400,
          'rangeStart and rangeEnd must be positive integers',
        )
      }

      if (normalizedRangeStart < 1 || normalizedRangeEnd < 1) {
        throw RequestError(
          400,
          'rangeStart and rangeEnd must be positive integers',
        )
      }

      if (normalizedRangeStart > normalizedRangeEnd) {
        throw RequestError(400, 'rangeStart cannot be greater than rangeEnd')
      }

      if (normalizedRangeEnd > totalAvailableCategories) {
        throw RequestError(
          400,
          `rangeEnd cannot be greater than total categories count (${totalAvailableCategories})`,
        )
      }

      const startIndex = normalizedRangeStart - 1
      const endIndexExclusive = normalizedRangeEnd

      categoryItems = categoryItems.slice(startIndex, endIndexExclusive)
    }

    if (!categoryItems.length) {
      throw RequestError(400, 'No matching categories selected for generation')
    }

    console.log(
      'CATEGORIES FROM DB:',
      categoryItems.map((item) => ({
        value: item.value,
        dna: item.dna,
      })),
    )

    const referencePrompts = await readReferencePrompts()
    const sessionHistory = []

    const report = {
      mode: normalizedMode,
      selectedCategory:
        normalizedMode === 'single' ? normalizedSelectedCategory : null,
      range:
        normalizedMode === 'range'
          ? {
              start: normalizedRangeStart,
              end: normalizedRangeEnd,
            }
          : null,
      totalCategories: categoryItems.length,
      requestedPerCategory: normalizedPerCategory,
      dryRun: normalizedDryRun,
      generatedDrafts: 0,
      createdTemplates: 0,
      failedTemplates: 0,
      items: [],
    }

    for (const categoryItem of categoryItems) {
      const category = categoryItem.value
      const categoryDNA = categoryItem.dna || {
        coreIdentity: '',
        mustHave: [],
        mayUse: [],
        avoid: [],
      }

      let drafts = []

      try {
        console.log(`Generating drafts for category: ${category}`)
        console.log('CATEGORY DNA:', categoryDNA)

        drafts = await generateTemplateDrafts({
          category,
          categoryDNA,
          perCategory: normalizedPerCategory,
          referencePrompts,
          askModelForJson,
          sessionHistory,
        })

        console.log('\n================ AI DRAFTS GENERATED ================')
        console.log(`Category: ${category}`)
        console.log(`Drafts count: ${drafts.length}`)
        console.dir(drafts, { depth: null, colors: true })
        console.log('====================================================\n')
      } catch (error) {
        console.error('DRAFT GENERATION ERROR:')
        console.error('Category:', category)
        console.error(error)

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

          sessionHistory.push(buildSessionHistoryEntry(draft))

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
            title: normalizedTitle,
            category: normalizedCategory,
            styleNotes: String(draft?.styleNotes || '').trim(),
            tags: normalizedTags,
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

          await recalculateCategoryTemplatesCount(normalizedCategory)

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
            category: draft?.category || category,
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
