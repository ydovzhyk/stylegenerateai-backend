const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const validateBody = require('../middlewares/validateBody')
const authorizeAdmin = require('../middlewares/authorizeAdmin')
const authorize = require('../middlewares/authorize')
const {
  autogenerateReadyTemplatesSchema,
} = require('../models/readyTemplate.model')
const ctrl = require('../controllers/autogenerateReadyTemplates.controller')

const router = express.Router()

router.post(
  '/ready-templates',
  authorize,
  authorizeAdmin,
  validateBody(autogenerateReadyTemplatesSchema),
  ctrlWrapper(ctrl.autogenerateReadyTemplatesController),
)

module.exports = router
