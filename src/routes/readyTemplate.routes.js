const express = require('express')
const uploadImage = require('../middlewares/uploadImage')
const validateBody = require('../middlewares/validateBody')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const authorizeAdmin = require('../middlewares/authorizeAdmin')
const authorize = require('../middlewares/authorize')
const { createReadyTemplateSchema } = require('../models/readyTemplate.model')
const ctrl = require('../controllers/readyTemplate.controller')

const router = express.Router()

router.post(
  '/create',
  authorize,
  authorizeAdmin,
  uploadImage.single('preview'),
  validateBody(createReadyTemplateSchema),
  ctrlWrapper(ctrl.createReadyTemplate),
)

module.exports = router
