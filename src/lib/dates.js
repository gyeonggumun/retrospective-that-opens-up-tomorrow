export function dateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return dateKey(value);
}

export function eveningDate(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes() <= 120 ? shiftDate(dateKey(now), -1) : dateKey(now);
}

export function isDateKey(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && dateKey(new Date(`${date}T12:00:00`)) === date;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}

export function pairFor(entries, date) {
  return {
    date,
    evening: entries.find((entry) => entry.date === date),
    morningDate: shiftDate(date, 1),
    morning: entries.find((entry) => entry.date === shiftDate(date, 1))?.morning,
  };
}

export function recentDays(end, count = 14) {
  return Array.from({ length: count }, (_, index) => shiftDate(end, index - count + 1));
}
