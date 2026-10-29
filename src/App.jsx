import { useEffect, useRef, useState } from 'react';
import MorningCheckIn from './components/MorningCheckIn';
import ReflectionForm from './components/ReflectionForm';
import WeeklyReview from './components/WeeklyReview';
import Dashboard from './components/Dashboard';
import RecordSettings from './components/RecordSettings';
import { LEGACY_KEY, STORAGE_KEY, loadStore, saveStore } from './lib/storage';
import { dateKey, eveningDate, formatDate, isDateKey, shiftDate } from './lib/dates';

function upsert(entries, date, patch) {
  const existing = entries.find((entry) => entry.date === date) ?? { date };
  const nextEntry = { ...existing, ...patch };
  return [...entries.filter((entry) => entry.date !== date), nextEntry];
}

export default function App() {
  const [store, setStore] = useState(loadStore);
  const storeRef = useRef(store);
  const entries = store.entries;
  const [now, setNow] = useState(() => new Date());
  const [reflectionDate, setReflectionDate] = useState(() => eveningDate());
  const [morningDate, setMorningDate] = useState(() => dateKey());
  const [error, setError] = useState('');
  const [page, setPage] = useState('home');
  const [recordKind, setRecordKind] = useState('morning');
  const [formEpoch, setFormEpoch] = useState(0);
  const [externalChange, setExternalChange] = useState(false);
  const today = dateKey(now);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    const changed = (event) => {
      if ([STORAGE_KEY, LEGACY_KEY, null].includes(event.key)) setExternalChange(true);
    };
    window.addEventListener('storage', changed);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('storage', changed); };
  }, []);

  function persist(patch) {
    try {
      const next = saveStore({ ...storeRef.current, ...patch });
      storeRef.current = next;
      setStore(next);
      setError('');
      return true;
    } catch (failure) {
      setError(`${failure.message || '저장하지 못했습니다.'} 입력 내용은 화면에 남아 있습니다. 저장 공간과 브라우저 설정을 확인해 주세요.`);
      return false;
    }
  }

  function saveDraft(kind, date, value) {
    return persist({ drafts: { ...storeRef.current.drafts, [`${kind}:${date}`]: value } });
  }

  function saveRecord(date, patch) {
    if (!isDateKey(date) || date > dateKey()) {
      setError('오늘 또는 과거의 올바른 날짜를 선택해 주세요.');
      return false;
    }
    const drafts = { ...storeRef.current.drafts };
    const kind = patch.morning ? 'morning' : 'reflection';
    delete drafts[`${kind}:${date}`];
    return persist({ entries: upsert(storeRef.current.entries, date, { ...patch, updatedAt: new Date().toISOString(), timezoneOffset: new Date().getTimezoneOffset() }), drafts });
  }

  function openRecord(kind, date) {
    if (kind === 'morning') setMorningDate(date); else setReflectionDate(date);
    setRecordKind(kind);
    setPage('record');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function removeRecords() {
    if (!window.confirm('이 기기에 저장된 모든 기록과 임시 저장을 삭제할까요? 백업이 없으면 되돌릴 수 없습니다.')) return;
    try {
      // 빈 v2를 먼저 써서 이전 버전 기록이 다시 나타나지 않게 한다.
      const empty = { schemaVersion: 2, revision: storeRef.current.revision + 1, entries: [], drafts: {} };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
      window.localStorage.removeItem(LEGACY_KEY);
      storeRef.current = { ...empty, error: '' };
      setStore(storeRef.current);
      setFormEpoch((value) => value + 1);
      setError('');
    } catch { setError('전체 삭제를 완료하지 못했습니다. 브라우저의 저장소 권한을 확인해 주세요.'); }
  }

  function removeDate(date) {
    if (!window.confirm(`${date}의 아침·저녁 기록을 삭제할까요? 이 날짜에 연결된 표시도 변경됩니다.`)) return;
    const drafts = { ...storeRef.current.drafts };
    delete drafts[`reflection:${date}`];
    delete drafts[`morning:${date}`];
    if (persist({ entries: storeRef.current.entries.filter((entry) => entry.date !== date), drafts })) setFormEpoch((value) => value + 1);
  }

  function restoreRecords(merged) {
    if (!persist({ entries: merged.entries, drafts: merged.drafts })) return false;
    setFormEpoch((value) => value + 1);
    return true;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#top">본문으로 바로 가기</a>
      <header className="site-header">
        <a href="#top" className="brand" onClick={() => setPage('home')}>내일을 여는 회고</a>
        <span>로컬 저장 · 로그인 없음</span>
      </header>
      <nav className="main-nav" aria-label="주 메뉴">
        {[['home', '홈'], ['record', '기록하기'], ['review', '돌아보기'], ['settings', '설정']].map(([id, label]) => <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>{label}</button>)}
      </nav>
      <main id="top" tabIndex="-1">
        {(error || store.error) && <p role="alert" className="error-message">{error || store.error} <button className="button text" onClick={() => setPage('settings')}>기록 관리 열기</button></p>}
        {externalChange && <p role="alert" className="error-message">다른 탭에서 기록이 변경되었습니다. 현재 입력이 필요하면 별도로 복사한 뒤 새로고침해 주세요. <button className="button text" onClick={() => window.location.reload()}>최신 기록 불러오기</button></p>}
        {page === 'home' && <Dashboard entries={entries} today={today} now={now} onRecord={openRecord} onReview={() => setPage('review')} />}
        <div hidden={page !== 'record'}>
          <div className="section-intro"><p className="eyebrow">DAILY RITUAL</p><h1 className="page-title">잠깐 멈추고, 나를 기록해요</h1><p>날짜를 확인하고 기록해 주세요. 저장된 날짜를 선택하면 내용을 수정할 수 있습니다.</p></div>
          <div className="record-tabs" aria-label="기록 종류">
            <button className="button" aria-pressed={recordKind === 'morning'} onClick={() => setRecordKind('morning')}>아침 체크인</button>
            <button className="button" aria-pressed={recordKind === 'reflection'} onClick={() => setRecordKind('reflection')}>저녁 회고</button>
          </div>
          <div hidden={recordKind !== 'reflection'}>
            <label>저녁 회고 날짜<input type="date" value={reflectionDate} max={today} onChange={(event) => isDateKey(event.target.value) && event.target.value <= today && setReflectionDate(event.target.value)} /></label>
            <p>새벽 02:00까지는 전날 회고로 시작합니다. 현재 선택: {formatDate(reflectionDate)} → {formatDate(shiftDate(reflectionDate, 1))} 아침</p>
            <ReflectionForm key={`${reflectionDate}:${formEpoch}`} entry={entries.find((entry) => entry.date === reflectionDate)} draft={store.drafts[`reflection:${reflectionDate}`]} onDraft={(value) => saveDraft('reflection', reflectionDate, value)} onSave={(patch) => saveRecord(reflectionDate, patch)} />
          </div>
          <div hidden={recordKind !== 'morning'}>
            <label>아침 체크인 날짜<input type="date" value={morningDate} max={today} onChange={(event) => isDateKey(event.target.value) && event.target.value <= today && setMorningDate(event.target.value)} /></label>
            <p>{formatDate(shiftDate(morningDate, -1))} 저녁 회고와 연결됩니다. 과거 날짜를 선택하면 해당 날짜의 기록을 수정합니다.</p>
            <MorningCheckIn key={`${morningDate}:${formEpoch}`} entry={entries.find((entry) => entry.date === morningDate)} draft={store.drafts[`morning:${morningDate}`]} onDraft={(value) => saveDraft('morning', morningDate, value)} onSave={(patch) => saveRecord(morningDate, patch)} />
          </div>
        </div>
        {page === 'review' && <WeeklyReview entries={entries} today={today} onEdit={openRecord} onDelete={removeDate} />}
        {page === 'settings' && <RecordSettings store={store} onRestore={restoreRecords} onClear={removeRecords} />}
      </main>
      <footer>
        <p>논문 기반 방법: 긍정적 사건과 원인 기록 → 다음 날 과제 자신감 점검</p>
        <p>기록은 기기 내에만 저장됩니다.</p>
      </footer>
    </div>
  );
}
