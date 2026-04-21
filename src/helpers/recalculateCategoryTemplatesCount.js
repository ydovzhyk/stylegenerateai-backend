const { ReadyTemplate } = require('../models/readyTemplate.model')
const { Category } = require('../models/category.model')

function normalizeCategoryValue(value = '') {
  return String(value).trim()
}

async function recalculateCategoryTemplatesCount(categoryValue = '') {
  const normalizedCategory = normalizeCategoryValue(categoryValue)
  if (!normalizedCategory) return

  const templatesCount = await ReadyTemplate.countDocuments({
    category: normalizedCategory,
  })

  await Category.updateOne(
    { 'items.value': normalizedCategory },
    {
      $set: {
        'items.$.templatesCount': templatesCount,
      },
    },
  )
}

module.exports = { recalculateCategoryTemplatesCount }
