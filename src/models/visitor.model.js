const { Schema, model } = require('mongoose')
const handleSaveErrors = require('../helpers/handleSaveErrors')

const visitorSchema = new Schema(
  {
    visitorId: {
      type: String,
      required: [true, 'visitorId is required'],
      unique: true,
      trim: true,
      minlength: 10,
      maxlength: 64,
    },

    lastSeenAt: { type: Date, default: Date.now },
  },
  { minimize: false, timestamps: true },
)

visitorSchema.post('save', handleSaveErrors)

const Visitor = model('visitor', visitorSchema)

module.exports = { Visitor }
