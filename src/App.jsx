import { useEffect, useState } from 'react';
import MorningCheckIn from './components/MorningCheckIn';
import ReflectionForm from './components/ReflectionForm';
import WeeklyReview from './components/WeeklyReview';
import Dashboard from './components/Dashboard';
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
  const [page, setPage] = useState('home');
  const [recordKind, setRecordKind] = useState('morning');
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

  function openRecord(kind, date) {
    if (kind === 'morning') setMorningDate(date); else setReflectionDate(date);
    setRecordKind(kind);
    setPage('record');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function removeRecords() {
    if (!window.confirm('이 기기에 저장된 모든 회고와 체크인을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    clearEntries();
    setEntries([]);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a href="#top" className="brand" onClick={() => setPage('home')}>내일을 여는 회고</a>
        <span>로컬 저장 · 로그인 없음</span>
      </header>
      <nav className="main-nav" aria-label="주 메뉴">
        {[['home', '홈'], ['record', '기록하기'], ['review', '돌아보기'], ['settings', '설정']].map(([id, label]) => <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>{label}</button>)}
      </nav>
      <main id="top">
        {error && <p role="alert" className="error-message">{error}</p>}
        {page === 'home' && <Dashboard entries={entries} today={today} now={now} onRecord={openRecord} onReview={() => setPage('review')} />}
        <div hidden={page !== 'record'}>
          <div className="section-intro"><p className="eyebrow">DAILY RITUAL</p><h1 className="page-title">잠깐 멈추고, 나를 기록해요</h1><p>날짜를 확인하고 기록해 주세요. 저장된 날짜를 선택하면 내용을 수정할 수 있습니다.</p></div>
          <div className="record-tabs" aria-label="기록 종류">
            <button className="button" aria-pressed={recordKind === 'morning'} onClick={() => setRecordKind('morning')}>아침 체크인</button>
            <button className="button" aria-pressed={recordKind === 'reflection'} onClick={() => setRecordKind('reflection')}>저녁 회고</button>
          </div>
          <div hidden={recordKind !== 'reflection'}>
            <label>저녁 회고 날짜<input type="date" value={reflectionDate} max={today} onChange={(event) => event.target.value && setReflectionDate(event.target.value)} /></label>
            <p>새벽 02:00까지는 전날 회고로 시작합니다. 현재 선택: {formatDate(reflectionDate)} → {formatDate(shiftDate(reflectionDate, 1))} 아침</p>
            <ReflectionForm key={reflectionDate} entry={entries.find((entry) => entry.date === reflectionDate)} onSave={(patch) => saveRecord(reflectionDate, patch)} />
          </div>
          <div hidden={recordKind !== 'morning'}>
            <label>아침 체크인 날짜<input type="date" value={morningDate} max={today} onChange={(event) => event.target.value && setMorningDate(event.target.value)} /></label>
            <p>{formatDate(shiftDate(morningDate, -1))} 저녁 회고와 연결됩니다. 과거 날짜를 선택하면 해당 날짜의 기록을 수정합니다.</p>
            <MorningCheckIn key={morningDate} entry={entries.find((entry) => entry.date === morningDate)} onSave={(patch) => saveRecord(morningDate, patch)} />
          </div>
        </div>
        {page === 'review' && <WeeklyReview entries={entries} onExport={exportRecords} onClear={removeRecords} />}
        {page === 'settings' && <section className="panel"><p className="eyebrow">MY DATA</p><h1 className="page-title">나의 기록 관리</h1><p>기록은 이 브라우저에만 저장됩니다. 다른 기기와 자동으로 동기화되지 않습니다.</p><div className="form-actions"><button className="button secondary" onClick={exportRecords} disabled={!entries.length}>CSV 내보내기</button><button className="button danger" onClick={removeRecords} disabled={!entries.length}>이 기기의 기록 모두 삭제</button></div><p className="research-note">이 앱은 의료적 진단·치료·위기 대응 서비스가 아닙니다. 브라우저 데이터를 삭제하면 저장한 기록도 삭제됩니다.</p></section>}
      </main>
      <footer>
        <p>논문 기반 방법: 긍정적 사건과 원인 기록 → 다음 날 과제 자신감 점검</p>
        <p>기록은 기기 내에만 저장됩니다.</p>
      </footer>
    </div>
  );
}
