const Joi = require('joi')
const { Schema, model } = require('mongoose')
const handleSaveErrors = require('../helpers/handleSaveErrors')

const categoryItemSchema = new Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    dna: {
      coreIdentity: {
        type: String,
        default: '',
        trim: true,
      },
      mustHave: {
        type: [String],
        default: [],
      },
      mayUse: {
        type: [String],
        default: [],
      },
      avoid: {
        type: [String],
        default: [],
      },
    },
  },
  { _id: false },
)

const categorySchema = new Schema(
  {
    items: {
      type: [categoryItemSchema],
      default: [],
    },
  },
  { minimize: false, timestamps: true },
)

categorySchema.post('save', handleSaveErrors)

const Category = model('category', categorySchema)

const getCategorySchema = Joi.object({
  prompt: Joi.string().trim().min(2).max(5000).required(),
})

const schemas = {
  getCategorySchema,
}

module.exports = { Category, schemasCategory: schemas }
