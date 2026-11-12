const TIME_ZONE = 'America/Santiago';
const SLOT_MINUTES = 30;
const FIRST_SLOT_HOUR = 9;
const LAST_SLOT_HOUR = 17;
const MAX_DAYS_AHEAD = 90;

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short'
});

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(date) {
  const out = {};
  for (const part of formatter.formatToParts(date)) out[part.type] = part.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS[out.weekday]
  };
}

function offsetMs(timestamp) {
  const t = Math.floor(timestamp / 1000) * 1000;
  const p = localParts(new Date(t));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
}

function zonedToUtc(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = offsetMs(guess);
  let utc = guess - first;
  const second = offsetMs(utc);
  if (second !== first) utc = guess - second;
  return new Date(utc);
}

function isBusinessSlot(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const p = localParts(date);
  if (p.weekday < 1 || p.weekday > 5) return false;
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) return false;
  if (p.minute % SLOT_MINUTES !== 0) return false;
  const minutesOfDay = p.hour * 60 + p.minute;
  return minutesOfDay >= FIRST_SLOT_HOUR * 60 && minutesOfDay <= LAST_SLOT_HOUR * 60 + 30;
}

function slotsForDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  const slots = [];
  for (let minutes = FIRST_SLOT_HOUR * 60; minutes <= LAST_SLOT_HOUR * 60 + 30; minutes += SLOT_MINUTES) {
    const slot = zonedToUtc(year, month, day, Math.floor(minutes / 60), minutes % 60);
    if (isBusinessSlot(slot)) slots.push(slot);
  }
  return slots;
}

function withinBookingWindow(date, now = new Date()) {
  const limit = now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  return date.getTime() > now.getTime() && date.getTime() <= limit;
}

module.exports = { TIME_ZONE, localParts, zonedToUtc, isBusinessSlot, slotsForDate, withinBookingWindow, MAX_DAYS_AHEAD };
