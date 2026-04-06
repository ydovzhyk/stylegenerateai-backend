const RequestError = require('../helpers/RequestError')

const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return next(RequestError(401, 'Unauthorized'))
  }

  if (req.user.role !== 'admin') {
    return next(RequestError(403, 'Forbidden'))
  }

  next()
}

module.exports = authorizeAdmin
