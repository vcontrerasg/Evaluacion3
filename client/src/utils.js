const TZ = 'America/Santiago';

const moneyFormat = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

export function money(value) {
  return value === 0 ? 'Sin costo' : moneyFormat.format(value);
}

export function dateTime(iso) {
  return dateFormat.format(new Date(iso));
}

export function timeOnly(iso) {
  return timeFormat.format(new Date(iso));
}

export const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  new: 'Nuevo',
  read: 'Leído',
  archived: 'Archivado'
};

export const sourceLabels = { faq: 'Preguntas frecuentes', ai: 'IA', fallback: 'Sin respuesta', greeting: 'Saludo' };

export const reservationStatuses = ['pending', 'confirmed', 'cancelled'];

export const mailLabels = { sent: 'Enviado', failed: 'Falló', skipped: 'No configurado', pending: 'Pendiente' };

export const networkLabels = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp'
};

export function describeError(err) {
  if (err && err.fields && Object.keys(err.fields).length > 0) return Object.values(err.fields).join(' ');
  return (err && err.message) || 'No se pudo completar la solicitud';
}

export function dateShort(iso) {
  return new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
