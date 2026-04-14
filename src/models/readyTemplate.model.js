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
    previewSourceKey: {
      type: String,
      trim: true,
      default: '',
      enum: [
        '',
        'man_front_color',
        'man_front_black',
        'man_profile_color',
        'man_profile_black',
        'woman_front_color',
        'woman_front_black',
        'woman_profile_color',
        'woman_profile_black',
      ],
    },
    useInCreateYourLook: {
      type: Boolean,
      default: false,
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
  previewSourceKey: Joi.string()
    .valid(
      '',
      'man_front_color',
      'man_front_black',
      'man_profile_color',
      'man_profile_black',
      'woman_front_color',
      'woman_front_black',
      'woman_profile_color',
      'woman_profile_black',
    )
    .optional(),

  useInCreateYourLook: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false'),
  ),
})

const generateReadyTemplatePreviewSchema = Joi.object({
  prompt: Joi.string().trim().min(5).max(5000).required(),
  sourceMode: Joi.string().valid('prototype', 'upload').optional(),
  prototypeGender: Joi.string().valid('man', 'woman').optional(),
  prototypeView: Joi.string().valid('front', 'profile').optional(),
  prototypeTone: Joi.string().valid('color', 'black').optional(),
  outputId: Joi.string()
    .valid('portrait_2_3', 'square_1_1', 'landscape_3_2')
    .required(),
  photoQualityId: Joi.string()
    .valid('draft', 'standard', 'premium', 'print')
    .default('standard'),
})

const autogenerateReadyTemplatesSchema = Joi.object({
  perCategory: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(2),
  limitCategories: Joi.number().integer().min(1).max(100).optional(),
  categories: Joi.array().items(Joi.string().trim().min(2).max(50)).optional(),
  dryRun: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid('true', 'false'))
    .default(false),
})

module.exports = {
  ReadyTemplate,
  createReadyTemplateSchema,
  generateReadyTemplatePreviewSchema,
  autogenerateReadyTemplatesSchema,
}
