const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/visitor.controller')
const validateBody = require('../middlewares/validateBody')
const { schemas } = require('../models/visitor.model')

const router = express.Router()

router.get('/init', ctrlWrapper(ctrl.initVisitor))

router.post(
  '/update',
  validateBody(schemas.updateVisitorSchema),
  ctrlWrapper(ctrl.updateVisitor),
)

module.exports = router
