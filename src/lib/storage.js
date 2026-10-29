import { dateKey, isDateKey, shiftDate } from './dates.js';

export const STORAGE_KEY = 'retrospective-that-opens-up-tomorrow/v2';
export const LEGACY_KEY = 'retrospective-that-opens-up-tomorrow/v1';
const TAGS = ['내 행동', '타인의 도움', '상황/운'];
const validObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.length <= 20_000;
const scale = (value) => Number.isInteger(value) && value >= 0 && value <= 10;
const validDate = (value) => isDateKey(value) && value <= dateKey();
const validItems = (items) => Array.isArray(items) && items.length === 3 && items.every((item) => validObject(item) && text(item.event) && text(item.reason) && Array.isArray(item.tags) && item.tags.every((tag) => TAGS.includes(tag)));
const validSleep = (value) => value === '' || ((typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 24);
const validMorning = (morning, draft = false) => validObject(morning) && text(morning.task) && ['efficacy', 'positiveAffect', 'negativeAffect', 'difficulty'].every((key) => scale(morning[key])) && (draft ? text(String(morning.sleepHours ?? '')) : validSleep(morning.sleepHours)) && (morning.questionVersion === undefined || morning.questionVersion === 'initiation-v2');

export function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length > 20_000) throw new Error('기록 목록 형식이 올바르지 않습니다.');
  const dates = new Set();
  for (const entry of entries) {
    if (!validObject(entry) || !validDate(entry.date) || dates.has(entry.date) || (entry.eveningStatus !== undefined && !['completed', 'skipped'].includes(entry.eveningStatus)) || (entry.reflection !== undefined && (!validObject(entry.reflection) || !validItems(entry.reflection.items))) || (entry.eveningStatus === 'completed' && !entry.reflection) || (entry.morning !== undefined && !validMorning(entry.morning)) || (entry.taskStarted !== undefined && !['', 'yes', 'no'].includes(entry.taskStarted))) throw new Error('날짜 또는 기록 내용의 형식이 올바르지 않습니다.');
    dates.add(entry.date);
  }
  return entries;
}

export function validateDrafts(drafts) {
  if (!validObject(drafts)) throw new Error('임시 저장 형식이 올바르지 않습니다.');
  for (const [key, draft] of Object.entries(drafts)) {
    const match = /^(morning|reflection):(\d{4}-\d{2}-\d{2})$/.exec(key);
    if (!match || !validDate(match[2]) || !validObject(draft) || (match[1] === 'morning' ? !validMorning(draft, true) : !validItems(draft.items) || !['', 'yes', 'no'].includes(draft.taskStarted ?? ''))) throw new Error('임시 저장 내용이 올바르지 않습니다.');
  }
  return drafts;
}

export function loadStore(storage) {
  try {
    storage ??= window.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const value = JSON.parse(raw);
      if (!validObject(value) || value.schemaVersion !== 2 || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('저장 버전을 읽을 수 없습니다.');
      validateEntries(value.entries);
      validateDrafts(value.drafts);
      return { ...value, error: '' };
    }
    const legacy = storage.getItem(LEGACY_KEY);
    const entries = legacy === null ? [] : validateEntries(JSON.parse(legacy));
    return { schemaVersion: 2, revision: 0, entries, drafts: {}, error: '' };
  } catch {
    return { schemaVersion: 2, revision: 0, entries: [], drafts: {}, error: '저장 데이터를 읽지 못했습니다. 원본 보호를 위해 저장을 멈췄습니다. 설정에서 원본 파일을 내려받은 뒤 확인해 주세요.' };
  }
}

export function saveStore(next, storage = window.localStorage) {
  if (next.error) throw new Error(next.error);
  const current = loadStore(storage);
  if (current.error) throw new Error(current.error);
  if (current.revision !== next.revision) throw new Error('다른 탭에서 기록이 변경되었습니다. 새로고침 후 다시 시도해 주세요. 현재 입력은 화면에 남아 있습니다.');
  validateEntries(next.entries);
  validateDrafts(next.drafts);
  const stored = { schemaVersion: 2, revision: next.revision + 1, entries: next.entries, drafts: next.drafts };
  storage.setItem(STORAGE_KEY, JSON.stringify(stored));
  // 새 저장소가 쓰인 뒤에만 이전 키를 정리한다. 실패 시 이전 원본도 보존된다.
  try { storage.removeItem(LEGACY_KEY); } catch { /* v2에 이미 정상 저장됨. 전체 삭제 시 다시 정리한다. */ }
  return { ...stored, error: '' };
}

export function parseBackup(raw) {
  const value = JSON.parse(raw.replace(/^\uFEFF/, ''));
  if (!validObject(value) || value.app !== 'retrospective-that-opens-up-tomorrow' || value.schemaVersion !== 2) throw new Error('이 앱에서 만든 JSON 백업 파일을 선택해 주세요.');
  return { entries: validateEntries(value.entries), drafts: validateDrafts(value.drafts ?? {}) };
}

export function mergeBackup(current, incoming) {
  const merged = new Map(current.entries.map((entry) => [entry.date, entry]));
  let conflicts = 0;
  for (const entry of incoming.entries) {
    const existing = merged.get(entry.date);
    if (existing) {
      conflicts += 1;
      const combined = { ...entry, ...existing };
      // 각 날짜의 아침·저녁은 별개 기록이다. 이미 있는 섹션을 우선한다.
      if (existing.eveningStatus) {
        for (const key of ['reflection', 'eveningStatus', 'reflectionCompletedAt', 'skippedAt', 'reflectionTimezoneOffset', 'taskStarted']) {
          if (Object.hasOwn(existing, key)) combined[key] = existing[key]; else delete combined[key];
        }
      }
      merged.set(entry.date, combined);
    } else merged.set(entry.date, entry);
  }
  return { entries: [...merged.values()], drafts: { ...incoming.drafts, ...current.drafts }, conflicts };
}

export function backupJson(store) {
  return JSON.stringify({ app: 'retrospective-that-opens-up-tomorrow', schemaVersion: 2, exportedAt: new Date().toISOString(), entries: store.entries, drafts: store.drafts }, null, 2);
}

export function downloadText(content, filename, type = 'application/json;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadRaw(storage = window.localStorage) {
  downloadText(JSON.stringify({ v2: storage.getItem(STORAGE_KEY), v1: storage.getItem(LEGACY_KEY) }, null, 2), 'reflection-original-data.json');
}

export function toCsv(entries) {
  const header = ['date', 'evening_status', 'item_count', 'self_attribution_count', 'morning_task', 'morning_efficacy', 'positive_affect', 'negative_affect', 'task_difficulty', 'sleep_hours', 'missing_reason', 'morning_question_version', 'previous_evening_date', 'previous_evening_status', 'next_morning_date', 'next_morning_efficacy', 'next_morning_question_version', 'reflection_completed_at', 'morning_completed_at', 'skipped_at', 'reflection_timezone_offset_minutes', 'morning_timezone_offset_minutes', 'task_started'];
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const escape = (value) => {
    const string = String(value ?? '');
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(string) ? `'${string}` : string;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [...entries]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((entry) => [
      entry.date,
      entry.eveningStatus ?? 'missing',
      entry.eveningStatus === 'completed' ? entry.reflection?.items?.filter((item) => item.event.trim().length >= 10 && item.reason.trim()).length : '',
      entry.eveningStatus === 'completed' ? entry.reflection?.items?.filter((item) => item.event.trim().length >= 10 && item.reason.trim() && item.tags?.includes('내 행동')).length : '',
      entry.morning?.task,
      entry.morning?.efficacy,
      entry.morning?.positiveAffect,
      entry.morning?.negativeAffect,
      entry.morning?.difficulty,
      entry.morning?.sleepHours,
      entry.eveningStatus === 'skipped' ? 'user_skipped' : '',
      entry.morning ? entry.morning.questionVersion ?? 'legacy-start-and-persist' : '',
      shiftDate(entry.date, -1),
      byDate.get(shiftDate(entry.date, -1))?.eveningStatus ?? 'missing',
      shiftDate(entry.date, 1),
      byDate.get(shiftDate(entry.date, 1))?.morning?.efficacy,
      byDate.get(shiftDate(entry.date, 1))?.morning ? byDate.get(shiftDate(entry.date, 1)).morning.questionVersion ?? 'legacy-start-and-persist' : '',
      entry.reflectionCompletedAt,
      entry.morningCompletedAt,
      entry.skippedAt,
      entry.reflectionTimezoneOffset,
      entry.morningTimezoneOffset,
      entry.taskStarted,
    ].map(escape).join(','));

  return [header.join(','), ...rows].join('\n');
}

export function downloadCsv(entries) {
  downloadText(`\uFEFF${toCsv(entries)}`, 'positive-reflection-records.csv', 'text/csv;charset=utf-8');
}
