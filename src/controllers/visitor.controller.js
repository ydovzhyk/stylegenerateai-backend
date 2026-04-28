const { Visitor } = require('../models/visitor.model')
const RequestError = require('../helpers/RequestError')
const { nanoid } = require('nanoid')

const isProd =
  process.env.NODE_ENV === 'production' || Boolean(process.env.DYNO)

const VISITOR_COOKIE_NAME = 'visitorId'

const VISITOR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
}

const initVisitor = async (req, res) => {
  const cookieVisitorId = String(req.cookies?.visitorId || '').trim()

  if (cookieVisitorId) {
    const existing = await Visitor.findOne({ visitorId: cookieVisitorId })

    if (existing) {
      existing.lastSeenAt = new Date()
      await existing.save()

      res.cookie('visitorId', existing.visitorId, VISITOR_COOKIE_OPTIONS)

      return res.status(200).json(existing)
    }
  }

  const created = await Visitor.create({
    visitorId: nanoid(24),
    lastSeenAt: new Date(),
  })

  res.cookie('visitorId', created.visitorId, VISITOR_COOKIE_OPTIONS)

  return res.status(201).json(created)
}

module.exports = {
  initVisitor,
}
