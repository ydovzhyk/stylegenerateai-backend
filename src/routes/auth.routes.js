const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/auth.controller')
const validateBody = require('../middlewares/validateBody')
const authorize = require('../middlewares/authorize')
const authorizeOptional = require('../middlewares/authorizeOptional')
const authenticateRefresh = require('../middlewares/authenticateRefresh')
const uploadImage = require('../middlewares/uploadImage')
const { schemas } = require('../models/user.model')
const router = express.Router()

// Register user
router.post(
  '/register',
  validateBody(schemas.registerSchema),
  ctrlWrapper(ctrl.register),
)

// Login user
router.post(
  '/login',
  validateBody(schemas.loginSchema),
  ctrlWrapper(ctrl.login),
)

// Logout user
router.post('/logout', ctrlWrapper(ctrl.logout))

// Refresh user
router.post('/refresh', authenticateRefresh, ctrlWrapper(ctrl.refresh))

// Get current user
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
}

router.get(
  '/current',
  noStore,
  authorizeOptional,
  ctrlWrapper(ctrl.getUserController),
)

// Edit user
router.put(
  '/edit',
  authorize,
  uploadImage.single('avatar'),
  validateBody(schemas.editUserSchema),
  ctrlWrapper(ctrl.editUserController),
)

// Update user
router.post(
  '/update',
  authorize,
  validateBody(schemas.updateUserSchema),
  ctrlWrapper(ctrl.updateUserController),
)

// Delete user
router.delete(
  '/delete/:userId',
  authorize,
  ctrlWrapper(ctrl.deleteUserController),
)

router.post(
  '/forgot-password',
  validateBody(schemas.forgotPasswordSchema),
  ctrlWrapper(ctrl.forgotPasswordController),
)

router.post(
  '/reset-password',
  validateBody(schemas.resetPasswordSchema),
  ctrlWrapper(ctrl.resetPasswordController),
)

module.exports = router
