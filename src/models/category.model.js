const Joi = require('joi')
const { Schema, model } = require('mongoose')
const handleSaveErrors = require('../helpers/handleSaveErrors')

const categorySchema = new Schema(
  {
    values: {
      type: [String],
      default: [],
    },
  },
  { minimize: false, timestamps: true },
)

categorySchema.post('save', handleSaveErrors)
const Category = model('category', categorySchema)

const addCategorySchema = Joi.object({
  value: Joi.string().trim().min(2).max(40).required(),
})

const schemas = {
  addCategorySchema,
}

module.exports = { Category, schemasCategory: schemas }
