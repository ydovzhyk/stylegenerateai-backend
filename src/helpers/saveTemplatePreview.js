const { uploadBufferToStorage, getExtensionFromMime } = require('./storage')

async function saveTemplatePreview({ buffer, slug, mimeType }) {
  const ext = getExtensionFromMime(mimeType)
  const safeSlug = String(slug || Date.now())
    .trim()
    .toLowerCase()
  const fileName = `${safeSlug}-${Date.now()}.${ext}`

  return uploadBufferToStorage({
    buffer,
    folder: 'templates/previews',
    fileName,
    contentType: mimeType,
  })
}

module.exports = { saveTemplatePreview }
