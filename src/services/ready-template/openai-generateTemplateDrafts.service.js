const VALID_PREVIEW_SOURCE_KEYS = [
  'man_front_color',
  'man_front_black',
  'man_profile_color',
  'man_profile_black',
  'woman_front_color',
  'woman_front_black',
  'woman_profile_color',
  'woman_profile_black',
]

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
      .map((item) =>
        String(item || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
      .slice(0, 10)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10)
  }

  return []
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function escapeJsonForPrompt(value) {
  return JSON.stringify(value, null, 2)
}

function scoreReferenceForCategory(reference, category) {
  const normalizedCategory = String(category || '')
    .trim()
    .toLowerCase()
  const refCategory = String(reference?.category || '')
    .trim()
    .toLowerCase()
  const title = String(reference?.title || '')
    .trim()
    .toLowerCase()
  const tags = Array.isArray(reference?.tags)
    ? reference.tags.map((tag) =>
        String(tag || '')
          .trim()
          .toLowerCase(),
      )
    : []
  const prompt = String(reference?.prompt || '')
    .trim()
    .toLowerCase()
  const styleNotes = String(reference?.styleNotes || '')
    .trim()
    .toLowerCase()

  let score = 0

  if (refCategory === normalizedCategory) score += 10
  if (title.includes(normalizedCategory)) score += 4
  if (tags.some((tag) => tag.includes(normalizedCategory))) score += 3
  if (prompt.includes(normalizedCategory)) score += 2
  if (styleNotes.includes(normalizedCategory)) score += 2

  return score
}

function selectReferenceExamples(referencePrompts = [], category, limit = 10) {
  const sorted = [...referencePrompts]
    .filter((item) => item?.useAsReference !== false)
    .sort(
      (a, b) =>
        scoreReferenceForCategory(b, category) -
        scoreReferenceForCategory(a, category),
    )

  const top = sorted.slice(0, limit)

  if (top.length >= Math.min(limit, 4)) return top

  return [...referencePrompts]
    .filter((item) => item?.useAsReference !== false)
    .slice(0, limit)
}

function buildSystemPrompt() {
  return [
    'You are a senior creative director, portrait photographer, fashion editor, concept artist, and prompt designer for a commercial AI portrait platform.',
    'Your task is to create highly professional template prompts for image generation.',
    'You must design prompts that are visually strong, commercially usable, category-consistent, and clearly different from one another.',
    'Do not copy the reference prompts verbatim.',
    'Do not repeat titles, adjective chains, composition patterns, or visual concepts unnecessarily.',
    'Do not include 4K, 8K, aspect ratio flags, model flags, version flags, or tool-specific suffixes.',
    'Do not reuse exact titles from reference examples',
    'Do not copy reference prompts sentence-by-sentence',
    'Keep prompts rich and descriptive, but clean and production-usable.',
    'Return valid JSON only.',
  ].join('\n')
}

function buildUserPrompt({
  category,
  perCategory,
  referenceExamples,
  allowedPreviewSourceKeys,
}) {
  return [
    `Generate ${perCategory} new ready-template drafts for the category: "${category}".`,
    '',
    'Goals:',
    '- Commercially attractive prompts',
    '- Strong visual variety inside one category',
    '- Distinct titles and distinct image concepts',
    '- Balanced composition, lighting, wardrobe/material cues, and emotional tone',
    '- Suitable for an AI portrait/transformation platform',
    '',
    'Rules:',
    '- Keep each draft clearly inside the requested category',
    '- Do not produce near-duplicates',
    '- Avoid repetitive phrasing across drafts',
    '- Prefer clean English titles',
    '- tags must be short, lowercase, and useful for search',
    '- previewSourceKey must be selected only from the allowed list',
    '- useInCreateYourLook should be true only for especially strong, visually clear, showcase-worthy prompts',
    '',
    'Allowed previewSourceKeys:',
    escapeJsonForPrompt(allowedPreviewSourceKeys),
    '',
    'Reference examples:',
    escapeJsonForPrompt(referenceExamples),
    '',
    'Return JSON with exactly this shape:',
    escapeJsonForPrompt({
      items: [
        {
          title: 'string',
          slug: 'string',
          category: category,
          tags: ['string', 'string', 'string'],
          basePrompt: 'string',
          previewSourceKey: 'string',
          useInCreateYourLook: true,
          styleNotes: 'string',
        },
      ],
    }),
    '',
    'Important:',
    '- slug must match the title meaningfully',
    '- basePrompt must be detailed, image-generation ready, and professionally written',
    '- do not include markdown',
    '- do not include commentary outside JSON',
  ].join('\n')
}

function sanitizeDraft(rawDraft, fallbackCategory) {
  const title = String(rawDraft?.title || '').trim()
  const slug = normalizeSlug(rawDraft?.slug || title)
  const category = String(fallbackCategory || '').trim()
  const tags = normalizeTags(rawDraft?.tags)
  const basePrompt = String(rawDraft?.basePrompt || '').trim()
  const previewSourceKey = VALID_PREVIEW_SOURCE_KEYS.includes(
    String(rawDraft?.previewSourceKey || '').trim(),
  )
    ? String(rawDraft.previewSourceKey).trim()
    : 'man_front_color'
  const useInCreateYourLook = normalizeBoolean(
    rawDraft?.useInCreateYourLook,
    false,
  )
  const styleNotes = String(rawDraft?.styleNotes || '').trim()

  if (!title) {
    throw new Error('Draft title is required')
  }

  if (!slug) {
    throw new Error(`Draft slug is invalid for title: ${title}`)
  }

  if (!category) {
    throw new Error(`Draft category is required for title: ${title}`)
  }

  if (!basePrompt || basePrompt.length < 20) {
    throw new Error(`Draft basePrompt is too short for title: ${title}`)
  }

  return {
    title,
    slug,
    category,
    tags,
    basePrompt,
    previewSourceKey,
    useInCreateYourLook,
    styleNotes,
  }
}

function validateUniqueDrafts(drafts = []) {
  const seenTitles = new Set()
  const seenSlugs = new Set()

  for (const draft of drafts) {
    const normalizedTitle = String(draft.title || '')
      .trim()
      .toLowerCase()
    const normalizedSlug = String(draft.slug || '')
      .trim()
      .toLowerCase()

    if (seenTitles.has(normalizedTitle)) {
      throw new Error(`Duplicate generated title: ${draft.title}`)
    }

    if (seenSlugs.has(normalizedSlug)) {
      throw new Error(`Duplicate generated slug: ${draft.slug}`)
    }

    seenTitles.add(normalizedTitle)
    seenSlugs.add(normalizedSlug)
  }
}

/**
 * `askModelForJson` should be a function you plug in from your OpenAI layer.
 *
 * Expected signature:
 *   async function askModelForJson({ systemPrompt, userPrompt }) => parsedJson
 */
async function generateTemplateDrafts({
  category,
  perCategory = 2,
  referencePrompts = [],
  askModelForJson,
  allowedPreviewSourceKeys = VALID_PREVIEW_SOURCE_KEYS,
}) {
  if (!category) {
    throw new Error('category is required')
  }

  if (!Number.isInteger(perCategory) || perCategory < 1) {
    throw new Error('perCategory must be a positive integer')
  }

  if (typeof askModelForJson !== 'function') {
    throw new Error('askModelForJson function is required')
  }

  const referenceExamples = selectReferenceExamples(
    referencePrompts,
    category,
    10,
  )

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt({
    category,
    perCategory,
    referenceExamples,
    allowedPreviewSourceKeys,
  })

  const parsed = await askModelForJson({
    systemPrompt,
    userPrompt,
  })

  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('Model did not return a valid items array')
  }

  const drafts = parsed.items.map((item) => sanitizeDraft(item, category))

  if (drafts.length !== perCategory) {
    throw new Error(`Expected ${perCategory} drafts, received ${drafts.length}`)
  }

  validateUniqueDrafts(drafts)

  return drafts
}

module.exports = {
  generateTemplateDrafts,
  VALID_PREVIEW_SOURCE_KEYS,
}
