const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const authorizeOptional = require('../middlewares/authorizeOptional')
const ctrl = require('../controllers/generationUsage.controller')

const router = express.Router()

router.get('/', authorizeOptional, ctrlWrapper(ctrl.getGenerationUsage))

module.exports = router
