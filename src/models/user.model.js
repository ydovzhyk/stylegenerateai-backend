const Joi = require('joi')
const { Schema, model } = require('mongoose')
const handleSaveErrors = require('../helpers/handleSaveErrors')

const emailRegexp = /^([^\s@]+@[^\s@]+\.[^\s@]+|\w{4}-\s?\w{5}@gmail\.com)$/

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      minlength: 2,
      maxlength: 25,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: emailRegexp,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    likedImages: {
      type: [{ type: Schema.Types.ObjectId, ref: 'generatedImage' }],
      default: [],
    },
    savedImages: {
      type: [{ type: Schema.Types.ObjectId, ref: 'generatedImage' }],
      default: [],
    },
  },
  { timestamps: true },
)

userSchema.post('save', handleSaveErrors)

const User = model('user', userSchema)

const registerSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(25).required(),
  userAvatar: Joi.string().allow('').required(),
})

const loginSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
})

const editUserSchema = Joi.object({
  name: Joi.string().min(2).max(25).optional().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must be at most 25 characters',
  }),

  currentPassword: Joi.string().allow('').optional(),
  newPassword: Joi.string().min(6).max(64).allow('').optional().messages({
    'string.min': 'New password must be at least 6 characters',
    'string.max': 'New password must be at most 64 characters',
  }),
  confirmNewPassword: Joi.string().allow('').optional(),
}).custom((value, helpers) => {
  const currentPassword = String(value.currentPassword || '').trim()
  const newPassword = String(value.newPassword || '').trim()
  const confirmNewPassword = String(value.confirmNewPassword || '').trim()

  const wantsPasswordChange =
    currentPassword || newPassword || confirmNewPassword

  if (!wantsPasswordChange) return value

  if (!currentPassword) {
    return helpers.message('Current password is required to change password')
  }

  if (!newPassword) {
    return helpers.message('New password is required')
  }

  if (!confirmNewPassword) {
    return helpers.message('Please confirm your new password')
  }

  if (newPassword !== confirmNewPassword) {
    return helpers.message('Passwords do not match')
  }

  if (currentPassword === newPassword) {
    return helpers.message(
      'New password must be different from current password',
    )
  }

  return value
})

const forgotPasswordSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
})

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).max(64).required(),
  confirmPassword: Joi.string().required(),
}).custom((value, helpers) => {
  if (value.password !== value.confirmPassword) {
    return helpers.message('Passwords do not match')
  }

  return value
})

const updateUserSchema = Joi.object({
  likedImageId: Joi.string().hex().length(24).optional(),
  unlikedImageId: Joi.string().hex().length(24).optional(),
  savedImageId: Joi.string().hex().length(24).optional(),
  unsavedImageId: Joi.string().hex().length(24).optional(),
}).or('likedImageId', 'unlikedImageId', 'savedImageId', 'unsavedImageId')

const schemas = {
  registerSchema,
  loginSchema,
  editUserSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
}

module.exports = {
  User,
  schemas,
}
