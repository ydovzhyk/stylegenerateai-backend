const OpenAI = require('openai')
const RequestError = require('../../helpers/RequestError')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function buildSystemPrompt() {
  return `
You generate template metadata for an AI image prompt.

Your task:
1. Read the visual prompt.
2. Read the resolved category.
3. Suggest:
   - one concise template title
   - 4 to 6 short tags

TITLE RULES:
- 2 to 80 characters
- ideally 2 to 5 words
- concise
- clear
- reusable
- human-friendly
- memorable
- title must fit both the resolved category and the prompt
- title should sound like a real template name, not a sentence
- title should feel curated, not mechanically assembled
- prefer evocative but clear naming
- avoid vague poetry
- avoid generic titles like "Beautiful Portrait" or "Nice Photo"
- avoid overly technical titles like camera-setting descriptions
- avoid titles that simply repeat the category name unless truly necessary
- avoid titles that are just a literal concatenation of effect + subject + category
- prefer a distinctive name that still remains understandable and reusable

GOOD TITLE STYLE EXAMPLES:
- Stillness in Neon City
- City Stillness
- Storm Within
- Midnight Reverie
- Urban Drift
- Sketchlight Fashion
- Ocean Fade
- Dreamline Portrait
- Tribal Gaze
- Ocean Fade

BAD TITLE STYLE EXAMPLES:
- Beautiful Portrait
- Nice Photo
- Cinematic Portrait Image
- Seascape Double-Exposure Portrait
- Fashion Photo with Sketch Overlay Portrait
- Night Street Bokeh Portrait

TAG RULES:
- return 4 to 6 tags
- lowercase
- short
- useful for search and filtering
- no duplicates
- no full sentences
- no hashtags
- no filler tags like "beautiful", "nice", "cool", "photo", "image"
- avoid awkward or unnatural compound tags unless they are clearly useful and natural
- prefer clean searchable tags over clever wording
- each tag must be independently useful for filtering
- if a tag feels too specific, too artificial, or too descriptive of a single moment, replace it with a cleaner reusable alternative

TAG COVERAGE RULE:
Try to cover different dimensions of the prompt:
- 1 style tag
- 1 subject tag
- 1 environment or setting tag
- 1 lighting, mood, or atmosphere tag
- 1 visual effect, composition, or rendering tag
- 1 optional extra tag if useful

TAG RESTRICTIONS:
- avoid tags that describe camera interaction or viewing direction such as:
  - direct-gaze
  - looking-at-camera
  - eye-contact
- these are usually not good reusable search tags
- use "cinematic" only if the image clearly contains film-like scene construction, environment storytelling, or cinematic lighting/composition beyond a simple portrait
- do not use "cinematic" for every portrait automatically
- avoid compound tags unless they are natural and widely useful
- prefer:
  - "tattoo" instead of "tribal-tattoos"
  - "city" and "night" instead of "night-city" unless the compound is clearly better
  - "bokeh" instead of "neon-bokeh" unless the compound is truly necessary
- do not invent tags that sound logical but unnatural for real filtering systems

GOOD TAG EXAMPLES:
- cinematic
- portrait
- city
- night
- bokeh
- moody
- motion-blur
- editorial
- sketch
- photoreal
- surreal
- ocean
- double-exposure
- tattoo
- tribal
- close-up
- dramatic

BAD TAG EXAMPLES:
- beautiful
- cool
- amazing
- photo-image
- neon-bokeh
- emotional-beauty-shot
- direct-gaze
- looking-at-camera
- tribal-tattoos

OUTPUT RULES:
- Return JSON only
- Do not use markdown fences
- Do not add explanations

Return exactly:
{
  "suggestedTitle": "Template Title",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4"]
}
`
}

function buildUserPrompt({ prompt, category }) {
  return JSON.stringify(
    {
      task: 'Suggest template metadata',
      resolvedCategory: category,
      prompt,
      instructions: [
        'Generate one template title and 4 to 6 search-friendly tags.',
        'The title should sound like a curated template name, not a technical label.',
        'Do not simply combine effect, subject, and category into a literal title.',
        'Prefer a distinctive but still clear and reusable title.',
        'Keep tags clean, natural, and useful for filtering.',
        'Do not invent awkward compound tags unless truly necessary.',
        'Avoid fake semantic tags like direct-gaze or looking-at-camera.',
        'Use cinematic only when the prompt truly supports it.',
      ],
    },
    null,
    2,
  )
}

function stripCodeFences(text = '') {
  return String(text)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function normalizeString(value = '') {
  return String(value || '').trim()
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []

  const seen = new Set()

  return tags
    .map((item) =>
      String(item || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false
      seen.add(tag)
      return true
    })
    .slice(0, 6)
}

function normalizeMetadata(raw) {
  if (!raw || typeof raw !== 'object') return null

  return {
    suggestedTitle: normalizeString(raw.suggestedTitle),
    suggestedTags: normalizeTags(raw.suggestedTags),
  }
}

function validateMetadata(result) {
  if (!result || typeof result !== 'object') return false
  if (!result.suggestedTitle) return false
  if (result.suggestedTitle.length < 2 || result.suggestedTitle.length > 80)
    return false
  if (!Array.isArray(result.suggestedTags)) return false
  if (result.suggestedTags.length < 4 || result.suggestedTags.length > 6)
    return false

  return true
}

async function suggestTemplateMetadataFromPrompt({ prompt, category }) {
  const safePrompt = normalizeString(prompt)
  const safeCategory = normalizeString(category)

  if (!safePrompt) {
    throw RequestError(400, 'Prompt is required for metadata suggestion')
  }

  if (!safeCategory) {
    throw RequestError(
      400,
      'Resolved category is required for metadata suggestion',
    )
  }

  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: buildSystemPrompt(),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildUserPrompt({
                prompt: safePrompt,
                category: safeCategory,
              }),
            },
          ],
        },
      ],
    })

    const rawText = stripCodeFences(response.output_text || '')

    if (!rawText) {
      throw RequestError(500, 'Empty response from metadata suggester')
    }

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      throw RequestError(500, 'Metadata suggester returned invalid JSON')
    }

    const normalized = normalizeMetadata(parsed)

    if (!validateMetadata(normalized)) {
      throw RequestError(500, 'Metadata suggester returned invalid structure')
    }

    return normalized
  } catch (error) {
    if (error?.status && error?.message) {
      throw error
    }

    throw RequestError(500, 'Failed to suggest template metadata')
  }
}

module.exports = {
  suggestTemplateMetadataFromPrompt,
}
