import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_KEY, STORAGE_KEY, backupJson, loadStore, mergeBackup, parseBackup, saveStore, toCsv } from './storage.js';

const morning = (score = 0) => ({ task: '과제 첫 문장 쓰기', efficacy: score, positiveAffect: 5, negativeAffect: 3, difficulty: 4, sleepHours: '', questionVersion: 'initiation-v2' });
const items = () => Array.from({ length: 3 }, () => ({ event: '동료와 어려운 문제를 함께 해결했다', reason: '미리 질문을 정리했다', tags: ['내 행동'] }));
function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('이전 버전을 읽을 때 변경하지 않고, 정상 저장 후 날짜·0점·내용을 보존한다', () => {
  const entries = [{ date: '2026-10-26', morning: morning(), eveningStatus: 'completed', reflection: { items: items() } }];
  delete entries[0].morning.questionVersion;
  const raw = JSON.stringify(entries);
  const storage = memory({ [LEGACY_KEY]: raw });
  const loaded = loadStore(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(storage.getItem(LEGACY_KEY), raw);
  const saved = saveStore(loaded, storage);
  assert.deepEqual(loadStore(storage).entries, entries);
  assert.equal(saved.revision, 1);
  assert.equal(storage.getItem(LEGACY_KEY), null);
});

test('손상된 저장소를 빈 기록으로 덮어쓰지 않는다', () => {
  const storage = memory({ [STORAGE_KEY]: '{broken' });
  const loaded = loadStore(storage);
  assert.ok(loaded.error);
  assert.throws(() => saveStore(loaded, storage));
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
});

test('저장 공간 부족과 오래된 탭의 쓰기를 거부하고 원본을 유지한다', () => {
  const storage = memory();
  const first = loadStore(storage);
  saveStore(first, storage);
  const original = storage.getItem(STORAGE_KEY);
  assert.throws(() => saveStore(first, storage), /다른 탭/);
  assert.equal(storage.getItem(STORAGE_KEY), original);
  const full = { ...storage, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => saveStore(loadStore(full), full), /quota/);
  assert.equal(storage.getItem(STORAGE_KEY), original);
});

test('JSON 백업 왕복과 섹션별 병합은 현재 내용을 우선하고 누락 섹션을 채운다', () => {
  const current = { entries: [{ date: '2026-10-26', morning: morning(7) }], drafts: { 'morning:2026-10-27': morning(4) } };
  const incoming = { entries: [{ date: '2026-10-26', morning: morning(1), eveningStatus: 'completed', reflection: { items: items() } }], drafts: { 'morning:2026-10-27': morning(2) } };
  assert.deepEqual(parseBackup(backupJson(incoming)), incoming);
  const merged = mergeBackup(current, incoming);
  assert.equal(merged.entries[0].morning.efficacy, 7);
  assert.equal(merged.entries[0].eveningStatus, 'completed');
  assert.equal(merged.drafts['morning:2026-10-27'].efficacy, 4);
  const skipped = mergeBackup({ entries: [{ date: '2026-10-26', eveningStatus: 'skipped' }], drafts: {} }, incoming);
  assert.equal(skipped.entries[0].reflection, undefined);
  assert.equal(skipped.entries[0].morning.efficacy, 1);
});

test('잘못된 파일·중복 날짜·불가능한 날짜·범위 밖 점수·태그를 거부한다', () => {
  assert.throws(() => parseBackup('{bad'));
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 99, entries: [] })));
  const wrap = (entries) => JSON.stringify({ app: 'retrospective-that-opens-up-tomorrow', schemaVersion: 2, entries });
  assert.throws(() => parseBackup(wrap([{ date: '2026-02-30' }])));
  assert.throws(() => parseBackup(wrap([{ date: '2026-10-26' }, { date: '2026-10-26' }])));
  assert.throws(() => parseBackup(wrap([{ date: '2026-10-26', morning: morning(11) }])));
  const badItems = items(); badItems[0].tags = ['unknown'];
  assert.throws(() => parseBackup(wrap([{ date: '2026-10-26', reflection: { items: badItems } }])));
});

test('CSV는 0점·미입력·건너뜀을 구분하고 다음 아침과 문항 버전을 내보낸다', () => {
  const csv = toCsv([{ date: '2026-10-26', eveningStatus: 'skipped' }, { date: '2026-10-27', morning: { ...morning(0), task: '=1+1' } }]);
  const [header, evening, next] = csv.split('\n').map((line) => line.split(','));
  const at = (row, field) => row[header.indexOf(field)];
  assert.equal(at(evening, 'next_morning_efficacy'), '"0"');
  assert.equal(at(evening, 'morning_efficacy'), '""');
  assert.equal(at(evening, 'item_count'), '""');
  assert.equal(at(evening, 'missing_reason'), '"user_skipped"');
  assert.equal(at(next, 'previous_evening_status'), '"skipped"');
  assert.equal(at(next, 'morning_question_version'), '"initiation-v2"');
  assert.equal(at(next, 'morning_task'), '"\'=1+1"');
});
