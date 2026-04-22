const RequestError = require('../helpers/RequestError')

const validateQuery = (schema) => {
  return (req, _, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })

    if (error) {
      return next(RequestError(400, error.message))
    }

    req.query = value
    next()
  }
}

module.exports = validateQuery
