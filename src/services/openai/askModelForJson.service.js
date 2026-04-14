const OpenAI = require('openai')

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function askModelForJson({ systemPrompt, userPrompt }) {
  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL,
    input: [
      {
        role: 'developer',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: userPrompt }],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'template_drafts_response',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string' },
                  slug: { type: 'string' },
                  category: { type: 'string' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  basePrompt: { type: 'string' },
                  previewSourceKey: { type: 'string' },
                  useInCreateYourLook: { type: 'boolean' },
                  styleNotes: { type: 'string' },
                },
                required: [
                  'title',
                  'slug',
                  'category',
                  'tags',
                  'basePrompt',
                  'previewSourceKey',
                  'useInCreateYourLook',
                  'styleNotes',
                ],
              },
            },
          },
          required: ['items'],
        },
      },
    },
  })

  const outputText =
    response.output_text || response.output?.[0]?.content?.[0]?.text || ''

  if (!outputText) {
    throw new Error('Model returned empty output')
  }

  try {
    return JSON.parse(outputText)
  } catch (error) {
    throw new Error(`Failed to parse model JSON output: ${error.message}`)
  }
}

module.exports = {
  askModelForJson,
}
