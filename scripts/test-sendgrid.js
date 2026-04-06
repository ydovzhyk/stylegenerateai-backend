require('dotenv').config({ override: true })

const sgMail = require('@sendgrid/mail')

const SENDGRID_API_KEY = String(process.env.SENDGRID_API_KEY || '').trim()
const SENDGRID_SENDER = String(process.env.SENDGRID_SENDER || '').trim()

sgMail.setApiKey(SENDGRID_API_KEY)

async function run() {
  try {
    console.log('key exists:', Boolean(SENDGRID_API_KEY))
    console.log('key starts SG:', SENDGRID_API_KEY.startsWith('SG.'))
    console.log('key length:', SENDGRID_API_KEY.length)
    console.log('sender:', SENDGRID_SENDER)

    const msg = {
      to: SENDGRID_SENDER,
      from: SENDGRID_SENDER,
      subject: 'SendGrid raw test',
      text: 'Raw SendGrid test from this backend',
      html: '<p>Raw SendGrid test from this backend</p>',
    }

    const result = await sgMail.send(msg)
    console.log('OK:', result?.[0]?.statusCode || 'sent')
  } catch (error) {
    console.error('FAILED status:', error?.code)
    console.error(
      'FAILED body:',
      JSON.stringify(error?.response?.body, null, 2),
    )
  }
}

run()
