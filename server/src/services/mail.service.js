const env = require('../config/env');

const outbox = [];
let customSender = null;

function setSender(fn) {
  customSender = fn;
}

function resetOutbox() {
  outbox.length = 0;
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) {
    const err = new Error(`El proveedor de correo respondió ${res.status}`);
    err.name = 'MailProviderError';
    throw err;
  }
}

async function viaBrevo(msg) {
  await postJson('https://api.brevo.com/v3/smtp/email', { 'api-key': env.MAIL_API_KEY }, {
    sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
    to: [{ email: msg.to, ...(msg.toName ? { name: msg.toName } : {}) }],
    ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
    subject: msg.subject,
    htmlContent: msg.html,
    textContent: msg.text
  });
}

async function viaResend(msg) {
  await postJson('https://api.resend.com/emails', { Authorization: `Bearer ${env.MAIL_API_KEY}` }, {
    from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_EMAIL}>`,
    to: [msg.to],
    ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    subject: msg.subject,
    html: msg.html,
    text: msg.text
  });
}

async function sendMail(msg) {
  if (customSender) {
    await customSender(msg);
    return 'sent';
  }
  if (env.MAIL_PROVIDER === 'brevo') {
    await viaBrevo(msg);
    return 'sent';
  }
  if (env.MAIL_PROVIDER === 'resend') {
    await viaResend(msg);
    return 'sent';
  }
  if (env.isTest) {
    outbox.push(msg);
    return 'sent';
  }
  return 'skipped';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function notificationEmail(contact) {
  const lines = [
    `Nombre: ${contact.name}`,
    `Correo: ${contact.email}`,
    `Teléfono: ${contact.phone || 'No indicado'}`,
    `Asunto: ${contact.subject}`,
    '',
    contact.message
  ];
  const html = `<p><strong>Nombre:</strong> ${escapeHtml(contact.name)}<br>
<strong>Correo:</strong> ${escapeHtml(contact.email)}<br>
<strong>Teléfono:</strong> ${escapeHtml(contact.phone || 'No indicado')}<br>
<strong>Asunto:</strong> ${escapeHtml(contact.subject)}</p>
<p>${escapeHtml(contact.message).replace(/\r?\n/g, '<br>')}</p>`;
  return {
    to: env.contactTo,
    replyTo: contact.email,
    subject: `Nuevo mensaje de contacto: ${contact.subject}`,
    text: lines.join('\n'),
    html
  };
}

function confirmationEmail(contact) {
  const text = `Hola ${contact.name},\n\nRecibimos tu mensaje sobre "${contact.subject}". Nuestro equipo lo revisará y te responderá a este correo a la brevedad.\n\nSi no enviaste este mensaje, puedes ignorar este correo.\n\n${env.MAIL_FROM_NAME}`;
  const html = `<p>Hola ${escapeHtml(contact.name)},</p>
<p>Recibimos tu mensaje sobre &quot;${escapeHtml(contact.subject)}&quot;. Nuestro equipo lo revisará y te responderá a este correo a la brevedad.</p>
<p>Si no enviaste este mensaje, puedes ignorar este correo.</p>
<p>${escapeHtml(env.MAIL_FROM_NAME)}</p>`;
  return {
    to: contact.email,
    toName: contact.name,
    subject: 'Recibimos tu mensaje',
    text,
    html
  };
}

module.exports = { sendMail, notificationEmail, confirmationEmail, escapeHtml, outbox, setSender, resetOutbox };
