const express = require('express')
const uploadImage = require('../middlewares/uploadImage')
const validateBody = require('../middlewares/validateBody')
const validateQuery = require('../middlewares/validateQuery')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const authorizeAdmin = require('../middlewares/authorizeAdmin')
const authorizeOptional = require('../middlewares/authorizeOptional')
const authorize = require('../middlewares/authorize')
const {
  createReadyTemplateSchema,
  generateReadyTemplatePreviewSchema,
  getYourLookSearchSchema,
  generateYourLookClientImageSchema,
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
  '/resolve-prompt-metadata',
  authorize,
  authorizeAdmin,
  validateBody(schemasCategory.getCategorySchema),
  ctrlWrapper(ctrl.resolvePromptMetadata),
)

router.get(
  '/categories',
  ctrlWrapper(ctrl.getCategories),
)

router.get(
  '/get-your-look-preview',
  ctrlWrapper(ctrl.getYourLookPreview),
)

router.get(
  '/get-your-look-search',
  validateQuery(getYourLookSearchSchema),
  ctrlWrapper(ctrl.getYourLookSearch),
)

router.post(
  '/generate-your-look',
  authorizeOptional,
  uploadImage.single('photo'),
  validateBody(generateYourLookClientImageSchema),
  ctrlWrapper(ctrl.generateYourLookClientImage),
)

module.exports = router
