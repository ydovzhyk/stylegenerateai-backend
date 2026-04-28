const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/visitor.controller')

const router = express.Router()

router.get('/init', ctrlWrapper(ctrl.initVisitor))

module.exports = router
