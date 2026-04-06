const { uploadBufferToStorage, getExtensionFromMime } = require('./storage')

async function saveUserAvatar({ buffer, userId, mimeType }) {
  const ext = getExtensionFromMime(mimeType)
  const safeUserId = String(userId || Date.now()).trim()
  const fileName = `avatar-${safeUserId}-${Date.now()}.${ext}`

  return uploadBufferToStorage({
    buffer,
    folder: 'users/avatars',
    fileName,
    contentType: mimeType,
  })
}

module.exports = { saveUserAvatar }
