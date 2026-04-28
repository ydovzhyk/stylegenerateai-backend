const {
  getGenerationUsageSummary,
} = require('../services/generation-limit/generation-limit.service')

const getGenerationUsage = async (req, res, next) => {
  try {
    const visitorId = String(req.cookies?.visitorId || '').trim()

    const usage = await getGenerationUsageSummary({
      user: req.user,
      visitorId,
    })

    return res.status(200).json({
      usage,
    })
  } catch (e) {
    next(e)
  }
}

module.exports = {
  getGenerationUsage,
}
