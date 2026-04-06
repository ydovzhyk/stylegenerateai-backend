const mongoose = require('mongoose')
const Joi = require('joi')

const handleSaveErrors = require('../helpers/handleSaveErrors')

const ReadyTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    tags: {
      type: [String],
      default: [],
    },
    previewUrl: {
      type: String,
      required: true,
      trim: true,
    },
    previewPath: {
      type: String,
      required: true,
      trim: true,
    },
    basePrompt: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false },
)

ReadyTemplateSchema.post('save', handleSaveErrors)

const ReadyTemplate = mongoose.model('ReadyTemplate', ReadyTemplateSchema)

const createReadyTemplateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().lowercase().min(2).max(140).required(),
  category: Joi.string().trim().min(2).max(50).required(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().min(1).max(40)),
    Joi.string().allow(''),
  ),
  basePrompt: Joi.string().trim().min(10).max(10000).required(),
  isPublished: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false'),
  ),
})

module.exports = {
  ReadyTemplate,
  createReadyTemplateSchema,
}
