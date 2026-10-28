import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, eveningDate, isDateKey, pairFor, recentDays, shiftDate } from './dates.js';

test('자정과 02:00 경계, 월말·윤년·연말 날짜를 보존한다', () => {
  assert.equal(dateKey(new Date(2026, 9, 28, 0, 1)), '2026-10-28');
  assert.equal(eveningDate(new Date(2026, 9, 28, 2, 0)), '2026-10-27');
  assert.equal(eveningDate(new Date(2026, 9, 28, 2, 1)), '2026-10-28');
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(isDateKey('2026-02-30'), false);
});

test('같은 날 아침 대신 다음 날 아침을 연결하며 0점과 누락을 구분한다', () => {
  const entries = [{ date: '2026-10-27', eveningStatus: 'completed', morning: { efficacy: 8 } }, { date: '2026-10-28', morning: { efficacy: 0 } }];
  const before = JSON.stringify(entries);
  assert.equal(pairFor(entries, '2026-10-27').morning.efficacy, 0);
  assert.equal(pairFor(entries, '2026-10-28').morning, undefined);
  assert.equal(JSON.stringify(entries), before);
  assert.equal(recentDays('2026-10-28').length, 14);
  assert.equal(recentDays('2026-10-28')[0], '2026-10-15');
});
