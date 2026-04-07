const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/auth.controller')
const passport = require('../middlewares/google-auth')
const router = express.Router()

const rememberOrigin = (req, res, next) => {
  const { origin } = req.query
  if (origin) req.session.origin = origin
  next()
}

router.get(
  '/',
  rememberOrigin,
  passport.authenticate('google', { scope: ['email', 'profile'] }),
)

router.get(
  '/callback',
  passport.authenticate('google', { session: false }),
  ctrlWrapper(ctrl.googleAuthController),
)

module.exports = router
