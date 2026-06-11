const { sendMail } = require('./mail');
const {
  buildPasswordChangedEmail,
  buildEmailChangeAlertEmail,
} = require('./emailTemplates');

async function notifyPasswordChanged(user) {
  const { html, text, subject } = buildPasswordChangedEmail({ userName: user.name });
  await sendMail({ to: user.email, subject, html, text });
}

async function notifyEmailChangeRequested({ userName, oldEmail, newEmail }) {
  const { html, text, subject } = buildEmailChangeAlertEmail({ userName, oldEmail, newEmail });
  await sendMail({ to: oldEmail, subject, html, text });
}

async function safeSend(fn) {
  try {
    await fn();
  } catch (error) {
    console.error('[mail] Profile notification failed:', error.message);
  }
}

module.exports = {
  notifyPasswordChanged: (user) => safeSend(() => notifyPasswordChanged(user)),
  notifyEmailChangeRequested: (payload) => safeSend(() => notifyEmailChangeRequested(payload)),
};
