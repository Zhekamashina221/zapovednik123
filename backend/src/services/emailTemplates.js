const APP_NAME = process.env.MAIL_APP_NAME || 'Zapovednik';
const BRAND_COLOR = process.env.MAIL_BRAND_COLOR || '#2e8b57';
const BRAND_COLOR_DARK = process.env.MAIL_BRAND_COLOR_DARK || '#247a4c';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Общая HTML-обёртка для писем.
 * Стили только inline — так надёжнее в Gmail и Outlook.
 */
function getPublicAppUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function renderEmailLayout({
  title,
  greeting,
  bodyLines,
  actionUrl,
  actionLabel,
  expiresHint,
  footerNote,
  showAction = true,
}) {
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeFooter = escapeHtml(footerNote || 'Если вы не запрашивали это действие, просто проигнорируйте письмо.');

  const paragraphs = (bodyLines || [])
    .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#374151;">${escapeHtml(line)}</p>`)
    .join('');

  let actionBlock = '';
  if (showAction && actionUrl && actionLabel) {
    const safeActionLabel = escapeHtml(actionLabel);
    const safeExpires = escapeHtml(expiresHint || '');
    const safeUrl = escapeHtml(actionUrl);
    actionBlock = `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND_COLOR};">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${safeActionLabel}</a>
                  </td>
                </tr>
              </table>
              ${safeExpires ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7280;">${safeExpires}</p>` : ''}
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#9ca3af;word-break:break-all;">
                Или скопируйте ссылку:<br />
                <a href="${safeUrl}" style="color:${BRAND_COLOR_DARK};">${safeUrl}</a>
              </p>`;
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f6f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f6f4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${BRAND_COLOR};padding:20px 24px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${escapeHtml(APP_NAME)}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#e8f5ee;">Заповедники и ООПТ Беларуси</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#111827;">${safeTitle}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">${safeGreeting}</p>
              ${paragraphs}
              ${actionBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;background:#fafafa;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">${safeFooter}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerificationEmail({ userName, verifyUrl, expiresHours }) {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  const html = renderEmailLayout({
    title: 'Подтвердите email',
    greeting,
    bodyLines: [
      'Спасибо за регистрацию. Остался один шаг — подтвердите адрес электронной почты, чтобы пользоваться избранным, отзывами и маршрутами.',
    ],
    actionUrl: verifyUrl,
    actionLabel: 'Подтвердить email',
    expiresHint: `Ссылка действует ${expiresHours} ч.`,
    footerNote: 'Если вы не регистрировались на Zapovednik, проигнорируйте это письмо.',
  });
  const text = `${greeting}\n\nПодтвердите email: ${verifyUrl}\nСсылка действует ${expiresHours} ч.`;
  return { html, text };
}

function buildPasswordResetEmail({ userName, resetUrl, expiresHours }) {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  const html = renderEmailLayout({
    title: 'Сброс пароля',
    greeting,
    bodyLines: [
      'Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль.',
      'Если запрос отправили не вы, ничего делать не нужно — пароль останется прежним.',
    ],
    actionUrl: resetUrl,
    actionLabel: 'Сбросить пароль',
    expiresHint: `Ссылка действует ${expiresHours} ч.`,
    footerNote: 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо.',
  });
  const text = `${greeting}\n\nСброс пароля: ${resetUrl}\nСсылка действует ${expiresHours} ч.`;
  return { html, text };
}

function buildPasswordChangedEmail({ userName }) {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  const loginUrl = `${getPublicAppUrl()}/login`;
  const html = renderEmailLayout({
    title: 'Пароль изменён',
    greeting,
    bodyLines: [
      'Пароль вашего аккаунта Zapovednik был успешно изменён в профиле.',
      'Если это были не вы, немедленно воспользуйтесь восстановлением пароля и проверьте безопасность почты.',
    ],
    actionUrl: `${getPublicAppUrl()}/forgot-password`,
    actionLabel: 'Восстановить пароль',
    footerNote: 'Это уведомление отправлено автоматически. Отвечать на него не нужно.',
    showAction: true,
  });
  const text = `${greeting}\n\nПароль вашего аккаунта был изменён.\nЕсли это не вы: ${loginUrl}\n`;
  return { html, text, subject: 'Пароль изменён — Zapovednik' };
}

function buildEmailChangeAlertEmail({ userName, oldEmail, newEmail }) {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  const html = renderEmailLayout({
    title: 'Запрошена смена email',
    greeting,
    bodyLines: [
      `На вашем аккаунте Zapovednik запрошена смена адреса электронной почты.`,
      `Текущий адрес: ${oldEmail}`,
      `Новый адрес: ${newEmail}`,
      'На новый адрес отправлено письмо для подтверждения. Пока оно не подтверждено, вход и уведомления остаются привязаны к старому адресу.',
      'Если смену запросили не вы, срочно смените пароль через восстановление.',
    ],
    actionUrl: `${getPublicAppUrl()}/forgot-password`,
    actionLabel: 'Восстановить пароль',
    footerNote: 'Если смену email инициировали вы, это письмо можно проигнорировать после подтверждения нового адреса.',
    showAction: true,
  });
  const text = `${greeting}\n\nСмена email: ${oldEmail} → ${newEmail}\nЕсли это не вы — восстановите пароль.`;
  return { html, text, subject: 'Смена email — Zapovednik' };
}

module.exports = {
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  buildEmailChangeAlertEmail,
  renderEmailLayout,
};
