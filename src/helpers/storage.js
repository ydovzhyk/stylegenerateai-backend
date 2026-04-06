const { bucket } = require('../config/firebaseConfig')

function buildPublicUrl(bucketName, filePath) {
  return `https://storage.googleapis.com/${bucketName}/${encodeURI(filePath)}`
}

async function uploadBufferToStorage({
  buffer,
  folder = 'uploads',
  fileName,
  contentType = 'application/octet-stream',
  makePublic = true,
  cacheControl = 'public, max-age=31536000',
}) {
  if (!buffer) {
    throw new Error('File buffer is required')
  }

  if (!fileName) {
    throw new Error('fileName is required')
  }

  const normalizedFolder = String(folder || 'uploads')
    .trim()
    .replace(/^\/+|\/+$/g, '')

  const normalizedFileName = String(fileName).trim().replace(/^\/+/, '')
  const fullPath = `${normalizedFolder}/${normalizedFileName}`

  const file = bucket.file(fullPath)

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl,
    },
    validation: false,
  })

  if (makePublic) {
    await file.makePublic()
  }

  return {
    path: fullPath,
    fileName: normalizedFileName,
    url: buildPublicUrl(bucket.name, fullPath),
  }
}

async function deleteFileFromStorage(filePath) {
  if (!filePath) return false

  const normalizedPath = String(filePath).trim().replace(/^\/+/, '')
  if (!normalizedPath) return false

  const file = bucket.file(normalizedPath)

  await file.delete({ ignoreNotFound: true })
  return true
}

function getExtensionFromMime(mimeType = '') {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }

  return map[mimeType] || 'bin'
}

module.exports = {
  uploadBufferToStorage,
  deleteFileFromStorage,
  getExtensionFromMime,
}
