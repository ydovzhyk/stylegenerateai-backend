const express = require('express')
const ctrlWrapper = require('../helpers/ctrlWrapper')
const ctrl = require('../controllers/auth.controller')
const passport = require('../middlewares/google-auth')

const router = express.Router()

router.get('/', (req, res, next) => {
  const { origin } = req.query
  console.log('Received origin:', origin)
  console.log('Session ID before save:', req.sessionID)

  req.session.origin = origin

  req.session.save((err) => {
    if (err) return next(err)

    console.log('Session saved. Session ID:', req.sessionID)
    console.log('Session after save:', req.session)

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
