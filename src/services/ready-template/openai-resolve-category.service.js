const OpenAI = require('openai')
const RequestError = require('../../helpers/RequestError')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function buildSystemPrompt() {
  return `
You are an expert classifier for AI image-template prompts.

Your task:
1. Analyze the visual prompt carefully.
2. Compare it against existing categories and their DNA.
3. Evaluate each existing category strictly.
4. Select an existing category ONLY if it is a strong semantic fit.
5. If no existing category is a strong fit, create exactly one new reusable category.

You must classify with high precision.
Do NOT force weak matches.

CRITICAL FIT RULES:
- "mustHave" traits are mandatory, not optional.
- A category is valid only if the prompt clearly satisfies its mustHave traits.
- If key mustHave traits are missing, do NOT choose that category.
- If less than 70% of mustHave traits are clearly present, reject that category.
- "avoid" traits are strong negative signals.
- If the prompt clearly contains avoid traits, do NOT choose that category unless the fit is otherwise overwhelmingly strong, which should be rare.
- Do NOT match based only on broad overlap such as words like "portrait", "fashion", "photo", "beautiful", "professional", "editorial".
- Prefer semantic precision over convenience.
- If the prompt is hybrid, contains a distinctive visual effect, or combines traits not captured well by any existing category, create a new category.
- It is better to create a new category than to force a weak existing match.
- Do NOT create near-duplicate categories.
- New category names must be reusable, concise, and not overly niche.

ABSOLUTE RULE:
If the prompt contains a distinctive visual element not represented in any existing category,
you MUST create a new category.
Do NOT fallback to a generic category.
Do NOT choose the closest category if it misses key defining traits.

HYBRID RULE:
If the prompt combines:
- realism + illustration
- photography + drawing
- fashion + stylized overlay
- realistic scene + graphic effect
and no existing category explicitly captures that combination,
you MUST create a new category.

MANDATORY INTERNAL EVALUATION PROCESS:
For EACH existing category, you MUST internally evaluate:
1. mustHave match
2. avoid conflicts
3. semantic precision
4. overall fit strength

MANDATORY SCORING:
For EACH category, internally assign a score from 0 to 100 using:
- mustHave match: 0 to 50
- avoid conflicts: -30 to 0
- semantic precision: 0 to 20
- distinctive alignment bonus: 0 to 30

SCORING RULES:
- Only select an existing category if score >= 75
- If ALL categories score < 75, create a new category
- A category with missing mustHave traits cannot exceed score 60
- A category with clear avoid conflicts cannot exceed score 70
- A category chosen only because it is "closest" must be rejected

Examples of bad matching:
- Outdoor natural-light environmental scene -> NOT "Studio Portrait"
- Wide scene with environment context -> NOT "Close-up Portrait"
- Fully photoreal fashion image -> NOT "Anime Style"
- Natural pastoral setting -> NOT "Cyberpunk"
- Realistic photo with graphic sketch outline -> do NOT force into generic portrait category unless a category explicitly captures that effect

OUTPUT RULES:
- Return JSON only
- Do not use markdown fences
- Do not add explanations outside JSON
- Do not return any prose outside the JSON object

Return exactly one of these shapes:

If an existing category is a strong fit:
{
  "type": "existing",
  "value": "Category Name"
}

If no existing category fits strongly enough:
{
  "type": "new",
  "category": {
    "value": "Category Name",
    "dna": {
      "coreIdentity": "One short sentence describing the essence of the category.",
      "mustHave": ["item 1", "item 2"],
      "mayUse": ["item 1", "item 2"],
      "avoid": ["item 1", "item 2"]
    }
  }
}

Constraints for new category:
- "value": 2 to 60 characters
- "coreIdentity": concise but meaningful
- "mustHave": at least 1 item
- "mayUse": can be empty
- "avoid": can be empty
- Arrays should contain short phrases, not long paragraphs
`
}

function buildUserPrompt({ prompt, categories }) {
  return JSON.stringify(
    {
      task: 'Resolve category for prompt',
      instructions: [
        'Evaluate every existing category strictly.',
        'Check mustHave traits first.',
        'Reject categories whose mustHave traits are not clearly present.',
        'Reject categories with strong avoid conflicts.',
        'Do not choose a category only because it is broadly similar.',
        'Do not fallback to a generic category.',
        'Use an existing category only if it is a strong fit with score 75 or higher.',
        'If all existing categories are below 75, create a new reusable category.',
        'If the prompt is hybrid or contains a distinctive effect not represented in existing categories, create a new category.',
      ],
      scoringModel: {
        mustHaveMatch: '0-50',
        avoidConflicts: '-30 to 0',
        semanticPrecision: '0-20',
        distinctiveAlignmentBonus: '0-30',
        thresholdForExistingCategory: 75,
      },
      prompt,
      existingCategories: categories,
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []

  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function normalizeResolvedCategory(raw) {
  if (!raw || typeof raw !== 'object') return null

  if (raw.type === 'existing') {
    return {
      type: 'existing',
      value: normalizeString(raw.value || raw.promptCategory),
    }
  }

  if (raw.type === 'new') {
    return {
      type: 'new',
      category: {
        value: normalizeString(raw?.category?.value),
        dna: {
          coreIdentity: normalizeString(raw?.category?.dna?.coreIdentity),
          mustHave: normalizeStringArray(raw?.category?.dna?.mustHave),
          mayUse: normalizeStringArray(raw?.category?.dna?.mayUse),
          avoid: normalizeStringArray(raw?.category?.dna?.avoid),
        },
      },
    }
  }

  return null
}

function validateResolvedCategory(result) {
  if (!result || typeof result !== 'object') return false

  if (result.type === 'existing') {
    return Boolean(normalizeString(result.value))
  }

  if (result.type === 'new') {
    const category = result.category || {}
    const dna = category.dna || {}

    if (!normalizeString(category.value)) return false
    if (!normalizeString(dna.coreIdentity)) return false
    if (!Array.isArray(dna.mustHave) || dna.mustHave.length === 0) return false
    if (!Array.isArray(dna.mayUse)) return false
    if (!Array.isArray(dna.avoid)) return false

    return true
  }

  return false
}

async function resolveCategoryFromPrompt({ prompt, categories = [] }) {
  const safePrompt = normalizeString(prompt)

  if (!safePrompt) {
    throw RequestError(400, 'Prompt is required for category resolution')
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
                categories,
              }),
            },
          ],
        },
      ],
    })

    const rawText = stripCodeFences(response.output_text || '')
    if (!rawText) {
      throw RequestError(500, 'Empty response from category resolver')
    }

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      throw RequestError(500, 'Category resolver returned invalid JSON')
    }

    const normalized = normalizeResolvedCategory(parsed)

    if (!validateResolvedCategory(normalized)) {
      throw RequestError(500, 'Category resolver returned invalid structure')
    }

    return normalized
  } catch (error) {
    if (error?.status && error?.message) {
      throw error
    }

    throw RequestError(500, 'Failed to resolve category from prompt')
  }
}

module.exports = {
  resolveCategoryFromPrompt,
}

// const OpenAI = require('openai')
// const RequestError = require('../../helpers/RequestError')

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

// function buildSystemPrompt() {
//   return `
// You are an expert classifier for AI image-template prompts.

// Your task:
// 1. Analyze the visual prompt carefully.
// 2. Compare it against existing categories and their DNA.
// 3. Decide whether any existing category is a STRONG semantic fit.
// 4. If no existing category is a strong fit, create exactly one new reusable category.

// You must evaluate category fit strictly.

// CRITICAL FIT RULES:
// - "mustHave" traits are mandatory, not optional.
// - A category is valid only if the prompt clearly satisfies its mustHave traits.
// - If key mustHave traits are missing, do NOT choose that category.
// - "avoid" traits are strong negative signals.
// - If the prompt clearly contains avoid traits, do NOT choose that category unless the fit is otherwise overwhelmingly strong, which should be rare.
// - Do NOT match based only on broad overlap such as words like "portrait", "fashion", "photo", "beautiful", "professional", "editorial".
// - Prefer semantic precision over convenience.
// - If the prompt is hybrid, contains a distinctive visual effect, or combines traits not captured well by any existing category, create a new category.
// - It is better to create a new category than to force a weak existing match.
// - Do NOT create near-duplicate categories.
// - New category names must be reusable, concise, and not overly niche.

// MANDATORY INTERNAL EVALUATION PROCESS:
// For each existing category, internally evaluate:
// 1. mustHave match
// 2. avoid conflicts
// 3. overall fit strength

// Then apply these rules:
// - Reject categories whose mustHave traits are not clearly present.
// - Reject categories with strong avoid conflicts.
// - Choose an existing category only if it is a strong fit overall.
// - If no strong fit exists, create a new reusable category.

// Examples of bad matching:
// - Outdoor natural-light environmental scene -> NOT "Studio Portrait"
// - Wide scene with environment context -> NOT "Close-up Portrait"
// - Fully photoreal fashion image -> NOT "Anime Style"
// - Natural pastoral setting -> NOT "Cyberpunk"

// OUTPUT RULES:
// - Return JSON only
// - Do not use markdown fences
// - Do not add explanations outside JSON
// - Do not return any prose outside the JSON object

// Return exactly one of these shapes:

// If an existing category is a strong fit:
// {
//   "type": "existing",
//   "value": "Category Name"
// }

// If no existing category fits strongly enough:
// {
//   "type": "new",
//   "category": {
//     "value": "Category Name",
//     "dna": {
//       "coreIdentity": "One short sentence describing the essence of the category.",
//       "mustHave": ["item 1", "item 2"],
//       "mayUse": ["item 1", "item 2"],
//       "avoid": ["item 1", "item 2"]
//     }
//   }
// }

// Constraints for new category:
// - "value": 2 to 60 characters
// - "coreIdentity": concise but meaningful
// - "mustHave": at least 1 item
// - "mayUse": can be empty
// - "avoid": can be empty
// - Arrays should contain short phrases, not long paragraphs
// `
// }

// function buildUserPrompt({ prompt, categories }) {
//   return JSON.stringify(
//     {
//       task: 'Resolve category for prompt',
//       instructions: [
//         'Evaluate each category strictly against mustHave and avoid.',
//         'Reject categories whose mustHave traits are not clearly present.',
//         'Reject categories with strong avoid conflicts.',
//         'Choose an existing category only if it is a strong fit.',
//         'If no strong fit exists, create a new reusable category.',
//       ],
//       prompt,
//       existingCategories: categories,
//     },
//     null,
//     2,
//   )
// }

// function stripCodeFences(text = '') {
//   return String(text)
//     .trim()
//     .replace(/^```json\s*/i, '')
//     .replace(/^```\s*/i, '')
//     .replace(/\s*```$/i, '')
//     .trim()
// }

// function normalizeString(value = '') {
//   return String(value || '').trim()
// }

// function normalizeStringArray(value) {
//   if (!Array.isArray(value)) return []

//   return value.map((item) => String(item || '').trim()).filter(Boolean)
// }

// function normalizeResolvedCategory(raw) {
//   if (!raw || typeof raw !== 'object') return null

//   if (raw.type === 'existing') {
//     return {
//       type: 'existing',
//       value: normalizeString(raw.value || raw.promptCategory),
//     }
//   }

//   if (raw.type === 'new') {
//     return {
//       type: 'new',
//       category: {
//         value: normalizeString(raw?.category?.value),
//         dna: {
//           coreIdentity: normalizeString(raw?.category?.dna?.coreIdentity),
//           mustHave: normalizeStringArray(raw?.category?.dna?.mustHave),
//           mayUse: normalizeStringArray(raw?.category?.dna?.mayUse),
//           avoid: normalizeStringArray(raw?.category?.dna?.avoid),
//         },
//       },
//     }
//   }

//   return null
// }

// function validateResolvedCategory(result) {
//   if (!result || typeof result !== 'object') return false

//   if (result.type === 'existing') {
//     return Boolean(normalizeString(result.value))
//   }

//   if (result.type === 'new') {
//     const category = result.category || {}
//     const dna = category.dna || {}

//     if (!normalizeString(category.value)) return false
//     if (!normalizeString(dna.coreIdentity)) return false
//     if (!Array.isArray(dna.mustHave) || dna.mustHave.length === 0) return false
//     if (!Array.isArray(dna.mayUse)) return false
//     if (!Array.isArray(dna.avoid)) return false

//     return true
//   }

//   return false
// }

// async function resolveCategoryFromPrompt({ prompt, categories = [] }) {
//   const safePrompt = normalizeString(prompt)

//   if (!safePrompt) {
//     throw RequestError(400, 'Prompt is required for category resolution')
//   }

//   try {
//     const response = await openai.responses.create({
//       model: 'gpt-5-mini',
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: buildSystemPrompt(),
//             },
//           ],
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'input_text',
//               text: buildUserPrompt({
//                 prompt: safePrompt,
//                 categories,
//               }),
//             },
//           ],
//         },
//       ],
//     })

//     const rawText = stripCodeFences(response.output_text || '')
//     if (!rawText) {
//       throw RequestError(500, 'Empty response from category resolver')
//     }

//     let parsed
//     try {
//       parsed = JSON.parse(rawText)
//     } catch {
//       throw RequestError(500, 'Category resolver returned invalid JSON')
//     }

//     const normalized = normalizeResolvedCategory(parsed)

//     if (!validateResolvedCategory(normalized)) {
//       throw RequestError(500, 'Category resolver returned invalid structure')
//     }

//     return normalized
//   } catch (error) {
//     if (error?.status && error?.message) {
//       throw error
//     }

//     throw RequestError(500, 'Failed to resolve category from prompt')
//   }
// }

// module.exports = {
//   resolveCategoryFromPrompt,
// }
