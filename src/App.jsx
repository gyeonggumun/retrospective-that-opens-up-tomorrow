import { useEffect, useState } from 'react';
import MorningCheckIn from './components/MorningCheckIn';
import ReflectionForm from './components/ReflectionForm';
import WeeklyReview from './components/WeeklyReview';
import { clearEntries, downloadCsv, loadEntries, saveEntries } from './lib/storage';
import { dateKey, eveningDate, formatDate, isDateKey, shiftDate } from './lib/dates';

function upsert(entries, date, patch) {
  const existing = entries.find((entry) => entry.date === date) ?? { date };
  const nextEntry = { ...existing, ...patch };
  return [...entries.filter((entry) => entry.date !== date), nextEntry];
}

export default function App() {
  const [entries, setEntries] = useState(loadEntries);
  const [now, setNow] = useState(() => new Date());
  const [reflectionDate, setReflectionDate] = useState(() => eveningDate());
  const [morningDate, setMorningDate] = useState(() => dateKey());
  const [error, setError] = useState('');
  const today = dateKey(now);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  function saveRecord(date, patch) {
    if (!isDateKey(date) || date > dateKey()) {
      setError('오늘 또는 과거의 올바른 날짜를 선택해 주세요.');
      return false;
    }
    try {
      const next = upsert(entries, date, { ...patch, updatedAt: new Date().toISOString(), timezoneOffset: new Date().getTimezoneOffset() });
      saveEntries(next);
      setEntries(next);
      setError('');
      return true;
    } catch {
      setError('이 브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요. 입력 내용은 화면에 남아 있습니다.');
      return false;
    }
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
        {error && <p role="alert" className="error-message">{error}</p>}
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
          <div>
            <label>저녁 회고 날짜<input type="date" value={reflectionDate} max={today} onChange={(event) => event.target.value && setReflectionDate(event.target.value)} /></label>
            <p>새벽 02:00까지는 전날 회고로 시작합니다. 현재 선택: {formatDate(reflectionDate)} → {formatDate(shiftDate(reflectionDate, 1))} 아침</p>
            <ReflectionForm key={reflectionDate} entry={entries.find((entry) => entry.date === reflectionDate)} onSave={(patch) => saveRecord(reflectionDate, patch)} />
          </div>
          <div>
            <label>아침 체크인 날짜<input type="date" value={morningDate} max={today} onChange={(event) => event.target.value && setMorningDate(event.target.value)} /></label>
            <p>{formatDate(shiftDate(morningDate, -1))} 저녁 회고와 연결됩니다. 과거 날짜를 선택하면 해당 날짜의 기록을 수정합니다.</p>
            <MorningCheckIn key={morningDate} entry={entries.find((entry) => entry.date === morningDate)} onSave={(patch) => saveRecord(morningDate, patch)} />
          </div>
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
