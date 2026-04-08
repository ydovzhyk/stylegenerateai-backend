const passport = require('passport')
const { Strategy } = require('passport-google-oauth2')
const bcrypt = require('bcrypt')
const shortid = require('shortid')

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL_HEROKU } = process.env

const { User } = require('../models/user.model')

const isProd =
  process.env.NODE_ENV === 'production' || Boolean(process.env.DYNO)

const callbackURL = isProd
  ? `${BASE_URL_HEROKU}/api/google/callback`
  : 'http://localhost:4000/api/google/callback'

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
    const date = new Date()
    const today = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    const { email, given_name, picture } = profile

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return done(null, existingUser)
    }

    const passwordHash = await bcrypt.hash(shortid.generate(), 10)

    const newUser = await User.create({
      email,
      passwordHash,
      username: given_name,
      userAvatar: picture,
      dateCreate: today,
    })

    return done(null, newUser)
  } catch (error) {
    done(error, false)
  }
}

passport.use('google', new Strategy(googleParams, googleCallback))

module.exports = passport
