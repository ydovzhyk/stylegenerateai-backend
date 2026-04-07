const passport = require('passport')
const { Strategy } = require('passport-google-oauth2')
const bcrypt = require('bcryptjs')
const { nanoid } = require('nanoid')

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BASE_URL_HEROKU,
  NODE_ENV,
} = process.env

const { User } = require('../models/user.model')

const callbackURL =
  NODE_ENV === 'production'
    ? `${BASE_URL_HEROKU}/api/google/callback`
    : `http://localhost:4000/api/google/callback`

const googleParams = {
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL,
  passReqToCallback: true,
}

const googleCallback = async (
  req,
  accessToken,
  refreshToken,
  profile,
  done,
) => {
  try {
    const email = profile.email || profile.emails?.[0]?.value
    const givenName = profile.given_name || profile.name?.givenName
    const picture = profile.picture || profile.photos?.[0]?.value

    if (!email) {
      return done(new Error('Google account email is not available'), false)
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    let user = await User.findOne({ email: normalizedEmail })

    if (user) {
      if (!user.userAvatar && picture) {
        user.userAvatar = picture
        await user.save()
      }

      return done(null, user)
    }

    const passwordHash = await bcrypt.hash(nanoid(), 10)

    user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: givenName || 'Google User',
      userAvatar: picture || '',
    })

    return done(null, user)
  } catch (error) {
    return done(error, false)
  }
}

passport.use('google', new Strategy(googleParams, googleCallback))

module.exports = passport