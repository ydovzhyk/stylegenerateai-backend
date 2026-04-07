const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { User } = require('../models/user.model')
const { SECRET_KEY, REFRESH_SECRET_KEY } = process.env
const RequestError = require('../helpers/RequestError')
const { saveUserAvatar } = require('../helpers/saveUserAvatar')
const crypto = require('crypto')
const sendPasswordResetEmail = require('../helpers/sendPasswordResetEmail')

const isProd = process.env.NODE_ENV === 'production'

const COOKIE_BASE = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
}

const ACCESS_TTL_MS = 2 * 60 * 1000 // 2m
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000 // 24h

const msToJwt = (ms) => `${Math.floor(ms / 1000)}s`

const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_BASE,
  maxAge: ACCESS_TTL_MS,
}

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_BASE,
  maxAge: REFRESH_TTL_MS,
}

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS)
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)
  }
}

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', COOKIE_BASE)
  res.clearCookie('refreshToken', COOKIE_BASE)
}

const signTokens = (userId, { refresh = true } = {}) => {
  const payload = { id: userId.toString() }

  const accessToken = jwt.sign(payload, SECRET_KEY, {
    expiresIn: msToJwt(ACCESS_TTL_MS),
  })

  if (!refresh) return { accessToken }

  const refreshToken = jwt.sign(payload, REFRESH_SECRET_KEY, {
    expiresIn: msToJwt(REFRESH_TTL_MS),
  })

  return { accessToken, refreshToken }
}

// USER RESPONSE SHAPE
const serializeUser = (user) => {
  if (!user) return null

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    userAvatar: user.userAvatar,
    role: user.role,
    likedImages: user.likedImages || [],
    savedImages: user.savedImages || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

// REGISTER NEW USER
const register = async (req, res, next) => {
  try {
    const { name, email, password, userAvatar } = req.body

    const exists = await User.findOne({ email })
    if (exists) throw RequestError(409, 'Email in use')

    const passwordHash = await bcrypt.hash(password, 10)

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      userAvatar,
      role: 'user',
    })

    const { accessToken, refreshToken } = signTokens(newUser._id)
    setAuthCookies(res, { accessToken, refreshToken })

    return res.status(201).json({ user: serializeUser(newUser) })
  } catch (e) {
    next(e)
  }
}

// LOGIN EXISTING USER
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) throw RequestError(400, 'Invalid email or password')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw RequestError(400, 'Invalid email or password')

    const { accessToken, refreshToken } = signTokens(user._id)
    setAuthCookies(res, { accessToken, refreshToken })

    return res.status(200).json({ user: serializeUser(user) })
  } catch (e) {
    next(e)
  }
}

// REFRESH ACCESS TOKEN
const refresh = async (req, res, next) => {
  try {
    const user = req.user
    const { accessToken } = signTokens(user._id, { refresh: false })

    setAuthCookies(res, { accessToken })
    return res.status(200).json({ ok: true })
  } catch (e) {
    next(e)
  }
}

// LOGOUT USER
const logout = async (req, res, next) => {
  try {
    clearAuthCookies(res)
    return res.status(204).end()
  } catch (e) {
    next(e)
  }
}

// CURRENT USER
const getUserController = async (req, res, next) => {
  try {
    if (
      !req.user &&
      (req.authError === 'expired' || req.authError === 'missing')
    ) {
      return res
        .status(401)
        .json({ code: 'ACCESS_NEED_REFRESH', message: 'Unauthorized' })
    }

    return res.status(200).json({
      user: req.user ? serializeUser(req.user) : null,
    })
  } catch (e) {
    next(e)
  }
}

// EDIT USER
const editUserController = async (req, res, next) => {
  try {
    const { _id } = req.user
    const {
      name,
      currentPassword = '',
      newPassword = '',
      confirmNewPassword = '',
    } = req.body

    const updatedUserData = {}

    if (typeof name !== 'undefined') {
      updatedUserData.name = String(name).trim()
    }

    if (req.file) {
      const uploadedAvatar = await saveUserAvatar({
        buffer: req.file.buffer,
        userId: _id,
        mimeType: req.file.mimetype,
      })

      updatedUserData.userAvatar = uploadedAvatar.url
    }

    const wantsPasswordChange =
      String(currentPassword).trim() ||
      String(newPassword).trim() ||
      String(confirmNewPassword).trim()

    if (wantsPasswordChange) {
      const ok = await bcrypt.compare(currentPassword, req.user.passwordHash)
      if (!ok) {
        throw RequestError(400, 'Current password is incorrect')
      }

      updatedUserData.passwordHash = await bcrypt.hash(newPassword, 10)
    }

    const user = await User.findOneAndUpdate({ _id }, updatedUserData, {
      new: true,
      runValidators: true,
    })

    return res.status(200).json({
      user: serializeUser(user),
      message: 'Profile updated successfully',
    })
  } catch (e) {
    next(e)
  }
}

// UPDATE USER
const updateUserController = async (req, res) => {
  const userId = req.user?._id
  if (!userId) throw RequestError(401, 'Unauthorized')
}

// DELETE USER
const deleteUserController = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await User.deleteOne({ _id: userId })
    clearAuthCookies(res)
    return res.status(204).end()
  } catch (e) {
    next(e)
  }
}

// GOOGLE AUTH
const googleAuthController = async (req, res, next) => {
  try {
    const origin = req.session.origin
    const { accessToken, refreshToken } = signTokens(req.user._id)
    setAuthCookies(res, { accessToken, refreshToken })

    console.log('Origin from session:', origin)
    return res.redirect(origin)
  } catch (error) {
    next(error)
  }
}

const forgotPasswordController = async (req, res, next) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(200).json({
        message: 'Check your email and follow the password reset instructions.',
      })
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex')

    user.passwordResetToken = hashedToken
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000)

    await user.save()

    try {
      await sendPasswordResetEmail({
        email: user.email,
        token: rawToken,
      })
    } catch (error) {
      user.passwordResetToken = null
      user.passwordResetExpires = null
      await user.save()
      throw error
    }

    return res.status(200).json({
      message: 'Check your email and follow the password reset instructions.',
    })
  } catch (e) {
    next(e)
  }
}

const resetPasswordController = async (req, res, next) => {
  try {
    const { token, password } = req.body

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      throw RequestError(400, 'Reset link is invalid or has expired')
    }

    user.passwordHash = await bcrypt.hash(password, 10)
    user.passwordResetToken = null
    user.passwordResetExpires = null

    await user.save()

    clearAuthCookies(res)

    return res.status(200).json({
      message: 'Password has been reset successfully. Please sign in.',
    })
  } catch (e) {
    next(e)
  }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  getUserController,
  forgotPasswordController,
  editUserController,
  deleteUserController,
  googleAuthController,
  updateUserController,
  resetPasswordController,
}
