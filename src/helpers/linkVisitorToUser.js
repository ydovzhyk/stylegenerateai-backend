const { User } = require('../models/user.model')

async function linkVisitorToUser({ userId, visitorId }) {
  const safeVisitorId = String(visitorId || '').trim()
  if (!safeVisitorId) return null

  const linkedToAnotherUser = await User.findOne({
    _id: { $ne: userId },
    'linkedVisitors.visitorId': safeVisitorId,
  }).select('_id')

  if (linkedToAnotherUser) return null

  return User.findOneAndUpdate(
    {
      _id: userId,
      'linkedVisitors.visitorId': { $ne: safeVisitorId },
    },
    {
      $push: {
        linkedVisitors: {
          visitorId: safeVisitorId,
          linkedAt: new Date(),
        },
      },
    },
    { returnDocument: 'after', runValidators: true },
  )
}

module.exports = linkVisitorToUser
