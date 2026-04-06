const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function buildPrompt({ style, prompt }) {
  return [
    'Transform the uploaded photo into a high-quality artistic painting.',
    `Style: ${style}.`,
    'Preserve the main subject and overall recognizability.',
    'Make the result aesthetically pleasing, print-worthy, detailed, and clean.',
    'Avoid distortions, extra limbs, malformed hands, blurred facial features, and messy artifacts.',
    prompt ? `Additional user instructions: ${prompt}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

async function generatePaintingFromPhoto({ buffer, mimeType, style, prompt }) {
  const promptUsed = buildPrompt({ style, prompt })

  const base64Image = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: promptUsed },
          {
            type: 'input_image',
            image_url: dataUrl,
          },
        ],
      },
    ],
  })

  return {
    image: null,
    promptUsed,
    raw: response,
  }
}

module.exports = {
  generatePaintingFromPhoto,
}
