const mongoose = require('mongoose')
const handleSaveErrors = require('../helpers/handleSaveErrors')

const generationUsageSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['visitor', 'user'],
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },

    visitorId: {
      type: String,
      default: '',
      trim: true,
    },

    planKey: {
      type: String,
      default: 'free',
      trim: true,
    },

    periodType: {
      type: String,
      enum: ['day', 'month'],
      required: true,
    },

    periodKey: {
      type: String,
      required: true,
    },

    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true, versionKey: false },
)

generationUsageSchema.index(
  {
    actorType: 1,
    userId: 1,
    visitorId: 1,
    periodType: 1,
    periodKey: 1,
  },
  { unique: true },
)

generationUsageSchema.post('save', handleSaveErrors)

const GenerationUsage = mongoose.model('GenerationUsage', generationUsageSchema)

module.exports = { GenerationUsage }
