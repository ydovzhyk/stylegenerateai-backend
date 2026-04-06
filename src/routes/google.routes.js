const express = require('express')

const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/auth.controller')
const passport = require('../middlewares/google-auth')

const router = express.Router()

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean)

const rememberOrigin = (req, res, next) => {
  const { origin } = req.query

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    req.session.origin = origin
  }

  next()
}

router.get(
  '/',
  rememberOrigin,
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false,
  }),
)

router.get(
  '/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/google/failure',
  }),
  ctrlWrapper(ctrl.googleAuthController),
)

router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Google authentication failed' })
})

module.exports = router
