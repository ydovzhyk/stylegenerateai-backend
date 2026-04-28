const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/auth.controller')
const passport = require('../middlewares/google-auth')

const router = express.Router()

router.get('/', (req, res, next) => {
  const { origin, visitorId } = req.query

  req.session.origin = origin
  req.session.visitorId = String(visitorId || '').trim()

  req.session.save((err) => {
    if (err) return next(err)

    return passport.authenticate('google', {
      scope: ['email', 'profile'],
    })(req, res, next)
  })
})

router.get(
  '/callback',
  passport.authenticate('google', { session: false }),
  ctrlWrapper(ctrl.googleAuthController),
)

module.exports = router
