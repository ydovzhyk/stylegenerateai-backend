const express = require('express')
const session = require('express-session')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const readyTemplateRoutes = require('./src/routes/readyTemplate.routes')
const authRoutes = require('./src/routes/auth.routes')
const visitorRoutes = require('./src/routes/visitor.routes')
const googleRoutes = require('./src/routes/google.routes')

const { GOOGLE_CLIENT_SECRET, NODE_ENV } = process.env
console.log('NODE_ENV:', NODE_ENV)

const app = express()

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short'
app.use(logger(formatsLogger))

/** CORS **/
const allowedOrigins = [
  'http://localhost:3000',
  'https://style-generate-ai.vercel.app',
].filter(Boolean)

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // Postman / server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS not allowed for origin: ${origin}`), false)
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

/** Regular routes **/
app.use('/api/ready-templates', readyTemplateRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/visitor', visitorRoutes)

/** Google OAuth only **/
app.set('trust proxy', 1)

app.use(
  '/api/google',
  session({
    secret: GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    },
  }),
)
app.use('/api/google', googleRoutes)

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api', (req, res) => {
  const payload = {
    message: 'API route not found',
    method: req.method,
    path: req.originalUrl,
  }

  if (NODE_ENV !== 'production') {
    payload.query = req.query
  }

  res.status(404).json(payload)
})

app.use((err, req, res, next) => {
  console.error(err)

  const status = err.status || 500
  const response = {
    message: err.message || 'Server error',
  }

  if (NODE_ENV !== 'production') {
    response.stack = err.stack
  }

  res.status(status).json(response)
})

module.exports = app
