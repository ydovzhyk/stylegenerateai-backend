const multer = require('multer')
const RequestError = require('../helpers/RequestError')

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(RequestError(400, 'Only JPG, PNG, and WEBP images are allowed'))
  }

  cb(null, true)
}

const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

module.exports = uploadImage
