const nodemailer = require('nodemailer')

const EMAIL_ADDRESS = String(process.env.EMAIL_ADDRESS || '').trim()
const GMAIL_PASSKEY = String(process.env.GMAIL_PASSKEY || '').trim()

const logoUrl =
  'https://firebasestorage.googleapis.com/v0/b/stylegenerateai.firebasestorage.app/o/technical%2Flogo%2Flogo.png?alt=media&token=5f00d82a-fb91-42a3-b0ca-a5d0b9784428'

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

const sendRegisterVerificationEmail = async ({ email, code }) => {
  const mailOptions = {
    from: `"Style Generate AI" <${EMAIL_ADDRESS}>`,
    to: email,
    subject: 'Your Style Generate AI verification code',
    text: `Your verification code is: ${code}. This code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #e5e7eb; background: #0b1020; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 32px; border: 1px solid rgba(139,92,246,0.25);">
          <img src="${logoUrl}" alt="Style Generate AI" width="120" style="display:block; margin-bottom:20px;" />

          <h2 style="margin: 0 0 16px; color: #ffffff;">Verify your email</h2>

          <p style="margin: 0 0 16px; color: #cbd5e1;">
            Use this code to finish creating your account.
          </p>

          <div style="letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ffffff; background: #0f172a; border-radius: 14px; padding: 18px 20px; text-align: center; margin: 24px 0;">
            ${code}
          </div>

          <p style="margin: 0; color: #94a3b8; font-size: 14px;">
            This code expires in 10 minutes. If you didn’t request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
  return true
}

module.exports = sendRegisterVerificationEmail