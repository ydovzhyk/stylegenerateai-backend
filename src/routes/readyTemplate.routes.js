const express = require('express')
const uploadImage = require('../middlewares/uploadImage')
const validateBody = require('../middlewares/validateBody')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const authorizeAdmin = require('../middlewares/authorizeAdmin')
const authorize = require('../middlewares/authorize')
const {
  createReadyTemplateSchema,
  generateReadyTemplatePreviewSchema,
} = require('../models/readyTemplate.model')
const { schemasCategory } = require('../models/category.model')
const ctrl = require('../controllers/readyTemplate.controller')

const router = express.Router()

router.post(
  '/generate-preview',
  authorize,
  authorizeAdmin,
  uploadImage.single('sourceImage'),
  validateBody(generateReadyTemplatePreviewSchema),
  ctrlWrapper(ctrl.generateReadyTemplatePreview),
)

router.post(
  '/create',
  authorize,
  authorizeAdmin,
  uploadImage.single('preview'),
  validateBody(createReadyTemplateSchema),
  ctrlWrapper(ctrl.createReadyTemplate),
)

router.post(
  '/get-category',
  authorize,
  authorizeAdmin,
  validateBody(schemasCategory.getCategorySchema),
  ctrlWrapper(ctrl.getCategory),
)

router.get(
  '/categories',
  authorize,
  authorizeAdmin,
  ctrlWrapper(ctrl.getCategories),
)

module.exports = router
