/**
 * Notification service for wallet: withdrawal receipt (Email + WhatsApp) and payment credit.
 * Uses nodemailer and Twilio when configured; otherwise logs and returns without error.
 */

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 30;

export function getPlatformFeePercent() {
  return PLATFORM_FEE_PERCENT;
}

export async function sendWithdrawalReceiptEmail(farmerEmail, receiptData) {
  const { amount, date, reference, accountLast4 } = receiptData;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[notification] Withdrawal receipt email skipped (SMTP not configured):', farmerEmail, amount);
    return;
  }
  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL || SMTP_USER,
      to: farmerEmail,
      subject: 'AgroScope Withdrawal Successful',
      text: `Your withdrawal of ₹${amount} has been processed.\nAccount: XXXXXXXX${accountLast4}\nDate: ${date}\nReference: ${reference}\nThank you for using AgroScope!`,
      html: `<p>Your withdrawal of <strong>₹${amount}</strong> has been processed.</p><p>Account: XXXXXXXX${accountLast4}</p><p>Date: ${date}</p><p>Reference: ${reference}</p><p>Thank you for using AgroScope!</p>`,
    });
  } catch (err) {
    console.warn('[notification] sendWithdrawalReceiptEmail error:', err.message);
  }
}

export async function sendWithdrawalReceiptWhatsApp(mobileNumber, receiptData) {
  const { amount, date, reference, accountLast4 } = receiptData;
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log('[notification] Withdrawal receipt WhatsApp skipped (Twilio not configured):', mobileNumber, amount);
    return;
  }
  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const to = mobileNumber.replace(/^0/, '+91').replace(/^(\d{10})$/, '+91$1');
    if (!to.startsWith('+')) return;
    const body = `✅ AgroScope Withdrawal Successful!\nAmount: ₹${amount}\nAccount: XXXXXXXX${accountLast4}\nDate: ${date}\nReference: ${reference}\nThank you for using AgroScope! 🌾`;
    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body,
    });
  } catch (err) {
    console.warn('[notification] sendWithdrawalReceiptWhatsApp error:', err.message);
  }
}

export async function sendPaymentCreditNotification(farmer, amount, listingTitle) {
  const email = farmer.email || farmer.userId;
  const mobile = farmer.mobileNumber || farmer.mobile;
  console.log('[notification] Payment credit:', { email, amount, listingTitle });
  if (email) {
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    if (SMTP_USER && SMTP_PASS) {
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.ADMIN_EMAIL || SMTP_USER,
          to: email,
          subject: 'AgroScope: Payment received',
          text: `₹${amount} has been credited to your wallet for: ${listingTitle || 'listing'}. Thank you!`,
        });
      } catch (err) {
        console.warn('[notification] sendPaymentCreditNotification email error:', err.message);
      }
    }
  }
  if (mobile) {
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
      try {
        const twilio = (await import('twilio')).default;
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const to = String(mobile).replace(/^0/, '+91').replace(/^(\d{10})$/, '+91$1');
        if (to.startsWith('+')) {
          await client.messages.create({
            from: TWILIO_WHATSAPP_FROM,
            to: `whatsapp:${to}`,
            body: `✅ AgroScope: ₹${amount} credited to your wallet for: ${listingTitle || 'listing'}. Thank you! 🌾`,
          });
        }
      } catch (err) {
        console.warn('[notification] sendPaymentCreditNotification WhatsApp error:', err.message);
      }
    }
  }
}
