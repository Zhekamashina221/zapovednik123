const nodemailer = require('nodemailer');

function isMailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;

function getTransporter() {
  if (!isMailConfigured()) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const verifyUrl = text || html;
  const transport = getTransporter();

  if (!transport) {
    console.log('[mail] SMTP не настроен — письмо не отправлено.');
    console.log(`[mail] Кому: ${to}`);
    console.log(`[mail] Тема: ${subject}`);
    if (verifyUrl) {
      const linkMatch = String(html || text || '').match(/https?:\/\/[^\s"'<>]+/);
      if (linkMatch) {
        console.log(`[mail] Ссылка: ${linkMatch[0]}`);
      }
    }
    return { devMode: true };
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });
  return { devMode: false };
}

module.exports = { isMailConfigured, sendMail };
