import { useMemo, useState } from 'react';
import MorningCheckIn from './components/MorningCheckIn';
import ReflectionForm from './components/ReflectionForm';
import WeeklyReview from './components/WeeklyReview';
import { clearEntries, downloadCsv, loadEntries, saveEntries } from './lib/storage';

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function upsert(entries, date, patch) {
  const existing = entries.find((entry) => entry.date === date) ?? { date };
  const nextEntry = { ...existing, ...patch };
  return [...entries.filter((entry) => entry.date !== date), nextEntry];
}

export default function App() {
  const [entries, setEntries] = useState(loadEntries);
  const today = todayKey();
  const todayEntry = useMemo(() => entries.find((entry) => entry.date === today), [entries, today]);

  function saveToday(patch) {
    setEntries((current) => {
      const next = upsert(current, today, patch);
      saveEntries(next);
      return next;
    });
  }

  function exportRecords() {
    downloadCsv(entries);
  }

  function removeRecords() {
    if (!window.confirm('이 기기에 저장된 모든 회고와 체크인을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    clearEntries();
    setEntries([]);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="#top" className="brand">내일을 여는 회고</a>
        <span>로컬 저장 · 로그인 없음</span>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="app-title">
          <p className="eyebrow">RESEARCH-BASED DAILY REFLECTION</p>
          <h1 id="app-title">긍정적 회고와<br />다음 날 자기효능감</h1>
          <p className="hero-copy">이 앱은 대학생이 하루의 작은 성공과 그 이유를 기록하고, 다음 날 중요한 과제를 시작할 자신감을 점검하도록 돕습니다.</p>
          <div className="hero-notes">
            <span>저녁 회고</span><span>아침 체크인</span><span>기록 확인</span>
          </div>
        </section>
        <section className="research-note" aria-label="앱 사용 안내">
          <strong>사용 전 안내</strong>
          <p>이 앱은 의료적 진단·치료·위기 대응 서비스가 아닙니다. 기록은 이 브라우저에만 저장되며, 원하면 CSV로 내보내거나 전체 삭제할 수 있습니다. 힘든 날에는 언제든 회고를 건너뛰어도 괜찮습니다.</p>
        </section>
        <div className="workflow">
          <ReflectionForm entry={todayEntry} onSave={saveToday} />
          <MorningCheckIn entry={todayEntry} onSave={saveToday} />
          <WeeklyReview entries={entries} onExport={exportRecords} onClear={removeRecords} />
        </div>
      </main>
      <footer>
        <p>논문 기반 방법: 긍정적 사건과 원인 기록 → 다음 날 과제 자신감 점검</p>
        <p>기록은 기기 내에만 저장됩니다.</p>
      </footer>
    </div>
  );
}
