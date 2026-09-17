const STORAGE_KEY = 'retrospective-that-opens-up-tomorrow/v1';

export function loadEntries() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearEntries() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function toCsv(entries) {
  const header = ['date', 'evening_status', 'item_count', 'self_attribution_count', 'morning_task', 'morning_efficacy', 'positive_affect', 'negative_affect', 'task_difficulty', 'sleep_hours', 'missing_reason'];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [...entries]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((entry) => [
      entry.date,
      entry.eveningStatus ?? 'missing',
      entry.reflection?.items?.filter((item) => item.event.trim()).length ?? 0,
      entry.reflection?.items?.filter((item) => item.tags?.includes('내 행동')).length ?? 0,
      entry.morning?.task,
      entry.morning?.efficacy,
      entry.morning?.positiveAffect,
      entry.morning?.negativeAffect,
      entry.morning?.difficulty,
      entry.morning?.sleepHours,
      entry.eveningStatus === 'skipped' ? 'user_skipped' : '',
    ].map(escape).join(','));

  return [header.join(','), ...rows].join('\n');
}

export function downloadCsv(entries) {
  const blob = new Blob([`\uFEFF${toCsv(entries)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'positive-reflection-records.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
