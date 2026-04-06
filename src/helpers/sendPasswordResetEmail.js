const nodemailer = require('nodemailer')

const EMAIL_ADDRESS = String(process.env.EMAIL_ADDRESS || '').trim()
const GMAIL_PASSKEY = String(process.env.GMAIL_PASSKEY || '').trim()
const FRONTEND_URL = String(process.env.FRONTEND_URL || '').trim()

console.log('EMAIL_ADDRESS:', EMAIL_ADDRESS)
console.log('GMAIL_PASSKEY exists:', Boolean(GMAIL_PASSKEY))

const logoUrl =
  'https://firebasestorage.googleapis.com/v0/b/stylegenerateai.firebasestorage.app/o/technical%2Flogo%2Flogo.png?alt=media&token=5f00d82a-fb91-42a3-b0ca-a5d0b9784428'

// transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_ADDRESS,
    pass: GMAIL_PASSKEY,
  },
})

// main function
const sendPasswordResetEmail = async ({ email, token }) => {
  const resetUrl = `${FRONTEND_URL}/login?resetToken=${encodeURIComponent(token)}`

  const mailOptions = {
    from: `"Style Generate AI" <${EMAIL_ADDRESS}>`,
    to: email,
    subject: 'Password reset instructions',
    text: `Open this link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #e5e7eb; background: #0b1020; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 32px; border: 1px solid rgba(139,92,246,0.25);">

          <img
            src="${logoUrl}"
            alt="Style Generate AI"
            width="120"
            style="display:block; margin-bottom:20px;"
          />

          <h2 style="margin: 0 0 16px; color: #ffffff;">Reset your password</h2>

          <p style="margin: 0 0 16px; color: #cbd5e1;">
            We received a request to reset your password.
          </p>

          <p style="margin: 0 0 24px; color: #cbd5e1;">
            Click the button below to create a new password. This link expires in 15 minutes.
          </p>

          <a
            href="${resetUrl}"
            target="_blank"
            style="display: inline-block; padding: 12px 20px; background: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600;"
          >
            Reset password
          </a>

          <p style="margin: 24px 0 0; color: #94a3b8; font-size: 14px;">
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.response)
    return true
  } catch (error) {
    console.error('Email send error:', error.message)
    throw error
  }
}

module.exports = sendPasswordResetEmail
